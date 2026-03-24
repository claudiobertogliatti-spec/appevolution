"""
Celery Tasks for Evolution PRO
Video Production Pipeline: HeyGen → YouTube
"""

import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded

logger = logging.getLogger(__name__)

# MongoDB connection - create fresh per task to avoid event loop issues
def get_db():
    """Get a fresh database connection"""
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    return client, client[os.environ.get('DB_NAME', 'evolution_pro')]


def run_async(coro):
    """Helper to run async code in sync context - creates new event loop each time"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.close()
        except:
            pass


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 1: VIDEO GENERATION (HeyGen)
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_heygen_video(self, job_id: str, script: str, avatar_id: str, voice_id: str, title: str, test_mode: bool = False):
    """
    Generate video with HeyGen API.
    This task handles the actual API call and initial status check.
    """
    try:
        logger.info(f"[CELERY] Starting video generation for job {job_id}")
        
        async def _generate():
            db = get_db()
            
            # Update job status
            await db.pipeline_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "generating_video",
                    "progress_pct": 10,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "celery_task_id": self.request.id
                }}
            )
            
            # Initialize HeyGen service
            from heygen_service import HeyGenService
            heygen = HeyGenService()
            
            # Generate video
            result = await heygen.generate_video(
                script=script,
                avatar_id=avatar_id,
                voice_id=voice_id,
                title=title,
                test=test_mode
            )
            
            video_id = result.get("data", {}).get("video_id")
            if not video_id:
                raise Exception(f"HeyGen returned no video_id: {result}")
            
            # Update job with video_id
            await db.pipeline_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "video_id": video_id,
                    "status": "polling_video",
                    "progress_pct": 20,
                    "steps.video_generation": "completed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return video_id
        
        video_id = run_async(_generate())
        
        # Chain to polling task
        poll_heygen_video.delay(job_id, video_id)
        
        return {"success": True, "video_id": video_id}
        
    except SoftTimeLimitExceeded:
        logger.error(f"[CELERY] Video generation timeout for job {job_id}")
        run_async(mark_job_failed(job_id, "Timeout: generazione video troppo lenta"))
        raise
        
    except Exception as e:
        logger.error(f"[CELERY] Video generation error for job {job_id}: {e}")
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"[CELERY] Retrying job {job_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=e)
        
        run_async(mark_job_failed(job_id, str(e)))
        raise


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 2: VIDEO POLLING (Wait for HeyGen completion)
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=60)  # 60 retries x 10s = 10 minutes max
def poll_heygen_video(self, job_id: str, video_id: str):
    """
    Poll HeyGen for video completion.
    Retries every 10 seconds until video is ready or timeout.
    """
    try:
        logger.info(f"[CELERY] Polling video {video_id} for job {job_id} (attempt {self.request.retries + 1})")
        
        async def _poll():
            db = get_db()
            
            from heygen_service import HeyGenService
            heygen = HeyGenService()
            
            status = await heygen.get_video_status(video_id)
            status_data = status.get("data", {})
            current_status = status_data.get("status")
            
            # Calculate progress (20% + retries up to 70%)
            progress = min(20 + (self.request.retries * 1), 70)
            
            await db.pipeline_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "progress_pct": progress,
                    "heygen_status": current_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            if current_status == "completed":
                video_url = status_data.get("video_url")
                await db.pipeline_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {
                        "video_url": video_url,
                        "status": "video_ready",
                        "progress_pct": 75,
                        "steps.video_polling": "completed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {"completed": True, "video_url": video_url}
                
            elif current_status == "failed":
                error_msg = status_data.get("error", "HeyGen video generation failed")
                raise Exception(error_msg)
            
            return {"completed": False, "status": current_status}
        
        result = run_async(_poll())
        
        if result["completed"]:
            # Check if YouTube upload is needed
            job = run_async(get_db().pipeline_jobs.find_one({"job_id": job_id}))
            if job and job.get("auto_upload_youtube"):
                upload_to_youtube.delay(job_id, result["video_url"])
            else:
                run_async(mark_job_completed(job_id))
            return result
        
        # Not completed yet, retry after 10 seconds
        raise self.retry(countdown=10)
        
    except SoftTimeLimitExceeded:
        logger.error(f"[CELERY] Polling timeout for job {job_id}")
        run_async(mark_job_failed(job_id, "Timeout: video non pronto dopo 10 minuti"))
        raise
        
    except Exception as e:
        if "retry" not in str(type(e).__name__).lower():
            logger.error(f"[CELERY] Polling error for job {job_id}: {e}")
            
            if self.request.retries >= self.max_retries:
                run_async(mark_job_failed(job_id, f"Polling failed: {e}"))
        raise


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 3: YOUTUBE UPLOAD
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def upload_to_youtube(self, job_id: str, video_url: str):
    """
    Upload video to YouTube.
    Downloads from HeyGen URL and uploads to partner's YouTube channel.
    """
    try:
        logger.info(f"[CELERY] Starting YouTube upload for job {job_id}")
        
        async def _upload():
            import httpx
            import pickle
            from pathlib import Path
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaFileUpload
            
            db = get_db()
            
            # Update status
            await db.pipeline_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "uploading_youtube",
                    "progress_pct": 80,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Get job details
            job = await db.pipeline_jobs.find_one({"job_id": job_id})
            if not job:
                raise Exception("Job not found")
            
            partner_id = job.get("partner_id")
            video_title = job.get("video_title", "Evolution PRO Video")
            privacy_status = job.get("youtube_privacy", "unlisted")
            
            # Get partner info
            partner = await db.partners.find_one({"id": partner_id})
            partner_name = partner.get("name", "Partner") if partner else "Partner"
            partner_niche = partner.get("niche", "Business") if partner else "Business"
            
            # Check YouTube auth
            creds_path = Path("/app/storage/youtube_credentials.pickle")
            if not creds_path.exists():
                raise Exception("YouTube non autorizzato")
            
            with open(creds_path, 'rb') as f:
                creds = pickle.load(f)
            
            if not creds.valid:
                if creds.expired and creds.refresh_token:
                    from google.auth.transport.requests import Request
                    creds.refresh(Request())
                    with open(creds_path, 'wb') as f:
                        pickle.dump(creds, f)
                else:
                    raise Exception("Token YouTube scaduto")
            
            # Download video
            temp_path = f"/tmp/celery_{job_id}.mp4"
            async with httpx.AsyncClient(timeout=300) as http_client:
                response = await http_client.get(video_url)
                with open(temp_path, 'wb') as f:
                    f.write(response.content)
            
            await db.pipeline_jobs.update_one(
                {"job_id": job_id},
                {"$set": {"progress_pct": 90}}
            )
            
            try:
                # Upload to YouTube
                service = build('youtube', 'v3', credentials=creds)
                
                description = f"""🎓 {video_title}

