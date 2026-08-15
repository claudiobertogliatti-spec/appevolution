"""Piano e apply conservativo per migrare la Fase 2 canonica."""
import asyncio
from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
import base64
import hashlib
import json
import time
from typing import Any
import uuid

from fastapi import HTTPException
from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from services.launch_calendar import calendar_checksum
from services.journey_completion import (
    all_required_lessons_approved,
    approved_launch_calendar_context,
    masterclass_current_version_approved,
)
from services.phase2_conformity import evaluate_phase2_conformity
from services.phase2_output_versions import (
    OutputVersionRequest,
    archive_phase2_output,
    canonical_source_checksum,
)
from services.sales_system_readiness import (
    evaluate_launch_readiness,
    evaluate_sales_system,
)


_OUTPUT_EVIDENCE = {
    "05-script-masterclass": "masterclass_script_approved",
    "06-outline-lezioni": "course_outline_approved",
    "07-script-videolezioni": "lesson_scripts_approved",
    "12-prezzo-webinar": "price_webinar_approved",
}

_OUTPUT_CATEGORY = {
    "05-script-masterclass": "script_masterclass",
    "06-outline-lezioni": "outline_corso",
    "07-script-videolezioni": "script_videolezioni",
    "12-prezzo-webinar": "prezzo_webinar",
}

_CANONICAL_DEFINITIONS = tuple(
    definition
    for definition in JOURNEY_STEPS_DEFINITION
    if 8 <= int(definition["step_number"]) <= 19
)
_CANONICAL_BY_ID = {
    definition["step_id"]: definition for definition in _CANONICAL_DEFINITIONS
}
_CANONICAL_STEP_IDS = tuple(_CANONICAL_BY_ID)
_METADATA_FIELDS = (
    "step_number",
    "code",
    "fase_legacy",
    "macro_phase",
    "label",
    "owner",
    "completion_policy",
    "material_categories",
)
_SOURCE_COLLECTIONS = (
    "partner_journey_steps",
    "partner_phase2_output_versions",
    "partners",
    "partner_hub",
    "partner_funnel",
    "partner_brand_kits",
    "masterclass_factory",
    "partner_videocorso",
    "partner_launch_calendar_versions",
    "partner_lancio",
    "partner_document_versions",
)
_SENSITIVE_KEYS = {
    "access_token",
    "authorization",
    "client_secret",
    "password",
    "refresh_token",
    "secret",
    "token",
}
_APPLY_LEASE_SECONDS = 30
_APPLY_WAIT_SECONDS = 10
_APPLY_POLL_SECONDS = 0.01
_MIGRATION_MARKER_FIELDS = (
    "phase2_migration_report_id",
    "phase2_migration_action_ids",
    "phase2_migration_applied_at",
)


@dataclass(frozen=True)
class MigrationPlan:
    partner_id: str
    actor_id: str
    source_checksum: str
    actions: list[dict[str, Any]]

    @property
    def reopen_step_ids(self) -> list[str]:
        return [
            action["step_id"]
            for action in self.actions
            if action["kind"] == "reopen_step"
        ]

    @property
    def archive_actions(self) -> list[dict[str, Any]]:
        return [action for action in self.actions if action["kind"] == "archive_legacy"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "partner_id": self.partner_id,
            "actor_id": self.actor_id,
            "source_checksum": self.source_checksum,
            "actions": self.actions,
            "reopen_step_ids": self.reopen_step_ids,
        }


class MigrationConflict(RuntimeError):
    """Il report non rappresenta piu' lo stato corrente o ha perso il CAS."""


@dataclass(frozen=True)
class MigrationReport:
    report_id: str
    partner_id: str
    actor_id: str
    status: str
    source_checksum: str
    actions: list[dict[str, Any]]
    expected_steps: dict[str, Any]
    created_at: datetime

    def to_dict(self) -> dict[str, Any]:
        return _normalize_for_json({
            "report_id": self.report_id,
            "partner_id": self.partner_id,
            "actor_id": self.actor_id,
            "status": self.status,
            "source_checksum": self.source_checksum,
            "actions": self.actions,
            "expected_steps": self.expected_steps,
            "created_at": self.created_at,
        })


@dataclass(frozen=True)
class MigrationApplyResult:
    report_id: str
    partner_id: str
    snapshot_id: str
    audit_id: str
    applied_at: datetime

    def to_dict(self) -> dict[str, Any]:
        return _normalize_for_json({
            "report_id": self.report_id,
            "partner_id": self.partner_id,
            "snapshot_id": self.snapshot_id,
            "audit_id": self.audit_id,
            "applied_at": self.applied_at,
        })


def _matches_partner(collection_name: str, partner_id: str) -> dict[str, str]:
    return {"id": partner_id} if collection_name == "partners" else {"partner_id": partner_id}


async def _find_many(collection, query: dict[str, Any]) -> list[dict[str, Any]]:
    cursor = collection.find(query)
    return await cursor.to_list(length=None)


async def _find_many_full(collection, query: dict[str, Any]) -> list[dict[str, Any]]:
    cursor = collection.find(query)
    return await cursor.to_list(length=None)


async def _load_source_snapshot(db, partner_id: str) -> dict[str, list[dict[str, Any]]]:
    snapshot = {}
    for collection_name in _SOURCE_COLLECTIONS:
        collection = getattr(db, collection_name)
        documents = await _find_many(
            collection, _matches_partner(collection_name, partner_id)
        )
        snapshot[collection_name] = sorted(documents, key=_canonical_json)
    return snapshot


async def _load_full_source_snapshot(
    db, partner_id: str
) -> dict[str, list[dict[str, Any]]]:
    snapshot = {}
    for collection_name in _SOURCE_COLLECTIONS:
        collection = getattr(db, collection_name)
        documents = await _find_many_full(
            collection, _matches_partner(collection_name, partner_id)
        )
        snapshot[collection_name] = sorted(documents, key=_canonical_json)
    return snapshot


