import pytest
from routers import checkout
from routers import stripe_webhook
from routers.checkout import CreateSessionRequest

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    async def find_one(self, query, projection=None, sort=None):
        docs = list(self.docs)
        if sort:
            for key, direction in reversed(sort):
                docs.sort(key=lambda doc: doc.get(key), reverse=direction < 0)
        for doc in docs:
            if all(doc.get(key) == value for key, value in query.items()):
                data = dict(doc)
                if projection and projection.get("_id") == 0:
                    data.pop("_id", None)
                return data
        return None

    async def replace_one(self, query, new_doc):
        for idx, doc in enumerate(self.docs):
            if all(doc.get(key) == value for key, value in query.items()):
                self.docs[idx] = dict(new_doc)
                return None
        self.docs.append(dict(new_doc))
        return None

    async def insert_one(self, doc):
        if "_id" in doc and any(existing.get("_id") == doc["_id"] for existing in self.docs):
            from pymongo.errors import DuplicateKeyError
            raise DuplicateKeyError("duplicate _id")
        self.docs.append(dict(doc))
        return None

    async def delete_one(self, query):
        for idx, doc in enumerate(self.docs):
            if all(doc.get(key) == value for key, value in query.items()):
                self.docs.pop(idx)
                return type("Result", (), {"deleted_count": 1})()
        return type("Result", (), {"deleted_count": 0})()

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                for key, value in update.get("$set", {}).items():
                    doc[key] = value
                return type("Result", (), {"matched_count": 1, "modified_count": 1})()
        if upsert:
            doc = dict(query)
            doc.update(update.get("$set", {}))
            self.docs.append(doc)
            return type("Result", (), {"matched_count": 0, "modified_count": 0, "upserted_id": doc.get("id")})()
        return type("Result", (), {"matched_count": 0, "modified_count": 0})()


class FakeDB:
    def __init__(self):
        self.diagnostic_sessions = FakeCollection()
        self.ciak_analisi = FakeCollection()
        self.ciak_clients = FakeCollection()
        self.ciak_client_login_tokens = FakeCollection()
        self.ciak_orphan_purchases = FakeCollection()
        self.ciak_client_access_recovery = FakeCollection()
        self.ciak_onboarding_emails = FakeCollection()
        self.users = FakeCollection()
        self.partners = FakeCollection()
        self.payment_transactions = FakeCollection()
        self.payments = FakeCollection()
        self.pagamenti_partnership = FakeCollection()
        self.stripe_webhook_events = FakeCollection()


class FakeBackgroundTasks:
    def __init__(self):
        self.calls = []

    def add_task(self, func, *args, **kwargs):
        self.calls.append((func, args, kwargs))

    async def run_all(self):
        """Esegue le task come fa FastAPI dopo aver risposto al webhook.

        Serve nei test che verificano gli EFFETTI della consegna: da quando
        accesso e analisi sono BackgroundTask e non piu' `create_task`, non
        partono da sole durante la chiamata.
        """
        for func, args, kwargs in list(self.calls):
            await func(*args, **kwargs)


@pytest.mark.asyncio
async def test_handle_checkout_triggers_delivery(monkeypatch):
    captured = {"tasks": []}

    diag = {"_id": 1, "session_token": "tok", "user_email": "c@x.it", "user_name": "Cliente",
            "state_history": [], "events": [], "current_state": "report_generated"}

    class Coll:
        async def find_one(self, *a, **k): return diag
        async def replace_one(self, *a, **k): return None
        async def insert_one(self, *a, **k): return None
        async def update_one(self, *a, **k): return None
    class DB:
        diagnostic_sessions = Coll()
        ciak_analisi = Coll()
        ciak_clients = Coll()
        ciak_client_login_tokens = Coll()
        ciak_client_access_recovery = Coll()
    checkout.db = DB()

    monkeypatch.setattr(checkout, "transition_to", lambda *a, **k: None)
    monkeypatch.setattr(checkout, "add_event", lambda *a, **k: None)

    import asyncio
    def fake_create_task(coro):
        captured["tasks"].append(coro)
        coro.close()
        return None
    monkeypatch.setattr(asyncio, "create_task", fake_create_task)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", lambda **k: _noop())

    async def fake_processa(session_token, email, nome):
        captured["delivery_args"] = (session_token, email, nome)
    monkeypatch.setattr("services.ciak_analisi_delivery.processa_acquisto", fake_processa)

    bg = FakeBackgroundTasks()
    await checkout._handle_checkout_completed({
        "id": "cs_1", "amount_total": 6700,
        "metadata": {"tipo": "ciak_blueprint", "diagnostic_session_token": "tok"},
        "customer_email": "c@x.it",
    }, bg)
    # Must have scheduled at least 2 tasks: Systeme event + analisi delivery
    assert len(captured["tasks"]) >= 2, (
        f"Expected ≥2 create_task calls (Systeme + delivery), got {len(captured['tasks'])}"
    )


