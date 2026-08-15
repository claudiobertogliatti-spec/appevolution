import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import os
from types import SimpleNamespace

import pytest
from pymongo.errors import AutoReconnect, DocumentTooLarge, OperationFailure

os.environ.setdefault("MONGO_URL", "mongodb://phase2-migration-test.invalid:27017")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "phase2-migration-test-secret-not-for-production")

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from routers.partner_rewards import _workbook_binding, _workbook_payload
from db_indexes import ensure_indexes
from services.launch_calendar import calendar_checksum
from services.phase2_migration import (
    MigrationConflict,
    apply_phase2_migration,
    build_phase2_evidence,
    create_phase2_dry_run,
    plan_phase2_migration,
)


pytestmark = pytest.mark.unit


_MISSING = object()


def _path_value(document, path):
    value = document
    for part in path.split("."):
        if not isinstance(value, dict) or part not in value:
            return _MISSING
        value = value[part]
    return value


def _set_path(document, path, value):
    target = document
    parts = path.split(".")
    for part in parts[:-1]:
        target = target.setdefault(part, {})
    target[parts[-1]] = deepcopy(value)


def _evaluate(expression, document):
    if isinstance(expression, str) and expression.startswith("$"):
        return _path_value(document, expression[1:])
    if isinstance(expression, list):
        return [_evaluate(item, document) for item in expression]
    if not isinstance(expression, dict):
        return expression
    if "$literal" in expression:
        return expression["$literal"]
    if "$ifNull" in expression:
        value, fallback = (_evaluate(item, document) for item in expression["$ifNull"])
        return fallback if value is _MISSING or value is None else value
    if "$max" in expression:
        return max(_evaluate(item, document) for item in expression["$max"])
    if "$add" in expression:
        return sum(_evaluate(item, document) for item in expression["$add"])
    if "$eq" in expression:
        left, right = (_evaluate(item, document) for item in expression["$eq"])
        return left == right
    if "$type" in expression:
        value = _evaluate(expression["$type"], document)
        return "missing" if value is _MISSING else type(value).__name__
    if "$cond" in expression:
        condition, when_true, when_false = expression["$cond"]
        branch = when_true if _evaluate(condition, document) else when_false
        return _evaluate(branch, document)
    raise AssertionError(f"Operatore pipeline fake non supportato: {expression}")


def _apply_update(document, update, *, is_insert=False):
    if isinstance(update, list):
        for stage in update:
            snapshot = deepcopy(document)
            changes = {
                path: _evaluate(expression, snapshot)
                for path, expression in stage.get("$set", {}).items()
            }
            for path, value in changes.items():
                _set_path(document, path, value)
        return
    for key, value in update.get("$inc", {}).items():
        _set_path(document, key, (_path_value(document, key) or 0) + value)
    if is_insert:
        for key, value in update.get("$setOnInsert", {}).items():
            _set_path(document, key, value)
    for key, value in update.get("$set", {}).items():
        _set_path(document, key, value)
    for key in update.get("$unset", {}):
        document.pop(key, None)


class FakeCursor:
    def __init__(self, documents, projection=None):
        self.documents = deepcopy(list(documents))
        if projection and projection.get("_id") == 0:
            for document in self.documents:
                document.pop("_id", None)

    def sort(self, key, direction):
        self.documents.sort(key=lambda item: item.get(key, 0), reverse=direction < 0)
        return self

    async def to_list(self, length):
        return deepcopy(self.documents if length is None else self.documents[:length])


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = deepcopy(documents or [])

    async def find_one(self, query, projection=None, sort=None):
        await asyncio.sleep(0)
        matches = [document for document in self.documents if _matches(document, query)]
        for key, direction in reversed(sort or []):
            matches.sort(key=lambda item: item.get(key, 0), reverse=direction < 0)
        return deepcopy(matches[0]) if matches else None

    def find(self, query, projection=None):
        return FakeCursor(
            (document for document in self.documents if _matches(document, query)),
            projection,
        )

    async def insert_one(self, document):
        await asyncio.sleep(0)
        self.documents.append(deepcopy(document))
        return SimpleNamespace(inserted_id=document.get("report_id") or document.get("snapshot_id"))

    async def find_one_and_update(
        self, query, update, upsert=False, return_document=None
    ):
        await asyncio.sleep(0)
        for document in self.documents:
            if _matches(document, query):
                _apply_update(document, update)
                return deepcopy(document)
        if upsert:
            document = {
                key: deepcopy(value)
                for key, value in query.items()
                if not isinstance(value, dict)
            }
            _apply_update(document, update, is_insert=True)
            self.documents.append(document)
            return deepcopy(document)
        return None

    async def update_one(self, query, update, upsert=False):
        await asyncio.sleep(0)
        for document in self.documents:
            if _matches(document, query):
                before = deepcopy(document)
                _apply_update(document, update)
                return SimpleNamespace(
                    matched_count=1,
                    modified_count=int(document != before),
                    upserted_id=None,
                )
        if upsert:
            document = {
                key: deepcopy(value)
                for key, value in query.items()
                if not isinstance(value, dict)
            }
            _apply_update(document, update, is_insert=True)
            self.documents.append(document)
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id="fake")
        return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=None)

    async def update_many(self, query, update):
        await asyncio.sleep(0)
        matched = 0
        modified = 0
        for document in self.documents:
            if _matches(document, query):
                matched += 1
                before = deepcopy(document)
                _apply_update(document, update)
                modified += int(document != before)
        return SimpleNamespace(matched_count=matched, modified_count=modified)

    async def count_documents(self, query):
        await asyncio.sleep(0)
        return sum(_matches(document, query) for document in self.documents)


def _matches(document, query):
    for key, expected in query.items():
        actual = _path_value(document, key)
        if isinstance(expected, dict):
            if "$exists" in expected and ((actual is not _MISSING) != expected["$exists"]):
                return False
            if "$lt" in expected and (actual is _MISSING or not actual < expected["$lt"]):
                return False
            if "$gt" in expected and (actual is _MISSING or not actual > expected["$gt"]):
                return False
            if "$lte" in expected and (actual is _MISSING or not actual <= expected["$lte"]):
                return False
            if "$ne" in expected and actual == expected["$ne"]:
                return False
        elif actual is _MISSING or actual != expected:
            return False
    return True


class FakeDB:
    COLLECTIONS = (
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
        "partner_launch_calendar_counters",
        "partner_phase2_output_counters",
        "partner_phase2_migration_reports",
        "partner_phase2_migration_snapshots",
        "partner_phase2_migration_audit",
    )

    def __init__(self, **documents):
        for name in self.COLLECTIONS:
            setattr(self, name, FakeCollection(documents.get(name)))

    def dump(self):
        return {
            name: deepcopy(getattr(self, name).documents)
            for name in self.COLLECTIONS
        }


