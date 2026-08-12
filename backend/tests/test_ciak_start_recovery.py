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
    def __init__(self):
        self.ciak_client_access_recovery = Collection([
            {
                "id": "recovery-1",
                "tier": "start",
                "client_id": "client-1",
                "email": "start@example.com",
                "checkout_session_id": "cs_start_1",
                "status": "pending",
            }
        ])
        self.ciak_clients = Collection([
            {"id": "client-1", "email": "start@example.com", "name": "Mario"}
        ])
        self.ciak_client_login_tokens = Collection()
        self.ciak_onboarding_emails = Collection()


@pytest.mark.asyncio
async def test_admin_retry_start_generates_fresh_delivery_and_resolves_recovery(monkeypatch):
    database = DB()
    monkeypatch.setattr(ciak_admin, "db", database)
    calls = {}

    async def delivered(_db, **kwargs):
        calls.update(kwargs)
        return True

    monkeypatch.setattr("services.ciak_start_delivery.deliver_start_access", delivered)

    result = await ciak_admin.retry_consegna_start(
        ciak_admin.RetryStartDeliveryRequest(recovery_id="recovery-1"),
        admin=type("Admin", (), {"email": "admin@ciak.io"})(),
    )

    assert result["success"] is True
    assert calls["client_id"] == "client-1"
    assert database.ciak_client_access_recovery.docs[0]["status"] == "resolved"


@pytest.mark.asyncio
async def test_failed_smtp_is_audited_and_recoverable_without_bearer_token(monkeypatch):
    from services import ciak_start_delivery

    database = DB()
    monkeypatch.setattr(
        ciak_start_delivery,
        "_send_email",
        lambda *args: (False, "SMTP down"),
    )

    sent = await ciak_start_delivery.deliver_start_access(
        database,
        client_id="client-1",
        email="start@example.com",
        name="Mario",
        paid_at="2026-08-12T10:00:00+00:00",
        checkout_session_id="cs_start_1",
    )

    assert sent is False
    assert database.ciak_onboarding_emails.docs[0]["sent"] is False
    recovery = database.ciak_client_access_recovery.docs[0]
    assert recovery["status"] == "pending"
    assert recovery["tier"] == "start"
    assert "token=" not in repr(database.ciak_onboarding_emails.docs)
    assert "token=" not in repr(database.ciak_client_access_recovery.docs)
