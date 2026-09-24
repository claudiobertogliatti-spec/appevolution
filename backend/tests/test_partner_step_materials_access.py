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


class FakeAssignFiles:
    def __init__(self, document):
        self.document = document
        self.updates = []

    async def find_one(self, query, projection):
        return dict(self.document) if self.document else None

    async def update_one(self, key, update):
        self.updates.append((key, update))
        return SimpleNamespace(matched_count=1)


def _as(monkeypatch, role):
    async def authorize(partner_id, credentials):
        return SimpleNamespace(role=role)

    monkeypatch.setattr(route, "_authorize", authorize)


@pytest.mark.asyncio
async def test_admin_can_link_an_existing_file_to_a_journey_step(monkeypatch):
    files = FakeAssignFiles({"file_id": "cal", "partner_id": "23", "status": "uploaded"})
    route.db = SimpleNamespace(files=files)
    _as(monkeypatch, "admin")

    result = await route.assign_material_to_step("cal", {"step_id": "11-calendario-30gg"}, object())

    assert result["success"] is True
    key, update = files.updates[0]
    assert key == {"file_id": "cal", "partner_id": "23"}
    assert update["$set"]["step_id"] == "11-calendario-30gg"
    assert update["$set"]["status"] == "approved"
    assert "visibility" not in update["$set"]


@pytest.mark.asyncio
async def test_partner_cannot_relink_materials(monkeypatch):
    files = FakeAssignFiles({"file_id": "cal", "partner_id": "23"})
    route.db = SimpleNamespace(files=files)
    _as(monkeypatch, "partner")

    with pytest.raises(HTTPException) as exc:
        await route.assign_material_to_step("cal", {"step_id": "11-calendario-30gg"}, object())

    assert exc.value.status_code == 403
    assert files.updates == []


@pytest.mark.asyncio
async def test_link_rejects_unknown_step_and_missing_file(monkeypatch):
    _as(monkeypatch, "admin")
    route.db = SimpleNamespace(files=FakeAssignFiles({"file_id": "cal", "partner_id": "23"}))
    with pytest.raises(HTTPException) as bad_step:
        await route.assign_material_to_step("cal", {"step_id": "15-calendario-30gg"}, object())
    assert bad_step.value.status_code == 400

    route.db = SimpleNamespace(files=FakeAssignFiles(None))
    with pytest.raises(HTTPException) as missing:
        await route.assign_material_to_step("nope", {"step_id": "11-calendario-30gg"}, object())
    assert missing.value.status_code == 404
