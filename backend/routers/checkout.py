"""
Ciak — Checkout router (Stripe).

Endpoint:
  POST /api/checkout/create-session  → crea Stripe checkout session Ciak Blueprint 67€
  POST /api/checkout/webhook         → riceve eventi Stripe (checkout.session.completed)

Differenze rispetto a routers/stripe_webhook.py:
  - Endpoint dedicato Ciak (path separato per filtrare gli eventi via Stripe dashboard
    configurando un webhook endpoint dedicato per "ciak_blueprint")
  - Metadata tipo="ciak_blueprint" (nuovi acquisti). Backward-compat: il filtro
    accetta anche "ciak_analisi" (legacy) per webhook re-inviati su vecchi ordini.

Naming lockato 2026-05-12: il prodotto "Analisi Strategica 60/90 min" è stato
unificato in un singolo prodotto "Ciak Blueprint" — €67 IVA inclusa. La durata
90 min per Stato 4 resta una scelta operativa interna, non una differenziazione
commerciale.

Riferimento:
  - memory/ciak_brand_copy_framework.md (positioning + product naming)
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
    # email opzionale: se il visitatore arriva diretto su /ciak-blueprint senza
    # aver fatto opt-in (footer, CTA Checkpoint, link diretto) non ha email in
    # localStorage. In quel caso la raccoglie Stripe sulla sua pagina checkout.
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    stato: int = 2  # default Stato 2 (cold direct), 4 = Analisi estesa
    # Campi accessori inviati dal frontend, ignorati lato logica ma accettati
    # per non far fallire la validazione (pydantic ignora extra di default,
    # esplicitati qui per chiarezza).
    product: Optional[str] = None
    source: Optional[str] = None
    origin_url: Optional[str] = None


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
    Crea Stripe Checkout Session per Ciak Blueprint 67€.

    Se session_token fornito (utente arriva da report):
      - Linka acquisto al lead esistente
      - Trasferisce lo stato a clicked_67 (se non già)
    Se session_token assente (cold direct dalla pagina /ciak-blueprint):
      - Acquisto standalone, sarà associato post-pagamento via email

    NOTA naming: prodotto unico "Ciak Blueprint" (lockato 2026-05-12). Lo Stato 4
    storicamente attivava la variante 90 min "Estesa": ora la durata maggiorata
    resta scelta operativa interna ma il prodotto venduto è uno solo. Il campo
    payload.stato resta nei metadata per analytics/segmentazione.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    _ensure_stripe_configured()

    product_name = "Ciak Blueprint"
    product_description = (
        "Sessione Strategica 1:1 con Claudio Bertogliatti (60 minuti) + "
        "Analisi di mercato specifica sul tuo settore + "
        "Roadmap Operativa personalizzata consegnata entro 72 ore."
    )

    metadata: dict = {
        "tipo": "ciak_blueprint",
        "stato": str(payload.stato),
    }
    if payload.session_token:
        metadata["diagnostic_session_token"] = payload.session_token

    frontend = _frontend_url()
    success_url = f"{frontend}/ciak-blueprint/grazie?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{frontend}/ciak-blueprint?from=cancel"

    session_kwargs: dict = {
        "payment_method_types": ["card"],
        "line_items": [{
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
        "mode": "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": metadata,
    }
    # customer_email solo se disponibile: Stripe rifiuta stringa vuota e, se
    # omesso, raccoglie l'email direttamente sulla sua pagina di checkout.
    if payload.email:
        session_kwargs["customer_email"] = payload.email

    try:
        stripe_session = stripe.checkout.Session.create(**session_kwargs)
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
#  SESSION STATUS (per pagina /ciak-blueprint/grazie)
# ═══════════════════════════════════════════════════════════════════

@router.get("/session-status")
async def get_session_status(session_id: str):
    """
    Restituisce lo stato della Stripe Checkout Session e il diagnostic_session_token
    associato (per redirigere l'utente alle 8 Domande Ciak post-acquisto).

    Usato da `/ciak-blueprint/grazie` per attivare il bottone "Inizia con le 8 Domande Ciak"
    appena il webhook Stripe ha processato il pagamento.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    _ensure_stripe_configured()

    try:
        stripe_session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as e:
        logger.warning("[CIAK_CHECKOUT] session-status retrieve failed: %s", e)
        raise HTTPException(404, "Session not found") from e

    metadata = stripe_session.metadata or {}
    # Accetta sia ciak_blueprint che legacy ciak_analisi
    if metadata.get("tipo") not in ("ciak_blueprint", "ciak_analisi"):
        raise HTTPException(403, "Session is not a Ciak Blueprint checkout")

    diagnostic_token = metadata.get("diagnostic_session_token")

    # Se il token non è in metadata (caso cold direct senza diagnostic precedente),
    # prova a recuperarlo dalla diagnostic_session creata dal webhook post-pagamento
    # cercando per email customer.
    if not diagnostic_token:
        customer_email = stripe_session.customer_email or (
            stripe_session.customer_details.email if stripe_session.customer_details else None
        )
        if customer_email:
            diagnostic = await db.diagnostic_sessions.find_one(
                {"user_email": customer_email},
                sort=[("created_at", -1)],
            )
            if diagnostic:
                diagnostic_token = diagnostic.get("session_token")

    return {
        "session_id": session_id,
        "payment_status": stripe_session.payment_status,
        "diagnostic_session_token": diagnostic_token,
    }


# ═══════════════════════════════════════════════════════════════════
#  WEBHOOK
# ═══════════════════════════════════════════════════════════════════

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request):
    """
    Stripe webhook per Ciak Blueprint.
    Filtra solo eventi con metadata.tipo in {"ciak_blueprint", "ciak_analisi"}.
    Il valore legacy "ciak_analisi" è mantenuto per backward-compat (webhook
    re-inviati per acquisti effettuati prima del rename 2026-05-12).

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
    # Accetta sia il valore nuovo "ciak_blueprint" che il legacy "ciak_analisi"
    # (lockato 2026-05-12 — backward-compat per webhook re-inviati).
    if metadata.get("tipo") not in ("ciak_blueprint", "ciak_analisi"):
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

    # Fire-and-forget Systeme.io tag emission per ciak_bought_67.
    # Triggera automation post-acquisto: email conferma + link Cal.com per booking.
    import asyncio as _asyncio
    from services.ciak_systeme import ciak_emit_event as _ciak_emit_event
    _user_email = diagnostic.get("user_email") or customer_email
    if _user_email:
        _asyncio.create_task(_ciak_emit_event(
            email=_user_email,
            event_name="ciak_bought_67",
            first_name=diagnostic.get("user_name"),
            metadata={
                "stripe_session_id": data.get("id"),
                "amount_total": data.get("amount_total"),
                "session_token": diagnostic.get("session_token"),
            },
        ))


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
