"""Contratti HTTP per le bozze versionate del calendario F-14."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import os
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("MONGO_URL", "mongodb://calendar-test.invalid:27017")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "calendar-test-secret-not-for-production")

from routers import editorial_calendar, partner_journey, partner_rewards
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
                for key, value in update.get("$max", {}).items():
                    doc[key] = max(doc.get(key, value), value)
                return dict(doc)
        if not upsert:
            return None
        doc = dict(query)
        for key, value in update.get("$inc", {}).items():
            doc[key] = value
        for key, value in update.get("$set", {}).items():
            doc[key] = value
        for key, value in update.get("$max", {}).items():
            doc[key] = value
        for key, value in update.get("$setOnInsert", {}).items():
            doc.setdefault(key, value)
        self.docs.append(doc)
        return dict(doc)

    @staticmethod
    def _matches(doc, query):
        for key, value in query.items():
            if key == "$or":
                if not any(FakeCollection._matches(doc, condition) for condition in value):
                    return False
                continue
            actual = doc.get(key)
            if isinstance(value, dict):
                if "$lte" in value and not (actual is not None and actual <= value["$lte"]):
                    return False
                if "$gt" in value and not (actual is not None and actual > value["$gt"]):
                    return False
            elif actual != value:
                return False
        return True

    def find(self, query, projection=None):
        return FakeCursor([doc for doc in self.docs if self._matches(doc, query)])

    async def insert_one(self, document):
        document["_id"] = f"mongo-{len(self.docs) + 1}"
        self.docs.append(deepcopy(document))
        return SimpleNamespace(inserted_id=len(self.docs))

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if self._matches(doc, query):
                for key, value in update.get("$set", {}).items():
                    doc[key] = value
                for key, value in update.get("$max", {}).items():
                    doc[key] = max(doc.get(key, value), value)
                return SimpleNamespace(matched_count=1, modified_count=1)
        if upsert:
            document = dict(query)
            document.update(update.get("$set", {}))
            document.update(update.get("$setOnInsert", {}))
            document.update(update.get("$max", {}))
            self.docs.append(document)
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=len(self.docs))
        return SimpleNamespace(matched_count=0, modified_count=0)


class FakeCursor:
    def __init__(self, docs):
        self.docs = [dict(doc) for doc in docs]

    def sort(self, _field, _direction):
        return self

    async def to_list(self, limit=None, length=None):
        size = length if length is not None else limit
        return self.docs[:size]


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
            {
                "_id": "step-f14",
                "partner_id": "p1",
                "step_id": "11-calendario-30gg",
                "step_number": 14,
                "status": "in_progress",
                "data": {"summary": "CALENDARIO INVENTATO NELLO STEP"},
            },
            {
                "_id": "scaffold-step-f15",
                "partner_id": "p1",
                "step_id": "12-prezzo-webinar",
                "step_number": 15,
                "status": "pending",
                "data": {},
                "_test_scaffold": True,
            },
        ])
        self.partner_launch_calendar_versions = FakeCollection()
        self.partner_launch_calendar_counters = FakeCollection()
        self.partner_launch_calendar_notification_recovery = FakeCollection()
        self.partner_document_versions = FakeCollection()
        self.partner_document_version_counters = FakeCollection()
        self.partner_lancio = FakeCollection()
        self.alerts = FakeCollection()
        self.partners = FakeCollection([{"id": "p1", "name": "Partner Uno"}])
        self.partner_hub = FakeCollection()
        self.masterclass_factory = FakeCollection()
        self.partner_videocorso = FakeCollection()
        self.partner_brand_kits = FakeCollection()
        self.partner_funnel = FakeCollection()
        self.versions = self.partner_launch_calendar_versions.docs


@pytest.fixture
def fake_db(monkeypatch):
    fake = FakeDb()
    monkeypatch.setattr(editorial_calendar, "db", fake)
    monkeypatch.setattr(partner_journey, "db", fake)
    monkeypatch.setattr(partner_rewards, "db", fake)

    async def no_notification(*_args, **_kwargs):
        return True

    async def no_projection(*_args, **_kwargs):
        return None

    monkeypatch.setattr(partner_journey, "_notify_admin_partner_activity", no_notification)
    monkeypatch.setattr(partner_journey, "_project_legacy_phase", no_projection)
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

    async def render_workbook(_payload):
        return b"%PDF-1.4\n" + (b"approved-workbook\n" * 10)

    monkeypatch.setattr(partner_rewards, "genera_project_book_pdf", render_workbook)
    app = FastAPI()
    app.include_router(editorial_calendar.router)
    app.include_router(partner_journey.router)
    app.include_router(partner_rewards.router)
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
        f"/api/partner/calendar/p1/versions/{calendar_version['version']}/draft",
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
        f"/api/partner/calendar/p1/versions/{calendar_version['version']}/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": calendar_version["checksum"], "calendar": calendar},
    )
    assert response.status_code == 200
    return response.json()


def _submit(client, partner_token, calendar_version, partner_confirmed=True):
    return client.post(
        f"/api/partner/calendar/p1/versions/{calendar_version['version']}/submit",
        headers=_headers(partner_token),
        json={
            "partner_confirmed": partner_confirmed,
            "expected_checksum": calendar_version["checksum"],
        },
    )


def _f14_step(fake_db):
    return next(
        step
        for step in fake_db.partner_journey_steps.docs
        if step.get("step_id") == "11-calendario-30gg"
    )


def _approve_calendar(client, partner_token, admin_token, version=1):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    assert created["version"] == version
    ready = _with_ready_review_resources(client, partner_token, created)
    assert _submit(client, partner_token, ready).status_code == 200
    test_db = editorial_calendar.db
    temporary_f15 = not any(
        step.get("partner_id") == "p1" and step.get("step_id") == "12-prezzo-webinar"
        for step in test_db.partner_journey_steps.docs
    )
    if temporary_f15:
        test_db.partner_journey_steps.docs.append({
            "_id": "temporary-step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "pending",
            "data": {},
        })
    approved = client.post(
        f"/api/partner/calendar/p1/versions/{version}/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": f"Calendario v{version} verificato"},
    )
    test_db.partner_journey_steps.docs[:] = [
        step
        for step in test_db.partner_journey_steps.docs
        if step.get("_id") != "temporary-step-f15" and not step.get("_test_scaffold")
    ]
    assert approved.status_code == 200
    return approved.json()


def _make_workbook_eligible(fake_db):
    existing = {step.get("step_id") for step in fake_db.partner_journey_steps.docs}
    for number, step_id in enumerate((
        "12-prezzo-webinar",
        "16-readiness-lancio",
        "13-lancio",
        "18-certificato-valida",
    ), 15):
        if step_id not in existing:
            fake_db.partner_journey_steps.docs.append({
                "_id": f"step-{number}",
                "partner_id": "p1",
                "step_id": step_id,
                "step_number": number,
                "status": "done",
                "completed_at": f"2026-08-13T{number}:00:00+00:00",
                "data": {"evidence_version": 1},
            })
    if "19-workbook-finale" not in existing:
        fake_db.partner_journey_steps.docs.append({
            "_id": "step-19",
            "partner_id": "p1",
            "step_id": "19-workbook-finale",
            "step_number": 19,
            "status": "in_progress",
            "data": {},
        })


def test_client_calendar_payload_cannot_complete_f14_without_approved_version(
    client, partner_token, fake_db
):
    response = client.post(
        "/api/partner-journey/operativo/complete/p1/11-calendario-30gg",
        headers=_headers(partner_token),
        json={
            "data": {
                "launch_calendar_approved": True,
                "calendar": {"days": [{"day": 1, "theme": "Inventato dal client"}]},
            }
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "launch_calendar_not_approved"
    assert _f14_step(fake_db)["status"] == "in_progress"


@pytest.mark.asyncio
async def test_auto_completion_helper_refuses_done_step_without_approved_db_evidence(fake_db):
    _f14_step(fake_db)["status"] = "done"

    with pytest.raises(HTTPException) as error:
        await partner_journey._complete_approved_launch_calendar_step("p1")

    assert getattr(error.value, "status_code", None) == 409
    assert error.value.detail["code"] == "launch_calendar_not_approved"


def test_positive_review_completes_f14_once_with_db_evidence(
    client, partner_token, admin_token, fake_db
):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    ready = _with_ready_review_resources(client, partner_token, created)
    submitted = _submit(client, partner_token, ready)
    assert submitted.status_code == 200

    payload = {"decision": "approve", "note": "Calendario verificato"}
    approved = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json=payload,
    )

    assert approved.status_code == 200
    step = _f14_step(fake_db)
    assert step["status"] == "done"
    assert step["data"]["calendar_version"] == 1
    assert step["data"]["calendar_checksum"] == approved.json()["checksum"]
    assert step["data"]["approved_at"] == approved.json()["approved_at"]
    completed_at = step["completed_at"]

    retry = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json=payload,
    )

    assert retry.status_code == 200
    assert _f14_step(fake_db)["completed_at"] == completed_at


def test_approved_v2_refreshes_only_f14_evidence_without_advancing_pending_steps(
    client, partner_token, admin_token, fake_db
):
    approved_v1 = _approve_calendar(client, partner_token, admin_token, version=1)
    completed_at = _f14_step(fake_db)["completed_at"]
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "in_progress",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "pending",
            "data": {},
        },
    ])

    approved_v2 = _approve_calendar(client, partner_token, admin_token, version=2)

    step = _f14_step(fake_db)
    assert step["data"]["calendar_version"] == 2
    assert step["data"]["calendar_checksum"] == approved_v2["checksum"]
    assert step["data"]["calendar_checksum"] != approved_v1["checksum"]
    assert step["completed_at"] == completed_at
    statuses = {
        item["step_id"]: item["status"]
        for item in fake_db.partner_journey_steps.docs
        if item.get("step_id") in ("12-prezzo-webinar", "16-readiness-lancio")
    }
    assert statuses == {
        "12-prezzo-webinar": "in_progress",
        "16-readiness-lancio": "pending",
    }


def test_review_retry_recovers_missing_f14_evidence_without_advancing_steps(
    client, partner_token, admin_token, fake_db
):
    approved = _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    completed_at = step["completed_at"]
    step["data"] = {"summary": "dato storico"}
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "in_progress",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "pending",
            "data": {},
        },
    ])

    retry = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "Calendario v1 verificato"},
    )

    assert retry.status_code == 200
    assert step["data"] == {
        "summary": "dato storico",
        "calendar_version": 1,
        "calendar_checksum": approved["checksum"],
        "approved_at": approved["approved_at"],
    }
    assert step["completed_at"] == completed_at
    assert next(item for item in fake_db.partner_journey_steps.docs if item.get("_id") == "step-f15")["status"] == "in_progress"
    assert next(item for item in fake_db.partner_journey_steps.docs if item.get("_id") == "step-f16")["status"] == "pending"


def test_review_retry_recovers_partial_first_completion_without_opening_f16(
    client, partner_token, admin_token, fake_db
):
    approved = _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    completed_at = step["completed_at"]
    step.pop("calendar_completion_effects_applied_at", None)
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "pending",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "pending",
            "data": {},
        },
    ])

    retry = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "Calendario v1 verificato"},
    )

    assert retry.status_code == 200
    assert step["data"]["calendar_checksum"] == approved["checksum"]
    assert step["completed_at"] == completed_at
    assert step["calendar_completion_effects_applied_at"]
    assert next(item for item in fake_db.partner_journey_steps.docs if item.get("_id") == "step-f15")["status"] == "in_progress"
    assert next(item for item in fake_db.partner_journey_steps.docs if item.get("_id") == "step-f16")["status"] == "pending"


def test_approved_v2_recovers_partial_v1_effects_after_refreshing_evidence(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    completed_at = step["completed_at"]
    step.pop("calendar_completion_effects_applied_at", None)
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "pending",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "pending",
            "data": {},
        },
    ])

    approved_v2 = _approve_calendar(client, partner_token, admin_token, version=2)

    assert step["data"]["calendar_version"] == 2
    assert step["data"]["calendar_checksum"] == approved_v2["checksum"]
    assert step["completed_at"] == completed_at
    assert step["calendar_completion_effects_applied_at"]
    assert next(item for item in fake_db.partner_journey_steps.docs if item.get("_id") == "step-f15")["status"] == "in_progress"
    assert next(item for item in fake_db.partner_journey_steps.docs if item.get("_id") == "step-f16")["status"] == "pending"


@pytest.mark.asyncio
async def test_concurrent_first_f14_completion_claim_advances_only_f15(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.update({"status": "in_progress", "data": {}, "completed_at": None})
    step.pop("calendar_completion_effects_applied_at", None)
    step.pop("calendar_completion_claim_id", None)
    step.pop("calendar_completion_claimed_at", None)
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "pending",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "pending",
            "data": {},
        },
    ])

    class BarrierSteps(FakeCollection):
        def __init__(self, docs):
            super().__init__(docs)
            self.initial_reads = 0
            self.two_readers = asyncio.Event()

        async def find_one(self, query, projection=None, sort=None):
            is_initial_f14 = (
                query == {"partner_id": "p1", "step_id": "11-calendario-30gg"}
                and self.initial_reads < 2
            )
            if is_initial_f14:
                result = await super().find_one(query, projection, sort)
                self.initial_reads += 1
                if self.initial_reads == 2:
                    self.two_readers.set()
                await self.two_readers.wait()
                return result
            return await super().find_one(query, projection, sort)

    fake_db.partner_journey_steps = BarrierSteps(fake_db.partner_journey_steps.docs)

    await asyncio.gather(
        partner_journey._complete_approved_launch_calendar_step("p1"),
        partner_journey._complete_approved_launch_calendar_step("p1"),
    )

    statuses = {
        item["step_id"]: item["status"]
        for item in fake_db.partner_journey_steps.docs
        if item.get("step_id") in ("11-calendario-30gg", "12-prezzo-webinar", "16-readiness-lancio")
    }
    assert statuses == {
        "11-calendario-30gg": "done",
        "12-prezzo-webinar": "in_progress",
        "16-readiness-lancio": "pending",
    }


@pytest.mark.asyncio
async def test_f14_completion_arriving_after_claim_cannot_steal_it(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.update({"status": "in_progress", "data": {}, "completed_at": None})
    step.pop("calendar_completion_effects_applied_at", None)
    step.pop("calendar_completion_claim_id", None)
    step.pop("calendar_completion_claimed_at", None)
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "pending",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "pending",
            "data": {},
        },
    ])

    class PausedClaimSteps(FakeCollection):
        def __init__(self, docs):
            super().__init__(docs)
            self.claim_set = asyncio.Event()
            self.release_first = asyncio.Event()
            self.claim_updates = 0

        async def update_one(self, query, update, upsert=False):
            result = await super().update_one(query, update, upsert)
            if update.get("$set", {}).get("calendar_completion_claim_id") and result.matched_count:
                self.claim_updates += 1
                if self.claim_updates == 1:
                    self.claim_set.set()
                    await self.release_first.wait()
            return result

    steps = PausedClaimSteps(fake_db.partner_journey_steps.docs)
    fake_db.partner_journey_steps = steps
    first = asyncio.create_task(
        partner_journey._complete_approved_launch_calendar_step("p1")
    )
    await steps.claim_set.wait()

    second = await partner_journey._complete_approved_launch_calendar_step("p1")
    steps.release_first.set()
    await first

    assert second["completion_in_progress"] is True
    assert steps.claim_updates == 1
    statuses = {
        item["step_id"]: item["status"]
        for item in steps.docs
        if item.get("step_id") in ("12-prezzo-webinar", "16-readiness-lancio")
    }
    assert statuses == {
        "12-prezzo-webinar": "in_progress",
        "16-readiness-lancio": "pending",
    }


@pytest.mark.asyncio
async def test_done_f14_with_active_effects_claim_reports_in_progress(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.update({
        "status": "done",
        "calendar_completion_claim_id": "current-owner",
        "calendar_completion_claimed_at": datetime.now(timezone.utc),
    })
    step.pop("calendar_completion_effects_applied_at", None)

    result = await partner_journey._complete_approved_launch_calendar_step("p1")

    assert result["completion_in_progress"] is True
    assert step["calendar_completion_claim_id"] == "current-owner"


@pytest.mark.asyncio
async def test_failed_f14_claim_is_released_for_retry(
    client, partner_token, admin_token, fake_db, monkeypatch
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.update({"status": "in_progress", "data": {}, "completed_at": None})
    step.pop("calendar_completion_effects_applied_at", None)
    step.pop("calendar_completion_claim_id", None)
    step.pop("calendar_completion_claimed_at", None)
    fake_db.partner_journey_steps.docs.append({
        "_id": "step-f15",
        "partner_id": "p1",
        "step_id": "12-prezzo-webinar",
        "step_number": 15,
        "status": "pending",
        "data": {},
    })
    original = partner_journey._complete_f14_step_fenced

    async def fail_after_claim(*_args, **_kwargs):
        raise RuntimeError("temporary completion failure")

    monkeypatch.setattr(partner_journey, "_complete_f14_step_fenced", fail_after_claim)
    with pytest.raises(RuntimeError, match="temporary completion failure"):
        await partner_journey._complete_approved_launch_calendar_step("p1")

    assert step.get("calendar_completion_claim_id") is None
    monkeypatch.setattr(partner_journey, "_complete_f14_step_fenced", original)
    retried = await partner_journey._complete_approved_launch_calendar_step("p1")
    assert retried["completed_step"] == "11-calendario-30gg"
    assert step["status"] == "done"


@pytest.mark.asyncio
async def test_stale_f14_claim_is_reclaimed_after_lease(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.update({
        "status": "in_progress",
        "data": {},
        "completed_at": None,
        "calendar_completion_claim_id": "crashed-worker",
        "calendar_completion_claimed_at": datetime.now(timezone.utc) - timedelta(minutes=30),
    })
    fake_db.partner_journey_steps.docs.append({
        "_id": "step-f15",
        "partner_id": "p1",
        "step_id": "12-prezzo-webinar",
        "step_number": 15,
        "status": "pending",
        "data": {},
    })

    result = await partner_journey._complete_approved_launch_calendar_step("p1")

    assert result["completed_step"] == "11-calendario-30gg"
    assert step["status"] == "done"
    assert step["calendar_completion_claim_id"] != "crashed-worker"


@pytest.mark.asyncio
async def test_v2_approved_during_v1_claim_is_reconciled_to_latest_evidence(
    client, partner_token, admin_token, fake_db
):
    approved_v1 = _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.update({"status": "in_progress", "data": {}, "completed_at": None})
    step.pop("calendar_completion_effects_applied_at", None)
    step.pop("calendar_completion_claim_id", None)
    step.pop("calendar_completion_claimed_at", None)
    fake_db.partner_journey_steps.docs.append({
        "_id": "step-f15",
        "partner_id": "p1",
        "step_id": "12-prezzo-webinar",
        "step_number": 15,
        "status": "pending",
        "data": {},
    })

    class PausedClaimSteps(FakeCollection):
        def __init__(self, docs):
            super().__init__(docs)
            self.claim_set = asyncio.Event()
            self.release_first = asyncio.Event()

        async def update_one(self, query, update, upsert=False):
            result = await super().update_one(query, update, upsert)
            if (
                "calendar_completion_claim_id" in update.get("$set", {})
                and result.matched_count
                and not self.claim_set.is_set()
            ):
                self.claim_set.set()
                await self.release_first.wait()
            return result

    steps = PausedClaimSteps(fake_db.partner_journey_steps.docs)
    fake_db.partner_journey_steps = steps
    first = asyncio.create_task(partner_journey._complete_approved_launch_calendar_step("p1"))
    await steps.claim_set.wait()

    from services.launch_calendar import calendar_checksum

    v1_document = next(doc for doc in fake_db.versions if doc.get("version") == 1)
    v2_document = deepcopy(v1_document)
    v2_document["version"] = 2
    v2_document["calendar"]["version"] = 2
    v2_document["calendar"]["days"][0]["topic"] = "Output finale v2"
    v2_checksum = calendar_checksum(v2_document["calendar"])
    v2_document["checksum"] = v2_checksum
    v2_document["approved_at"] = "2026-08-13T20:00:00+00:00"
    v2_document["admin_review"]["approved_checksum"] = v2_checksum
    fake_db.versions.append(v2_document)

    second = await partner_journey._complete_approved_launch_calendar_step("p1")
    assert second["completion_in_progress"] is True
    steps.release_first.set()
    await first

    completed = next(doc for doc in steps.docs if doc.get("_id") == "step-f14")
    assert completed["data"]["calendar_version"] == 2
    assert completed["data"]["calendar_checksum"] == v2_checksum
    assert completed["data"]["calendar_checksum"] != approved_v1["checksum"]


@pytest.mark.asyncio
async def test_reclaimed_f14_claim_fences_old_owner_before_any_side_effect(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.update({"status": "in_progress", "data": {}, "completed_at": None})
    step.pop("calendar_completion_effects_applied_at", None)
    step.pop("calendar_completion_claim_id", None)
    step.pop("calendar_completion_claimed_at", None)
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "pending",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "pending",
            "data": {},
        },
    ])

    class ReclaimedClaimSteps(FakeCollection):
        def __init__(self, docs):
            super().__init__(docs)
            self.claim_count = 0
            self.old_claimed = asyncio.Event()
            self.new_claimed = asyncio.Event()
            self.release_old = asyncio.Event()
            self.release_new = asyncio.Event()

        async def update_one(self, query, update, upsert=False):
            result = await super().update_one(query, update, upsert)
            claim_id = update.get("$set", {}).get("calendar_completion_claim_id")
            if claim_id and result.matched_count:
                self.claim_count += 1
                if self.claim_count == 1:
                    self.old_claimed.set()
                    await self.release_old.wait()
                elif self.claim_count == 2:
                    self.new_claimed.set()
                    await self.release_new.wait()
            return result

    steps = ReclaimedClaimSteps(fake_db.partner_journey_steps.docs)
    fake_db.partner_journey_steps = steps
    old_owner = asyncio.create_task(
        partner_journey._complete_approved_launch_calendar_step("p1")
    )
    await steps.old_claimed.wait()
    claimed_step = next(doc for doc in steps.docs if doc.get("_id") == "step-f14")
    claimed_step["calendar_completion_claimed_at"] = (
        datetime.now(timezone.utc) - timedelta(minutes=30)
    )
    new_owner = asyncio.create_task(
        partner_journey._complete_approved_launch_calendar_step("p1")
    )
    await steps.new_claimed.wait()

    steps.release_old.set()
    with pytest.raises(HTTPException) as lost:
        await old_owner
    assert lost.value.detail["code"] == "launch_calendar_completion_claim_lost"
    assert claimed_step["status"] == "in_progress"
    assert next(doc for doc in steps.docs if doc.get("_id") == "step-f15")["status"] == "pending"

    steps.release_new.set()
    await new_owner
    assert claimed_step["status"] == "done"
    assert next(doc for doc in steps.docs if doc.get("_id") == "step-f15")["status"] == "in_progress"
    assert next(doc for doc in steps.docs if doc.get("_id") == "step-f16")["status"] == "pending"


@pytest.mark.asyncio
async def test_partial_f14_recovery_repairs_stale_partner_pointer_before_marker(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.pop("calendar_completion_effects_applied_at", None)
    fake_db.partner_journey_steps.docs.append({
        "_id": "step-f15",
        "partner_id": "p1",
        "step_id": "12-prezzo-webinar",
        "step_number": 15,
        "status": "in_progress",
        "data": {},
    })
    fake_db.partners.docs[0]["journey_current_step"] = "11-calendario-30gg"

    class FailPointerOnce(FakeCollection):
        def __init__(self, docs):
            super().__init__(docs)
            self.failed = False

        async def update_one(self, query, update, upsert=False):
            if update.get("$set", {}).get("journey_current_step") == "12-prezzo-webinar" and not self.failed:
                self.failed = True
                return SimpleNamespace(matched_count=0, modified_count=0)
            return await super().update_one(query, update, upsert)

    fake_db.partners = FailPointerOnce(fake_db.partners.docs)
    with pytest.raises(HTTPException, match="effetti del completamento F-14"):
        await partner_journey._complete_approved_launch_calendar_step("p1")
    assert "calendar_completion_effects_applied_at" not in step

    retried = await partner_journey._complete_approved_launch_calendar_step("p1")
    assert retried["effects_recovered"] is True
    assert fake_db.partners.docs[0]["journey_current_step"] == "12-prezzo-webinar"
    assert step["calendar_completion_effects_applied_at"]


@pytest.mark.asyncio
async def test_partial_f14_recovery_requires_canonical_f15_document(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.pop("calendar_completion_effects_applied_at", None)

    with pytest.raises(HTTPException) as missing:
        await partner_journey._complete_approved_launch_calendar_step("p1")

    assert missing.value.detail["code"] == "launch_calendar_next_step_missing"
    assert "calendar_completion_effects_applied_at" not in step


@pytest.mark.asyncio
async def test_partial_f14_recovery_points_to_advanced_in_progress_step(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.pop("calendar_completion_effects_applied_at", None)
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "done",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "in_progress",
            "data": {},
        },
    ])
    fake_db.partners.docs[0]["journey_current_step"] = "11-calendario-30gg"

    await partner_journey._complete_approved_launch_calendar_step("p1")

    assert fake_db.partners.docs[0]["journey_current_step"] == "16-readiness-lancio"
    assert step["calendar_completion_effects_applied_at"]


@pytest.mark.asyncio
async def test_partial_f14_recovery_never_regresses_pointer_during_race(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    step = _f14_step(fake_db)
    step.pop("calendar_completion_effects_applied_at", None)
    fake_db.partner_journey_steps.docs.extend([
        {
            "_id": "step-f15",
            "partner_id": "p1",
            "step_id": "12-prezzo-webinar",
            "step_number": 15,
            "status": "pending",
            "data": {},
        },
        {
            "_id": "step-f16",
            "partner_id": "p1",
            "step_id": "16-readiness-lancio",
            "step_number": 16,
            "status": "in_progress",
            "data": {},
        },
    ])
    fake_db.partners.docs[0]["journey_current_step"] = "16-readiness-lancio"

    await partner_journey._complete_approved_launch_calendar_step("p1")

    assert fake_db.partners.docs[0]["journey_current_step"] == "16-readiness-lancio"
    assert next(doc for doc in fake_db.partner_journey_steps.docs if doc.get("_id") == "step-f15")["status"] == "pending"
    assert step["calendar_completion_effects_applied_at"]


@pytest.mark.asyncio
async def test_workbook_reads_only_the_approved_calendar_snapshot(
    client, partner_token, admin_token, fake_db
):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    approved_calendar = deepcopy(created["calendar"])
    approved_calendar["days"][0]["theme"] = "Tema approvato e immutabile"
    updated = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": created["checksum"], "calendar": approved_calendar},
    ).json()
    ready = _with_ready_review_resources(client, partner_token, updated)
    assert _submit(client, partner_token, ready).status_code == 200
    assert client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "OK"},
    ).status_code == 200

    _f14_step(fake_db)["data"] = {"summary": "BOZZA INVENTATA DOPO APPROVAZIONE"}
    context = await partner_rewards._load_context("p1")
    calendar_section = next(
        section for section in partner_rewards._project_sections(context)
        if section["title"] == "Calendario di Lancio"
    )

    assert context["launch_calendar_version"] == 1
    assert "Tema approvato e immutabile" in calendar_section["body"]
    assert "BOZZA INVENTATA" not in calendar_section["body"]


def test_legacy_workbook_is_not_served_without_approved_calendar(
    client, partner_token, fake_db
):
    legacy = {
        "document_id": "legacy-workbook",
        "partner_id": "p1",
        "kind": "workbook_final",
        "source_version": "launch-legacy",
        "version": 1,
        "checksum": "legacy-checksum",
        "content": b"%PDF-legacy",
        "created_at": "2026-01-01T00:00:00+00:00",
    }
    fake_db.partner_document_versions.docs.append(deepcopy(legacy))

    response = client.get(
        "/api/partner-rewards/p1/project-book",
        headers=_headers(partner_token),
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "launch_calendar_not_approved"
    assert fake_db.partner_document_versions.docs == [legacy]


def test_workbook_archive_is_append_only_and_bound_to_each_approved_calendar(
    client, partner_token, admin_token, fake_db
):
    fake_db.partner_document_versions.docs.append({
        "document_id": "legacy-workbook",
        "partner_id": "p1",
        "kind": "workbook_final",
        "source_version": "launch-legacy",
        "version": 1,
        "checksum": "legacy-checksum",
        "content": b"%PDF-legacy",
        "created_at": "2026-01-01T00:00:00+00:00",
    })
    approved_v1 = _approve_calendar(client, partner_token, admin_token, version=1)
    _make_workbook_eligible(fake_db)

    first = client.get(
        "/api/partner-rewards/p1/project-book",
        headers=_headers(partner_token),
    )
    retry = client.get(
        "/api/partner-rewards/p1/project-book",
        headers=_headers(partner_token),
    )

    assert first.status_code == retry.status_code == 200
    assert len(fake_db.partner_document_versions.docs) == 2
    workbook_v1 = fake_db.partner_document_versions.docs[1]
    assert workbook_v1["version"] == 2
    assert workbook_v1["provenance"]["calendar_version"] == 1
    assert workbook_v1["provenance"]["calendar_checksum"] == approved_v1["checksum"]
    assert workbook_v1["provenance"]["calendar_approved_at"] == approved_v1["approved_at"]
    assert workbook_v1["provenance"]["journey_source_checksum"]
    assert [item["step_id"] for item in workbook_v1["provenance"]["journey_steps"]] == [
        "12-prezzo-webinar",
        "16-readiness-lancio",
        "13-lancio",
        "18-certificato-valida",
    ]

    approved_v2 = _approve_calendar(client, partner_token, admin_token, version=2)
    second = client.get(
        "/api/partner-rewards/p1/project-book",
        headers=_headers(partner_token),
    )

    assert second.status_code == 200
    assert len(fake_db.partner_document_versions.docs) == 3
    assert [document["version"] for document in fake_db.partner_document_versions.docs] == [1, 2, 3]
    workbook_v2 = fake_db.partner_document_versions.docs[2]
    assert workbook_v2["provenance"]["calendar_version"] == 2
    assert workbook_v2["provenance"]["calendar_checksum"] == approved_v2["checksum"]
    assert workbook_v2["provenance"]["calendar_approved_at"] == approved_v2["approved_at"]
    assert workbook_v2["provenance"]["journey_source_checksum"] == workbook_v1["provenance"]["journey_source_checksum"]
    assert workbook_v1["content"] == workbook_v2["content"]


def test_workbook_download_waits_until_f19_is_eligible(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    _make_workbook_eligible(fake_db)
    f19 = next(
        step for step in fake_db.partner_journey_steps.docs
        if step.get("step_id") == "19-workbook-finale"
    )
    f19["status"] = "pending"

    early = client.get(
        "/api/partner-rewards/p1/project-book",
        headers=_headers(partner_token),
    )

    assert early.status_code == 409
    assert early.json()["detail"]["code"] == "final_workbook_not_ready"
    assert fake_db.partner_document_versions.docs == []

    f19["status"] = "in_progress"
    ready = client.get(
        "/api/partner-rewards/p1/project-book",
        headers=_headers(partner_token),
    )

    assert ready.status_code == 200
    assert len(fake_db.partner_document_versions.docs) == 1


def test_workbook_relevant_journey_evidence_creates_new_append_only_version(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    _make_workbook_eligible(fake_db)
    assert client.get(
        "/api/partner-rewards/p1/project-book", headers=_headers(partner_token)
    ).status_code == 200
    first = deepcopy(fake_db.partner_document_versions.docs[0])

    f15 = next(
        step for step in fake_db.partner_journey_steps.docs
        if step.get("step_id") == "12-prezzo-webinar"
    )
    f15["data"]["strategia"] = "Strategia prezzo V2"
    assert client.get(
        "/api/partner-rewards/p1/project-book", headers=_headers(partner_token)
    ).status_code == 200

    assert len(fake_db.partner_document_versions.docs) == 2
    second = fake_db.partner_document_versions.docs[1]
    assert [first["version"], second["version"]] == [1, 2]
    assert first["source_version"] != second["source_version"]
    assert first["provenance"]["journey_source_checksum"] != second["provenance"]["journey_source_checksum"]


def test_workbook_hub_renderer_input_change_creates_new_version(
    client, partner_token, admin_token, fake_db
):
    _approve_calendar(client, partner_token, admin_token, version=1)
    _make_workbook_eligible(fake_db)
    fake_db.partner_hub.docs.append({
        "partner_id": "p1",
        "whoYouAre": "Identita V1",
    })
    assert client.get(
        "/api/partner-rewards/p1/project-book", headers=_headers(partner_token)
    ).status_code == 200
    first = deepcopy(fake_db.partner_document_versions.docs[0])

    fake_db.partner_hub.docs[0]["whoYouAre"] = "Identita V2"
    assert client.get(
        "/api/partner-rewards/p1/project-book", headers=_headers(partner_token)
    ).status_code == 200

    assert len(fake_db.partner_document_versions.docs) == 2
    second = fake_db.partner_document_versions.docs[1]
    assert [first["version"], second["version"]] == [1, 2]
    assert first["source_version"] != second["source_version"]
    assert first["provenance"]["renderer_source_checksum"] != second["provenance"]["renderer_source_checksum"]


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


def test_admin_can_drain_failed_notification_without_resubmitting(
    client, partner_token, admin_token, fake_db, monkeypatch
):
    async def alert_down(*args, **kwargs):
        raise RuntimeError("in-app alert down")

    monkeypatch.setattr(editorial_calendar, "_write_pending_review_in_app_alert", alert_down)
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)
    submitted = _submit(client, partner_token, created)
    assert submitted.status_code == 200
    recovery = fake_db.partner_launch_calendar_notification_recovery.docs[0]
    assert recovery["status"] == "pending"

    async def alert_ok(partner_id, version, event_key):
        await fake_db.alerts.find_one_and_update(
            {"_id": event_key},
            {"$setOnInsert": {"_id": event_key, "id": event_key, "partner_id": partner_id, "version": version}},
            upsert=True,
        )
        return "best_effort_attempted"

    monkeypatch.setattr(editorial_calendar, "_write_pending_review_in_app_alert", alert_ok)
    drained = client.post(
        "/api/partner/calendar/admin/notification-recovery/drain",
        headers=_headers(admin_token),
        json={"limit": 5},
    )

    assert drained.status_code == 200
    assert drained.json() == {"claimed": 1, "sent": 1, "pending": 0}
    assert recovery["status"] == "sent"
    assert recovery["attempt_count"] == 2
    assert recovery["last_attempt_status"] == "sent"
    assert len(fake_db.alerts.docs) == 1


def test_drain_reconciles_pending_review_after_submit_claim_error(
    client, partner_token, admin_token, fake_db, monkeypatch
):
    """Una failure post-CAS non puo' lasciare una review senza outbox recuperabile."""
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_https_destinations(client, partner_token, created)
    original_claim = editorial_calendar._claim_pending_review_notification

    async def claim_down(*args, **kwargs):
        raise RuntimeError("outbox collection temporarily unavailable")

    monkeypatch.setattr(editorial_calendar, "_claim_pending_review_notification", claim_down)
    with TestClient(client.app, raise_server_exceptions=False) as non_raising_client:
        submitted = _submit(non_raising_client, partner_token, created)

    assert submitted.status_code == 200
    assert fake_db.versions[0]["status"] == "pending_review"
    assert fake_db.partner_launch_calendar_notification_recovery.docs == []

    async def alert_ok(partner_id, version, event_key):
        await fake_db.alerts.find_one_and_update(
            {"_id": event_key},
            {"$setOnInsert": {"_id": event_key, "id": event_key, "partner_id": partner_id, "version": version}},
            upsert=True,
        )
        return "best_effort_attempted"

    monkeypatch.setattr(editorial_calendar, "_claim_pending_review_notification", original_claim)
    monkeypatch.setattr(editorial_calendar, "_write_pending_review_in_app_alert", alert_ok)
    drained = client.post(
        "/api/partner/calendar/admin/notification-recovery/drain",
        headers=_headers(admin_token),
        json={"limit": 5},
    )

    assert drained.status_code == 200
    assert drained.json() == {"claimed": 1, "sent": 1, "pending": 0}
    assert fake_db.partner_launch_calendar_notification_recovery.docs[0]["status"] == "sent"
    assert len(fake_db.alerts.docs) == 1


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
        "https://[fec0::1]/live",
        "https://[2001:db8::1]/live",
        "https://[::]/live",
        "https://[ff02::1]/live",
        "https://224.0.0.1/live",
        "https://localhost./live",
        "https://127.1/live",
        "https://user:pass@www.ciak.io/live",
        "https://intranet/live",
    ],
)
def test_review_destination_rejects_non_public_ip_or_local_hostname(url):
    assert editorial_calendar._is_real_review_destination(url) is False


