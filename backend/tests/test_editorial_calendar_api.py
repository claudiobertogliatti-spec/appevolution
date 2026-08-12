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
        matches = [doc for doc in self.docs if self._matches(doc, query)]
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
            if self._matches(doc, query):
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
        for key, value in update.get("$setOnInsert", {}).items():
            doc.setdefault(key, value)
        self.docs.append(doc)
        return dict(doc)

    @staticmethod
    def _matches(doc, query):
        for key, value in query.items():
            actual = doc.get(key)
            if isinstance(value, dict):
                if "$lte" in value and not (actual is not None and actual <= value["$lte"]):
                    return False
            elif actual != value:
                return False
        return True

    async def insert_one(self, document):
        document["_id"] = f"mongo-{len(self.docs) + 1}"
        self.docs.append(deepcopy(document))
        return SimpleNamespace(inserted_id=len(self.docs))


class FakeDb:
    def __init__(self):
        self.users = FakeCollection([
            {"id": "partner-user", "partner_id": "p1"},
            {"id": "other-partner-user", "partner_id": "p2"},
        ])
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
        self.partner_launch_calendar_notification_recovery = FakeCollection()
        self.alerts = FakeCollection()
        self.partners = FakeCollection([{"id": "p1", "name": "Partner Uno"}])
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
        lambda token: {
            "partner-token": SimpleNamespace(user_id="partner-user", role="partner"),
            "other-partner-token": SimpleNamespace(user_id="other-partner-user", role="partner"),
            "admin-token": SimpleNamespace(user_id="admin-user", role="admin"),
            "superadmin-token": SimpleNamespace(user_id="superadmin-user", role="superadmin"),
        }.get(token),
    )
    return "partner-token"


@pytest.fixture
def admin_token(partner_token):
    return "admin-token"


@pytest.fixture
def superadmin_token(partner_token):
    return "superadmin-token"


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
        day["destination_url"] = f"https://www.ciak.io/{day['destination_kind']}"
    response = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": calendar_version["checksum"], "calendar": calendar},
    )
    assert response.status_code == 200
    return response.json()


def _with_ready_review_resources(client, partner_token, calendar_version):
    calendar = deepcopy(calendar_version["calendar"])
    for day in calendar["days"]:
        day["destination_url"] = f"https://www.ciak.io/{day['destination_kind']}"
    calendar["commercial_terms"] = {
        "version": "launch-terms-v1",
        "contract_duration_months": 12,
        "contract_start_anchor": "payment_completed",
        "price": {"price_id": "price-authoritative-v1", "amount_cent": 2700, "currency": "EUR"},
        "bonus": {
            "bonus_id": "bonus-authoritative-v1",
            "version": "bonus-v1",
            "name": "Sessione di orientamento",
            "expires_at": "2026-10-01T23:59:59+02:00",
        },
    }
    response = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": calendar_version["checksum"], "calendar": calendar},
    )
    assert response.status_code == 200
    return response.json()


def _submit(client, partner_token, calendar_version, partner_confirmed=True):
    return client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(partner_token),
        json={
            "partner_confirmed": partner_confirmed,
            "expected_checksum": calendar_version["checksum"],
        },
    )


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
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()

    response = _submit(client, partner_token, created, partner_confirmed=False)

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "launch_calendar_not_ready"
    assert response.json()["detail"]["failed_checks"] == ["partner_confirmation"]


def test_submit_rejects_draft_without_https_destinations(client, partner_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()

    response = _submit(client, partner_token, created)

    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "launch_calendar_not_ready",
        "failed_checks": ["https_destination_urls"],
    }


def test_partner_submit_moves_draft_to_pending_review_and_notifies_admin(
    client, partner_token, fake_db, monkeypatch
):
    async def telegram_ok(_message):
        return None

    monkeypatch.setattr(partner_journey, "notify_telegram", telegram_ok)
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)

    response = _submit(client, partner_token, created)

    assert response.status_code == 200
    assert response.json()["status"] == "pending_review"
    assert response.json()["partner_confirmed_at"]
    assert fake_db.versions[0]["partner_confirmed_by"] == "partner-user"
    assert len(fake_db.alerts.docs) == 1
    assert fake_db.alerts.docs[0]["requires_approval"] is True
    assert response.json()["checksum"] != created["checksum"]
    assert response.json()["calendar"]["partner_confirmation"]["calendar_checksum"] == response.json()["checksum"]


