"""Prerequisiti di stato prima di aprire il checkout Partnership.

`pagamento_stripe` non controllava ne' lo stato ne' la scadenza della proposta:
si poteva aprire un checkout da EUR 2.790 su una proposta mai firmata o gia'
scaduta. Il blocco arrivava solo dopo, in `finalize_partnership_payment`
("Contratto firmato mancante", 409) — cioe' a pagamento gia' incassato, con il
webhook che restituiva errore e Stripe che ritentava per giorni.

L'ordine corretto lo imponeva solo la UI (Proposta.jsx mostra lo step pagamento
soltanto se `contratto_firmato_at`): una guardia client-side non e' una guardia.
"""
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from tests.test_proposta_security import FakeCollection


MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "proposta.py"
SPEC = importlib.util.spec_from_file_location("proposta_gate_under_test", MODULE_PATH)
proposta = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(proposta)

pytestmark = pytest.mark.unit


def _iso(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


class GateDb:
    def __init__(self, proposta_doc):
        self.proposte = FakeCollection([proposta_doc])


def _request():
    return SimpleNamespace(base_url="https://www.ciak.io/")


def _proposta_doc(**overrides):
    doc = {
        "token": "tok-gate",
        "partner_id": "user-1",
        "prospect_email": "mario@example.com",
        "prospect_nome": "Mario Bianchi",
        "stato": "accettata",
        "accettato_at": _iso(-1),
        "contratto_firmato_at": _iso(-1),
        "scadenza": _iso(5),
        "contract_params": {"corrispettivo": 2790},
    }
    doc.update(overrides)
    return doc


@pytest.mark.asyncio
async def test_checkout_refused_without_signature(monkeypatch):
    monkeypatch.setattr(proposta, "db", GateDb(_proposta_doc(contratto_firmato_at=None)))

    with pytest.raises(HTTPException) as err:
        await proposta.pagamento_stripe("tok-gate", _request())

    assert err.value.status_code == 409


@pytest.mark.asyncio
async def test_checkout_refused_when_expired(monkeypatch):
    monkeypatch.setattr(
        proposta, "db", GateDb(_proposta_doc(scadenza=_iso(-1)))
    )

    with pytest.raises(HTTPException) as err:
        await proposta.pagamento_stripe("tok-gate", _request())

    assert err.value.status_code == 410


@pytest.mark.asyncio
async def test_checkout_refused_when_already_paid(monkeypatch):
    """Niente secondo addebito su una proposta gia' saldata."""
    monkeypatch.setattr(
        proposta, "db", GateDb(_proposta_doc(pagamento_completato=True))
    )

    with pytest.raises(HTTPException) as err:
        await proposta.pagamento_stripe("tok-gate", _request())

    assert err.value.status_code == 409


@pytest.mark.asyncio
async def test_signed_and_valid_proposal_reaches_stripe(monkeypatch):
    """Il percorso legittimo non deve essere bloccato dalla guardia.

    Si ferma alla configurazione Stripe assente (500): prova che i controlli di
    stato sono stati superati e che il flusso e' arrivato all'integrazione.
    """
    monkeypatch.setattr(proposta, "db", GateDb(_proposta_doc()))
    monkeypatch.delenv("STRIPE_API_KEY", raising=False)

    with pytest.raises(HTTPException) as err:
        await proposta.pagamento_stripe("tok-gate", _request())

    assert err.value.status_code == 500
    assert "Stripe" in str(err.value.detail)