def test_review_destination_accepts_canonical_public_hostname_without_dns():
    assert editorial_calendar._is_real_review_destination("https://www.ciak.io/live") is True


@pytest.mark.parametrize(
    ("url", "expected_status"),
    [
        ("https://localhost./live", 409),
        ("https://127.1/live", 409),
        ("https://user:pass@www.ciak.io/live", 409),
        ("https://intranet/live", 409),
        ("https://[fec0::1]/live", 409),
        ("https://www.ciak.io/live", 200),
    ],
)
def test_review_endpoint_enforces_canonical_public_destinations(
    client, partner_token, admin_token, url, expected_status
):
    created = client.post(
        "/api/partner/calendar/p1/versions",
        headers=_headers(partner_token),
        json=_generation_payload(),
    ).json()
    created = _with_ready_review_resources(client, partner_token, created)
    if url != "https://www.ciak.io/live":
        calendar = deepcopy(created["calendar"])
        for day in calendar["days"]:
            day["destination_url"] = url
        updated = client.put(
            "/api/partner/calendar/p1/versions/1/draft",
            headers=_headers(partner_token),
            json={"expected_checksum": created["checksum"], "calendar": calendar},
        )
        assert updated.status_code == 200
        created = updated.json()

    assert _submit(client, partner_token, created).status_code == 200
    response = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "Review manuale"},
    )

    assert response.status_code == expected_status
    if expected_status == 409:
        assert "verified_destination_urls" in response.json()["detail"]["failed_checks"]


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
    assert result["total"] == 23


