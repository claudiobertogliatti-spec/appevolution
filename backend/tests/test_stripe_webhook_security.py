from unittest.mock import Mock

import pytest
from fastapi import HTTPException

pytestmark = pytest.mark.unit


def test_missing_webhook_secret_fails_closed(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    from routers import stripe_webhook

    with pytest.raises(HTTPException) as exc:
        stripe_webhook._construct_stripe_event(b"{}", None)
    assert exc.value.status_code == 503


def test_invalid_signature_is_rejected(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test_only")
    from routers import stripe_webhook

    verifier = Mock(side_effect=stripe_webhook.stripe.error.SignatureVerificationError("bad", "sig"))
    monkeypatch.setattr(stripe_webhook.stripe.Webhook, "construct_event", verifier)

    with pytest.raises(HTTPException) as exc:
        stripe_webhook._construct_stripe_event(b"{}", "bad-signature")
    assert exc.value.status_code == 400


def test_valid_signature_returns_verified_event(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test_only")
    from routers import stripe_webhook

    expected = {"type": "test.event", "data": {"object": {}}}
    verifier = Mock(return_value=expected)
    monkeypatch.setattr(stripe_webhook.stripe.Webhook, "construct_event", verifier)

    assert stripe_webhook._construct_stripe_event(b"{}", "valid-signature") == expected
    verifier.assert_called_once_with(b"{}", "valid-signature", "whsec_test_only")
