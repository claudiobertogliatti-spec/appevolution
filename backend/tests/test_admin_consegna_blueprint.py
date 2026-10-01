"""
Unit test: Blueprint salvato + consegna innescata dall'admin.

Flusso (29/9/2026):
  1. POST /admin/blueprint/genera  → Claude genera il contenuto UNA volta, salvato.
  2. GET  /admin/blueprint-pdf     → impagina quel contenuto (template lockato),
                                     nessuna chiamata AI, nessun effetto.
  3. POST /admin/consegna-blueprint → invia QUEL PDF al cliente, crea l'account,
                                     poi (solo se l'invio riesce) porta a call_done.

Mongo, Claude, impaginazione, SMTP e magic-link sono finti: gira in CI.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.ciak_clients as cc
from tests._fake_mongo import FakeDb

pytestmark = pytest.mark.unit

_HEADERS = {"X-Internal-Key": "internal-secret"}
_PAYLOAD = {"meta": {"nome": "Lead Test"}, "sezioni": {"sintesi": {"title": "x"}}}


def _db(state="call_booked", blueprint=None):
    db = FakeDb(
        diagnostic_sessions=[{
            "_id": "oid-1", "session_token": "tok-consegna",
            "user_email": "Lead@Ciak.it", "user_name": "Lead Test",
            "current_state": state, "created_at": "2026-09-29T09:00:00+00:00",
            "responses": {"q1_competenza": "coaching"},
        }],
        ciak_blueprints=[blueprint] if blueprint else [],
        # l'account che ensure_client_for_blueprint (finto) "crea"
        ciak_clients=[{"id": "c1", "email": "lead@ciak.it"}],
    )
    return db


def _pronto(**extra):
    return {"session_token": "tok-consegna", "stato": "pronto", "payload": _PAYLOAD,
            "generato_at": "2026-09-29T10:00:00+00:00", **extra}


@pytest.fixture
def app_factory(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "internal-secret")

    def _make(db):
        cc.set_db(db)
        app = FastAPI()
        app.include_router(cc.router)
        return TestClient(app)

    return _make


def _account_mocks(magic_ok=True):
    ensure = AsyncMock(return_value={"id": "c1", "email": "lead@ciak.it", "name": "Lead Test"})
    magic = (AsyncMock(return_value={"token": "tk", "expires_at": "2026-12-31"}) if magic_ok
             else AsyncMock(side_effect=RuntimeError("token svc down")))
    return (
        patch("services.ciak_client_accounts.ensure_client_for_blueprint", ensure),
        patch("services.ciak_client_accounts.create_magic_login_token", magic),
    )


def _delivery_mocks(email_ok=True):
    return (
        patch("services.ciak_pdf_blueprint.genera_blueprint_pdf", AsyncMock(return_value=b"%PDF-salvato")),
        patch("services.ciak_analisi_delivery._upload_pdf", AsyncMock(return_value="https://cdn/bp.pdf")),
        patch("services.ciak_analisi_delivery._send_email_attachment",
              MagicMock(return_value=(True, None) if email_ok else (False, "SMTP 535 auth failed"))),
        patch("services.ciak_analisi_delivery.completa_analisi_cliente", AsyncMock()),
        patch("services.ciak_systeme.fire_and_forget", lambda coro: coro.close()),
    )


def _enter(stack, patches):
    return [stack.enter_context(p) for p in patches]


# ─── Genera ─────────────────────────────────────────────────────────

def test_genera_salva_il_blueprint_e_non_tocca_il_lead(app_factory):
    db = _db()
    client = app_factory(db)
    with patch("services.ciak_analisi.genera_blueprint", AsyncMock(return_value=_PAYLOAD)) as gen, \
            patch("services.ciak_pdf_blueprint.render_blueprint_html", MagicMock(return_value="<html>")):
        resp = client.post("/api/ciak/client/admin/blueprint/genera",
                           json={"email": "lead@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["stato"] == "pronto"
    gen.assert_awaited_once_with("tok-consegna")
    saved = db.ciak_blueprints.docs[0]
    assert saved["payload"] == _PAYLOAD
    # nessun effetto sul lead
    assert db.diagnostic_sessions.docs[0]["current_state"] == "call_booked"


def test_genera_non_rigenera_se_gia_pronto_salvo_force(app_factory):
    db = _db(blueprint=_pronto())
    client = app_factory(db)
    with patch("services.ciak_analisi.genera_blueprint", AsyncMock(return_value=_PAYLOAD)) as gen, \
            patch("services.ciak_pdf_blueprint.render_blueprint_html", MagicMock(return_value="<html>")):
        client.post("/api/ciak/client/admin/blueprint/genera",
                    json={"email": "lead@ciak.it"}, headers=_HEADERS)
        gen.assert_not_awaited()
        client.post("/api/ciak/client/admin/blueprint/genera",
                    json={"email": "lead@ciak.it", "force": True}, headers=_HEADERS)
        gen.assert_awaited_once()


def test_genera_fallita_salva_il_motivo_reale(app_factory):
    db = _db()
    client = app_factory(db)
    with patch("services.ciak_analisi.genera_blueprint",
               AsyncMock(side_effect=RuntimeError("sezioni mancanti: ['mercato']"))):
        resp = client.post("/api/ciak/client/admin/blueprint/genera",
                           json={"email": "lead@ciak.it"}, headers=_HEADERS)
    body = resp.json()
    assert body["stato"] == "errore"
    assert "sezioni mancanti" in body["errore"]
    stato = client.get("/api/ciak/client/admin/blueprint/stato",
                       params={"email": "lead@ciak.it"}, headers=_HEADERS).json()
    assert stato["stato"] == "errore"


def test_genera_richiede_auth(app_factory):
    client = app_factory(_db())
    resp = client.post("/api/ciak/client/admin/blueprint/genera", json={"email": "lead@ciak.it"})
    assert resp.status_code == 401


# ─── PDF ────────────────────────────────────────────────────────────

def test_pdf_impagina_il_blueprint_salvato_senza_chiamare_claude(app_factory):
    db = _db(blueprint=_pronto())
    client = app_factory(db)
    with patch("services.ciak_analisi.genera_blueprint", AsyncMock()) as gen, \
            patch("services.ciak_pdf_blueprint.genera_blueprint_pdf",
                  AsyncMock(return_value=b"%PDF-salvato")) as render:
        resp = client.get("/api/ciak/client/admin/blueprint-pdf",
                          params={"email": "lead@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 200
    assert resp.content == b"%PDF-salvato"
    gen.assert_not_awaited()
    render.assert_awaited_once_with(_PAYLOAD)
    assert db.diagnostic_sessions.docs[0]["current_state"] == "call_booked"


def test_pdf_409_se_non_ancora_generato(app_factory):
    client = app_factory(_db())
    resp = client.get("/api/ciak/client/admin/blueprint-pdf",
                      params={"email": "lead@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 409
    assert "Genera Blueprint" in resp.json()["detail"]


def test_pdf_richiede_auth(app_factory):
    client = app_factory(_db())
    resp = client.get("/api/ciak/client/admin/blueprint-pdf", params={"email": "lead@ciak.it"})
    assert resp.status_code == 401


def test_pdf_404_se_lead_inesistente(app_factory):
    client = app_factory(_db())
    resp = client.get("/api/ciak/client/admin/blueprint-pdf",
                      params={"session_token": "non-esiste"}, headers=_HEADERS)
    assert resp.status_code == 404


# ─── Consegna ───────────────────────────────────────────────────────

def test_consegna_invia_il_pdf_salvato_e_porta_a_call_done(app_factory):
    from contextlib import ExitStack

    db = _db(blueprint=_pronto())
    client = app_factory(db)
    with ExitStack() as stack:
        _enter(stack, _account_mocks())
        render, _up, send, completa, _ff = _enter(stack, _delivery_mocks())
        resp = client.post("/api/ciak/client/admin/consegna-blueprint",
                           json={"email": "lead@ciak.it"}, headers=_HEADERS)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True and body["blueprint_inviato"] is True
    assert "token=tk" in body["magic_link"]
    # il PDF inviato è l'impaginazione del Blueprint salvato
    render.assert_awaited_once_with(_PAYLOAD)
    sent = send.call_args.kwargs
    assert sent["pdf_bytes"] == b"%PDF-salvato"
    assert "token=tk" in sent["body_text"]
    # esito registrato per scheda lead e per area cliente / consegne mancate
    assert db.ciak_blueprints.docs[0]["consegna_inviata_at"]
    analisi = db.ciak_analisi.docs[0]
    assert analisi["bozza_inviata_at"] and analisi["deliverable_kind"] == "blueprint"
    # stato del lead avanzato solo dopo l'invio, bonus 48h avviato
    assert db.diagnostic_sessions.docs[0]["current_state"] == "call_done"
    assert db.ciak_clients.docs[0]["bonus_expires_at"]
    completa.assert_awaited_once_with("tok-consegna")


def test_consegna_409_se_blueprint_non_generato_e_nulla_cambia(app_factory):
    from contextlib import ExitStack

    db = _db()
    client = app_factory(db)
    with ExitStack() as stack:
        ensure, _magic = _enter(stack, _account_mocks())
        _render, _up, send, _c, _ff = _enter(stack, _delivery_mocks())
        resp = client.post("/api/ciak/client/admin/consegna-blueprint",
                           json={"email": "lead@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 409
    ensure.assert_not_awaited()
    send.assert_not_called()
    assert db.diagnostic_sessions.docs[0]["current_state"] == "call_booked"


def test_consegna_502_se_email_fallisce_e_lo_stato_non_avanza(app_factory):
    """Niente più consegna "riuscita" a vuoto: se l'email non parte l'admin vede
    il motivo, il lead non diventa call_done, il bonus 48h non parte."""
    from contextlib import ExitStack

    db = _db(blueprint=_pronto())
    client = app_factory(db)
    with ExitStack() as stack:
        _enter(stack, _account_mocks())
        _enter(stack, _delivery_mocks(email_ok=False))
        resp = client.post("/api/ciak/client/admin/consegna-blueprint",
                           json={"email": "lead@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 502
    assert "SMTP 535" in resp.json()["detail"]
    assert db.diagnostic_sessions.docs[0]["current_state"] == "call_booked"
    assert db.ciak_blueprints.docs[0]["consegna_errore"] == "SMTP 535 auth failed"
    assert db.ciak_analisi.docs[0]["bozza_errore"] == "SMTP 535 auth failed"
    assert not db.ciak_clients.docs[0].get("bonus_expires_at")  # nessun bonus avviato


def test_consegna_non_reinvia_se_gia_inviato(app_factory):
    from contextlib import ExitStack

    db = _db(blueprint=_pronto(consegna_inviata_at="2026-09-29T11:00:00+00:00"))
    client = app_factory(db)
    with ExitStack() as stack:
        _enter(stack, _account_mocks())
        _r, _u, send, _c, _ff = _enter(stack, _delivery_mocks())
        resp = client.post("/api/ciak/client/admin/consegna-blueprint",
                           json={"email": "lead@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["gia_inviato"] is True
    send.assert_not_called()


def test_consegna_parte_anche_se_magic_link_fallisce(app_factory):
    from contextlib import ExitStack

    db = _db(blueprint=_pronto())
    client = app_factory(db)
    with ExitStack() as stack:
        _enter(stack, _account_mocks(magic_ok=False))
        _r, _u, send, _c, _ff = _enter(stack, _delivery_mocks())
        resp = client.post("/api/ciak/client/admin/consegna-blueprint",
                           json={"email": "lead@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["magic_link"] is None
    send.assert_called_once()


def test_consegna_richiede_auth(app_factory):
    client = app_factory(_db())
    resp = client.post("/api/ciak/client/admin/consegna-blueprint", json={"email": "lead@ciak.it"})
    assert resp.status_code == 401


def test_consegna_404_se_lead_inesistente(app_factory):
    client = app_factory(_db())
    resp = client.post("/api/ciak/client/admin/consegna-blueprint",
                       json={"session_token": "non-esiste"}, headers=_HEADERS)
    assert resp.status_code == 404


# ─── Sessione giusta: quella con le risposte ────────────────────────

def test_genera_usa_la_sessione_compilata_non_quella_vuota_piu_recente(app_factory):
    """Chi riapre il questionario crea una sessione nuova e vuota: il Blueprint
    non deve essere generato (e il lead portato a call_done) su quella."""
    db = _db()
    db.diagnostic_sessions.docs.insert(0, {
        "_id": "oid-0", "session_token": "tok-vuota", "user_email": "Lead@Ciak.it",
        "current_state": "ciak_started", "created_at": "2026-10-01T08:33:00+00:00",
    })
    client = app_factory(db)
    with patch("services.ciak_analisi.genera_blueprint", AsyncMock(return_value=_PAYLOAD)) as gen, \
            patch("services.ciak_pdf_blueprint.render_blueprint_html", MagicMock(return_value="<html>")):
        resp = client.post("/api/ciak/client/admin/blueprint/genera",
                           json={"email": "lead@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 200
    gen.assert_awaited_once_with("tok-consegna")  # la compilata, non "tok-vuota"


def test_genera_409_se_il_questionario_non_e_compilato(app_factory):
    db = FakeDb(
        diagnostic_sessions=[{
            "_id": "oid-0", "session_token": "tok-vuota", "user_email": "x@ciak.it",
            "current_state": "ciak_started", "created_at": "2026-10-01T08:33:00+00:00",
        }],
        ciak_blueprints=[], ciak_clients=[],
    )
    client = app_factory(db)
    with patch("services.ciak_analisi.genera_blueprint", AsyncMock(return_value=_PAYLOAD)) as gen:
        resp = client.post("/api/ciak/client/admin/blueprint/genera",
                           json={"email": "x@ciak.it"}, headers=_HEADERS)
    assert resp.status_code == 409
    assert "questionario" in resp.json()["detail"].lower()
    gen.assert_not_awaited()


def test_genera_e_consegna_non_partono_su_una_sessione_con_risposte_nulle(app_factory):
    """Un dizionario di risposte tutte nulle e' un questionario vuoto: 409, nessun
    Blueprint, nessuna email al cliente (era il caso Anna Maria Bernard)."""
    db = FakeDb(
        diagnostic_sessions=[{
            "_id": "oid-0", "session_token": "tok-nulla", "user_email": "x@ciak.it",
            "current_state": "ciak_started", "created_at": "2026-10-01T08:33:00+00:00",
            "responses": {f"q{i}": None for i in range(10)},
        }],
        ciak_blueprints=[], ciak_clients=[],
    )
    client = app_factory(db)
    with patch("services.ciak_analisi.genera_blueprint", AsyncMock(return_value=_PAYLOAD)) as gen:
        r1 = client.post("/api/ciak/client/admin/blueprint/genera", json={"email": "x@ciak.it"}, headers=_HEADERS)
        r2 = client.post("/api/ciak/client/admin/consegna-blueprint", json={"email": "x@ciak.it"}, headers=_HEADERS)
    assert r1.status_code == 409 and r2.status_code == 409
    gen.assert_not_awaited()
