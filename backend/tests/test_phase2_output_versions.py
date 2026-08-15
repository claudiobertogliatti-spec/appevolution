import asyncio
import hashlib
import json
from datetime import datetime, timedelta, timezone

import pytest
from pymongo.errors import DuplicateKeyError

from services.phase2_output_versions import (
    OutputVersionRequest,
    archive_phase2_output,
    current_approved_output,
)


pytestmark = pytest.mark.unit


def _matches(document, query):
    for key, expected in query.items():
        actual = document.get(key)
        if isinstance(expected, dict):
            if "$exists" in expected and ((key in document) != expected["$exists"]):
                return False
            if "$lt" in expected and (actual is None or not actual < expected["$lt"]):
                return False
            if "$gt" in expected and (actual is None or not actual > expected["$gt"]):
                return False
            if "$lte" in expected and (actual is None or not actual <= expected["$lte"]):
                return False
            if "$ne" in expected and actual == expected["$ne"]:
                return False
        elif actual != expected:
            return False
    return True


class Collection:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    async def find_one(self, query, projection=None, sort=None):
        matches = [doc for doc in self.docs if _matches(doc, query)]
        if sort:
            field, direction = sort[0]
            matches.sort(key=lambda doc: doc.get(field, 0), reverse=direction < 0)
        return matches[0].copy() if matches else None

    async def insert_one(self, doc):
        self.docs.append(doc.copy())

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if _matches(doc, query):
                for key, value in update.get("$max", {}).items():
                    doc[key] = max(doc.get(key, value), value)
                doc.update(update.get("$set", {}))
                for key in update.get("$unset", {}):
                    doc.pop(key, None)
                return
        if upsert:
            document = dict(query)
            document.update(update.get("$max", {}))
            document.update(update.get("$set", {}))
            self.docs.append(document)

    async def find_one_and_update(self, query, update, upsert=False, return_document=None):
        for doc in self.docs:
            if _matches(doc, query):
                for key, value in update.get("$inc", {}).items():
                    doc[key] = doc.get(key, 0) + value
                doc.update(update.get("$set", {}))
                for key in update.get("$unset", {}):
                    doc.pop(key, None)
                return doc.copy()
        if upsert:
            document = dict(query)
            document.update(update.get("$inc", {}))
            document.update(update.get("$setOnInsert", {}))
            document.update(update.get("$set", {}))
            self.docs.append(document)
            return document.copy()
        return None

    async def update_many(self, query, update):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))


class FakeDb:
    def __init__(self):
        self.partner_phase2_output_versions = Collection()
        self.partner_phase2_output_counters = Collection()


@pytest.fixture
def fake_db():
    return FakeDb()


def make_request(**overrides):
    values = {
        "partner_id": "23",
        "step_id": "05-script-masterclass",
        "category": "script_masterclass",
        "template_id": "masterclass-v3",
        "template_version": "3",
        "content": {"title": "Nuovo script"},
        "source_checksums": {"positioning": "abc"},
        "actor_id": "admin-1",
    }
    values.update(overrides)
    return OutputVersionRequest(**values)


@pytest.mark.asyncio
async def test_same_identity_is_idempotent(fake_db):
    request = make_request()

    first = await archive_phase2_output(fake_db, request)
    retry = await archive_phase2_output(fake_db, request)

    assert first.version == retry.version == 1
    assert first.checksum == retry.checksum
    assert retry.created is False
    assert len(fake_db.partner_phase2_output_versions.docs) == 1


@pytest.mark.asyncio
async def test_new_content_supersedes_without_mutating_old_version(fake_db):
    first = await archive_phase2_output(fake_db, make_request(content={"v": 1}))
    second = await archive_phase2_output(fake_db, make_request(content={"v": 2}))

    assert (first.version, second.version) == (1, 2)
    assert fake_db.partner_phase2_output_versions.docs[0]["status"] == "superseded"
    assert fake_db.partner_phase2_output_versions.docs[0]["content"] == {"v": 1}


@pytest.mark.asyncio
async def test_archive_accepts_only_draft_or_legacy_initial_status(fake_db):
    legacy = await archive_phase2_output(fake_db, make_request(initial_status="legacy"))

    assert legacy.created is True
    assert fake_db.partner_phase2_output_versions.docs[0]["status"] == "legacy"
    with pytest.raises(ValueError, match="initial_status"):
        await archive_phase2_output(fake_db, make_request(initial_status="approved"))


