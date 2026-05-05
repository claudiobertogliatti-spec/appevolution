"""
Ciak — Checkout router (Stripe).

Endpoint:
  POST /api/checkout/create-session  → crea Stripe checkout session 67€
  POST /api/checkout/webhook         → riceve eventi Stripe (checkout.session.completed)

Differenze rispetto a routers/stripe_webhook.py:
  - Endpoint dedicato Ciak (path separato per filtrare gli eventi via Stripe dashboard
    configurando un webhook endpoint dedicato per "ciak_analisi")
  - Metadata tipo="ciak_analisi" per identificare il flusso

Riferimento:
  - memory/funnel_67_analisi.md (flow checkout)
  - memory/ciak_technical_spec.md (state machine)
"""
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

from services.ciak_state_machine import (
    STATE_CLICKED_67, STATE_PURCHASED_67,
    add_event, transition_to,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/checkout", tags=["ciak-checkout"])

db = None


def set_db(database) -> None:
    global db
    db = database


# ─── Models ──────────────────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    session_token: Optional[str] = None  # token diagnostic se da report
    email: EmailStr
    name: Optional[str] = None
    stato: int = 2  # default Stato 2 (cold direct), 4 = Analisi estesa


class CreateSessionResponse(BaseModel):
    checkout_url: str
    stripe_session_id: str


# ─── Stripe config ───────────────────────────────────────────────────

def _ensure_stripe_configured() -> None:
    api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        raise HTTPException(500, "Stripe non configurato (STRIPE_API_KEY mancante)")
    stripe.api_key = api_key


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL_PROD", "https://ciak.io")


# ═══════════════════════════════════════════════════════════════════
#  CREATE SESSION
# ═══════════════════════════════════════════════════════════════════

@router.post("/create-session", response_model=CreateSessionResponse)
async def create_checkout_session(payload: CreateSessionRequest, request: Request):
    """
    Crea Stripe Checkout Session per Analisi Strategica 67€.

    Se session_token fornito (utente arriva da report):
      - Linka acquisto al lead esistente
      - Trasferisce lo stato a clicked_67 (se non già)
    Se session_token assente (cold direct dalla pagina /analisi):
      - Acquisto standalone, sarà associato post-pagamento via email
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    _ensure_stripe_configured()

    is_extended = payload.stato == 4
    product_name = (
        "Analisi Strategica Estesa (90 minuti)"
        if is_extended
        else "Analisi Strategica (60 minuti)"
    )
    product_description = (
        "Conversazione strategica estesa con Claudio e il team Evolution PRO. "
        "Documento di sintesi entro 48h dalla call."
        if is_extended
        else "Conversazione strategica con Claudio e il team Evolution PRO. "
             "Documento di sintesi entro 48h dalla call."
    )

    metadata: dict = {
        "tipo": "ciak_analisi",
        "stato": str(payload.stato),
    }
    if payload.session_token:
        metadata["diagnostic_session_token"] = payload.session_token

    frontend = _frontend_url()
    success_url = f"{frontend}/analisi/grazie?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{frontend}/analisi?from=cancel"

    try:
        stripe_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": product_name,
                        "description": product_description,
                    },
                    "unit_amount": 6700,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=payload.email,
            metadata=metadata,
        )
    except stripe.error.StripeError as e:
        logger.error("[CIAK_CHECKOUT] Stripe error: %s", e)
        raise HTTPException(502, f"Stripe error: {e}") from e

    # Aggiorna lo stato del lead se collegato
    if payload.session_token:
        diagnostic = await db.diagnostic_sessions.find_one(
            {"session_token": payload.session_token}
        )
        if diagnostic:
            current = diagnostic.get("current_state")
            # Se non già clicked_67, registra il click + Stripe session id
            if current and current != STATE_CLICKED_67:
                transition_to(diagnostic, STATE_CLICKED_67)
            add_event(diagnostic, "stripe_session_created", {
                "stripe_session_id": stripe_session.id,
            })
            await db.diagnostic_sessions.replace_one(
                {"session_token": payload.session_token},
                diagnostic,
            )

    return CreateSessionResponse(
        checkout_url=stripe_session.url,
        stripe_session_id=stripe_session.id,
    )


# ═══════════════════════════════════════════════════════════════════
#  WEBHOOK
# ═══════════════════════════════════════════════════════════════════

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request):
    """
    Stripe webhook per Ciak.
    Filtra solo eventi con metadata.tipo == "ciak_analisi".

    Configurazione Stripe Dashboard → Developers → Webhooks:
      - Endpoint URL: https://api.evolution-pro.it/api/checkout/webhook
      - Events: checkout.session.completed, charge.refunded
      - Signing secret → env STRIPE_CIAK_WEBHOOK_SECRET
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    _ensure_stripe_configured()

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    secret = os.environ.get("STRIPE_CIAK_WEBHOOK_SECRET")

    event = None
    if secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
        except ValueError as e:
            logger.error("[CIAK_WEBHOOK] Invalid payload: %s", e)
            raise HTTPException(400, "Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error("[CIAK_WEBHOOK] Invalid signature: %s", e)
            raise HTTPException(400, "Invalid signature")
    else:
        # Dev mode: accetta payload non firmato (NON usare in produzione)
        logger.warning("[CIAK_WEBHOOK] STRIPE_CIAK_WEBHOOK_SECRET non configurato — dev mode")
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(400, "Invalid JSON")

    event_type = event["type"] if isinstance(event, dict) else event.type
    data = (
        event["data"]["object"] if isinstance(event, dict) else event.data.object
    )

    metadata = data.get("metadata", {}) or {}
    if metadata.get("tipo") != "ciak_analisi":
        # Non è un evento Ciak — silenzia (gestito da altri webhook)
        return {"status": "ignored", "reason": "non-ciak"}

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data)
    elif event_type == "charge.refunded":
        await _handle_charge_refunded(data)
    else:
        logger.info("[CIAK_WEBHOOK] Event ignored: %s", event_type)

    return {"status": "ok"}


async def _handle_checkout_completed(data: dict) -> None:
    """Pagamento riuscito → transizione purchased_67."""
    metadata = data.get("metadata", {}) or {}
    session_token = metadata.get("diagnostic_session_token")
    customer_email = data.get("customer_email") or data.get("customer_details", {}).get("email")

    diagnostic = None
    if session_token:
        diagnostic = await db.diagnostic_sessions.find_one(
            {"session_token": session_token}
        )

    if not diagnostic and customer_email:
        # Fallback: cerca per email (caso cold direct senza diagnostic precedente)
        diagnostic = await db.diagnostic_sessions.find_one(
            {"user_email": customer_email},
            sort=[("created_at", -1)],
        )

    if not diagnostic:
        # Nessuna diagnostic session legata: registra una "vendita orfana"
        # da gestire manualmente lato admin
        logger.warning(
            "[CIAK_WEBHOOK] checkout.session.completed without diagnostic_session "
            "(email=%s, stripe_id=%s)",
            customer_email, data.get("id"),
        )
        await db.ciak_orphan_purchases.insert_one({
            "stripe_session_id": data.get("id"),
            "amount_total": data.get("amount_total"),
            "customer_email": customer_email,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return

    transition_to(
        diagnostic,
        STATE_PURCHASED_67,
        event_metadata={
            "stripe_session_id": data.get("id"),
            "amount_total": data.get("amount_total"),
        },
    )
    add_event(diagnostic, "stripe_payment_completed", {
        "stripe_session_id": data.get("id"),
        "amount_total": data.get("amount_total"),
    })

    await db.diagnostic_sessions.replace_one(
        {"_id": diagnostic["_id"]},
        diagnostic,
    )


async def _handle_charge_refunded(data: dict) -> None:
    """Refund: aggiunge event ciak_refunded ma NON cambia state corrente."""
    metadata = data.get("metadata", {}) or {}
    session_token = metadata.get("diagnostic_session_token")

    if not session_token:
        return

    diagnostic = await db.diagnostic_sessions.find_one(
        {"session_token": session_token}
    )
    if not diagnostic:
        return

    add_event(diagnostic, "stripe_refunded", {
        "amount_refunded": data.get("amount_refunded"),
        "charge_id": data.get("id"),
    })
    if "ciak_refunded" not in diagnostic.get("crm_tags", []):
        diagnostic.setdefault("crm_tags", []).append("ciak_refunded")

    await db.diagnostic_sessions.replace_one(
        {"_id": diagnostic["_id"]},
        diagnostic,
    )
