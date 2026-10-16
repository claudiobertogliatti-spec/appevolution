"""Start Plus (790 EUR): prezzo, scadenza del credito a 60 giorni, pagamento e registro acquisto.

Test ermetici: niente rete, niente Mongo. Decisioni di Claudio 15-16/10/2026:
credito intero (790) entro 60 giorni dall'acquisto, poi resta il credito di Start (390).
"""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from services import ciak_client_accounts as acc

pytestmark = pytest.mark.unit

BOUGHT = datetime(2026, 10, 20, 9, 0, tzinfo=timezone.utc)


def _plus_client(**extra):
    now = BOUGHT.isoformat()
    base = {
        "id": "c1",
        "access_level": acc.ACCESS_START,
        "start_purchased_at": now,
        "start_plus_purchased_at": now,
        "start_credit_amount": acc.START_PLUS_AMOUNT_CENTS,
    }
    base.update(extra)
    return base


def test_importi_e_upgrade_da_start_plus():
    assert acc.START_PLUS_AMOUNT_CENTS == 79000
    price = acc.partnership_price_for_client(_plus_client(), now=BOUGHT + timedelta(days=1))
    assert price["credit_amount_cents"] == 79000
    assert price["due_amount_cents"] == 220000  # 2.200 EUR
    assert price["full_amount_cents"] == 299000


def test_il_credito_pieno_vale_fino_al_sessantesimo_giorno_incluso():
    ultimo = BOUGHT + timedelta(days=60)
    assert acc.partnership_price_for_client(_plus_client(), now=ultimo)["due_amount_cents"] == 220000


def test_dopo_60_giorni_resta_il_credito_di_start():
    price = acc.partnership_price_for_client(_plus_client(), now=BOUGHT + timedelta(days=60, seconds=1))
    assert price["credit_amount_cents"] == 39000
    assert price["due_amount_cents"] == 260000  # come l'upgrade da Start
    assert price["start_plus"]["credit_active"] is False
    assert price["start_plus"]["credit_after_expiry_cents"] == 39000


def test_la_data_puo_essere_una_stringa_iso():
    price = acc.partnership_price_for_client(_plus_client(), now=(BOUGHT + timedelta(days=61)).isoformat())
    assert price["due_amount_cents"] == 260000


def test_start_senza_plus_non_cambia_e_non_scade():
    start = {"id": "c2", "access_level": acc.ACCESS_START, "start_purchased_at": BOUGHT.isoformat(),
             "start_credit_amount": 39000}
    far = BOUGHT + timedelta(days=400)
    price = acc.partnership_price_for_client(start, now=far)
    assert price["due_amount_cents"] == 260000
    assert "start_plus" not in price


def test_lead_senza_acquisti_paga_il_prezzo_pieno():
    assert acc.partnership_price_for_client({"id": "c3"})["due_amount_cents"] == 299000


def test_registro_acquisto_scrive_la_data_da_cui_scade_il_credito():
    now = BOUGHT.isoformat()
    updates = acc.build_start_plus_entitlement_updates({"id": "c1"}, reference_id="cs_1", now=now)
    assert updates["start_plus_purchased_at"] == now
    assert updates["start_purchased_at"] == now  # include Start
    assert updates["start_credit_amount"] == 79000
    assert updates["access_level"] == acc.ACCESS_START
    assert updates["start_payments"] == [
        {"amount_cents": 79000, "reference_id": "cs_1", "at": now, "offer": "start_plus"}
    ]
    assert acc.has_start_plus({**{"id": "c1"}, **updates})
    assert acc.has_start_entitlement({**{"id": "c1"}, **updates})


def test_registro_acquisto_e_idempotente_sullo_stesso_pagamento():
    client = _plus_client(start_payments=[{"amount_cents": 79000, "reference_id": "cs_1", "at": "x"}])
    assert acc.build_start_plus_entitlement_updates(client, reference_id="cs_1", now="y") is None


def test_ruolo_contatto_dice_start_plus():
    assert "Start Plus (790" in acc.ruolo_contatto(_plus_client())["dettaglio"]
    start = {"id": "c", "access_level": acc.ACCESS_START, "start_purchased_at": BOUGHT.isoformat()}
    assert "Ciak Start (390" in acc.ruolo_contatto(start)["dettaglio"]


def test_catalogo_offerte_ha_plus_e_upgrade_plus():
    from services.ciak_offers import MAIN_OFFERS

    assert MAIN_OFFERS["CIAK-START-PLUS"]["amount_cents"] == 79000
    assert MAIN_OFFERS["CIAK-UPGRADE-PLUS"]["amount_cents"] == 220000


# ---- gate pagamenti ---------------------------------------------------------

