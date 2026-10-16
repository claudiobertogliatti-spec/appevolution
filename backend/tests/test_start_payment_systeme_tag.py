"""Tag Systeme `ciak_start_acquistato` emesso da `process_ciak_start_payment`.

Test ermetici: niente rete, niente Mongo. Si esegue il codice REALE della funzione
di pagamento; i collaboratori esterni sono sostituiti con registratori.
"""
import asyncio

import pytest

pytestmark = pytest.mark.unit


class _FakeClients:
    def __init__(self, doc):
        self.doc = doc
        self.updates = []

    async def find_one(self, query, projection=None):
        return dict(self.doc) if self.doc else None

    async def update_one(self, query, update, *args, **kwargs):
        self.updates.append((query, update))


class _FakeDb:
    def __init__(self, doc):
        self.ciak_clients = _FakeClients(doc)


@pytest.fixture
def env(monkeypatch):
    from routers import stripe_webhook
    from services import ciak_systeme, ciak_start_delivery, start_partner_bridge

    calls = {"emit": [], "bridge": [], "deliver": [], "record": []}

    async def fake_emit(**kwargs):
        calls["emit"].append(kwargs)
        return True

    async def fake_bridge(db, client):
        calls["bridge"].append(client)

    async def fake_record(db, **kwargs):
        calls["record"].append(kwargs)

    async def fake_deliver(db, **kwargs):
        calls["deliver"].append(kwargs)

    monkeypatch.setattr(ciak_systeme, "ciak_emit_event", fake_emit)
    monkeypatch.setattr(start_partner_bridge, "ensure_start_partner_bridge", fake_bridge)
    monkeypatch.setattr(stripe_webhook, "_record_checkout_payment", fake_record)
    monkeypatch.setattr(ciak_start_delivery, "deliver_start_access", fake_deliver)
    return stripe_webhook, ciak_systeme, calls


def _session(stripe_webhook):
    return {"amount_total": stripe_webhook.START_AMOUNT_CENTS, "currency": "eur"}


async def test_start_payment_emits_tag_and_keeps_existing_behaviour(env):
    stripe_webhook, _, calls = env
    db = _FakeDb({"id": "c1", "email": "ANNA@Example.com", "name": "Anna Maria Rossi"})

    await stripe_webhook.process_ciak_start_payment(db, "c1", "cs_test_1", session=_session(stripe_webhook))
    await asyncio.sleep(0)  # lascia girare il task in background

    assert len(calls["emit"]) == 1
    emitted = calls["emit"][0]
    assert emitted["email"] == "anna@example.com"
    assert emitted["event_name"] == "ciak_start_acquistato"
    assert emitted["first_name"] == "Anna"
    assert emitted["metadata"]["reference_id"] == "cs_test_1"

    assert len(db.ciak_clients.updates) == 1
    _, update = db.ciak_clients.updates[0]
    assert update["$set"]["access_level"] == stripe_webhook.ACCESS_START
    assert update["$set"]["start_purchased_at"]
    assert len(calls["bridge"]) == 1
    assert len(calls["record"]) == 1
    assert len(calls["deliver"]) == 1


async def test_client_without_email_does_not_emit_but_payment_completes(env):
    stripe_webhook, _, calls = env
    db = _FakeDb({"id": "c2", "name": "Senza Email"})

    await stripe_webhook.process_ciak_start_payment(db, "c2", "cs_test_2", session=_session(stripe_webhook))
    await asyncio.sleep(0)

    assert calls["emit"] == []
    assert len(db.ciak_clients.updates) == 1
    assert len(calls["deliver"]) == 1


async def test_emitter_failure_in_background_does_not_break_payment(env, monkeypatch):
    stripe_webhook, ciak_systeme, calls = env
    tasks = []
    real_create_task = asyncio.create_task

    async def boom(**kwargs):
        raise RuntimeError("systeme down")

    def collecting_fire_and_forget(coro):
        tasks.append(real_create_task(coro))

    monkeypatch.setattr(ciak_systeme, "ciak_emit_event", boom)
    monkeypatch.setattr(ciak_systeme, "fire_and_forget", collecting_fire_and_forget)
    db = _FakeDb({"id": "c3", "email": "a@b.it", "name": "A"})

    await stripe_webhook.process_ciak_start_payment(db, "c3", "cs_test_3", session=_session(stripe_webhook))
    results = await asyncio.gather(*tasks, return_exceptions=True)  # consuma l'errore del task

    assert len(tasks) == 1
    assert isinstance(results[0], RuntimeError)
    assert len(db.ciak_clients.updates) == 1
    assert len(calls["deliver"]) == 1


async def test_fire_and_forget_raising_is_swallowed(env, monkeypatch):
    stripe_webhook, ciak_systeme, calls = env

    def broken(coro):
        coro.close()  # evita il warning "coroutine never awaited"
        raise RuntimeError("no loop")

    monkeypatch.setattr(ciak_systeme, "fire_and_forget", broken)
    db = _FakeDb({"id": "c4", "email": "a@b.it", "name": "A"})

    await stripe_webhook.process_ciak_start_payment(db, "c4", "cs_test_4", session=_session(stripe_webhook))

    assert len(db.ciak_clients.updates) == 1
    assert len(calls["bridge"]) == 1
    assert len(calls["deliver"]) == 1


async def test_repeated_payment_is_harmless(env):
    stripe_webhook, _, calls = env
    db = _FakeDb({"id": "c5", "email": "a@b.it", "name": "A"})

    for _ in range(2):
        await stripe_webhook.process_ciak_start_payment(db, "c5", "cs_test_5", session=_session(stripe_webhook))
    await asyncio.sleep(0)

    assert len(calls["emit"]) <= 2
    assert {c["event_name"] for c in calls["emit"]} == {"ciak_start_acquistato"}