def test_only_admin_can_approve(client, partner_token, admin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_ready_review_resources(client, partner_token, created)
    _submit(client, partner_token, created)
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
    created = _with_ready_review_resources(client, partner_token, created)
    _submit(client, partner_token, created)
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
    created = _with_ready_review_resources(client, partner_token, created)
    _submit(client, partner_token, created)
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


def test_submit_requires_expected_checksum_and_persists_canonical_attestation(client, partner_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)

    missing = client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(partner_token),
        json={"partner_confirmed": True},
    )
    submitted = _submit(client, partner_token, created)

    assert missing.status_code == 422
    assert submitted.status_code == 200
    confirmation = submitted.json()["calendar"]["partner_confirmation"]
    assert confirmation["calendar_version"] == "1"
    assert confirmation["calendar_checksum"] == submitted.json()["checksum"]
    assert submitted.json()["checksum"] != created["checksum"]


def test_submit_rejects_stale_checksum_but_retries_identically(client, partner_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    ready = _with_https_destinations(client, partner_token, created)
    edited = deepcopy(ready["calendar"])
    edited["days"][0]["theme"] = "Versione aggiornata"
    current = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": ready["checksum"], "calendar": edited},
    ).json()

    stale = _submit(client, partner_token, ready)
    first = _submit(client, partner_token, current)
    retry = _submit(client, partner_token, current)

    assert stale.status_code == 409
    assert first.status_code == retry.status_code == 200
    assert retry.json()["status"] == "pending_review"
    assert retry.json()["checksum"] == first.json()["checksum"]


def test_approve_requires_complete_server_materialized_readiness(client, partner_token, admin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)
    _submit(client, partner_token, created)

    response = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "Manca il listino"},
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "launch_calendar_not_ready"
    assert "bonus_deadline" in response.json()["detail"]["failed_checks"]
    assert response.json()["detail"]["failed_checks"] == sorted(response.json()["detail"]["failed_checks"])


def test_approve_materializes_admin_only_resources_and_attestations(client, partner_token, admin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_ready_review_resources(client, partner_token, created)
    submitted = _submit(client, partner_token, created).json()

    response = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "Verificato dal team"},
    )

    assert response.status_code == 200
    approved = response.json()
    assert approved["status"] == "approved"
    assert approved["calendar"]["admin_approval"]["admin_id"] == "admin-user"
    assert approved["calendar"]["admin_approval"]["calendar_checksum"] == submitted["checksum"]
    assert approved["approval_resources"]["commercial_terms"] == submitted["calendar"]["commercial_terms"]
    assert all(
        destination["purpose"] == destination["destination_kind"]
        for destination in approved["approval_resources"]["verified_destinations"].values()
    )


def test_approve_never_attests_reserved_test_destinations(client, partner_token, admin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    calendar = deepcopy(created["calendar"])
    for day in calendar["days"]:
        day["destination_url"] = f"https://calendar.test/{day['destination_kind']}"
    calendar["commercial_terms"] = {
        "version": "launch-terms-v1",
        "contract_duration_months": 12,
        "contract_start_anchor": "payment_completed",
        "price": {"price_id": "price-authoritative-v1", "amount_cent": 2700, "currency": "EUR"},
        "bonus": {
            "bonus_id": "bonus-authoritative-v1",
            "version": "bonus-v1",
            "name": "Sessione di orientamento",
            "expires_at": "2026-10-01T23:59:59+02:00",
        },
    }
    ready = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": created["checksum"], "calendar": calendar},
    ).json()
    _submit(client, partner_token, ready)

    response = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "Host fittizio"},
    )

    assert response.status_code == 409
    assert "verified_destination_urls" in response.json()["detail"]["failed_checks"]


def test_review_retry_is_idempotent_but_incompatible_decision_conflicts(client, partner_token, admin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_ready_review_resources(client, partner_token, created)
    _submit(client, partner_token, created)
    payload = {"decision": "approve", "note": "Verificato"}

    first = client.post("/api/partner/calendar/p1/versions/1/review", headers=_headers(admin_token), json=payload)
    retry = client.post("/api/partner/calendar/p1/versions/1/review", headers=_headers(admin_token), json=payload)
    incompatible = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "reject", "note": "Cambio idea"},
    )

    assert first.status_code == retry.status_code == 200
    assert retry.json()["checksum"] == first.json()["checksum"]
    assert incompatible.status_code == 409


