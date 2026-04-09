"""
Shim per emergentintegrations.payments.stripe.checkout
"""
import os
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


@dataclass
class CheckoutSessionRequest:
    amount: float
    currency: str = "eur"
    success_url: str = ""
    cancel_url: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CheckoutSessionResponse:
    session_id: str
    url: str


@dataclass
class CheckoutStatusResponse:
    payment_status: str
    session_id: str = ""
    amount_total: int = 0
    currency: str = ""


@dataclass
class WebhookResponse:
    event_type: str
    session_id: str = ""
    payment_status: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


class StripeCheckout:
    def __init__(self, api_key: str, webhook_url: str = ""):
        self.api_key = api_key
        self.webhook_url = webhook_url

    async def create_checkout_session(self, request: CheckoutSessionRequest) -> CheckoutSessionResponse:
        import stripe
        stripe.api_key = self.api_key

        # Stripe amounts are in cents
        unit_amount = int(round(request.amount * 100))

        # Convert metadata values to strings (Stripe requirement)
        metadata = {k: str(v) for k, v in (request.metadata or {}).items()}

        session = await stripe.checkout.Session.create_async(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": request.currency,
                    "product_data": {"name": "Evolution PRO"},
                    "unit_amount": unit_amount,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata=metadata,
        )

        return CheckoutSessionResponse(session_id=session.id, url=session.url)

    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResponse:
        import stripe
        stripe.api_key = self.api_key

        session = await stripe.checkout.Session.retrieve_async(session_id)
        return CheckoutStatusResponse(
            payment_status=session.payment_status,
            session_id=session.id,
            amount_total=session.amount_total or 0,
            currency=session.currency or "",
        )

    async def handle_webhook(self, body: bytes, signature: str) -> WebhookResponse:
        import stripe
        stripe.api_key = self.api_key

        webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

        if webhook_secret:
            try:
                event = stripe.Webhook.construct_event(body, signature, webhook_secret)
            except (ValueError, stripe.error.SignatureVerificationError) as e:
                logger.error(f"Stripe webhook signature error: {e}")
                raise
        else:
            import json
            event = stripe.Event.construct_from(json.loads(body), stripe.api_key)

        event_type = event.type
        data_obj = event.data.object

        session_id = getattr(data_obj, "id", "") or ""
        payment_status = getattr(data_obj, "payment_status", "") or ""

        # For payment_intent events, map status
        if not payment_status:
            status = getattr(data_obj, "status", "")
            if status == "succeeded":
                payment_status = "paid"
            else:
                payment_status = status

        metadata = dict(getattr(data_obj, "metadata", {}) or {})

        return WebhookResponse(
            event_type=event_type,
            session_id=session_id,
            payment_status=payment_status,
            metadata=metadata,
        )
