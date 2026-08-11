import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException


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

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("Result", (), {"inserted_id": doc.get("id")})()


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
        self.ciak_clients = FakeCollection([{"id": "client-1", "user_id": "partner-1", "email": "buyer@example.com"}])
        self.partners = FakeCollection()
        self.partner_journey_steps = FakeCollection()
        self.partnership_payment_audit = FakeCollection()


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


def test_admin_mutation_routes_require_the_canonical_admin_guard():
    route_dependencies = {
        route.path: [dependency.call for dependency in route.dependant.dependencies]
        for route in proposta.router.routes
    }
    assert proposta.require_ciak_admin in route_dependencies["/api/proposta/genera/{partner_id}"]
    assert proposta.require_ciak_admin in route_dependencies["/api/proposta/{token}/conferma-bonifico"]


@pytest.mark.parametrize("signature", [None, "", "data:image/png;base64,", "not-an-image"])
def test_signature_validation_rejects_missing_or_malformed_content(signature):
    with pytest.raises(HTTPException) as exc:
        proposta.validate_signature_payload(signature)
    assert exc.value.status_code == 422


def test_signature_validation_accepts_a_real_png_and_rejects_oversize():
    png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    decoded = proposta.validate_signature_payload(png)
    assert decoded.startswith(b"\x89PNG\r\n\x1a\n")
    with pytest.raises(HTTPException):
        proposta.validate_signature_payload("data:image/png;base64," + ("A" * 2_000_000))


def test_stripe_session_must_match_the_proposal_server_side():
    proposal = {
        "token": "proposal-token",
        "partner_id": "partner-1",
        "stripe_session_id_partnership": "cs_partnership",
        "contract_params": {"corrispettivo": 2790},
    }
    valid = SimpleNamespace(
        id="cs_partnership", payment_status="paid", mode="payment",
        amount_total=279000, currency="eur",
        metadata={"tipo": "partnership", "token": "proposal-token", "partner_id": "partner-1"},
    )
    proposta.validate_partnership_stripe_session(valid, proposal, "cs_partnership")

    mutations = [
        {"id": "cs_blueprint", "amount_total": 2700},
        {"metadata": {"tipo": "blueprint", "token": "proposal-token", "partner_id": "partner-1"}},
        {"metadata": {"tipo": "partnership", "token": "other", "partner_id": "partner-1"}},
        {"amount_total": 278900},
        {"currency": "usd"},
        {"payment_status": "unpaid"},
    ]
    for changes in mutations:
        candidate = SimpleNamespace(**{**vars(valid), **changes})
        with pytest.raises(HTTPException):
            proposta.validate_partnership_stripe_session(candidate, proposal, "cs_partnership")


@pytest.mark.asyncio
async def test_partial_finalization_is_retried_even_when_payment_was_already_marked(monkeypatch):
    fake_db = FakeDb()
    fake_db.proposte.docs[0].update({
        "pagamento_completato": True,
        "contratto_firmato_at": "2026-08-11T10:00:00+00:00",
        "finalizzazione_partnership": {"account": "done", "journey": "failed"},
    })
    proposta.set_db(fake_db)
    calls = []

    async def account(*args, **kwargs): calls.append("account")
    async def journey(*args, **kwargs): calls.append("journey")
    async def noop(*args, **kwargs): return None
    monkeypatch.setattr(proposta, "_activate_partner_account_and_notify", account)
    monkeypatch.setattr(proposta, "_seed_operativo_journey_from_funnel", journey)
    monkeypatch.setattr(proposta, "_add_systeme_tag", noop)
    monkeypatch.setattr(proposta, "_notify_telegram", noop)

    result = await proposta.finalize_partnership_payment(
        fake_db.proposte.docs[0], method="stripe", reference="cs_partnership"
    )
    assert result["complete"] is True
    assert calls == ["journey"]
    assert fake_db.users.docs[0]["role"] == "partner"


@pytest.mark.asyncio
async def test_bank_transfer_requires_receipt_and_signed_contract_before_activation():
    fake_db = FakeDb()
    proposta.set_db(fake_db)
    with pytest.raises(HTTPException) as exc:
        await proposta.conferma_bonifico("proposal-token", SimpleNamespace(id="admin-1", email="admin@example.com"))
    assert exc.value.status_code == 409
    assert fake_db.users.docs[0].get("role") != "partner"


@pytest.mark.asyncio
async def test_client_identity_reuses_existing_user_and_client_without_duplicates():
    fake_db = FakeDb()
    proposta.set_db(fake_db)
    identity = await proposta.resolve_canonical_client_identity("BUYER@example.com")
    assert identity == {
        "canonical_id": "partner-1", "client_id": "client-1",
        "user_id": "partner-1", "email": "buyer@example.com",
    }
    assert len(fake_db.users.docs) == 1
    assert len(fake_db.ciak_clients.docs) == 1
