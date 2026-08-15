"""Piano read-only e conservativo per migrare la Fase 2 canonica."""
from dataclasses import dataclass
from datetime import date, datetime, timezone
import base64
import hashlib
import json
from typing import Any

from fastapi import HTTPException
from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from services.journey_completion import (
    all_required_lessons_approved,
    approved_launch_calendar_context,
    masterclass_current_version_approved,
)
from services.phase2_conformity import evaluate_phase2_conformity
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


def _matches_partner(collection_name: str, partner_id: str) -> dict[str, str]:
    return {"id": partner_id} if collection_name == "partners" else {"partner_id": partner_id}


async def _find_many(collection, query: dict[str, Any]) -> list[dict[str, Any]]:
    cursor = collection.find(query, {"_id": 0})
    return await cursor.to_list(length=1000)


async def _load_source_snapshot(db, partner_id: str) -> dict[str, list[dict[str, Any]]]:
    snapshot = {}
    for collection_name in _SOURCE_COLLECTIONS:
        collection = getattr(db, collection_name)
        documents = await _find_many(
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
        actions.append(_action(
            "archive_legacy",
            "11-calendario-30gg",
            "legacy_calendar_requires_canonical_review",
            {"source_refs": [{"collection": "partner_journey_steps", "field": "data"}]},
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
                    "blocked_reason_code": "upstream_output_not_current",
                },
            ))

    return MigrationPlan(
        partner_id=str(partner_id),
        actor_id=str(actor_id),
        source_checksum=_source_checksum(snapshot),
        actions=actions,
    )