@pytest.fixture
def daniele_db():
    now = datetime(2026, 8, 15, 9, 30, tzinfo=timezone.utc)
    steps = [
        {
            "partner_id": "23",
            "step_id": "05-script-masterclass",
            "step_number": 5,
            "status": "done",
            "data": {"full_script": "Script masterclass storico"},
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "06-outline-lezioni",
            "step_number": 6,
            "status": "done",
            "data": {"course_title": "Sabai Academy"},
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "07-script-videolezioni",
            "step_number": 9,
            "status": "done",
            "data": {"lesson_scripts": ["Lezione storica"]},
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "09-funnel-asset",
            "step_number": 9,
            "status": "done",
            "data": {"url": "https://example.test/funnel-storico"},
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "08-registra-masterclass",
            "step_number": 7,
            "status": "done",
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "09-registra-lezioni",
            "step_number": 8,
            "status": "done",
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "10-sistema-vendita",
            "step_number": 10,
            "status": "done",
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "11-calendario-30gg",
            "step_number": 11,
            "status": "done",
            "data": {"calendar": {"days": 30}},
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "12-prezzo-webinar",
            "step_number": 12,
            "status": "in_progress",
            "data": {"price": "297 EUR"},
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "pending",
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "13-lancio",
            "step_number": 13,
            "status": "pending",
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "18-certificato-valida",
            "step_number": 18,
            "status": "pending",
            "updated_at": now,
        },
        {
            "partner_id": "23",
            "step_id": "19-workbook-finale",
            "step_number": 19,
            "status": "pending",
            "updated_at": now,
        },
    ]
    lessons = {
        f"lesson-{index:02d}": {
            "video_youtube_url": f"https://youtu.be/lesson-{index:02d}",
            "video_approved": True,
        }
        for index in range(1, 33)
    }
    return FakeDB(
        partner_journey_steps=steps,
        partners=[{"id": "23", "launch_date": None}],
        partner_hub=[{"partner_id": "23", "offerPrice": "297 EUR"}],
        partner_funnel=[{"partner_id": "23", "published": True}],
        masterclass_factory=[{
            "partner_id": "23",
            "video_youtube_url": "https://youtu.be/masterclass-storica",
            "full_script": "Script masterclass storico",
        }],
        partner_videocorso=[{
            "partner_id": "23",
            "course_data": {
                "moduli": [{"lezioni": [{"id": lesson_id} for lesson_id in lessons]}]
            },
            "lessons": lessons,
        }],
    )


@pytest.mark.asyncio
async def test_plan_reopens_legacy_done_steps_without_deleting_sources(daniele_db):
    before = deepcopy(daniele_db.dump())

    plan = await plan_phase2_migration(daniele_db, "23", "admin-1")

    assert plan.partner_id == "23"
    assert plan.source_checksum
    assert "05-script-masterclass" in plan.reopen_step_ids
    assert "10-sistema-vendita" in plan.reopen_step_ids
    assert "11-calendario-30gg" in plan.reopen_step_ids
    assert plan.archive_actions
    assert json.loads(json.dumps(plan.to_dict()))["source_checksum"] == plan.source_checksum
    assert daniele_db.dump() == before


@pytest.mark.asyncio
async def test_evidence_is_derived_from_current_server_records_and_sanitized(daniele_db):
    daniele_db.partner_phase2_output_versions.documents.append({
        "partner_id": "23",
        "step_id": "05-script-masterclass",
        "output_id": "out-script",
        "version": 1,
        "status": "approved",
        "is_current": True,
        "checksum": "script-checksum",
        "content": {"token": "must-not-leak", "pdf": b"binary-payload"},
    })
    daniele_db.partner_journey_steps.documents[0]["data"]["masterclass_script_approved"] = True
    daniele_db.partner_journey_steps.documents[1]["data"]["course_outline_approved"] = True

    evidence = await build_phase2_evidence(daniele_db, "23")

    assert evidence["masterclass_script_approved"] is True
    assert evidence["course_outline_approved"] is False
    assert evidence["sales_system_ready"] is False
    assert evidence["launch_calendar_approved"] is False
    approved = evidence["approved_outputs"]["05-script-masterclass"]
    assert approved == {
        "output_id": "out-script",
        "step_id": "05-script-masterclass",
        "version": 1,
        "status": "approved",
        "is_current": True,
        "checksum": "script-checksum",
    }


@pytest.mark.asyncio
async def test_plan_is_deterministic_actor_independent_and_never_deletes(daniele_db):
    first = await plan_phase2_migration(daniele_db, "23", "admin-a")
    second = await plan_phase2_migration(daniele_db, "23", "admin-b")

    assert first.source_checksum == second.source_checksum
    assert first.actions == second.actions
    assert not any(action["kind"] == "delete" for action in first.actions)


@pytest.mark.asyncio
async def test_checksum_and_actions_ignore_database_iteration_order(daniele_db):
    reordered = FakeDB(**{
        name: list(reversed(documents))
        for name, documents in daniele_db.dump().items()
    })

    original_plan = await plan_phase2_migration(daniele_db, "23", "admin-1")
    reordered_plan = await plan_phase2_migration(reordered, "23", "admin-1")

    assert reordered_plan.source_checksum == original_plan.source_checksum
    assert reordered_plan.actions == original_plan.actions


@pytest.mark.asyncio
async def test_only_f8_to_f19_metadata_is_canonicalized(daniele_db):
    plan = await plan_phase2_migration(daniele_db, "23", "admin-1")

    normalized = {
        action["step_id"]
        for action in plan.actions
        if action["kind"] == "normalize_metadata"
    }
    assert "09-funnel-asset" not in normalized
    assert normalized <= {
        definition["step_id"]
        for definition in JOURNEY_STEPS_DEFINITION
        if 8 <= definition["step_number"] <= 19
    }


@pytest.mark.asyncio
async def test_first_nonconformant_step_is_active_and_later_reopens_are_blocked(daniele_db):
    plan = await plan_phase2_migration(daniele_db, "23", "admin-1")
    reopened = {
        action["step_id"]: action
        for action in plan.actions
        if action["kind"] == "reopen_step"
    }

    assert reopened["05-script-masterclass"]["after"] == {
        "status": "in_progress",
        "completed_at": None,
    }
    assert reopened["10-sistema-vendita"]["after"]["status"] == "pending"
    assert reopened["10-sistema-vendita"]["after"]["blocked_reason_code"] == (
        "upstream_output_not_current"
    )


@pytest.mark.asyncio
async def test_existing_in_progress_is_the_only_front_and_later_done_is_blocked(daniele_db):
    by_id = {
        step["step_id"]: step
        for step in daniele_db.partner_journey_steps.documents
    }
    by_id["05-script-masterclass"]["status"] = "in_progress"
    by_id["12-prezzo-webinar"]["status"] = "pending"

    plan = await plan_phase2_migration(daniele_db, "23", "admin-1")
    proposed = {step_id: step["status"] for step_id, step in by_id.items()}
    for action in plan.actions:
        if action["kind"] in ("reopen_step", "transition_downstream"):
            proposed[action["step_id"]] = action["after"]["status"]

    assert proposed["05-script-masterclass"] == "in_progress"
    assert proposed["06-outline-lezioni"] == "pending"
    assert [step_id for step_id, status in proposed.items() if status == "in_progress"] == [
        "05-script-masterclass"
    ]


class MutatingOutputCursor(FakeCursor):
    def __init__(self, documents, mutate):
        super().__init__(documents)
        self.mutate = mutate

    async def to_list(self, length):
        result = await super().to_list(length)
        self.mutate()
        return result


