import importlib.util
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "ciak_clients.py"
SPEC = importlib.util.spec_from_file_location("ciak_clients_under_test", MODULE_PATH)
ciak_clients = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(ciak_clients)

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                data = dict(doc)
                if projection and projection.get("_id") == 0:
                    data.pop("_id", None)
                return data
        return None

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                for key, value in update.get("$set", {}).items():
                    doc[key] = value
                for key in update.get("$unset", {}):
                    doc.pop(key, None)
                return type("Result", (), {"matched_count": 1, "modified_count": 1})()
        return type("Result", (), {"matched_count": 0, "modified_count": 0})()

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("Result", (), {"inserted_id": doc.get("id")})()


class FakeDb:
    def __init__(self):
        self.ciak_clients = FakeCollection(
            [
                {
                    "id": "client-1",
                    "email": "a@example.com",
                    "access_level": "cliente_start",
                    "session_token": "token-1",
                    "blueprint_score": 42,
                    "recommended_offer": "ciak_start",
                    "start_credit_amount": 49900,
                    "analysis_status": "inviata",
                    "analysis_title": "Analisi",
                }
            ]
        )
        self.ciak_analisi = FakeCollection(
            [
                {
                    "session_token": "token-1",
                    "stato": "inviata",
                    "analisi_definitiva": {"titolo": "Analisi", "roadmap": []},
                    "script_call": {"internal": True},
                }
            ]
        )
        self.diagnostic_sessions = FakeCollection(
            [{"session_token": "token-1", "current_state": "call_done"}]
        )
        self.ciak_client_login_tokens = FakeCollection()


@pytest.fixture
def fake_db():
    return FakeDb()


@pytest.fixture
def client_app(fake_db):
    app = FastAPI()
    ciak_clients.set_db(fake_db)
    app.include_router(ciak_clients.router)
    with TestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_dashboard_payload_contains_credit_and_analysis(fake_db):
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_start",
            "session_token": "token-1",
            "blueprint_score": 42,
            "recommended_offer": "ciak_start",
            "start_credit_amount": 49900,
        }
    )

    assert payload["client"]["access_level"] == "cliente_start"
    assert payload["pricing"]["partnership"]["due_amount_cents"] == 229100
    assert payload["analysis"]["status"] == "inviata"
    assert "script_call" not in payload["analysis"]
    assert payload["partner_area"]["available"] is False


@pytest.mark.asyncio
async def test_dashboard_retains_start_credit_for_promoted_partner(fake_db):
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "partner",
            "session_token": "token-1",
            "blueprint_score": 42,
            "recommended_offer": "partnership",
            "start_credit_amount": 49900,
        }
    )

    assert payload["start"]["credit_amount_cents"] == 49900
    assert payload["pricing"]["partnership"]["credit_amount_cents"] == 49900
    assert payload["pricing"]["partnership"]["due_amount_cents"] == 229100


@pytest.mark.asyncio
async def test_dashboard_unlocks_partner_area_from_canonical_activation_fields(fake_db):
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_blueprint",
            "session_token": "token-1",
            "stato_cliente": "partner_attivo",
            "partnership_attiva": True,
        }
    )

    assert payload["partner_area"]["available"] is True
    assert payload["partner_area"]["status"] == "attiva"


@pytest.mark.asyncio
async def test_dashboard_keeps_start_clients_locked_without_activation(fake_db):
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_start",
            "session_token": "token-1",
            "start_credit_amount": 49900,
            "partnership_attiva": False,
            "stato_cliente": "cliente_start",
        }
    )

    assert payload["partner_area"]["available"] is False
    assert payload["partner_area"]["status"] == "in_attesa_attivazione"


def test_magic_login_returns_token_and_client(monkeypatch, client_app, fake_db):
    async def fake_verify_magic_login_token(db, token):
        assert db is fake_db
        assert token == "magic-token"
        return fake_db.ciak_clients.docs[0]

    monkeypatch.setattr(ciak_clients, "verify_magic_login_token", fake_verify_magic_login_token)

    response = client_app.post(
        "/api/ciak/client/auth/magic-login",
        json={"token": "magic-token"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token"]
    assert body["client"]["id"] == "client-1"
    assert body["client"]["access_level"] == "cliente_start"


def test_me_and_dashboard_accept_issued_client_token(monkeypatch, client_app, fake_db):
    async def fake_verify_magic_login_token(db, token):
        assert db is fake_db
        assert token == "magic-token"
        return fake_db.ciak_clients.docs[0]

    monkeypatch.setattr(ciak_clients, "verify_magic_login_token", fake_verify_magic_login_token)

    login_response = client_app.post(
        "/api/ciak/client/auth/magic-login",
        json={"token": "magic-token"},
    )
    assert login_response.status_code == 200

    auth_header = {"Authorization": f"Bearer {login_response.json()['token']}"}

    me_response = client_app.get("/api/ciak/client/me", headers=auth_header)
    dashboard_response = client_app.get("/api/ciak/client/dashboard", headers=auth_header)

    assert me_response.status_code == 200
    assert me_response.json()["client"]["email"] == "a@example.com"
    assert "session_token" not in me_response.json()["client"]

    assert dashboard_response.status_code == 200
    body = dashboard_response.json()
    assert body["analysis"]["title"] == "Analisi"
    assert body["pricing"]["partnership"]["credit_amount_cents"] == 49900
    assert body["partner_area"]["status"] == "in_attesa_attivazione"