async def _noop(): return None


@pytest.mark.asyncio
async def test_create_checkout_session_links_latest_diagnostic_by_email(monkeypatch):
    fake_db = FakeDB()
    fake_db.diagnostic_sessions.docs.append(
        {
            "_id": 1,
            "session_token": "tok-email",
            "user_email": "lead@example.com",
            "created_at": "2026-07-01T10:00:00+00:00",
            "current_state": "report_generated",
            "state_history": [],
            "events": [],
        }
    )
    checkout.db = fake_db

    captured = {}

    class FakeStripeSession:
        id = "cs_email_link"
        url = "https://checkout.example/email-link"

    def fake_create(**kwargs):
        captured["kwargs"] = kwargs
        return FakeStripeSession()

    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    monkeypatch.setattr(checkout.stripe.checkout.Session, "create", fake_create)

    response = await checkout.create_checkout_session(
        CreateSessionRequest(
            product="ciak_blueprint",
            source="ciak",
            attribution_source="masterclass_optin",
            email="lead@example.com",
            origin_url="https://ciak.io",
        ),
        request=None,
    )

    assert response.checkout_url == "https://checkout.example/email-link"
    assert captured["kwargs"]["metadata"]["diagnostic_session_token"] == "tok-email"
    assert captured["kwargs"]["metadata"]["attribution_source"] == "masterclass_optin"
    assert captured["kwargs"]["success_url"] == "https://ciak.io/blueprint/grazie?session_id={CHECKOUT_SESSION_ID}"
    assert captured["kwargs"]["cancel_url"] == "https://ciak.io/blueprint?from=cancel"
    diagnostic = fake_db.diagnostic_sessions.docs[0]
    assert diagnostic["current_state"] == "clicked_67"
    assert any(event["event"] == "stripe_session_created" for event in diagnostic["events"])


@pytest.mark.asyncio
async def test_create_checkout_session_falls_back_to_direct_attribution(monkeypatch):
    fake_db = FakeDB()
    checkout.db = fake_db
    captured = {}

    class FakeStripeSession:
        id = "cs_direct"
        url = "https://checkout.example/direct"

    def fake_create(**kwargs):
        captured["kwargs"] = kwargs
        return FakeStripeSession()

    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    monkeypatch.setattr(checkout.stripe.checkout.Session, "create", fake_create)

    await checkout.create_checkout_session(
        CreateSessionRequest(attribution_source="<script>untrusted</script>"),
        request=None,
    )

    assert captured["kwargs"]["metadata"]["attribution_source"] == "direct"


