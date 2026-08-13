"""Attivazione manuale di Ciak Start da admin, a partire da una sola email.

Il caso reale: un ko dell'Edizione Settembre paga da Payment Link statico. Non ha
account (nasce solo dal Blueprint 27 EUR), il webhook non lo riconosce, e finora
l'unico endpoint disponibile (`/start/activate`) setta i flag ma non consegna
l'accesso. Qui si chiude il ciclo in una sola chiamata.
"""
import pytest

from routers import ciak_admin

pytestmark = pytest.mark.unit


class Collection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                return dict(doc)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return None

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                doc.update(update.get("$set", {}))
                return None
        if upsert:
            self.docs.append({**query, **update.get("$set", {})})


class DB:
    def __init__(self, clients=None):
        self.ciak_clients = Collection(clients)
        self.ciak_client_login_tokens = Collection()
        self.ciak_onboarding_emails = Collection()
        self.ciak_client_access_recovery = Collection()
        self.payments = Collection()
        self.payment_transactions = Collection()
        # Collection lette dal ponte verso i motori partner: l'attivazione non
        # scrive solo l'entitlement, rende il cliente un soggetto che brand kit
        # e posizionamento accettano.
        self.partners = Collection()
        self.users = Collection()
        self.diagnostic_sessions = Collection()
        self.partner_journey_steps = Collection()


ADMIN = type("Admin", (), {"email": "claudio@evolution-pro.it"})()


def _patch_delivery(monkeypatch, *, sent=True, sink=None):
    async def delivered(_db, **kwargs):
        if sink is not None:
            sink.update(kwargs)
        return sent

    monkeypatch.setattr("services.ciak_start_delivery.deliver_start_access", delivered)


@pytest.mark.asyncio
async def test_attiva_crea_il_cliente_che_non_ha_mai_comprato_il_blueprint(monkeypatch):
    database = DB()
    monkeypatch.setattr(ciak_admin, "db", database)
    calls = {}
    _patch_delivery(monkeypatch, sink=calls)

    result = await ciak_admin.attiva_ciak_start(
        ciak_admin.AttivaStartRequest(email="Nuova@Example.IT", name="Maria Restifo"),
        admin=ADMIN,
    )

    assert result["created"] is True
    assert result["already_active"] is False
    assert result["access_sent"] is True
    assert result["recovery_open"] is False

    client = database.ciak_clients.docs[0]
    assert client["email"] == "nuova@example.it"
    assert client["access_level"] == "cliente_start"
    assert client["start_credit_amount"] == 49900
    assert client["start_purchased_at"]
    assert len(client["start_progress"]) == 7
    assert client["start_progress"][0]["status"] == "todo"
    assert calls["client_id"] == client["id"]
    assert calls["email"] == "nuova@example.it"


@pytest.mark.asyncio
async def test_attiva_riusa_l_account_blueprint_esistente_senza_duplicarlo(monkeypatch):
    database = DB([
        {
            "id": "client-1",
            "email": "ko@example.it",
            "name": "Ko Esistente",
            "access_level": "cliente_blueprint",
            "start_credit_amount": 0,
            "start_progress": [],
            "events": [],
        }
    ])
    monkeypatch.setattr(ciak_admin, "db", database)
    _patch_delivery(monkeypatch)

    result = await ciak_admin.attiva_ciak_start(
        ciak_admin.AttivaStartRequest(email="ko@example.it"),
        admin=ADMIN,
    )

    assert result["created"] is False
    assert result["client_id"] == "client-1"
    assert len(database.ciak_clients.docs) == 1
    client = database.ciak_clients.docs[0]
    assert client["access_level"] == "cliente_start"
    assert client["name"] == "Ko Esistente"
    assert any(
        event["event"] == "ciak_start_activated_by_admin" for event in client["events"]
    )


@pytest.mark.asyncio
async def test_attiva_su_cliente_gia_attivo_rimanda_l_accesso_senza_riscrivere_la_data(monkeypatch):
    database = DB([
        {
            "id": "client-1",
            "email": "gia@example.it",
            "access_level": "cliente_start",
            "start_purchased_at": "2026-08-01T09:00:00+00:00",
            "start_credit_amount": 49900,
            "start_progress": [{"id": "start_1", "label": "Direzione", "status": "done"}],
            "events": [],
        }
    ])
    monkeypatch.setattr(ciak_admin, "db", database)
    _patch_delivery(monkeypatch)

    result = await ciak_admin.attiva_ciak_start(
        ciak_admin.AttivaStartRequest(email="gia@example.it"),
        admin=ADMIN,
    )

    assert result["already_active"] is True
    assert result["access_sent"] is True
    client = database.ciak_clients.docs[0]
    assert client["start_purchased_at"] == "2026-08-01T09:00:00+00:00"
    assert client["start_progress"] == [
        {"id": "start_1", "label": "Direzione", "status": "done"}
    ]