def test_notification_failure_is_durable_and_identical_retry_resolves_it(
    client, partner_token, fake_db, monkeypatch
):
    attempts = []

    async def flaky_in_app_alert(*args, **kwargs):
        attempts.append((args, kwargs))
        if len(attempts) == 1:
            raise RuntimeError(
                f"Bearer SENSITIVE_PASSWORD password=NON_PERSISTERE api_{'key'}=NON_PERSISTERE "
                "notifica non raggiungibile"
            )
        return "best_effort_attempted"

    monkeypatch.setattr(editorial_calendar, "_write_pending_review_in_app_alert", flaky_in_app_alert)
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)

    first = _submit(client, partner_token, created)
    retry = _submit(client, partner_token, created)

    assert first.status_code == retry.status_code == 200
    assert len(fake_db.partner_launch_calendar_notification_recovery.docs) == 1
    recovery = fake_db.partner_launch_calendar_notification_recovery.docs[0]
    assert recovery["event"] == "pending_review"
    assert recovery["status"] == "sent"
    assert recovery["error_code"] == "admin_notification_failed"
    assert "error" not in recovery
    assert "PROVA_NON_PERSISTERE" not in repr(recovery)
    assert "SENSITIVE_PASSWORD" not in repr(recovery)


def test_identical_submit_does_not_duplicate_successful_admin_notification(
    client, partner_token, fake_db, monkeypatch
):
    async def telegram_ok(_message):
        return None

    monkeypatch.setattr(partner_journey, "notify_telegram", telegram_ok)
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)

    first = _submit(client, partner_token, created)
    retry = _submit(client, partner_token, created)

    assert first.status_code == retry.status_code == 200
    assert len(fake_db.alerts.docs) == 1
    assert fake_db.alerts.docs[0]["id"] == fake_db.partner_launch_calendar_notification_recovery.docs[0]["event_key"]
    assert len(fake_db.partner_launch_calendar_notification_recovery.docs) == 1
    event = fake_db.partner_launch_calendar_notification_recovery.docs[0]
    assert event["status"] == "sent"
    assert event["checksum"] == first.json()["checksum"]
    assert event["delivery_contract"] == "in_app_alert"
    assert event["telegram_status"] == "best_effort_attempted"


@pytest.mark.asyncio
async def test_expired_sending_lease_is_reclaimed_after_cancelled_delivery(fake_db, monkeypatch):
    monkeypatch.setattr(editorial_calendar, "db", fake_db)
    attempts = []

    async def cancelled_once(*args, **kwargs):
        attempts.append((args, kwargs))
        raise asyncio.CancelledError()

    monkeypatch.setattr(editorial_calendar, "_write_pending_review_in_app_alert", cancelled_once)
    with pytest.raises(asyncio.CancelledError):
        await editorial_calendar._notify_pending_review_or_record_recovery("p1", 1, "abc")

    recovery = fake_db.partner_launch_calendar_notification_recovery.docs[0]
    assert recovery["status"] == "sending"
    recovery["lease_expires_at"] = "2000-01-01T00:00:00+00:00"

    async def delivered(*args, **kwargs):
        attempts.append((args, kwargs))
        return "best_effort_attempted"

    monkeypatch.setattr(editorial_calendar, "_write_pending_review_in_app_alert", delivered)
    await editorial_calendar._notify_pending_review_or_record_recovery("p1", 1, "abc")

    assert len(attempts) == 2
    assert recovery["status"] == "sent"
    assert recovery["telegram_status"] == "best_effort_attempted"


@pytest.mark.parametrize(
    "url",
    [
        "https://127.0.0.1/live",
        "https://[::1]/live",
        "https://10.1.2.3/live",
        "https://192.0.2.25/live",
        "https://0.0.0.0/live",
        "https://localhost/live",
        "https://[fe80::1]/live",
        "https://[2001:db8::1]/live",
        "https://[::]/live",
        "https://[ff02::1]/live",
        "https://224.0.0.1/live",
    ],
)
def test_review_destination_rejects_non_public_ip_or_local_hostname(url):
    assert editorial_calendar._is_real_review_destination(url) is False