@pytest.mark.asyncio
async def test_handle_checkout_completed_creates_client_access_and_magic_token(monkeypatch):
    fake_db = FakeDB()
    captured = {"tasks": [], "field_calls": [], "event_calls": []}
    fake_db.diagnostic_sessions.docs.append(
        {
            "_id": 1,
            "session_token": "tok-blueprint",
            "user_email": "USER@EXAMPLE.COM",
            "user_name": "User Demo",
            "created_at": "2026-07-01T09:00:00+00:00",
            "completed_at": "2026-07-01T09:05:00+00:00",
            "current_state": "report_generated",
            "responses": {"q1_competenza": "Strategia"},
            "tracking": {"source": "ads"},
            "scoring": {"score_percentuale": 48},
            "state_history": [],
            "events": [],
        }
    )
    checkout.db = fake_db

    monkeypatch.setattr(checkout, "transition_to", lambda *a, **k: None)
    monkeypatch.setattr(checkout, "add_event", lambda *a, **k: None)
    monkeypatch.setattr("services.ciak_analisi_delivery.set_db", lambda db: None)

    import asyncio

    def fake_create_task(coro):
        captured["tasks"].append(coro)
        return None

    async def fake_set_contact_fields(**kwargs):
        captured["field_calls"].append(kwargs)
        return True

    async def fake_emit_event(**kwargs):
        captured["event_calls"].append(kwargs)
        return True

    monkeypatch.setattr(asyncio, "create_task", fake_create_task)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", fake_emit_event)
    monkeypatch.setattr("services.ciak_systeme.ciak_set_contact_fields", fake_set_contact_fields)
    monkeypatch.setattr("services.ciak_analisi_delivery.processa_acquisto", lambda **k: _noop())

    bg = FakeBackgroundTasks()
    await checkout._handle_checkout_completed(
        {
            "id": "cs_blueprint_1",
            "amount_total": 2700,
            "currency": "eur",
            "metadata": {"tipo": "ciak_blueprint", "diagnostic_session_token": "tok-blueprint"},
            "customer_email": "user@example.com",
        },
        bg,
    )
    await asyncio.gather(*captured["tasks"])

    assert len(fake_db.ciak_clients.docs) == 1
    await bg.run_all()

    client = fake_db.ciak_clients.docs[0]
    assert client["email"] == "user@example.com"
    assert client["access_level"] == "cliente_blueprint"
    assert client["recommended_offer"] == "ciak_start"
    assert client["blueprint_amount_cents"] == 2700
    assert "script_call" not in client

    assert len(fake_db.ciak_client_login_tokens.docs) == 1
    token_doc = fake_db.ciak_client_login_tokens.docs[0]
    assert token_doc["client_id"] == client["id"]
    assert token_doc["email"] == "user@example.com"
    assert token_doc["used_at"] is None
    assert client["last_magic_login_url"].startswith("https://ciak.io/cliente/accesso?token=")

    assert captured["field_calls"] == [
        {
            "email": "user@example.com",
            "fields": {"client_access_url": client["last_magic_login_url"]},
            "first_name": "User Demo",
        }
    ]
    assert any(
        call["event_name"] == "ciak_client_access_ready"
        and call["metadata"]["client_access_url"] == client["last_magic_login_url"]
        for call in captured["event_calls"]
    )


@pytest.mark.asyncio
async def test_handle_checkout_completed_cold_direct_creates_diagnostic_client_access_and_magic_token(monkeypatch):
    fake_db = FakeDB()
    checkout.db = fake_db

    monkeypatch.setattr("services.ciak_analisi_delivery.set_db", lambda db: None)

    import asyncio

    def fake_create_task(coro):
        coro.close()
        return None

    monkeypatch.setattr(asyncio, "create_task", fake_create_task)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", lambda **k: _noop())
    monkeypatch.setattr("services.ciak_analisi_delivery.processa_acquisto", lambda **k: _noop())

    bg = FakeBackgroundTasks()
    await checkout._handle_checkout_completed(
        {
            "id": "cs_cold_direct_1",
            "amount_total": 2700,
            "currency": "eur",
            "metadata": {"tipo": "ciak_blueprint", "stato": "2"},
            "customer_email": "cold@example.com",
            "customer_details": {"email": "cold@example.com", "name": "Cold Buyer"},
        },
        bg,
    )

    assert fake_db.ciak_orphan_purchases.docs == []
    assert len(fake_db.diagnostic_sessions.docs) == 1
    diagnostic = fake_db.diagnostic_sessions.docs[0]
    assert diagnostic["user_email"] == "cold@example.com"
    assert diagnostic["user_name"] == "Cold Buyer"
    assert diagnostic["current_state"] == "purchased_67"
    assert diagnostic["diagnostic_origin"] == "stripe_checkout_cold_direct"
    assert diagnostic["stripe_session_id"] == "cs_cold_direct_1"
    assert diagnostic["session_token"]
    assert any(event["event"] == "stripe_payment_completed" for event in diagnostic["events"])

    assert len(fake_db.ciak_clients.docs) == 1
    client = fake_db.ciak_clients.docs[0]
    assert client["email"] == "cold@example.com"
    assert client["name"] == "Cold Buyer"
    assert client["diagnostic_current_state"] == "purchased_67"
    assert client["diagnostic_session_token"] == diagnostic["session_token"]

    assert len(fake_db.ciak_client_login_tokens.docs) == 1
    token_doc = fake_db.ciak_client_login_tokens.docs[0]
    assert token_doc["client_id"] == client["id"]
    assert token_doc["email"] == "cold@example.com"


