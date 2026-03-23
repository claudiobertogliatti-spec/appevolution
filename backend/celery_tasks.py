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

# MongoDB connection (lazy loaded)
_db = None

def get_db():
    global _db
    if _db is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get('MONGO_URL')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'evolution_pro')]
    return _db


def run_async(coro):
    """Helper to run async code in sync context"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


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
