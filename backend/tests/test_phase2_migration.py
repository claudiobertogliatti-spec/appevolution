from copy import deepcopy
from datetime import datetime, timezone
import json

import pytest

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from services.launch_calendar import calendar_checksum
from services.phase2_migration import build_phase2_evidence, plan_phase2_migration


pytestmark = pytest.mark.unit


class FakeCursor:
    def __init__(self, documents):
        self.documents = deepcopy(list(documents))

    def sort(self, key, direction):
        self.documents.sort(key=lambda item: item.get(key, 0), reverse=direction < 0)
        return self

    async def to_list(self, length):
        return deepcopy(self.documents[:length])


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = deepcopy(documents or [])

    async def find_one(self, query, projection=None, sort=None):
        matches = [document for document in self.documents if _matches(document, query)]
        for key, direction in reversed(sort or []):
            matches.sort(key=lambda item: item.get(key, 0), reverse=direction < 0)
        return deepcopy(matches[0]) if matches else None

    def find(self, query, projection=None):
        return FakeCursor(document for document in self.documents if _matches(document, query))


def _matches(document, query):
    return all(document.get(key) == value for key, value in query.items())


class FakeDB:
    COLLECTIONS = (
        "partner_journey_steps",
        "partner_phase2_output_versions",
        "partners",
        "partner_hub",
        "partner_funnel",
        "masterclass_factory",
        "partner_videocorso",
        "partner_launch_calendar_versions",
        "partner_lancio",
        "partner_document_versions",
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
    return FakeDB(
        partner_journey_steps=steps,
        partner_phase2_output_versions=outputs,
        partners=[{
            "id": "ok",
            "systeme_subdomain": "partner.example.test",
            "launch_date": "2026-09-01",
        }],
        partner_hub=[{"partner_id": "ok", "offerPrice": "297 EUR"}],
        partner_funnel=[{
            "partner_id": "ok",
            "domain": "partner.example.test",
            "legal_completed": True,
            "published": True,
            "funnel_url": "https://partner.example.test",
            "checkout_url": "https://checkout.example.test",
            "automation_active": True,
        }],
        masterclass_factory=[{"partner_id": "ok", **_approved_video("https://youtu.be/mc")}],
        partner_videocorso=[{
            "partner_id": "ok",
            "course_data": {"moduli": [{"lezioni": [{"id": "lesson-1"}]}]},
            "lessons": {"lesson-1": _approved_video("https://youtu.be/lesson-1")},
        }],
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
