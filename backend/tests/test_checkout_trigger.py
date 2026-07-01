import pytest
from routers import checkout

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
        self.docs.append(dict(doc))
        return None

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


@pytest.mark.asyncio
async def test_handle_checkout_triggers_delivery(monkeypatch):
    captured = {"tasks": []}

    diag = {"_id": 1, "session_token": "tok", "user_email": "c@x.it", "user_name": "Cliente",
            "state_history": [], "events": [], "current_state": "report_generated"}

    class Coll:
        async def find_one(self, *a, **k): return diag
        async def replace_one(self, *a, **k): return None
    class DB:
        diagnostic_sessions = Coll()
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

    await checkout._handle_checkout_completed({
        "id": "cs_1", "amount_total": 6700,
        "metadata": {"tipo": "ciak_blueprint", "diagnostic_session_token": "tok"},
        "customer_email": "c@x.it",
    })
    # Must have scheduled at least 2 tasks: Systeme event + analisi delivery
    assert len(captured["tasks"]) >= 2, (
        f"Expected ≥2 create_task calls (Systeme + delivery), got {len(captured['tasks'])}"
    )


async def _noop(): return None


@pytest.mark.asyncio
async def test_handle_checkout_completed_creates_client_access_and_magic_token(monkeypatch):
    fake_db = FakeDB()
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
        coro.close()
        return None

    monkeypatch.setattr(asyncio, "create_task", fake_create_task)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", lambda **k: _noop())
    monkeypatch.setattr("services.ciak_analisi_delivery.processa_acquisto", lambda **k: _noop())

    await checkout._handle_checkout_completed(
        {
            "id": "cs_blueprint_1",
            "amount_total": 2700,
            "currency": "eur",
            "metadata": {"tipo": "ciak_blueprint", "diagnostic_session_token": "tok-blueprint"},
            "customer_email": "user@example.com",
        }
    )

    assert len(fake_db.ciak_clients.docs) == 1
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
