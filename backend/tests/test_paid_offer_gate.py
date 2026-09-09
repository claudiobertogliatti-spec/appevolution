"""No live Start/Partnership checkout before both operational approvals."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

pytestmark = pytest.mark.unit


@pytest.fixture
def stripe_create(monkeypatch):
    import stripe
    create = AsyncMock(return_value=SimpleNamespace(id="cs_fixture", url="https://checkout.example/fixture"))
    monkeypatch.setattr(stripe.checkout.Session, "create_async", create)
    monkeypatch.delenv("CIAK_PAID_OFFERS_LEGAL_APPROVED", raising=False)
    monkeypatch.delenv("CIAK_PAID_OFFERS_FISCAL_APPROVED", raising=False)
    return create


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", ["ciak_start", "partnership", "attivazione_partnership"])
@pytest.mark.parametrize("legal,fiscal", [(None, None), ("true", None), (None, "true"), ("false", "true")])
async def test_live_checkout_cannot_reach_stripe_with_any_gate_open(monkeypatch, stripe_create, kind, legal, fiscal):
    for name, value in [("CIAK_PAID_OFFERS_LEGAL_APPROVED", legal), ("CIAK_PAID_OFFERS_FISCAL_APPROVED", fiscal)]:
        if value is not None:
            monkeypatch.setenv(name, value)
    with pytest.raises(HTTPException) as err:
        await StripeCheckout("sk_live_fixture").create_checkout_session(
            CheckoutSessionRequest(amount=390, metadata={"tipo": kind})
        )
    assert err.value.status_code == 503
    assert err.value.detail["code"] == "PAID_OFFER_CHECKOUT_CLOSED"
    stripe_create.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("key", ["sk_test_fixture", "rk_test_fixture"])
async def test_test_mode_still_creates_a_test_session(stripe_create, key):
    result = await StripeCheckout(key).create_checkout_session(
        CheckoutSessionRequest(amount=390, metadata={"tipo": "ciak_start"})
    )
    assert result.session_id == "cs_fixture"
    assert stripe_create.await_args.kwargs["line_items"][0]["price_data"]["unit_amount"] == 39000


@pytest.mark.asyncio
async def test_both_approvals_required_to_enable_live(monkeypatch, stripe_create):
    monkeypatch.setenv("CIAK_PAID_OFFERS_LEGAL_APPROVED", "true")
    monkeypatch.setenv("CIAK_PAID_OFFERS_FISCAL_APPROVED", "true")
    result = await StripeCheckout("sk_live_fixture").create_checkout_session(
        CheckoutSessionRequest(amount=2990, metadata={"tipo": "partnership"})
    )
    assert result.session_id == "cs_fixture"


@pytest.mark.asyncio
async def test_unrelated_product_is_not_disabled(stripe_create):
    result = await StripeCheckout("sk_live_fixture").create_checkout_session(
        CheckoutSessionRequest(amount=27, metadata={"tipo": "blueprint"})
    )
    assert result.session_id == "cs_fixture"


@pytest.mark.asyncio
@pytest.mark.parametrize("key", ["", "unknown", "rk_live_fixture"])
async def test_unknown_and_restricted_live_keys_do_not_bypass_gate(stripe_create, key):
    with pytest.raises(HTTPException):
        await StripeCheckout(key).create_checkout_session(
            CheckoutSessionRequest(amount=390, metadata={"tipo": "ciak_start"})
        )
    stripe_create.assert_not_awaited()
