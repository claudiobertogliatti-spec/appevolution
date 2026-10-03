import importlib.util
from pathlib import Path
import sys
import types
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "ciak_clients.py"
SPEC = importlib.util.spec_from_file_location("ciak_clients_under_test", MODULE_PATH)
ciak_clients = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(ciak_clients)

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    @staticmethod
    def _match(doc, query):
        """Valuta anche gli operatori `$nin` e `$in`, come fa MongoDB: un finto db che li
        ignora fa passare test su filtri che in produzione danno un altro risultato."""
        for key, value in query.items():
            if isinstance(value, dict) and ("$nin" in value or "$in" in value):
                if "$nin" in value and doc.get(key) in value["$nin"]:
                    return False
                if "$in" in value and doc.get(key) not in value["$in"]:
                    return False
            elif doc.get(key) != value:
                return False
        return True

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if self._match(doc, query):
                data = dict(doc)
                if projection and projection.get("_id") == 0:
                    data.pop("_id", None)
                return data
        return None

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                for key, value in update.get("$set", {}).items():
                    target = doc
                    *path, last = key.split(".")
                    for part in path:
                        target = target.setdefault(part, {})
                    target[last] = value
                for key in update.get("$unset", {}):
                    doc.pop(key, None)
                return type("Result", (), {"matched_count": 1, "modified_count": 1})()
        return type("Result", (), {"matched_count": 0, "modified_count": 0})()

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("Result", (), {"inserted_id": doc.get("id")})()


class FakeDb:
    def __init__(self):
        self.ciak_clients = FakeCollection(
            [
                {
                    "id": "client-1",
                    "email": "a@example.com",
                    "access_level": "cliente_start",
                    "session_token": "token-1",
                    "blueprint_score": 42,
                    "recommended_offer": "ciak_start",
                    "start_credit_amount": 39000,
                    "analysis_status": "inviata",
                    "analysis_title": "Analisi",
                    "offer_decision": "ciak_start",
                }
            ]
        )
        self.ciak_analisi = FakeCollection(
            [
                {
                    "session_token": "token-1",
                    "stato": "inviata",
                    "bozza_inviata_at": "2026-08-12T09:00:00+00:00",
                    "analisi_definitiva": {"titolo": "Analisi", "roadmap": []},
                    "script_call": {"internal": True},
                }
            ]
        )
        self.diagnostic_sessions = FakeCollection(
            [{
                "session_token": "token-1",
                "current_state": "call_done",
                "events": [{"event": "stripe_payment_completed", "timestamp": "2026-08-12T08:00:00+00:00"}],
            }]
        )
        self.ciak_client_login_tokens = FakeCollection()
        self.users = FakeCollection()
        self.partner_journey_steps = FakeCollection(
            [{"partner_id": "client-1", "step_id": "04-posizionamento", "status": "in_progress", "data": {}}]
        )


class FakeCheckoutSession:
    def __init__(self, session_id="sess_123", url="https://checkout.example/session"):
        self.session_id = session_id
        self.url = url


class FakeStripeCheckout:
    created_requests = []

    def __init__(self, api_key: str, webhook_url: str = ""):
        self.api_key = api_key
        self.webhook_url = webhook_url

    async def create_checkout_session(self, request):
        self.__class__.created_requests.append(
            {
                "api_key": self.api_key,
                "webhook_url": self.webhook_url,
                "request": request,
            }
        )
        return FakeCheckoutSession(
            session_id=f"sess_{len(self.__class__.created_requests)}",
            url=f"https://checkout.example/{len(self.__class__.created_requests)}",
        )


@pytest.fixture
def fake_db():
    return FakeDb()


@pytest.fixture
def client_app(fake_db):
    app = FastAPI()
    ciak_clients.set_db(fake_db)
    app.include_router(ciak_clients.router)
    with TestClient(app) as client:
        yield client


@pytest.fixture(autouse=True)
def fake_stripe_checkout_module(monkeypatch):
    FakeStripeCheckout.created_requests = []
    monkeypatch.setenv("JWT_SECRET", "test-client-secret")
    checkout_module = types.ModuleType("emergentintegrations.payments.stripe.checkout")

    class CheckoutSessionRequest:
        def __init__(self, amount, currency="eur", success_url="", cancel_url="",
                     metadata=None, payment_method_types=None):
            self.amount = amount
            self.currency = currency
            self.success_url = success_url
            self.cancel_url = cancel_url
            self.metadata = metadata or {}
            self.payment_method_types = payment_method_types or ["card"]

    checkout_module.StripeCheckout = FakeStripeCheckout
    checkout_module.CheckoutSessionRequest = CheckoutSessionRequest

    monkeypatch.setitem(sys.modules, "emergentintegrations", types.ModuleType("emergentintegrations"))
    monkeypatch.setitem(sys.modules, "emergentintegrations.payments", types.ModuleType("emergentintegrations.payments"))
    monkeypatch.setitem(sys.modules, "emergentintegrations.payments.stripe", types.ModuleType("emergentintegrations.payments.stripe"))
    monkeypatch.setitem(sys.modules, "emergentintegrations.payments.stripe.checkout", checkout_module)