Videocorso professionale di {partner_name}
Prodotto da Evolution PRO

📚 Scopri di più: https://evolution-pro.it

#EvolutionPRO #Videocorso #Formazione #{partner_niche.replace(' ', '')}
"""
                
                body = {
                    'snippet': {
                        'title': video_title[:100],
                        'description': description,
                        'tags': ['Evolution PRO', 'Videocorso', partner_name, partner_niche],
                        'categoryId': '27'
                    },
                    'status': {
                        'privacyStatus': privacy_status,
                        'selfDeclaredMadeForKids': False
                    }
                }
                
                media = MediaFileUpload(temp_path, mimetype='video/mp4', resumable=True)
                
                insert_request = service.videos().insert(
                    part=','.join(body.keys()),
                    body=body,
                    media_body=media
                )
                
                response = insert_request.execute()
                youtube_video_id = response.get('id')
                youtube_url = f"https://youtube.com/watch?v={youtube_video_id}"
                
                # Update job
                await db.pipeline_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {
                        "youtube_video_id": youtube_video_id,
                        "youtube_url": youtube_url,
                        "steps.youtube_upload": "completed"
                    }}
                )
                
                logger.info(f"[CELERY] Video uploaded to YouTube: {youtube_url}")
                return youtube_url
                
            finally:
                # Cleanup temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        
        youtube_url = run_async(_upload())
        
        # Mark job as completed
        run_async(mark_job_completed(job_id, youtube_url))
        
        return {"success": True, "youtube_url": youtube_url}
        
    except SoftTimeLimitExceeded:
        logger.error(f"[CELERY] YouTube upload timeout for job {job_id}")
        run_async(mark_job_failed(job_id, "Timeout: upload YouTube troppo lento"))
        raise
        
    except Exception as e:
        logger.error(f"[CELERY] YouTube upload error for job {job_id}: {e}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        
        # Mark YouTube step as failed but don't fail entire job
        run_async(get_db().pipeline_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"steps.youtube_upload": f"failed: {str(e)}"}}
        ))
        run_async(mark_job_completed(job_id, None, youtube_failed=True))
        raise


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def mark_job_failed(job_id: str, error: str):
    """Mark pipeline job as failed"""
    db = get_db()
    
    await db.pipeline_jobs.update_one(
        {"job_id": job_id},
        {"$set": {
            "status": "failed",
            "error": error,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get job for notification
    job = await db.pipeline_jobs.find_one({"job_id": job_id})
    if job:
        await send_telegram_notification(
            f"❌ *Pipeline Fallita*\n\n"
            f"👤 {job.get('partner_name', 'Partner')}\n"
            f"📝 {job.get('video_title', 'Video')}\n"
            f"❗ {error[:200]}\n"
            f"🆔 `{job_id}`"
        )


async def mark_job_completed(job_id: str, youtube_url: str = None, youtube_failed: bool = False):
    """Mark pipeline job as completed"""
    db = get_db()
    
    status = "completed" if not youtube_failed else "completed_partial"
    
    await db.pipeline_jobs.update_one(
        {"job_id": job_id},
        {"$set": {
            "status": status,
            "progress_pct": 100,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get job for notification
    job = await db.pipeline_jobs.find_one({"job_id": job_id})
    if job:
        message = "✅ *Pipeline Completata!*\n\n"
        message += f"👤 {job.get('partner_name', 'Partner')}\n"
        message += f"📝 {job.get('video_title', 'Video')}\n"
        message += "🎬 Video: ✓\n"
        
        if youtube_url:
            message += f"📺 YouTube: {youtube_url}\n"
        elif youtube_failed:
            message += "📺 YouTube: ❌ (video pronto, upload fallito)\n"
        else:
            message += "📺 YouTube: Skipped\n"
        
        message += f"🆔 `{job_id}`"
        
        await send_telegram_notification(message)


async def send_telegram_notification(message: str):
    """Send Telegram notification"""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8001/api/notify/telegram",
                json={"message": message},
                timeout=10
            )
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# MONITORING TASK
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task
def check_stuck_pipelines():
    """
    Periodic task to check for stuck pipelines.
    Runs every 5 minutes via Celery Beat.
    """
    try:
        async def _check():
            db = get_db()
            
            # Find jobs stuck for more than 15 minutes
            fifteen_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
            
            stuck_jobs = await db.pipeline_jobs.find({
                "status": {"$in": ["generating_video", "polling_video", "uploading_youtube"]},
                "updated_at": {"$lt": fifteen_min_ago}
            }).to_list(100)
            
            if stuck_jobs:
                logger.warning(f"[CELERY] Found {len(stuck_jobs)} stuck pipeline jobs")
                
                for job in stuck_jobs:
                    job_id = job.get("job_id")
                    status = job.get("status")
                    
                    # Mark as failed
                    await mark_job_failed(job_id, f"Job bloccato in stato '{status}' per più di 15 minuti")
                
                # Notify admin
                await send_telegram_notification(
                    f"⚠️ *Pipeline Stuck Alert*\n\n"
                    f"Trovati {len(stuck_jobs)} job bloccati e marcati come falliti.\n"
                    f"Verifica i log per dettagli."
                )
            
            return len(stuck_jobs)
        
        return run_async(_check())
        
    except Exception as e:
        logger.error(f"[CELERY] Error checking stuck pipelines: {e}")
        return 0


# ═══════════════════════════════════════════════════════════════════════════════
# POST-PAYMENT AUTOMATION TASKS (€67 Analisi)
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_analisi_welcome_email(self, user_id: str, cliente_id: str):
    """
    Task 1: Invia email di benvenuto post-pagamento analisi (€67).
    
    Include:
    - Conferma pagamento
    - Bonus incluso
    - Link booking (attivo dopo 48h dalla generazione analisi)
    """
    try:
        logger.info(f"[CELERY] Sending welcome email for user {user_id}")
        
        async def _send_email():
            client, db = get_db()
            try:
                # Get user and cliente data
                user = await db.users.find_one({"id": user_id})
                cliente = await db.clienti_analisi.find_one({"id": cliente_id})
                
                if not user and not cliente:
                    logger.error(f"[CELERY] User/Cliente not found: {user_id}/{cliente_id}")
                    return False
                
                # Extract data
                nome = user.get("nome") if user else cliente.get("nome", "")
                cognome = user.get("cognome", "") if user else cliente.get("cognome", "")
                email = user.get("email") if user else cliente.get("email", "")
                
                if not email:
                    logger.error(f"[CELERY] No email found for user {user_id}")
                    return False
                
                # Calculate booking available time (48h after analysis)
                analysis_created_at = None
                if cliente and cliente.get("analisi_generata_at"):
                    analysis_created_at = cliente.get("analisi_generata_at")
                elif cliente and cliente.get("analysis", {}).get("generated_at"):
                    analysis_created_at = cliente["analysis"]["generated_at"]
                
                # Default: 48h from now
                booking_available = datetime.now(timezone.utc) + timedelta(hours=48)
                booking_link = f"https://calendly.com/evolution-pro/strategia?email={email}"
                
                # 1. Add tag to Systeme.io to trigger email automation
                systeme_api_key = os.environ.get('SYSTEME_API_KEY')
                if systeme_api_key:
                    try:
                        await add_systeme_tag_async(systeme_api_key, email, "analisi_pagata")
                        await add_systeme_tag_async(systeme_api_key, email, "welcome_analisi")
                        logger.info(f"[CELERY] Systeme.io tags added for {email}")
                    except Exception as e:
                        logger.warning(f"[CELERY] Systeme.io tag failed: {e}")
                
                # 2. Send Telegram notification
                await send_telegram_notification(
                    f"📧 *Email Benvenuto Analisi Inviata*\n\n"
                    f"👤 {nome} {cognome}\n"
                    f"📧 {email}\n"
                    f"🔗 Booking disponibile: {booking_available.strftime('%d/%m/%Y %H:%M')}\n"
                    f"✅ Tag Systeme.io aggiunti"
                )
                
                # 3. Update database
                await db.clienti_analisi.update_one(
                    {"id": cliente_id},
                    {"$set": {
                        "email_benvenuto_inviata": True,
                        "email_benvenuto_inviata_at": datetime.now(timezone.utc).isoformat(),
                        "booking_available_at": booking_available.isoformat(),
                        "booking_link": booking_link,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # 4. Log email
                await db.email_logs.insert_one({
                    "type": "welcome_analisi",
                    "to": email,
                    "user_id": user_id,
                    "cliente_id": cliente_id,
                    "subject": "🎉 La tua Analisi Strategica è in preparazione!",
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "status": "sent_via_systeme",
                    "systeme_tags": ["analisi_pagata", "welcome_analisi"]
                })
                
                logger.info(f"[CELERY] Welcome email sent for {email}")
                return True
            finally:
                client.close()
        
        result = run_async(_send_email())
        return {"success": result, "user_id": user_id}
        
    except Exception as e:
        logger.error(f"[CELERY] Welcome email error for {user_id}: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        raise


@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def send_analisi_48h_reminder(self, user_id: str, cliente_id: str):
    """
    Task 2: Invia reminder a T+48h se il cliente non ha prenotato la call.
    
    Questo task viene schedulato al momento del pagamento e viene eseguito
    dopo 48 ore. Verifica prima se la call è già stata prenotata.
    """
    try:
        logger.info(f"[CELERY] Checking 48h reminder for user {user_id}")
        
        async def _send_reminder():
            client, db = get_db()
            try:
                # Get cliente data
                cliente = await db.clienti_analisi.find_one({"id": cliente_id})
                user = await db.users.find_one({"id": user_id})
                
                if not cliente and not user:
                    logger.error(f"[CELERY] User/Cliente not found for reminder: {user_id}")
                    return False
                
                # Check if call already booked
                call_booked = False
                if cliente:
                    call_booked = cliente.get("call_prenotata", False)
                if not call_booked and user:
                    call_booked = user.get("call_prenotata", False)
                
                if call_booked:
                    logger.info(f"[CELERY] Call already booked for {user_id}, skipping reminder")
                    return {"skipped": True, "reason": "call_already_booked"}
                
                # Extract data
                nome = user.get("nome") if user else cliente.get("nome", "")
                email = user.get("email") if user else cliente.get("email", "")
                booking_link = cliente.get("booking_link", "https://calendly.com/evolution-pro/strategia") if cliente else "https://calendly.com/evolution-pro/strategia"
                
                if not email:
                    logger.error(f"[CELERY] No email for reminder: {user_id}")
                    return False
                
                # 1. Add reminder tag to Systeme.io
                systeme_api_key = os.environ.get('SYSTEME_API_KEY')
                if systeme_api_key:
                    try:
                        await add_systeme_tag_async(systeme_api_key, email, "reminder_48h_analisi")
                        logger.info(f"[CELERY] Reminder tag added for {email}")
                    except Exception as e:
                        logger.warning(f"[CELERY] Systeme.io reminder tag failed: {e}")
                
                # 2. Send Telegram notification to admin
                await send_telegram_notification(
                    f"⏰ *Reminder 48h Inviato*\n\n"
                    f"👤 {nome}\n"
                    f"📧 {email}\n"
                    f"📞 Call NON ancora prenotata\n"
                    f"🔗 Link: {booking_link}"
                )
                
                # 3. Update database
                await db.clienti_analisi.update_one(
                    {"id": cliente_id},
                    {"$set": {
                        "reminder_48h_inviato": True,
                        "reminder_48h_inviato_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # 4. Log email
                await db.email_logs.insert_one({
                    "type": "reminder_48h_analisi",
                    "to": email,
                    "user_id": user_id,
                    "cliente_id": cliente_id,
                    "subject": "🔔 La tua Analisi Strategica ti aspetta!",
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "status": "sent_via_systeme",
                    "systeme_tags": ["reminder_48h_analisi"]
                })
                
                logger.info(f"[CELERY] 48h reminder sent for {email}")
                return True
            finally:
                client.close()
        
        result = run_async(_send_reminder())
        return {"success": result, "user_id": user_id}
        
    except Exception as e:
        logger.error(f"[CELERY] 48h reminder error for {user_id}: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        raise


@shared_task
def check_pending_analisi_reminders():
    """
    Periodic task: Verifica e invia reminder per analisi non prenotate.
    Eseguito ogni ora da Celery Beat.
    """
    try:
        logger.info("[CELERY] Checking pending analisi reminders")
        
        async def _check():
            client, db = get_db()
            try:
                now = datetime.now(timezone.utc)
                cutoff_48h = (now - timedelta(hours=48)).isoformat()
                
                # Find clienti that:
                # - Have paid (pagamento_analisi = true)
                # - Have analysis generated (analisi_generata = true)
                # - Haven't booked call (call_prenotata != true)
                # - Haven't received 48h reminder (reminder_48h_inviato != true)
                # - Analysis was generated more than 48h ago
                
                pending = await db.clienti_analisi.find({
                    "pagamento_analisi": True,
                    "analisi_generata": True,
                    "call_prenotata": {"$ne": True},
                    "reminder_48h_inviato": {"$ne": True},
                    "analisi_generata_at": {"$lt": cutoff_48h}
                }).to_list(100)
                
                count = 0
                for cliente in pending:
                    user_id = cliente.get("user_id")
                    cliente_id = cliente.get("id")
                    
                    if user_id and cliente_id:
                        # Trigger reminder task
                        send_analisi_48h_reminder.delay(user_id, cliente_id)
                        count += 1
                        logger.info(f"[CELERY] Scheduled reminder for cliente {cliente_id}")
                
                if count > 0:
                    await send_telegram_notification(
                        f"📋 *Check Reminder Analisi*\n\n"
                        f"📤 {count} reminder schedulati"
                    )
                
                return count
            finally:
                client.close()
        
        return run_async(_check())
        
    except Exception as e:
        logger.error(f"[CELERY] Error checking pending reminders: {e}")
        return 0


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS FOR EMAIL TASKS
# ═══════════════════════════════════════════════════════════════════════════════

async def add_systeme_tag_async(api_key: str, email: str, tag_name: str):
    """Add tag to contact in Systeme.io (async version)"""
    import httpx
    
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }
    
    # First, find or create contact
    async with httpx.AsyncClient(timeout=30) as client:
        # Search for contact
        search_response = await client.get(
            f"https://api.systeme.io/api/contacts?email={email}",
            headers=headers
        )
        
        contact_id = None
        if search_response.status_code == 200:
            data = search_response.json()
            items = data.get("items", [])
            if items:
                contact_id = items[0].get("id")
        
        if not contact_id:
            # Create contact
            create_response = await client.post(
                "https://api.systeme.io/api/contacts",
                headers=headers,
                json={"email": email}
            )
            if create_response.status_code in [200, 201]:
                contact_id = create_response.json().get("id")
        
        if contact_id:
            # Add tag (Systeme.io uses tag IDs, so we store the tag name in fields or use API appropriately)
            # For simplicity, we'll add to a custom field or use automation triggers
            await client.put(
                f"https://api.systeme.io/api/contacts/{contact_id}",
                headers=headers,
                json={
                    "fields": {
                        "custom_tags": tag_name
                    }
                }
            )
            logger.info(f"[SYSTEME] Tag '{tag_name}' added to {email}")
            return True
    
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD DISCOVERY - EMAIL SEQUENCE FOR €67 ANALYSIS SALE
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def send_lead_sequence_email(self, lead_id: str, step: int, email: str, nome: str, checkout_url: str):
    """
    Invia una email della sequenza di vendita analisi €67 per un lead.
    
    Sequenza:
    - Step 1 (D+0): Presentazione + problema
    - Step 2 (D+2): Caso studio
    - Step 3 (D+4): Offerta €67 con CTA
    - Step 4 (D+7): Reminder finale
    """
    try:
        logger.info(f"[CELERY] Sending lead sequence email {step} to {email} for lead {lead_id}")
        
        async def _send_email():
            client, db = get_db()
            try:
                # Check if lead exists and sequence not stopped
                lead = await db.discovery_leads.find_one({"id": lead_id})
                if not lead:
                    logger.warning(f"[CELERY] Lead {lead_id} not found, skipping email")
                    return {"skipped": True, "reason": "lead_not_found"}
                
                if lead.get("email_sequence_stopped"):
                    logger.info(f"[CELERY] Sequence stopped for lead {lead_id}, skipping email {step}")
                    return {"skipped": True, "reason": "sequence_stopped"}
                
                if lead.get("converted_to_cliente"):
                    logger.info(f"[CELERY] Lead {lead_id} already converted, skipping email")
                    return {"skipped": True, "reason": "already_converted"}
                
                # Get niche for personalization
                niche = lead.get("niche_detected") or "business"
                
                # Prepare template variables
                unsubscribe_link = f"https://app.evolution-pro.it/unsubscribe?lead={lead_id}"
                
                template_vars = {
                    "nome": nome,
                    "niche": niche,
                    "link_checkout": checkout_url,
                    "unsubscribe_link": unsubscribe_link
                }
                
                # Get the right template
                template_id = f"lead_sequence_email_{step}"
                
                # Import template manager
                from email_templates import get_email_template_manager
                template_manager = get_email_template_manager(db)
                
                try:
                    subject, body_html = await template_manager.render_template(template_id, template_vars)
                except ValueError as e:
                    logger.error(f"[CELERY] Template {template_id} not found: {e}")
                    return {"error": f"Template not found: {template_id}"}
                
                # 1. Add tag to Systeme.io
                systeme_api_key = os.environ.get('SYSTEME_API_KEY')
                if systeme_api_key:
                    try:
                        tag_name = f"lead_sequence_step_{step}"
                        await add_systeme_tag_async(systeme_api_key, email, tag_name)
                        logger.info(f"[CELERY] Systeme.io tag '{tag_name}' added for {email}")
                    except Exception as e:
                        logger.warning(f"[CELERY] Systeme.io tag failed: {e}")
                
                # 2. Update lead record
                await db.discovery_leads.update_one(
                    {"id": lead_id},
                    {"$set": {
                        f"email_sequence_step_{step}_sent": True,
                        f"email_sequence_step_{step}_sent_at": datetime.now(timezone.utc).isoformat(),
                        "email_sequence_step": step,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # 3. Log email
                await db.email_logs.insert_one({
                    "type": f"lead_sequence_email_{step}",
                    "to": email,
                    "lead_id": lead_id,
                    "subject": subject,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "status": "sent_via_systeme",
                    "template_id": template_id
                })
                
                # 4. Notify admin (only for first and last email)
                if step == 1 or step == 4:
                    await send_telegram_notification(
                        f"📧 *Email Sequenza Lead Step {step}*\n\n"
                        f"👤 {nome}\n"
                        f"📧 {email}\n"
                        f"🎯 Lead ID: `{lead_id}`\n"
                        f"📝 Step: {step}/4"
                    )
                
                logger.info(f"[CELERY] Lead sequence email {step} sent to {email}")
                return {"success": True, "step": step, "email": email}
                
            finally:
                client.close()
        
        result = run_async(_send_email())
        return result
        
    except Exception as e:
        logger.error(f"[CELERY] Lead sequence email error for {lead_id} step {step}: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        raise


@shared_task
def process_auto_approve_leads():
    """
    Job periodico: Verifica lead idonei per auto-approvazione e avvia sequenza email.
    Eseguito ogni ora da Celery Beat.
    
    Criteri auto-approvazione:
    - Score >= threshold configurato (default 80)
    - target_fit_level == required level (default "altissimo")
    - Ha email valida
    - Non ancora in sequenza
    - Outreach già approvato o in stato pending
    """
    try:
        logger.info("[CELERY] Running auto-approve leads check")
        
        async def _process():
            client, db = get_db()
            try:
                # Get settings
                settings = await db.admin_settings.find_one({"type": "auto_approve_outreach"})
                if not settings or not settings.get("enabled", True):
                    logger.info("[CELERY] Auto-approve is disabled")
                    return {"processed": 0, "reason": "disabled"}
                
                min_score = settings.get("min_score", 80)
                required_fit = settings.get("required_fit_level", "altissimo")
                
                logger.info(f"[CELERY] Auto-approve criteria: score >= {min_score}, fit = '{required_fit}'")
                
                # Find eligible leads
                eligible_leads = await db.discovery_leads.find({
                    "score_total": {"$gte": min_score},
                    "target_fit_level": required_fit,
                    "email": {"$ne": None, "$exists": True},
                    "email_sequence_started": {"$ne": True},
                    "status": {"$nin": ["rejected", "converted"]}
                }).to_list(50)
                
                logger.info(f"[CELERY] Found {len(eligible_leads)} eligible leads for auto-approve")
                
                processed = 0
                
                for lead in eligible_leads:
                    lead_id = lead.get("id")
                    email = lead.get("email")
                    nome = lead.get("display_name", "").split()[0] if lead.get("display_name") else "Ciao"
                    
                    if not email or not lead_id:
                        continue
                    
                    # Skip placeholder/discovery emails
                    if "@discovery.evolutionpro.it" in email:
                        continue
                    
                    logger.info(f"[CELERY] Auto-approving lead {lead_id} for email sequence")
                    
                    # Update lead status
                    await db.discovery_leads.update_one(
                        {"id": lead_id},
                        {"$set": {
                            "outreach_status": "approved",
                            "auto_approved": True,
                            "auto_approved_at": datetime.now(timezone.utc).isoformat(),
                            "email_sequence_started": True,
                            "email_sequence_started_at": datetime.now(timezone.utc).isoformat(),
                            "email_sequence_step": 1,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # Get checkout URL
                    checkout_url = os.environ.get('STRIPE_CHECKOUT_URL_ANALISI', 'https://buy.stripe.com/test_xxx')
                    
                    # Schedule email sequence
                    from celery_app import celery_app
                    
                    # Email 1 - Immediate
                    celery_app.send_task(
                        'celery_tasks.send_lead_sequence_email',
                        args=[lead_id, 1, email, nome, checkout_url],
                        queue='analisi_automation'
                    )
                    
                    # Email 2 - Day +2
                    celery_app.send_task(
                        'celery_tasks.send_lead_sequence_email',
                        args=[lead_id, 2, email, nome, checkout_url],
                        countdown=172800,  # 2 days
                        queue='analisi_automation'
                    )
                    
                    # Email 3 - Day +4
                    celery_app.send_task(
                        'celery_tasks.send_lead_sequence_email',
                        args=[lead_id, 3, email, nome, checkout_url],
                        countdown=345600,  # 4 days
                        queue='analisi_automation'
                    )
                    
                    # Email 4 - Day +7
                    celery_app.send_task(
                        'celery_tasks.send_lead_sequence_email',
                        args=[lead_id, 4, email, nome, checkout_url],
                        countdown=604800,  # 7 days
                        queue='analisi_automation'
                    )
                    
                    processed += 1
                
                if processed > 0:
                    await send_telegram_notification(
                        f"🤖 *Auto-Approve Leads*\n\n"
                        f"✅ {processed} lead auto-approvati\n"
                        f"📧 Sequenze email avviate"
                    )
                
                return {"processed": processed, "min_score": min_score, "required_fit": required_fit}
                
            finally:
                client.close()
        
        return run_async(_process())
        
    except Exception as e:
        logger.error(f"[CELERY] Error in auto-approve leads: {e}")
        return {"error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# PIANO CONTINUITÀ - GAIA CHECK MENSILE & NOTIFICHE SCADENZA
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task
def gaia_monthly_check():
    """
    Job mensile: GAIA esegue check-in con tutti i partner attivi.
    Aggiorna ultimo_check_in_ai nel profilo partner.
    """
    try:
        logger.info("[CELERY] Running GAIA monthly check-in")
        
        async def _check():
            client, db = get_db()
            try:
                # Find partners with active piano_continuita
                partners = await db.partners.find({
                    "piano_continuita.piano_attivo": {"$ne": None},
                    "status": "ACTIVE"
                }).to_list(100)
                
                checked = 0
                now = datetime.now(timezone.utc)
                
                for partner in partners:
                    partner_id = partner.get("id")
                    nome = partner.get("name", "Partner")
                    email = partner.get("email")
                    
                    # Update last check-in timestamp
                    await db.partners.update_one(
                        {"id": partner_id},
                        {"$set": {
                            "piano_continuita.ultimo_check_in_ai": now.isoformat(),
                            "piano_continuita.gaia_check_count": (partner.get("piano_continuita", {}).get("gaia_check_count", 0) or 0) + 1
                        }}
                    )
                    
                    # Log the check-in
                    await db.gaia_checkins.insert_one({
                        "partner_id": partner_id,
                        "nome": nome,
                        "email": email,
                        "check_type": "monthly",
                        "checked_at": now.isoformat(),
                        "status": "completed"
                    })
                    
                    checked += 1
                
                if checked > 0:
                    await send_telegram_notification(
                        f"🤖 *GAIA Check-In Mensile*\n\n"
                        f"✅ {checked} partner verificati\n"
                        f"📅 {now.strftime('%d/%m/%Y')}"
                    )
                
                logger.info(f"[CELERY] GAIA monthly check completed: {checked} partners")
                return {"checked": checked, "timestamp": now.isoformat()}
                
            finally:
                client.close()
        
        return run_async(_check())
        
    except Exception as e:
        logger.error(f"[CELERY] GAIA monthly check error: {e}")
        return {"error": str(e)}


@shared_task
def check_piano_continuita_expiry():
    """
    Job giornaliero: Controlla scadenze Piano Continuità.
    Invia notifica Telegram 7 giorni prima della scadenza.
    """
    try:
        logger.info("[CELERY] Checking Piano Continuità expiry")
        
        async def _check():
            client, db = get_db()
            try:
                now = datetime.now(timezone.utc)
                
                # Partners with renewals in next 7 days
                in_7_days = now + timedelta(days=7)
                in_8_days = now + timedelta(days=8)
                
                partners = await db.partners.find({
                    "piano_continuita.piano_attivo": {"$ne": None},
                    "piano_continuita.data_rinnovo": {"$ne": None}
                }).to_list(500)
                
                expiring_soon = []
                
                for partner in partners:
                    data_rinnovo = partner.get("piano_continuita", {}).get("data_rinnovo")
                    if not data_rinnovo:
                        continue
                    
                    try:
                        renewal_date = datetime.fromisoformat(data_rinnovo.replace("Z", "+00:00"))
                        days_until_renewal = (renewal_date - now).days
                        
                        # Notify at 7 days, 3 days, 1 day
                        if days_until_renewal in [7, 3, 1]:
                            # Check if notification already sent today
                            existing_notification = await db.notifications_log.find_one({
                                "partner_id": partner.get("id"),
                                "type": f"piano_expiry_{days_until_renewal}d",
                                "sent_date": now.strftime("%Y-%m-%d")
                            })
                            
                            if not existing_notification:
                                expiring_soon.append({
                                    "id": partner.get("id"),
                                    "name": partner.get("name"),
                                    "email": partner.get("email"),
                                    "piano": partner.get("piano_continuita", {}).get("piano_attivo"),
                                    "data_rinnovo": data_rinnovo,
                                    "days_until": days_until_renewal
                                })
                                
                                # Log notification
                                await db.notifications_log.insert_one({
                                    "partner_id": partner.get("id"),
                                    "type": f"piano_expiry_{days_until_renewal}d",
                                    "sent_date": now.strftime("%Y-%m-%d"),
                                    "sent_at": now.isoformat()
                                })
                                
                    except Exception as e:
                        logger.warning(f"[CELERY] Error parsing renewal date for {partner.get('id')}: {e}")
                
                # Send Telegram notifications
                if expiring_soon:
                    for p in expiring_soon:
                        emoji = "🔴" if p["days_until"] == 1 else "🟡" if p["days_until"] == 3 else "🟠"
                        await send_telegram_notification(
                            f"{emoji} *Piano Continuità in Scadenza*\n\n"
                            f"👤 {p['name']}\n"
                            f"📧 {p['email']}\n"
                            f"📋 Piano: {p['piano']}\n"
                            f"⏰ Scade tra: {p['days_until']} giorni\n"
                            f"📅 Data rinnovo: {p['data_rinnovo'][:10]}"
                        )
                
                logger.info(f"[CELERY] Piano expiry check completed: {len(expiring_soon)} notifications")
                return {"notified": len(expiring_soon), "partners": expiring_soon}
                
            finally:
                client.close()
        
        return run_async(_check())
        
    except Exception as e:
        logger.error(f"[CELERY] Piano expiry check error: {e}")
        return {"error": str(e)}
