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
import json
import logging
import stripe
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


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
    
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    stripe_key = os.environ.get('STRIPE_API_KEY')
    
    if not stripe_key:
        logger.error("[STRIPE_WEBHOOK] STRIPE_API_KEY not configured")
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe.api_key = stripe_key
    
    event = None
    
    # Verify webhook signature if secret is configured
    if webhook_secret and webhook_secret != 'whsec_YOUR_WEBHOOK_SECRET_HERE':
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError as e:
            logger.error(f"[STRIPE_WEBHOOK] Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"[STRIPE_WEBHOOK] Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # No webhook secret, parse payload directly (dev mode)
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event_type = event.get('type') if isinstance(event, dict) else event.type
    data = event.get('data', {}).get('object', {}) if isinstance(event, dict) else event.data.object
    
    logger.info(f"[STRIPE_WEBHOOK] Received event: {event_type}")
    
    # Handle events
    if event_type == 'checkout.session.completed':
        await handle_checkout_completed(db, data, background_tasks)
    elif event_type == 'payment_intent.succeeded':
        await handle_payment_succeeded(db, data, background_tasks)
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
    
    if tipo == 'analisi_strategica':
        await process_analisi_payment(db, user_id, session_id, background_tasks)
    elif tipo == 'partnership':
        await process_partnership_payment(db, user_id, session_id, background_tasks)
    else:
        logger.warning(f"[STRIPE_WEBHOOK] Unknown payment type: {tipo}")


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
            "data_pagamento_analisi": now.isoformat(),
            "webhook_processed": True,
            "webhook_reference": reference_id,
            "cliente_id": cliente_id,
            "stato_processo": "pagamento_completato"
        }}
    )
    
    logger.info(f"[STRIPE_WEBHOOK] Payment confirmed for user {user_id}")
    
    # 2. Create/update clienti_analisi record
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
    
    # 3. Send Telegram notification
    await send_payment_notification(user, 67, "analisi_strategica")
    
    # 4. Schedule background automation tasks
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
    """Trigger automatic AI analysis generation"""
    try:
        import httpx
        
        # Call internal API to generate analysis
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                "http://localhost:8001/api/clienti-analisi/genera-analisi-auto",
                json={"cliente_id": cliente_id}
            )
            
            if response.status_code == 200:
                return True
            else:
                logger.error(f"[POST_PAYMENT] Analysis API returned {response.status_code}")
                return False
                
    except Exception as e:
        logger.error(f"[POST_PAYMENT] Analysis trigger error: {e}")
        return False


async def trigger_call_script_generation(db, user_id: str, cliente_id: str) -> bool:
    """Generate call script (8 blocks) for the analysis delivery call"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get cliente data
        cliente = await db.clienti_analisi.find_one({"id": cliente_id})
        user = await db.users.find_one({"id": user_id})
        
        if not cliente or not user:
            return False
        
        # Build context from questionario
        questionario = user.get("questionario_responses", {}) or cliente.get("questionario_responses", {})
        nome = user.get("nome", "") or cliente.get("nome", "")
        
        prompt = f"""Genera uno script per la videocall di consegna analisi strategica per il cliente {nome}.

Dati dal questionario:
{json.dumps(questionario, indent=2, ensure_ascii=False) if questionario else "Non disponibili"}

Lo script deve avere esattamente 8 blocchi:

1. APERTURA (2 min) - Saluto, ringraziamento per la fiducia, agenda della call
2. SITUAZIONE ATTUALE (3 min) - Riepilogo della situazione emersa dal questionario
3. DIAGNOSI (5 min) - I 3 principali blocchi/problemi identificati
4. OPPORTUNITÀ (3 min) - Le 3 opportunità di crescita più immediate
5. STRATEGIA (5 min) - Il percorso consigliato (high level)
6. CASI STUDIO (3 min) - 1-2 esempi di risultati simili ottenuti
7. PROPOSTA (5 min) - Presentazione della partnership Evolution PRO
8. PROSSIMI PASSI (2 min) - Call to action, scadenza offerta, Q&A

Per ogni blocco fornisci:
- Titolo
- Durata suggerita
- Script parlato (in prima persona, tono professionale ma caldo)
- Note per il coach

Rispondi in JSON con questo formato:
{{
  "script_blocks": [
    {{
      "numero": 1,
      "titolo": "APERTURA",
      "durata_minuti": 2,
      "script": "Testo dello script...",
      "note_coach": "Note per il coach..."
    }},
    ...
  ],
  "durata_totale_minuti": 28,
  "personalizzazione": "Note sulla personalizzazione per questo cliente"
}}
"""
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            logger.error("[POST_PAYMENT] EMERGENT_LLM_KEY not configured")
            return False
        
        llm = LlmChat(api_key=api_key, model="claude-sonnet-4-20250514")
        response = await llm.send_message(UserMessage(text=prompt))
        
        # Parse response
        try:
            # Extract JSON from response
            response_text = response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            script_data = json.loads(response_text.strip())
            
            # Save to cliente
            await db.clienti_analisi.update_one(
                {"id": cliente_id},
                {"$set": {
                    "call_script": script_data,
                    "call_script_generato": True,
                    "call_script_generato_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return True
            
        except json.JSONDecodeError as e:
            logger.error(f"[POST_PAYMENT] Failed to parse call script JSON: {e}")
            # Save raw response anyway
            await db.clienti_analisi.update_one(
                {"id": cliente_id},
                {"$set": {
                    "call_script_raw": response,
                    "call_script_error": str(e)
                }}
            )
            return False
            
    except Exception as e:
        logger.error(f"[POST_PAYMENT] Call script generation error: {e}")
        return False


async def schedule_post_payment_emails(db, user_id: str, cliente_id: str):
    """Schedule welcome email and T+48h reminder"""
    now = datetime.now(timezone.utc)
    
    # Calculate times
    # Booking link available 48h after analysis creation
    # Welcome email: sent immediately but link works after 48h
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
    
    # Trigger welcome email for partnership
    background_tasks.add_task(send_partnership_welcome_email, partner_id)
    
    logger.info(f"[STRIPE_WEBHOOK] Partnership payment processed for {partner_id}")


async def send_partnership_welcome_email(partner_id: str):
    """Send welcome email when partnership is activated"""
    try:
        import httpx
        
        # Call internal API to send welcome email
        async with httpx.AsyncClient(timeout=30) as client:
            await client.post(
                "http://localhost:8001/api/partners/send-welcome-email",
                json={"partner_id": partner_id}
            )
    except Exception as e:
        logger.error(f"[STRIPE_WEBHOOK] Welcome email trigger failed: {e}")
