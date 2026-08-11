"""
Stripe Webhook Handler for Evolution PRO
Handles payment confirmation and triggers post-payment automation.

Flow after €67 payment:
1. Stripe webhook confirms payment → pagamento_analisi: true
2. Auto-generate AI analysis
3. Generate call script (8 blocks)
4. Schedule welcome email (link available 48h after analysis creation)
5. Schedule reminder at T+48h if no booking
"""

import os
import logging
import stripe
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel
from typing import Optional

from services.ciak_client_accounts import (
    ACCESS_PARTNER,
    ACCESS_START,
    START_AMOUNT_CENTS,
    default_start_progress,
    has_start_entitlement,
)
from security_config import require_stripe_webhook_secret

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
CLIENT_PARTNER_ACTIVE_STATES = {"partner_attivo", "convertito_partner"}


def _construct_stripe_event(payload: bytes, signature: str | None):
    """Verifica la firma Stripe senza alcun fallback a JSON non autenticato."""
    try:
        webhook_secret = require_stripe_webhook_secret()
    except RuntimeError as exc:
        logger.error("[STRIPE_WEBHOOK] webhook secret non configurato")
        raise HTTPException(status_code=503, detail="Stripe webhook not configured") from exc

    try:
        return stripe.Webhook.construct_event(payload, signature, webhook_secret)
    except ValueError as exc:
        logger.error("[STRIPE_WEBHOOK] Invalid payload: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.error.SignatureVerificationError as exc:
        logger.error("[STRIPE_WEBHOOK] Invalid signature: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature") from exc


async def _claim_stripe_webhook_event(db, *, event_type: str, reference_id: str, tipo: str | None) -> bool:
    """
    Acquire an atomic, per-Stripe-event lock before running webhook side effects.

    Stripe retries the same checkout.session.completed event. The previous guard
    was mostly user-state based, so concurrent deliveries could both schedule
    emails/automations before either write completed. Mongo's `_id` uniqueness
    gives us a small, reliable lock without requiring a transaction.
    """
    locks = getattr(db, "stripe_webhook_events", None)
    if locks is None:
        logger.warning("[STRIPE_WEBHOOK] stripe_webhook_events collection unavailable; processing without event lock")
        return True

    now = datetime.now(timezone.utc).isoformat()
    lock_id = f"{event_type}:{reference_id}"
    try:
        await locks.insert_one({
            "_id": lock_id,
            "event_type": event_type,
            "reference_id": reference_id,
            "tipo": tipo,
            "status": "processing",
            "created_at": now,
            "updated_at": now,
        })
        return True
    except DuplicateKeyError:
        logger.info("[STRIPE_WEBHOOK] Duplicate event ignored: %s", lock_id)
        return False


async def _mark_stripe_webhook_event(db, *, event_type: str, reference_id: str, status: str, error: str | None = None) -> None:
    locks = getattr(db, "stripe_webhook_events", None)
    if locks is None:
        return

    update = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if error:
        update["error"] = error[:1000]
    await locks.update_one(
        {"_id": f"{event_type}:{reference_id}"},
        {"$set": update},
    )


async def _release_stripe_webhook_event(db, *, event_type: str, reference_id: str) -> None:
    locks = getattr(db, "stripe_webhook_events", None)
    if locks is None:
        return
    delete_one = getattr(locks, "delete_one", None)
    if delete_one is None:
        return
    await delete_one({"_id": f"{event_type}:{reference_id}"})


# ═══════════════════════════════════════════════════════════════════════════════
# STRIPE WEBHOOK
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/stripe")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Stripe webhook endpoint.
    Handles: payment_intent.succeeded, checkout.session.completed
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    
    # Get database connection
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'evolution_pro')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get raw body for signature verification
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    stripe_key = os.environ.get('STRIPE_API_KEY')
    
    if not stripe_key:
        logger.error("[STRIPE_WEBHOOK] STRIPE_API_KEY not configured")
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe.api_key = stripe_key
    
    event = _construct_stripe_event(payload, sig_header)
    
    event_type = event.get('type') if isinstance(event, dict) else event.type
    data = event.get('data', {}).get('object', {}) if isinstance(event, dict) else event.data.object
    
    logger.info(f"[STRIPE_WEBHOOK] Received event: {event_type}")
    
    # Handle events
    if event_type == 'checkout.session.completed':
        await handle_checkout_completed(db, data, background_tasks)
    elif event_type == 'payment_intent.succeeded':
        await handle_payment_succeeded(db, data, background_tasks)
    elif event_type == 'invoice.payment_succeeded':
        await handle_invoice_payment_succeeded(db, data)
    else:
        logger.info(f"[STRIPE_WEBHOOK] Unhandled event type: {event_type}")
    
    return {"received": True}


async def handle_checkout_completed(db, session, background_tasks: BackgroundTasks):
    """Handle checkout.session.completed event"""
    session_id = session.get('id')
    payment_status = session.get('payment_status')
    metadata = session.get('metadata', {})
    
    user_id = metadata.get('user_id')
    tipo = metadata.get('tipo')
    
    logger.info(f"[STRIPE_WEBHOOK] Checkout completed: session={session_id}, user={user_id}, tipo={tipo}, status={payment_status}")
    
    if payment_status != 'paid':
        logger.warning(f"[STRIPE_WEBHOOK] Checkout not paid: {payment_status}")
        return

    tipo = metadata.get('tipo')
    event_type = "checkout.session.completed"
    if not await _claim_stripe_webhook_event(
        db,
        event_type=event_type,
        reference_id=session_id,
        tipo=tipo,
    ):
        return

    try:
        await _dispatch_checkout_completed(db, session, session_id, metadata, background_tasks)
    except Exception as exc:
        await _mark_stripe_webhook_event(
            db,
            event_type=event_type,
            reference_id=session_id,
            status="failed",
            error=str(exc),
        )
        await _release_stripe_webhook_event(
            db,
            event_type=event_type,
            reference_id=session_id,
        )
        raise

    await _mark_stripe_webhook_event(
        db,
        event_type=event_type,
        reference_id=session_id,
        status="processed",
    )


