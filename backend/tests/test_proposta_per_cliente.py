"""La proposta Partnership che il cliente apre dalla sua area (contratto e pagamento).

Regole che questi test bloccano:
- serve la call fatta (stessa condizione dell'admin);
- se c'e' una proposta attiva, si riusa: mai due proposte attive;
- se ne esisteva una e' scaduta, NON se ne crea un'altra: la scadenza e' reale e la riapre il team;
- chi ha firmato o pagato non e' mai "scaduto" a data passata.
"""
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi import HTTPException

from tests.test_proposta_security import FakeCollection

MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "proposta.py"
SPEC = importlib.util.spec_from_file_location("proposta_per_cliente_under_test", MODULE_PATH)
proposta = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(proposta)

pytestmark = pytest.mark.unit

EMAIL = "maria.rossi@example.com"
ADMIN = {"id": "client-1", "email": EMAIL}


class Db:
    def __init__(self, call_done=True, proposte=None):
        self.ciak_clients = FakeCollection([{
            "id": "client-1", "email": EMAIL, "name": "Maria Rossi", "session_token": "sess-1",
        }])
        self.users = FakeCollection([])
        self.partners = FakeCollection([])
        self.diagnostic_sessions = FakeCollection([{
            "session_token": "sess-1", "current_state": "call_done" if call_done else "call_booked",
        }])
        self.ciak_analisi = FakeCollection([])
        self.proposte = FakeCollection(proposte or [])


@pytest.fixture(autouse=True)
def _silenzia_telegram(monkeypatch):
    async def _no(_msg):
        return None

    monkeypatch.setattr(proposta, "_notify_telegram", _no)


def _scad(giorni):
    return (datetime.now(timezone.utc) + timedelta(days=giorni)).isoformat()


@pytest.mark.asyncio
async def test_senza_proposta_se_ne_crea_una_con_scadenza_reale(monkeypatch):
    db = Db()
    monkeypatch.setattr(proposta, "db", db)

    res = await proposta.proposta_per_cliente(EMAIL, ADMIN)

    assert res["creata"] is True
    assert res["token"]
    assert len(db.proposte.docs) == 1
    salvata = db.proposte.docs[0]
    assert salvata["prospect_email"] == EMAIL
    assert salvata["ciak_client_id"] == "client-1"
    # la scadenza e' quella standard: parte da adesso, non da una data inventata
    giorni = (datetime.fromisoformat(salvata["scadenza"]) - datetime.now(timezone.utc)).days
    assert giorni in (proposta.SCADENZA_GIORNI - 1, proposta.SCADENZA_GIORNI)
    assert res["partner_id"] == salvata["partner_id"]


@pytest.mark.asyncio
async def test_chiamata_ripetuta_riusa_la_stessa_proposta(monkeypatch):
    db = Db()
    monkeypatch.setattr(proposta, "db", db)

    prima = await proposta.proposta_per_cliente(EMAIL, ADMIN)
    seconda = await proposta.proposta_per_cliente(EMAIL, ADMIN)

    assert prima["token"] == seconda["token"]
    assert seconda["creata"] is False
    assert len(db.proposte.docs) == 1


@pytest.mark.asyncio
async def test_senza_la_call_fatta_non_si_crea_nulla(monkeypatch):
    db = Db(call_done=False)
    monkeypatch.setattr(proposta, "db", db)

    with pytest.raises(HTTPException) as exc:
        await proposta.proposta_per_cliente(EMAIL, ADMIN)

    assert exc.value.status_code == 409
    assert db.proposte.docs == []


@pytest.mark.asyncio
async def test_proposta_scaduta_non_viene_ricreata(monkeypatch):
    vecchia = {"token": "t-vecchio", "partner_id": "p", "prospect_email": EMAIL,
               "stato": "inviata", "scadenza": _scad(-3)}
    db = Db(proposte=[vecchia])
    monkeypatch.setattr(proposta, "db", db)

    with pytest.raises(HTTPException) as exc:
        await proposta.proposta_per_cliente(EMAIL, ADMIN)

    assert exc.value.status_code == 410
    assert len(db.proposte.docs) == 1  # niente seconda proposta: la scadenza e' reale


@pytest.mark.asyncio
async def test_proposta_gia_marcata_scaduta_non_viene_ricreata(monkeypatch):
    db = Db(proposte=[{"token": "t", "prospect_email": EMAIL, "stato": "scaduta", "scadenza": _scad(-30)}])
    monkeypatch.setattr(proposta, "db", db)

    with pytest.raises(HTTPException) as exc:
        await proposta.proposta_per_cliente(EMAIL, ADMIN)

    assert exc.value.status_code == 410
    assert len(db.proposte.docs) == 1


@pytest.mark.asyncio
async def test_email_con_maiuscole_trova_la_stessa_proposta(monkeypatch):
    db = Db()
    monkeypatch.setattr(proposta, "db", db)
    prima = await proposta.proposta_per_cliente(EMAIL, ADMIN)
    seconda = await proposta.proposta_per_cliente("  MARIA.Rossi@Example.COM ", ADMIN)
    assert prima["token"] == seconda["token"]
    assert len(db.proposte.docs) == 1


@pytest.mark.asyncio
async def test_email_vuota_e_rifiutata(monkeypatch):
    monkeypatch.setattr(proposta, "db", Db())
    with pytest.raises(HTTPException) as exc:
        await proposta.proposta_per_cliente("  ", ADMIN)
    assert exc.value.status_code == 422


def test_scadenza_regola_unica_come_nella_lettura_pubblica():
    ora = datetime.now(timezone.utc)
    assert proposta._proposta_scaduta({"stato": "inviata", "scadenza": _scad(-1)}, ora) is True
    assert proposta._proposta_scaduta({"stato": "inviata", "scadenza": _scad(1)}, ora) is False
    assert proposta._proposta_scaduta({"stato": "scaduta", "scadenza": _scad(10)}, ora) is True
    # chi ha firmato o pagato non e' scaduto, nemmeno a data passata
    assert proposta._proposta_scaduta({"stato": "contratto_firmato", "scadenza": _scad(-9)}, ora) is False
    assert proposta._proposta_scaduta({"stato": "pagamento_completato", "scadenza": _scad(-9)}, ora) is False
    # data illeggibile: non si inventa una scadenza
    assert proposta._proposta_scaduta({"stato": "inviata", "scadenza": "boh"}, ora) is False
