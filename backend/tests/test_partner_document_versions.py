import asyncio

import pytest
from pymongo.errors import DuplicateKeyError

from services.partner_document_versions import archive_document_version


pytestmark = pytest.mark.unit


class Collection:
    def __init__(self, docs=None): self.docs = list(docs or [])
    async def find_one(self, query, projection=None, sort=None):
        matches = [doc for doc in self.docs if all(doc.get(k) == v for k, v in query.items())]
        if sort: matches.sort(key=lambda doc: doc.get(sort[0][0], 0), reverse=sort[0][1] < 0)
        return matches[0].copy() if matches else None
    async def insert_one(self, doc): self.docs.append(doc.copy())
    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                for key, value in update.get("$max", {}).items():
                    doc[key] = max(doc.get(key, value), value)
                return
        if upsert:
            doc = dict(query)
            doc.update(update.get("$max", {}))
            self.docs.append(doc)
    async def find_one_and_update(self, query, update, upsert=False, return_document=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                for key, value in update.get("$inc", {}).items():
                    doc[key] = doc.get(key, 0) + value
                return doc.copy()
        if upsert:
            doc = dict(query)
            doc.update(update.get("$inc", {}))
            self.docs.append(doc)
            return doc.copy()
        return None


class Db:
    def __init__(self):
        self.partner_document_versions = Collection()
        self.partner_document_version_counters = Collection()


@pytest.mark.asyncio
async def test_archive_is_versioned_and_idempotent_by_source_version():
    db = Db(); pdf = b"%PDF-1.4\n" + b"x" * 200
    first = await archive_document_version(db, "p1", "workbook", "launch-1", pdf)
    retry = await archive_document_version(db, "p1", "workbook", "launch-1", pdf)
    second = await archive_document_version(db, "p1", "workbook", "launch-2", pdf + b"y")
    assert (first.version, first.created) == (1, True)
    assert (retry.version, retry.created) == (1, False)
    assert second.version == 2
    assert len(db.partner_document_versions.docs) == 2


@pytest.mark.asyncio
async def test_archive_rejects_empty_or_invalid_pdf():
    with pytest.raises(ValueError):
        await archive_document_version(Db(), "p1", "workbook", "v1", b"")


@pytest.mark.asyncio
async def test_concurrent_archive_of_same_approved_calendar_creates_one_version():
    provenance = {
        "calendar_version": 2,
        "calendar_checksum": "approved-checksum-v2",
        "calendar_approved_at": "2026-08-13T10:00:00+00:00",
    }
    legacy = {
        "document_id": "legacy",
        "partner_id": "p1",
        "kind": "workbook_final",
        "source_version": "launch-legacy",
        "version": 1,
        "checksum": "legacy-checksum",
    }

    class UniqueBarrierCollection(Collection):
        def __init__(self):
            super().__init__([legacy])
            self.identity_reads = 0
            self.two_readers = asyncio.Event()

        async def find_one(self, query, projection=None, sort=None):
            if query.get("source_version") == "launch-calendar:2:approved-checksum-v2" and self.identity_reads < 2:
                result = await super().find_one(query, projection, sort)
                self.identity_reads += 1
                if self.identity_reads == 2:
                    self.two_readers.set()
                await self.two_readers.wait()
                return result
            return await super().find_one(query, projection, sort)

        async def insert_one(self, doc):
            identity = {
                "partner_id": doc["partner_id"],
                "kind": doc["kind"],
                "source_version": doc["source_version"],
                "provenance": doc["provenance"],
            }
            if any(all(existing.get(key) == value for key, value in identity.items()) for existing in self.docs):
                raise DuplicateKeyError("duplicate workbook calendar source")
            self.docs.append(doc.copy())

    db = Db()
    db.partner_document_versions = UniqueBarrierCollection()
    pdf = b"%PDF-1.4\n" + b"approved" * 30

    first, second = await asyncio.gather(
        archive_document_version(
            db,
            "p1",
            "workbook_final",
            "launch-calendar:2:approved-checksum-v2",
            pdf,
            provenance=provenance,
        ),
        archive_document_version(
            db,
            "p1",
            "workbook_final",
            "launch-calendar:2:approved-checksum-v2",
            pdf,
            provenance=provenance,
        ),
    )

    assert first.document_id == second.document_id
    assert first.version == second.version == 2
    assert {first.created, second.created} == {True, False}
    assert len(db.partner_document_versions.docs) == 2


@pytest.mark.asyncio
async def test_concurrent_different_sources_allocate_distinct_versions():
    class DifferentSourceBarrier(Collection):
        def __init__(self):
            super().__init__([{
                "document_id": "legacy",
                "partner_id": "p1",
                "kind": "workbook_final",
                "source_version": "legacy",
                "version": 1,
            }])
            self.latest_reads = 0
            self.two_readers = asyncio.Event()

        async def find_one(self, query, projection=None, sort=None):
            result = await super().find_one(query, projection, sort)
            if query == {"partner_id": "p1", "kind": "workbook_final"} and self.latest_reads < 2:
                self.latest_reads += 1
                if self.latest_reads == 2:
                    self.two_readers.set()
                await self.two_readers.wait()
            return result

    db = Db()
    db.partner_document_versions = DifferentSourceBarrier()
    pdf = b"%PDF-1.4\n" + b"source" * 40

    first, second = await asyncio.gather(
        archive_document_version(db, "p1", "workbook_final", "source-a", pdf),
        archive_document_version(db, "p1", "workbook_final", "source-b", pdf + b"b"),
    )

    assert {first.version, second.version} == {2, 3}
    assert len(db.partner_document_versions.docs) == 3