async def _dispatch_checkout_completed(db, session: dict, session_id: str, metadata: dict, background_tasks: BackgroundTasks):
    """Route a paid checkout.session.completed event after the dedup lock is held."""
    user_id = metadata.get('user_id')
    tipo = metadata.get('tipo')

    if tipo == 'evo_s':
        await process_evo_s_payment(db, session, metadata)
        return

    if tipo == 'ciak_start':
        client_id = metadata.get('client_id')
        if client_id:
            await process_ciak_start_payment(db, client_id, session_id)
        else:
            logger.warning(f"[STRIPE_WEBHOOK] Missing client_id for ciak_start session {session_id}")
    elif tipo == 'analisi_strategica':
        await process_analisi_payment(db, user_id, session_id, background_tasks)
    elif tipo == 'partnership':
        client_id = metadata.get('client_id')
        if client_id:
            await process_ciak_client_partnership_payment(
                db,
                client_id,
                session_id,
                background_tasks,
                metadata,
            )
        # Check if this is a proposta-based payment (has token in metadata)
        token = metadata.get('token')
        if token:
            from routers.proposta import gestisci_pagamento_partnership
            await gestisci_pagamento_partnership(session_id, metadata, session)
            return
        # Also run the standard partnership flow
        partner_id = metadata.get('partner_id') or user_id
        if partner_id:
            await process_partnership_payment(db, partner_id, session_id, background_tasks)
    else:
        # Servizi extra (avatar_pro, consulenza_marketing, branding_pack) o tipo sconosciuto
        logger.info(f"[STRIPE_WEBHOOK] Routing to servizi extra handler: tipo={tipo}, session={session_id}")
        await process_servizi_extra_payment(db, session_id, background_tasks)


# ═══════════════════════════════════════════════════════════════════════════════
# EVO-S — abbonamenti (post 12 mesi). Riconoscimento pagamento verificato server.
# ═══════════════════════════════════════════════════════════════════════════════

async def process_evo_s_payment(db, session: dict, metadata: dict) -> None:
    """
    checkout.session.completed con tipo=evo_s: registra la subscription come
    PAGATA (periodo corrente) usando il prezzo dal catalogo, non dal client.
    """
    from services.evo_s_billing import record_evo_s_payment

    plan = metadata.get('plan')
    partner_id = metadata.get('partner_id')
    subscription_id = session.get('subscription')
    customer_id = session.get('customer')
    session_id = session.get('id')
    if not subscription_id:
        logger.warning(f"[STRIPE_WEBHOOK] EVO-S senza subscription id (session {session_id})")
        return
    result = await record_evo_s_payment(
        db,
        plan=plan,
        partner_id=partner_id,
        subscription_id=subscription_id,
        customer_id=customer_id,
        session_id=session_id,
    )
    if result:
        logger.info(f"[STRIPE_WEBHOOK] EVO-S attivata: sub={subscription_id} plan={plan} partner={partner_id}")


async def handle_invoice_payment_succeeded(db, invoice: dict) -> None:
    """
    invoice.payment_succeeded: rinnovi mensili EVO-S. Agisce SOLO se esiste già
    una evo_s_subscriptions per quel subscription id (creata al checkout) → non
    tocca gli abbonamenti dei servizi extra (gestiti dal loro webhook).
    """
    subscription_id = invoice.get('subscription')
    if not subscription_id:
        return
    sub = await db.evo_s_subscriptions.find_one({"subscription_id": subscription_id})
    if not sub:
        return  # non è un abbonamento EVO-S
    from services.evo_s_billing import record_evo_s_payment
    await record_evo_s_payment(
        db,
        plan=sub.get('plan'),
        partner_id=sub.get('partner_id'),
        subscription_id=subscription_id,
        customer_id=invoice.get('customer') or sub.get('customer_id'),
        invoice_payment_id=invoice.get('id'),
    )
    logger.info(f"[STRIPE_WEBHOOK] EVO-S rinnovo registrato: sub={subscription_id}")


async def handle_payment_succeeded(db, payment_intent, background_tasks: BackgroundTasks):
    """Handle payment_intent.succeeded event"""
    pi_id = payment_intent.get('id')
    metadata = payment_intent.get('metadata', {})
    
    user_id = metadata.get('user_id')
    tipo = metadata.get('tipo')
    
    logger.info(f"[STRIPE_WEBHOOK] Payment succeeded: pi={pi_id}, user={user_id}, tipo={tipo}")
    
    if not user_id:
        # Try to find user by payment intent
        user = await db.users.find_one({"stripe_payment_intent_id": pi_id})
        if user:
            user_id = user.get('id')
    
    if user_id and tipo == 'analisi_strategica':
        await process_analisi_payment(db, user_id, pi_id, background_tasks)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _client_user_lookup_queries(client: dict) -> list[dict]:
    queries = []
    seen = set()

    def add(field: str, value) -> None:
        if value in (None, ""):
            return
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return
            if field == "email":
                value = value.lower()
        query = {field: value}
        key = tuple(sorted(query.items()))
        if key in seen:
            return
        seen.add(key)
        queries.append(query)

    add("email", client.get("email"))
    add("id", client.get("user_id"))
    add("id", client.get("linked_user_id"))
    add("id", client.get("id"))
    add("session_token", client.get("session_token"))
    add("session_token", client.get("diagnostic_session_token"))
    add("diagnostic_session_token", client.get("session_token"))
    add("diagnostic_session_token", client.get("diagnostic_session_token"))
    return queries


