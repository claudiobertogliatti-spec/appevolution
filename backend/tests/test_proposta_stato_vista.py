"""Il primo GET pubblico della proposta non deve riportare indietro lo stato.

`get_proposta` metteva `stato = "vista"` al primo accesso a prescindere: su una proposta gia'
accettata, firmata o pagata la faceva tornare indietro. La firmata tornata "vista" perde la
protezione dalla scadenza (`_proposta_scaduta` e il controllo in `get_proposta` guardano lo
stato), cosi' una proposta firmata e non ancora pagata, con la data passata, diventava
"scaduta" e dava 410. Visto nel collaudo del 4/10/2026 sull'account di prova.
"""
from unittest.mock import AsyncMock

import pytest

from tests.test_proposta_chat import TOKEN, _db, _proposta, proposta

pytestmark = pytest.mark.unit


def _prepara(monkeypatch, **over):
    proposta.db = _db(proposta=_proposta(visto_at=None, **over))
    monkeypatch.setattr(proposta, "_notify_telegram", AsyncMock())


@pytest.mark.asyncio
async def test_il_primo_get_su_una_proposta_inviata_la_segna_vista(monkeypatch):
    _prepara(monkeypatch, stato="inviata")
    out = await proposta.get_proposta(TOKEN)
    assert out["stato"] == "vista" and out["visto_at"]
    doc = proposta.db.proposte.docs[0]
    assert doc["stato"] == "vista" and doc["visto_at"]
    proposta._notify_telegram.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("stato", ["accettata", "contratto_firmato", "pagamento_completato"])
async def test_il_primo_get_non_riporta_indietro_una_proposta_gia_avanzata(monkeypatch, stato):
    _prepara(monkeypatch, stato=stato)
    out = await proposta.get_proposta(TOKEN)
    assert out["stato"] == stato
    doc = proposta.db.proposte.docs[0]
    assert doc["stato"] == stato          # lo stato nel database non e' stato toccato
    assert doc["visto_at"]                # ma la prima visualizzazione e' registrata


@pytest.mark.asyncio
async def test_una_proposta_firmata_con_data_passata_non_diventa_scaduta_alla_seconda_lettura(monkeypatch):
    """La conseguenza reale: prima del fix la seconda lettura dava 410 e la marcava 'scaduta'."""
    _prepara(monkeypatch, stato="contratto_firmato", scadenza="2000-01-01T00:00:00+00:00")
    primo = await proposta.get_proposta(TOKEN)
    secondo = await proposta.get_proposta(TOKEN)
    assert primo["stato"] == secondo["stato"] == "contratto_firmato"
    assert proposta.db.proposte.docs[0]["stato"] == "contratto_firmato"


@pytest.mark.asyncio
async def test_la_notifica_parte_solo_alla_prima_visualizzazione(monkeypatch):
    _prepara(monkeypatch, stato="inviata")
    await proposta.get_proposta(TOKEN)
    await proposta.get_proposta(TOKEN)
    assert proposta._notify_telegram.await_count == 1
