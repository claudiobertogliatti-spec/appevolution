"""Contratti HTTP per le bozze versionate del calendario F-14."""
from __future__ import annotations

import asyncio
from copy import deepcopy
import os
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("MONGO_URL", "mongodb://calendar-test.invalid:27017")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "calendar-test-secret-not-for-production")

from routers import editorial_calendar, partner_journey
from db_indexes import CriticalIndexError, ensure_indexes
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
        lambda token: (
            SimpleNamespace(user_id="admin-user", role="admin")
            if token == "admin-token"
            else SimpleNamespace(user_id="partner-user", role="partner")
        ),
    )
    return "partner-token"


@pytest.fixture
def admin_token(partner_token):
    return "admin-token"


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


def _with_https_destinations(client, partner_token, calendar_version):
    calendar = deepcopy(calendar_version["calendar"])
    for day in calendar["days"]:
        day["destination_url"] = f"https://calendar.test/{day['destination_kind']}"
    response = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": calendar_version["checksum"], "calendar": calendar},
    )
    assert response.status_code == 200
    return response.json()


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


def test_draft_update_preserves_server_side_source(client, partner_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    forged_calendar = deepcopy(created["calendar"])
    forged_calendar["source"] = "forged-client-source"

    updated = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": created["checksum"], "calendar": forged_calendar},
    )

    assert updated.status_code == 200
    assert updated.json()["source"] == created["source"] == "fallback"
    assert updated.json()["calendar"]["source"] == "fallback"


def test_submit_requires_partner_confirmation_and_ready_structure(client, partner_token):
    client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    )

    response = client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(partner_token),
        json={"partner_confirmed": False},
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "launch_calendar_not_ready"
    assert response.json()["detail"]["failed_checks"] == ["partner_confirmation"]


def test_submit_rejects_draft_without_https_destinations(client, partner_token):
    client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    )

    response = client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(partner_token),
        json={"partner_confirmed": True},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "launch_calendar_not_ready",
        "failed_checks": ["https_destination_urls"],
    }


def test_partner_submit_moves_draft_to_pending_review_and_notifies_admin(
    client, partner_token, fake_db, monkeypatch
):
    notifications = []

    async def record_notification(*args, **kwargs):
        notifications.append((args, kwargs))

    monkeypatch.setattr(partner_journey, "_notify_admin_partner_activity", record_notification)
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)

    response = client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(partner_token),
        json={"partner_confirmed": True},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "pending_review"
    assert response.json()["partner_confirmed_at"]
    assert fake_db.versions[0]["partner_confirmed_by"] == "partner-user"
    assert notifications == [
        (("p1", "ha confermato il calendario di lancio v1"), {"requires_approval": True})
    ]
    assert response.json()["checksum"] == created["checksum"]


def test_only_admin_can_approve(client, partner_token, admin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    _with_https_destinations(client, partner_token, created)
    client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(partner_token),
        json={"partner_confirmed": True},
    )
    payload = {"decision": "approve", "note": "Calendario verificato"}

    partner_response = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(partner_token),
        json=payload,
    )
    admin_response = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json=payload,
    )

    assert partner_response.status_code == 403
    assert admin_response.status_code == 200
    assert admin_response.json()["status"] == "approved"
    assert admin_response.json()["admin_review"]["approved_checksum"] == admin_response.json()["checksum"]


def test_approved_version_is_immutable(client, partner_token, admin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)
    client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(partner_token),
        json={"partner_confirmed": True},
    )
    client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "OK"},
    )

    response = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"calendar": created["calendar"], "expected_checksum": created["checksum"]},
    )

    assert response.status_code == 409


def test_review_compare_and_set_rejects_second_decision(client, partner_token, admin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    _with_https_destinations(client, partner_token, created)
    client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(partner_token),
        json={"partner_confirmed": True},
    )
    first = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "OK"},
    )
    second = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "reject", "note": "Troppo tardi"},
    )

    assert first.status_code == 200
    assert second.status_code == 409


