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
        # Check if this is a proposta-based payment (has token in metadata)
        token = metadata.get('token')
        if token:
            try:
                from routers.proposta import gestisci_pagamento_partnership
                await gestisci_pagamento_partnership(session_id, metadata)
            except Exception as e:
                logger.error(f"[STRIPE_WEBHOOK] Proposta partnership handler error: {e}")
        # Also run the standard partnership flow
        partner_id = metadata.get('partner_id') or user_id
        if partner_id:
            await process_partnership_payment(db, partner_id, session_id, background_tasks)
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