@pytest.mark.asyncio
async def test_dashboard_payload_contains_credit_and_analysis(fake_db):
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_start",
            "session_token": "token-1",
            "blueprint_score": 42,
            "recommended_offer": "ciak_start",
            "start_credit_amount": 39000,
        }
    )

    assert payload["client"]["access_level"] == "cliente_start"
    assert payload["pricing"]["partnership"]["due_amount_cents"] == 260000
    assert payload["analysis"]["status"] == "inviata"
    assert "script_call" not in payload["analysis"]
    assert payload["partner_area"]["available"] is False


@pytest.mark.asyncio
async def test_dashboard_retains_start_credit_for_promoted_partner(fake_db):
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "partner",
            "session_token": "token-1",
            "blueprint_score": 42,
            "recommended_offer": "partnership",
            "start_credit_amount": 39000,
        }
    )

    assert payload["start"]["credit_amount_cents"] == 39000
    assert payload["pricing"]["partnership"]["credit_amount_cents"] == 39000
    assert payload["pricing"]["partnership"]["due_amount_cents"] == 260000


@pytest.mark.asyncio
async def test_dashboard_unlocks_partner_area_from_canonical_user_activation(fake_db):
    ciak_clients.set_db(fake_db)
    fake_db.users.docs.append(
        {
            "id": "user-1",
            "email": "a@example.com",
            "stato_cliente": "partner_attivo",
            "partnership_attiva": True,
        }
    )
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_start",
            "session_token": "token-1",
            "start_credit_amount": 39000,
        }
    )

    assert payload["partner_area"]["available"] is True
    assert payload["partner_area"]["status"] == "attiva"
    assert payload["client"]["access_level"] == "partner"
    assert "partnership_attiva" not in payload["client"]
    assert "stato_cliente" not in payload["client"]


@pytest.mark.asyncio
async def test_dashboard_keeps_start_clients_locked_without_activation(fake_db):
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_start",
            "session_token": "token-1",
            "start_credit_amount": 39000,
            "partnership_attiva": False,
            "stato_cliente": "cliente_start",
        }
    )

    assert payload["partner_area"]["available"] is False
    assert payload["partner_area"]["status"] == "in_attesa_attivazione"


@pytest.mark.asyncio
async def test_dashboard_keeps_attivazione_partnership_locked(fake_db):
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_start",
            "session_token": "token-1",
            "start_credit_amount": 39000,
            "stato_cliente": "attivazione_partnership",
            "partnership_attiva": False,
        }
    )

    assert payload["partner_area"]["available"] is False
    assert payload["partner_area"]["status"] == "in_attesa_attivazione"


@pytest.mark.asyncio
async def test_dashboard_pricing_keeps_start_credit_when_user_activation_overlays_partner_state(fake_db):
    ciak_clients.set_db(fake_db)
    fake_db.users.docs.append(
        {
            "id": "user-1",
            "email": "a@example.com",
            "stato_cliente": "partner_attivo",
            "partnership_attiva": True,
        }
    )

    payload = await ciak_clients._dashboard_for_client(
        {
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_start",
            "session_token": "token-1",
            "start_credit_amount": 39000,
            "recommended_offer": "ciak_start",
        }
    )

    assert payload["partner_area"]["available"] is True
    assert payload["start"]["credit_amount_cents"] == 39000
    assert payload["pricing"]["partnership"]["credit_amount_cents"] == 39000
    assert payload["pricing"]["partnership"]["due_amount_cents"] == 260000


