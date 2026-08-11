"""Finalizzazione Partnership sotto concorrenza webhook / ritorno browser.

Dopo il pagamento arrivano DUE chiamate quasi simultanee:
  1. il webhook Stripe (`gestisci_pagamento_partnership`)
  2. il redirect del browser (`POST /{token}/conferma-stripe`)

Il webhook ha un lock per evento (`stripe_webhook_events`), la conferma dal
browser non ne ha nessuno. `finalize_partnership_payment` leggeva lo stato degli
effetti dal documento ricevuto dal chiamante, non con una lettura atomica:
se entrambe leggevano prima che l'altra scrivesse, entrambe eseguivano tutti
gli effetti.

L'effetto peggiore e' su `account`: `_activate_partner_account_and_notify`
genera un `partner_setup_token` nuovo e sovrascrive il precedente. Il primo
link — quello gia' partito via Systeme verso il cliente — muore. Il partner
paga EUR 2.790 e clicca un link non valido.
"""
import asyncio
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from tests.test_proposta_security import FakeCollection


MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "proposta.py"
SPEC = importlib.util.spec_from_file_location("proposta_race_under_test", MODULE_PATH)
proposta = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(proposta)

pytestmark = pytest.mark.unit


class RaceDb:
    def __init__(self, doc):
        self.proposte = FakeCollection([doc])
        self.users = FakeCollection([{"id": "user-1", "email": "mario@example.com"}])
        self.partners = FakeCollection([])
        self.partnership_payment_audit = FakeCollection([])


def _doc():
    return {
        "token": "tok-race",
        "partner_id": "user-1",
        "prospect_email": "mario@example.com",
        "prospect_nome": "Mario Bianchi",
        "contratto_firmato_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "stato": "contratto_firmato",
        "contract_params": {"corrispettivo": 2790},
    }


@pytest.fixture
def counted_effects(monkeypatch):
    """Sostituisce gli effetti con contatori che cedono il controllo all'event loop.

    Gli `await asyncio.sleep(0)` creano il punto di interleaving che in
    produzione e' dato dall'I/O verso Mongo, Systeme e Telegram.
    """
    calls = {"account": 0, "journey": 0, "tags": 0, "notification": 0}

    async def _count(name):
        calls[name] += 1
        await asyncio.sleep(0)
        await asyncio.sleep(0)

    async def account(partner_id, email, nome):
        await _count("account")

    async def journey(partner_id, **kwargs):
        await _count("journey")

    async def tags(email):
        await _count("tags")

    async def notify(message):
        await _count("notification")

    monkeypatch.setattr(proposta, "_activate_partner_account_and_notify", account)
    monkeypatch.setattr(proposta, "_seed_operativo_journey_from_funnel", journey)
    monkeypatch.setattr(proposta, "_finalization_tags", tags)
    monkeypatch.setattr(proposta, "_notify_telegram", notify)
    return calls


@pytest.mark.asyncio
async def test_concurrent_finalizations_run_each_effect_once(monkeypatch, counted_effects):
    """Webhook e browser insieme: ogni effetto una volta sola."""
    db = RaceDb(_doc())
    monkeypatch.setattr(proposta, "db", db)
    doc_for_webhook = await db.proposte.find_one({"token": "tok-race"})
    doc_for_browser = await db.proposte.find_one({"token": "tok-race"})

    await asyncio.gather(
        proposta.finalize_partnership_payment(
            doc_for_webhook, method="stripe", reference="cs_1",
            actor={"type": "stripe_webhook"},
        ),
        proposta.finalize_partnership_payment(
            doc_for_browser, method="stripe", reference="cs_1",
            actor={"type": "frontend_confirmation"},
        ),
        return_exceptions=True,
    )

    assert counted_effects["account"] == 1, (
        "due magic link generati: il primo, gia' spedito al cliente, e' morto"
    )
    assert counted_effects["journey"] == 1
    assert counted_effects["tags"] == 1


@pytest.mark.asyncio
async def test_sequential_retry_does_not_repeat_completed_effects(monkeypatch, counted_effects):
    """Il retry di Stripe non deve rieseguire cio' che era gia' riuscito."""
    db = RaceDb(_doc())
    monkeypatch.setattr(proposta, "db", db)

    first = await db.proposte.find_one({"token": "tok-race"})
    await proposta.finalize_partnership_payment(
        first, method="stripe", reference="cs_1", actor={"type": "stripe_webhook"}
    )
    second = await db.proposte.find_one({"token": "tok-race"})
    await proposta.finalize_partnership_payment(
        second, method="stripe", reference="cs_1", actor={"type": "stripe_webhook"}
    )

    assert counted_effects["account"] == 1
    assert counted_effects["journey"] == 1


@pytest.mark.asyncio
async def test_failed_effect_is_retried_on_next_call(monkeypatch):
    """Un effetto fallito non resta bloccato: la chiamata successiva lo riprende."""
    db = RaceDb(_doc())
    monkeypatch.setattr(proposta, "db", db)
    attempts = {"n": 0}

    async def flaky(partner_id, email, nome):
        attempts["n"] += 1
        if attempts["n"] == 1:
            raise RuntimeError("Systeme irraggiungibile")

    async def noop(*args, **kwargs):
        return None

    monkeypatch.setattr(proposta, "_activate_partner_account_and_notify", flaky)
    monkeypatch.setattr(proposta, "_seed_operativo_journey_from_funnel", noop)
    monkeypatch.setattr(proposta, "_finalization_tags", noop)
    monkeypatch.setattr(proposta, "_notify_telegram", noop)

    doc = await db.proposte.find_one({"token": "tok-race"})
    with pytest.raises(Exception):
        await proposta.finalize_partnership_payment(
            doc, method="stripe", reference="cs_1", actor=None
        )

    saved = await db.proposte.find_one({"token": "tok-race"})
    assert saved["finalizzazione_partnership"]["account"] == "failed"

    await proposta.finalize_partnership_payment(
        saved, method="stripe", reference="cs_1", actor=None
    )
    assert attempts["n"] == 2, "l'effetto fallito non e' stato ritentato"
