import asyncio

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
            if "$lt" in expected and (actual is None or not actual < expected["$lt"]):
                return False
            if "$gt" in expected and (actual is None or not actual > expected["$gt"]):
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
                return
        if upsert:
            document = dict(query)
            document.update(update.get("$max", {}))
            self.docs.append(document)

    async def find_one_and_update(self, query, update, upsert=False, return_document=None):
        for doc in self.docs:
            if _matches(doc, query):
                for key, value in update.get("$inc", {}).items():
                    doc[key] = doc.get(key, 0) + value
                doc.update(update.get("$set", {}))
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

        async def update_one(self, query, update, upsert=False):
            if update.get("$set", {}).get("version") == 1:
                self.finalization_started.set()
                await self.release_finalization.wait()
            await super().update_one(query, update, upsert)

    db = FakeDb()
    db.partner_phase2_output_versions = DelayedFinalizationCollection()
    first_task = asyncio.create_task(archive_phase2_output(db, make_request()))
    await db.partner_phase2_output_versions.finalization_started.wait()

    retry_task = asyncio.create_task(archive_phase2_output(db, make_request()))
    await asyncio.sleep(0)
    db.partner_phase2_output_versions.release_finalization.set()
    first, retry = await asyncio.gather(first_task, retry_task)

    assert (first.version, retry.version) == (1, 1)
    assert {first.created, retry.created} == {True, False}


@pytest.mark.asyncio
async def test_late_older_insert_does_not_remain_current_after_newer_version():
    class DelayedFirstInsertCollection(Collection):
        def __init__(self):
            super().__init__()
            self.first_insert_started = asyncio.Event()
            self.release_first_insert = asyncio.Event()

        async def update_one(self, query, update, upsert=False):
            if update.get("$set", {}).get("version") == 1:
                self.first_insert_started.set()
                await self.release_first_insert.wait()
            await super().update_one(query, update, upsert)

    db = FakeDb()
    db.partner_phase2_output_versions = DelayedFirstInsertCollection()
    first_task = asyncio.create_task(
        archive_phase2_output(db, make_request(content={"v": 1}))
    )
    await db.partner_phase2_output_versions.first_insert_started.wait()

    second = await archive_phase2_output(db, make_request(content={"v": 2}))
    db.partner_phase2_output_versions.release_first_insert.set()
    first = await first_task

    by_version = {document["version"]: document for document in db.partner_phase2_output_versions.docs}
    assert (first.version, second.version) == (1, 2)
    assert by_version[1]["status"] == "superseded"
    assert by_version[1]["is_current"] is False
    assert by_version[2]["is_current"] is True
