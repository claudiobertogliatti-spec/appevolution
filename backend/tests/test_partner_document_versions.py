import pytest

from services.partner_document_versions import archive_document_version


pytestmark = pytest.mark.unit


class Collection:
    def __init__(self): self.docs = []
    async def find_one(self, query, projection=None, sort=None):
        matches = [doc for doc in self.docs if all(doc.get(k) == v for k, v in query.items())]
        if sort: matches.sort(key=lambda doc: doc.get(sort[0][0], 0), reverse=sort[0][1] < 0)
        return matches[0].copy() if matches else None
    async def insert_one(self, doc): self.docs.append(doc.copy())


class Db:
    def __init__(self): self.partner_document_versions = Collection()


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
