"""
Unit test: consegna del Blueprint GRATUITO innescata dall'admin.

Nel modello gratuito il lead fa le 8 domande + la call; poi e' l'ADMIN a confermare
di aver fatto la call di consegna (POST /api/ciak/client/admin/consegna-blueprint).
Quella conferma — non il webhook Cal.com — crea/aggiorna l'account cliente, avvia in
background la generazione + consegna dell'analisi Carlo (il "blueprint") col magic-link
e porta il lead a `call_done`, sbloccando le offerte.

Tutte le dipendenze (ciak_clients, magic-link, delivery) sono mockate: gira in CI.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.ciak_clients as cc

pytestmark = pytest.mark.unit


class _BG:
    """Fake BackgroundTasks: registra i task schedulati."""

    def __init__(self):
        self.tasks = []

    def add_task(self, func, **kwargs):
        self.tasks.append((func, kwargs))


def _fake_db():
    db = MagicMock()
    db.ciak_clients.update_one = AsyncMock()
    return db


_DIAG = {
    "session_token": "tok-consegna",
    "user_email": "lead@ciak.it",
    "user_name": "Lead Test",
    "current_state": "call_done",
}


# ─── Helper _deliver_blueprint ───────────────────────────────────────

@pytest.mark.asyncio
async def test_deliver_crea_account_e_avvia_analisi(monkeypatch):
    monkeypatch.setattr(cc, "db", _fake_db())
    bg = _BG()
    with patch("services.ciak_client_accounts.ensure_client_for_blueprint",
               AsyncMock(return_value={"id": "c1", "email": "lead@ciak.it", "name": "Lead Test"})) as ensure, \
            patch("services.ciak_client_accounts.create_magic_login_token",
                  AsyncMock(return_value={"token": "tk", "expires_at": "2026-12-31"})), \
            patch("services.ciak_analisi_delivery.set_db", MagicMock()):
        summary = await cc._deliver_blueprint(dict(_DIAG), bg)

    ensure.assert_awaited_once()
    # l'analisi Carlo (processa_acquisto) e' stata schedulata per il session_token giusto
    assert len(bg.tasks) == 1
    func, kwargs = bg.tasks[0]
    assert getattr(func, "__name__", "") == "processa_acquisto"
    assert kwargs["session_token"] == "tok-consegna"
    assert kwargs["email"] == "lead@ciak.it"
    # magic-link persistito sul cliente e restituito nel riepilogo
    cc.db.ciak_clients.update_one.assert_awaited()
    assert summary["client_id"] == "c1"
    assert summary["magic_link"] and "token=tk" in summary["magic_link"]


@pytest.mark.asyncio
async def test_deliver_avvia_analisi_anche_se_magic_link_fallisce(monkeypatch):
    """Il magic-link e' secondario: se fallisce, l'analisi Carlo parte comunque."""
    monkeypatch.setattr(cc, "db", _fake_db())
    bg = _BG()
    with patch("services.ciak_client_accounts.ensure_client_for_blueprint",
               AsyncMock(return_value={"id": "c1", "email": "lead@ciak.it", "name": "Lead Test"})), \
            patch("services.ciak_client_accounts.create_magic_login_token",
                  AsyncMock(side_effect=RuntimeError("token svc down"))), \
            patch("services.ciak_analisi_delivery.set_db", MagicMock()):
        summary = await cc._deliver_blueprint(dict(_DIAG), bg)
    assert len(bg.tasks) == 1
    assert bg.tasks[0][1]["session_token"] == "tok-consegna"
    assert summary["magic_link"] is None


# ─── Endpoint admin /admin/consegna-blueprint ────────────────────────

class _FakeDiagnostics:
    def __init__(self, docs):
        self.docs = docs
        self.replaced = []

    async def find_one(self, query):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return d
        return None

    async def replace_one(self, flt, doc):
        self.replaced.append(doc)
        return SimpleNamespace(matched_count=1, modified_count=1)


class _EndpointDb:
    def __init__(self, state="call_booked"):
        self.diagnostic_sessions = _FakeDiagnostics([
            {"_id": "oid-1", "session_token": "tok-consegna",
             "user_email": "lead@ciak.it", "user_name": "Lead Test",
             "current_state": state},
        ])
        self.ciak_clients = MagicMock()
        self.ciak_clients.update_one = AsyncMock()


@pytest.fixture
def admin_app(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "internal-secret")
    db = _EndpointDb()
    cc.set_db(db)
    app = FastAPI()
    app.include_router(cc.router)
    with TestClient(app) as client:
        yield client, db


def test_consegna_endpoint_porta_a_call_done_e_consegna(admin_app):
    client, db = admin_app
    with patch("services.ciak_client_accounts.ensure_client_for_blueprint",
               AsyncMock(return_value={"id": "c1", "email": "lead@ciak.it", "name": "Lead Test"})), \
            patch("services.ciak_client_accounts.create_magic_login_token",
                  AsyncMock(return_value={"token": "tk", "expires_at": "2026-12-31"})), \
            patch("services.ciak_analisi_delivery.set_db", MagicMock()), \
            patch("services.ciak_analisi_delivery.processa_acquisto", AsyncMock()):
        resp = client.post(
            "/api/ciak/client/admin/consegna-blueprint",
            json={"session_token": "tok-consegna"},
            headers={"X-Internal-Key": "internal-secret"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["client_id"] == "c1"
    # lo stato e' stato portato a call_done e persistito
    assert db.diagnostic_sessions.docs[0]["current_state"] == "call_done"
    assert db.diagnostic_sessions.replaced


def test_consegna_endpoint_richiede_auth(admin_app):
    client, _db = admin_app
    resp = client.post(
        "/api/ciak/client/admin/consegna-blueprint",
        json={"session_token": "tok-consegna"},
    )
    assert resp.status_code == 401


def test_consegna_endpoint_404_se_lead_inesistente(admin_app):
    client, _db = admin_app
    resp = client.post(
        "/api/ciak/client/admin/consegna-blueprint",
        json={"session_token": "non-esiste"},
        headers={"X-Internal-Key": "internal-secret"},
    )
    assert resp.status_code == 404