class MutatingOutputCollection(FakeCollection):
    def __init__(self):
        super().__init__()
        self.mutated = False

    def find(self, query, projection=None):
        documents = [
            document for document in self.documents if _matches(document, query)
        ]

        def mutate():
            if self.mutated:
                return
            self.mutated = True
            self.documents.append({
                "partner_id": "23",
                "step_id": "05-script-masterclass",
                "output_id": "approved-after-freeze",
                "version": 1,
                "status": "approved",
                "is_current": True,
                "checksum": "new-checksum",
            })

        return MutatingOutputCursor(documents, mutate)


@pytest.mark.asyncio
async def test_plan_uses_frozen_output_snapshot_and_next_checksum_detects_change(daniele_db):
    daniele_db.partner_phase2_output_versions = MutatingOutputCollection()

    frozen = await plan_phase2_migration(daniele_db, "23", "admin-1")
    changed = await plan_phase2_migration(daniele_db, "23", "admin-1")

    assert "05-script-masterclass" in frozen.reopen_step_ids
    assert "05-script-masterclass" not in changed.reopen_step_ids
    assert frozen.source_checksum != changed.source_checksum


@pytest.mark.asyncio
async def test_legacy_scripts_and_raw_media_use_sanitized_real_source_references(daniele_db):
    by_id = {
        step["step_id"]: step
        for step in daniele_db.partner_journey_steps.documents
    }
    by_id["05-script-masterclass"]["data"] = {}
    by_id["07-script-videolezioni"]["data"] = {}
    masterclass = daniele_db.masterclass_factory.documents[0]
    masterclass.pop("full_script")
    masterclass.update({
        "script_content": "Script corrente reale",
        "video_raw_url": "gs://private-bucket/raw/masterclass.mp4",
    })
    course = daniele_db.partner_videocorso.documents[0]
    course["lessons"]["lesson-01"].update({
        "approved_script": "Script lezione approvato",
        "video_raw_url": "gs://private-bucket/raw/lesson-01.mp4",
    })

    plan = await plan_phase2_migration(daniele_db, "23", "admin-1")
    archives = {action["step_id"]: action for action in plan.archive_actions}
    preserved = {
        action["step_id"]: action
        for action in plan.actions
        if action["kind"] == "preserve_source"
    }

    assert archives["05-script-masterclass"]["before"]["source_refs"] == [{
        "collection": "masterclass_factory",
        "field": "script_content",
    }]
    assert archives["07-script-videolezioni"]["before"]["source_refs"] == [{
        "collection": "partner_videocorso",
        "field": "lessons.lesson-01.approved_script",
    }]
    assert "course_data" not in json.dumps(archives["07-script-videolezioni"])
    assert preserved["08-registra-masterclass"]["before"]["raw_source_fields"] == [
        "video_raw_url"
    ]
    assert preserved["09-registra-lezioni"]["before"]["raw_lesson_count"] == 1
    assert "private-bucket" not in json.dumps(plan.to_dict())


def _approved_video(url):
    return {
        "output_version": 1,
        "video_youtube_url": url,
        "pipeline_status": "approved",
        "partner_approved": True,
        "partner_review_status": "approved",
        "partner_review_version": 1,
    }


@pytest.fixture
def conformant_db():
    now = datetime(2026, 8, 15, 10, 0, tzinfo=timezone.utc)
    definitions = [
        definition
        for definition in JOURNEY_STEPS_DEFINITION
        if 8 <= definition["step_number"] <= 19
    ]
    steps = [
        {
            "partner_id": "ok",
            **deepcopy(definition),
            "status": "done",
            "completed_at": now,
            "updated_at": now,
        }
        for definition in definitions
    ]
    output_steps = (
        "05-script-masterclass",
        "06-outline-lezioni",
        "07-script-videolezioni",
        "12-prezzo-webinar",
    )
    outputs = [
        {
            "partner_id": "ok",
            "step_id": step_id,
            "output_id": f"output-{step_id}",
            "version": 1,
            "status": "approved",
            "is_current": True,
            "checksum": f"checksum-{step_id}",
        }
        for step_id in output_steps
    ]
    calendar = {"days": [{"day": day} for day in range(1, 31)]}
    checksum = calendar_checksum(calendar)
    partner = {
        "id": "ok",
        "systeme_subdomain": "partner.example.test",
        "launch_date": "2026-09-01",
    }
    hub = {"partner_id": "ok", "offerPrice": "297 EUR"}
    funnel = {
        "partner_id": "ok",
        "domain": "partner.example.test",
        "legal_completed": True,
        "published": True,
        "funnel_url": "https://partner.example.test",
        "checkout_url": "https://checkout.example.test",
        "automation_active": True,
    }
    masterclass = {"partner_id": "ok", **_approved_video("https://youtu.be/mc")}
    videocorso = {
        "partner_id": "ok",
        "course_data": {"moduli": [{"lezioni": [{"id": "lesson-1"}]}]},
        "lessons": {"lesson-1": _approved_video("https://youtu.be/lesson-1")},
    }
    calendar_context = {
        "partner": partner,
        "steps": steps,
        "steps_by_id": {step["step_id"]: step for step in steps},
        "hub": hub,
        "masterclass": masterclass,
        "videocorso": videocorso,
        "brand_kit": {},
        "funnel": funnel,
        "launch_calendar": calendar,
        "launch_calendar_version": 1,
        "launch_calendar_checksum": checksum,
        "launch_calendar_approved_at": now,
    }
    binding = _workbook_binding(calendar_context, _workbook_payload(calendar_context))
    return FakeDB(
        partner_journey_steps=steps,
        partner_phase2_output_versions=outputs,
        partners=[partner],
        partner_hub=[hub],
        partner_funnel=[funnel],
        masterclass_factory=[masterclass],
        partner_videocorso=[videocorso],
        partner_launch_calendar_versions=[{
            "partner_id": "ok",
            "version": 1,
            "status": "approved",
            "calendar": calendar,
            "checksum": checksum,
            "approved_at": now,
            "admin_review": {
                "decision": "approve",
                "approved_checksum": checksum,
            },
        }],
        partner_lancio=[{
            "partner_id": "ok",
            "launched": True,
            "probe_verified": True,
            "launch_date": "2026-09-01",
        }],
        partner_document_versions=[
            {
                "partner_id": "ok",
                "kind": "certificate_valida",
                "version": 1,
                "checksum": "certificate-checksum",
            },
            {
                "partner_id": "ok",
                "kind": "workbook_final",
                "version": 1,
                "checksum": "workbook-checksum",
                "source_version": binding["source_version"],
                "provenance": binding["provenance"],
            },
        ],
    )


@pytest.mark.asyncio
async def test_already_conformant_partner_has_no_reopen_or_archive_actions(conformant_db):
    plan = await plan_phase2_migration(conformant_db, "ok", "admin-1")

    assert plan.reopen_step_ids == []
    assert plan.archive_actions == []
    assert {
        action["step_id"]
        for action in plan.actions
        if action["kind"] == "preserve_step"
    } == {
        definition["step_id"]
        for definition in JOURNEY_STEPS_DEFINITION
        if 8 <= definition["step_number"] <= 19
    }


