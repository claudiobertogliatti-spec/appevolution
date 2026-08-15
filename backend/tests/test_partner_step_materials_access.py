import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import routers.partner_step_materials as route


pytestmark = pytest.mark.unit


class FakeFiles:
    def __init__(self, document):
        self.document = document

    async def find_one(self, query, projection):
        return dict(self.document)


@pytest.mark.asyncio
async def test_partner_cannot_open_admin_only_file_by_guessing_its_file_id(monkeypatch):
    route.db = SimpleNamespace(files=FakeFiles({
        "file_id": "secret",
        "partner_id": "p1",
        "visibility": "admin_only",
        "approval_status": "approved",
    }))

    async def authorize(partner_id, credentials):
        return SimpleNamespace(role="partner")

    monkeypatch.setattr(route, "_authorize", authorize)

    with pytest.raises(HTTPException) as exc:
        await route._file_or_404("secret", object())

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_admin_can_open_admin_only_file(monkeypatch):
    document = {
        "file_id": "secret",
        "partner_id": "p1",
        "visibility": "admin_only",
        "approval_status": "approved",
    }
    route.db = SimpleNamespace(files=FakeFiles(document))

    async def authorize(partner_id, credentials):
        return SimpleNamespace(role="admin")

    monkeypatch.setattr(route, "_authorize", authorize)

    assert await route._file_or_404("secret", object()) == document
