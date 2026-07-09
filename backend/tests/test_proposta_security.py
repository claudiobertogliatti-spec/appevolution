import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest


MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "proposta.py"
SPEC = importlib.util.spec_from_file_location("proposta_under_test", MODULE_PATH)
proposta = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(proposta)

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                data = dict(doc)
                if projection and projection.get("_id") == 0:
                    data.pop("_id", None)
                return data
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
            return type("Result", (), {"matched_count": 0, "modified_count": 0})()
        return type("Result", (), {"matched_count": 0, "modified_count": 0})()


class FakeDb:
    def __init__(self):
        self.proposte = FakeCollection(
            [
                {
                    "token": "proposal-token",
                    "partner_id": "partner-1",
                    "prospect_email": "buyer@example.com",
                    "prospect_nome": "Buyer Demo",
                    "pagamento_completato": False,
                }
            ]
        )
        self.users = FakeCollection([{"id": "partner-1", "email": "buyer@example.com"}])
        self.partners = FakeCollection()
        self.partner_journey_steps = FakeCollection()


@pytest.mark.asyncio
async def test_conferma_stripe_does_not_activate_partner_when_stripe_verification_errors(monkeypatch):
    fake_db = FakeDb()
    proposta.set_db(fake_db)

    class BoomSession:
        @staticmethod
        def retrieve(_session_id):
            raise RuntimeError("stripe temporarily unavailable")

    fake_stripe = SimpleNamespace(
        api_key=None,
        checkout=SimpleNamespace(Session=BoomSession),
    )
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    monkeypatch.setitem(sys.modules, "stripe", fake_stripe)

    async def forbidden(*args, **kwargs):
        raise AssertionError("side effect should not run without a verified Stripe payment")

    monkeypatch.setattr(proposta, "_add_systeme_tag", forbidden)
    monkeypatch.setattr(proposta, "_activate_partner_account_and_notify", forbidden)
    monkeypatch.setattr(proposta, "_seed_operativo_journey_from_funnel", forbidden)
    monkeypatch.setattr(proposta, "_notify_telegram", forbidden)

    result = await proposta.conferma_stripe(
        "proposal-token",
        proposta.ConfermaStripeRequest(session_id="cs_unverified"),
    )

    assert result == {"success": False, "error": "Pagamento non confermato da Stripe"}
    proposal = fake_db.proposte.docs[0]
    assert proposal["pagamento_completato"] is False
    assert fake_db.users.docs[0].get("role") != "partner"
