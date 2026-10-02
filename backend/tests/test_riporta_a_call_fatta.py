"""
Unit test: POST /api/admin/ciak/lead/riporta-a-call-fatta.

Caso reale (Francesco Donati, 29/9/2026): un Ciak Start mai pagato attivato dal
form admin aveva creato account, percorso Start e un incasso finto da €390.
L'azione riporta il lead a "call appena fatta, Blueprint da inviare a mano".
Mongo finto: gira in CI.
"""
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

import routers.ciak_admin as adm
from tests._fake_mongo import FakeDb

pytestmark = pytest.mark.unit

_ADMIN = SimpleNamespace(email="claudio@example.test")


def _db(state="call_done", client_extra=None, pagamento_ref="admin:abc123"):
    client = {
        "id": "c1", "email": "info@doonati.com", "access_level": "cliente_start",
        "start_credit_amount": 39000, "start_purchased_at": "2026-09-29T07:49:13+00:00",
        "start_payments": [{"reference_id": pagamento_ref, "amount_cents": 39000}],
        "events": [{"event": "ciak_start_activated_by_admin", "reference_id": pagamento_ref,
                    "by": "qualcuno@example.test", "timestamp": "2026-09-29T07:49:13+00:00"}],
        **(client_extra or {}),
    }
    return FakeDb(
        diagnostic_sessions=[{"_id": "d1", "session_token": "tok", "user_email": "info@doonati.com",
                              "current_state": state, "events": []}],
        ciak_clients=[client],
        partners=[{"id": "c1", "tier": "start"}],
        users=[{"id": "u1", "partner_id": "c1", "role": "cliente"}],
        partner_journey_steps=[{"partner_id": "c1", "step": "03-brand-kit"}],
        payments=[{"session_id": pagamento_ref, "tipo": "ciak_start", "amount": 390.0},
                  {"session_id": "cs_live_altro", "tipo": "ciak_start", "amount": 390.0}],
        payment_transactions=[{"session_id": pagamento_ref, "tipo": "ciak_start"}],
        ciak_analisi=[{"session_token": "tok", "analisi_definitiva": {"titolo": "x"},
                       "bozza_inviata_at": "2026-09-29T14:31:19+00:00", "deliverable_kind": "blueprint",
                       "bozza": {"intro": "i", "pdf_url": "https://cdn/bp.pdf"}}],
    )


@pytest.mark.asyncio
async def test_caso_donati_torna_a_call_fatta_con_invio_da_fare(monkeypatch):
    db = _db()
    monkeypatch.setattr(adm, "db", db)

    out = await adm.riporta_lead_a_call_fatta(adm.RiportaCallFattaRequest(email="Info@Doonati.com"), admin=_ADMIN)

    assert out["ok"] is True
    # incasso finto tolto, quello vero di un altro cliente no
    assert [p["session_id"] for p in db.payments.docs] == ["cs_live_altro"]
    assert db.payment_transactions.docs == []
    assert out["start_attivato_da"] == ["qualcuno@example.test (2026-09-29T07:49)"]
    # account + ponte + journey eliminati: si ricreano puliti all'invio
    assert db.ciak_clients.docs == [] and db.partners.docs == [] and db.users.docs == []
    assert db.partner_journey_steps.docs == []
    # invio azzerato, contenuto dell'analisi conservato
    analisi = db.ciak_analisi.docs[0]
    assert "bozza_inviata_at" not in analisi and "deliverable_kind" not in analisi
    assert "pdf_url" not in analisi["bozza"] and analisi["analisi_definitiva"] == {"titolo": "x"}
    # il lead resta a call fatta, con traccia dell'operazione
    diag = db.diagnostic_sessions.docs[0]
    assert diag["current_state"] == "call_done"
    assert diag["events"][-1]["event"] == "admin_riportato_a_call_fatta"


@pytest.mark.asyncio
async def test_rifiuta_se_lo_start_risulta_pagato_davvero(monkeypatch):
    db = _db(pagamento_ref="cs_live_pagato")
    monkeypatch.setattr(adm, "db", db)
    with pytest.raises(adm.HTTPException) as exc:
        await adm.riporta_lead_a_call_fatta(adm.RiportaCallFattaRequest(email="info@doonati.com"), admin=_ADMIN)
    assert exc.value.status_code == 409
    assert "cs_live_pagato" in exc.value.detail
    assert len(db.ciak_clients.docs) == 1 and len(db.payments.docs) == 2  # niente toccato


