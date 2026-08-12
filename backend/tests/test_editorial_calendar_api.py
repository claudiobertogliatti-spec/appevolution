"""Contratti HTTP per le bozze versionate del calendario F-14."""
from __future__ import annotations

import asyncio
from copy import deepcopy
import os
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("MONGO_URL", "mongodb://calendar-test.invalid:27017")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "calendar-test-secret-not-for-production")

from routers import editorial_calendar, partner_journey
from db_indexes import ensure_indexes
from services.editorial_calendar import _deterministic

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    async def find_one(self, query, projection=None, sort=None):
        matches = [doc for doc in self.docs if all(doc.get(key) == value for key, value in query.items())]
        if sort:
            field, direction = sort[0]
            matches.sort(key=lambda doc: doc.get(field, 0), reverse=direction < 0)
        if not matches:
            return None
        result = dict(matches[0])
        if projection and projection.get("_id") == 0:
            result.pop("_id", None)
        return result

    async def find_one_and_update(self, query, update, upsert=False, return_document=None):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                for key, value in update.get("$inc", {}).items():
                    doc[key] = doc.get(key, 0) + value
                for key, value in update.get("$set", {}).items():
                    doc[key] = value
                return dict(doc)
        if not upsert:
            return None
        doc = dict(query)
        for key, value in update.get("$inc", {}).items():
            doc[key] = value
        for key, value in update.get("$set", {}).items():
            doc[key] = value
        self.docs.append(doc)
        return dict(doc)

    async def insert_one(self, document):
        document["_id"] = f"mongo-{len(self.docs) + 1}"
        self.docs.append(deepcopy(document))
        return SimpleNamespace(inserted_id=len(self.docs))


class FakeDb:
    def __init__(self):
        self.users = FakeCollection([{"id": "partner-user", "partner_id": "p1"}])
        self.partner_journey_steps = FakeCollection([
            {
                "partner_id": "p1",
                "step_id": "04-posizionamento",
                "data": {"answers": {"nicchia": "consulenti"}},
            },
            {"partner_id": "p1", "step_id": "06-outline-lezioni", "data": {}},
        ])
        self.partner_launch_calendar_versions = FakeCollection()
        self.partner_launch_calendar_counters = FakeCollection()
        self.versions = self.partner_launch_calendar_versions.docs


@pytest.fixture
def fake_db(monkeypatch):
    fake = FakeDb()
    monkeypatch.setattr(editorial_calendar, "db", fake)
    monkeypatch.setattr(partner_journey, "db", fake)
    return fake


@pytest.fixture
def partner_token(monkeypatch):
    import auth

    monkeypatch.setattr(
        auth,
        "decode_token",
        lambda _token: SimpleNamespace(user_id="partner-user", role="partner"),
    )
    return "partner-token"


@pytest.fixture
def client(fake_db, monkeypatch):
    async def deterministic_calendar(answers, outline):
        return _deterministic(answers, outline)

    monkeypatch.setattr(editorial_calendar, "build_editorial_calendar", deterministic_calendar)
    app = FastAPI()
    app.include_router(editorial_calendar.router)
    with TestClient(app) as test_client:
        yield test_client


def _headers(partner_token):
    return {"Authorization": f"Bearer {partner_token}"}


def _generation_payload():
    return {"start_date": "2026-09-01", "live_date": "2026-09-28"}


def test_generate_creates_version_one(client, partner_token, fake_db):
    response = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["version"] == 1
    assert body["status"] == "draft"
    assert body["created_by"] == "partner-user"
    assert body["checksum"]
    assert "_id" not in body
    assert fake_db.versions[0]["calendar"]["days"][27]["date"] == "2026-09-28"


def test_partner_cannot_read_other_calendar(client, partner_token):
    response = client.get(
        "/api/partner/calendar/p2/versions/current",
        headers=_headers(partner_token),
    )

    assert response.status_code == 403


def test_regeneration_creates_version_two_without_overwriting_one(client, partner_token, fake_db):
    first = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    )
    first_calendar = deepcopy(first.json()["calendar"])
    second = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    )

    assert first.status_code == second.status_code == 201
    assert second.json()["version"] == 2
    assert [doc["version"] for doc in fake_db.versions] == [1, 2]
    assert fake_db.versions[0]["calendar"] == first_calendar


def test_draft_update_requires_current_checksum(client, partner_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    edited_calendar = deepcopy(created["calendar"])
    edited_calendar["days"][0]["theme"] = "Tema aggiornato"

    updated = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": created["checksum"], "calendar": edited_calendar},
    )
    stale = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": created["checksum"], "calendar": edited_calendar},
    )

    assert updated.status_code == 200
    assert updated.json()["calendar"]["days"][0]["theme"] == "Tema aggiornato"
    assert updated.json()["checksum"] != created["checksum"]
    assert stale.status_code == 409


def test_calendar_version_index_is_unique_per_partner_and_version():
    calls = []

    class IndexCollection:
        async def create_index(self, fields, **options):
            calls.append((fields, options))

    class IndexDb:
        def __getitem__(self, _name):
            return IndexCollection()

    result = asyncio.run(ensure_indexes(IndexDb()))

    assert (
        [("partner_id", 1), ("version", 1)],
        {"unique": True, "name": "partner_launch_calendar_versions_partner_version_unique"},
    ) in calls
    assert result["total"] == 21