@pytest.mark.asyncio
async def test_handle_checkout_completed_records_recovery_when_client_access_creation_fails(monkeypatch):
    fake_db = FakeDB()
    checkout.db = fake_db

    monkeypatch.setattr("services.ciak_analisi_delivery.set_db", lambda db: None)

    import asyncio

    def fake_create_task(coro):
        coro.close()
        return None

    async def boom(*args, **kwargs):
        raise RuntimeError("ciak unavailable")

    monkeypatch.setattr(asyncio, "create_task", fake_create_task)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", lambda **k: _noop())
    monkeypatch.setattr("services.ciak_analisi_delivery.processa_acquisto", lambda **k: _noop())
    monkeypatch.setattr("services.ciak_client_accounts.ensure_client_for_blueprint", boom)

    bg = FakeBackgroundTasks()
    await checkout._handle_checkout_completed(
        {
            "id": "cs_cold_direct_fail",
            "amount_total": 2700,
            "currency": "eur",
            "metadata": {"tipo": "ciak_blueprint", "stato": "2"},
            "customer_email": "recover@example.com",
            "customer_details": {"email": "recover@example.com", "name": "Recover Buyer"},
        },
        bg,
    )

    assert len(fake_db.ciak_client_access_recovery.docs) == 1
    recovery = fake_db.ciak_client_access_recovery.docs[0]
    assert recovery["email"] == "recover@example.com"
    assert recovery["checkout_session_id"] == "cs_cold_direct_fail"
    assert recovery["diagnostic_session_token"] == fake_db.diagnostic_sessions.docs[0]["session_token"]
    assert recovery["error"] == "ciak unavailable"
    assert recovery["status"] == "pending"
    assert recovery["created_at"]


@pytest.mark.asyncio
async def test_stripe_webhook_checkout_completed_activates_ciak_start():
    fake_db = FakeDB()
    fake_db.ciak_clients.docs.append(
        {
            "id": "client-1",
            "email": "start@example.com",
            "access_level": "cliente_blueprint",
            "recommended_offer": "ciak_start",
            "offer_decision": "ciak_start",
            "start_credit_amount": 0,
            "start_progress": [],
            "events": [],
        }
    )
    tasks = FakeBackgroundTasks()

    await stripe_webhook.handle_checkout_completed(
        fake_db,
        {
            "id": "cs_start_1",
            "payment_status": "paid",
            "metadata": {
                "tipo": "ciak_start",
                "client_id": "client-1",
            },
        },
        tasks,
    )

    client = fake_db.ciak_clients.docs[0]
    assert client["access_level"] == "cliente_start"
    assert client["start_credit_amount"] == 49900
    assert client["start_purchased_at"]
    assert client["start_progress"][0]["status"] == "todo"
    assert any(event["event"] == "ciak_start_payment_completed" for event in client["events"])
    assert fake_db.payment_transactions.docs[0]["tipo"] == "ciak_start"
    assert fake_db.payments.docs[0]["amount"] == 499.0
    assert tasks.calls == []


@pytest.mark.asyncio
async def test_start_payment_delivers_audited_access_email(monkeypatch):
    fake_db = FakeDB()
    fake_db.ciak_clients.docs.append(
        {
            "id": "client-email",
            "email": "start@example.com",
            "name": "Mario",
            "access_level": "cliente_blueprint",
            "events": [],
        }
    )

    delivered = {}

    async def fake_delivery(database, **kwargs):
        delivered.update(kwargs)
        await database.ciak_onboarding_emails.insert_one(
            {
                "client_id": kwargs["client_id"],
                "tier": "start",
                "sent": True,
                "checkout_session_id": kwargs["checkout_session_id"],
            }
        )
        return True

    monkeypatch.setattr(
        "services.ciak_start_delivery.deliver_start_access", fake_delivery
    )

    await stripe_webhook.handle_checkout_completed(
        fake_db,
        {
            "id": "cs_start_email",
            "payment_status": "paid",
            "amount_total": 49900,
            "currency": "eur",
            "metadata": {"tipo": "ciak_start", "client_id": "client-email"},
        },
        FakeBackgroundTasks(),
    )

    assert delivered["client_id"] == "client-email"
    assert delivered["email"] == "start@example.com"
    assert delivered["paid_at"]
    assert fake_db.ciak_onboarding_emails.docs[0]["sent"] is True