@pytest.mark.asyncio
async def test_attiva_registra_l_incasso_del_payment_link(monkeypatch):
    """Ciak Start si paga intero: l'incasso registrato e' sempre 499."""
    database = DB()
    monkeypatch.setattr(ciak_admin, "db", database)
    _patch_delivery(monkeypatch)

    await ciak_admin.attiva_ciak_start(
        ciak_admin.AttivaStartRequest(email="incasso@example.it", riferimento="pi_3ABC"),
        admin=ADMIN,
    )

    transaction = database.payment_transactions.docs[0]
    assert transaction["session_id"] == "pi_3ABC"
    assert transaction["tipo"] == "ciak_start"
    assert transaction["amount_cents"] == 49900
    assert database.payments.docs[0]["amount"] == 499.0
    client = database.ciak_clients.docs[0]
    assert client["start_credit_amount"] == 49900


@pytest.mark.asyncio
async def test_attiva_non_finge_successo_quando_l_email_non_parte(monkeypatch):
    database = DB()
    monkeypatch.setattr(ciak_admin, "db", database)
    _patch_delivery(monkeypatch, sent=False)

    result = await ciak_admin.attiva_ciak_start(
        ciak_admin.AttivaStartRequest(email="smtpdown@example.it"),
        admin=ADMIN,
    )

    assert result["access_sent"] is False
    assert result["recovery_open"] is True
    # L'entitlement resta scritto: il cliente ha pagato, l'accesso si ritenta.
    assert database.ciak_clients.docs[0]["access_level"] == "cliente_start"


@pytest.mark.asyncio
async def test_attiva_rifiuta_una_email_non_valida(monkeypatch):
    from fastapi import HTTPException

    database = DB()
    monkeypatch.setattr(ciak_admin, "db", database)
    _patch_delivery(monkeypatch)

    with pytest.raises(HTTPException) as exc:
        await ciak_admin.attiva_ciak_start(
            ciak_admin.AttivaStartRequest(email="non-una-email"),
            admin=ADMIN,
        )

    assert exc.value.status_code == 422
    assert database.ciak_clients.docs == []


@pytest.mark.asyncio
async def test_riattivare_un_cliente_gia_pagante_rimanda_solo_l_accesso(monkeypatch):
    """«Non mi e' arrivata la mail» su chi ha gia' pagato.

    Non e' un errore: non si registra un secondo incasso, si riconsegna
    l'accesso e basta.
    """
    database = DB([
        {
            "id": "client-1",
            "email": "saldato@example.it",
            "access_level": "cliente_start",
            "start_purchased_at": "2026-08-01T09:00:00+00:00",
            "start_credit_amount": 49900,
            "start_payments": [{"amount_cents": 49900, "reference_id": "cs_1"}],
            "start_progress": [{"id": "start_1", "status": "done"}],
            "events": [],
        }
    ])
    monkeypatch.setattr(ciak_admin, "db", database)
    _patch_delivery(monkeypatch)

    result = await ciak_admin.attiva_ciak_start(
        ciak_admin.AttivaStartRequest(email="saldato@example.it"),
        admin=ADMIN,
    )

    assert result["already_active"] is True
    assert result["access_sent"] is True
    client = database.ciak_clients.docs[0]
    assert client["start_payments"] == [{"amount_cents": 49900, "reference_id": "cs_1"}]
    assert database.payment_transactions.docs == []


@pytest.mark.asyncio
async def test_l_attivazione_accende_i_motori_partner(monkeypatch):
    """L'aggancio al ponte: e' quello che rende utile tutto il resto.

    Senza, il cliente ha l'entitlement ma trova sette etichette in sola lettura,
    perche' brand kit e posizionamento girano dietro la guardia partner.
    """
    database = DB()
    monkeypatch.setattr(ciak_admin, "db", database)
    _patch_delivery(monkeypatch)

    await ciak_admin.attiva_ciak_start(
        ciak_admin.AttivaStartRequest(email="motori@example.it", name="Maria Restifo"),
        admin=ADMIN,
    )

    cliente = database.ciak_clients.docs[0]
    partner = database.partners.docs[0]
    assert partner["id"] == cliente["id"], "partner e cliente devono avere lo stesso id"
    assert partner["tier"] == "start"
    assert partner["email"] == "motori@example.it"
