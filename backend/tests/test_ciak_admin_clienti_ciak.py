import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "ciak_admin.py"
SPEC = importlib.util.spec_from_file_location("ciak_admin_under_test", MODULE_PATH)
ciak_admin = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(ciak_admin)

pytestmark = pytest.mark.unit


class FakeCursor:
    def __init__(self, docs):
        self.docs = [dict(doc) for doc in docs]
        self._limit = None

    def sort(self, field, direction):
        reverse = direction == -1
        self.docs.sort(key=lambda doc: doc.get(field) or "", reverse=reverse)
        return self

    def limit(self, value):
        self._limit = value
        return self

    async def to_list(self, length):
        size = self._limit if self._limit is not None else length
        return [dict(doc) for doc in self.docs[:size]]


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                row = dict(doc)
                if projection and projection.get("_id") == 0:
                    row.pop("_id", None)
                return row
        return None

    def find(self, query=None, projection=None):
        query = query or {}
        items = []
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                row = dict(doc)
                if projection and projection.get("_id") == 0:
                    row.pop("_id", None)
                items.append(row)
        return FakeCursor(items)


class FakeDb:
    def __init__(self):
        self.ciak_clients = FakeCollection(
            [
                {
                    "_id": "mongo-1",
                    "id": "client-1",
                    "email": "uno@example.com",
                    "name": "Cliente Uno",
                    "access_level": "cliente_blueprint",
                    "blueprint_score": 42,
                    "recommended_offer": "ciak_start",
                    "offer_decision": "ciak_start",
                    "start_credit_amount": 0,
                    "start_purchased_at": None,
                    "start_progress": [],
                    "analysis_status": "inviata",
                    "created_at": "2026-05-30T09:00:00+00:00",
                    "updated_at": "2026-06-01T09:00:00+00:00",
                    "session_token": "secret-token-1",
                    "diagnostic_responses": [{"step": 1, "answer": "secret"}],
                    "diagnostic_report": {"raw": "big report"},
                    "diagnostic_tracking": {"events": ["hidden"]},
                    "raw_analysis": {"large": True},
                    "magic_token": "magic-1",
                    "analysis_publicly_available": True,
                },
                {
                    "_id": "mongo-2",
                    "id": "client-2",
                    "email": "due@example.com",
                    "name": "Cliente Due",
                    "access_level": "cliente_start",
                    "blueprint_score": 75,
                    "recommended_offer": "partnership",
                    "offer_decision": "partnership",
                    "start_credit_amount": 279000,
                    "start_purchased_at": "2026-06-20T12:00:00+00:00",
                    "start_progress": [{"step": "done"}],
                    "analysis_status": "inviata",
                    "created_at": "2026-06-20T09:00:00+00:00",
                    "updated_at": "2026-07-01T10:00:00+00:00",
                    "session_token": "secret-token-2",
                    "diagnostic_responses": [{"step": 2, "answer": "secret"}],
                    "diagnostic_report": {"raw": "bigger report"},
                    "diagnostic_tracking": {"events": ["hidden", "again"]},
                    "raw_analysis": {"large": True},
                    "magic_token": "magic-2",
                    "stato_cliente": "partner_attivo",
                    "partnership_attiva": True,
                },
                {
                    "_id": "mongo-3",
                    "id": "client-3",
                    "email": "tre@example.com",
                    "name": "Cliente Tre",
                    "access_level": "partner",
                    "blueprint_score": 18,
                    "recommended_offer": "partnership",
                    "offer_decision": "partnership",
                    "start_credit_amount": None,
                    "start_purchased_at": None,
                    "start_progress": [],
                    "analysis_status": "bozza",
                    "created_at": "2026-05-01T08:00:00+00:00",
                    "updated_at": "2026-05-01T08:00:00+00:00",
                    "session_token": "secret-token-3",
                    "diagnostic_responses": [{"step": 3, "answer": "secret"}],
                    "diagnostic_report": {"raw": "report"},
                    "diagnostic_tracking": {"events": []},
                    "raw_analysis": {"large": True},
                    "magic_token": "magic-3",
                    "stato_cliente": "partner_attivo",
                },
            ]
        )
        self.users = FakeCollection(
            [
                {
                    "id": "user-1",
                    "email": "uno@example.com",
                    "partnership_attiva": True,
                    "stato_cliente": "partner_attivo",
                }
            ]
        )


@pytest.fixture
def client_app():
    app = FastAPI()
    ciak_admin.set_db(FakeDb())
    app.dependency_overrides[ciak_admin.require_ciak_admin] = lambda: SimpleNamespace(
        role="admin",
        email="admin@example.com",
    )
    app.include_router(ciak_admin.router)
    with TestClient(app) as client:
        yield client


def test_clienti_ciak_lists_clients_sorted_by_updated_at(client_app):
    response = client_app.get("/api/admin/ciak/clienti-ciak")

    assert response.status_code == 200
    body = response.json()

    assert body["count"] == 3
    assert [item["id"] for item in body["items"]] == ["client-2", "client-1", "client-3"]
    assert all("_id" not in item for item in body["items"])
    assert all("session_token" not in item for item in body["items"])
    assert all("diagnostic_responses" not in item for item in body["items"])
    assert all("diagnostic_report" not in item for item in body["items"])
    assert all("diagnostic_tracking" not in item for item in body["items"])
    assert all("raw_analysis" not in item for item in body["items"])
    assert all("magic_token" not in item for item in body["items"])
    assert all("analysis_publicly_available" not in item for item in body["items"])


def test_clienti_ciak_respects_limit(client_app):
    response = client_app.get("/api/admin/ciak/clienti-ciak?limit=2")

    assert response.status_code == 200
    body = response.json()

    assert body["count"] == 2
    assert [item["id"] for item in body["items"]] == ["client-2", "client-1"]
    assert all("session_token" not in item for item in body["items"])


def test_clienti_ciak_overlays_partner_state_from_canonical_user(client_app):
    response = client_app.get("/api/admin/ciak/clienti-ciak")

    assert response.status_code == 200
    items = {item["id"]: item for item in response.json()["items"]}

    assert items["client-1"]["access_level"] == "partner"
    assert items["client-1"]["partnership_attiva"] is True
    assert items["client-1"]["stato_cliente"] == "partner_attivo"
    assert items["client-1"]["start_credit_amount"] == 0


def test_clienti_ciak_omits_stale_partner_flags_without_canonical_user(client_app):
    response = client_app.get("/api/admin/ciak/clienti-ciak")

    assert response.status_code == 200
    items = {item["id"]: item for item in response.json()["items"]}

    assert items["client-2"]["access_level"] == "cliente_start"
    assert "partnership_attiva" not in items["client-2"]
    assert "stato_cliente" not in items["client-2"]