@pytest.mark.asyncio
async def test_start_payment_with_unknown_client_fails_and_releases_webhook_lock():
    fake_db = FakeDB()

    with pytest.raises(RuntimeError, match="Ciak client not found"):
        await stripe_webhook.handle_checkout_completed(
            fake_db,
            {
                "id": "cs_start_orphan",
                "payment_status": "paid",
                "amount_total": 49900,
                "currency": "eur",
                "metadata": {"tipo": "ciak_start", "client_id": "missing"},
            },
            FakeBackgroundTasks(),
        )

    assert fake_db.stripe_webhook_events.docs == []


@pytest.mark.asyncio
async def test_stripe_webhook_checkout_completed_deduplicates_retried_session():
    fake_db = FakeDB()
    fake_db.ciak_clients.docs.append(
        {
            "id": "client-1",
            "email": "start@example.com",
            "events": [],
        }
    )
    tasks = FakeBackgroundTasks()
    event = {
        "id": "cs_start_retry",
        "payment_status": "paid",
        "metadata": {
            "tipo": "ciak_start",
            "client_id": "client-1",
        },
    }

    await stripe_webhook.handle_checkout_completed(fake_db, event, tasks)
    await stripe_webhook.handle_checkout_completed(fake_db, event, tasks)

    client = fake_db.ciak_clients.docs[0]
    assert len(client["events"]) == 1
    assert len(fake_db.payment_transactions.docs) == 1
    assert len(fake_db.payments.docs) == 1
    assert fake_db.stripe_webhook_events.docs[0]["status"] == "processed"


@pytest.mark.asyncio
async def test_stripe_webhook_checkout_completed_activates_client_partnership_without_losing_start_credit():
    fake_db = FakeDB()
    fake_db.ciak_clients.docs.append(
        {
            "id": "client-1",
            "email": "partner@example.com",
            "access_level": "cliente_start",
            "recommended_offer": "partnership",
            "offer_decision": "partnership",
            "start_credit_amount": 49900,
            "start_purchased_at": "2026-07-01T10:00:00+00:00",
            "start_progress": [{"id": "start_1", "status": "done"}],
            "events": [],
        }
    )
    fake_db.users.docs.append(
        {
            "id": "user-1",
            "email": "partner@example.com",
            "partnership_attiva": False,
            "stato_cliente": "attivazione_partnership",
        }
    )
    tasks = FakeBackgroundTasks()

    await stripe_webhook.handle_checkout_completed(
        fake_db,
        {
            "id": "cs_partner_1",
            "payment_status": "paid",
            "metadata": {
                "tipo": "partnership",
                "client_id": "client-1",
                "full_amount_cents": 279000,
                "credit_amount_cents": 49900,
                "due_amount_cents": 229100,
            },
        },
        tasks,
    )

    client = fake_db.ciak_clients.docs[0]
    assert client["access_level"] == "partner"
    assert client["partnership_attiva"] is True
    assert client["stato_cliente"] == "partner_attivo"
    assert client["start_credit_amount"] == 49900
    assert client["start_purchased_at"] == "2026-07-01T10:00:00+00:00"
    assert any(event["event"] == "partnership_payment_completed" for event in client["events"])

    user = fake_db.users.docs[0]
    assert user["partnership_attiva"] is True
    assert user["stato_cliente"] == "partner_attivo"
    assert user["data_pagamento_partnership"]
    assert fake_db.pagamenti_partnership.docs[0]["user_id"] == "user-1"
    assert fake_db.payment_transactions.docs[0]["amount_cents"] == 229100
    assert fake_db.payments.docs[0]["amount"] == 2291.0
    assert len(tasks.calls) == 1
    assert tasks.calls[0][0] is stripe_webhook.send_partnership_welcome_email
    assert tasks.calls[0][1] == ("user-1",)