def test_workbook_source_index_is_unique_critical_and_excludes_legacy_documents():
    calls = []

    class IndexCollection:
        async def create_index(self, fields, **options):
            calls.append((fields, options))

    class IndexDb:
        def __getitem__(self, _name):
            return IndexCollection()

    result = asyncio.run(ensure_indexes(IndexDb()))

    assert (
        [
            ("partner_id", 1),
            ("kind", 1),
            ("source_version", 1),
        ],
        {
            "unique": True,
            "name": "partner_document_versions_workbook_source_unique",
            "partialFilterExpression": {
                "provenance.calendar_version": {"$exists": True},
            },
        },
    ) in calls
    assert (
        [("partner_id", 1), ("kind", 1)],
        {
            "unique": True,
            "name": "partner_document_version_counters_partner_kind_unique",
        },
    ) in calls
    assert result["total"] == 23


def test_workbook_unique_index_failure_is_fatal():
    class IndexCollection:
        def __init__(self, name):
            self.name = name

        async def create_index(self, fields, **options):
            if self.name == "partner_document_versions":
                raise RuntimeError("workbook unique index unavailable")

    class IndexDb:
        def __getitem__(self, name):
            return IndexCollection(name)

    with pytest.raises(CriticalIndexError, match="partner_document_versions_workbook_source_unique"):
        asyncio.run(ensure_indexes(IndexDb()))


def test_workbook_index_upgrade_retires_previous_calendar_only_constraint():
    calls = []

    class IndexCollection:
        def __init__(self, name):
            self.name = name

        async def index_information(self):
            if self.name == "partner_document_versions":
                return {"partner_document_versions_workbook_calendar_unique": {}}
            return {}

        async def drop_index(self, name):
            calls.append(("drop", self.name, name))

        async def create_index(self, fields, **options):
            calls.append(("create", self.name, options.get("name")))

    class IndexDb:
        def __getitem__(self, name):
            return IndexCollection(name)

    asyncio.run(ensure_indexes(IndexDb()))

    assert (
        "drop",
        "partner_document_versions",
        "partner_document_versions_workbook_calendar_unique",
    ) in calls
    assert (
        "create",
        "partner_document_versions",
        "partner_document_versions_workbook_source_unique",
    ) in calls
    assert calls.index((
        "drop",
        "partner_document_versions",
        "partner_document_versions_workbook_calendar_unique",
    )) < calls.index((
        "create",
        "partner_document_versions",
        "partner_document_versions_workbook_source_unique",
    ))


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

    assert result == {"ok": 21, "failed": 2, "total": 23}