@pytest.mark.asyncio
async def test_legacy_workbook_checksum_without_current_binding_reopens_f19(conformant_db):
    workbook = next(
        document
        for document in conformant_db.partner_document_versions.documents
        if document["kind"] == "workbook_final"
    )
    workbook["source_version"] = "legacy-unbound-workbook"
    workbook["provenance"] = {}

    evidence = await build_phase2_evidence(conformant_db, "ok")
    plan = await plan_phase2_migration(conformant_db, "ok", "admin-1")

    assert evidence["final_workbook_archived"] is False
    assert "19-workbook-finale" in plan.reopen_step_ids


@pytest.mark.asyncio
async def test_workbook_with_current_source_but_tampered_provenance_reopens_f19(conformant_db):
    workbook = next(
        document
        for document in conformant_db.partner_document_versions.documents
        if document["kind"] == "workbook_final"
    )
    original_source_version = workbook["source_version"]
    original_checksum = workbook["checksum"]
    workbook["provenance"]["calendar_checksum"] = "tampered-calendar-checksum"

    evidence = await build_phase2_evidence(conformant_db, "ok")
    plan = await plan_phase2_migration(conformant_db, "ok", "admin-1")

    assert workbook["source_version"] == original_source_version
    assert workbook["checksum"] == original_checksum
    assert evidence["final_workbook_archived"] is False
    assert "19-workbook-finale" in plan.reopen_step_ids


@pytest.mark.asyncio
async def test_dry_run_persists_immutable_review_report_without_material_content(daniele_db):
    daniele_db.masterclass_factory.documents[0]["private_binary"] = b"raw-video-bytes"

    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    assert report.status == "review_required"
    assert stored["status"] == "review_required"
    assert stored["source_checksum"] == report.source_checksum
    assert stored["actions"] == report.actions
    assert report.expected_steps == stored["expected_steps"]
    assert report.to_dict()["expected_steps"]["08-registra-masterclass"]["record_count"] == 1
    assert "raw-video-bytes" not in json.dumps(report.to_dict())

    report.actions[0]["reason"] = "mutated-by-caller"
    persisted_again = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    assert persisted_again["actions"][0]["reason"] != "mutated-by-caller"


