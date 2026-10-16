import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import routers.partner_step_materials as route


pytestmark = pytest.mark.unit


class FakeFiles:
    """count_documents answers by (partner_id): `owned` for the current owner, `clash` for the destination."""

    def __init__(self, owned=1, clash=0):
        self.owned, self.clash = owned, clash
        self.updates = []

    async def count_documents(self, key):
        return self.owned if key["partner_id"] == "andrea" else self.clash

    async def update_one(self, key, update):
        self.updates.append((key, update))
        return SimpleNamespace(matched_count=1)


class FakePartners:
    def __init__(self, existing=("marco",)):
        self.existing = set(existing)

    async def find_one(self, query, projection):
        return {"id": query["id"]} if query["id"] in self.existing else None


def _setup(monkeypatch, role="admin", files=None, partners=None):
    route.db = SimpleNamespace(files=files or FakeFiles(), partners=partners or FakePartners())

    async def authorize(partner_id, credentials):
        return SimpleNamespace(role=role)

    monkeypatch.setattr(route, "_authorize", authorize)
    return route.db


BODY = {"partner_id": "andrea", "new_partner_id": "marco", "reason": "File di Marco Serra finito per errore da Andrea Fredi"}


@pytest.mark.asyncio
async def test_admin_moves_the_file_to_the_right_partner_and_keeps_a_trace(monkeypatch):
    db = _setup(monkeypatch)

    result = await route.reassign_material_owner("f1", dict(BODY), object())

    assert result == {"success": True, "file_id": "f1", "partner_id": "marco", "previous_partner_id": "andrea"}
    key, update = db.files.updates[0]
    assert key == {"file_id": "f1", "partner_id": "andrea"}  # only the record of the current owner
    assert update["$set"]["partner_id"] == "marco"
    assert update["$set"]["previous_partner_id"] == "andrea"  # reversible
    assert update["$set"]["owner_change_reason"].startswith("File di Marco Serra")
    assert set(update) == {"$set"}  # nothing unset or deleted
    assert "visibility" not in update["$set"] and "step_id" not in update["$set"]


@pytest.mark.asyncio
async def test_partner_cannot_move_files(monkeypatch):
    db = _setup(monkeypatch, role="partner")
    with pytest.raises(HTTPException) as exc:
        await route.reassign_material_owner("f1", dict(BODY), object())
    assert exc.value.status_code == 403
    assert db.files.updates == []


@pytest.mark.asyncio
async def test_both_ids_are_required_and_must_differ(monkeypatch):
    db = _setup(monkeypatch)
    for bad in ({"partner_id": "andrea"}, {"new_partner_id": "marco"}, {"partner_id": "andrea", "new_partner_id": "andrea"}):
        with pytest.raises(HTTPException) as exc:
            await route.reassign_material_owner("f1", bad, object())
        assert exc.value.status_code == 400
    assert db.files.updates == []


@pytest.mark.asyncio
async def test_unknown_destination_partner_is_404_and_nothing_is_written(monkeypatch):
    db = _setup(monkeypatch, partners=FakePartners(existing=()))
    with pytest.raises(HTTPException) as exc:
        await route.reassign_material_owner("f1", dict(BODY), object())
    assert exc.value.status_code == 404
    assert db.files.updates == []


@pytest.mark.asyncio
async def test_missing_file_is_404(monkeypatch):
    db = _setup(monkeypatch, files=FakeFiles(owned=0))
    with pytest.raises(HTTPException) as exc:
        await route.reassign_material_owner("nope", dict(BODY), object())
    assert exc.value.status_code == 404
    assert db.files.updates == []


@pytest.mark.asyncio
async def test_colliding_ids_are_never_guessed_and_the_name_narrows_the_key(monkeypatch):
    db = _setup(monkeypatch, files=FakeFiles(owned=2))
    with pytest.raises(HTTPException) as exc:
        await route.reassign_material_owner("dup", dict(BODY), object())
    assert exc.value.status_code == 409
    assert db.files.updates == []

    db.files.owned = 1
    await route.reassign_material_owner("dup", {**BODY, "original_name": "Quiz SlimAmour + Funnel di Conversione.docx"}, object())
    key, _ = db.files.updates[0]
    assert key == {"file_id": "dup", "partner_id": "andrea", "original_name": "Quiz SlimAmour + Funnel di Conversione.docx"}


@pytest.mark.asyncio
async def test_destination_that_already_has_the_same_file_is_409_not_a_new_collision(monkeypatch):
    db = _setup(monkeypatch, files=FakeFiles(owned=1, clash=1))
    with pytest.raises(HTTPException) as exc:
        await route.reassign_material_owner("f1", dict(BODY), object())
    assert exc.value.status_code == 409
    assert db.files.updates == []
