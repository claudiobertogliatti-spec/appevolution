"""
Avatar & Social Plan Router
Gestisce gli asset Avatar HeyGen e i piani Social dei partner.

Campi gestiti:
- avatar_status: NOT_ACTIVE | AWAITING_CONSENT | VERIFIED | ACTIVE
- heygen_id: ID univoco del Digital Twin su HeyGen
- social_plan: Definizione pacchetto (3, 6, 12 mesi) e limiti mensili
- content_credits: Contatore minuti/video generati nel mese solare
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, timezone
from enum import Enum
import logging
import os

router = APIRouter(prefix="/api/partners", tags=["avatar-social"])

# Database reference (set from main server)
db = None

def set_db(database):
    global db
    db = database


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class AvatarStatus(str, Enum):
    NOT_ACTIVE = "NOT_ACTIVE"
    AWAITING_CONSENT = "AWAITING_CONSENT"
    VERIFIED = "VERIFIED"
    ACTIVE = "ACTIVE"


class SocialPlanType(str, Enum):
    THREE_MONTHS = "3_months"
    SIX_MONTHS = "6_months"
    TWELVE_MONTHS = "12_months"


class AvatarUpdate(BaseModel):
    avatar_status: Optional[AvatarStatus] = None
    heygen_id: Optional[str] = None


class SocialPlanCreate(BaseModel):
    plan_type: SocialPlanType
    monthly_video_limit: int = 10
    monthly_minutes_limit: float = 30.0
    price: float = 297.0
    start_date: Optional[str] = None  # If not provided, uses today


class SocialPlanUpdate(BaseModel):
    plan_type: Optional[SocialPlanType] = None
    monthly_video_limit: Optional[int] = None
    monthly_minutes_limit: Optional[float] = None
    is_active: Optional[bool] = None


class ConsumeCreditsRequest(BaseModel):
    videos: int = 0
    minutes: float = 0.0
    video_title: Optional[str] = None
    heygen_video_id: Optional[str] = None


class MoveToSocialRequest(BaseModel):
    force: bool = False  # Se True, ignora il check della fase F6


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_partner_or_404(partner_id: str):
    """Helper per recuperare un partner o lanciare 404"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    return partner


def get_current_month() -> str:
    """Restituisce il mese corrente in formato YYYY-MM"""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def calculate_end_date(start_date: str, plan_type: SocialPlanType) -> str:
    """Calcola la data di fine piano basata sul tipo"""
    from datetime import timedelta
    start = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if "T" in start_date else datetime.strptime(start_date, "%Y-%m-%d")
    
    months_map = {
        SocialPlanType.THREE_MONTHS: 3,
        SocialPlanType.SIX_MONTHS: 6,
        SocialPlanType.TWELVE_MONTHS: 12
    }
    
    months = months_map.get(plan_type, 3)
    # Approssimazione: 30 giorni per mese
    end = start + timedelta(days=months * 30)
    return end.strftime("%Y-%m-%d")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 0: Lista Partner con Avatar/Social Plan (per Admin Dashboard)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/with-social")