@pytest.mark.asyncio
async def test_rifiuta_se_gia_partner(monkeypatch):
    db = _db(client_extra={"partnership_attiva": True})
    monkeypatch.setattr(adm, "db", db)
    with pytest.raises(adm.HTTPException) as exc:
        await adm.riporta_lead_a_call_fatta(adm.RiportaCallFattaRequest(email="info@doonati.com"), admin=_ADMIN)
    assert exc.value.status_code == 409
    assert len(db.ciak_clients.docs) == 1


@pytest.mark.asyncio
async def test_rifiuta_se_la_call_non_e_fatta(monkeypatch):
    db = _db(state="call_booked")
    monkeypatch.setattr(adm, "db", db)
    with pytest.raises(adm.HTTPException) as exc:
        await adm.riporta_lead_a_call_fatta(adm.RiportaCallFattaRequest(email="info@doonati.com"), admin=_ADMIN)
    assert exc.value.status_code == 409
    assert len(db.ciak_clients.docs) == 1


@pytest.mark.asyncio
async def test_senza_account_cliente_azzera_solo_l_invio(monkeypatch):
    db = _db()
    db.ciak_clients.docs.clear()
    monkeypatch.setattr(adm, "db", db)
    out = await adm.riporta_lead_a_call_fatta(adm.RiportaCallFattaRequest(email="info@doonati.com"), admin=_ADMIN)
    assert out["account_eliminato"] == {}
    assert len(db.payments.docs) == 2  # senza account non si tocca nessun incasso
    assert "bozza_inviata_at" not in db.ciak_analisi.docs[0]


# ─── Annulla Start non pagato, TENENDO il cliente (link già inviato valido) ───

@pytest.mark.asyncio
async def test_annulla_start_tiene_il_cliente_e_toglie_start_e_incasso(monkeypatch):
    db = _db()
    db.ciak_client_login_tokens.docs.append({"client_id": "c1", "token_hash": "h"})
    monkeypatch.setattr(adm, "db", db)

    out = await adm.annulla_start_non_pagato("c1", adm.AnnullaStartRequest(email="INFO@doonati.com"), admin=_ADMIN)

    assert out["ok"] is True
    client = db.ciak_clients.docs[0]
    assert client["access_level"] == "cliente_blueprint"
    assert client["start_credit_amount"] == 0
    assert "start_purchased_at" not in client and "start_payments" not in client
    assert client["events"][-1]["event"] == "ciak_start_annullato_non_pagato"
    # link d'accesso già inviato: resta valido
    assert db.ciak_client_login_tokens.docs
    # incasso finto e ponte partner tolti, l'incasso vero di altri no
    assert [p["session_id"] for p in db.payments.docs] == ["cs_live_altro"]
    assert db.partners.docs == [] and db.users.docs == [] and db.partner_journey_steps.docs == []
    # la consegna del Blueprint non si tocca
    assert db.ciak_analisi.docs[0]["bozza_inviata_at"]
    assert out["start_attivato_da"] == ["qualcuno@example.test (2026-09-29T07:49)"]


@pytest.mark.asyncio
async def test_annulla_start_rifiuta_pagamento_vero(monkeypatch):
    db = _db(pagamento_ref="cs_live_pagato")
    monkeypatch.setattr(adm, "db", db)
    with pytest.raises(adm.HTTPException) as exc:
        await adm.annulla_start_non_pagato("c1", adm.AnnullaStartRequest(email="info@doonati.com"), admin=_ADMIN)
    assert exc.value.status_code == 409
    assert db.ciak_clients.docs[0]["access_level"] == "cliente_start"


@pytest.mark.asyncio
async def test_annulla_start_rifiuta_email_diversa(monkeypatch):
    db = _db()
    monkeypatch.setattr(adm, "db", db)
    with pytest.raises(adm.HTTPException) as exc:
        await adm.annulla_start_non_pagato("c1", adm.AnnullaStartRequest(email="altro@example.test"), admin=_ADMIN)
    assert exc.value.status_code == 400
    assert db.ciak_clients.docs[0]["access_level"] == "cliente_start"