@pytest.mark.asyncio
async def test_apply_rejects_report_when_source_changed(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    await daniele_db.partner_journey_steps.update_one(
        {"partner_id": "23", "step_id": "12-prezzo-webinar"},
        {"$set": {"updated_at": datetime(2026, 8, 15, 11, 0, tzinfo=timezone.utc)}},
    )

    with pytest.raises(MigrationConflict, match="stale"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    assert await daniele_db.partner_phase2_migration_snapshots.count_documents({}) == 0
    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "conflict"
    assert stored["conflict_reason"] == "stale_source_before_claim"
    assert audit["status"] == "conflict"
    assert audit["conflict_reason"] == "stale_source_before_claim"


@pytest.mark.asyncio
async def test_apply_retry_returns_same_snapshot_and_no_duplicate_effects(daniele_db):
    historical_completed_at = datetime(2026, 7, 30, 8, 0, tzinfo=timezone.utc)
    step = next(
        document
        for document in daniele_db.partner_journey_steps.documents
        if document["step_id"] == "05-script-masterclass"
    )
    step["completed_at"] = historical_completed_at
    transitioned = next(
        document
        for document in daniele_db.partner_journey_steps.documents
        if document["step_id"] == "09-registra-lezioni"
    )
    transitioned["completed_at"] = historical_completed_at
    daniele_db.partners.documents[0]["phase"] = "F2"
    daniele_db.masterclass_factory.documents[0]["private_binary"] = b"raw-video-bytes"
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")

    first = await apply_phase2_migration(daniele_db, report.report_id, "admin-1")
    retry = await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    assert retry.snapshot_id == first.snapshot_id
    assert retry.audit_id == first.audit_id
    assert await daniele_db.partner_phase2_migration_snapshots.count_documents(
        {"report_id": report.report_id}
    ) == 1
    assert await daniele_db.partner_phase2_migration_audit.count_documents(
        {"report_id": report.report_id}
    ) == 1
    legacy_outputs = [
        document
        for document in daniele_db.partner_phase2_output_versions.documents
        if (document.get("source_checksums") or {}).get("migration_report_id")
        == report.report_id
    ]
    archive_count = sum(
        action["kind"] == "archive_legacy"
        and action["after"].get("target") == "partner_phase2_output_versions"
        for action in report.actions
    )
    assert len(legacy_outputs) == archive_count
    assert all(document["status"] == "legacy" for document in legacy_outputs)
    assert all("partner_approved" not in document for document in legacy_outputs)

    snapshot = await daniele_db.partner_phase2_migration_snapshots.find_one(
        {"report_id": report.report_id}
    )
    original_step = next(
        document
        for document in snapshot["source"]["partner_journey_steps"]
        if document["step_id"] == "05-script-masterclass"
    )
    assert original_step["completed_at"] == historical_completed_at
    assert snapshot["source"]["masterclass_factory"][0]["private_binary"] == b"raw-video-bytes"

    applied_step = next(
        document
        for document in daniele_db.partner_journey_steps.documents
        if document["step_id"] == "05-script-masterclass"
    )
    later_step = next(
        document
        for document in daniele_db.partner_journey_steps.documents
        if document["step_id"] == "10-sistema-vendita"
    )
    assert applied_step["status"] == "in_progress"
    assert applied_step["completed_at"] is None
    assert later_step["status"] == "pending"
    assert later_step["blocked_reason_code"] == "upstream_output_not_current"
    assert transitioned["status"] == "pending"
    assert transitioned["completed_at"] is None
    assert daniele_db.partners.documents[0]["phase"] == "F3"
    assert any(
        document["step_id"] == "09-funnel-asset"
        for document in daniele_db.partner_journey_steps.documents
    )

    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert audit["status"] == "applied"
    assert audit["before_steps"]["05-script-masterclass"]["completed_at"] == (
        historical_completed_at
    )


@pytest.mark.asyncio
async def test_calendar_archive_creates_one_canonical_legacy_draft_never_approved(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    calendar_action = next(
        action
        for action in report.actions
        if action["kind"] == "archive_legacy"
        and action["after"].get("target") == "partner_launch_calendar_versions"
    )

    first = await apply_phase2_migration(daniele_db, report.report_id, "admin-1")
    retry = await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    assert retry.snapshot_id == first.snapshot_id
    drafts = [
        document
        for document in daniele_db.partner_launch_calendar_versions.documents
        if document.get("migration_report_id") == report.report_id
    ]
    assert len(drafts) == 1
    draft = drafts[0]
    assert draft["migration_action_id"] == calendar_action["action_id"]
    assert draft["status"] == "draft"
    assert draft["legacy_import"] is True
    assert draft["calendar"] == {"days": 30}
    assert draft["checksum"] == calendar_checksum(draft["calendar"])
    assert draft.get("approved_at") is None
    assert draft.get("admin_review") is None
    assert not any(
        document.get("step_id") == "11-calendario-30gg"
        and (document.get("source_checksums") or {}).get("migration_report_id")
        == report.report_id
        for document in daniele_db.partner_phase2_output_versions.documents
    )


@pytest.mark.asyncio
async def test_two_reports_reuse_one_calendar_draft_by_action_identity(daniele_db):
    first_report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    first_action = next(
        action
        for action in first_report.actions
        if action.get("after", {}).get("target") == "partner_launch_calendar_versions"
    )
    first = await apply_phase2_migration(
        daniele_db, first_report.report_id, "admin-1"
    )

    second_report = await create_phase2_dry_run(daniele_db, "23", "admin-2")
    second_action = next(
        action
        for action in second_report.actions
        if action.get("after", {}).get("target") == "partner_launch_calendar_versions"
    )
    second = await apply_phase2_migration(
        daniele_db, second_report.report_id, "admin-2"
    )
    first_retry = await apply_phase2_migration(
        daniele_db, first_report.report_id, "admin-retry"
    )
    second_retry = await apply_phase2_migration(
        daniele_db, second_report.report_id, "admin-retry"
    )

    assert first_action["action_id"] == second_action["action_id"]
    assert first_retry.snapshot_id == first.snapshot_id
    assert second_retry.snapshot_id == second.snapshot_id
    assert len(daniele_db.partner_launch_calendar_versions.documents) == 1
    draft = daniele_db.partner_launch_calendar_versions.documents[0]
    assert draft["migration_action_id"] == first_action["action_id"]
    assert draft["status"] == "draft"
    assert await daniele_db.partner_phase2_migration_audit.count_documents(
        {"status": "applied"}
    ) == 2


@pytest.mark.asyncio
async def test_apply_rejects_duplicate_canonical_step_even_when_plan_would_preserve_it(
    conformant_db,
):
    duplicate = deepcopy(
        next(
            document
            for document in conformant_db.partner_journey_steps.documents
            if document["step_id"] == "08-registra-masterclass"
        )
    )
    duplicate["_id"] = "duplicate-canonical-step"
    conformant_db.partner_journey_steps.documents.append(duplicate)
    report = await create_phase2_dry_run(conformant_db, "ok", "admin-1")

    assert report.expected_steps["08-registra-masterclass"]["record_count"] == 2
    with pytest.raises(MigrationConflict, match="exactly one journey record"):
        await apply_phase2_migration(conformant_db, report.report_id, "admin-1")

    assert await conformant_db.partner_phase2_migration_snapshots.count_documents({}) == 0
    stored = await conformant_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await conformant_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "conflict"
    assert audit["status"] == "conflict"


@pytest.mark.asyncio
async def test_source_checksum_reads_more_than_one_thousand_documents(daniele_db):
    daniele_db.partner_document_versions.documents = [
        {"_id": f"document-{index}", "partner_id": "23", "kind": "evidence", "seq": index}
        for index in range(1001)
    ]

    before = await plan_phase2_migration(daniele_db, "23", "admin-1")
    daniele_db.partner_document_versions.documents[1000]["marker"] = "changed"
    after = await plan_phase2_migration(daniele_db, "23", "admin-1")

    assert after.source_checksum != before.source_checksum


@pytest.mark.asyncio
async def test_byte_identical_reinsert_with_new_mongo_id_makes_report_stale(daniele_db):
    daniele_db.partner_hub.documents[0]["_id"] = "hub-old-id"
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    reinserted = deepcopy(daniele_db.partner_hub.documents[0])
    reinserted["_id"] = "hub-new-id"
    daniele_db.partner_hub.documents[:] = [reinserted]

    with pytest.raises(MigrationConflict, match="stale"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    assert await daniele_db.partner_phase2_migration_snapshots.count_documents({}) == 0
    assert await daniele_db.partner_phase2_migration_audit.count_documents(
        {"report_id": report.report_id, "status": "conflict"}
    ) == 1


class MutateIdAfterSanitizedReadCollection(FakeCollection):
    def __init__(self, documents):
        super().__init__(documents)
        self.injected = False

    def find(self, query, projection=None):
        cursor = super().find(query, projection)
        if not self.injected:
            self.injected = True
            self.documents[0]["_id"] = "hub-id-after-initial-read"
        return cursor


@pytest.mark.asyncio
async def test_apply_rechecks_exact_checksum_after_full_snapshot_before_source_writes(daniele_db):
    daniele_db.partner_hub.documents[0]["_id"] = "hub-id-in-report"
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_hub = MutateIdAfterSanitizedReadCollection(
        daniele_db.partner_hub.documents
    )

    with pytest.raises(MigrationConflict, match="after claim"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    assert await daniele_db.partner_phase2_migration_snapshots.count_documents({}) == 0
    assert await daniele_db.partner_phase2_migration_audit.count_documents(
        {"report_id": report.report_id, "status": "conflict"}
    ) == 1
    assert not daniele_db.partner_phase2_output_versions.documents


@pytest.mark.asyncio
async def test_retry_repairs_missing_audit_for_terminal_pre_snapshot_conflict(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_hub.documents[0]["offerPrice"] = "external stale value"
    with pytest.raises(MigrationConflict, match="stale"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")
    daniele_db.partner_phase2_migration_audit.documents.clear()

    with pytest.raises(MigrationConflict, match="conflict"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-2")
    with pytest.raises(MigrationConflict, match="conflict"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-3")

    audits = daniele_db.partner_phase2_migration_audit.documents
    assert len(audits) == 1
    assert audits[0]["status"] == "conflict"
    assert audits[0]["conflict_reason"] == "stale_source_before_claim"


class DocumentTooLargeSnapshotCollection(FakeCollection):
    def __init__(self):
        super().__init__()
        self.attempts = 0

    async def find_one_and_update(
        self, query, update, upsert=False, return_document=None
    ):
        self.attempts += 1
        raise DocumentTooLarge("raw-private-payload-must-not-be-persisted")


@pytest.mark.asyncio
async def test_snapshot_document_too_large_is_terminal_sanitized_and_retryable(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    failing_snapshots = DocumentTooLargeSnapshotCollection()
    daniele_db.partner_phase2_migration_snapshots = failing_snapshots

    with pytest.raises(MigrationConflict, match="snapshot"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "conflict"
    assert stored["error_code"] == "snapshot_document_too_large"
    assert stored["conflict_reason"] == "snapshot_persist_failed"
    assert "lease_id" not in stored
    assert "lease_expires_at" not in stored
    assert audit["status"] == "conflict"
    assert audit["error_code"] == "snapshot_document_too_large"
    assert "raw-private-payload" not in json.dumps(
        {"report": stored, "audit": audit},
        default=str,
    )
    assert not daniele_db.partner_phase2_output_versions.documents
    assert not daniele_db.partner_launch_calendar_versions.documents
    assert not any(
        document.get("phase2_migration_report_id") == report.report_id
        for document in daniele_db.partner_journey_steps.documents
    )

    with pytest.raises(MigrationConflict, match="conflict"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-2")
    assert failing_snapshots.attempts == 1
    assert await daniele_db.partner_phase2_migration_audit.count_documents(
        {"report_id": report.report_id}
    ) == 1


class AlwaysFailSnapshotCollection:
    def __init__(self, error):
        self.error = error
        self.write_attempts = 0
        self.read_attempts = 0

    async def find_one_and_update(
        self, query, update, upsert=False, return_document=None
    ):
        self.write_attempts += 1
        raise self.error

    async def find_one(self, query, projection=None, sort=None):
        self.read_attempts += 1
        raise self.error


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("snapshot_error", "error_code", "raw_marker"),
    [
        (
            AutoReconnect("connection lost to raw-host.invalid:27017"),
            "snapshot_store_unavailable",
            "raw-host.invalid",
        ),
        (
            OperationFailure(
                "authentication failed for private-user at auth-host.invalid",
                code=18,
            ),
            "snapshot_store_unauthorized",
            "auth-host.invalid",
        ),
        (
            RuntimeError("raw-snapshot-private-content"),
            "snapshot_persist_error",
            "raw-snapshot-private-content",
        ),
    ],
)
async def test_snapshot_failure_is_sanitized_and_audit_repairs_without_snapshot_read(
    daniele_db,
    snapshot_error,
    error_code,
    raw_marker,
):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    failing_snapshots = AlwaysFailSnapshotCollection(snapshot_error)
    daniele_db.partner_phase2_migration_snapshots = failing_snapshots

    with pytest.raises(
        MigrationConflict,
        match="migration snapshot could not be persisted",
    ) as caught:
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "conflict"
    assert stored["error_code"] == error_code
    assert audit["status"] == "conflict"
    assert audit["error_code"] == error_code
    assert failing_snapshots.write_attempts == 1
    assert failing_snapshots.read_attempts == 0
    serialized = json.dumps(
        {"report": stored, "audit": audit, "public_error": str(caught.value)},
        default=str,
    )
    assert raw_marker not in serialized

    daniele_db.partner_phase2_migration_audit.documents.clear()
    with pytest.raises(MigrationConflict, match="conflict"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    repaired = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert repaired["status"] == "conflict"
    assert repaired["error_code"] == error_code
    assert failing_snapshots.write_attempts == 1
    assert failing_snapshots.read_attempts == 0


@pytest.mark.asyncio
async def test_reclaim_snapshot_outage_transfers_expired_applying_audit_to_conflict_fence(
    daniele_db,
):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    expired_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    old_lease_id = "expired-report-and-audit-owner"
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "status": "applying",
                "lease_id": old_lease_id,
                "lease_expires_at": expired_at,
                "apply_actor_id": "admin-1",
            }
        },
    )
    await daniele_db.partner_phase2_migration_audit.insert_one({
        "audit_id": f"phase2-audit-{report.report_id}",
        "report_id": report.report_id,
        "partner_id": "23",
        "snapshot_id": f"phase2-snapshot-{report.report_id}",
        "source_checksum": report.source_checksum,
        "planned_actions": deepcopy(report.actions),
        "before_steps": {},
        "effects": {},
        "created_at": expired_at,
        "status": "applying",
        "lease_id": old_lease_id,
    })
    unavailable_snapshots = AlwaysFailSnapshotCollection(
        AutoReconnect("persistent snapshot outage at private-host.invalid:27017")
    )
    daniele_db.partner_phase2_migration_snapshots = unavailable_snapshots

    with pytest.raises(
        MigrationConflict,
        match="migration snapshot could not be persisted",
    ):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "conflict"
    assert stored["error_code"] == "snapshot_store_unavailable"
    assert audit["status"] == "conflict"
    assert audit["lease_id"] == stored["conflict_lease_id"]
    assert audit["error_code"] == "snapshot_store_unavailable"
    assert audit["conflict_reason"] == "snapshot_persist_failed"
    assert unavailable_snapshots.read_attempts == 1
    assert unavailable_snapshots.write_attempts == 0

    with pytest.raises(MigrationConflict, match="conflict"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-3")

    repeated_audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert repeated_audit == audit
    assert unavailable_snapshots.read_attempts == 1
    assert unavailable_snapshots.write_attempts == 0
    serialized = json.dumps({"report": stored, "audit": audit}, default=str)
    assert "private-host.invalid" not in serialized


class RaceAuditToAppliedOnConflictTransferCollection(FakeCollection):
    def __init__(self, applying_document, applied_document):
        super().__init__([applying_document])
        self.applied_document = deepcopy(applied_document)
        self.raced = False

    async def find_one_and_update(
        self, query, update, upsert=False, return_document=None
    ):
        if (
            not self.raced
            and query.get("status") == "applying"
            and update.get("$set", {}).get("status") == "conflict"
        ):
            self.raced = True
            self.documents[0] = deepcopy(self.applied_document)
            await asyncio.sleep(0)
            return None
        return await super().find_one_and_update(
            query,
            update,
            upsert=upsert,
            return_document=return_document,
        )


@pytest.mark.asyncio
async def test_conflict_audit_transfer_never_overwrites_racing_applied_audit(
    daniele_db,
):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_phase2_migration_reports = CrashBeforeReportAppliedCollection(
        daniele_db.partner_phase2_migration_reports.documents
    )
    with pytest.raises(RuntimeError, match="before report applied CAS"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    crashed_report = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    applied_audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    old_audit_lease_id = applied_audit["lease_id"]
    applying_audit = deepcopy(applied_audit)
    applying_audit["status"] = "applying"
    applying_audit.pop("applied_at", None)
    applying_audit.pop("applied_by", None)
    racing_audits = RaceAuditToAppliedOnConflictTransferCollection(
        applying_audit,
        applied_audit,
    )
    daniele_db.partner_phase2_migration_audit = racing_audits
    unavailable_snapshots = AlwaysFailSnapshotCollection(
        AutoReconnect("snapshot must remain unavailable during applied race")
    )
    daniele_db.partner_phase2_migration_snapshots = unavailable_snapshots
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "lease_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)
            }
        },
    )

    recovered = await apply_phase2_migration(daniele_db, report.report_id, "admin-2")
    repeated = await apply_phase2_migration(daniele_db, report.report_id, "admin-3")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    final_audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert crashed_report["expected_terminal_audit_lease_id"] == old_audit_lease_id
    assert racing_audits.raced is True
    assert recovered == repeated
    assert stored["status"] == "applied"
    assert final_audit == applied_audit
    assert final_audit["status"] == "applied"
    assert final_audit["lease_id"] == old_audit_lease_id
    assert "conflict_lease_id" not in stored
    assert "conflict_reason" not in stored
    assert "error_code" not in stored
    assert unavailable_snapshots.read_attempts == 1
    assert unavailable_snapshots.write_attempts == 0


@pytest.mark.asyncio
async def test_expired_naive_bson_lease_is_reclaimed(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "status": "applying",
                "lease_id": "expired-owner",
                "lease_expires_at": datetime.now(timezone.utc).replace(tzinfo=None)
                - timedelta(seconds=1),
            }
        },
    )

    applied = await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    assert applied.report_id == report.report_id


@pytest.mark.asyncio
async def test_two_simultaneous_apply_attempts_converge_on_completed_result(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")

    first, second = await asyncio.gather(
        apply_phase2_migration(daniele_db, report.report_id, "admin-a"),
        apply_phase2_migration(daniele_db, report.report_id, "admin-b"),
    )

    assert first.snapshot_id == second.snapshot_id
    assert first.audit_id == second.audit_id
    assert await daniele_db.partner_phase2_migration_snapshots.count_documents(
        {"report_id": report.report_id}
    ) == 1
    assert await daniele_db.partner_phase2_migration_audit.count_documents(
        {"report_id": report.report_id}
    ) == 1


class ConcurrentJourneyChangeCollection(FakeCollection):
    def __init__(self, documents):
        super().__init__(documents)
        self.injected = False

    async def update_one(self, query, update, upsert=False):
        if (
            not self.injected
            and "updated_at" in query
            and "phase2_migration_report_id" in update.get("$set", {})
        ):
            self.injected = True
            target = next(
                document
                for document in self.documents
                if document.get("partner_id") == query.get("partner_id")
                and document.get("step_id") == query.get("step_id")
            )
            target["updated_at"] = datetime(2026, 8, 15, 12, 0, tzinfo=timezone.utc)
        return await super().update_one(query, update, upsert=upsert)


@pytest.mark.asyncio
async def test_each_journey_write_uses_compare_and_set_from_report(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_journey_steps = ConcurrentJourneyChangeCollection(
        daniele_db.partner_journey_steps.documents
    )

    with pytest.raises(MigrationConflict, match="compare-and-set"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    conflicted = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    assert conflicted["status"] == "conflict"
    assert await daniele_db.partner_phase2_migration_snapshots.count_documents(
        {"report_id": report.report_id}
    ) == 1
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert audit["status"] == "conflict"


class CrashAfterJourneyWriteCollection(FakeCollection):
    def __init__(self, documents):
        super().__init__(documents)
        self.crashed = False

    async def update_one(self, query, update, upsert=False):
        result = await super().update_one(query, update, upsert=upsert)
        if (
            not self.crashed
            and "updated_at" in query
            and "phase2_migration_report_id" in update.get("$set", {})
        ):
            self.crashed = True
            raise RuntimeError("simulated worker crash after durable CAS")
        return result


@pytest.mark.asyncio
async def test_expired_lease_recovers_partial_apply_without_duplicates(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_journey_steps = CrashAfterJourneyWriteCollection(
        daniele_db.partner_journey_steps.documents
    )

    with pytest.raises(RuntimeError, match="simulated worker crash"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {"$set": {"lease_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}},
    )
    recovered = await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    assert recovered.snapshot_id
    assert await daniele_db.partner_phase2_migration_snapshots.count_documents(
        {"report_id": report.report_id}
    ) == 1
    assert await daniele_db.partner_phase2_migration_audit.count_documents(
        {"report_id": report.report_id}
    ) == 1
    legacy_outputs = [
        document
        for document in daniele_db.partner_phase2_output_versions.documents
        if (document.get("source_checksums") or {}).get("migration_report_id")
        == report.report_id
    ]
    archive_count = sum(
        action["kind"] == "archive_legacy"
        and action["after"].get("target") == "partner_phase2_output_versions"
        for action in report.actions
    )
    assert len(legacy_outputs) == archive_count


class CrashBeforeReportAppliedCollection(FakeCollection):
    def __init__(self, documents, remaining_crashes=1):
        super().__init__(documents)
        self.remaining_crashes = remaining_crashes

    async def find_one_and_update(
        self, query, update, upsert=False, return_document=None
    ):
        if (
            self.remaining_crashes
            and update.get("$set", {}).get("status") == "applied"
        ):
            self.remaining_crashes -= 1
            raise RuntimeError("simulated crash before report applied CAS")
        return await super().find_one_and_update(
            query,
            update,
            upsert=upsert,
            return_document=return_document,
        )


@pytest.mark.asyncio
async def test_recovery_finalizes_compatible_applied_audit_before_stale_check(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_phase2_migration_reports = CrashBeforeReportAppliedCollection(
        daniele_db.partner_phase2_migration_reports.documents,
        remaining_crashes=2,
    )

    with pytest.raises(RuntimeError, match="before report applied CAS"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    crashed_report = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    completed_audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    terminal_audit_lease = completed_audit["lease_id"]
    assert crashed_report["status"] == "applying"
    assert completed_audit["status"] == "applied"

    unavailable_snapshots = AlwaysFailSnapshotCollection(
        RuntimeError("snapshot-must-not-be-read-after-audit-applied")
    )
    daniele_db.partner_phase2_migration_snapshots = unavailable_snapshots
    daniele_db.partner_hub.documents[0]["offerPrice"] = "external-after-success"
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "lease_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)
            }
        },
    )

    with pytest.raises(RuntimeError, match="before report applied CAS"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-2")
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "lease_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)
            }
        },
    )

    recovered = await apply_phase2_migration(daniele_db, report.report_id, "admin-3")
    repeated = await apply_phase2_migration(daniele_db, report.report_id, "admin-4")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    final_audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "applied"
    assert final_audit["status"] == "applied"
    assert final_audit["lease_id"] == terminal_audit_lease
    assert stored["applied_at"] == final_audit["applied_at"]
    assert recovered == repeated
    assert recovered.snapshot_id == final_audit["snapshot_id"]
    assert recovered.audit_id == final_audit["audit_id"]
    assert "conflict_reason" not in stored
    assert unavailable_snapshots.read_attempts == 0
    assert unavailable_snapshots.write_attempts == 0


@pytest.mark.asyncio
async def test_recovery_refuses_applied_audit_with_incomplete_effects(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_phase2_migration_reports = CrashBeforeReportAppliedCollection(
        daniele_db.partner_phase2_migration_reports.documents
    )
    with pytest.raises(RuntimeError, match="before report applied CAS"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    audit = daniele_db.partner_phase2_migration_audit.documents[0]
    missing_action_id = report.actions[0]["action_id"]
    audit["effects"].pop(missing_action_id)
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "lease_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)
            }
        },
    )

    with pytest.raises(MigrationConflict, match="audit is incompatible"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "applying"
    assert audit["status"] == "applied"
    assert "applied_at" not in stored


class CrashAfterOutputReservationCollection(FakeCollection):
    def __init__(self, documents):
        super().__init__(documents)
        self.crashed = False

    async def find_one_and_update(
        self, query, update, upsert=False, return_document=None
    ):
        result = await super().find_one_and_update(
            query, update, upsert=upsert, return_document=return_document
        )
        if (
            not self.crashed
            and upsert
            and "template_id" in query
            and "reservation_token" in update.get("$setOnInsert", {})
        ):
            self.crashed = True
            raise RuntimeError("simulated crash after output reservation")
        return result


@pytest.mark.asyncio
async def test_expired_lease_recovers_partial_output_reservation(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_phase2_output_versions = CrashAfterOutputReservationCollection(
        daniele_db.partner_phase2_output_versions.documents
    )

    with pytest.raises(RuntimeError, match="output reservation"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    expired_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {"$set": {"lease_expires_at": expired_at}},
    )
    await daniele_db.partner_phase2_output_versions.update_one(
        {"reservation_state": "allocating"},
        {"$set": {"reservation_expires_at": expired_at}},
    )

    recovered = await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    assert recovered.snapshot_id
    assert await daniele_db.partner_phase2_migration_audit.count_documents(
        {"report_id": report.report_id}
    ) == 1
    archive_count = sum(
        action["kind"] == "archive_legacy"
        and action["after"].get("target") == "partner_phase2_output_versions"
        for action in report.actions
    )
    legacy_outputs = [
        document
        for document in daniele_db.partner_phase2_output_versions.documents
        if (document.get("source_checksums") or {}).get("migration_report_id")
        == report.report_id
    ]
    assert len(legacy_outputs) == archive_count


@pytest.mark.asyncio
async def test_expired_partial_apply_with_external_change_becomes_conflict(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_journey_steps = CrashAfterJourneyWriteCollection(
        daniele_db.partner_journey_steps.documents
    )
    with pytest.raises(RuntimeError, match="simulated worker crash"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    daniele_db.partner_hub.documents[0]["offerPrice"] = "497 EUR external change"
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "lease_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)
            }
        },
    )

    with pytest.raises(MigrationConflict, match="stale"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "conflict"
    assert audit["status"] == "conflict"


@pytest.mark.asyncio
async def test_recovery_rejects_tampered_migration_tagged_output(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partner_phase2_output_versions = CrashAfterOutputReservationCollection(
        daniele_db.partner_phase2_output_versions.documents
    )
    with pytest.raises(RuntimeError, match="output reservation"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    forged = daniele_db.partner_phase2_output_versions.documents[0]
    forged.update({
        "output_id": "forged-output",
        "version": 99,
        "status": "approved",
        "content": {"forged": True},
        "source_checksums": {"migration_report_id": report.report_id},
    })
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "lease_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)
            }
        },
    )

    with pytest.raises(MigrationConflict, match="stale"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-2")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "conflict"


class ConcurrentChangeDuringProjectionCollection(FakeCollection):
    def __init__(self, documents, source_collection):
        super().__init__(documents)
        self.source_collection = source_collection
        self.injected = False

    async def update_one(self, query, update, upsert=False):
        result = await super().update_one(query, update, upsert=upsert)
        if not self.injected and "phase" in update.get("$set", {}):
            self.injected = True
            self.source_collection.documents[0]["offerPrice"] = "external projection race"
        return result


@pytest.mark.asyncio
async def test_concurrent_change_during_projection_is_audited_as_conflict(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partners = ConcurrentChangeDuringProjectionCollection(
        daniele_db.partners.documents,
        daniele_db.partner_hub,
    )

    with pytest.raises(MigrationConflict, match="stale"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert stored["status"] == "conflict"
    assert audit["status"] == "conflict"
    assert audit.get("projection_status") != "applied"


class PromoteOldOutputDuringProjectionCollection(FakeCollection):
    def __init__(self, documents, output_collection):
        super().__init__(documents)
        self.output_collection = output_collection
        self.injected = False

    async def update_one(self, query, update, upsert=False):
        result = await super().update_one(query, update, upsert=upsert)
        if not self.injected and "phase" in update.get("$set", {}):
            self.injected = True
            old = next(
                document
                for document in self.output_collection.documents
                if document.get("output_id") == "old-manual-output"
            )
            old["status"] = "approved"
            old["is_current"] = True
        return result


@pytest.mark.asyncio
async def test_post_projection_rejects_external_approved_current_and_two_currents(
    daniele_db,
):
    daniele_db.partner_phase2_output_versions.documents.append({
        "_id": "old-output-id",
        "partner_id": "23",
        "step_id": "05-script-masterclass",
        "template_id": "manual-template",
        "template_version": "1",
        "checksum": "old-checksum",
        "source_checksum": "old-source-checksum",
        "output_id": "old-manual-output",
        "version": 1,
        "category": "script_masterclass",
        "status": "draft",
        "is_current": True,
        "content": {"legacy": "manual"},
        "source_checksums": {"manual": "source"},
    })
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    daniele_db.partners = PromoteOldOutputDuringProjectionCollection(
        daniele_db.partners.documents,
        daniele_db.partner_phase2_output_versions,
    )

    with pytest.raises(MigrationConflict, match="stale"):
        await apply_phase2_migration(daniele_db, report.report_id, "admin-1")

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    step_outputs = [
        document
        for document in daniele_db.partner_phase2_output_versions.documents
        if document.get("step_id") == "05-script-masterclass"
    ]
    assert stored["status"] == "conflict"
    assert audit["status"] == "conflict"
    assert sum(document.get("is_current") is True for document in step_outputs) == 2
    assert not any(document.get("status") == "applied" for document in [stored, audit])


class PauseFirstAuditOwnerCollection(FakeCollection):
    def __init__(self, documents=None):
        super().__init__(documents)
        self.first_owner_paused = asyncio.Event()
        self.release_first_owner = asyncio.Event()
        self.did_pause = False

    async def find_one_and_update(
        self, query, update, upsert=False, return_document=None
    ):
        result = await super().find_one_and_update(
            query, update, upsert=upsert, return_document=return_document
        )
        if (
            not self.did_pause
            and update.get("$set", {}).get("status") == "applying"
        ):
            self.did_pause = True
            self.first_owner_paused.set()
            await self.release_first_owner.wait()
        return result


@pytest.mark.asyncio
async def test_expired_owner_cannot_regress_winner_audit_after_lease_reclaim(daniele_db):
    report = await create_phase2_dry_run(daniele_db, "23", "admin-1")
    audit_collection = PauseFirstAuditOwnerCollection()
    daniele_db.partner_phase2_migration_audit = audit_collection

    expired_owner = asyncio.create_task(
        apply_phase2_migration(daniele_db, report.report_id, "admin-old")
    )
    await audit_collection.first_owner_paused.wait()
    await daniele_db.partner_phase2_migration_reports.update_one(
        {"report_id": report.report_id},
        {
            "$set": {
                "lease_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)
            }
        },
    )

    winner = await apply_phase2_migration(daniele_db, report.report_id, "admin-winner")
    audit_collection.release_first_owner.set()
    with pytest.raises(MigrationConflict, match="lease lost"):
        await expired_owner

    stored = await daniele_db.partner_phase2_migration_reports.find_one(
        {"report_id": report.report_id}
    )
    audit = await daniele_db.partner_phase2_migration_audit.find_one(
        {"report_id": report.report_id}
    )
    assert winner.report_id == report.report_id
    assert stored["status"] == "applied"
    assert audit["status"] == "applied"
    assert audit["lease_id"] != "expired-owner"


class RecordingIndexCollection:
    def __init__(self, collection_name, calls):
        self.collection_name = collection_name
        self.calls = calls

    async def create_index(self, fields, **options):
        self.calls.append((self.collection_name, fields, options))
        return options.get("name", str(fields))

    async def index_information(self):
        return {}


class RecordingIndexDb:
    def __init__(self):
        self.calls = []
        self.collections = {}

    def __getitem__(self, collection_name):
        return self.collections.setdefault(
            collection_name,
            RecordingIndexCollection(collection_name, self.calls),
        )


@pytest.mark.asyncio
async def test_migration_collections_receive_unique_report_indexes():
    db = RecordingIndexDb()

    await ensure_indexes(db)

    expected = {
        (
            "partner_phase2_migration_reports",
            (("report_id", 1),),
            "phase2_migration_report_id_unique",
        ),
        (
            "partner_phase2_migration_snapshots",
            (("report_id", 1),),
            "phase2_migration_snapshot_report_unique",
        ),
        (
            "partner_phase2_migration_audit",
            (("report_id", 1),),
            "phase2_migration_audit_report_unique",
        ),
    }
    actual = {
        (collection, tuple(fields), options.get("name"))
        for collection, fields, options in db.calls
        if collection.startswith("partner_phase2_migration_")
        and options.get("unique") is True
    }
    assert actual == expected
    assert (
        "partner_launch_calendar_versions",
        [("partner_id", 1), ("migration_action_id", 1)],
        {
            "unique": True,
            "name": "partner_launch_calendar_migration_action_unique",
            "partialFilterExpression": {"migration_action_id": {"$exists": True}},
        },
    ) in db.calls