async def get_partners_with_social():
    """
    Lista tutti i partner che hanno avatar_status o social_plan configurato.
    Usato dalla dashboard di produzione video.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Cerca partner con avatar_status diverso da NOT_ACTIVE o con social_plan attivo
    partners = await db.partners.find(
        {
            "$or": [
                {"avatar_status": {"$in": ["AWAITING_CONSENT", "VERIFIED", "ACTIVE"]}},
                {"social_plan.is_active": True},
                {"heygen_id": {"$exists": True, "$ne": None}}
            ]
        },
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "nome": 1,
            "email": 1,
            "niche": 1,
            "avatar_status": 1,
            "heygen_id": 1,
            "heygen_voice_id": 1,
            "social_plan": 1,
            "content_credits": 1,
            "journey_phase": 1
        }
    ).sort("name", 1).to_list(100)
    
    # Se non ci sono partner con configurazione, restituisci tutti i partner attivi
    if not partners:
        partners = await db.partners.find(
            {"status": {"$in": ["active", "onboarding", "development"]}},
            {
                "_id": 0,
                "id": 1,
                "name": 1,
                "nome": 1,
                "email": 1,
                "niche": 1,
                "avatar_status": 1,
                "heygen_id": 1,
                "heygen_voice_id": 1,
                "social_plan": 1,
                "content_credits": 1,
                "journey_phase": 1
            }
        ).sort("name", 1).to_list(50)
    
    return {
        "partners": partners,
        "count": len(partners)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: AVATAR STATUS & HEYGEN ID
# ═══════════════════════════════════════════════════════════════════════════════

@router.patch("/{partner_id}/avatar")
async def update_partner_avatar(partner_id: str, data: AvatarUpdate):
    """
    Aggiorna lo stato dell'avatar e/o l'ID HeyGen del partner.
    
    Stati possibili:
    - NOT_ACTIVE: Avatar non ancora configurato
    - AWAITING_CONSENT: In attesa del consenso del partner
    - VERIFIED: Consenso ricevuto, avatar in creazione
    - ACTIVE: Avatar pronto e utilizzabile
    """
    partner = await get_partner_or_404(partner_id)
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.avatar_status:
        update["avatar_status"] = data.avatar_status.value
        
        # Log della transizione di stato
        old_status = partner.get("avatar_status", "NOT_ACTIVE")
        logging.info(f"[AVATAR] Partner {partner_id}: {old_status} → {data.avatar_status.value}")
    
    if data.heygen_id:
        update["heygen_id"] = data.heygen_id
        logging.info(f"[AVATAR] Partner {partner_id}: HeyGen ID impostato a {data.heygen_id}")
    
    await db.partners.update_one({"id": partner_id}, {"$set": update})
    
    # Recupera dati aggiornati
    updated_partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    
    return {
        "success": True,
        "partner_id": partner_id,
        "avatar_status": updated_partner.get("avatar_status", "NOT_ACTIVE"),
        "heygen_id": updated_partner.get("heygen_id")
    }


@router.get("/{partner_id}/avatar")
async def get_partner_avatar(partner_id: str):
    """Recupera lo stato dell'avatar del partner"""
    partner = await get_partner_or_404(partner_id)
    
    return {
        "partner_id": partner_id,
        "avatar_status": partner.get("avatar_status", "NOT_ACTIVE"),
        "heygen_id": partner.get("heygen_id"),
        "avatar_created_at": partner.get("avatar_created_at"),
        "avatar_last_used": partner.get("avatar_last_used")
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: SOCIAL PLAN
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{partner_id}/social-plan")
async def create_social_plan(partner_id: str, data: SocialPlanCreate):
    """
    Crea/attiva un piano Social per il partner.
    
    Pacchetti disponibili:
    - 3_months: 3 mesi
    - 6_months: 6 mesi
    - 12_months: 12 mesi
    """
    partner = await get_partner_or_404(partner_id)
    
    # Check se ha già un piano attivo
    existing_plan = partner.get("social_plan", {})
    if existing_plan.get("is_active"):
        raise HTTPException(
            status_code=400, 
            detail="Il partner ha già un piano Social attivo. Usa PATCH per modificarlo."
        )
    
    start_date = data.start_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    end_date = calculate_end_date(start_date, data.plan_type)
    
    social_plan = {
        "plan_type": data.plan_type.value,
        "monthly_video_limit": data.monthly_video_limit,
        "monthly_minutes_limit": data.monthly_minutes_limit,
        "start_date": start_date,
        "end_date": end_date,
        "price": data.price,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Inizializza anche i content_credits
    current_month = get_current_month()
    content_credits = {
        "current_month": current_month,
        "videos_generated": 0,
        "minutes_used": 0.0,
        "last_reset": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "social_plan": social_plan,
            "content_credits": content_credits,
            "social_module_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logging.info(f"[SOCIAL PLAN] Partner {partner_id}: Piano {data.plan_type.value} attivato fino a {end_date}")
    
    return {
        "success": True,
        "partner_id": partner_id,
        "social_plan": social_plan,
        "content_credits": content_credits
    }


@router.patch("/{partner_id}/social-plan")
async def update_social_plan(partner_id: str, data: SocialPlanUpdate):
    """Modifica un piano Social esistente"""
    partner = await get_partner_or_404(partner_id)
    
    existing_plan = partner.get("social_plan")
    if not existing_plan:
        raise HTTPException(status_code=400, detail="Nessun piano Social esistente")
    
    update = {}
    
    if data.plan_type:
        update["social_plan.plan_type"] = data.plan_type.value
        # Ricalcola end_date
        start_date = existing_plan.get("start_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        update["social_plan.end_date"] = calculate_end_date(start_date, data.plan_type)
    
    if data.monthly_video_limit is not None:
        update["social_plan.monthly_video_limit"] = data.monthly_video_limit
    
    if data.monthly_minutes_limit is not None:
        update["social_plan.monthly_minutes_limit"] = data.monthly_minutes_limit
    
    if data.is_active is not None:
        update["social_plan.is_active"] = data.is_active
        update["social_module_active"] = data.is_active
    
    update["social_plan.updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.partners.update_one({"id": partner_id}, {"$set": update})
    
    updated_partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    
    return {
        "success": True,
        "partner_id": partner_id,
        "social_plan": updated_partner.get("social_plan")
    }


@router.get("/{partner_id}/social-plan")
async def get_social_plan(partner_id: str):
    """Recupera il piano Social del partner"""
    partner = await get_partner_or_404(partner_id)
    
    social_plan = partner.get("social_plan")
    
    if not social_plan:
        return {
            "partner_id": partner_id,
            "has_plan": False,
            "social_plan": None
        }
    
    # Check se il piano è scaduto
    end_date = social_plan.get("end_date")
    is_expired = False
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
        is_expired = datetime.now() > end
    
    return {
        "partner_id": partner_id,
        "has_plan": True,
        "is_active": social_plan.get("is_active", False) and not is_expired,
        "is_expired": is_expired,
        "social_plan": social_plan
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: CONTENT CREDITS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{partner_id}/content-credits")
async def get_content_credits(partner_id: str):
    """
    Recupera i crediti disponibili del partner per il mese corrente.
    Esegue auto-reset se il mese è cambiato.
    """
    partner = await get_partner_or_404(partner_id)
    
    social_plan = partner.get("social_plan")
    content_credits = partner.get("content_credits", {})
    
    if not social_plan:
        return {
            "partner_id": partner_id,
            "has_plan": False,
            "credits": None,
            "message": "Nessun piano Social attivo"
        }
    
    current_month = get_current_month()
    credits_month = content_credits.get("current_month")
    
    # Auto-reset se mese cambiato
    if credits_month and credits_month != current_month:
        content_credits = {
            "current_month": current_month,
            "videos_generated": 0,
            "minutes_used": 0.0,
            "last_reset": datetime.now(timezone.utc).isoformat()
        }
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"content_credits": content_credits}}
        )
        logging.info(f"[CREDITS] Partner {partner_id}: Reset crediti per nuovo mese {current_month}")
    
    # Calcola crediti rimanenti
    video_limit = social_plan.get("monthly_video_limit", 10)
    minutes_limit = social_plan.get("monthly_minutes_limit", 30.0)
    
    videos_used = content_credits.get("videos_generated", 0)
    minutes_used = content_credits.get("minutes_used", 0.0)
    
    return {
        "partner_id": partner_id,
        "has_plan": True,
        "current_month": current_month,
        "limits": {
            "monthly_video_limit": video_limit,
            "monthly_minutes_limit": minutes_limit
        },
        "used": {
            "videos_generated": videos_used,
            "minutes_used": round(minutes_used, 2)
        },
        "remaining": {
            "videos": max(0, video_limit - videos_used),
            "minutes": round(max(0, minutes_limit - minutes_used), 2)
        },
        "usage_percentage": {
            "videos": round(videos_used / video_limit * 100, 1) if video_limit > 0 else 0,
            "minutes": round(minutes_used / minutes_limit * 100, 1) if minutes_limit > 0 else 0
        }
    }


@router.post("/{partner_id}/content-credits/consume")
async def consume_content_credits(partner_id: str, data: ConsumeCreditsRequest):
    """
    Consuma crediti dopo la generazione di un video.
    Registra anche lo storico delle generazioni.
    """
    partner = await get_partner_or_404(partner_id)
    
    social_plan = partner.get("social_plan")
    if not social_plan or not social_plan.get("is_active"):
        raise HTTPException(status_code=400, detail="Nessun piano Social attivo")
    
    content_credits = partner.get("content_credits", {})
    current_month = get_current_month()
    
    # Auto-reset se mese cambiato
    if content_credits.get("current_month") != current_month:
        content_credits = {
            "current_month": current_month,
            "videos_generated": 0,
            "minutes_used": 0.0,
            "last_reset": datetime.now(timezone.utc).isoformat()
        }
    
    # Check limiti
    video_limit = social_plan.get("monthly_video_limit", 10)
    minutes_limit = social_plan.get("monthly_minutes_limit", 30.0)
    
    new_videos = content_credits.get("videos_generated", 0) + data.videos
    new_minutes = content_credits.get("minutes_used", 0.0) + data.minutes
    
    if new_videos > video_limit:
        raise HTTPException(
            status_code=400, 
            detail=f"Limite video mensile raggiunto ({video_limit} video)"
        )
    
    if new_minutes > minutes_limit:
        raise HTTPException(
            status_code=400, 
            detail=f"Limite minuti mensile raggiunto ({minutes_limit} minuti)"
        )
    
    # Aggiorna crediti
    content_credits["videos_generated"] = new_videos
    content_credits["minutes_used"] = new_minutes
    content_credits["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"content_credits": content_credits}}
    )
    
    # Registra nello storico generazioni
    generation_log = {
        "partner_id": partner_id,
        "videos": data.videos,
        "minutes": data.minutes,
        "video_title": data.video_title,
        "heygen_video_id": data.heygen_video_id,
        "month": current_month,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.content_generations.insert_one(generation_log)
    
    logging.info(f"[CREDITS] Partner {partner_id}: Consumati {data.videos} video, {data.minutes} min")
    
    return {
        "success": True,
        "partner_id": partner_id,
        "consumed": {
            "videos": data.videos,
            "minutes": data.minutes
        },
        "new_totals": {
            "videos_generated": new_videos,
            "minutes_used": round(new_minutes, 2)
        },
        "remaining": {
            "videos": video_limit - new_videos,
            "minutes": round(minutes_limit - new_minutes, 2)
        }
    }


@router.post("/{partner_id}/content-credits/reset")
async def reset_content_credits(partner_id: str):
    """Reset manuale dei crediti (admin only)"""
    partner = await get_partner_or_404(partner_id)
    
    current_month = get_current_month()
    content_credits = {
        "current_month": current_month,
        "videos_generated": 0,
        "minutes_used": 0.0,
        "last_reset": datetime.now(timezone.utc).isoformat(),
        "reset_reason": "manual_admin_reset"
    }
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"content_credits": content_credits}}
    )
    
    logging.info(f"[CREDITS] Partner {partner_id}: Reset manuale crediti")
    
    return {
        "success": True,
        "partner_id": partner_id,
        "content_credits": content_credits
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 4: MOVE TO SOCIAL (TRIGGER F6 → SOCIAL)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{partner_id}/move-to-social")
async def move_to_social(partner_id: str, data: MoveToSocialRequest = MoveToSocialRequest()):
    """
    Attiva il modulo Social per il partner.
    
    Condizioni (se force=False):
    - Il partner deve essere in fase F6 (Ottimizzazione) o successiva
    - Il partner deve avere un piano Social sottoscritto
    
    Se force=True, ignora il check della fase.
    """
    partner = await get_partner_or_404(partner_id)
    
    current_phase = partner.get("phase", "")
    social_plan = partner.get("social_plan")
    
    # Check fase (se non forzato)
    if not data.force:
        # F6 = Ottimizzazione (dopo F1-F5)
        valid_phases = ["F6", "F7", "F8", "F9", "F10", "completed", "active"]
        phase_ok = any(p in current_phase.upper() for p in valid_phases)
        
        if not phase_ok:
            raise HTTPException(
                status_code=400,
                detail=f"Il partner è in fase {current_phase}. Il modulo Social si attiva dalla fase F6 (Ottimizzazione). Usa force=True per forzare."
            )
    
    # Check piano Social
    if not social_plan:
        raise HTTPException(
            status_code=400,
            detail="Il partner non ha un piano Social sottoscritto. Crea prima il piano con POST /social-plan"
        )
    
    # Attiva il modulo Social
    update = {
        "social_module_active": True,
        "social_module_activated_at": datetime.now(timezone.utc).isoformat(),
        "social_plan.is_active": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Se non ha content_credits, inizializzali
    if not partner.get("content_credits"):
        update["content_credits"] = {
            "current_month": get_current_month(),
            "videos_generated": 0,
            "minutes_used": 0.0,
            "last_reset": datetime.now(timezone.utc).isoformat()
        }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update})
    
    # Notifica Telegram
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            partner_name = partner.get("name") or partner.get("nome", "Partner")
            message = (
                f"🎬 *MODULO SOCIAL ATTIVATO*\n\n"
                f"👤 Partner: {partner_name}\n"
                f"📦 Piano: {social_plan.get('plan_type')}\n"
                f"📊 Limite: {social_plan.get('monthly_video_limit')} video/mese\n"
                f"⏱ Minuti: {social_plan.get('monthly_minutes_limit')} min/mese\n\n"
                f"✅ Pronto per generare contenuti con Avatar!"
            )
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message, "parse_mode": "Markdown"}
                )
    except Exception as e:
        logging.error(f"Failed to send Telegram notification: {e}")
    
    logging.info(f"[SOCIAL] Partner {partner_id}: Modulo Social attivato (force={data.force})")
    
    updated_partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    
    return {
        "success": True,
        "partner_id": partner_id,
        "social_module_active": True,
        "activated_at": update["social_module_activated_at"],
        "social_plan": updated_partner.get("social_plan"),
        "content_credits": updated_partner.get("content_credits"),
        "message": f"Modulo Social attivato per {partner.get('name', partner_id)}"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 5: AUTO-TRIGGER (chiamato quando fase F6 completata)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{partner_id}/check-social-trigger")
async def check_social_trigger(partner_id: str, new_phase: str):
    """
    Verifica se attivare automaticamente il modulo Social.
    Chiamato quando un partner passa a una nuova fase.
    
    Attiva automaticamente se:
    - new_phase è F6 o successiva
    - Il partner ha un piano Social sottoscritto
    - Il modulo Social non è già attivo
    """
    partner = await get_partner_or_404(partner_id)
    
    # Check se già attivo
    if partner.get("social_module_active"):
        return {
            "triggered": False,
            "reason": "Modulo Social già attivo"
        }
    
    # Check se ha piano Social
    social_plan = partner.get("social_plan")
    if not social_plan:
        return {
            "triggered": False,
            "reason": "Nessun piano Social sottoscritto"
        }
    
    # Check fase
    trigger_phases = ["F6", "F7", "F8", "F9", "F10", "COMPLETED", "ACTIVE"]
    should_trigger = any(p in new_phase.upper() for p in trigger_phases)
    
    if not should_trigger:
        return {
            "triggered": False,
            "reason": f"Fase {new_phase} non richiede attivazione Social (trigger da F6)"
        }
    
    # Attiva automaticamente
    result = await move_to_social(partner_id, MoveToSocialRequest(force=True))
    
    return {
        "triggered": True,
        "reason": f"Auto-attivato per transizione a fase {new_phase}",
        "result": result
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 6: GENERATION HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{partner_id}/content-generations")
async def get_content_generations(partner_id: str, limit: int = 50):
    """Recupera lo storico delle generazioni video del partner"""
    await get_partner_or_404(partner_id)
    
    generations = await db.content_generations.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Stats aggregate
    pipeline = [
        {"$match": {"partner_id": partner_id}},
        {"$group": {
            "_id": "$month",
            "total_videos": {"$sum": "$videos"},
            "total_minutes": {"$sum": "$minutes"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}}
    ]
    monthly_stats = await db.content_generations.aggregate(pipeline).to_list(12)
    
    return {
        "partner_id": partner_id,
        "generations": generations,
        "total_count": len(generations),
        "monthly_stats": monthly_stats
    }