async def _canonical_user_for_client(db, client: dict) -> dict | None:
    users_collection = getattr(db, "users", None)
    if users_collection is None:
        return None
    for query in _client_user_lookup_queries(client):
        user = await users_collection.find_one(query, {"_id": 0})
        if user:
            return user
    return None


def _client_partner_active(doc: dict) -> bool:
    if doc.get("partnership_attiva") is True:
        return True
    stato_cliente = str(doc.get("stato_cliente") or "").strip().lower()
    if stato_cliente in CLIENT_PARTNER_ACTIVE_STATES:
        return True
    return doc.get("access_level") == ACCESS_PARTNER


def _append_payment_event(events: list[dict] | None, event_name: str, reference_id: str, extra: dict | None = None) -> list[dict]:
    updated = [dict(item) for item in (events or [])]
    if any(item.get("event") == event_name and item.get("reference_id") == reference_id for item in updated):
        return updated
    updated.append(
        {
            "event": event_name,
            "timestamp": _iso_now(),
            "reference_id": reference_id,
            **(extra or {}),
        }
    )
    return updated


async def _record_checkout_payment(db, *, session_id: str, tipo: str, amount_cents: int, email: str, client_id: str | None = None, user_id: str | None = None) -> None:
    now = _iso_now()
    payment_transactions = getattr(db, "payment_transactions", None)
    if payment_transactions is not None:
        await payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "event_type": "checkout.session.completed",
                "session_id": session_id,
                "payment_status": "paid",
                "client_id": client_id,
                "user_id": user_id,
                "email": email,
                "tipo": tipo,
                "amount_cents": amount_cents,
                "received_at": now,
                "updated_at": now,
            }},
            upsert=True,
        )

    payments = getattr(db, "payments", None)
    if payments is not None:
        await payments.update_one(
            {"session_id": session_id},
            {"$set": {
                "session_id": session_id,
                "client_id": client_id,
                "user_id": user_id,
                "email": email,
                "tipo": tipo,
                "type": tipo,
                "amount": amount_cents / 100.0,
                "currency": "eur",
                "status": "completed",
                "payment_confirmed_via": "stripe_webhook",
                "created_at": now,
            }},
            upsert=True,
        )


async def process_ciak_start_payment(db, client_id: str, reference_id: str) -> None:
    client = await db.ciak_clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        logger.error(f"[STRIPE_WEBHOOK] Ciak client not found for Start payment: {client_id}")
        return

    now = _iso_now()
    updates = {
        "access_level": ACCESS_START,
        "start_purchased_at": client.get("start_purchased_at") or now,
        "start_credit_amount": START_AMOUNT_CENTS,
        "start_progress": client.get("start_progress") or default_start_progress(),
        "updated_at": now,
        "last_checkout_session_id": reference_id,
        "last_checkout_completed_at": now,
    }
    events = _append_payment_event(
        client.get("events"),
        "ciak_start_payment_completed",
        reference_id,
        {"amount_cents": START_AMOUNT_CENTS},
    )
    await db.ciak_clients.update_one(
        {"id": client_id},
        {"$set": {**updates, "events": events}},
    )
    await _record_checkout_payment(
        db,
        session_id=reference_id,
        tipo="ciak_start",
        amount_cents=START_AMOUNT_CENTS,
        email=client.get("email", ""),
        client_id=client_id,
    )


