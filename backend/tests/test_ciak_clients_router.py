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
                    "start_credit_amount": 49900,
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
        def __init__(self, amount, currency="eur", success_url="", cancel_url="", metadata=None):
            self.amount = amount
            self.currency = currency
            self.success_url = success_url
            self.cancel_url = cancel_url
            self.metadata = metadata or {}

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
            "start_credit_amount": 49900,
        }
    )

    assert payload["client"]["access_level"] == "cliente_start"
    assert payload["pricing"]["partnership"]["due_amount_cents"] == 229100
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
            "start_credit_amount": 49900,
        }
    )

    assert payload["start"]["credit_amount_cents"] == 49900
    assert payload["pricing"]["partnership"]["credit_amount_cents"] == 49900
    assert payload["pricing"]["partnership"]["due_amount_cents"] == 229100


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
            "start_credit_amount": 49900,
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
            "start_credit_amount": 49900,
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
            "start_credit_amount": 49900,
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
            "start_credit_amount": 49900,
            "recommended_offer": "ciak_start",
        }
    )

    assert payload["partner_area"]["available"] is True
    assert payload["start"]["credit_amount_cents"] == 49900
    assert payload["pricing"]["partnership"]["credit_amount_cents"] == 49900
    assert payload["pricing"]["partnership"]["due_amount_cents"] == 229100


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
    assert body["pricing"]["partnership"]["credit_amount_cents"] == 49900
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
    assert response.json() == {"success": True, "start_credit_amount": 49900}
    client = fake_db.ciak_clients.docs[0]
    assert client["access_level"] == "cliente_start"
    assert client["start_credit_amount"] == 49900
    assert client["start_purchased_at"]
    assert client["start_progress"][0]["status"] == "todo"


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
    assert body["amount_cents"] == 49900
    assert body["credit_amount_cents"] == 49900

    request = FakeStripeCheckout.created_requests[0]["request"]
    assert request.amount == 499.0
    assert request.currency == "eur"
    assert request.success_url == "https://frontend.example/cliente?checkout=start&payment=success"
    assert request.cancel_url == "https://frontend.example/cliente?checkout=start&payment=cancel"
    assert request.metadata == {
        "tipo": "ciak_start",
        "client_id": "client-1",
        "email": "a@example.com",
    }


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


def test_start_checkout_rejects_when_start_is_not_the_allowed_offer(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    fake_db.ciak_clients.docs[0]["access_level"] = "cliente_blueprint"
    fake_db.ciak_clients.docs[0]["start_credit_amount"] = 0
    fake_db.ciak_clients.docs[0]["start_purchased_at"] = None
    fake_db.ciak_clients.docs[0]["offer_decision"] = "partnership"
    fake_db.ciak_clients.docs[0]["recommended_offer"] = "partnership"

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/start/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Ciak Start richiede la decisione esplicita del team dopo la call."
    assert FakeStripeCheckout.created_requests == []


def test_start_checkout_rejects_legacy_offer_flag_without_explicit_decision(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    fake_db.ciak_clients.docs[0]["access_level"] = "cliente_blueprint"
    fake_db.ciak_clients.docs[0]["start_credit_amount"] = 0
    fake_db.ciak_clients.docs[0]["start_purchased_at"] = None
    fake_db.ciak_clients.docs[0]["offer_decision"] = None
    fake_db.ciak_clients.docs[0]["recommended_offer"] = "partnership"
    fake_db.ciak_clients.docs[0]["start_offer_enabled"] = True

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/start/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Ciak Start richiede la decisione esplicita del team dopo la call."


@pytest.mark.parametrize(
    ("mutation", "expected_detail"),
    [
        (lambda db: db.diagnostic_sessions.docs[0].update(events=[]), "Il pagamento Blueprint da 27 EUR non risulta completato."),
        (lambda db: db.ciak_analisi.docs[0].update(bozza_inviata_at=None), "L'analisi Blueprint deve essere consegnata prima di proporre Ciak Start."),
        (lambda db: db.diagnostic_sessions.docs[0].update(current_state="call_booked"), "La call Blueprint deve essere completata prima di acquistare Ciak Start."),
    ],
)
def test_start_checkout_requires_completed_blueprint_path(
    monkeypatch, client_app, fake_db, mutation, expected_detail
):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    fake_db.ciak_clients.docs[0].update(
        access_level="cliente_blueprint",
        start_credit_amount=0,
        start_purchased_at=None,
    )
    mutation(fake_db)

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/start/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code in (403, 409)
    assert response.json()["detail"] == expected_detail
    assert FakeStripeCheckout.created_requests == []


def test_partnership_checkout_applies_guaranteed_start_credit(monkeypatch, client_app, fake_db):
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.example")

    token = ciak_clients._create_client_jwt(fake_db.ciak_clients.docs[0])
    response = client_app.post(
        "/api/ciak/client/partnership/checkout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["checkout_url"] == "https://checkout.example/1"
    assert body["amount_cents"] == 229100
    assert body["credit_amount_cents"] == 49900

    request = FakeStripeCheckout.created_requests[0]["request"]
    assert request.amount == 2291.0
    assert request.currency == "eur"
    assert request.success_url == "https://frontend.example/cliente?checkout=partnership&payment=success"
    assert request.cancel_url == "https://frontend.example/cliente?checkout=partnership&payment=cancel"
    assert request.metadata == {
        "tipo": "partnership",
        "client_id": "client-1",
        "email": "a@example.com",
        "full_amount_cents": 279000,
        "credit_amount_cents": 49900,
        "due_amount_cents": 229100,
    }


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


def test_partnership_checkout_allows_blueprint_when_partnership_is_decided(monkeypatch, client_app, fake_db):
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

    assert response.status_code == 200
    body = response.json()
    assert body["amount_cents"] == 279000
    assert body["credit_amount_cents"] == 0
