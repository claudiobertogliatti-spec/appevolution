"""Operational switches, not legal opinions. No live paid offer by default.

Only Claudio's recorded legal AND fiscal approvals may enable these switches.
Test keys remain usable. Missing/unrecognised keys never count as test mode.
"""
import os

from fastapi import HTTPException

PAID_OFFERS = frozenset({"ciak_start", "partnership", "attivazione_partnership"})
CLOSED_MESSAGE = "Il pagamento non è ancora disponibile. Il team ti avviserà quando potrai procedere."


def paid_offer_checkout_enabled(api_key: str | None) -> bool:
    if not isinstance(api_key, str):
        return False
    if api_key.startswith(("sk_test_", "rk_test_")):
        return True
    if not api_key.startswith(("sk_live_", "rk_live_")):
        return False
    return all(os.environ.get(name) == "true" for name in (
        "CIAK_PAID_OFFERS_LEGAL_APPROVED", "CIAK_PAID_OFFERS_FISCAL_APPROVED",
    ))


def require_paid_offer_checkout(api_key: str | None, offer: str) -> None:
    if offer in PAID_OFFERS and not paid_offer_checkout_enabled(api_key):
        raise HTTPException(503, detail={
            "code": "PAID_OFFER_CHECKOUT_CLOSED", "message": CLOSED_MESSAGE,
        })


def paid_offer_readiness() -> dict:
    primary_key = os.environ.get("STRIPE_API_KEY")
    return {
        "start": {"enabled": paid_offer_checkout_enabled(primary_key or os.environ.get("STRIPE_SECRET_KEY"))},
        "partnership": {"enabled": paid_offer_checkout_enabled(primary_key)},
        "message": CLOSED_MESSAGE,
    }
