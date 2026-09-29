"""
Unit test del servizio di consegna Blueprint (services/ciak_analisi_delivery.py).

Regole:
  - si consegna SOLO il Blueprint salvato (template lockato), mai un documento
    sostitutivo: prima, se il Blueprint falliva, partiva in silenzio un "teaser";
  - un invio fallito solleva ConsegnaFallita con il motivo reale e lo registra;
  - una consegna già fatta non si ripete.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

from services import ciak_analisi_delivery as delivery
from services import ciak_blueprint_store as store
from tests._fake_mongo import FakeDb

pytestmark = pytest.mark.unit

_PAYLOAD = {"meta": {"nome": "Cliente"}, "sezioni": {}}


def _db(blueprint=None):
    return FakeDb(ciak_blueprints=[blueprint] if blueprint else [])


def _pronto(**extra):
    return {"session_token": "t1", "stato": "pronto", "payload": _PAYLOAD, **extra}


@pytest.fixture
def mocks(monkeypatch):
    render = AsyncMock(return_value=b"%PDF-bp")
    monkeypatch.setattr(store.ciak_pdf_blueprint, "genera_blueprint_pdf", render)
    monkeypatch.setattr(delivery, "_upload_pdf", AsyncMock(return_value="https://cdn/bp.pdf"))
    send = MagicMock(return_value=(True, None))
    monkeypatch.setattr(delivery, "_send_email_attachment", send)
    return render, send


@pytest.mark.asyncio
async def test_invia_il_blueprint_salvato_con_link_accesso(monkeypatch, mocks):
    render, send = mocks
    db = _db(_pronto())
    monkeypatch.setattr(delivery, "db", db)

    res = await delivery.consegna_blueprint("t1", "c@x.it", "Cliente", access_link="https://ciak.io/cliente/accesso?token=abc")

    assert res == {"sent": True, "pdf_url": "https://cdn/bp.pdf"}
    render.assert_awaited_once_with(_PAYLOAD)
    kwargs = send.call_args.kwargs
    assert kwargs["to"] == "c@x.it" and kwargs["pdf_bytes"] == b"%PDF-bp"
    assert "token=abc" in kwargs["body_text"]
    assert db.ciak_blueprints.docs[0]["consegna_inviata_at"]
    assert db.ciak_analisi.docs[0]["bozza_inviata_at"]


@pytest.mark.asyncio
async def test_non_consegna_nulla_se_il_blueprint_non_e_pronto(monkeypatch, mocks):
    _render, send = mocks
    monkeypatch.setattr(delivery, "db", _db({"session_token": "t1", "stato": "errore", "errore": "API down"}))
    with pytest.raises(store.BlueprintNonPronto, match="API down"):
        await delivery.consegna_blueprint("t1", "c@x.it", "Cliente")
    send.assert_not_called()


@pytest.mark.asyncio
async def test_email_fallita_solleva_e_registra_il_motivo(monkeypatch, mocks):
    _render, send = mocks
    send.return_value = (False, "SMTP non configurato")
    db = _db(_pronto())
    monkeypatch.setattr(delivery, "db", db)
    with pytest.raises(delivery.ConsegnaFallita, match="SMTP non configurato"):
        await delivery.consegna_blueprint("t1", "c@x.it", "Cliente")
    assert db.ciak_blueprints.docs[0]["consegna_errore"] == "SMTP non configurato"
    assert not db.ciak_blueprints.docs[0].get("consegna_inviata_at")
    assert db.ciak_analisi.docs[0]["bozza_errore"] == "SMTP non configurato"


@pytest.mark.asyncio
async def test_consegna_gia_fatta_non_si_ripete(monkeypatch, mocks):
    _render, send = mocks
    monkeypatch.setattr(delivery, "db", _db(_pronto(consegna_inviata_at="2026-09-29T11:00:00+00:00")))
    res = await delivery.consegna_blueprint("t1", "c@x.it", "Cliente")
    assert res["skipped"] == "gia_inviata"
    send.assert_not_called()


def test_non_esiste_piu_il_ripiego_sul_teaser():
    assert not hasattr(delivery, "_render_deliverable_pdf")
    assert not hasattr(delivery, "processa_acquisto")


def test_email_body_senza_access_link_non_mette_riga_vuota():
    """Retrocompatibile: senza access_link il corpo resta valido (nessun link d'accesso)."""
    body = delivery._email_body("Maria", "https://cdn/x.pdf", None)
    assert "cliente/accesso" not in body
    assert "https://cdn/x.pdf" in body


# ─── Store: una sola generazione, stato leggibile ──────────────────

@pytest.mark.asyncio
async def test_store_generazione_in_corso_non_ne_avvia_una_seconda(monkeypatch):
    from datetime import datetime, timezone

    gen = AsyncMock(return_value=_PAYLOAD)
    monkeypatch.setattr(store.ciak_analisi, "genera_blueprint", gen)
    db = _db({"session_token": "t1", "stato": "in_generazione",
              "avviato_at": datetime.now(timezone.utc).isoformat()})
    out = await store.genera(db, "t1")
    assert out["stato"] == "in_generazione"
    gen.assert_not_awaited()


@pytest.mark.asyncio
async def test_store_generazione_bloccata_da_ore_si_puo_ripartire(monkeypatch):
    gen = AsyncMock(return_value=_PAYLOAD)
    monkeypatch.setattr(store.ciak_analisi, "genera_blueprint", gen)
    monkeypatch.setattr(store.ciak_pdf_blueprint, "render_blueprint_html", MagicMock(return_value="<html>"))
    db = _db({"session_token": "t1", "stato": "in_generazione", "avviato_at": "2026-09-01T09:00:00+00:00"})
    out = await store.genera(db, "t1")
    assert out["stato"] == "pronto"
    gen.assert_awaited_once()


@pytest.mark.asyncio
async def test_store_payload_che_il_template_rifiuta_non_diventa_pronto(monkeypatch):
    monkeypatch.setattr(store.ciak_analisi, "genera_blueprint", AsyncMock(return_value={"meta": {}}))
    monkeypatch.setattr(store.ciak_pdf_blueprint, "render_blueprint_html",
                        MagicMock(side_effect=KeyError("sezioni")))
    db = _db()
    out = await store.genera(db, "t1")
    assert out["stato"] == "errore"
    assert "sezioni" in out["errore"]


def test_store_stato_pubblico_non_espone_il_contenuto():
    out = store.stato_pubblico(_pronto())
    assert out["stato"] == "pronto"
    assert "payload" not in out
    assert store.stato_pubblico(None) == {"stato": "mancante"}