def test_checkout_plus_resta_chiuso_con_chiave_live_senza_approvazioni(monkeypatch):
    from services.paid_offer_gate import require_paid_offer_checkout

    monkeypatch.delenv("CIAK_PAID_OFFERS_LEGAL_APPROVED", raising=False)
    monkeypatch.delenv("CIAK_PAID_OFFERS_FISCAL_APPROVED", raising=False)
    with pytest.raises(HTTPException) as err:
        require_paid_offer_checkout("sk_live_fixture", "ciak_start_plus")
    assert err.value.status_code == 503
    require_paid_offer_checkout("sk_test_fixture", "ciak_start_plus")  # in test mode passa


# ---- guardie del checkout ---------------------------------------------------

def _guard():
    from routers import ciak_clients

    return ciak_clients


def test_chi_ha_gia_start_puo_passare_a_plus_pagando_400():
    router = _guard()
    start = {"id": "c", "access_level": acc.ACCESS_START, "start_purchased_at": "2026-10-01T00:00:00+00:00"}
    router._ensure_start_plus_checkout_allowed(start, {})  # non solleva
    assert acc.start_plus_amount_due_for_client(start) == 40000
    assert acc.START_PLUS_UPGRADE_FROM_START_CENTS == 40000


def test_chi_parte_da_zero_paga_790():
    assert acc.start_plus_amount_due_for_client({"id": "c"}) == 79000
    assert acc.start_plus_amount_due_for_client(_plus_client()) == 79000  # gia' Plus: nessun secondo importo


def test_chi_ha_gia_plus_non_puo_ricomprarlo():
    router = _guard()
    with pytest.raises(HTTPException) as err:
        router._ensure_start_plus_checkout_allowed(_plus_client(), {})
    assert err.value.status_code == 409
    assert "Start Plus" in err.value.detail


def test_il_partner_non_puo_comprare_plus():
    router = _guard()
    with pytest.raises(HTTPException) as err:
        router._ensure_start_plus_checkout_allowed({"id": "c", "access_level": acc.ACCESS_PARTNER}, {})
    assert err.value.status_code == 409


# ---- pagamento (webhook) ----------------------------------------------------

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
        self.partner_journey_steps = _Steps()


@pytest.fixture
def env(monkeypatch):
    from routers import stripe_webhook
    from services import ciak_start_delivery, ciak_systeme, start_partner_bridge

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
    return stripe_webhook, calls


async def test_pagamento_plus_registra_acquisto_importo_e_consegna(env):
    stripe_webhook, calls = env
    db = _FakeDb({"id": "c1", "email": "anna@example.com", "name": "Anna Rossi"})

    await stripe_webhook.process_ciak_start_payment(
        db, "c1", "cs_plus_1", session={"amount_total": 79000, "currency": "eur"}, plus=True,
    )
    await asyncio.sleep(0)

    _, update = db.ciak_clients.updates[0]
    setted = update["$set"]
    assert setted["access_level"] == stripe_webhook.ACCESS_START
    assert setted["start_plus_purchased_at"]
    assert setted["start_purchased_at"]
    assert setted["start_credit_amount"] == 79000
    assert calls["record"][0]["tipo"] == "ciak_start_plus"
    assert calls["record"][0]["amount_cents"] == 79000
    assert calls["deliver"][0]["plus"] is True
    assert len(calls["bridge"]) == 1


async def test_pagamento_plus_rifiuta_un_importo_di_start(env):
    stripe_webhook, _ = env
    db = _FakeDb({"id": "c1", "email": "a@example.com"})
    with pytest.raises(RuntimeError):
        await stripe_webhook.process_ciak_start_payment(
            db, "c1", "cs_x", session={"amount_total": 39000, "currency": "eur"}, plus=True,
        )
    assert db.ciak_clients.updates == []


async def test_pagamento_start_normale_non_scrive_il_registro_plus(env):
    stripe_webhook, calls = env
    db = _FakeDb({"id": "c1", "email": "a@example.com"})
    await stripe_webhook.process_ciak_start_payment(
        db, "c1", "cs_s", session={"amount_total": 39000, "currency": "eur"},
    )
    await asyncio.sleep(0)
    setted = db.ciak_clients.updates[0][1]["$set"]
    assert "start_plus_purchased_at" not in setted
    assert setted["start_credit_amount"] == 39000
    assert calls["deliver"][0]["plus"] is False