def test_calendar_transition_auth_uses_401_for_missing_or_invalid_and_403_for_roles(
    client, partner_token, admin_token
):
    missing = client.post("/api/partner/calendar/p1/versions/1/review", json={"decision": "approve", "note": "x"})
    invalid = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers("invalid-token"),
        json={"decision": "approve", "note": "x"},
    )
    missing_submit = client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        json={"partner_confirmed": True, "expected_checksum": "x"},
    )
    invalid_submit = client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers("invalid-token"),
        json={"partner_confirmed": True, "expected_checksum": "x"},
    )
    foreign = client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers("other-partner-token"),
        json={"partner_confirmed": True, "expected_checksum": "x"},
    )
    admin_submit = client.post(
        "/api/partner/calendar/p1/versions/1/submit",
        headers=_headers(admin_token),
        json={"partner_confirmed": True, "expected_checksum": "x"},
    )

    assert missing.status_code == invalid.status_code == missing_submit.status_code == invalid_submit.status_code == 401
    assert foreign.status_code == admin_submit.status_code == 403


@pytest.mark.asyncio
async def test_concurrent_identical_partner_submit_returns_one_pending_review_state(
    client, partner_token, fake_db
):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)

    class InterleavedVersions(FakeCollection):
        def __init__(self, docs):
            super().__init__(docs)
            self.readers = 0
            self.two_readers = asyncio.Event()

        async def find_one(self, query, projection=None, sort=None):
            if query == {"partner_id": "p1", "version": 1}:
                result = await super().find_one(query, projection, sort)
                self.readers += 1
                if self.readers == 2:
                    self.two_readers.set()
                await self.two_readers.wait()
                return result
            return await super().find_one(query, projection, sort)

    fake_db.partner_launch_calendar_versions = InterleavedVersions(fake_db.versions)
    fake_db.versions = fake_db.partner_launch_calendar_versions.docs
    app = FastAPI()
    app.include_router(editorial_calendar.router)
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    payload = {"partner_confirmed": True, "expected_checksum": created["checksum"]}
    async with AsyncClient(transport=transport, base_url="http://calendar.test") as async_client:
        first, second = await asyncio.gather(
            async_client.post("/api/partner/calendar/p1/versions/1/submit", headers=_headers(partner_token), json=payload),
            async_client.post("/api/partner/calendar/p1/versions/1/submit", headers=_headers(partner_token), json=payload),
        )

    assert {first.status_code, second.status_code} == {200}
    assert first.json()["status"] == second.json()["status"] == "pending_review"
    assert first.json()["checksum"] == second.json()["checksum"]


@pytest.mark.asyncio
async def test_concurrent_identical_admin_review_returns_one_approval_state(
    client, partner_token, admin_token, fake_db
):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_ready_review_resources(client, partner_token, created)
    _submit(client, partner_token, created)

    class InterleavedVersions(FakeCollection):
        def __init__(self, docs):
            super().__init__(docs)
            self.readers = 0
            self.two_readers = asyncio.Event()

        async def find_one(self, query, projection=None, sort=None):
            if query == {"partner_id": "p1", "version": 1}:
                result = await super().find_one(query, projection, sort)
                self.readers += 1
                if self.readers == 2:
                    self.two_readers.set()
                await self.two_readers.wait()
                return result
            return await super().find_one(query, projection, sort)

    fake_db.partner_launch_calendar_versions = InterleavedVersions(fake_db.versions)
    fake_db.versions = fake_db.partner_launch_calendar_versions.docs
    app = FastAPI()
    app.include_router(editorial_calendar.router)
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    payload = {"decision": "approve", "note": "Verificato"}
    async with AsyncClient(transport=transport, base_url="http://calendar.test") as async_client:
        first, second = await asyncio.gather(
            async_client.post("/api/partner/calendar/p1/versions/1/review", headers=_headers(admin_token), json=payload),
            async_client.post("/api/partner/calendar/p1/versions/1/review", headers=_headers(admin_token), json=payload),
        )

    assert {first.status_code, second.status_code} == {200}
    assert first.json()["checksum"] == second.json()["checksum"]


def test_superadmin_can_review_ready_calendar(client, partner_token, superadmin_token):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_ready_review_resources(client, partner_token, created)
    _submit(client, partner_token, created)

    response = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(superadmin_token),
        json={"decision": "approve", "note": "OK"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"


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