async def process_ciak_client_partnership_payment(db, client_id: str, reference_id: str, background_tasks: BackgroundTasks, metadata: dict) -> None:
    client = await db.ciak_clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        logger.error(f"[STRIPE_WEBHOOK] Ciak client not found for partnership payment: {client_id}")
        return

    user = await _canonical_user_for_client(db, client)
    now = _iso_now()
    credit_amount = 0
    try:
        credit_amount = int(metadata.get("credit_amount_cents") or 0)
    except (TypeError, ValueError):
        credit_amount = 0
    if has_start_entitlement(client):
        credit_amount = max(START_AMOUNT_CENTS, credit_amount)

    updates = {
        "access_level": ACCESS_PARTNER,
        "partnership_attiva": True,
        "stato_cliente": "partner_attivo",
        "partnership_purchased_at": client.get("partnership_purchased_at") or now,
        "updated_at": now,
        "last_checkout_session_id": reference_id,
        "last_checkout_completed_at": now,
    }
    if credit_amount:
        updates["start_credit_amount"] = credit_amount
    if has_start_entitlement(client) and not client.get("start_progress"):
        updates["start_progress"] = default_start_progress()

    events = _append_payment_event(
        client.get("events"),
        "partnership_payment_completed",
        reference_id,
        {"amount_cents": int(metadata.get("due_amount_cents") or 0)},
    )
    await db.ciak_clients.update_one(
        {"id": client_id},
        {"$set": {**updates, "events": events}},
    )

    user_id = None
    if user:
        user_id = user.get("id")
        user_updates = {
            "partnership_attiva": True,
            "stato_cliente": "partner_attivo",
            "pagamento_partnership_verificato": True,
            "pagamento_verificato": True,
            "data_pagamento_partnership": now,
            "partnership_payment_status": "paid",
            "updated_at": now,
        }
        if credit_amount:
            user_updates["start_credit_amount"] = credit_amount
        await db.users.update_one({"id": user_id}, {"$set": user_updates})

        pagamenti_partnership = getattr(db, "pagamenti_partnership", None)
        if pagamenti_partnership is not None:
            await pagamenti_partnership.update_one(
                {"user_id": user_id},
                {"$set": {
                    "completato": True,
                    "pagato_at": now,
                    "stripe_session_id": reference_id,
                }},
                upsert=True,
            )

        background_tasks.add_task(send_partnership_welcome_email, user_id)

    await _record_checkout_payment(
        db,
        session_id=reference_id,
        tipo="partnership",
        amount_cents=int(metadata.get("due_amount_cents") or 0),
        email=client.get("email", ""),
        client_id=client_id,
        user_id=user_id,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# POST-PAYMENT AUTOMATION: ANALISI €67
# ═══════════════════════════════════════════════════════════════════════════════

async def process_analisi_payment(db, user_id: str, reference_id: str, background_tasks: BackgroundTasks):
    """
    Process confirmed €67 analisi payment.
    Triggers full automation flow.
    """
    import uuid
    
    # Find user
    user = await db.users.find_one({"id": user_id})
    if not user:
        logger.error(f"[STRIPE_WEBHOOK] User not found: {user_id}")
        return
    
    # Check if already processed
    if user.get('pagamento_analisi') and user.get('webhook_processed'):
        logger.info(f"[STRIPE_WEBHOOK] Payment already processed for user {user_id}")
        return
    
    now = datetime.now(timezone.utc)
    cliente_id = user.get('cliente_id') or f"cliente_{uuid.uuid4().hex[:8]}"
    
    # 1. Update user with payment confirmation
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "pagamento_analisi": True,
            "pagamento_effettuato": True,
            "data_pagamento_analisi": now.isoformat(),
            "data_pagamento": now.isoformat(),
            "webhook_processed": True,
            "webhook_reference": reference_id,
            "cliente_id": cliente_id,
            "stato_processo": "pagamento_completato",
            "stato_cliente": "ANALISI_ATTIVATA",
            "azione_richiesta": None,
            "payment_confirmed_via": "webhook",
            "stripe_payment_status": "paid",
        }}
    )

    # 1b. Log raw transaction
    await db.payment_transactions.update_one(
        {"session_id": reference_id},
        {"$set": {
            "event_type": "checkout.session.completed",
            "session_id": reference_id,
            "payment_status": "paid",
            "user_id": user_id,
            "tipo": "analisi_strategica",
            "received_at": now.isoformat(),
        }},
        upsert=True,
    )

    # 1c. Write to canonical payments collection (single source of truth for all sales)
    await db.payments.update_one(
        {"session_id": reference_id},
        {"$set": {
            "user_id": user_id,
            "email": user.get("email", ""),
            "session_id": reference_id,
            "tipo": "analisi_strategica",
            "type": "analisi_strategica",
            "amount": 67.0,
            "currency": "eur",
            "status": "completed",
            "payment_confirmed_via": "stripe_webhook",
            "created_at": now.isoformat(),
        }},
        upsert=True,
    )

    logger.info(f"[STRIPE_WEBHOOK] Payment confirmed for user {user_id}")
    
    # 2. Create/update clienti record (legacy collection used by clienteFlowGuard)
    existing_cliente_legacy = await db.clienti.find_one({"user_id": user_id})
    if not existing_cliente_legacy:
        await db.clienti.insert_one({
            "id": cliente_id,
            "user_id": user_id,
            "nome": user.get("nome"),
            "cognome": user.get("cognome"),
            "email": user.get("email"),
            "telefono": user.get("telefono"),
            "questionario_completato": user.get("questionario_compilato", False),
            "data_pagamento": now.isoformat(),
            "created_at": now.isoformat(),
        })

    # 2b. Create/update clienti_analisi record (full tracking)
    existing_cliente = await db.clienti_analisi.find_one({"user_id": user_id})
    if not existing_cliente:
        await db.clienti_analisi.insert_one({
            "id": cliente_id,
            "user_id": user_id,
            "email": user.get("email"),
            "nome": user.get("nome"),
            "cognome": user.get("cognome"),
            "telefono": user.get("telefono"),
            "pagamento_analisi": True,
            "data_pagamento": now.isoformat(),
            "stripe_reference": reference_id,
            "questionario_compilato": user.get("questionario_compilato", False),
            "analisi_generata": False,
            "call_script_generato": False,
            "email_benvenuto_inviata": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        })
    else:
        await db.clienti_analisi.update_one(
            {"user_id": user_id},
            {"$set": {
                "pagamento_analisi": True,
                "data_pagamento": now.isoformat(),
                "stripe_reference": reference_id,
                "updated_at": now.isoformat()
            }}
        )
    
    # 3. Sync to Systeme.io (tags: acquisto_analisi, cliente_analisi, pagamento_67)
    try:
        await _sync_to_systeme(
            db=db,
            email=user.get("email", ""),
            nome=user.get("nome", ""),
            cognome=user.get("cognome", ""),
            payment_type="analisi",
            amount=67.0,
            metadata={"user_id": user_id, "cliente_id": cliente_id},
        )
    except Exception as e:
        logger.warning(f"[STRIPE_WEBHOOK] Systeme sync failed (non-blocking): {e}")

    # 4. Send Telegram notification
    await send_payment_notification(user, 67, "analisi_strategica")

    # 5. Schedule background automation tasks
    background_tasks.add_task(run_post_payment_automation, user_id, cliente_id)
    
    logger.info(f"[STRIPE_WEBHOOK] Post-payment automation scheduled for {user_id}")