@pytest.mark.asyncio
async def test_current_approved_output_uses_only_exact_current_approved_filter(fake_db):
    fake_db.partner_phase2_output_versions.docs.extend([
        {"partner_id": "23", "step_id": "05-script-masterclass", "status": "draft", "is_current": True},
        {"partner_id": "23", "step_id": "05-script-masterclass", "status": "approved", "is_current": False},
        {"partner_id": "23", "step_id": "other", "status": "approved", "is_current": True},
        {"partner_id": "23", "step_id": "05-script-masterclass", "status": "approved", "is_current": True, "version": 2},
    ])

    result = await current_approved_output(fake_db, "23", "05-script-masterclass")

    assert result == {"partner_id": "23", "step_id": "05-script-masterclass", "status": "approved", "is_current": True, "version": 2}


@pytest.mark.asyncio
async def test_concurrent_different_content_allocates_distinct_sequential_versions():
    class LockedCounterCollection(Collection):
        def __init__(self):
            super().__init__()
            self.lock = asyncio.Lock()

        async def find_one_and_update(self, query, update, upsert=False, return_document=None):
            async with self.lock:
                await asyncio.sleep(0)
                return await super().find_one_and_update(query, update, upsert, return_document)

    db = FakeDb()
    db.partner_phase2_output_counters = LockedCounterCollection()

    first, second = await asyncio.gather(
        archive_phase2_output(db, make_request(content={"v": 1})),
        archive_phase2_output(db, make_request(content={"v": 2})),
    )

    assert {first.version, second.version} == {1, 2}
    assert len(db.partner_phase2_output_versions.docs) == 2


@pytest.mark.asyncio
async def test_concurrent_same_identity_returns_winning_version_once():
    class UniqueBarrierCollection(Collection):
        def __init__(self):
            super().__init__()
            self.identity_reads = 0
            self.two_readers = asyncio.Event()

        async def find_one(self, query, projection=None, sort=None):
            result = await super().find_one(query, projection, sort)
            if "checksum" in query and self.identity_reads < 2:
                self.identity_reads += 1
                if self.identity_reads == 2:
                    self.two_readers.set()
                await self.two_readers.wait()
            return result

        async def insert_one(self, doc):
            identity = {key: doc[key] for key in (
                "partner_id", "step_id", "template_id", "template_version", "checksum", "source_checksum",
            )}
            if any(_matches(existing, identity) for existing in self.docs):
                raise DuplicateKeyError("duplicate phase2 output identity")
            self.docs.append(doc.copy())

    db = FakeDb()
    db.partner_phase2_output_versions = UniqueBarrierCollection()

    first, second = await asyncio.gather(
        archive_phase2_output(db, make_request()),
        archive_phase2_output(db, make_request()),
    )

    assert first.version == second.version == 1
    assert {first.created, second.created} == {True, False}
    assert len(db.partner_phase2_output_versions.docs) == 1


@pytest.mark.asyncio
async def test_concurrent_same_identity_does_not_leave_counter_gap():
    class UniqueBarrierCollection(Collection):
        def __init__(self):
            super().__init__()
            self.identity_reads = 0
            self.two_readers = asyncio.Event()

        async def find_one(self, query, projection=None, sort=None):
            result = await super().find_one(query, projection, sort)
            if "checksum" in query and self.identity_reads < 2:
                self.identity_reads += 1
                if self.identity_reads == 2:
                    self.two_readers.set()
                await self.two_readers.wait()
            return result

        async def insert_one(self, doc):
            identity = {key: doc[key] for key in (
                "partner_id", "step_id", "template_id", "template_version", "checksum", "source_checksum",
            )}
            if any(_matches(existing, identity) for existing in self.docs):
                raise DuplicateKeyError("duplicate phase2 output identity")
            self.docs.append(doc.copy())

    db = FakeDb()
    db.partner_phase2_output_versions = UniqueBarrierCollection()

    first, retry = await asyncio.gather(
        archive_phase2_output(db, make_request()),
        archive_phase2_output(db, make_request()),
    )
    distinct = await archive_phase2_output(db, make_request(content={"v": 2}))

    assert (first.version, retry.version, distinct.version) == (1, 1, 2)
    assert len(db.partner_phase2_output_versions.docs) == 2


@pytest.mark.asyncio
async def test_retry_waits_for_in_progress_identity_reservation():
    class DelayedFinalizationCollection(Collection):
        def __init__(self):
            super().__init__()
            self.finalization_started = asyncio.Event()
            self.release_finalization = asyncio.Event()

        async def find_one_and_update(self, query, update, upsert=False, return_document=None):
            if update.get("$set", {}).get("version") == 1:
                self.finalization_started.set()
                await self.release_finalization.wait()
            return await super().find_one_and_update(query, update, upsert, return_document)

    db = FakeDb()
    db.partner_phase2_output_versions = DelayedFinalizationCollection()
    first_task = asyncio.create_task(archive_phase2_output(db, make_request()))
    await db.partner_phase2_output_versions.finalization_started.wait()

    retry_task = asyncio.create_task(archive_phase2_output(db, make_request()))
    await asyncio.sleep(0.02)
    assert not retry_task.done()
    db.partner_phase2_output_versions.release_finalization.set()
    first, retry = await asyncio.gather(first_task, retry_task)
    distinct = await archive_phase2_output(db, make_request(content={"v": 2}))

    assert (first.version, retry.version, distinct.version) == (1, 1, 2)
    assert {first.created, retry.created} == {True, False}