def test_current_version_response_whitelists_public_fields(client, partner_token, fake_db):
    client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    )
    fake_db.versions[0]["internal_secret"] = "non esporre"
    fake_db.versions[0]["retry_internal_state"] = {"attempt": 2}

    response = client.get(
        "/api/partner/calendar/p1/versions/current",
        headers=_headers(partner_token),
    )

    assert response.status_code == 200
    assert "internal_secret" not in response.json()
    assert "retry_internal_state" not in response.json()
    assert set(response.json()) == {
        "partner_id", "version", "status", "calendar", "checksum", "source",
        "created_at", "created_by", "partner_confirmed_at", "admin_review",
    }


@pytest.mark.asyncio
async def test_concurrent_generation_allocates_two_unique_versions(fake_db, partner_token, monkeypatch):
    class AtomicCounter(FakeCollection):
        def __init__(self):
            super().__init__()
            self.lock = asyncio.Lock()

        async def find_one_and_update(self, query, update, upsert=False, return_document=None):
            async with self.lock:
                await asyncio.sleep(0)
                return await super().find_one_and_update(query, update, upsert, return_document)

    class InterleavedVersions(FakeCollection):
        def __init__(self):
            super().__init__()
            self.readers = 0
            self.two_readers = asyncio.Event()

        async def find_one(self, query, projection=None, sort=None):
            if query == {"partner_id": "p1"}:
                self.readers += 1
                if self.readers == 2:
                    self.two_readers.set()
                await self.two_readers.wait()
            return await super().find_one(query, projection, sort)

        async def insert_one(self, document):
            if any(
                existing["partner_id"] == document["partner_id"]
                and existing["version"] == document["version"]
                for existing in self.docs
            ):
                raise RuntimeError("duplicated calendar version")
            return await super().insert_one(document)

    fake_db.partner_launch_calendar_counters = AtomicCounter()
    fake_db.partner_launch_calendar_versions = InterleavedVersions()
    fake_db.versions = fake_db.partner_launch_calendar_versions.docs

    async def deterministic_calendar(answers, outline):
        await asyncio.sleep(0)
        return _deterministic(answers, outline)

    monkeypatch.setattr(editorial_calendar, "build_editorial_calendar", deterministic_calendar)
    app = FastAPI()
    app.include_router(editorial_calendar.router)
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://calendar.test") as async_client:
        first, second = await asyncio.gather(
            async_client.post(
                "/api/partner/calendar/p1/versions",
                headers=_headers(partner_token),
                json=_generation_payload(),
            ),
            async_client.post(
                "/api/partner/calendar/p1/versions",
                headers=_headers(partner_token),
                json=_generation_payload(),
            ),
        )

    assert {first.status_code, second.status_code} == {201}
    assert {first.json()["version"], second.json()["version"]} == {1, 2}
    assert {doc["version"] for doc in fake_db.versions} == {1, 2}
    assert len(fake_db.versions) == 2


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


def test_calendar_version_index_failure_is_fatal_but_hot_indexes_stay_best_effort():
    class IndexCollection:
        def __init__(self, name):
            self.name = name

        async def create_index(self, fields, **options):
            if self.name == "partners":
                raise RuntimeError("hot index unavailable")
            if self.name == "partner_launch_calendar_versions":
                raise RuntimeError("calendar unique index unavailable")

    class IndexDb:
        def __getitem__(self, name):
            return IndexCollection(name)

    with pytest.raises(CriticalIndexError, match="calendar version index"):
        asyncio.run(ensure_indexes(IndexDb()))


def test_hot_index_failure_stays_best_effort_when_critical_index_succeeds():
    class IndexCollection:
        def __init__(self, name):
            self.name = name

        async def create_index(self, fields, **options):
            if self.name == "partners":
                raise RuntimeError("hot index unavailable")

    class IndexDb:
        def __getitem__(self, name):
            return IndexCollection(name)

    result = asyncio.run(ensure_indexes(IndexDb()))

    assert result == {"ok": 19, "failed": 2, "total": 21}