def test_magic_login_returns_token_and_client(monkeypatch, client_app, fake_db):
    async def fake_verify_magic_login_token(db, token):
        assert db is fake_db
        assert token == "magic-token"
        return fake_db.ciak_clients.docs[0]

    monkeypatch.setattr(ciak_clients, "verify_magic_login_token", fake_verify_magic_login_token)

    response = client_app.post(
        "/api/ciak/client/auth/magic-login",
        json={"token": "magic-token"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token"]
    assert body["client"]["id"] == "client-1"
    assert body["client"]["access_level"] == "cliente_start"


def test_magic_login_fails_closed_without_jwt_secret_without_burning_magic_token(monkeypatch, client_app, fake_db):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    called = {"verify_magic_login_token": False}

    async def fake_verify_magic_login_token(db, token):
        called["verify_magic_login_token"] = True
        assert db is fake_db
        assert token == "magic-token"
        return fake_db.ciak_clients.docs[0]

    monkeypatch.setattr(ciak_clients, "verify_magic_login_token", fake_verify_magic_login_token)

    response = client_app.post(
        "/api/ciak/client/auth/magic-login",
        json={"token": "magic-token"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "JWT cliente non configurato"
    assert called["verify_magic_login_token"] is False


def test_magic_login_returns_effective_access_level(monkeypatch, client_app, fake_db):
    fake_db.users.docs.append(
        {
            "id": "user-1",
            "email": "a@example.com",
            "stato_cliente": "partner_attivo",
            "partnership_attiva": True,
        }
    )

    async def fake_verify_magic_login_token(db, token):
        assert db is fake_db
        assert token == "magic-token"
        return fake_db.ciak_clients.docs[0]

    monkeypatch.setattr(ciak_clients, "verify_magic_login_token", fake_verify_magic_login_token)

    response = client_app.post(
        "/api/ciak/client/auth/magic-login",
        json={"token": "magic-token"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["client"]["access_level"] == "partner"
    assert "partnership_attiva" not in body["client"]
    assert "stato_cliente" not in body["client"]


def test_me_and_dashboard_accept_issued_client_token(monkeypatch, client_app, fake_db):
    fake_db.users.docs.append(
        {
            "id": "user-1",
            "email": "a@example.com",
            "stato_cliente": "partner_attivo",
            "partnership_attiva": True,
        }
    )

    async def fake_verify_magic_login_token(db, token):
        assert db is fake_db
        assert token == "magic-token"
        return fake_db.ciak_clients.docs[0]

    monkeypatch.setattr(ciak_clients, "verify_magic_login_token", fake_verify_magic_login_token)

    login_response = client_app.post(
        "/api/ciak/client/auth/magic-login",
        json={"token": "magic-token"},
    )
    assert login_response.status_code == 200

    auth_header = {"Authorization": f"Bearer {login_response.json()['token']}"}

    me_response = client_app.get("/api/ciak/client/me", headers=auth_header)
    dashboard_response = client_app.get("/api/ciak/client/dashboard", headers=auth_header)

    assert me_response.status_code == 200
    assert me_response.json()["client"]["email"] == "a@example.com"
    assert me_response.json()["client"]["access_level"] == "partner"
    assert "session_token" not in me_response.json()["client"]

    assert dashboard_response.status_code == 200
    body = dashboard_response.json()
    assert body["client"]["access_level"] == "partner"
    assert body["analysis"]["title"] == "Analisi"
    assert body["pricing"]["partnership"]["credit_amount_cents"] == 39000
    assert body["partner_area"]["status"] == "attiva"


def test_offer_decision_rejects_unauthenticated_callers(client_app):
    response = client_app.post(
        "/api/ciak/client/admin/offer-decision",
        json={
            "client_id": "client-1",
            "offer_decision": "partnership",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Autenticazione richiesta"


def test_offer_decision_accepts_admin_jwt(monkeypatch, client_app, fake_db):
    monkeypatch.setattr(
        ciak_clients,
        "decode_token",
        lambda token: SimpleNamespace(role="admin", email="admin@example.com", user_id="admin-1"),
    )

    response = client_app.post(
        "/api/ciak/client/admin/offer-decision",
        json={
            "client_id": "client-1",
            "offer_decision": "partnership",
        },
        headers={"Authorization": "Bearer admin-token"},
    )

    assert response.status_code == 200
    assert response.json() == {"success": True}
    client = fake_db.ciak_clients.docs[0]
    assert client["offer_decision"] == "partnership"
    assert client["offer_decided_by"] == "admin@example.com"
    assert client["offer_decided_at"]
    assert client["offer_decision_context"]["diagnostic_state"] == "call_done"


def test_offer_decision_rejects_before_call_is_done(monkeypatch, client_app, fake_db):
    monkeypatch.setattr(
        ciak_clients,
        "decode_token",
        lambda token: SimpleNamespace(role="admin", email="admin@example.com", user_id="admin-1"),
    )
    fake_db.diagnostic_sessions.docs[0]["current_state"] = "call_booked"

    response = client_app.post(
        "/api/ciak/client/admin/offer-decision",
        json={"client_id": "client-1", "offer_decision": "ciak_start"},
        headers={"Authorization": "Bearer admin-token"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "La decisione commerciale si registra solo dopo la call completata."


def test_activate_start_rejects_unauthenticated_callers(client_app):
    response = client_app.post(
        "/api/ciak/client/start/activate",
        json={"client_id": "client-1"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Autenticazione richiesta"


def test_activate_start_accepts_internal_key(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("INTERNAL_API_KEY", "internal-secret")
    fake_db.ciak_clients.docs[0]["access_level"] = "cliente_blueprint"
    fake_db.ciak_clients.docs[0]["start_credit_amount"] = 0
    fake_db.ciak_clients.docs[0]["start_progress"] = []

    response = client_app.post(
        "/api/ciak/client/start/activate",
        json={"client_id": "client-1"},
        headers={"X-Internal-Key": "internal-secret"},
    )

    assert response.status_code == 200
    assert response.json() == {"success": True, "start_credit_amount": 39000}
    client = fake_db.ciak_clients.docs[0]
    assert client["access_level"] == "cliente_start"
    assert client["start_credit_amount"] == 39000
    assert client["start_purchased_at"]
    # `start_progress` e' stato dismesso: /start/activate non lo semina piu'.
    assert client.get("start_progress") == []


def test_start_checkout_creates_499_euro_session(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.example")
    fake_db.ciak_clients.docs[0]["access_level"] = "cliente_blueprint"
    fake_db.ciak_clients.docs[0]["start_credit_amount"] = 0
    fake_db.ciak_clients.docs[0]["start_purchased_at"] = None
    fake_db.ciak_clients.docs[0]["start_progress"] = []

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/start/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["checkout_url"] == "https://checkout.example/1"
    assert body["amount_cents"] == 39000
    assert body["credit_amount_cents"] == 39000

    request = FakeStripeCheckout.created_requests[0]["request"]
    assert request.amount == 390.0
    assert request.currency == "eur"
    assert request.success_url == "https://frontend.example/cliente?checkout=start&payment=success"
    assert request.cancel_url == "https://frontend.example/cliente?checkout=start&payment=cancel"
    assert request.metadata == {
        "tipo": "ciak_start",
        "client_id": "client-1",
        "email": "a@example.com",
    }


def test_start_live_checkout_closed_before_stripe_even_for_eligible_client(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_live_fixture")
    monkeypatch.delenv("CIAK_PAID_OFFERS_LEGAL_APPROVED", raising=False)
    monkeypatch.delenv("CIAK_PAID_OFFERS_FISCAL_APPROVED", raising=False)
    fake_db.ciak_clients.docs[0].update(access_level="cliente_blueprint", start_credit_amount=0,
                                      start_purchased_at=None, start_progress=[])
    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post("/api/ciak/client/start/checkout", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "PAID_OFFER_CHECKOUT_CLOSED"
    assert FakeStripeCheckout.created_requests == []


def test_start_checkout_rejects_existing_start_accounts(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])

    response = client_app.post(
        "/api/ciak/client/start/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Ciak Start risulta gia' attivo su questo account."
    assert FakeStripeCheckout.created_requests == []


def test_start_checkout_allowed_after_call_without_offer_decision(monkeypatch, client_app, fake_db):
    """Modello Blueprint GRATUITO: dopo la call il cliente acquista Ciak Start da solo,
    senza `offer_decision` manuale del team e anche se il suggerimento interno era
    'partnership'. L'unico requisito e' la call completata (call_done)."""
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.example")
    fake_db.ciak_clients.docs[0].update(
        access_level="cliente_blueprint",
        start_credit_amount=0,
        start_purchased_at=None,
        start_progress=[],
        offer_decision=None,
        recommended_offer="partnership",
        start_offer_enabled=True,
    )

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/start/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert FakeStripeCheckout.created_requests


def test_start_checkout_requires_call_done(monkeypatch, client_app, fake_db):
    """L'unico gate residuo del modello gratuito: la call dev'essere completata."""
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    fake_db.ciak_clients.docs[0].update(
        access_level="cliente_blueprint",
        start_credit_amount=0,
        start_purchased_at=None,
    )
    fake_db.diagnostic_sessions.docs[0].update(current_state="call_booked")

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/start/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "La call Blueprint deve essere completata prima di acquistare Ciak Start."
    assert FakeStripeCheckout.created_requests == []


def test_start_checkout_ok_without_payment_or_delivered_analysis(monkeypatch, client_app, fake_db):
    """Blueprint GRATUITO: niente pagamento (events vuoti) e analisi non ancora
    consegnata (bozza_inviata_at assente) NON bloccano il checkout se la call e' fatta."""
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.example")
    fake_db.ciak_clients.docs[0].update(
        access_level="cliente_blueprint",
        start_credit_amount=0,
        start_purchased_at=None,
        start_progress=[],
    )
    fake_db.diagnostic_sessions.docs[0].update(events=[])  # nessun pagamento
    fake_db.ciak_analisi.docs[0].update(bozza_inviata_at=None)  # analisi non consegnata

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/start/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert FakeStripeCheckout.created_requests


def test_partnership_checkout_requires_proposal_even_with_start_credit(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.example")

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/partnership/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PARTNERSHIP_PROPOSAL_REQUIRED"
    assert FakeStripeCheckout.created_requests == []


def test_partnership_checkout_rejects_fresh_blueprint_without_decision(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    fake_db.ciak_clients.docs[0]["access_level"] = "cliente_blueprint"
    fake_db.ciak_clients.docs[0]["start_credit_amount"] = 0
    fake_db.ciak_clients.docs[0]["start_purchased_at"] = None
    fake_db.ciak_clients.docs[0]["recommended_offer"] = "ciak_start"
    fake_db.ciak_clients.docs[0]["offer_decision"] = "ciak_start"

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/partnership/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "La Partnership si attiva solo dopo la call e la decisione dedicata."
    assert FakeStripeCheckout.created_requests == []


def test_partnership_checkout_requires_proposal_even_when_partnership_is_decided(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    fake_db.ciak_clients.docs[0]["access_level"] = "cliente_blueprint"
    fake_db.ciak_clients.docs[0]["start_credit_amount"] = 0
    fake_db.ciak_clients.docs[0]["start_purchased_at"] = None
    fake_db.ciak_clients.docs[0]["recommended_offer"] = "partnership"
    fake_db.ciak_clients.docs[0]["offer_decision"] = "partnership"

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/partnership/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PARTNERSHIP_PROPOSAL_REQUIRED"
    assert FakeStripeCheckout.created_requests == []


@pytest.mark.asyncio
async def test_dashboard_start_consegne_sono_le_date_dell_email(fake_db):
    ciak_clients.set_db(fake_db)
    start = {
        "id": "client-1",
        "email": "a@example.com",
        "access_level": "cliente_start",
        "session_token": "token-1",
        "start_credit_amount": 39000,
        "start_purchased_at": "2026-10-01T07:02:00+00:00",
    }
    payload = await ciak_clients._dashboard_for_client(start)
    # 7 / 14 / 21 giorni dal pagamento: stesse date dell'email di attivazione.
    assert payload["start"]["consegne"] == ["08/10/2026", "15/10/2026", "22/10/2026"]

    # Senza Start (o senza data di pagamento) non si inventa nessuna scadenza.
    senza_data = {k: v for k, v in start.items() if k != "start_purchased_at"}
    assert (await ciak_clients._dashboard_for_client(senza_data))["start"]["consegne"] == []
    blueprint = {"id": "c2", "email": "b@example.com", "access_level": "cliente_blueprint", "session_token": "token-1"}
    assert (await ciak_clients._dashboard_for_client(blueprint))["start"]["consegne"] == []


# ─── Le domande di Ciak Start ──────────────────────────────────────────────

def _cliente_loggato(monkeypatch, client_app, fake_db):
    async def fake_verify_magic_login_token(db, token):
        return fake_db.ciak_clients.docs[0]

    monkeypatch.setattr(ciak_clients, "verify_magic_login_token", fake_verify_magic_login_token)
    login = client_app.post("/api/ciak/client/auth/magic-login", json={"token": "magic-token"})
    assert login.status_code == 200, login.text
    token = login.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def _risposte_complete():
    from services.ciak_start_domande import DOMANDE_START_IDS

    return {k: f"Risposta di prova per {k}" for k in DOMANDE_START_IDS}


def test_start_risposte_si_salvano_a_pezzi_senza_toccare_lo_stato(monkeypatch, client_app, fake_db):
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    r = client_app.put(
        "/api/ciak/client/start/risposte",
        json={"answers": {"nicchia": "  Donne dopo i 40 che vogliono ripartire  ", "estranea": "x"}},
        headers=auth,
    )
    assert r.status_code == 200
    # Solo le domande Start, ripulite; nessuna chiave estranea.
    assert r.json()["answers"] == {"nicchia": "Donne dopo i 40 che vogliono ripartire"}
    assert r.json()["completato_at"] is None
    step = fake_db.partner_journey_steps.docs[0]
    assert step["status"] == "in_progress"  # la consegna resta approvata dal team
    assert "approval_status" not in step

    # Una seconda tornata aggiunge, non sovrascrive.
    r2 = client_app.put("/api/ciak/client/start/risposte", json={"answers": {"promessa": "Ritrovare energia in tre mesi"}}, headers=auth)
    assert set(r2.json()["answers"]) == {"nicchia", "promessa"}
    assert client_app.get("/api/ciak/client/start/risposte", headers=auth).json()["answers"]["nicchia"].startswith("Donne")


def test_start_risposte_non_si_inviano_se_ne_manca_qualcuna(monkeypatch, client_app, fake_db):
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    r = client_app.put(
        "/api/ciak/client/start/risposte",
        json={"answers": {"nicchia": "Donne dopo i 40 che vogliono ripartire"}, "completato": True},
        headers=auth,
    )
    assert r.status_code == 422
    assert "promessa" in r.json()["detail"]["mancanti"]
    assert "answers_completed_at" not in fake_db.partner_journey_steps.docs[0]["data"]


def test_start_risposte_inviate_segnano_il_momento_per_il_team(monkeypatch, client_app, fake_db):
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    r = client_app.put(
        "/api/ciak/client/start/risposte",
        json={"answers": _risposte_complete(), "completato": True},
        headers=auth,
    )
    assert r.status_code == 200
    assert r.json()["completato_at"]
    assert fake_db.partner_journey_steps.docs[0]["data"]["answers_completed_at"] == r.json()["completato_at"]
    assert fake_db.ciak_clients.docs[0]["events"][-1]["event"] == "start_risposte_inviate"


def test_start_risposte_negate_a_chi_non_ha_start(monkeypatch, client_app, fake_db):
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    doc = fake_db.ciak_clients.docs[0]
    doc.update({"access_level": "cliente_blueprint", "start_credit_amount": None})
    assert client_app.get("/api/ciak/client/start/risposte", headers=auth).status_code == 403
    assert client_app.put("/api/ciak/client/start/risposte", json={"answers": {"nicchia": "abcdefghij"}}, headers=auth).status_code == 403


# ─── Il marchio di Ciak Start ──────────────────────────────────────────────

def _con_step_marchio(fake_db):
    fake_db.partner_journey_steps.docs.append(
        {"partner_id": "client-1", "step_id": "03-brand-kit", "status": "in_progress", "data": {}}
    )


def _marchio_completo():
    return {
        "palette_id": "naturale", "font_id": "classico", "tono_id": "caldo",
        "parole_chiave": ["calma", "ascolto", "metodo"],
    }


def test_start_marchio_offre_le_opzioni_e_le_scelte_gia_fatte(monkeypatch, client_app, fake_db):
    _con_step_marchio(fake_db)
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    r = client_app.get("/api/ciak/client/start/marchio", headers=auth)
    assert r.status_code == 200
    corpo = r.json()
    assert [p["id"] for p in corpo["opzioni"]["palette"]][0] == "sicuro"
    assert {"moderno", "classico"} <= {f["id"] for f in corpo["opzioni"]["font"]}
    assert corpo["valori"] == {} and corpo["completato_at"] is None


def test_start_marchio_si_salva_a_pezzi_nella_forma_dei_generatori(monkeypatch, client_app, fake_db):
    _con_step_marchio(fake_db)
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    r = client_app.put(
        "/api/ciak/client/start/marchio",
        json={"valori": {"palette_id": "naturale", "font_id": "classico", "evil": "x", "foto_url": "javascript:alert(1)"}},
        headers=auth,
    )
    assert r.status_code == 200
    step = next(s for s in fake_db.partner_journey_steps.docs if s["step_id"] == "03-brand-kit")
    assert step["data"]["colore_primario"] == "#1F4D3A"  # quello che la vetrina legge
    assert step["data"]["colors"][0] == "#1F4D3A"  # quello del brand kit partner
    assert step["data"]["font"] == "Lora"
    assert "evil" not in step["data"]
    assert step["data"]["foto_url"] == ""  # indirizzo non https: scartato
    assert step["status"] == "in_progress" and "approval_status" not in step
    assert r.json()["valori"]["palette_id"] == "naturale"


def test_start_marchio_non_si_invia_se_manca_una_scelta(monkeypatch, client_app, fake_db):
    _con_step_marchio(fake_db)
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    r = client_app.put(
        "/api/ciak/client/start/marchio",
        json={"valori": {"palette_id": "sicuro"}, "completato": True},
        headers=auth,
    )
    assert r.status_code == 422
    assert set(r.json()["detail"]["mancanti"]) == {"font_id", "tono_id", "parole_chiave"}


def test_start_marchio_inviato_segna_il_momento_e_logo_foto_sono_facoltativi(monkeypatch, client_app, fake_db):
    _con_step_marchio(fake_db)
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    r = client_app.put(
        "/api/ciak/client/start/marchio",
        json={"valori": _marchio_completo(), "completato": True},
        headers=auth,
    )
    assert r.status_code == 200 and r.json()["completato_at"]
    step = next(s for s in fake_db.partner_journey_steps.docs if s["step_id"] == "03-brand-kit")
    assert step["data"]["brand_completed_at"] == r.json()["completato_at"]
    assert fake_db.ciak_clients.docs[0]["events"][-1]["event"] == "start_marchio_inviato"


def test_start_marchio_negato_a_chi_non_ha_start(monkeypatch, client_app, fake_db):
    _con_step_marchio(fake_db)
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    fake_db.ciak_clients.docs[0].update({"access_level": "cliente_blueprint", "start_credit_amount": None})
    assert client_app.get("/api/ciak/client/start/marchio", headers=auth).status_code == 403
    assert client_app.put("/api/ciak/client/start/marchio", json={"valori": {"palette_id": "sicuro"}}, headers=auth).status_code == 403


# ─── Avviso al team e materiali approvati ───────────────────────────────────

def test_il_team_riceve_un_avviso_quando_il_cliente_invia_le_risposte(monkeypatch, client_app, fake_db):
    import types as _types

    chiamate = []

    async def _notifica(partner_id, msg, **kw):
        chiamate.append((partner_id, msg))

    modulo = _types.ModuleType("routers.partner_journey")
    modulo._notify_admin_partner_activity = _notifica
    monkeypatch.setitem(sys.modules, "routers.partner_journey", modulo)
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    # Una sola risposta parziale NON avvisa nessuno.
    client_app.put("/api/ciak/client/start/risposte", json={"answers": {"nicchia": "Donne dopo i quaranta"}}, headers=auth)
    assert chiamate == []
    client_app.put("/api/ciak/client/start/risposte", json={"answers": _risposte_complete(), "completato": True}, headers=auth)
    assert chiamate == [("client-1", "ha inviato le sue risposte (Ciak Start)")]


def test_se_l_avviso_al_team_si_rompe_il_cliente_non_se_ne_accorge(monkeypatch, client_app, fake_db):
    import types as _types

    async def _rotta(partner_id, msg, **kw):
        raise RuntimeError("telegram giu'")

    modulo = _types.ModuleType("routers.partner_journey")
    modulo._notify_admin_partner_activity = _rotta
    monkeypatch.setitem(sys.modules, "routers.partner_journey", modulo)
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    r = client_app.put("/api/ciak/client/start/risposte", json={"answers": _risposte_complete(), "completato": True}, headers=auth)
    assert r.status_code == 200 and r.json()["completato_at"]


def test_i_materiali_approvati_non_portano_html_ne_istruzioni_dns_del_team(monkeypatch, client_app, fake_db):
    visti = {}

    class _Cursore:
        def sort(self, *a, **k):
            return self

        async def to_list(self, n):
            return []

    class _Coll:
        def find(self, query, projection=None):
            visti["query"], visti["projection"] = query, projection
            return _Cursore()

    fake_db.ciak_start_deliverables = _Coll()
    auth = _cliente_loggato(monkeypatch, client_app, fake_db)
    assert client_app.get("/api/ciak/client/start/deliverables", headers=auth).status_code == 200
    assert visti["query"] == {"partner_id": "client-1", "approval_status": "approved"}
    assert visti["projection"]["html"] == 0 and visti["projection"]["dns_checklist"] == 0


# ─── Pagina Blueprint del cliente: solo un breve riassunto + il PDF ──────────

def _client_dash():
    return {
        "id": "client-1",
        "email": "a@example.com",
        "access_level": "cliente_blueprint",
        "session_token": "token-1",
        "blueprint_score": 42,
    }


def _blueprint_doc(**extra):
    doc = {
        "session_token": "token-1",
        "stato": "pronto",
        "pdf_url": "https://cdn.example/bp.pdf",
        "consegna_inviata_at": "2026-10-01T10:00:00+00:00",
        "payload": {
            "meta": {"progetto": "Read Me Academy"},
            "sezioni": {
                "sintesi": {"lead": "Una competenza reale, un business ancora da costruire."},
                "problema": {"lead": "Senza di te in aula non succede nulla."},
                "roadmap": {"steps": [{"h": "Fase 1", "p": "interna"}]},
            },
        },
    }
    doc.update(extra)
    return doc


@pytest.mark.asyncio
async def test_dashboard_espone_riassunto_blueprint_e_pdf_consegnato(fake_db):
    fake_db.ciak_blueprints = FakeCollection([_blueprint_doc()])
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(_client_dash())

    bp = payload["blueprint"]
    assert bp["meta"]["progetto"] == "Read Me Academy"
    assert bp["sintesi"].startswith("Una competenza reale")
    assert bp["problema"] == "Senza di te in aula non succede nulla."
    assert bp["pdf_url"] == "https://cdn.example/bp.pdf"
    # la Home e' personalizzata sul Blueprint: tutta la proiezione client-facing, ma niente
    # punteggio ne' payload grezzo
    assert set(bp) == {
        "meta", "sintesi", "potenziale", "problema", "forza", "limiti", "manca", "rischio", "roadmap", "pdf_url",
    }
    assert "payload" not in bp and "score" not in bp
    assert bp["roadmap"] == [{"h": "Fase 1", "p": "interna"}]


@pytest.mark.asyncio
async def test_pdf_non_esposto_se_il_blueprint_non_e_stato_consegnato(fake_db):
    doc = _blueprint_doc()
    doc.pop("consegna_inviata_at")
    fake_db.ciak_blueprints = FakeCollection([doc])
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(_client_dash())

    assert payload["blueprint"]["sintesi"]
    assert payload["blueprint"]["pdf_url"] is None


@pytest.mark.asyncio
async def test_blueprint_non_pronto_o_assente_non_inventa_nulla(fake_db):
    ciak_clients.set_db(fake_db)
    fake_db.ciak_blueprints = FakeCollection([_blueprint_doc(stato="in_generazione")])
    assert (await ciak_clients._dashboard_for_client(_client_dash()))["blueprint"] is None

    fake_db.ciak_blueprints = FakeCollection([_blueprint_doc(session_token="altro-token")])
    assert (await ciak_clients._dashboard_for_client(_client_dash()))["blueprint"] is None


@pytest.mark.asyncio
async def test_dashboard_regge_se_la_lettura_del_blueprint_fallisce(fake_db):
    class Rotta:
        async def find_one(self, *a, **k):
            raise RuntimeError("db giu'")

    fake_db.ciak_blueprints = Rotta()
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(_client_dash())
    assert payload["blueprint"] is None
    assert payload["client"]["email"] == "a@example.com"


def test_la_sales_chat_dell_area_cliente_non_commenta_i_numeri_del_simulatore():
    """Il prompt e' costruito dentro la route: controlliamo che la regola ci sia ancora."""
    import inspect

    src = inspect.getsource(ciak_clients.sales_chat)
    assert "Simulatore Corsi" in src
    assert "NON commentare, interpretare o validare i suoi numeri" in src
    assert "non stimare mai vendite, incassi o tempi di rientro" in src


# ─── Home e pagina Partnership: proposta, percorso consigliato, prontezza checkout ──────────

def _proposta_doc(**extra):
    doc = {
        "token": "tok-prop",
        "partner_id": "client-1",
        "prospect_email": "a@example.com",
        "stato": "inviata",
        "scadenza": "2999-01-01T00:00:00+00:00",
    }
    doc.update(extra)
    return doc


@pytest.mark.asyncio
async def test_dashboard_espone_la_proposta_attiva_per_contratto_e_pagamento(fake_db):
    fake_db.proposte = FakeCollection([_proposta_doc()])
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(_client_dash())

    assert payload["proposta"] == {
        "token": "tok-prop", "partner_id": "client-1", "stato": "inviata",
        "scadenza": "2999-01-01T00:00:00+00:00", "scaduta": False,
    }
    assert "checkout_readiness" in payload and isinstance(payload["checkout_readiness"], dict)


@pytest.mark.asyncio
async def test_senza_proposta_il_dashboard_dice_none_non_inventa_un_token(fake_db):
    fake_db.proposte = FakeCollection([])
    ciak_clients.set_db(fake_db)
    assert (await ciak_clients._dashboard_for_client(_client_dash()))["proposta"] is None


@pytest.mark.asyncio
async def test_proposta_scaduta_viene_dichiarata_scaduta_senza_token(fake_db):
    fake_db.proposte = FakeCollection([_proposta_doc(scadenza="2020-01-01T00:00:00+00:00")])
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(_client_dash())
    assert payload["proposta"] == {"scaduta": True}

    # anche una proposta gia' marcata 'scaduta' non lascia uscire il token
    fake_db.proposte = FakeCollection([_proposta_doc(stato="scaduta")])
    payload = await ciak_clients._dashboard_for_client(_client_dash())
    assert payload["proposta"] == {"scaduta": True}


@pytest.mark.asyncio
async def test_proposta_firmata_non_viene_trattata_come_scaduta_anche_a_data_passata(fake_db):
    fake_db.proposte = FakeCollection([_proposta_doc(stato="contratto_firmato", scadenza="2020-01-01T00:00:00+00:00")])
    ciak_clients.set_db(fake_db)
    payload = await ciak_clients._dashboard_for_client(_client_dash())
    assert payload["proposta"]["scaduta"] is False
    assert payload["proposta"]["token"] == "tok-prop"


@pytest.mark.asyncio
async def test_il_dashboard_espone_il_percorso_consigliato(fake_db):
    ciak_clients.set_db(fake_db)
    cliente = _client_dash()
    cliente["recommended_offer"] = "partnership"
    assert (await ciak_clients._dashboard_for_client(cliente))["raccomandata"] == "partnership"
    cliente["recommended_offer"] = "ciak_start"
    assert (await ciak_clients._dashboard_for_client(cliente))["raccomandata"] == "start"


def test_il_cliente_ottiene_la_sua_proposta_dalla_sua_area(monkeypatch, client_app, fake_db):
    chiamate = []

    async def finta(email, generated_by):
        chiamate.append((email, generated_by))
        return {"token": "tok-nuovo", "partner_id": "client-1", "scadenza": "2999-01-01T00:00:00+00:00",
                "stato": "inviata", "creata": True}

    stub = types.ModuleType("routers.proposta")
    stub.proposta_per_cliente = finta
    monkeypatch.setitem(sys.modules, "routers.proposta", stub)

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post("/api/ciak/client/partnership/proposta", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["token"] == "tok-nuovo"
    assert chiamate == [("a@example.com", {"id": "client-1", "email": "a@example.com"})]


def test_la_proposta_dell_area_cliente_richiede_il_login(client_app):
    assert client_app.post("/api/ciak/client/partnership/proposta").status_code in (401, 403)