@pytest.mark.asyncio
async def test_un_collaudo_con_riferimento_collaudo_si_annulla_e_toglie_il_suo_incasso(monkeypatch):
    """Un collaudo dà a mano un riferimento `collaudo-…` (non `admin:…`): non è un
    pagamento vero. Prima veniva rifiutato come 'reale' e, eliminando il cliente,
    l'incasso di prova restava per sempre nei registri."""
    db = _db(pagamento_ref="collaudo-20261001-b")
    monkeypatch.setattr(adm, "db", db)
    out = await adm.annulla_start_non_pagato("c1", adm.AnnullaStartRequest(email="info@doonati.com"), admin=_ADMIN)
    assert out["ok"] is True
    assert "collaudo-20261001-b" not in [p["session_id"] for p in db.payments.docs]
    assert db.ciak_clients.docs[0]["access_level"] == "cliente_blueprint"


@pytest.mark.asyncio
@pytest.mark.parametrize("vero", ["cs_live_x", "plink_1UJbFSKjIoAIM4LDkJjNYyLS", "pi_3ABC", "bonifico-12345", "collaudo"])
async def test_i_riferimenti_veri_restano_intoccabili(monkeypatch, vero):
    db = _db(pagamento_ref=vero)
    monkeypatch.setattr(adm, "db", db)
    with pytest.raises(adm.HTTPException) as exc:
        await adm.annulla_start_non_pagato("c1", adm.AnnullaStartRequest(email="info@doonati.com"), admin=_ADMIN)
    assert exc.value.status_code == 409


# ─── Link d'accesso da mandare a mano (nessuna mail) ──────────────────────────

@pytest.mark.asyncio
async def test_link_accesso_si_genera_senza_inviare_nulla_e_funziona(monkeypatch):
    from services.ciak_client_accounts import verify_magic_login_token

    db = _db()
    monkeypatch.setattr(adm, "db", db)
    monkeypatch.setenv("CIAK_BASE_URL", "https://www.ciak.io")
    out = await adm.link_accesso_cliente("c1", adm.LinkAccessoRequest(email=" INFO@doonati.com "), admin=_ADMIN)

    assert out["ok"] is True
    assert out["link"].startswith("https://www.ciak.io/cliente/accesso?token=")
    token = out["link"].split("token=")[1]
    # Nel database c'e' solo l'impronta del token, mai il token.
    assert [t for t in db.ciak_client_login_tokens.docs if t.get("token_hash") == token] == []
    # Il link apre davvero il cliente giusto.
    cliente = await verify_magic_login_token(db, token)
    assert cliente["id"] == "c1"
    # 30 giorni, come i link delle mail.
    scade = datetime.fromisoformat(out["scade_il"].replace("Z", "+00:00"))
    assert 29 <= (scade - datetime.now(timezone.utc)).days <= 30


@pytest.mark.asyncio
async def test_link_accesso_lascia_il_cliente_com_e_e_traccia_solo_chi_e_quando(monkeypatch):
    db = _db()
    prima = {k: v for k, v in db.ciak_clients.docs[0].items() if k != "events"}
    monkeypatch.setattr(adm, "db", db)
    out = await adm.link_accesso_cliente("c1", adm.LinkAccessoRequest(email="info@doonati.com"), admin=_ADMIN)
    cliente = db.ciak_clients.docs[0]
    assert {k: v for k, v in cliente.items() if k != "events"} == prima  # nessun dato toccato
    ultimo = cliente["events"][-1]
    assert ultimo["event"] == "link_accesso_generato_da_admin" and ultimo["by"] == "claudio@example.test"
    # Il link non finisce mai negli eventi.
    assert out["link"].split("token=")[1] not in str(cliente["events"])


@pytest.mark.asyncio
async def test_link_accesso_rifiuta_email_diversa_e_cliente_inesistente(monkeypatch):
    db = _db()
    monkeypatch.setattr(adm, "db", db)
    with pytest.raises(adm.HTTPException) as e1:
        await adm.link_accesso_cliente("c1", adm.LinkAccessoRequest(email="altro@example.test"), admin=_ADMIN)
    assert e1.value.status_code == 400
    with pytest.raises(adm.HTTPException) as e2:
        await adm.link_accesso_cliente("nessuno", adm.LinkAccessoRequest(email="info@doonati.com"), admin=_ADMIN)
    assert e2.value.status_code == 404
    assert db.ciak_client_login_tokens.docs == []  # nessun token creato in nessuno dei due casi