# ─── Ciak Start a rate — Edizione Settembre: acconto 199 + saldo 300 ──────────
# Il piano rateale nasce dalla vendita telefonica: acconto subito, saldo alla
# partenza. Prima di questo blocco il webhook sollevava RuntimeError su
# qualunque importo diverso da 49900, quindi l'acconto veniva rifiutato.


def _client_pronto_per_lo_start(fake_db):
    fake_db.ciak_clients.docs.append(
        {
            "id": "client-1",
            "email": "rate@example.com",
            "access_level": "cliente_blueprint",
            "start_credit_amount": 0,
            "start_progress": [],
            "events": [],
        }
    )


@pytest.mark.asyncio
async def test_acconto_attiva_lo_start_e_accredita_solo_quello_che_e_entrato():
    fake_db = FakeDB()
    _client_pronto_per_lo_start(fake_db)

    await stripe_webhook.handle_checkout_completed(
        fake_db,
        {
            "id": "cs_acconto_1",
            "payment_status": "paid",
            "amount_total": 19900,
            "currency": "eur",
            "metadata": {"tipo": "ciak_start_acconto", "client_id": "client-1"},
        },
        FakeBackgroundTasks(),
    )

    client = fake_db.ciak_clients.docs[0]
    assert client["access_level"] == "cliente_start"
    assert client["start_purchased_at"]
    assert client["start_progress"][0]["status"] == "todo"
    assert client["start_paid_cents"] == 19900
    assert client["start_credit_amount"] == 19900
    plan = client["start_payment_plan"]
    assert plan["complete"] is False
    assert plan["total_cents"] == 49900
    assert [item["kind"] for item in plan["installments"]] == ["acconto"]
    assert fake_db.payments.docs[0]["amount"] == 199.0


@pytest.mark.asyncio
async def test_saldo_completa_il_piano_e_riporta_il_credito_a_499():
    fake_db = FakeDB()
    _client_pronto_per_lo_start(fake_db)

    for reference, tipo, amount in (
        ("cs_acconto_1", "ciak_start_acconto", 19900),
        ("cs_saldo_1", "ciak_start_saldo", 30000),
    ):
        await stripe_webhook.handle_checkout_completed(
            fake_db,
            {
                "id": reference,
                "payment_status": "paid",
                "amount_total": amount,
                "currency": "eur",
                "metadata": {"tipo": tipo, "client_id": "client-1"},
            },
            FakeBackgroundTasks(),
        )

    client = fake_db.ciak_clients.docs[0]
    assert client["start_paid_cents"] == 49900
    assert client["start_credit_amount"] == 49900
    assert client["start_payment_plan"]["complete"] is True
    assert len(client["start_payment_plan"]["installments"]) == 2


@pytest.mark.asyncio
async def test_lo_stesso_acconto_consegnato_due_volte_non_raddoppia_l_incasso():
    fake_db = FakeDB()
    _client_pronto_per_lo_start(fake_db)
    evento = {
        "id": "cs_acconto_1",
        "payment_status": "paid",
        "amount_total": 19900,
        "currency": "eur",
        "metadata": {"tipo": "ciak_start_acconto", "client_id": "client-1"},
    }

    await stripe_webhook.process_ciak_start_installment(
        fake_db, "client-1", "cs_acconto_1", session=evento, kind="acconto"
    )
    await stripe_webhook.process_ciak_start_installment(
        fake_db, "client-1", "cs_acconto_1", session=evento, kind="acconto"
    )

    client = fake_db.ciak_clients.docs[0]
    assert client["start_paid_cents"] == 19900
    assert len(client["start_payment_plan"]["installments"]) == 1


@pytest.mark.asyncio
async def test_una_rata_che_sfora_i_499_viene_rifiutata():
    fake_db = FakeDB()
    _client_pronto_per_lo_start(fake_db)

    with pytest.raises(RuntimeError):
        await stripe_webhook.process_ciak_start_installment(
            fake_db,
            "client-1",
            "cs_troppo",
            session={"amount_total": 60000, "currency": "eur"},
            kind="acconto",
        )

    assert "start_paid_cents" not in fake_db.ciak_clients.docs[0]
