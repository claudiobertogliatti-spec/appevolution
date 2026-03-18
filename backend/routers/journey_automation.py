"""
Partner Journey Automation - Automazione Fasi F1-F6
Evolution PRO OS

Gestisce:
- Trigger automatici al completamento task di fase
- Avanzamento partner alla fase successiva
- Notifiche e check-in automatici
- Integrazione con Marco AI per follow-up
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging
import os
import httpx

router = APIRouter(prefix="/api/journey", tags=["partner-journey-automation"])

# Database
db = None

def set_db(database):
    global db
    db = database

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# DEFINIZIONE FASI E TASK
# ═══════════════════════════════════════════════════════════════════════════════

PHASES = {
    "F0": {
        "name": "Pre-Onboarding",
        "tasks": ["payment_completed", "welcome_email_sent"],
        "next_phase": "F1",
        "auto_advance": True
    },
    "F1": {
        "name": "Attivazione",
        "tasks": [
            "onboarding_call_scheduled",
            "onboarding_call_completed",
            "systeme_account_created",
            "area_riservata_access"
        ],
        "next_phase": "F2",
        "auto_advance": True
    },
    "F2": {
        "name": "Posizionamento",
        "tasks": [
            "questionnaire_completed",
            "strategic_analysis_generated",
            "positioning_call_completed",
            "positioning_approved"
        ],
        "next_phase": "F3",
        "auto_advance": True
    },
    "F3": {
        "name": "Masterclass",
        "tasks": [
            "masterclass_questionnaire_completed",
            "masterclass_script_generated",
            "masterclass_script_approved",
            "masterclass_video_produced"
        ],
        "next_phase": "F4",
        "auto_advance": True
    },
    "F4": {
        "name": "Struttura Corso",
        "tasks": [
            "course_outline_created",
            "modules_defined",
            "lessons_scripted",
            "course_structure_approved"
        ],
        "next_phase": "F5",
        "auto_advance": True
    },
    "F5": {
        "name": "Produzione",
        "tasks": [
            "avatar_setup_completed",
            "lessons_recorded",
            "videos_edited",
            "videos_uploaded_youtube"
        ],
        "next_phase": "F6",
        "auto_advance": True
    },
    "F6": {
        "name": "Accademia",
        "tasks": [
            "funnel_created",
            "email_sequences_setup",
            "payment_integration",
            "academy_live"
        ],
        "next_phase": "F7",
        "auto_advance": False  # Richiede approvazione manuale
    }
}


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class TaskCompletionRequest(BaseModel):
    partner_id: str
    task_name: str
    notes: Optional[str] = None
    completed_by: str = "system"


class PhaseAdvanceRequest(BaseModel):
    partner_id: str
    force: bool = False  # Se True, ignora task non completati


class CheckStuckPartnersRequest(BaseModel):
    days_threshold: int = 7


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def send_telegram_notification(message: str):
    """Invia notifica Telegram"""
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


async def get_partner_journey_status(partner_id: str) -> Dict:
    """Recupera stato completo del journey del partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    current_phase = partner.get("phase", "F1")
    phase_config = PHASES.get(current_phase, {})
    
    # Recupera task completati
    completed_tasks = partner.get("completed_tasks", [])
    required_tasks = phase_config.get("tasks", [])
    
    # Calcola progresso
    completed_count = len([t for t in required_tasks if t in completed_tasks])
    total_count = len(required_tasks)
    progress = (completed_count / total_count * 100) if total_count > 0 else 0
    
    # Verifica se può avanzare
    can_advance = completed_count == total_count
    
    return {
        "partner_id": partner_id,
        "partner_name": partner.get("name") or partner.get("nome", "Partner"),
        "current_phase": current_phase,
        "phase_name": phase_config.get("name", ""),
        "next_phase": phase_config.get("next_phase"),
        "required_tasks": required_tasks,
        "completed_tasks": [t for t in required_tasks if t in completed_tasks],
        "pending_tasks": [t for t in required_tasks if t not in completed_tasks],
        "progress_percent": round(progress, 1),
        "can_advance": can_advance,
        "auto_advance": phase_config.get("auto_advance", False),
        "last_activity": partner.get("last_activity"),
        "phase_started_at": partner.get("phase_started_at")
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: COMPLETA TASK
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/complete-task")
async def complete_task(request: TaskCompletionRequest):
    """
    Segna un task come completato.
    Se tutti i task della fase sono completati e auto_advance=True, avanza il partner.
    """
    partner = await db.partners.find_one({"id": request.partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    current_phase = partner.get("phase", "F1")
    phase_config = PHASES.get(current_phase, {})
    
    # Verifica che il task sia valido per la fase corrente
    valid_tasks = phase_config.get("tasks", [])
    if request.task_name not in valid_tasks:
        raise HTTPException(
            status_code=400, 
            detail=f"Task '{request.task_name}' non valido per fase {current_phase}. Task validi: {valid_tasks}"
        )
    
    # Aggiungi task ai completati
    completed_tasks = partner.get("completed_tasks", [])
    if request.task_name not in completed_tasks:
        completed_tasks.append(request.task_name)
    
    # Aggiorna partner
    await db.partners.update_one(
        {"id": request.partner_id},
        {"$set": {
            "completed_tasks": completed_tasks,
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log
    await db.journey_logs.insert_one({
        "partner_id": request.partner_id,
        "event_type": "task_completed",
        "task_name": request.task_name,
        "phase": current_phase,
        "notes": request.notes,
        "completed_by": request.completed_by,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    partner_name = partner.get("name") or partner.get("nome", "Partner")
    logger.info(f"[JOURNEY] {partner_name}: Task '{request.task_name}' completato in {current_phase}")
    
    # Verifica se può avanzare
    status = await get_partner_journey_status(request.partner_id)
    
    result = {
        "success": True,
        "task_completed": request.task_name,
        "phase": current_phase,
        "progress": status["progress_percent"],
        "can_advance": status["can_advance"],
        "pending_tasks": status["pending_tasks"]
    }
    
    # Auto-advance se configurato
    if status["can_advance"] and phase_config.get("auto_advance", False):
        advance_result = await advance_phase(PhaseAdvanceRequest(partner_id=request.partner_id))
        result["auto_advanced"] = True
        result["new_phase"] = advance_result.get("new_phase")
        
        # Notifica Telegram
        await send_telegram_notification(
            f"🚀 *Fase Completata!*\n\n"
            f"👤 {partner_name}\n"
            f"✅ {current_phase} → {advance_result.get('new_phase')}\n"
            f"📋 Tutti i task completati automaticamente"
        )
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: AVANZA FASE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/advance-phase")
async def advance_phase(request: PhaseAdvanceRequest):
    """
    Avanza il partner alla fase successiva.
    Se force=False, richiede che tutti i task siano completati.
    """
    partner = await db.partners.find_one({"id": request.partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    current_phase = partner.get("phase", "F1")
    phase_config = PHASES.get(current_phase, {})
    next_phase = phase_config.get("next_phase")
    
    if not next_phase:
        raise HTTPException(status_code=400, detail=f"Nessuna fase successiva dopo {current_phase}")
    
    # Verifica completamento task
    if not request.force:
        status = await get_partner_journey_status(request.partner_id)
        if not status["can_advance"]:
            raise HTTPException(
                status_code=400,
                detail=f"Task non completati: {status['pending_tasks']}. Usa force=True per forzare."
            )
    
    # Avanza fase
    old_phase = current_phase
    await db.partners.update_one(
        {"id": request.partner_id},
        {"$set": {
            "phase": next_phase,
            "phase_started_at": datetime.now(timezone.utc).isoformat(),
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log
    await db.journey_logs.insert_one({
        "partner_id": request.partner_id,
        "event_type": "phase_advanced",
        "old_phase": old_phase,
        "new_phase": next_phase,
        "forced": request.force,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    partner_name = partner.get("name") or partner.get("nome", "Partner")
    logger.info(f"[JOURNEY] {partner_name}: Avanzato da {old_phase} a {next_phase}")
    
    # Trigger azioni specifiche per fase
    await trigger_phase_actions(request.partner_id, next_phase)
    
    return {
        "success": True,
        "partner_id": request.partner_id,
        "old_phase": old_phase,
        "new_phase": next_phase,
        "phase_name": PHASES.get(next_phase, {}).get("name", ""),
        "next_tasks": PHASES.get(next_phase, {}).get("tasks", [])
    }


async def trigger_phase_actions(partner_id: str, new_phase: str):
    """Trigger azioni automatiche per la nuova fase"""
    partner = await db.partners.find_one({"id": partner_id})
    partner_name = partner.get("name") or partner.get("nome", "Partner")
    partner_email = partner.get("email", "")
    
    actions_triggered = []
    
    # F2 → Invia questionario posizionamento
    if new_phase == "F2":
        # TODO: Invia email con link questionario
        actions_triggered.append("positioning_questionnaire_email")
    
    # F3 → Invia questionario masterclass
    elif new_phase == "F3":
        actions_triggered.append("masterclass_questionnaire_email")
    
    # F5 → Verifica setup Avatar
    elif new_phase == "F5":
        # Check se avatar è configurato
        if partner.get("avatar_status") not in ["VERIFIED", "ACTIVE"]:
            await send_telegram_notification(
                f"⚠️ *Avatar Non Configurato*\n\n"
                f"👤 {partner_name} è in fase F5 (Produzione)\n"
                f"❌ Avatar status: {partner.get('avatar_status', 'NOT_ACTIVE')}\n"
                f"📌 Configura Avatar prima di procedere"
            )
            actions_triggered.append("avatar_setup_reminder")
    
    # F6 → Attiva modulo Social se sottoscritto
    elif new_phase == "F6":
        if partner.get("social_plan"):
            # Trigger move_to_social
            try:
                from routers.avatar_social import check_social_trigger
                await check_social_trigger(partner_id, new_phase)
                actions_triggered.append("social_module_activated")
            except:
                pass
    
    # F7+ → Notifica per pre-lancio
    elif new_phase == "F7":
        await send_telegram_notification(
            f"🎉 *Partner Pronto per Pre-Lancio!*\n\n"
            f"👤 {partner_name}\n"
            f"📧 {partner_email}\n"
            f"🚀 Accademia completata, pronto per lancio!"
        )
        actions_triggered.append("pre_launch_notification")
    
    if actions_triggered:
        await db.journey_logs.insert_one({
            "partner_id": partner_id,
            "event_type": "phase_actions_triggered",
            "phase": new_phase,
            "actions": actions_triggered,
            "created_at": datetime.now(timezone.utc).isoformat()
        })


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: STATUS PARTNER
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status/{partner_id}")
async def get_journey_status(partner_id: str):
    """Recupera stato completo del journey"""
    return await get_partner_journey_status(partner_id)


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 4: CHECK PARTNER BLOCCATI
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/check-stuck-partners")
async def check_stuck_partners(request: CheckStuckPartnersRequest):
    """
    Trova partner bloccati nella stessa fase da più di X giorni.
    Invia alert e attiva Marco AI per follow-up.
    """
    threshold_date = (datetime.now(timezone.utc) - timedelta(days=request.days_threshold)).isoformat()
    
    # Trova partner con last_activity vecchia
    stuck_partners = await db.partners.find({
        "$or": [
            {"last_activity": {"$lt": threshold_date}},
            {"last_activity": None}
        ],
        "phase": {"$in": ["F1", "F2", "F3", "F4", "F5", "F6"]}  # Solo fasi attive
    }, {"_id": 0}).to_list(100)
    
    alerts = []
    for partner in stuck_partners:
        partner_id = partner.get("id")
        partner_name = partner.get("name") or partner.get("nome", "Partner")
        phase = partner.get("phase", "F1")
        last_activity = partner.get("last_activity", "Mai")
        
        # Calcola giorni bloccato
        if partner.get("last_activity"):
            last = datetime.fromisoformat(partner["last_activity"].replace("Z", "+00:00"))
            days_stuck = (datetime.now(timezone.utc) - last).days
        else:
            days_stuck = 999
        
        alert = {
            "partner_id": partner_id,
            "partner_name": partner_name,
            "phase": phase,
            "days_stuck": days_stuck,
            "last_activity": last_activity
        }
        alerts.append(alert)
        
        # Setta flag alert sul partner
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"alert": True, "alert_reason": f"Bloccato in {phase} da {days_stuck} giorni"}}
        )
    
    # Notifica Telegram se ci sono alert
    if alerts:
        alert_text = "\n".join([
            f"• {a['partner_name']}: {a['phase']} ({a['days_stuck']}gg)"
            for a in alerts[:10]
        ])
        
        await send_telegram_notification(
            f"⚠️ *Partner Bloccati*\n\n"
            f"Trovati {len(alerts)} partner fermi da più di {request.days_threshold} giorni:\n\n"
            f"{alert_text}"
        )
    
    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "threshold_days": request.days_threshold,
        "stuck_partners_count": len(alerts),
        "alerts": alerts
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 5: DASHBOARD FASI
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard")
async def get_journey_dashboard():
    """Dashboard overview di tutti i partner per fase"""
    
    # Count per fase
    pipeline = [
        {"$group": {"_id": "$phase", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    phase_counts = await db.partners.aggregate(pipeline).to_list(20)
    
    # Partner con alert
    alert_count = await db.partners.count_documents({"alert": True})
    
    # Partner attivi oggi
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    active_today = await db.partners.count_documents({
        "last_activity": {"$gte": today_start}
    })
    
    # Totali
    total_partners = await db.partners.count_documents({})
    
    # Ultimi avanzamenti
    recent_advances = await db.journey_logs.find(
        {"event_type": "phase_advanced"},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "phase_distribution": {p["_id"]: p["count"] for p in phase_counts},
        "total_partners": total_partners,
        "partners_with_alerts": alert_count,
        "active_today": active_today,
        "recent_phase_advances": recent_advances,
        "phases_config": {k: {"name": v["name"], "tasks": v["tasks"]} for k, v in PHASES.items()}
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 6: BULK TASK COMPLETION (per import)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/bulk-complete-tasks")
async def bulk_complete_tasks(partner_id: str, tasks: List[str]):
    """Completa più task in una volta"""
    results = []
    for task in tasks:
        try:
            result = await complete_task(TaskCompletionRequest(
                partner_id=partner_id,
                task_name=task,
                completed_by="bulk_import"
            ))
            results.append({"task": task, "success": True})
        except HTTPException as e:
            results.append({"task": task, "success": False, "error": str(e.detail)})
    
    return {
        "partner_id": partner_id,
        "results": results,
        "completed_count": len([r for r in results if r["success"]])
    }
