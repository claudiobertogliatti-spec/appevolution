import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Caricamento del modulo sotto test
MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "ciak_admin.py"
SPEC = importlib.util.spec_from_file_location("ciak_admin_under_test", MODULE_PATH)
ciak_admin = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(ciak_admin)

pytestmark = pytest.mark.unit


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

    async def insert_one(self, doc):
        stored = dict(doc)
        if "_id" not in stored:
            stored["_id"] = f"mongo-{len(self.docs)+1}"
        self.docs.append(stored)
        return SimpleNamespace(inserted_id=stored["_id"])

    async def update_one(self, query, update, upsert=False):
        set_fields = update.get("$set") or {}
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                doc.update(set_fields)
                return SimpleNamespace(modified_count=1, matched_count=1)
        if upsert:
            new_doc = {**query, **set_fields}
            if "_id" not in new_doc:
                new_doc["_id"] = f"mongo-upsert-{len(self.docs)+1}"
            self.docs.append(new_doc)
            return SimpleNamespace(modified_count=1, matched_count=0, upserted_id=new_doc["_id"])
        return SimpleNamespace(modified_count=0, matched_count=0)


class FakeDb:
    def __init__(self):
        self.ciak_clients = FakeCollection()
        self.diagnostic_sessions = FakeCollection()
        self.payment_transactions = FakeCollection()
        self.payments = FakeCollection()


def dummy_require_admin():
    return {"role": "admin", "email": "admin@ciak.io", "sub": "admin-1"}


@pytest.fixture
def test_client():
    fake_db = FakeDb()
    ciak_admin.set_db(fake_db)

    app = FastAPI()
    app.include_router(ciak_admin.start_admin_router)
    app.dependency_overrides[ciak_admin.require_ciak_admin] = dummy_require_admin

    return TestClient(app), fake_db


def test_activate_ciak_start_new_client(test_client):
    client, fake_db = test_client
    payload = {
        "email": "nuovo@example.com",
        "amount_cents": 49900,
        "paid_at": "2026-07-28T10:00:00+00:00",
        "source": "payment_link",
        "stripe_ref": "cs_test_12345",
    }

    response = client.post("/api/admin/ciak-start/activate", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    assert data["client"]["email"] == "nuovo@example.com"
    assert data["client"]["access_level"] == "cliente_start"
    assert data["client"]["start_credit_amount"] == 49900
    assert data["client"]["start_progress_count"] == 7

    # Verifica nel database fake
    saved_client = next((c for c in fake_db.ciak_clients.docs if c["email"] == "nuovo@example.com"), None)
    assert saved_client is not None
    assert saved_client["start_credit_amount"] == 49900
    assert saved_client["start_purchased_at"] == "2026-07-28T10:00:00+00:00"

    saved_tx = next((tx for tx in fake_db.payment_transactions.docs if tx["session_id"] == "cs_test_12345"), None)
    assert saved_tx is not None
    assert saved_tx["tipo"] == "ciak_start"
    assert saved_tx["amount_cents"] == 49900


def test_activate_ciak_start_idempotent_double_call(test_client):
    client, fake_db = test_client
    payload = {
        "email": "idempotent@example.com",
        "amount_cents": 49900,
        "source": "payment_link",
        "stripe_ref": "cs_test_idem_1",
    }

    # Prima chiamata
    res1 = client.post("/api/admin/ciak-start/activate", json=payload)
    assert res1.status_code == 200

    # Modifichiamo uno step del cliente per simulare progresso
    client_doc = next(c for c in fake_db.ciak_clients.docs if c["email"] == "idempotent@example.com")
    client_doc["start_progress"][0]["status"] = "done"

    # Seconda chiamata per la stessa email
    res2 = client.post("/api/admin/ciak-start/activate", json=payload)
    assert res2.status_code == 200

    # Verifica che il credito non sia stato duplicato né raddoppiato
    client_after = next(c for c in fake_db.ciak_clients.docs if c["email"] == "idempotent@example.com")
    assert client_after["start_credit_amount"] == 49900
    # Verifica che il progresso esistente non sia stato sovrascritto
    assert client_after["start_progress"][0]["status"] == "done"

    # Verifica conteggio clienti nel DB
    matching_clients = [c for c in fake_db.ciak_clients.docs if c["email"] == "idempotent@example.com"]
    assert len(matching_clients) == 1


def test_activate_ciak_start_validation_and_email_creation(test_client):
    client, fake_db = test_client

    # Email vuota solleva errore 400
    res_empty = client.post("/api/admin/ciak-start/activate", json={"email": "   "})
    assert res_empty.status_code == 400

    # Email inesistente senza sessione diagnostica crea automaticamente l'account
    res_no_session = client.post("/api/admin/ciak-start/activate", json={"email": "nosession@example.com"})
    assert res_no_session.status_code == 200
    data = res_no_session.json()
    assert data["client"]["email"] == "nosession@example.com"
    assert data["client"]["access_level"] == "cliente_start"