async def test_il_dispatch_instrada_ciak_start_plus_sul_pagamento_plus(monkeypatch):
    from routers import stripe_webhook

    seen = []

    async def fake_process(db, client_id, ref, session=None, plus=False):
        seen.append((client_id, ref, plus))

    monkeypatch.setattr(stripe_webhook, "process_ciak_start_payment", fake_process)
    await stripe_webhook._dispatch_checkout_completed(
        None, {}, "cs_1", {"tipo": "ciak_start_plus", "client_id": "c9"}, None,
    )
    await stripe_webhook._dispatch_checkout_completed(
        None, {}, "cs_2", {"tipo": "ciak_start", "client_id": "c9"}, None,
    )
    assert seen == [("c9", "cs_1", True), ("c9", "cs_2", False)]


# ---- email di consegna ------------------------------------------------------

def _plain_text(message):
    for part in message.walk():
        if part.get_content_type() == "text/plain":
            return part.get_payload(decode=True).decode("utf-8")
    raise AssertionError("parte text/plain assente")

def test_email_plus_dice_790_60_giorni_e_non_promette_date(monkeypatch):
    from services import ciak_start_delivery as delivery

    sent = []

    class _Smtp:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def starttls(self):
            pass

        def login(self, *a):
            pass

        def send_message(self, message):
            sent.append(message)

    monkeypatch.setenv("SMTP_USER", "u")
    monkeypatch.setenv("SMTP_PASSWORD", "p")
    monkeypatch.setattr(delivery.smtplib, "SMTP", _Smtp)
    ok, err = delivery._send_email("a@example.com", "Anna", "https://x/accesso", BOUGHT.isoformat(), None, True)
    assert ok, err
    message = sent[0]
    assert "Start Plus" in message["Subject"]
    body = _plain_text(message)
    assert "790 euro" in body
    assert "entro 60 giorni" in body
    assert "390 euro di credito" in body
    assert "entro il " not in body  # nessuna data inventata per il primo prodotto


def test_email_start_resta_invariata(monkeypatch):
    from services import ciak_start_delivery as delivery

    sent = []

    class _Smtp:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def starttls(self):
            pass

        def login(self, *a):
            pass

        def send_message(self, message):
            sent.append(message)

    monkeypatch.setenv("SMTP_USER", "u")
    monkeypatch.setenv("SMTP_PASSWORD", "p")
    monkeypatch.setattr(delivery.smtplib, "SMTP", _Smtp)
    ok, _ = delivery._send_email("a@example.com", "Anna", "https://x/accesso", BOUGHT.isoformat(), None)
    assert ok
    body = _plain_text(sent[0])
    assert "390 euro" in body and "Start Plus" not in body


# ---- passaggio Start -> Start Plus (400 EUR) --------------------------------

START_CLIENT = {"id": "c1", "email": "anna@example.com", "name": "Anna Rossi", "access_level": acc.ACCESS_START,
                "start_purchased_at": "2026-10-01T09:00:00+00:00", "start_credit_amount": 39000}


async def test_pagamento_del_passaggio_accetta_400_e_porta_il_credito_a_790(env):
    stripe_webhook, calls = env
    db = _FakeDb(dict(START_CLIENT))
    await stripe_webhook.process_ciak_start_payment(
        db, "c1", "cs_up_1", session={"amount_total": 40000, "currency": "eur"}, plus=True,
    )
    await asyncio.sleep(0)
    setted = db.ciak_clients.updates[0][1]["$set"]
    assert setted["start_credit_amount"] == 79000  # 390 + 400 versati
    assert setted["start_plus_purchased_at"]
    assert setted["start_plus_from_start"] is True
    assert setted["start_purchased_at"] == "2026-10-01T09:00:00+00:00"  # la data di Start non si sposta
    assert calls["record"][0]["amount_cents"] == 40000
    assert calls["deliver"][0]["from_start"] is True
    assert calls["deliver"][0]["amount_cents"] == 40000
    assert calls["emit"] == []  # gia' acquirente: nessun secondo evento Systeme


async def test_passaggio_rifiuta_790_perche_ha_gia_pagato_390(env):
    stripe_webhook, _ = env
    db = _FakeDb(dict(START_CLIENT))
    with pytest.raises(RuntimeError):
        await stripe_webhook.process_ciak_start_payment(
            db, "c1", "cs_up_2", session={"amount_total": 79000, "currency": "eur"}, plus=True,
        )
    assert db.ciak_clients.updates == []


def test_registro_del_passaggio_scrive_400_e_il_flag():
    updates = acc.build_start_plus_entitlement_updates(dict(START_CLIENT), reference_id="admin:1", now="2026-10-20T00:00:00+00:00")
    assert updates["start_payments"][-1]["amount_cents"] == 40000
    assert updates["start_plus_from_start"] is True
    assert updates["start_credit_amount"] == 79000
    assert updates["start_purchased_at"] == "2026-10-01T09:00:00+00:00"
    da_zero = acc.build_start_plus_entitlement_updates({"id": "x"}, reference_id="admin:2", now="2026-10-20T00:00:00+00:00")
    assert "start_plus_from_start" not in da_zero
    assert da_zero["start_payments"][-1]["amount_cents"] == 79000


