import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import routers.partner_step_materials as route
from services.partner_step_materials import file_visible_to_partner, partner_materiali_listing


pytestmark = pytest.mark.unit


class FakeFiles:
    """Only what the endpoint uses: count_documents(key) and update_one(key, update)."""

    def __init__(self, matches=1):
        self.matches = matches
        self.counted = []
        self.updates = []

    async def count_documents(self, key):
        self.counted.append(key)
        return self.matches

    async def update_one(self, key, update):
        self.updates.append((key, update))
        return SimpleNamespace(matched_count=1)


def _as(monkeypatch, role):
    async def authorize(partner_id, credentials):
        return SimpleNamespace(role=role)

    monkeypatch.setattr(route, "_authorize", authorize)


@pytest.mark.asyncio
async def test_admin_hides_a_foreign_file_without_deleting_it(monkeypatch):
    files = FakeFiles()
    route.db = SimpleNamespace(files=files)
    _as(monkeypatch, "admin")

    result = await route.set_material_visibility(
        "f1", {"partner_id": "andrea", "visibility": "foreign_owner", "reason": "File di Marco Serra (SlimAmour)"}, object()
    )

    assert result == {"success": True, "file_id": "f1", "partner_id": "andrea", "visibility": "foreign_owner"}
    key, update = files.updates[0]
    assert key == {"file_id": "f1", "partner_id": "andrea"}  # scoped to THAT partner
    assert update["$set"]["visibility"] == "foreign_owner"
    assert update["$set"]["visibility_reason"] == "File di Marco Serra (SlimAmour)"
    assert "visibility_updated_at" in update["$set"]
    assert set(update) == {"$set"}  # no $unset, no delete: the record stays


@pytest.mark.asyncio
async def test_a_hidden_file_disappears_for_the_partner_and_comes_back_when_reversed():
    doc = {"file_id": "f1", "partner_id": "andrea", "internal_url": "https://res.cloudinary.com/x/raw/upload/a.pdf"}
    assert [d["file_id"] for d in partner_materiali_listing([doc])] == ["f1"]  # before
    hidden = {**doc, "visibility": "foreign_owner"}
    assert partner_materiali_listing([hidden]) == []  # partner no longer sees it
    assert file_visible_to_partner(hidden) is False  # nor can open it by guessing the id
    assert [d["file_id"] for d in partner_materiali_listing([hidden], include_hidden=True)] == ["f1"]  # admin still does
    restored = {**doc, "visibility": "partner_visible"}
    assert [d["file_id"] for d in partner_materiali_listing([restored])] == ["f1"]  # reversible


@pytest.mark.asyncio
async def test_partner_cannot_change_visibility(monkeypatch):
    files = FakeFiles()
    route.db = SimpleNamespace(files=files)
    _as(monkeypatch, "partner")

    with pytest.raises(HTTPException) as exc:
        await route.set_material_visibility("f1", {"partner_id": "andrea", "visibility": "partner_visible"}, object())

    assert exc.value.status_code == 403
    assert files.updates == []


@pytest.mark.asyncio
async def test_partner_id_is_required_and_visibility_must_be_a_known_value(monkeypatch):
    files = FakeFiles()
    route.db = SimpleNamespace(files=files)
    _as(monkeypatch, "admin")

    with pytest.raises(HTTPException) as no_partner:
        await route.set_material_visibility("f1", {"visibility": "foreign_owner"}, object())
    assert no_partner.value.status_code == 400

    with pytest.raises(HTTPException) as bad_value:
        await route.set_material_visibility("f1", {"partner_id": "andrea", "visibility": "banana"}, object())
    assert bad_value.value.status_code == 400
    assert files.updates == []


@pytest.mark.asyncio
async def test_missing_file_is_404_and_nothing_is_written(monkeypatch):
    files = FakeFiles(matches=0)
    route.db = SimpleNamespace(files=files)
    _as(monkeypatch, "admin")

    with pytest.raises(HTTPException) as exc:
        await route.set_material_visibility("nope", {"partner_id": "andrea", "visibility": "foreign_owner"}, object())

    assert exc.value.status_code == 404
    assert files.updates == []


@pytest.mark.asyncio
async def test_colliding_file_ids_are_never_resolved_by_guessing(monkeypatch):
    files = FakeFiles(matches=2)
    route.db = SimpleNamespace(files=files)
    _as(monkeypatch, "admin")

    with pytest.raises(HTTPException) as exc:
        await route.set_material_visibility("dup", {"partner_id": "andrea", "visibility": "foreign_owner"}, object())
    assert exc.value.status_code == 409
    assert files.updates == []

    # with the name the key is narrower and the call goes through
    files.matches = 1
    await route.set_material_visibility(
        "dup", {"partner_id": "andrea", "visibility": "foreign_owner", "original_name": "Quiz SlimAmour + Funnel di Conversione.docx"}, object()
    )
    key, _ = files.updates[0]
    assert key == {"file_id": "dup", "partner_id": "andrea", "original_name": "Quiz SlimAmour + Funnel di Conversione.docx"}
