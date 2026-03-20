"""
HeyGen Video Production Router
Collega l'approvazione script alla generazione video tramite HeyGen API.

Flow:
1. Partner ha avatar_status=ACTIVE e heygen_id configurato
2. Script masterclass/lezione approvato
3. Trigger automatico → HeyGen genera video
4. Polling status → video pronto
5. Consumo crediti dal social_plan
6. Notifica partner + upload YouTube (se configurato)
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging
import os
import asyncio
import httpx

router = APIRouter(prefix="/api/heygen", tags=["heygen-production"])

# Database e servizi
db = None
heygen_service = None

def set_db(database):
    global db
    db = database

def set_heygen_service(service):
    global heygen_service
    heygen_service = service

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class VideoGenerationRequest(BaseModel):
    partner_id: str
    script: str
    video_title: str
    video_type: str = "masterclass"  # masterclass, lesson, social_content
    test_mode: bool = False  # Se True, genera video di test (più corto)


class AvatarSetupRequest(BaseModel):
    partner_id: str
    photo_url: str
    audio_url: str
    partner_name: str


class VideoStatusRequest(BaseModel):
    video_id: str


class DigitalTwinRequest(BaseModel):
    """Request per creare un Digital Twin da video"""
    partner_id: str
    training_video_url: str  # URL del video di training (min 2 min, 720p+)
    consent_video_url: str   # URL del video di consenso
    

class DigitalTwinStatusRequest(BaseModel):
    """Request per controllare lo stato della creazione avatar"""
    partner_id: str
    job_id: str


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_partner_avatar_config(partner_id: str) -> Dict:
    """Recupera configurazione avatar del partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    return {
        "partner_id": partner_id,
        "partner_name": partner.get("name") or partner.get("nome", "Partner"),
        "avatar_status": partner.get("avatar_status", "NOT_ACTIVE"),
        "heygen_id": partner.get("heygen_id"),
        "heygen_voice_id": partner.get("heygen_voice_id"),
        "social_plan": partner.get("social_plan"),
        "content_credits": partner.get("content_credits")
    }