def _normalize_for_json(value: Any) -> Any:
    if isinstance(value, datetime):
        normalized = value
        if normalized.tzinfo is None:
            normalized = normalized.replace(tzinfo=timezone.utc)
        return normalized.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, bytes):
        return {"$binary": base64.b64encode(value).decode("ascii")}
    if isinstance(value, dict):
        return {
            str(key): _normalize_for_json(item)
            for key, item in sorted(value.items(), key=lambda pair: str(pair[0]))
        }
    if isinstance(value, (list, tuple)):
        return [_normalize_for_json(item) for item in value]
    if isinstance(value, set):
        normalized = [_normalize_for_json(item) for item in value]
        return sorted(normalized, key=_canonical_json)
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _canonical_json(value: Any) -> str:
    return json.dumps(
        _normalize_for_json(value),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def _source_checksum(snapshot: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical_json(snapshot).encode("utf-8")).hexdigest()


def _checksum_from_full_snapshot(snapshot: dict[str, Any]) -> str:
    return _source_checksum(snapshot)


def _safe_value(value: Any) -> Any:
    if isinstance(value, bytes):
        return {
            "binary_bytes": len(value),
            "binary_sha256": hashlib.sha256(value).hexdigest(),
        }
    if isinstance(value, dict):
        return {
            str(key): "[redacted]" if str(key).lower() in _SENSITIVE_KEYS else _safe_value(item)
            for key, item in value.items()
            if str(key) != "_id"
        }
    if isinstance(value, (list, tuple)):
        return [_safe_value(item) for item in value]
    return _normalize_for_json(value)


def _legacy_calendar_payload(data: Any) -> dict[str, Any]:
    calendar = data.get("calendar") if isinstance(data, dict) else None
    if not isinstance(calendar, dict):
        calendar = data if isinstance(data, dict) else None
    if not calendar:
        raise MigrationConflict("legacy calendar payload is not a canonical draft object")
    draft = deepcopy(calendar)
    draft.pop("admin_approval", None)
    draft.pop("partner_confirmation", None)
    return draft


def _approved_output_reference(output: dict[str, Any] | None) -> dict[str, Any] | None:
    if not output:
        return None
    fields = (
        "output_id",
        "step_id",
        "category",
        "template_id",
        "template_version",
        "version",
        "status",
        "is_current",
        "checksum",
        "source_checksum",
    )
    return {
        field: _safe_value(output[field])
        for field in fields
        if field in output
    }


def _current_approved_output_from_snapshot(
    snapshot: dict[str, list[dict[str, Any]]], partner_id: str, step_id: str
) -> dict[str, Any] | None:
    candidates = [
        document
        for document in snapshot["partner_phase2_output_versions"]
        if document.get("partner_id") == partner_id
        and document.get("step_id") == step_id
        and document.get("status") == "approved"
        and document.get("is_current") is True
    ]
    return _latest_by_version(candidates)


def _latest_by_version(documents: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not documents:
        return None
    return max(
        documents,
        key=lambda item: (
            int(item.get("version") or 0),
            _canonical_json(item.get("updated_at") or item.get("created_at") or ""),
        ),
    )


def _steps_by_id(documents: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for document in documents:
        step_id = document.get("step_id")
        if step_id:
            grouped.setdefault(str(step_id), []).append(document)
    return {
        step_id: max(
            records,
            key=lambda item: (
                _canonical_json(item.get("updated_at") or ""),
                _canonical_json(item),
            ),
        )
        for step_id, records in grouped.items()
    }


def _sales_report(snapshot: dict[str, list[dict[str, Any]]]):
    partner = _latest_by_version(snapshot["partners"]) or {}
    funnel = _latest_by_version(snapshot["partner_funnel"]) or {}
    hub = _latest_by_version(snapshot["partner_hub"]) or {}
    legal = funnel.get("legal") or {}
    return evaluate_sales_system({
        "subaccount": partner.get("systeme_course_id") or partner.get("systeme_subdomain"),
        "domain": partner.get("custom_domain") or partner.get("systeme_subdomain") or funnel.get("domain"),
        "legal": funnel.get("legal_completed") or all(
            legal.get(key) for key in ("privacy_url", "terms_url")
        ),
        "funnel": bool(
            funnel.get("published")
            and (
                funnel.get("funnel_url")
                or funnel.get("vendita_url")
                or funnel.get("optin_url")
            )
        ),
        "checkout": funnel.get("checkout_url") or funnel.get("stripe_checkout_url"),
        "price": hub.get("offerPrice") or funnel.get("price") or funnel.get("prezzo"),
        "automation": funnel.get("automation_active")
        or funnel.get("publish_status") in ("published", "completed", "active"),
    })


def _current_workbook_archived(
    snapshot: dict[str, list[dict[str, Any]]],
    calendar_document: dict[str, Any] | None,
    calendar_context: dict[str, Any],
) -> bool:
    if calendar_context.get("launch_calendar_approved") is not True:
        return False
    from routers.partner_rewards import _workbook_binding, _workbook_payload

    steps = sorted(
        snapshot["partner_journey_steps"],
        key=lambda step: (float(step.get("step_number") or 0), str(step.get("step_id") or "")),
    )
    context = {
        "partner": _latest_by_version(snapshot["partners"]) or {},
        "steps": steps,
        "steps_by_id": {step.get("step_id"): step for step in steps},
        "hub": _latest_by_version(snapshot["partner_hub"]) or {},
        "masterclass": _latest_by_version(snapshot["masterclass_factory"]) or {},
        "videocorso": _latest_by_version(snapshot["partner_videocorso"]) or {},
        "brand_kit": _latest_by_version(snapshot["partner_brand_kits"]) or {},
        "funnel": _latest_by_version(snapshot["partner_funnel"]) or {},
        "launch_calendar": (calendar_document or {}).get("calendar") or {},
        "launch_calendar_version": calendar_context.get("calendar_version"),
        "launch_calendar_checksum": calendar_context.get("calendar_checksum"),
        "launch_calendar_approved_at": calendar_context.get("approved_at"),
    }
    try:
        payload = _workbook_payload(context)
        binding = _workbook_binding(context, payload)
    except HTTPException:
        return False
    return any(
        document.get("kind") == "workbook_final"
        and document.get("source_version") == binding["source_version"]
        and bool(document.get("checksum"))
        and _canonical_json(document.get("provenance"))
        == _canonical_json(binding["provenance"])
        for document in snapshot["partner_document_versions"]
    )


async def _build_phase2_evidence_from_snapshot(
    db, partner_id: str, snapshot: dict[str, list[dict[str, Any]]]
) -> dict[str, Any]:
    raw_steps = _steps_by_id(snapshot["partner_journey_steps"])
    outputs = {}
    output_flags = {}
    for step_id, evidence_key in _OUTPUT_EVIDENCE.items():
        output = _current_approved_output_from_snapshot(snapshot, partner_id, step_id)
        outputs[step_id] = _approved_output_reference(output)
        output_flags[evidence_key] = output is not None

    masterclass = _latest_by_version(snapshot["masterclass_factory"]) or {}
    course = _latest_by_version(snapshot["partner_videocorso"]) or {}
    outline = course.get("course_data") or course.get("outline") or {}
    lessons = course.get("lessons") or {}
    approved_calendars = [
        document
        for document in snapshot["partner_launch_calendar_versions"]
        if document.get("status") == "approved"
    ]
    calendar_context = approved_launch_calendar_context(
        _latest_by_version(approved_calendars)
    )
    sales_report = _sales_report(snapshot)
    launch = _latest_by_version(snapshot["partner_lancio"]) or {}
    partner = _latest_by_version(snapshot["partners"]) or {}
    documents = snapshot["partner_document_versions"]
    certificate = _latest_by_version([
        document for document in documents if document.get("kind") == "certificate_valida"
    ])

    masterclass_approved = masterclass_current_version_approved(masterclass)
    lessons_approved = all_required_lessons_approved(outline, lessons)
    launch_report = evaluate_launch_readiness({
        "masterclass": masterclass_approved,
        "lessons": lessons_approved,
        "sales_system": sales_report.ready,
        "calendar": calendar_context.get("launch_calendar_approved", False),
        "price_webinar": output_flags["price_webinar_approved"],
        "launch_date": partner.get("launch_date")
        or launch.get("launch_date")
        or launch.get("scheduled_at"),
    })
    safe_steps = {
        step_id: {
            key: _safe_value(step.get(key))
            for key in (
                "partner_id",
                "step_id",
                "step_number",
                "code",
                "fase_legacy",
                "macro_phase",
                "label",
                "owner",
                "completion_policy",
                "material_categories",
                "status",
                "started_at",
                "completed_at",
                "updated_at",
            )
            if key in step
        }
        for step_id, step in raw_steps.items()
    }
    return {
        "journey_steps": safe_steps,
        "approved_outputs": outputs,
        **output_flags,
        "masterclass_current_version_approved": masterclass_approved,
        "all_required_lessons_current_version_approved": lessons_approved,
        "sales_system_ready": sales_report.ready,
        "launch_calendar_approved": calendar_context.get("launch_calendar_approved", False),
        "launch_readiness_verified": launch_report.ready,
        "launch_verified": bool(launch.get("launched") and launch.get("probe_verified")),
        "valida_certificate_archived": bool(certificate and certificate.get("checksum")),
        "final_workbook_archived": _current_workbook_archived(
            snapshot,
            _latest_by_version(approved_calendars),
            calendar_context,
        ),
    }


async def build_phase2_evidence(db, partner_id: str) -> dict[str, Any]:
    """Carica e deriva esclusivamente evidenze server-side sanificate."""
    snapshot = await _load_source_snapshot(db, partner_id)
    return await _build_phase2_evidence_from_snapshot(db, partner_id, snapshot)


def _metadata(document: dict[str, Any] | None) -> dict[str, Any] | None:
    if document is None:
        return None
    return {
        field: _safe_value(document.get(field))
        for field in _METADATA_FIELDS
        if field in document
    }


def _canonical_metadata(definition: dict[str, Any]) -> dict[str, Any]:
    return {field: _safe_value(definition[field]) for field in _METADATA_FIELDS}


def _action(
    kind: str,
    step_id: str,
    reason: str,
    before: Any,
    after: Any,
) -> dict[str, Any]:
    body = {
        "kind": kind,
        "step_id": step_id,
        "reason": reason,
        "before": _safe_value(before),
        "after": _safe_value(after),
    }
    action_id = hashlib.sha256(_canonical_json(body).encode("utf-8")).hexdigest()[:24]
    return {"action_id": action_id, **body}


def _legacy_source_refs(
    step_id: str,
    step: dict[str, Any],
    snapshot: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    refs = []
    if step.get("data"):
        refs.append({"collection": "partner_journey_steps", "step_id": step_id})
    if step_id == "05-script-masterclass":
        masterclass = _latest_by_version(snapshot["masterclass_factory"]) or {}
        for field in ("script_content", "approved_script", "full_script", "script"):
            if masterclass.get(field):
                refs.append({"collection": "masterclass_factory", "field": field})
    elif step_id == "06-outline-lezioni":
        course = _latest_by_version(snapshot["partner_videocorso"]) or {}
        for field in ("course_data", "outline"):
            if course.get(field):
                refs.append({"collection": "partner_videocorso", "field": field})
    elif step_id == "07-script-videolezioni":
        course = _latest_by_version(snapshot["partner_videocorso"]) or {}
        for lesson_id, lesson in sorted((course.get("lessons") or {}).items()):
            if not isinstance(lesson, dict):
                continue
            for field in ("script_content", "approved_script", "full_script", "script"):
                if lesson.get(field):
                    refs.append({
                        "collection": "partner_videocorso",
                        "field": f"lessons.{lesson_id}.{field}",
                    })
    elif step_id == "12-prezzo-webinar":
        hub = _latest_by_version(snapshot["partner_hub"]) or {}
        if hub.get("offerPrice"):
            refs.append({"collection": "partner_hub", "field": "offerPrice"})
    return refs


def _preservation_actions(
    steps: dict[str, dict[str, Any]],
    snapshot: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    actions = []
    masterclass = _latest_by_version(snapshot["masterclass_factory"]) or {}
    final_source_fields = [
        key
        for key in ("output_gcs_url", "video_ciak_url", "video_embed_url", "video_youtube_url")
        if masterclass.get(key)
    ]
    raw_source_fields = [
        key
        for key in (
            "video_raw_url",
            "raw_video_url",
            "original_video_url",
            "video_url",
            "video_uploaded",
            "drive_file_id",
        )
        if masterclass.get(key)
    ]
    if final_source_fields or raw_source_fields:
        actions.append(_action(
            "preserve_source",
            "08-registra-masterclass",
            "historical_masterclass_media_preserved",
            {
                "collection": "masterclass_factory",
                "final_source_fields": final_source_fields,
                "raw_source_fields": raw_source_fields,
            },
            {"change": "none"},
        ))

    course = _latest_by_version(snapshot["partner_videocorso"]) or {}
    lessons = course.get("lessons") or {}
    if lessons:
        raw_fields = (
            "video_raw_url",
            "raw_video_url",
            "original_video_url",
            "video_url",
            "drive_file_id",
        )
        raw_lessons = [
            lesson
            for lesson in lessons.values()
            if isinstance(lesson, dict) and any(lesson.get(field) for field in raw_fields)
        ]
        actions.append(_action(
            "preserve_source",
            "09-registra-lezioni",
            "historical_lesson_records_preserved",
            {
                "collection": "partner_videocorso",
                "lesson_count": len(lessons),
                "raw_lesson_count": len(raw_lessons),
                "raw_source_fields": sorted({
                    field
                    for lesson in raw_lessons
                    for field in raw_fields
                    if lesson.get(field)
                }),
            },
            {"change": "none"},
        ))

    for legacy in snapshot["partner_journey_steps"]:
        if legacy.get("step_id") not in _CANONICAL_BY_ID:
            actions.append(_action(
                "preserve_source",
                str(legacy.get("step_id") or "legacy-step"),
                "legacy_journey_record_preserved",
                {
                    "collection": "partner_journey_steps",
                    "step_id": legacy.get("step_id"),
                    "step_number": legacy.get("step_number"),
                    "status": legacy.get("status"),
                },
                {"change": "none"},
            ))
    return actions


async def plan_phase2_migration(
    db, partner_id: str, actor_id: str
) -> MigrationPlan:
    """Costruisce un piano deterministico senza effettuare alcuna scrittura."""
    snapshot = await _load_source_snapshot(db, partner_id)
    evidence = await _build_phase2_evidence_from_snapshot(db, partner_id, snapshot)
    raw_steps = _steps_by_id(snapshot["partner_journey_steps"])
    actions: list[dict[str, Any]] = []

    for definition in _CANONICAL_DEFINITIONS:
        step_id = definition["step_id"]
        step = raw_steps.get(step_id)
        before = _metadata(step)
        after = _canonical_metadata(definition)
        if before != after:
            actions.append(_action(
                "normalize_metadata",
                step_id,
                "canonical_phase2_definition",
                before,
                after,
            ))

    for step_id in _OUTPUT_EVIDENCE:
        step = raw_steps.get(step_id) or {}
        if evidence["approved_outputs"].get(step_id) is None:
            refs = _legacy_source_refs(step_id, step, snapshot)
            if refs:
                actions.append(_action(
                    "archive_legacy",
                    step_id,
                    "historical_output_requires_current_approval",
                    {"source_refs": refs},
                    {
                        "target": "partner_phase2_output_versions",
                        "category": _OUTPUT_CATEGORY[step_id],
                        "status": "legacy",
                    },
                ))

    calendar_step = raw_steps.get("11-calendario-30gg") or {}
    if calendar_step.get("data") and not evidence["launch_calendar_approved"]:
        legacy_calendar_checksum = calendar_checksum(
            _legacy_calendar_payload(calendar_step["data"])
        )
        actions.append(_action(
            "archive_legacy",
            "11-calendario-30gg",
            "legacy_calendar_requires_canonical_review",
            {
                "source_refs": [
                    {"collection": "partner_journey_steps", "field": "data"}
                ],
                "legacy_calendar_checksum": legacy_calendar_checksum,
            },
            {"target": "partner_launch_calendar_versions", "status": "draft"},
        ))

    actions.extend(_preservation_actions(raw_steps, snapshot))

    nonconformant_done = []
    in_progress_ids = []
    for step_id in _CANONICAL_STEP_IDS:
        step = raw_steps.get(step_id) or {}
        if step.get("status") == "in_progress":
            in_progress_ids.append(step_id)
        if step.get("status") != "done":
            continue
        conformity = evaluate_phase2_conformity(step_id, evidence)
        if not conformity.conformant:
            nonconformant_done.append((step_id, conformity.reason))
        else:
            actions.append(_action(
                "preserve_step",
                step_id,
                "current_server_evidence_conformant",
                {
                    "status": "done",
                    "updated_at": step.get("updated_at"),
                    "evidence_key": conformity.evidence_key,
                },
                {"change": "none"},
            ))

    candidates = [step_id for step_id, _ in nonconformant_done] + in_progress_ids
    active_front = min(
        candidates,
        key=_CANONICAL_STEP_IDS.index,
    ) if candidates else None
    transitioned_ids = set()
    for step_id in in_progress_ids:
        step = raw_steps[step_id]
        if step_id == active_front:
            actions.append(_action(
                "preserve_step",
                step_id,
                "existing_migration_front_preserved",
                {"status": "in_progress", "updated_at": step.get("updated_at")},
                {"change": "none"},
            ))
            continue
        actions.append(_action(
            "transition_downstream",
            step_id,
            "upstream_output_not_current",
            {"status": "in_progress", "updated_at": step.get("updated_at")},
            {
                "status": "pending",
                "completed_at": None,
                "blocked_reason_code": "upstream_output_not_current",
            },
        ))
        transitioned_ids.add(step_id)

    for step_id, reason in nonconformant_done:
        step = raw_steps[step_id]
        after = {"status": "in_progress", "completed_at": None}
        if step_id != active_front:
            after = {
                "status": "pending",
                "completed_at": None,
                "blocked_reason_code": "upstream_output_not_current",
            }
        actions.append(_action(
            "reopen_step",
            step_id,
            reason,
            {
                "status": step.get("status"),
                "completed_at": step.get("completed_at"),
                "updated_at": step.get("updated_at"),
            },
            after,
        ))

    if active_front:
        first_index = _CANONICAL_STEP_IDS.index(active_front)
        reopened_ids = {step_id for step_id, _ in nonconformant_done}
        for step_id in _CANONICAL_STEP_IDS[first_index + 1:]:
            if step_id in reopened_ids or step_id in transitioned_ids:
                continue
            step = raw_steps.get(step_id)
            if not step or step.get("status") in ("pending", "blocked"):
                continue
            actions.append(_action(
                "transition_downstream",
                step_id,
                "upstream_output_not_current",
                {"status": step.get("status"), "updated_at": step.get("updated_at")},
                {
                    "status": "pending",
                    "completed_at": None,
                    "blocked_reason_code": "upstream_output_not_current",
                },
            ))

    return MigrationPlan(
        partner_id=str(partner_id),
        actor_id=str(actor_id),
        source_checksum=_source_checksum(snapshot),
        actions=actions,
    )


def _report_from_document(document: dict[str, Any]) -> MigrationReport:
    return MigrationReport(
        report_id=document["report_id"],
        partner_id=document["partner_id"],
        actor_id=document["actor_id"],
        status=document["status"],
        source_checksum=document["source_checksum"],
        actions=deepcopy(document["actions"]),
        expected_steps=deepcopy(document.get("expected_steps") or {}),
        created_at=document["created_at"],
    )


def _apply_result_from_document(document: dict[str, Any]) -> MigrationApplyResult:
    return MigrationApplyResult(
        report_id=document["report_id"],
        partner_id=document["partner_id"],
        snapshot_id=document["snapshot_id"],
        audit_id=document["audit_id"],
        applied_at=document["applied_at"],
    )


def _step_expectations(snapshot: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for document in snapshot["partner_journey_steps"]:
        step_id = document.get("step_id")
        if step_id in _CANONICAL_BY_ID:
            grouped.setdefault(step_id, []).append(document)
    expectations = {}
    for step_id in _CANONICAL_STEP_IDS:
        documents = grouped.get(step_id, [])
        selected = _steps_by_id(documents).get(step_id) if documents else None
        expectations[step_id] = {
            "record_count": len(documents),
            "updated_at_exists": bool(selected and "updated_at" in selected),
            "updated_at": selected.get("updated_at") if selected else None,
            "status_exists": bool(selected and "status" in selected),
            "status": selected.get("status") if selected else None,
        }
    return expectations


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _validate_canonical_step_cardinality(
    report: dict[str, Any],
    snapshot: dict[str, list[dict[str, Any]]] | None = None,
) -> None:
    expected_steps = report.get("expected_steps") or {}
    for step_id in _CANONICAL_STEP_IDS:
        expected = expected_steps.get(step_id) or {}
        if expected.get("record_count") != 1:
            raise MigrationConflict(
                f"compare-and-set failed for {step_id}: expected exactly one journey record"
            )
    if snapshot is None:
        return
    actual = _step_expectations(snapshot)
    for step_id in _CANONICAL_STEP_IDS:
        if actual[step_id]["record_count"] != 1:
            raise MigrationConflict(
                f"compare-and-set failed for {step_id}: expected exactly one journey record"
            )


async def create_phase2_dry_run(
    db, partner_id: str, actor_id: str
) -> MigrationReport:
    """Persiste un report revisionabile; azioni e checksum non vengono piu' mutati."""
    partner_id = str(partner_id)
    actor_id = str(actor_id)
    plan = None
    snapshot = None
    for _ in range(3):
        plan = await plan_phase2_migration(db, partner_id, actor_id)
        snapshot = await _load_source_snapshot(db, partner_id)
        if _source_checksum(snapshot) == plan.source_checksum:
            break
    else:
        raise MigrationConflict("source changed while creating dry-run report")

    now = datetime.now(timezone.utc)
    document = {
        "report_id": uuid.uuid4().hex,
        "partner_id": partner_id,
        "actor_id": actor_id,
        "status": "review_required",
        "source_checksum": plan.source_checksum,
        "actions": deepcopy(plan.actions),
        "expected_steps": _step_expectations(snapshot),
        "created_at": now,
        "updated_at": now,
    }
    await db.partner_phase2_migration_reports.insert_one(document)
    return _report_from_document(document)


def _journey_patches(actions: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    patches: dict[str, dict[str, Any]] = {}
    for action in actions:
        if action["kind"] not in {
            "normalize_metadata",
            "reopen_step",
            "transition_downstream",
        }:
            continue
        step_id = action["step_id"]
        target = patches.setdefault(step_id, {"fields": {}, "action_ids": []})
        target["fields"].update(deepcopy(action["after"]))
        target["action_ids"].append(action["action_id"])
    for patch in patches.values():
        if patch["fields"].get("status") == "in_progress":
            patch["fields"].setdefault("blocked_reason_code", None)
    return patches


def _same_documents(left: list[dict[str, Any]], right: list[dict[str, Any]]) -> bool:
    return sorted(map(_canonical_json, left)) == sorted(map(_canonical_json, right))


def _step_documents_compatible(
    original: list[dict[str, Any]],
    current: list[dict[str, Any]],
    report: dict[str, Any],
) -> bool:
    patches = _journey_patches(report["actions"])
    original_by_id: dict[str, list[dict[str, Any]]] = {}
    current_by_id: dict[str, list[dict[str, Any]]] = {}
    for document in original:
        original_by_id.setdefault(str(document.get("step_id")), []).append(document)
    for document in current:
        current_by_id.setdefault(str(document.get("step_id")), []).append(document)
    if set(original_by_id) != set(current_by_id):
        return False
    for step_id, originals in original_by_id.items():
        currents = current_by_id[step_id]
        if _same_documents(originals, currents):
            continue
        if step_id not in patches or len(originals) != 1 or len(currents) != 1:
            return False
        before = deepcopy(originals[0])
        after = deepcopy(currents[0])
        if after.get("phase2_migration_report_id") != report["report_id"]:
            return False
        for field in patches[step_id]["fields"]:
            if field in before:
                after[field] = deepcopy(before[field])
            else:
                after.pop(field, None)
        if "updated_at" in before:
            after["updated_at"] = deepcopy(before["updated_at"])
        else:
            after.pop("updated_at", None)
        for marker in _MIGRATION_MARKER_FIELDS:
            after.pop(marker, None)
        if _canonical_json(before) != _canonical_json(after):
            return False
    return True


def _output_identity(document: dict[str, Any]) -> tuple[Any, ...]:
    if document.get("_id") is not None:
        return ("_id", str(document["_id"]))
    return tuple(
        document.get(field)
        for field in (
            "partner_id",
            "step_id",
            "template_id",
            "template_version",
            "checksum",
            "source_checksum",
            "output_id",
        )
    )


def _output_version_identity(document: dict[str, Any]) -> tuple[Any, ...]:
    return tuple(
        document.get(field)
        for field in (
            "partner_id",
            "step_id",
            "template_id",
            "template_version",
            "checksum",
            "source_checksum",
        )
    )


def _legacy_output_request(
    report: dict[str, Any], action: dict[str, Any]
) -> OutputVersionRequest:
    category = action.get("after", {}).get("category") or (
        "calendario_30gg" if action["step_id"] == "11-calendario-30gg"
        else _OUTPUT_CATEGORY.get(action["step_id"], "legacy_phase2")
    )
    return OutputVersionRequest(
        partner_id=report["partner_id"],
        step_id=action["step_id"],
        category=category,
        template_id=f"legacy-reference-{category}",
        template_version="migration-v1",
        content={
            "migration_report_id": report["report_id"],
            "source_refs": deepcopy(action.get("before", {}).get("source_refs", [])),
        },
        source_checksums={
            "migration_report_id": report["report_id"],
            "migration_source_checksum": report["source_checksum"],
            "migration_action_id": action["action_id"],
        },
        actor_id=report.get("apply_actor_id") or report["actor_id"],
        initial_status="legacy",
    )


def _request_output_identity(request: OutputVersionRequest) -> tuple[Any, ...]:
    payload = json.dumps(
        request.content,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return (
        request.partner_id,
        request.step_id,
        request.template_id,
        request.template_version,
        hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        canonical_source_checksum(request.source_checksums),
    )


def _is_expected_migration_output(
    document: dict[str, Any], request: OutputVersionRequest
) -> bool:
    if _output_version_identity(document) != _request_output_identity(request):
        return False
    if not document.get("output_id"):
        allowed_partial_fields = {
            "_id",
            "partner_id",
            "step_id",
            "template_id",
            "template_version",
            "checksum",
            "source_checksum",
            "reservation_token",
            "reservation_state",
            "reservation_expires_at",
            "reservation_recovered_at",
            "reserved_version",
            "created_at",
        }
        return (
            document.get("reservation_state") == "allocating"
            and set(document) <= allowed_partial_fields
        )
    return (
        document.get("status") == "legacy"
        and document.get("category") == request.category
        and _canonical_json(document.get("content"))
        == _canonical_json(request.content)
        and _canonical_json(document.get("source_checksums"))
        == _canonical_json(request.source_checksums)
        and document.get("partner_approved") is not True
        and document.get("approved_at") is None
    )


def _output_documents_compatible(
    original: list[dict[str, Any]],
    current: list[dict[str, Any]],
    report: dict[str, Any],
) -> bool:
    archived_step_ids = {
        action["step_id"]
        for action in report["actions"]
        if action["kind"] == "archive_legacy"
        and action.get("after", {}).get("target") == "partner_phase2_output_versions"
    }
    expected_migration_requests = {
        _request_output_identity(request): request
        for action in report["actions"]
        if action["kind"] == "archive_legacy"
        and action.get("after", {}).get("target") == "partner_phase2_output_versions"
        for request in [_legacy_output_request(report, action)]
    }
    current_originals = {}
    for document in current:
        request = expected_migration_requests.get(_output_version_identity(document))
        if request and _is_expected_migration_output(document, request):
            continue
        current_originals[_output_identity(document)] = document
    if len(current_originals) != len(original):
        return False
    for before in original:
        after = current_originals.get(_output_identity(before))
        if after is None:
            return False
        if _canonical_json(before) == _canonical_json(after):
            continue
        restored = deepcopy(after)
        if before.get("step_id") not in archived_step_ids:
            return False
        for field in ("status", "is_current"):
            if field in before:
                restored[field] = deepcopy(before[field])
            else:
                restored.pop(field, None)
        if _canonical_json(before) != _canonical_json(restored):
            return False
    return True


def _calendar_identity(document: dict[str, Any]) -> tuple[Any, ...]:
    if document.get("_id") is not None:
        return ("_id", str(document["_id"]))
    return ("version", str(document.get("partner_id")), document.get("version"))


def _calendar_documents_compatible(
    original: list[dict[str, Any]],
    current: list[dict[str, Any]],
    report: dict[str, Any],
) -> bool:
    actions_by_id = {
        action["action_id"]: action
        for action in report["actions"]
        if action["kind"] == "archive_legacy"
        and action.get("after", {}).get("target") == "partner_launch_calendar_versions"
    }
    current_originals = {}
    for document in current:
        if document.get("migration_report_id") == report["report_id"]:
            action = actions_by_id.get(document.get("migration_action_id"))
            if not action:
                return False
            calendar = document.get("calendar")
            migration_source = document.get("migration_source") or {}
            if not isinstance(calendar, dict):
                return False
            if (
                document.get("partner_id") != report["partner_id"]
                or document.get("status") != "draft"
                or document.get("legacy_import") is not True
                or document.get("checksum") != calendar_checksum(calendar)
                or document.get("checksum")
                != action.get("before", {}).get("legacy_calendar_checksum")
                or migration_source.get("source_checksum")
                != report["source_checksum"]
                or _canonical_json(migration_source.get("source_refs", []))
                != _canonical_json(action.get("before", {}).get("source_refs", []))
                or document.get("approved_at") is not None
                or document.get("admin_review") is not None
                or document.get("partner_confirmed_at") is not None
            ):
                return False
            continue
        current_originals[_calendar_identity(document)] = document
    if len(current_originals) != len(original):
        return False
    return all(
        _canonical_json(before)
        == _canonical_json(current_originals.get(_calendar_identity(before)))
        for before in original
    )


def _partner_documents_compatible(
    original: list[dict[str, Any]], current: list[dict[str, Any]]
) -> bool:
    if len(original) != len(current):
        return False
    by_id = {str(document.get("id")): document for document in current}
    for before in original:
        after = by_id.get(str(before.get("id")))
        if after is None:
            return False
        restored = deepcopy(after)
        if "phase" in before:
            restored["phase"] = deepcopy(before["phase"])
        else:
            restored.pop("phase", None)
        if _canonical_json(before) != _canonical_json(restored):
            return False
    return True


def _source_state_compatible(
    original: dict[str, list[dict[str, Any]]],
    current: dict[str, list[dict[str, Any]]],
    report: dict[str, Any],
) -> bool:
    for collection_name in _SOURCE_COLLECTIONS:
        before = original.get(collection_name, [])
        after = current.get(collection_name, [])
        if collection_name == "partner_journey_steps":
            compatible = _step_documents_compatible(before, after, report)
        elif collection_name == "partner_phase2_output_versions":
            compatible = _output_documents_compatible(before, after, report)
        elif collection_name == "partner_launch_calendar_versions":
            compatible = _calendar_documents_compatible(before, after, report)
        elif collection_name == "partners":
            compatible = _partner_documents_compatible(before, after)
        else:
            compatible = _same_documents(before, after)
        if not compatible:
            return False
    return True


async def _assert_source_compatible(db, report: dict[str, Any], snapshot: dict[str, Any]):
    current = await _load_full_source_snapshot(db, report["partner_id"])
    if not _source_state_compatible(snapshot["source"], current, report):
        raise MigrationConflict("stale source detected during apply")
    return _source_checksum(current)


async def _ensure_snapshot(
    db,
    report: dict[str, Any],
    full_snapshot: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    snapshot_id = f"phase2-snapshot-{report['report_id']}"
    snapshot = await db.partner_phase2_migration_snapshots.find_one_and_update(
        {"report_id": report["report_id"]},
        {
            "$setOnInsert": {
                "snapshot_id": snapshot_id,
                "report_id": report["report_id"],
                "partner_id": report["partner_id"],
                "source_checksum": report["source_checksum"],
                "source": deepcopy(full_snapshot),
                "created_at": now,
                "created_by": report.get("apply_actor_id") or report["actor_id"],
            }
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if (
        snapshot.get("source_checksum") != report["source_checksum"]
        or snapshot.get("partner_id") != report["partner_id"]
    ):
        raise MigrationConflict("snapshot identity conflict")
    return snapshot


def _before_step_audit(source: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    steps = _steps_by_id(source["partner_journey_steps"])
    return {
        step_id: {
            field: deepcopy(step[field])
            for field in ("status", "completed_at", "updated_at")
            if field in step
        }
        for step_id, step in steps.items()
        if step_id in _CANONICAL_BY_ID
    }


async def _ensure_audit(
    db,
    report: dict[str, Any],
    snapshot: dict[str, Any],
    lease_id: str,
) -> dict[str, Any]:
    await _renew_lease(db, report["report_id"], lease_id)
    now = datetime.now(timezone.utc)
    audit_id = f"phase2-audit-{report['report_id']}"
    collection = db.partner_phase2_migration_audit
    existing = await collection.find_one({"report_id": report["report_id"]})
    if existing and existing.get("status") == "applied":
        return existing
    audit_query: dict[str, Any] = {"report_id": report["report_id"]}
    if existing:
        audit_query["status"] = existing.get("status")
        if "lease_id" in existing:
            audit_query["lease_id"] = existing.get("lease_id")
        else:
            audit_query["lease_id"] = {"$exists": False}
    else:
        audit_query["status"] = {"$exists": False}
        audit_query["lease_id"] = {"$exists": False}
    update = {
        "$setOnInsert": {
            "audit_id": audit_id,
            "report_id": report["report_id"],
            "partner_id": report["partner_id"],
            "snapshot_id": snapshot["snapshot_id"],
            "source_checksum": report["source_checksum"],
            "planned_actions": deepcopy(report["actions"]),
            "before_steps": _before_step_audit(snapshot["source"]),
            "effects": {},
            "created_at": now,
        },
        "$set": {
            "status": "applying",
            "lease_id": lease_id,
            "last_attempt_at": now,
            "last_actor_id": report.get("apply_actor_id") or report["actor_id"],
        },
    }
    try:
        audit = await collection.find_one_and_update(
            audit_query,
            update,
            upsert=existing is None,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        audit = None
    if audit:
        await _renew_lease(db, report["report_id"], lease_id)
        return audit
    latest = await collection.find_one({"report_id": report["report_id"]})
    if latest and latest.get("status") == "applied":
        return latest
    raise MigrationConflict("migration audit lease could not be acquired")


async def _record_effect(
    db,
    report_id: str,
    lease_id: str,
    action_id: str,
    effect: dict[str, Any],
):
    result = await db.partner_phase2_migration_audit.update_one(
        {"report_id": report_id, "status": "applying", "lease_id": lease_id},
        {"$set": {f"effects.{action_id}": deepcopy(effect)}},
    )
    if getattr(result, "matched_count", 0) != 1:
        raise MigrationConflict("migration audit lease lost")


async def _update_audit_owned(
    db,
    report_id: str,
    lease_id: str,
    fields: dict[str, Any],
) -> None:
    result = await db.partner_phase2_migration_audit.update_one(
        {"report_id": report_id, "status": "applying", "lease_id": lease_id},
        {"$set": deepcopy(fields)},
    )
    if getattr(result, "matched_count", 0) != 1:
        raise MigrationConflict("migration audit lease lost")


async def _renew_lease(db, report_id: str, lease_id: str):
    now = datetime.now(timezone.utc)
    renewed = await db.partner_phase2_migration_reports.find_one_and_update(
        {"report_id": report_id, "status": "applying", "lease_id": lease_id},
        {"$set": {"lease_expires_at": now + timedelta(seconds=_APPLY_LEASE_SECONDS)}},
        return_document=ReturnDocument.AFTER,
    )
    if not renewed:
        raise MigrationConflict("migration apply lease lost")


def _legacy_calendar_from_snapshot(
    snapshot: dict[str, Any], partner_id: str
) -> dict[str, Any]:
    step = next(
        (
            document
            for document in snapshot["source"]["partner_journey_steps"]
            if document.get("partner_id") == partner_id
            and document.get("step_id") == "11-calendario-30gg"
        ),
        None,
    )
    return _legacy_calendar_payload((step or {}).get("data"))


async def _archive_legacy_calendar_action(
    db,
    report: dict[str, Any],
    action: dict[str, Any],
    snapshot: dict[str, Any],
) -> dict[str, Any]:
    versions = db.partner_launch_calendar_versions
    identity = {
        "partner_id": report["partner_id"],
        "migration_report_id": report["report_id"],
        "migration_action_id": action["action_id"],
    }
    existing = await versions.find_one(identity)
    if existing:
        if not _calendar_documents_compatible([], [existing], report):
            raise MigrationConflict("migration calendar identity conflict")
        return {
            "status": "applied",
            "kind": "archive_legacy_calendar",
            "calendar_version": existing["version"],
            "calendar_checksum": existing["checksum"],
            "created": False,
        }

    calendar = _legacy_calendar_from_snapshot(snapshot, report["partner_id"])
    latest = await versions.find_one(
        {"partner_id": report["partner_id"]},
        {"_id": 0, "version": 1},
        sort=[("version", -1)],
    )
    max_existing_version = int((latest or {}).get("version") or 0)
    counter = await db.partner_launch_calendar_counters.find_one_and_update(
        {"_id": report["partner_id"]},
        [
            {
                "$set": {
                    "seq": {
                        "$add": [
                            {
                                "$max": [
                                    {"$ifNull": ["$seq", 0]},
                                    max_existing_version,
                                ]
                            },
                            1,
                        ]
                    }
                }
            }
        ],
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    version = int(counter["seq"])
    now = datetime.now(timezone.utc)
    document = {
        **identity,
        "version": version,
        "status": "draft",
        "calendar": calendar,
        "checksum": calendar_checksum(calendar),
        "source": deepcopy(calendar.get("source")),
        "migration_source": {
            "kind": "phase2_legacy_migration",
            "source_checksum": report["source_checksum"],
            "source_refs": deepcopy(action.get("before", {}).get("source_refs", [])),
        },
        "legacy_import": True,
        "created_at": now.isoformat(),
        "created_by": report.get("apply_actor_id") or report["actor_id"],
        "partner_confirmed_at": None,
        "approved_at": None,
        "admin_review": None,
    }
    try:
        stored = await versions.find_one_and_update(
            identity,
            {"$setOnInsert": document},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        stored = await versions.find_one(identity)
    if not stored or not _calendar_documents_compatible([], [stored], report):
        raise MigrationConflict("migration calendar identity conflict")
    return {
        "status": "applied",
        "kind": "archive_legacy_calendar",
        "calendar_version": stored["version"],
        "calendar_checksum": stored["checksum"],
        "created": stored.get("version") == version,
    }


async def _archive_legacy_action(
    db,
    report: dict[str, Any],
    action: dict[str, Any],
    snapshot: dict[str, Any],
) -> dict[str, Any]:
    target = action.get("after", {}).get("target")
    if target == "partner_launch_calendar_versions":
        return await _archive_legacy_calendar_action(db, report, action, snapshot)
    if target != "partner_phase2_output_versions":
        raise MigrationConflict(f"unsupported archive target {target}")
    request = _legacy_output_request(report, action)
    result = await archive_phase2_output(
        db,
        request,
    )
    return {
        "status": "applied",
        "kind": "archive_legacy",
        "output_id": result.output_id,
        "version": result.version,
        "created": result.created,
    }


def _patch_matches(document: dict[str, Any], fields: dict[str, Any]) -> bool:
    return all(_canonical_json(document.get(key)) == _canonical_json(value) for key, value in fields.items())


async def _apply_journey_patch(
    db,
    report: dict[str, Any],
    step_id: str,
    patch: dict[str, Any],
) -> bool:
    collection = db.partner_journey_steps
    current = await collection.find_one(
        {"partner_id": report["partner_id"], "step_id": step_id}
    )
    desired = deepcopy(patch["fields"])
    if (
        current
        and current.get("phase2_migration_report_id") == report["report_id"]
        and _patch_matches(current, desired)
    ):
        return False

    expected = report["expected_steps"].get(step_id) or {}
    if expected.get("record_count") != 1:
        raise MigrationConflict(
            f"compare-and-set failed for {step_id}: expected exactly one journey record"
        )
    query: dict[str, Any] = {
        "partner_id": report["partner_id"],
        "step_id": step_id,
    }
    if expected.get("updated_at_exists"):
        query["updated_at"] = expected.get("updated_at")
    else:
        query["updated_at"] = {"$exists": False}
    if expected.get("status_exists"):
        query["status"] = expected.get("status")
    else:
        query["status"] = {"$exists": False}

    now = datetime.now(timezone.utc)
    fields = {
        **desired,
        "updated_at": now,
        "phase2_migration_report_id": report["report_id"],
        "phase2_migration_action_ids": list(patch["action_ids"]),
        "phase2_migration_applied_at": now,
    }
    result = await collection.update_one(query, {"$set": fields})
    if getattr(result, "matched_count", 0) != 1:
        raced = await collection.find_one(
            {"partner_id": report["partner_id"], "step_id": step_id}
        )
        if not (
            raced
            and raced.get("phase2_migration_report_id") == report["report_id"]
            and _patch_matches(raced, desired)
        ):
            raise MigrationConflict(f"compare-and-set failed for {step_id}")
        return False
    return True


async def _project_partner_phase(db, partner_id: str):
    # Usa la proiezione gia' adottata dalla migrazione canonica; phase resta derivata.
    from scripts.migrate_to_canonical_journey import _project_phase

    await _project_phase(db, partner_id, apply=True)


async def _wait_for_applied_report(db, report_id: str) -> MigrationApplyResult:
    deadline = time.monotonic() + _APPLY_WAIT_SECONDS
    while time.monotonic() < deadline:
        latest = await db.partner_phase2_migration_reports.find_one({"report_id": report_id})
        if latest and latest.get("status") == "applied":
            return _apply_result_from_document(latest)
        if latest and latest.get("status") == "conflict":
            raise MigrationConflict("migration report is in conflict")
        await asyncio.sleep(_APPLY_POLL_SECONDS)
    raise MigrationConflict("migration apply lease is still active")


async def _mark_conflict(db, report_id: str, lease_id: str, reason: str):
    now = datetime.now(timezone.utc)
    existing_audit = await db.partner_phase2_migration_audit.find_one(
        {"report_id": report_id}
    )
    report_result = await db.partner_phase2_migration_reports.update_one(
        {"report_id": report_id, "status": "applying", "lease_id": lease_id},
        {
            "$set": {
                "status": "conflict",
                "conflict_at": now,
                "conflict_reason": reason,
                "conflict_lease_id": lease_id,
            },
            "$unset": {"lease_id": "", "lease_expires_at": ""},
        },
    )
    if getattr(report_result, "matched_count", 0) != 1:
        return False
    audit_result = await db.partner_phase2_migration_audit.update_one(
        {"report_id": report_id, "status": "applying", "lease_id": lease_id},
        {
            "$set": {
                "status": "conflict",
                "conflict_at": now,
                "conflict_reason": reason,
            }
        },
    )
    if existing_audit and getattr(audit_result, "matched_count", 0) != 1:
        raise MigrationConflict("migration conflict audit could not be fenced")
    return True


async def _repair_conflict_audit(db, report: dict[str, Any]) -> None:
    lease_id = report.get("conflict_lease_id")
    if not lease_id:
        return
    await db.partner_phase2_migration_audit.update_one(
        {
            "report_id": report["report_id"],
            "status": "applying",
            "lease_id": lease_id,
        },
        {
            "$set": {
                "status": "conflict",
                "conflict_at": report.get("conflict_at"),
                "conflict_reason": report.get("conflict_reason"),
            }
        },
    )


async def apply_phase2_migration(
    db, report_id: str, actor_id: str
) -> MigrationApplyResult:
    """Applica un report revisionato con lease, snapshot, CAS e retry idempotente."""
    reports = db.partner_phase2_migration_reports
    report = await reports.find_one({"report_id": str(report_id)})
    if not report:
        raise MigrationConflict("migration report not found")
    if report.get("status") == "applied":
        return _apply_result_from_document(report)
    if report.get("status") == "conflict":
        await _repair_conflict_audit(db, report)
        raise MigrationConflict("migration report is in conflict")
    _validate_canonical_step_cardinality(report)

    now = datetime.now(timezone.utc)
    lease_id = uuid.uuid4().hex
    claimed = None
    full_snapshot = None
    audit = None
    if report.get("status") == "review_required":
        current = await _load_source_snapshot(db, report["partner_id"])
        current_checksum = _source_checksum(current)
        if current_checksum != report["source_checksum"]:
            raise MigrationConflict("stale migration report: source changed")
        claimed = await reports.find_one_and_update(
            {
                "report_id": report["report_id"],
                "status": "review_required",
                "source_checksum": current_checksum,
            },
            {
                "$set": {
                    "status": "applying",
                    "lease_id": lease_id,
                    "lease_expires_at": now + timedelta(seconds=_APPLY_LEASE_SECONDS),
                    "apply_started_at": now,
                    "apply_actor_id": str(actor_id),
                    "updated_at": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        if not claimed:
            latest = await reports.find_one({"report_id": report["report_id"]})
            if latest and latest.get("status") == "applied":
                return _apply_result_from_document(latest)
            if latest and latest.get("status") == "applying":
                return await _wait_for_applied_report(db, report["report_id"])
            raise MigrationConflict("migration report could not be claimed")
        full_snapshot = await _load_full_source_snapshot(db, report["partner_id"])
        if _checksum_from_full_snapshot(full_snapshot) != report["source_checksum"]:
            await reports.update_one(
                {
                    "report_id": report["report_id"],
                    "status": "applying",
                    "lease_id": lease_id,
                },
                {
                    "$set": {"status": "review_required", "last_conflict_at": now},
                    "$unset": {"lease_id": "", "lease_expires_at": ""},
                },
            )
            raise MigrationConflict("stale migration report: source changed after claim")
    elif report.get("status") == "applying":
        expires_at = _as_utc(report.get("lease_expires_at"))
        if expires_at and expires_at > now:
            return await _wait_for_applied_report(db, report["report_id"])
        stored_snapshot = await db.partner_phase2_migration_snapshots.find_one(
            {"report_id": report["report_id"]}
        )
        claim_query = {
            "report_id": report["report_id"],
            "status": "applying",
            "source_checksum": report["source_checksum"],
            "lease_id": report.get("lease_id"),
            "lease_expires_at": report.get("lease_expires_at"),
        }
        claimed = await reports.find_one_and_update(
            claim_query,
            {
                "$set": {
                    "lease_id": lease_id,
                    "lease_expires_at": now + timedelta(seconds=_APPLY_LEASE_SECONDS),
                    "apply_recovered_at": now,
                    "apply_actor_id": str(actor_id),
                    "updated_at": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        if not claimed:
            latest = await reports.find_one({"report_id": report["report_id"]})
            if latest and latest.get("status") == "applied":
                return _apply_result_from_document(latest)
            return await _wait_for_applied_report(db, report["report_id"])
        if stored_snapshot:
            audit = await _ensure_audit(db, claimed, stored_snapshot, lease_id)
            try:
                await _assert_source_compatible(db, claimed, stored_snapshot)
            except MigrationConflict as exc:
                await _mark_conflict(db, report["report_id"], lease_id, str(exc))
                raise
            full_snapshot = stored_snapshot["source"]
        else:
            current = await _load_source_snapshot(db, report["partner_id"])
            if _source_checksum(current) != report["source_checksum"]:
                reason = "stale migration report without recovery snapshot"
                await _mark_conflict(db, report["report_id"], lease_id, reason)
                raise MigrationConflict(reason)
            full_snapshot = await _load_full_source_snapshot(db, report["partner_id"])
            if _checksum_from_full_snapshot(full_snapshot) != report["source_checksum"]:
                reason = "stale migration report: source changed after recovery claim"
                await _mark_conflict(db, report["report_id"], lease_id, reason)
                raise MigrationConflict(reason)
    else:
        raise MigrationConflict(f"migration report status {report.get('status')} is not applicable")

    report = claimed
    _validate_canonical_step_cardinality(report, full_snapshot)
    snapshot = await _ensure_snapshot(db, report, full_snapshot)
    if audit is None:
        audit = await _ensure_audit(db, report, snapshot, lease_id)
    if audit.get("status") == "applied":
        applied_at = audit["applied_at"]
        finalized = await reports.find_one_and_update(
            {"report_id": report["report_id"], "status": "applying", "lease_id": lease_id},
            {
                "$set": {
                    "status": "applied",
                    "snapshot_id": snapshot["snapshot_id"],
                    "audit_id": audit["audit_id"],
                    "applied_at": applied_at,
                    "updated_at": applied_at,
                },
                "$unset": {"lease_id": "", "lease_expires_at": ""},
            },
            return_document=ReturnDocument.AFTER,
        )
        if finalized:
            return _apply_result_from_document(finalized)

    try:
        await _assert_source_compatible(db, report, snapshot)
        for action in report["actions"]:
            if action["kind"] != "archive_legacy":
                continue
            await _renew_lease(db, report["report_id"], lease_id)
            await _assert_source_compatible(db, report, snapshot)
            effect = await _archive_legacy_action(db, report, action, snapshot)
            await _record_effect(
                db,
                report["report_id"],
                lease_id,
                action["action_id"],
                effect,
            )

        patches = _journey_patches(report["actions"])
        for step_id in _CANONICAL_STEP_IDS:
            patch = patches.get(step_id)
            if not patch:
                continue
            await _renew_lease(db, report["report_id"], lease_id)
            await _assert_source_compatible(db, report, snapshot)
            created = await _apply_journey_patch(db, report, step_id, patch)
            for action_id in patch["action_ids"]:
                await _record_effect(
                    db,
                    report["report_id"],
                    lease_id,
                    action_id,
                    {
                        "status": "applied",
                        "kind": "journey_compare_and_set",
                        "created": created,
                    },
                )

        for action in report["actions"]:
            if action["kind"] in {
                "archive_legacy",
                "normalize_metadata",
                "reopen_step",
                "transition_downstream",
            }:
                continue
            if action["kind"] not in {"preserve_source", "preserve_step"}:
                raise MigrationConflict(f"unsupported migration action {action['kind']}")
            await _record_effect(
                db,
                report["report_id"],
                lease_id,
                action["action_id"],
                {"status": "preserved", "kind": action["kind"]},
            )

        await _assert_source_compatible(db, report, snapshot)
        await _renew_lease(db, report["report_id"], lease_id)
        await _project_partner_phase(db, report["partner_id"])
        await _renew_lease(db, report["report_id"], lease_id)
        post_projection_checksum = await _assert_source_compatible(db, report, snapshot)
        await _update_audit_owned(
            db,
            report["report_id"],
            lease_id,
            {
                "projection_status": "applied",
                "post_projection_checksum": post_projection_checksum,
            },
        )
    except MigrationConflict as exc:
        await _mark_conflict(db, report["report_id"], lease_id, str(exc))
        raise
    except Exception as exc:
        await db.partner_phase2_migration_audit.update_one(
            {
                "report_id": report["report_id"],
                "status": "applying",
                "lease_id": lease_id,
            },
            {
                "$set": {
                    "status": "partial_failure",
                    "failed_at": datetime.now(timezone.utc),
                    "failure_type": type(exc).__name__,
                }
            },
        )
        raise

    applied_at = datetime.now(timezone.utc)
    await _update_audit_owned(
        db,
        report["report_id"],
        lease_id,
        {
            "status": "applied",
            "applied_at": applied_at,
            "applied_by": str(actor_id),
        },
    )
    finalized = await reports.find_one_and_update(
        {"report_id": report["report_id"], "status": "applying", "lease_id": lease_id},
        {
            "$set": {
                "status": "applied",
                "snapshot_id": snapshot["snapshot_id"],
                "audit_id": audit["audit_id"],
                "applied_at": applied_at,
                "updated_at": applied_at,
            },
            "$unset": {"lease_id": "", "lease_expires_at": ""},
        },
        return_document=ReturnDocument.AFTER,
    )
    if not finalized:
        latest = await reports.find_one({"report_id": report["report_id"]})
        if latest and latest.get("status") == "applied":
            return _apply_result_from_document(latest)
        raise MigrationConflict("migration result could not be finalized")
    return _apply_result_from_document(finalized)