def test_email_del_passaggio_dice_400_e_che_le_fondamenta_ci_sono_gia(monkeypatch):
    from services import ciak_start_delivery as delivery

    sent = []

    class _Smtp:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def starttls(self):
            pass

        def login(self, *a):
            pass

        def send_message(self, message):
            sent.append(message)

    monkeypatch.setenv("SMTP_USER", "u")
    monkeypatch.setenv("SMTP_PASSWORD", "p")
    monkeypatch.setattr(delivery.smtplib, "SMTP", _Smtp)
    ok, _ = delivery._send_email("a@example.com", "Anna", "https://x/a", BOUGHT.isoformat(), None, True, 40000, True)
    assert ok
    body = _plain_text(sent[0])
    assert "pagamento di 400 euro" in body
    assert "sono gia' nella tua area" in body


def test_catalogo_ha_la_voce_del_passaggio():
    from services.ciak_offers import MAIN_OFFERS

    assert MAIN_OFFERS["CIAK-START-PLUS-UPGRADE"]["amount_cents"] == 40000


# ---- journey: passo "Il tuo primo prodotto" ---------------------------------

class _Steps:
    def __init__(self):
        self.docs = []

    async def find_one(self, query, *a, **k):
        return next((d for d in self.docs if all(d.get(key) == v for key, v in query.items())), None)

    async def insert_one(self, doc):
        self.docs.append(doc)


class _JourneyDb:
    def __init__(self):
        self.partner_journey_steps = _Steps()


async def test_il_passo_primo_prodotto_si_semina_una_volta_ed_e_in_attesa():
    from services.journey_seed import seed_start_plus_step

    db = _JourneyDb()
    assert await seed_start_plus_step(db, "c1") == 1
    assert await seed_start_plus_step(db, "c1") == 0  # idempotente
    step = db.partner_journey_steps.docs[0]
    assert step["step_id"] == "start-primo-prodotto"
    assert step["status"] == "pending"
    assert step["owner"] == "MARCO"
    assert step["step_number"] == 7.35


def test_il_passo_e_conosciuto_visibile_e_accessibile_a_chi_ha_start():
    from models import start_journey as sj

    assert sj.step_definition("start-primo-prodotto")["label"] == "Il tuo primo prodotto"
    assert sj.tier_allows_step("start", "start-primo-prodotto")
    assert not sj.tier_allows_step("blueprint", "start-primo-prodotto")
    # non entra nella journey base di Start: lo semina solo l'acquisto di Plus
    assert "start-primo-prodotto" not in sj.START_STEP_IDS
    assert all(d["step_id"] != "start-primo-prodotto" for d in sj.journey_definition_for_tier("start"))
    assert 7.3 < sj.START_PLUS_ONLY_STEPS_DEFINITION[0]["step_number"] < 7.4


# ── Vista admin: riepilogo Plus letto dal solo documento cliente ──────────────

def test_start_plus_admin_view_none_senza_plus():
    from services.ciak_client_accounts import start_plus_admin_view
    assert start_plus_admin_view({"start_purchased_at": "2026-10-01T10:00:00+00:00"}) is None


def test_start_plus_admin_view_giorni_rimasti_e_da_start():
    from services.ciak_client_accounts import start_plus_admin_view
    cliente = {"start_plus_purchased_at": "2026-10-01T10:00:00+00:00", "start_plus_from_start": True}
    v = start_plus_admin_view(cliente, now="2026-10-11T10:00:00+00:00")
    assert v["da_start"] is True and v["credito_pieno_attivo"] is True
    assert v["giorni_rimasti"] == 50
    assert v["credito_pieno_cents"] == 79000 and v["credito_dopo_cents"] == 39000
    # un'ora oltre mezzanotte di residuo conta come giorno intero (arrotondo per eccesso)
    assert start_plus_admin_view(cliente, now="2026-10-11T11:00:00+00:00")["giorni_rimasti"] == 50


def test_start_plus_admin_view_estremo_incluso_e_scaduto():
    from services.ciak_client_accounts import start_plus_admin_view
    cliente = {"start_plus_purchased_at": "2026-10-01T10:00:00+00:00"}
    ultimo = start_plus_admin_view(cliente, now="2026-11-30T10:00:00+00:00")  # 60 giorni esatti
    assert ultimo["credito_pieno_attivo"] is True and ultimo["giorni_rimasti"] == 0
    dopo = start_plus_admin_view(cliente, now="2026-11-30T10:00:01+00:00")
    assert dopo["credito_pieno_attivo"] is False and dopo["giorni_rimasti"] == 0
    assert dopo["da_start"] is False