async def run_post_payment_automation(user_id: str, cliente_id: str):
    """
    Background task: Run full post-payment automation.
    
    Steps:
    1. Check if questionario is completed
    2. If yes: generate AI analysis
    3. Generate call script (8 blocks)
    4. Schedule welcome email (48h delay for booking link)
    5. Schedule T+48h reminder
    """
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    
    # Wait a bit to let DB settle
    await asyncio.sleep(2)
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'evolution_pro')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        user = await db.users.find_one({"id": user_id})
        cliente = await db.clienti_analisi.find_one({"id": cliente_id})
        
        if not user or not cliente:
            logger.error(f"[POST_PAYMENT] User or cliente not found: {user_id}")
            return
        
        now = datetime.now(timezone.utc)
        
        # Step 1: Check if questionario is completed
        questionario_compilato = user.get("questionario_compilato", False) or cliente.get("questionario_compilato", False)
        
        if questionario_compilato:
            logger.info(f"[POST_PAYMENT] Questionario already completed, triggering analysis for {user_id}")
            
            # Step 2: Generate AI analysis
            try:
                analysis_result = await trigger_auto_analysis(db, user_id, cliente_id)
                if analysis_result:
                    await db.clienti_analisi.update_one(
                        {"id": cliente_id},
                        {"$set": {
                            "analisi_generata": True,
                            "analisi_generata_at": now.isoformat(),
                            "updated_at": now.isoformat()
                        }}
                    )
                    logger.info(f"[POST_PAYMENT] Analysis generated for {user_id}")
            except Exception as e:
                logger.error(f"[POST_PAYMENT] Analysis generation failed: {e}")
            
            # Step 3: Generate call script
            try:
                script_result = await trigger_call_script_generation(db, user_id, cliente_id)
                if script_result:
                    await db.clienti_analisi.update_one(
                        {"id": cliente_id},
                        {"$set": {
                            "call_script_generato": True,
                            "call_script_generato_at": now.isoformat(),
                            "updated_at": now.isoformat()
                        }}
                    )
                    logger.info(f"[POST_PAYMENT] Call script generated for {user_id}")
            except Exception as e:
                logger.error(f"[POST_PAYMENT] Call script generation failed: {e}")
        else:
            logger.info(f"[POST_PAYMENT] Waiting for questionario completion for {user_id}")
        
        # Step 4 & 5: Schedule welcome email and reminder
        # These will be triggered by Celery scheduled tasks
        await schedule_post_payment_emails(db, user_id, cliente_id)
        
        logger.info(f"[POST_PAYMENT] Automation completed for {user_id}")
        
    except Exception as e:
        logger.error(f"[POST_PAYMENT] Automation error for {user_id}: {e}")
    finally:
        client.close()


