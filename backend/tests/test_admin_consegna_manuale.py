"""
Unit test: consegna MANUALE di un Blueprint per un cliente fuori-funnel.

Per i lead che non passano dalle 8 domande (es. ProVideo outbound) l'admin fornisce
email + nome + un PDF gia' pronto. L'endpoint deve: creare una diagnostic session a
`call_done` (sblocca offerte + gate checkout), creare l'account cliente, generare il
magic-link e inviare l'email col PDF allegato + link alla sales page — SENZA generare
l'analisi Carlo.

Tutte le dipendenze (ciak_clients, magic-link, upload, email SMTP) sono mockate: gira in CI.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.ciak_clients as cc

pytestmark = pytest.mark.unit

_PDF = b"%PDF-1.4\n%mock linda blueprint\n"


class _FakeDiagnostics:
    def __init__(self):
        self.inserted = []

    async def insert_one(self, doc):
        self.inserted.append(doc)
        return SimpleNamespace(inserted_id=doc.get("session_token"))


class _EndpointDb:
    def __init__(self):
        self.diagnostic_sessions = _FakeDiagnostics()
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


def _patches(send_result=(True, None)):
    return [
        patch("services.ciak_client_accounts.ensure_client_for_blueprint",
              AsyncMock(return_value={"id": "cli-linda", "email": "linda.pavia@hotmail.it", "name": "Linda Pavia"})),
        patch("services.ciak_client_accounts.create_magic_login_token",
              AsyncMock(return_value={"token": "mtok", "expires_at": "2026-12-31"})),
        patch("services.ciak_analisi_delivery.set_db", MagicMock()),
        patch("services.ciak_analisi_delivery._upload_pdf",
              AsyncMock(return_value="https://cdn.example/blueprint.pdf")),
        patch("services.ciak_analisi_delivery._send_email_attachment",
              MagicMock(return_value=send_result)),
    ]


def _post(client, *, email="linda.pavia@hotmail.it", nome="Linda Pavia", pdf=_PDF):
    return client.post(
        "/api/ciak/client/admin/consegna-manuale",
        headers={"X-Internal-Key": "internal-secret"},
        data={"email": email, "nome": nome},
        files={"file": ("blueprint.pdf", pdf, "application/pdf")},
    )


def test_consegna_manuale_crea_cliente_call_done_e_invia_pdf(admin_app):
    client, db = admin_app
    ps = _patches()
    for p in ps:
        p.start()
    try:
        resp = _post(client)
    finally:
        for p in reversed(ps):
            p.stop()

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True and body["email_sent"] is True
    assert body["client_id"] == "cli-linda"
    assert "token=mtok" in body["magic_link"]
    # la diagnostic session e' stata creata a call_done
    assert len(db.diagnostic_sessions.inserted) == 1
    sess = db.diagnostic_sessions.inserted[0]
    assert sess["current_state"] == "call_done"
    assert sess["user_email"] == "linda.pavia@hotmail.it"
    assert sess["source"] == "manual_delivery"


def test_consegna_manuale_invia_email_col_pdf_giusto(admin_app):
    client, _db = admin_app
    ps = _patches()
    sender = ps[4]
    for p in ps:
        p.start()
    try:
        _post(client)
        mock_send = sender.new  # il MagicMock passato a patch
        assert mock_send.called
        kwargs = mock_send.call_args.kwargs
        assert kwargs["to"] == "linda.pavia@hotmail.it"
        assert kwargs["pdf_bytes"].startswith(b"%PDF")
        # il corpo email contiene il link alla sales page (magic-link)
        assert "token=mtok" in kwargs["body_text"]
    finally:
        for p in reversed(ps):
            p.stop()


def test_consegna_manuale_rifiuta_pdf_non_valido(admin_app):
    client, _db = admin_app
    ps = _patches()
    for p in ps:
        p.start()
    try:
        resp = _post(client, pdf=b"questo non e' un pdf")
    finally:
        for p in reversed(ps):
            p.stop()
    assert resp.status_code == 422


def test_consegna_manuale_richiede_auth(admin_app):
    client, _db = admin_app
    resp = client.post(
        "/api/ciak/client/admin/consegna-manuale",
        data={"email": "linda.pavia@hotmail.it", "nome": "Linda Pavia"},
        files={"file": ("blueprint.pdf", _PDF, "application/pdf")},
    )
    assert resp.status_code == 401


def test_consegna_manuale_segnala_email_fallita(admin_app):
    """Se SMTP fallisce, l'account e il magic-link esistono ma success=False."""
    client, db = admin_app
    ps = _patches(send_result=(False, "SMTP non configurato"))
    for p in ps:
        p.start()
    try:
        resp = _post(client)
    finally:
        for p in reversed(ps):
            p.stop()
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is False and body["email_sent"] is False
    assert body["email_error"] == "SMTP non configurato"
    assert body["client_id"] == "cli-linda"  # account creato comunque
    # la sessione call_done e' stata comunque creata
    assert db.diagnostic_sessions.inserted[0]["current_state"] == "call_done"