async def check_credits(partner_id: str, minutes_needed: float = 1.0) -> Dict:
    """Verifica se il partner ha crediti sufficienti"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        return {"has_credits": False, "error": "Partner non trovato"}
    
    social_plan = partner.get("social_plan")
    if not social_plan or not social_plan.get("is_active"):
        return {"has_credits": False, "error": "Nessun piano Social attivo"}
    
    content_credits = partner.get("content_credits", {})
    minutes_limit = social_plan.get("monthly_minutes_limit", 30)
    minutes_used = content_credits.get("minutes_used", 0)
    
    remaining = minutes_limit - minutes_used
    has_credits = remaining >= minutes_needed
    
    return {
        "has_credits": has_credits,
        "minutes_remaining": remaining,
        "minutes_needed": minutes_needed,
        "error": None if has_credits else f"Crediti insufficienti: {remaining:.1f} min disponibili, {minutes_needed:.1f} min richiesti"
    }


async def consume_credits(partner_id: str, minutes: float, video_id: str, video_title: str):
    """Consuma crediti dopo generazione video"""
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Aggiorna crediti
    partner = await db.partners.find_one({"id": partner_id})
    content_credits = partner.get("content_credits", {})
    
    # Reset se mese cambiato
    if content_credits.get("current_month") != current_month:
        content_credits = {
            "current_month": current_month,
            "videos_generated": 0,
            "minutes_used": 0.0,
            "last_reset": datetime.now(timezone.utc).isoformat()
        }
    
    content_credits["videos_generated"] = content_credits.get("videos_generated", 0) + 1
    content_credits["minutes_used"] = content_credits.get("minutes_used", 0) + minutes
    content_credits["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"content_credits": content_credits}}
    )
    
    # Log generazione
    await db.content_generations.insert_one({
        "partner_id": partner_id,
        "video_id": video_id,
        "video_title": video_title,
        "minutes": minutes,
        "videos": 1,
        "month": current_month,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"[HEYGEN] Crediti consumati: partner={partner_id}, minuti={minutes}")


async def send_telegram_notification(message: str):
    """Invia notifica Telegram"""
    import httpx
    telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
    
    if telegram_token and admin_chat_id:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message, "parse_mode": "Markdown"}
                )
        except Exception as e:
            logger.error(f"Telegram notification failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: SETUP AVATAR (Creazione Digital Twin)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/setup-avatar")
async def setup_partner_avatar(request: AvatarSetupRequest):
    """
    Setup iniziale dell'Avatar HeyGen per un partner.
    
    Processo:
    1. Crea Instant Avatar dalla foto
    2. Clona la voce dall'audio sample
    3. Salva gli ID nel profilo partner
    4. Genera video di test (30 sec)
    """
    if not heygen_service:
        raise HTTPException(status_code=500, detail="HeyGen service non inizializzato")
    
    partner = await db.partners.find_one({"id": request.partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    # Update status
    await db.partners.update_one(
        {"id": request.partner_id},
        {"$set": {
            "avatar_status": "AWAITING_CONSENT",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    try:
        # Step 1: Crea Avatar
        logger.info(f"[HEYGEN] Creazione avatar per {request.partner_name}")
        avatar_result = await heygen_service.create_avatar_from_photo(
            photo_url=request.photo_url,
            name=f"{request.partner_name} Avatar"
        )
        
        avatar_id = avatar_result.get("data", {}).get("avatar_id")
        if not avatar_id:
            raise HTTPException(status_code=500, detail=f"Errore creazione avatar: {avatar_result}")
        
        # Step 2: Clona Voce
        logger.info(f"[HEYGEN] Clonazione voce per {request.partner_name}")
        voice_result = await heygen_service.clone_voice(
            audio_url=request.audio_url,
            voice_name=f"{request.partner_name} Voice"
        )
        
        voice_id = voice_result.get("data", {}).get("voice_id")
        if not voice_id:
            # Fallback a voce italiana default
            voice_id = "it-IT-IsabellaNeural"
            logger.warning(f"[HEYGEN] Voice cloning failed, using default: {voice_id}")
        
        # Salva nel partner
        await db.partners.update_one(
            {"id": request.partner_id},
            {"$set": {
                "heygen_id": avatar_id,
                "heygen_voice_id": voice_id,
                "avatar_status": "VERIFIED",
                "avatar_created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Step 3: Genera video di test
        logger.info(f"[HEYGEN] Generazione video test per {request.partner_name}")
        test_script = f"Ciao! Sono {request.partner_name}. Il mio Avatar digitale è pronto per creare contenuti straordinari!"
        
        video_result = await heygen_service.generate_video(
            script=test_script,
            avatar_id=avatar_id,
            voice_id=voice_id,
            title=f"Test Avatar - {request.partner_name}",
            test=True
        )
        
        video_id = video_result.get("data", {}).get("video_id")
        
        # Salva job di generazione
        await db.heygen_jobs.insert_one({
            "partner_id": request.partner_id,
            "video_id": video_id,
            "video_type": "avatar_test",
            "status": "processing",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Notifica Telegram
        await send_telegram_notification(
            f"🎭 *Avatar Creato*\n\n"
            f"👤 Partner: {request.partner_name}\n"
            f"🆔 Avatar ID: `{avatar_id[:20]}...`\n"
            f"🎙 Voice ID: `{voice_id[:20]}...`\n"
            f"🎬 Video test in generazione..."
        )
        
        return {
            "success": True,
            "partner_id": request.partner_id,
            "avatar_id": avatar_id,
            "voice_id": voice_id,
            "test_video_id": video_id,
            "status": "processing",
            "message": "Avatar creato! Video di test in generazione (2-5 minuti)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[HEYGEN] Errore setup avatar: {e}")
        await db.partners.update_one(
            {"id": request.partner_id},
            {"$set": {"avatar_status": "NOT_ACTIVE"}}
        )
        raise HTTPException(status_code=500, detail=f"Errore setup avatar: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1B: CREA DIGITAL TWIN (Avatar Clone da Video)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/create-digital-twin")
async def create_digital_twin(request: DigitalTwinRequest, background_tasks: BackgroundTasks):
    """
    Crea un Digital Twin (clone avatar) dal video del partner.
    
    Requisiti video training:
    - Durata: minimo 2 minuti
    - Risoluzione: minimo 720p
    - Contenuto: persona che parla chiaramente, buona illuminazione
    
    Requisiti video consenso:
    - Il partner legge la dichiarazione di consenso HeyGen
    - "I, [nome], consent to the creation of a digital avatar..."
    
    Flow:
    1. Partner carica video training + consenso → vengono uploadati su storage
    2. URLs passati a HeyGen API per creazione Digital Twin
    3. HeyGen elabora (5-30 minuti) → avatar pronto
    4. Partner status aggiornato a ACTIVE con heygen_id
    """
    if not heygen_service:
        raise HTTPException(status_code=500, detail="HeyGen service non inizializzato")
    
    partner = await db.partners.find_one({"id": request.partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    partner_name = partner.get("name") or partner.get("nome", "Partner")
    
    # Aggiorna status a "in creazione"
    await db.partners.update_one(
        {"id": request.partner_id},
        {"$set": {
            "avatar_status": "CREATING",
            "avatar_creation_started": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    try:
        # Chiama HeyGen API per creare Digital Twin
        logger.info(f"[HEYGEN] Avvio creazione Digital Twin per {partner_name}")
        
        result = await heygen_service.create_digital_twin(
            training_video_url=request.training_video_url,
            consent_video_url=request.consent_video_url,
            avatar_name=f"{partner_name} - Evolution PRO"
        )
        
        # Estrai job_id dalla risposta
        job_id = result.get("data", {}).get("job_id") or result.get("job_id")
        
        if not job_id:
            logger.warning(f"[HEYGEN] Risposta senza job_id: {result}")
            # Potrebbe essere un avatar già creato direttamente
            avatar_id = result.get("data", {}).get("avatar_id") or result.get("avatar_id")
            if avatar_id:
                # Avatar già pronto
                await db.partners.update_one(
                    {"id": request.partner_id},
                    {"$set": {
                        "heygen_id": avatar_id,
                        "avatar_status": "ACTIVE",
                        "avatar_created_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {
                    "success": True,
                    "partner_id": request.partner_id,
                    "avatar_id": avatar_id,
                    "status": "completed",
                    "message": "Digital Twin creato con successo!"
                }
        
        # Salva job nella collection per tracking
        await db.avatar_creation_jobs.insert_one({
            "partner_id": request.partner_id,
            "job_id": job_id,
            "partner_name": partner_name,
            "training_video_url": request.training_video_url,
            "status": "processing",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Aggiorna partner con job_id
        await db.partners.update_one(
            {"id": request.partner_id},
            {"$set": {
                "avatar_job_id": job_id,
                "avatar_status": "PROCESSING"
            }}
        )
        
        # Avvia background task per polling status
        background_tasks.add_task(
            poll_avatar_creation_status,
            request.partner_id,
            job_id,
            partner_name
        )
        
        # Notifica Telegram
        await send_telegram_notification(
            f"🎭 *Creazione Digital Twin Avviata*\n\n"
            f"👤 Partner: {partner_name}\n"
            f"🆔 Job ID: `{job_id}`\n"
            f"⏳ Elaborazione in corso (5-30 min)..."
        )
        
        return {
            "success": True,
            "partner_id": request.partner_id,
            "job_id": job_id,
            "status": "processing",
            "message": "Creazione Digital Twin avviata! Elaborazione in corso (5-30 minuti). Riceverai una notifica quando sarà pronto."
        }
        
    except httpx.HTTPStatusError as e:
        error_detail = f"HeyGen API error: {e.response.status_code}"
        try:
            error_body = e.response.json()
            error_detail = error_body.get("message", error_detail)
        except:
            pass
        
        logger.error(f"[HEYGEN] Errore creazione Digital Twin: {error_detail}")
        await db.partners.update_one(
            {"id": request.partner_id},
            {"$set": {"avatar_status": "CREATION_FAILED", "avatar_error": error_detail}}
        )
        raise HTTPException(status_code=500, detail=error_detail)
        
    except Exception as e:
        logger.error(f"[HEYGEN] Errore creazione Digital Twin: {e}")
        await db.partners.update_one(
            {"id": request.partner_id},
            {"$set": {"avatar_status": "CREATION_FAILED", "avatar_error": str(e)}}
        )
        raise HTTPException(status_code=500, detail=f"Errore creazione avatar: {e}")


async def poll_avatar_creation_status(partner_id: str, job_id: str, partner_name: str, max_attempts: int = 60):
    """
    Background task per controllare lo stato della creazione avatar.
    Polling ogni 30 secondi per max 30 minuti.
    """
    import asyncio
    
    for attempt in range(max_attempts):
        await asyncio.sleep(30)  # Aspetta 30 secondi tra i check
        
        try:
            status_result = await heygen_service.get_avatar_creation_status(job_id)
            status = status_result.get("data", {}).get("status") or status_result.get("status")
            
            logger.info(f"[HEYGEN] Avatar creation status check #{attempt+1}: {status}")
            
            if status == "completed":
                avatar_id = status_result.get("data", {}).get("avatar_id") or status_result.get("avatar_id")
                
                # Aggiorna partner
                await db.partners.update_one(
                    {"id": partner_id},
                    {"$set": {
                        "heygen_id": avatar_id,
                        "avatar_status": "ACTIVE",
                        "avatar_created_at": datetime.now(timezone.utc).isoformat(),
                        "avatar_job_id": None  # Rimuovi job_id
                    }}
                )
                
                # Aggiorna job
                await db.avatar_creation_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {"status": "completed", "avatar_id": avatar_id, "completed_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                # Notifica
                await send_telegram_notification(
                    f"✅ *Digital Twin Completato!*\n\n"
                    f"👤 Partner: {partner_name}\n"
                    f"🆔 Avatar ID: `{avatar_id}`\n"
                    f"🎬 Pronto per generare video!"
                )
                
                logger.info(f"[HEYGEN] Digital Twin creato con successo per {partner_name}: {avatar_id}")
                return
                
            elif status in ["failed", "error"]:
                error_msg = status_result.get("data", {}).get("error", "Creazione fallita")
                
                await db.partners.update_one(
                    {"id": partner_id},
                    {"$set": {"avatar_status": "CREATION_FAILED", "avatar_error": error_msg}}
                )
                
                await db.avatar_creation_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {"status": "failed", "error": error_msg}}
                )
                
                await send_telegram_notification(
                    f"❌ *Creazione Digital Twin Fallita*\n\n"
                    f"👤 Partner: {partner_name}\n"
                    f"⚠️ Errore: {error_msg}"
                )
                
                logger.error(f"[HEYGEN] Digital Twin creation failed for {partner_name}: {error_msg}")
                return
                
        except Exception as e:
            logger.warning(f"[HEYGEN] Error checking avatar status: {e}")
            continue
    
    # Timeout - max attempts raggiunto
    logger.warning(f"[HEYGEN] Avatar creation timeout for {partner_name}")
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"avatar_status": "CREATION_TIMEOUT"}}
    )


@router.get("/avatar-creation-status/{partner_id}")
async def get_avatar_creation_status(partner_id: str):
    """
    Controlla lo stato della creazione avatar per un partner.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    job_id = partner.get("avatar_job_id")
    
    # Se c'è un job in corso, controlla lo stato
    if job_id and heygen_service:
        try:
            status_result = await heygen_service.get_avatar_creation_status(job_id)
            return {
                "partner_id": partner_id,
                "avatar_status": partner.get("avatar_status"),
                "job_id": job_id,
                "heygen_status": status_result.get("data", {}).get("status") or status_result.get("status"),
                "heygen_id": partner.get("heygen_id")
            }
        except Exception as e:
            logger.warning(f"[HEYGEN] Error checking status: {e}")
    
    return {
        "partner_id": partner_id,
        "avatar_status": partner.get("avatar_status"),
        "heygen_id": partner.get("heygen_id"),
        "avatar_created_at": partner.get("avatar_created_at"),
        "avatar_error": partner.get("avatar_error")
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: GENERA VIDEO (Trigger da Script Approvato)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/generate-video")
async def generate_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    """
    Genera un video con HeyGen dal script approvato.
    
    Prerequisiti:
    - Partner con avatar_status = ACTIVE
    - heygen_id e heygen_voice_id configurati
    - Crediti sufficienti nel social_plan
    """
    if not heygen_service:
        raise HTTPException(status_code=500, detail="HeyGen service non inizializzato")
    
    # Verifica configurazione avatar
    config = await get_partner_avatar_config(request.partner_id)
    
    if config["avatar_status"] not in ["VERIFIED", "ACTIVE"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Avatar non pronto. Status: {config['avatar_status']}. Esegui prima setup-avatar."
        )
    
    if not config["heygen_id"] or not config.get("heygen_voice_id"):
        raise HTTPException(
            status_code=400,
            detail="Avatar o voce non configurati. Esegui prima setup-avatar."
        )
    
    # Stima durata video (150 parole/minuto)
    word_count = len(request.script.split())
    estimated_minutes = max(1.0, word_count / 150)
    
    # Verifica crediti (solo se non è test mode)
    if not request.test_mode:
        credits_check = await check_credits(request.partner_id, estimated_minutes)
        if not credits_check["has_credits"]:
            raise HTTPException(status_code=400, detail=credits_check["error"])
    
    try:
        # Genera video
        logger.info(f"[HEYGEN] Generazione video: {request.video_title} ({word_count} parole, ~{estimated_minutes:.1f} min)")
        
        video_result = await heygen_service.generate_video(
            script=request.script,
            avatar_id=config["heygen_id"],
            voice_id=config["heygen_voice_id"],
            title=request.video_title,
            test=request.test_mode
        )
        
        video_id = video_result.get("data", {}).get("video_id")
        if not video_id:
            raise HTTPException(status_code=500, detail=f"Errore generazione: {video_result}")
        
        # Salva job
        job = {
            "partner_id": request.partner_id,
            "video_id": video_id,
            "video_title": request.video_title,
            "video_type": request.video_type,
            "script_preview": request.script[:500],
            "word_count": word_count,
            "estimated_minutes": estimated_minutes,
            "test_mode": request.test_mode,
            "status": "processing",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.heygen_jobs.insert_one(job)
        
        # Aggiorna avatar_status a ACTIVE se era VERIFIED
        if config["avatar_status"] == "VERIFIED":
            await db.partners.update_one(
                {"id": request.partner_id},
                {"$set": {
                    "avatar_status": "ACTIVE",
                    "avatar_last_used": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Avvia polling in background
        background_tasks.add_task(
            poll_video_status,
            video_id=video_id,
            partner_id=request.partner_id,
            estimated_minutes=estimated_minutes,
            video_title=request.video_title,
            test_mode=request.test_mode
        )
        
        # Notifica
        await send_telegram_notification(
            f"🎬 *Video in Produzione*\n\n"
            f"👤 {config['partner_name']}\n"
            f"📝 {request.video_title}\n"
            f"⏱ ~{estimated_minutes:.1f} min stimati\n"
            f"🆔 `{video_id}`"
        )
        
        return {
            "success": True,
            "video_id": video_id,
            "partner_id": request.partner_id,
            "estimated_minutes": estimated_minutes,
            "status": "processing",
            "message": f"Video in generazione. Tempo stimato: {int(estimated_minutes * 2 + 3)} minuti"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[HEYGEN] Errore generazione video: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: STATUS VIDEO
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/video-status/{video_id}")
async def get_video_status(video_id: str):
    """Controlla lo stato di generazione di un video"""
    if not heygen_service:
        raise HTTPException(status_code=500, detail="HeyGen service non inizializzato")
    
    # Cerca nel nostro DB
    job = await db.heygen_jobs.find_one({"video_id": video_id}, {"_id": 0})
    
    try:
        # Chiedi a HeyGen
        heygen_status = await heygen_service.get_video_status(video_id)
        status_data = heygen_status.get("data", {})
        
        status = status_data.get("status", "unknown")
        video_url = status_data.get("video_url")
        
        # Aggiorna nostro DB se completato
        if status == "completed" and job and job.get("status") != "completed":
            await db.heygen_jobs.update_one(
                {"video_id": video_id},
                {"$set": {
                    "status": "completed",
                    "video_url": video_url,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "video_id": video_id,
            "status": status,
            "video_url": video_url,
            "partner_id": job.get("partner_id") if job else None,
            "video_title": job.get("video_title") if job else None,
            "created_at": job.get("created_at") if job else None
        }
        
    except Exception as e:
        logger.error(f"[HEYGEN] Errore check status: {e}")
        return {
            "video_id": video_id,
            "status": "error",
            "error": str(e),
            "job": job
        }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 4: LISTA VIDEO PARTNER
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/videos/{partner_id}")
async def get_partner_videos(partner_id: str, limit: int = 20):
    """Lista tutti i video generati per un partner"""
    videos = await db.heygen_jobs.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Stats
    total = await db.heygen_jobs.count_documents({"partner_id": partner_id})
    completed = await db.heygen_jobs.count_documents({"partner_id": partner_id, "status": "completed"})
    processing = await db.heygen_jobs.count_documents({"partner_id": partner_id, "status": "processing"})
    
    return {
        "partner_id": partner_id,
        "videos": videos,
        "stats": {
            "total": total,
            "completed": completed,
            "processing": processing
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 5: TRIGGER DA SCRIPT APPROVATO
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/trigger-from-script")
async def trigger_from_approved_script(
    partner_id: str,
    script_id: str,
    script_type: str = "masterclass",
    background_tasks: BackgroundTasks = None
):
    """
    Trigger automatico quando uno script viene approvato in Dashboard.
    Questo endpoint viene chiamato dal frontend dopo l'approvazione.
    """
    # Recupera lo script approvato
    if script_type == "masterclass":
        partner = await db.partners.find_one({"id": partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner non trovato")
        
        masterclass_data = partner.get("masterclass_data", {})
        script = masterclass_data.get("approved_script", {}).get("full_script")
        title = f"Masterclass - {partner.get('name', 'Partner')}"
        
        if not script:
            raise HTTPException(status_code=400, detail="Nessuno script masterclass approvato trovato")
    else:
        # Cerca in altri tipi di script
        script_doc = await db.approved_scripts.find_one({"_id": script_id})
        if not script_doc:
            raise HTTPException(status_code=404, detail="Script non trovato")
        script = script_doc.get("content")
        title = script_doc.get("title", "Video Lezione")
    
    # Genera video
    request = VideoGenerationRequest(
        partner_id=partner_id,
        script=script,
        video_title=title,
        video_type=script_type,
        test_mode=False
    )
    
    return await generate_video(request, background_tasks)


# ═══════════════════════════════════════════════════════════════════════════════
# BACKGROUND TASK: POLLING STATUS
# ═══════════════════════════════════════════════════════════════════════════════

async def poll_video_status(
    video_id: str,
    partner_id: str,
    estimated_minutes: float,
    video_title: str,
    test_mode: bool
):
    """
    Polling in background per verificare completamento video.
    Quando completato:
    - Consuma crediti
    - Notifica partner
    - (Opzionale) Trigger upload YouTube
    """
    max_attempts = 60  # Max 30 minuti di polling
    attempt = 0
    
    while attempt < max_attempts:
        await asyncio.sleep(30)  # Poll ogni 30 secondi
        attempt += 1
        
        try:
            status_result = await heygen_service.get_video_status(video_id)
            status_data = status_result.get("data", {})
            status = status_data.get("status")
            
            if status == "completed":
                video_url = status_data.get("video_url")
                duration = status_data.get("duration", estimated_minutes * 60)
                actual_minutes = duration / 60
                
                # Aggiorna job
                await db.heygen_jobs.update_one(
                    {"video_id": video_id},
                    {"$set": {
                        "status": "completed",
                        "video_url": video_url,
                        "duration_seconds": duration,
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Consuma crediti (solo se non test)
                if not test_mode:
                    await consume_credits(partner_id, actual_minutes, video_id, video_title)
                
                # Notifica
                await send_telegram_notification(
                    f"✅ *Video Completato!*\n\n"
                    f"📝 {video_title}\n"
                    f"⏱ Durata: {actual_minutes:.1f} min\n"
                    f"🔗 [Scarica Video]({video_url})"
                )
                
                logger.info(f"[HEYGEN] Video completato: {video_id}")
                return
                
            elif status == "failed":
                error = status_data.get("error", "Errore sconosciuto")
                await db.heygen_jobs.update_one(
                    {"video_id": video_id},
                    {"$set": {
                        "status": "failed",
                        "error": error,
                        "failed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                await send_telegram_notification(
                    f"❌ *Video Fallito*\n\n"
                    f"📝 {video_title}\n"
                    f"🆔 `{video_id}`\n"
                    f"⚠️ Errore: {error}"
                )
                
                logger.error(f"[HEYGEN] Video fallito: {video_id} - {error}")
                return
                
        except Exception as e:
            logger.error(f"[HEYGEN] Errore polling {video_id}: {e}")
    
    # Timeout
    await db.heygen_jobs.update_one(
        {"video_id": video_id},
        {"$set": {"status": "timeout", "error": "Timeout dopo 30 minuti"}}
    )
    logger.warning(f"[HEYGEN] Timeout polling video: {video_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 6: STATS PRODUZIONE
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_production_stats():
    """Statistiche globali di produzione video"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    total_videos = await db.heygen_jobs.count_documents({})
    completed_today = await db.heygen_jobs.count_documents({
        "status": "completed",
        "completed_at": {"$gte": today_start}
    })
    processing = await db.heygen_jobs.count_documents({"status": "processing"})
    failed = await db.heygen_jobs.count_documents({"status": "failed"})
    
    # Minuti totali generati
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total_minutes": {"$sum": "$estimated_minutes"}}}
    ]
    minutes_result = await db.heygen_jobs.aggregate(pipeline).to_list(1)
    total_minutes = minutes_result[0]["total_minutes"] if minutes_result else 0
    
    return {
        "total_videos": total_videos,
        "completed_today": completed_today,
        "currently_processing": processing,
        "failed": failed,
        "total_minutes_generated": round(total_minutes, 1),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 7: TEST API CONNECTION
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/test-connection")
async def test_heygen_connection():
    """Test connessione API HeyGen"""
    if not heygen_service:
        return {"connected": False, "error": "HeyGen service non inizializzato"}
    
    try:
        # Prova a recuperare lista avatar
        avatars = await heygen_service.get_avatars()
        avatar_count = len(avatars.get("data", {}).get("avatars", []))
        
        voices = await heygen_service.get_voices()
        voice_count = len(voices.get("data", {}).get("voices", []))
        
        return {
            "connected": True,
            "avatars_available": avatar_count,
            "voices_available": voice_count,
            "api_status": "operational"
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }
