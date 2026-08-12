from copy import deepcopy

import pytest

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from services.journey_f20_migration import migrate_partner_to_f20


pytestmark = pytest.mark.unit


class Result:
    def __init__(self, upserted_id=None):
        self.upserted_id = upserted_id


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length):
        return deepcopy(self.docs[:length])


class StepsCollection:
    def __init__(self, docs):
        self.docs = docs
        self.write_count = 0

    def find(self, query, projection=None):
        return Cursor([doc for doc in self.docs if doc["partner_id"] == query["partner_id"]])

    async def update_one(self, query, update, upsert=False):
        existing = next((doc for doc in self.docs if doc["partner_id"] == query["partner_id"] and doc["step_id"] == query["step_id"]), None)
        if existing:
            return Result()
        self.write_count += 1
        inserted = deepcopy(update["$setOnInsert"])
        self.docs.append(inserted)
        return Result(f"insert-{self.write_count}")


class PartnersCollection:
    def __init__(self, phase="F3"):
        self.phase = phase

    async def find_one(self, query, projection=None):
        return {"id": query["id"], "phase": self.phase}


class FakeDb:
    def __init__(self, docs, phase="F3"):
        self.partner_journey_steps = StepsCollection(docs)
        self.partners = PartnersCollection(phase)


def legacy_docs(partner_id="p1"):
    return [
        {
            "partner_id": partner_id,
            "step_id": definition["step_id"],
            "step_number": definition["step_number"],
            "status": "done" if definition["step_number"] < 8 else "pending",
            "data": {"historical": definition["step_id"]},
        }
        for definition in JOURNEY_STEPS_DEFINITION
        if definition["step_id"] not in {
            "16-readiness-lancio", "18-certificato-valida", "19-workbook-finale", "20-ottimizzazione"
        }
    ]


@pytest.mark.asyncio
async def test_dry_run_reports_four_missing_steps_without_writes():
    db = FakeDb(legacy_docs())
    report = await migrate_partner_to_f20(db, "p1", dry_run=True)
    assert report.created == 0
    assert report.would_create == 4
    assert db.partner_journey_steps.write_count == 0


@pytest.mark.asyncio
async def test_apply_preserves_history_and_is_idempotent():
    docs = legacy_docs()
    original = deepcopy(docs[0])
    db = FakeDb(docs)

    first = await migrate_partner_to_f20(db, "p1", dry_run=False)
    second = await migrate_partner_to_f20(db, "p1", dry_run=False)

    assert first.created == 4
    assert second.created == 0
    assert db.partner_journey_steps.docs[0] == original
    assert len(db.partner_journey_steps.docs) == 20


@pytest.mark.asyncio
async def test_live_partner_is_not_falsely_promoted_to_f20_done():
    db = FakeDb(legacy_docs(), phase="LIVE")
    await migrate_partner_to_f20(db, "p1", dry_run=False)
    f20 = next(doc for doc in db.partner_journey_steps.docs if doc["step_id"] == "20-ottimizzazione")
    assert f20["status"] == "pending"
    assert f20["completed_at"] is None