async def trigger_auto_analysis(db, user_id: str, cliente_id: str) -> bool:
    """Trigger automatic AI analysis generation using the analysis provider"""
    try:
        from analysis_provider import generate_client_analysis, ClientData
        
        # Get user and cliente data
        user = await db.users.find_one({"id": user_id})
        cliente = await db.clienti_analisi.find_one({"id": cliente_id})
        
        if not user and not cliente:
            logger.error(f"[POST_PAYMENT] No user or cliente found for analysis")
            return False
        
        # Merge data
        nome = user.get("nome", "") if user else cliente.get("nome", "")
        cognome = user.get("cognome", "") if user else cliente.get("cognome", "")
        email = user.get("email", "") if user else cliente.get("email", "")
        telefono = user.get("telefono", "") if user else cliente.get("telefono", "")
        questionario = user.get("questionario_responses", {}) if user else cliente.get("questionario_responses", {})
        
        # Generate analysis using provider
        result = await generate_client_analysis(
            cliente_id=cliente_id,
            nome=nome,
            cognome=cognome,
            email=email,
            telefono=telefono,
            user_id=user_id,
            questionario_responses=questionario
        )
        
        if result.success:
            # Save analysis to database
            await db.clienti_analisi.update_one(
                {"id": cliente_id},
                {"$set": {
                    "analysis": {
                        "analysis_id": result.analysis_id,
                        "provider": result.provider,
                        "executive_summary": result.executive_summary,
                        "current_situation": result.current_situation,
                        "diagnosis": result.diagnosis,
                        "opportunities": result.opportunities,
                        "recommended_strategy": result.recommended_strategy,
                        "action_plan": result.action_plan,
                        "generated_at": result.generated_at,
                        "generation_time_seconds": result.generation_time_seconds
                    },
                    "analisi_generata": True,
                    "analisi_generata_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"[POST_PAYMENT] Analysis saved for cliente {cliente_id}")
            return True
        else:
            logger.error(f"[POST_PAYMENT] Analysis generation failed: {result.error}")
            return False
            
    except Exception as e:
        logger.error(f"[POST_PAYMENT] Analysis trigger error: {e}")
        return False


async def trigger_call_script_generation(db, user_id: str, cliente_id: str) -> bool:
    """Generate call script (8 blocks) using the analysis provider"""
    try:
        from analysis_provider import generate_client_call_script, AnalysisResult
        
        # Get cliente data
        cliente = await db.clienti_analisi.find_one({"id": cliente_id})
        user = await db.users.find_one({"id": user_id})
        
        if not cliente and not user:
            return False
        
        nome = user.get("nome", "") if user else cliente.get("nome", "")
        email = user.get("email", "") if user else cliente.get("email", "")
        questionario = user.get("questionario_responses", {}) if user else cliente.get("questionario_responses", {})
        
        # Check if analysis exists
        existing_analysis = cliente.get("analysis") if cliente else None
        analysis_result = None
        if existing_analysis:
            analysis_result = AnalysisResult(
                success=True,
                provider=existing_analysis.get("provider", "claude"),
                analysis_id=existing_analysis.get("analysis_id", ""),
                executive_summary=existing_analysis.get("executive_summary", ""),
                current_situation=existing_analysis.get("current_situation", {}),
                diagnosis=existing_analysis.get("diagnosis", []),
                opportunities=existing_analysis.get("opportunities", []),
                recommended_strategy=existing_analysis.get("recommended_strategy", {}),
                action_plan=existing_analysis.get("action_plan", []),
                generated_at=existing_analysis.get("generated_at", ""),
                generation_time_seconds=0
            )
        
        # Generate call script
        result = await generate_client_call_script(
            cliente_id=cliente_id,
            nome=nome,
            email=email,
            questionario_responses=questionario,
            analysis=analysis_result
        )
        
        if result.success:
            # Save to database
            await db.clienti_analisi.update_one(
                {"id": cliente_id},
                {"$set": {
                    "call_script": {
                        "script_id": result.script_id,
                        "provider": result.provider,
                        "script_blocks": result.script_blocks,
                        "total_duration_minutes": result.total_duration_minutes,
                        "personalization_notes": result.personalization_notes,
                        "generated_at": result.generated_at
                    },
                    "call_script_generato": True,
                    "call_script_generato_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"[POST_PAYMENT] Call script saved for cliente {cliente_id}")
            return True
        else:
            logger.error(f"[POST_PAYMENT] Call script generation failed: {result.error}")
            return False
            
    except Exception as e:
        logger.error(f"[POST_PAYMENT] Call script generation error: {e}")
        return False


async def schedule_post_payment_emails(db, user_id: str, cliente_id: str):
    """Schedule welcome email and T+48h reminder using Celery"""
    now = datetime.now(timezone.utc)
    
    # Calculate times
    # Booking link available 48h after analysis creation
    # Welcome email: sent immediately
    # Reminder: sent at T+48h if no booking
    
    booking_available_at = now + timedelta(hours=48)
    reminder_send_at = now + timedelta(hours=48)
    
    # Store schedule in DB
    await db.scheduled_emails.insert_one({
        "id": f"email_{user_id}_{now.strftime('%Y%m%d%H%M%S')}",
        "user_id": user_id,
        "cliente_id": cliente_id,
        "type": "welcome_analisi",
        "status": "scheduled",
        "scheduled_at": now.isoformat(),
        "booking_available_at": booking_available_at.isoformat(),
        "reminder_scheduled_at": reminder_send_at.isoformat(),
        "created_at": now.isoformat()
    })
    
    # Schedule Celery tasks
    celery_enabled = os.environ.get('CELERY_ENABLED', 'true').lower() == 'true'
    
    if celery_enabled:
        try:
            # Use send_task with explicit broker connection
            import redis
            from celery import Celery
            
            redis_url = os.environ.get('REDIS_URL')
            if not redis_url:
                raise ValueError("REDIS_URL not configured")
            
            # Add SSL params for Upstash
            broker_url = redis_url
            if redis_url.startswith('rediss://') and '?' not in redis_url:
                broker_url = redis_url + '?ssl_cert_reqs=CERT_NONE'
            
            # Create temporary Celery app for sending tasks
            temp_celery = Celery(
                'evolution_pro',
                broker=broker_url,
                backend=broker_url
            )
            
            # Task 1: Send welcome email immediately
            # Route to analisi_automation queue to ensure only our updated worker processes it
            temp_celery.send_task(
                'celery_tasks.send_analisi_welcome_email',
                args=[user_id, cliente_id],
                queue='analisi_automation'
            )
            logger.info(f"[POST_PAYMENT] Welcome email task scheduled for {user_id}")
            
            # Task 2: Schedule 48h reminder (countdown in seconds = 48 * 60 * 60)
            countdown_48h = 48 * 60 * 60  # 172800 seconds
            temp_celery.send_task(
                'celery_tasks.send_analisi_48h_reminder',
                args=[user_id, cliente_id],
                countdown=countdown_48h,
                queue='analisi_automation'
            )
            logger.info(f"[POST_PAYMENT] 48h reminder task scheduled for {user_id} (in {countdown_48h}s)")
            
            # Update scheduled_emails record
            await db.scheduled_emails.update_one(
                {"user_id": user_id, "type": "welcome_analisi"},
                {"$set": {
                    "status": "celery_scheduled",
                    "celery_welcome_task_scheduled": True,
                    "celery_reminder_task_scheduled": True,
                    "celery_scheduled_at": now.isoformat()
                }}
            )
            
        except Exception as e:
            logger.error(f"[POST_PAYMENT] Failed to schedule Celery tasks: {e}")
            # Fallback: mark for manual processing
            await db.scheduled_emails.update_one(
                {"user_id": user_id, "type": "welcome_analisi"},
                {"$set": {
                    "status": "celery_failed",
                    "celery_error": str(e),
                    "needs_manual_processing": True
                }}
            )
    
    logger.info(f"[POST_PAYMENT] Emails scheduled for {user_id}: booking available at {booking_available_at}")


async def send_payment_notification(user: dict, amount: float, payment_type: str):
    """Send Telegram notification for payment"""
    try:
        import httpx
        
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        
        if not telegram_token or not admin_chat_id:
            return
        
        nome = user.get('nome', '')
        cognome = user.get('cognome', '')
        email = user.get('email', '')
        
        message = f"""💰 *PAGAMENTO CONFERMATO via Webhook*

👤 {nome} {cognome}
📧 {email}
💵 €{amount:.2f}
📋 Tipo: {payment_type}

✅ Automazione post-pagamento avviata"""
        
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                json={
                    "chat_id": admin_chat_id,
                    "text": message,
                    "parse_mode": "Markdown"
                }
            )
    except Exception as e:
        logger.error(f"[STRIPE_WEBHOOK] Telegram notification failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# PARTNERSHIP PAYMENT
# ═══════════════════════════════════════════════════════════════════════════════

async def process_partnership_payment(db, user_id: str, reference_id: str, background_tasks: BackgroundTasks):
    """Process confirmed partnership payment"""
    now = datetime.now(timezone.utc)
    
    # Find user/partner
    user = await db.users.find_one({"id": user_id})
    partner = await db.partners.find_one({"id": user_id}) or await db.partners.find_one({"user_id": user_id})
    
    if not user and not partner:
        logger.error(f"[STRIPE_WEBHOOK] User/Partner not found: {user_id}")
        return
    
    partner_id = partner.get("id") if partner else user_id
    
    # Update partner
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "partnership_pagata": True,
            "data_pagamento_partnership": now.isoformat(),
            "webhook_processed": True,
            "webhook_reference": reference_id,
            "updated_at": now.isoformat()
        }},
        upsert=True
    )

    # Update pagamenti_partnership (usato da flusso_analisi/attiva-partnership)
    await db.pagamenti_partnership.update_one(
        {"user_id": user_id},
        {"$set": {
            "completato": True,
            "pagato_at": now.isoformat(),
            "stripe_session_id": reference_id
        }},
        upsert=True
    )
    
    # Attiva partnership automaticamente (se contratto già firmato)
    async def _trigger_attiva(uid: str):
        try:
            import httpx
            backend_url = os.environ.get("BACKEND_URL", "http://localhost:8001")
            async with httpx.AsyncClient(timeout=10) as hc:
                await hc.post(f"{backend_url}/api/flusso-analisi/attiva-partnership/{uid}")
        except Exception as e:
            logger.warning(f"[STRIPE_WEBHOOK] attiva-partnership call failed (non critico): {e}")

    background_tasks.add_task(_trigger_attiva, user_id)

    # Trigger welcome email for partnership
    background_tasks.add_task(send_partnership_welcome_email, partner_id)

    logger.info(f"[STRIPE_WEBHOOK] Partnership payment processed for {partner_id}")


async def send_partnership_welcome_email(partner_id: str):
    """Send welcome email when partnership is activated"""
    try:
        import httpx
        
        # Call internal API to send welcome email (correct endpoint)
        async with httpx.AsyncClient(timeout=30) as client:
            await client.post(
                f"http://localhost:8001/api/onboarding/send-welcome-email/{partner_id}"
            )
            logger.info(f"[STRIPE_WEBHOOK] Welcome email triggered for partner {partner_id}")
    except Exception as e:
        logger.error(f"[STRIPE_WEBHOOK] Welcome email trigger failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# SERVIZI EXTRA PAYMENT (avatar_pro, consulenza_marketing, branding_pack)
# ═══════════════════════════════════════════════════════════════════════════════

async def process_servizi_extra_payment(db, session_id: str, background_tasks: BackgroundTasks):
    """Handle confirmed payment for servizi extra — update payment_transactions + Systeme sync."""
    now = datetime.now(timezone.utc)

    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if not transaction:
        logger.warning(f"[STRIPE_WEBHOOK] No payment_transaction found for session {session_id}")
        return

    if transaction.get("systeme_synced"):
        logger.info(f"[STRIPE_WEBHOOK] Servizio extra already synced: {session_id}")
        return

    update_data: dict = {
        "payment_status": "paid",
        "paid_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    service_type = transaction.get("service_type", "")
    partner_email = transaction.get("partner_email", "")
    partner_name = transaction.get("partner_name", "")
    amount = float(transaction.get("amount", 0))

    # Fallback: look up email from partners collection
    if not partner_email and transaction.get("partner_id"):
        partner = await db.partners.find_one({"id": transaction["partner_id"]}, {"_id": 0})
        if partner:
            partner_email = partner.get("email", "")
            if not partner_name:
                partner_name = partner.get("name", "")

    if partner_email:
        payment_type_map = {
            "avatar_pro": "avatar",
            "consulenza_marketing": "consulenza",
            "branding_pack": "branding",
        }
        payment_type = payment_type_map.get(service_type, service_type or "unknown")
        name_parts = partner_name.split(" ", 1)
        nome = name_parts[0] if name_parts else ""
        cognome = name_parts[1] if len(name_parts) > 1 else ""

        try:
            result = await _sync_to_systeme(
                db=db,
                email=partner_email,
                nome=nome,
                cognome=cognome,
                payment_type=payment_type,
                amount=amount,
                metadata={
                    "partner_id": transaction.get("partner_id"),
                    "service_type": service_type,
                    "session_id": session_id,
                },
            )
            update_data["systeme_synced"] = result.get("success", False)
            update_data["systeme_sync_result"] = result
        except Exception as e:
            logger.error(f"[STRIPE_WEBHOOK] Systeme sync servizio extra failed: {e}")

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": update_data},
    )
    logger.info(f"[STRIPE_WEBHOOK] Servizio extra processed: {service_type} — {partner_email}")


# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEME.IO SYNC — self-contained (no server.py import to avoid circular deps)
# ═══════════════════════════════════════════════════════════════════════════════

async def _sync_to_systeme(db, email: str, nome: str, cognome: str,
                           payment_type: str, amount: float, metadata: dict = None) -> dict:
    """Sync a confirmed payment to Systeme.io: find/create contact + add tags."""
    import httpx

    api_key = os.environ.get("SYSTEME_API_KEY")
    if not api_key:
        logger.warning("[SYSTEME SYNC] API key not configured — skip")
        return {"success": False, "reason": "api_key_missing"}

    base_url = "https://api.systeme.io/api"
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json", "Accept": "application/json"}

    tags_map = {
        "analisi": ["acquisto_analisi", "cliente_analisi", "pagamento_67"],
        "partnership": ["acquisto_partnership", "partner_attivo", "pagamento_2790", "cliente_premium"],
        "avatar": ["acquisto_avatar", "servizio_extra", "avatar_pro"],
        "consulenza": ["acquisto_consulenza", "servizio_extra", "pagamento_147"],
        "branding": ["acquisto_branding", "servizio_extra", "pagamento_297"],
    }
    tags = list(tags_map.get(payment_type, [f"acquisto_{payment_type}", f"pagamento_{int(amount)}"]))
    month_tag = datetime.now(timezone.utc).strftime("%Y_%m")
    if payment_type in ("analisi", "partnership"):
        tags.append(f"{payment_type}_{month_tag}")

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Find or create contact
            r = await client.get(f"{base_url}/contacts", headers=headers, params={"email": email})
            contacts = r.json().get("items", []) if r.is_success else []
            if contacts:
                contact_id = contacts[0]["id"]
            else:
                cr = await client.post(f"{base_url}/contacts", headers=headers,
                                       json={"email": email, "firstName": nome, "lastName": cognome})
                contact_id = cr.json().get("id") if cr.is_success else None

            if not contact_id:
                logger.error(f"[SYSTEME SYNC] Cannot get contact_id for {email}")
                return {"success": False, "reason": "contact_not_found"}

            tags_added = []
            for tag in tags:
                tr = await client.post(f"{base_url}/contacts/{contact_id}/tags",
                                       headers=headers, json={"name": tag})
                if tr.is_success:
                    tags_added.append(tag)

        # Log sync
        await db.systeme_payment_syncs.insert_one({
            "email": email,
            "payment_type": payment_type,
            "amount": amount,
            "contact_id": contact_id,
            "tags_added": tags_added,
            "metadata": metadata or {},
            "synced_at": datetime.now(timezone.utc).isoformat(),
        })

        logger.info(f"[SYSTEME SYNC] {email} — {payment_type} — tags: {tags_added}")
        return {"success": True, "contact_id": contact_id, "tags_added": tags_added}

    except Exception as e:
        logger.error(f"[SYSTEME SYNC] Error for {email}: {e}")
        return {"success": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# TEST ENDPOINT - SIMULATE PAYMENT (DEV ONLY)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/test-analisi-payment/{user_id}")
async def test_analisi_payment(user_id: str, background_tasks: BackgroundTasks):
    """
    DEV ONLY: Simulates a €67 analisi payment completion.
    Triggers the full post-payment automation flow.
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'evolution_pro')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Find user
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already processed
        if user.get("pagamento_analisi") and user.get("webhook_processed"):
            return {"success": True, "message": "Payment already processed", "user_id": user_id}
        
        # Process payment (same as webhook handler)
        await process_analisi_payment(db, user_id, f"test_session_{user_id}", background_tasks)
        
        return {
            "success": True,
            "message": "Test payment processed successfully",
            "user_id": user_id,
            "automation_triggered": True,
            "tasks_scheduled": [
                "generate_analysis (if questionario completed)",
                "generate_call_script",
                "send_welcome_email (Celery task)",
                "schedule_48h_reminder (Celery task)"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TEST_PAYMENT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        client.close()


@router.get("/test-automation-status/{user_id}")
async def test_automation_status(user_id: str):
    """
    DEV ONLY: Check the status of post-payment automation for a user.
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'evolution_pro')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Get user
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get cliente_analisi record
        cliente_id = user.get("cliente_id")
        cliente = None
        if cliente_id:
            cliente = await db.clienti_analisi.find_one({"id": cliente_id}, {"_id": 0})
        
        # Get scheduled emails
        scheduled_emails = await db.scheduled_emails.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(10)
        
        # Get email logs
        email_logs = await db.email_logs.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(10)
        
        return {
            "user": user,
            "cliente_analisi": cliente,
            "scheduled_emails": scheduled_emails,
            "email_logs": email_logs,
            "automation_status": {
                "payment_confirmed": user.get("pagamento_analisi", False),
                "webhook_processed": user.get("webhook_processed", False),
                "questionario_completed": user.get("questionario_compilato", False),
                "analysis_generated": cliente.get("analisi_generata", False) if cliente else False,
                "call_script_generated": cliente.get("call_script_generato", False) if cliente else False,
                "welcome_email_sent": cliente.get("email_benvenuto_inviata", False) if cliente else False,
                "reminder_48h_sent": cliente.get("reminder_48h_inviato", False) if cliente else False,
                "call_booked": cliente.get("call_prenotata", False) if cliente else False
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TEST_STATUS] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        client.close()