@pytest.mark.asyncio
async def test_expired_reservation_is_recovered_once_and_finalized():
    request = make_request()
    content_payload = json.dumps(
        request.content, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    checksum = hashlib.sha256(content_payload.encode("utf-8")).hexdigest()
    source_payload = json.dumps(
        request.source_checksums, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    source_checksum = hashlib.sha256(source_payload.encode("utf-8")).hexdigest()
    db = FakeDb()
    db.partner_phase2_output_versions.docs.append({
        "partner_id": request.partner_id,
        "step_id": request.step_id,
        "template_id": request.template_id,
        "template_version": request.template_version,
        "checksum": checksum,
        "source_checksum": source_checksum,
        "reservation_token": "abandoned-owner",
        "reservation_state": "allocating",
        "reservation_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1),
    })

    first, retry = await asyncio.gather(
        archive_phase2_output(db, request),
        archive_phase2_output(db, request),
    )

    assert (first.version, retry.version) == (1, 1)
    assert {first.created, retry.created} == {True, False}
    assert len(db.partner_phase2_output_versions.docs) == 1
    assert db.partner_phase2_output_versions.docs[0]["reservation_state"] == "stored"


@pytest.mark.asyncio
async def test_reclaim_after_counter_increment_returns_only_winning_output():
    class DelayedVersionPersistenceCollection(Collection):
        def __init__(self):
            super().__init__()
            self.version_persist_started = asyncio.Event()
            self.release_version_persist = asyncio.Event()
            self.delayed_once = False

        async def find_one_and_update(self, query, update, upsert=False, return_document=None):
            if "reserved_version" in update.get("$set", {}) and not self.delayed_once:
                self.delayed_once = True
                self.version_persist_started.set()
                await self.release_version_persist.wait()
            return await super().find_one_and_update(query, update, upsert, return_document)

    db = FakeDb()
    db.partner_phase2_output_versions = DelayedVersionPersistenceCollection()
    request = make_request()
    owner_task = asyncio.create_task(archive_phase2_output(db, request))
    await db.partner_phase2_output_versions.version_persist_started.wait()

    db.partner_phase2_output_versions.docs[0]["reservation_expires_at"] = (
        datetime.now(timezone.utc) - timedelta(seconds=1)
    )
    winner = await archive_phase2_output(db, request)
    db.partner_phase2_output_versions.release_version_persist.set()
    old_owner = await owner_task

    assert winner.version == 1
    assert old_owner.output_id == winner.output_id
    assert old_owner.version == winner.version
    assert old_owner.created is False
    assert db.partner_phase2_output_counters.docs[0]["version"] == 1
    assert len(db.partner_phase2_output_versions.docs) == 1


@pytest.mark.asyncio
async def test_late_older_insert_does_not_remain_current_after_newer_version():
    class DelayedFirstInsertCollection(Collection):
        def __init__(self):
            super().__init__()
            self.first_insert_started = asyncio.Event()
            self.release_first_insert = asyncio.Event()

        async def find_one_and_update(self, query, update, upsert=False, return_document=None):
            if update.get("$set", {}).get("version") == 1:
                self.first_insert_started.set()
                await self.release_first_insert.wait()
            return await super().find_one_and_update(query, update, upsert, return_document)

    db = FakeDb()
    db.partner_phase2_output_versions = DelayedFirstInsertCollection()
    first_task = asyncio.create_task(
        archive_phase2_output(db, make_request(content={"v": 1}))
    )
    await db.partner_phase2_output_versions.first_insert_started.wait()

    second_task = asyncio.create_task(
        archive_phase2_output(db, make_request(content={"v": 2}))
    )
    await asyncio.sleep(0.02)
    assert not second_task.done()
    db.partner_phase2_output_versions.release_first_insert.set()
    first, second = await asyncio.gather(first_task, second_task)

    by_version = {document["version"]: document for document in db.partner_phase2_output_versions.docs}
    assert (first.version, second.version) == (1, 2)
    assert by_version[1]["status"] == "superseded"
    assert by_version[1]["is_current"] is False
    assert by_version[2]["is_current"] is True
