"""
Router FastAPI per gli agenti AI di Business Evolution PRO.
Aggiunge endpoint per MARCO, GAIA, STEFANIA, ANDREA con routing via STEFANIA.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import logging
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from marco_ai import ask_marco, marco_ai, MARCO_SYSTEM_PROMPT
from gaia_ai import ask_gaia, gaia_ai, GAIA_SYSTEM_PROMPT
from stefania_ai import route_message, run_daily_monitoring, stefania_ai
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)
router = APIRouter()

# Database connection
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')


# ─────────────────────────────────────────────
# MODELLI PYDANTIC
# ─────────────────────────────────────────────

class MarcoCheckinRequest(BaseModel):
    partner_id: str
    nome_partner: str
    piano_attivo: str = ""
    fase_attuale: str = ""
    obiettivi_settimana: str = ""
    settimane_consecutive_inattive: int = 0
    ultimo_check_in: Optional[str] = None
    tipo: str = "lunedi"  # "lunedi" | "venerdi" | "followup"

class MarcoMessageRequest(BaseModel):
    partner_id: str
    nome_partner: str
    piano_attivo: str = ""
    fase_attuale: str = ""
    obiettivi_settimana: str = ""
    settimane_consecutive_inattive: int = 0
    ultimo_check_in: Optional[str] = None
    messaggio: str

class GaiaSupportRequest(BaseModel):
    partner_id: str
    nome_partner: str
    piano_attivo: str = ""
    accademia_url: Optional[str] = ""
    strumenti_configurati: Optional[str] = ""
    errore_segnalato: Optional[str] = ""
    messaggio: str

class StefaniaRouteRequest(BaseModel):
    partner_id: str
    nome_partner: str
    messaggio: str
    fase_attuale: Optional[str] = ""
    piano_attivo: Optional[str] = ""

class StefaniaMonitorRequest(BaseModel):
    partner_ids: Optional[List[str]] = None  # None = tutti i partner attivi

class MarcoRunRequest(BaseModel):
    partner_id: Optional[str] = None  # Se None, processa tutti i partner F3+

class AndreaRunRequest(BaseModel):
    partner_id: Optional[str] = None  # Se None, processa tutti i partner F4+


# ─────────────────────────────────────────────
# MARCO — Accountability Settimanale
# ─────────────────────────────────────────────

@router.post("/marco/checkin")
async def marco_checkin(request: MarcoCheckinRequest):
    """
    Check-in settimanale MARCO.
    Chiamato automaticamente ogni lunedì mattina e venerdì pomeriggio
    dallo scheduler, oppure manualmente dall'admin.
    """
    try:
        context = {
            "nome_partner": request.nome_partner,
            "piano_attivo": request.piano_attivo,
            "obiettivi_settimana": request.obiettivi_settimana,
            "settimane_consecutive_inattive": request.settimane_consecutive_inattive,
            "ultimo_check_in": request.ultimo_check_in or "mai",
            "fase_attuale": request.fase_attuale,
            "partner_id": request.partner_id
        }

        if request.tipo == "lunedi":
            prompt = f"È lunedì mattina. Invia il check-in settimanale al partner {request.nome_partner}."
        elif request.tipo == "venerdi":
            prompt = f"È venerdì pomeriggio. Invia il recap settimanale al partner {request.nome_partner}."
        else:
            prompt = f"Invia un follow-up di accountability al partner {request.nome_partner}."

        risposta = ask_marco(prompt, context)

        return {
            "agente": "MARCO",
            "partner_id": request.partner_id,
            "tipo": request.tipo,
            "risposta": risposta,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"[MARCO] Errore checkin partner {request.partner_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marco/message")
async def marco_message(request: MarcoMessageRequest):
    """Risposta di MARCO a un messaggio diretto del partner."""
    try:
        context = {
            "nome_partner": request.nome_partner,
            "piano_attivo": request.piano_attivo,
            "obiettivi_settimana": request.obiettivi_settimana,
            "settimane_consecutive_inattive": request.settimane_consecutive_inattive,
            "ultimo_check_in": request.ultimo_check_in or "mai",
            "fase_attuale": request.fase_attuale,
            "partner_id": request.partner_id
        }
        risposta = ask_marco(request.messaggio, context)
        return {
            "agente": "MARCO",
            "partner_id": request.partner_id,
            "risposta": risposta,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"[MARCO] Errore message partner {request.partner_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# GAIA — Supporto Tecnico
# ─────────────────────────────────────────────

@router.post("/gaia/support")
async def gaia_support(request: GaiaSupportRequest):
    """
    Richiesta supporto tecnico al partner.
    Chiamato quando il partner apre un ticket tecnico
    o scrive nella chat di supporto.
    """
    try:
        context = {
            "nome_partner": request.nome_partner,
            "piano_attivo": request.piano_attivo,
            "accademia_url": request.accademia_url or "",
            "strumenti_configurati": request.strumenti_configurati or "",
            "errore_segnalato": request.errore_segnalato or "",
            "partner_id": request.partner_id
        }
        risposta = ask_gaia(request.messaggio, context)

        return {
            "agente": "GAIA",
            "partner_id": request.partner_id,
            "risposta": risposta,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"[GAIA] Errore supporto partner {request.partner_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# STEFANIA — Routing + Monitoraggio
# ─────────────────────────────────────────────

@router.post("/stefania/route")
async def stefania_route(request: StefaniaRouteRequest):
    """
    Stefania analizza il messaggio del partner e restituisce
    a quale agente smistarlo + il messaggio di risposta iniziale.
    Usato come middleware prima di chiamare l'agente specifico.
    """
    try:
        contesto = {
            "nome_partner": request.nome_partner,
            "fase_attuale": request.fase_attuale or "",
            "piano_attivo": request.piano_attivo or "",
        }
        risultato = route_message(request.messaggio, contesto)

        return {
            "agente": "STEFANIA",
            "partner_id": request.partner_id,
            "agente_destinatario": risultato.get("agente_destinatario"),
            "motivo": risultato.get("motivo"),
            "messaggio_routing": risultato.get("messaggio"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"[STEFANIA] Errore routing partner {request.partner_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stefania/daily-report")
async def stefania_daily_report():
    """
    Genera il report giornaliero di STEFANIA.
    Chiamato ogni mattina dallo scheduler (cron job).
    Restituisce il report con alert aperti, partner inattivi,
    piani in scadenza e azioni attivate.
    """
    try:
        report = run_daily_monitoring()
        return {
            "agente": "STEFANIA",
            "tipo": "daily_report",
            "report": report,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"[STEFANIA] Errore daily report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stefania/monitor")
async def stefania_monitor(request: StefaniaMonitorRequest, background_tasks: BackgroundTasks):
    """
    Trigger manuale del ciclo di monitoraggio STEFANIA.
    Controlla partner inattivi, pre-lancio, piani in scadenza.
    Viene eseguito in background per non bloccare la risposta.
    """
    background_tasks.add_task(run_daily_monitoring, request.partner_ids)
    return {
        "agente": "STEFANIA",
        "status": "monitoring_avviato",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────
# MARCO — Scheduler Endpoint
# ─────────────────────────────────────────────

@router.post("/marco/run")
async def marco_run(request: MarcoRunRequest = None):
    """
    Trigger manuale o schedulato per MARCO.
    Genera check-in settimanali per tutti i partner in fase F3+.
    Chiamato dallo scheduler ogni lunedì alle 9:00.
    """
    try:
        # Fasi valide per check-in (F3 e superiori = in produzione attiva)
        valid_phases = ["F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13"]
        
        # Query partners
        if request and request.partner_id:
            partners = await db.partners.find({"id": request.partner_id}, {"_id": 0}).to_list(1)
        else:
            partners = await db.partners.find(
                {"phase": {"$in": valid_phases}},
                {"_id": 0}
            ).to_list(100)
        
        if not partners:
            return {
                "success": True,
                "agente": "MARCO",
                "partners_contacted": 0,
                "checkins": [],
                "message": "Nessun partner in fase F3+ trovato",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        checkins = []
        now = datetime.now(timezone.utc)
        
        for partner in partners:
            partner_id = partner.get("id", "")
            partner_name = partner.get("name", "Partner")
            phase = partner.get("phase", "")
            ultimo_checkin = partner.get("ultimo_checkin_at")
            
            # Genera messaggio AI via Claude
            try:
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    model="claude-haiku-4-5-20251001",
                    system_prompt="""Sei MARCO, l'agente di accountability di Evolution PRO.
Ogni lunedì mandi un check-in al partner per sapere:
1. Cosa ha fatto la settimana scorsa
2. Cosa farà questa settimana
3. Se ha bisogno di supporto
Sei diretto, positivo, concreto. Mai generico.
Rispondi con un messaggio personalizzato di max 100 parole."""
                )
                
                prompt = f"""Genera il check-in settimanale per:
- Nome: {partner_name}
- Fase attuale: {phase}
- Ultimo check-in: {ultimo_checkin or 'mai'}

Scrivi un messaggio breve e concreto."""

                response = await chat.send_message_async(UserMessage(text=prompt))
                message = response.text if hasattr(response, 'text') else str(response)
            except Exception as ai_error:
                logger.warning(f"[MARCO] Errore AI per {partner_name}: {ai_error}")
                message = f"Ciao {partner_name}! È lunedì, tempo di check-in settimanale. Come sta andando il percorso in fase {phase}? Cosa hai completato la settimana scorsa e cosa pianifichi per questa?"
            
            # Salva check-in nel database
            checkin_doc = {
                "partner_id": partner_id,
                "partner_name": partner_name,
                "message": message,
                "sent_at": now.isoformat(),
                "type": "weekly",
                "phase": phase
            }
            await db.checkins.insert_one(checkin_doc)
            
            # Aggiorna ultimo_checkin_at sul partner
            await db.partners.update_one(
                {"id": partner_id},
                {"$set": {"ultimo_checkin_at": now.isoformat()}}
            )
            
            checkins.append({
                "partner_id": partner_id,
                "partner_name": partner_name,
                "message": message
            })
            
            logger.info(f"[MARCO] Check-in inviato a {partner_name} (fase {phase})")
        
        # Aggiorna metriche agente MARCO
        await db.agents.update_one(
            {"id": "MARCO"},
            {
                "$inc": {"metrics.checkins_sent": len(checkins)},
                "$set": {
                    "last_run": now.isoformat(),
                    "status": "ACTIVE"
                }
            }
        )
        
        return {
            "success": True,
            "agente": "MARCO",
            "partners_contacted": len(checkins),
            "checkins": checkins,
            "timestamp": now.isoformat()
        }
    
    except Exception as e:
        logger.error(f"[MARCO] Errore run: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# ANDREA — Video Production Scheduler Endpoint
# ─────────────────────────────────────────────

@router.post("/andrea/run")
async def andrea_run(request: AndreaRunRequest = None):
    """
    Trigger manuale o schedulato per ANDREA.
    Genera suggerimenti video per partner in fase F4+.
    Chiamato dallo scheduler ogni giovedì alle 10:00.
    """
    try:
        # Fasi valide per video review (F4+ = post setup base)
        valid_phases = ["F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13"]
        
        # Query partners
        if request and request.partner_id:
            partners = await db.partners.find({"id": request.partner_id}, {"_id": 0}).to_list(1)
        else:
            partners = await db.partners.find(
                {"phase": {"$in": valid_phases}},
                {"_id": 0}
            ).to_list(100)
        
        if not partners:
            return {
                "success": True,
                "agente": "ANDREA",
                "partners_reviewed": 0,
                "plans": [],
                "message": "Nessun partner in fase F4+ trovato",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        plans = []
        now = datetime.now(timezone.utc)
        
        for partner in partners:
            partner_id = partner.get("id", "")
            partner_name = partner.get("name", "Partner")
            partner_niche = partner.get("niche", "")
            phase = partner.get("phase", "")
            video_tasks = partner.get("video_tasks", [])
            
            # Genera piano video AI via Claude
            try:
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    model="claude-haiku-4-5-20251001",
                    system_prompt="""Sei ANDREA, il produttore di contenuti di Evolution PRO.
Aiuti i partner a pianificare e registrare i moduli del loro corso.
Dai feedback concreti su script, struttura e titoli. Sei creativo e pratico.
Rispondi con un piano settimanale video di max 150 parole."""
                )
                
                prompt = f"""Genera il piano video settimanale per:
- Nome: {partner_name}
- Nicchia: {partner_niche}
- Fase attuale: {phase}
- Task video pendenti: {len(video_tasks)} moduli

Suggerisci cosa registrare questa settimana e come strutturarlo."""

                response = await chat.send_message_async(UserMessage(text=prompt))
                plan_message = response.text if hasattr(response, 'text') else str(response)
            except Exception as ai_error:
                logger.warning(f"[ANDREA] Errore AI per {partner_name}: {ai_error}")
                plan_message = f"Ciao {partner_name}! Questa settimana ti consiglio di concentrarti sulla registrazione del prossimo modulo del tuo corso. Prepara lo script, fai un test audio/video e poi registra. Ricorda: meglio fatto che perfetto!"
            
            # Salva piano nel database
            plan_doc = {
                "partner_id": partner_id,
                "partner_name": partner_name,
                "plan": plan_message,
                "created_at": now.isoformat(),
                "type": "weekly_video_plan",
                "phase": phase
            }
            await db.andrea_tasks.insert_one(plan_doc)
            
            plans.append({
                "partner_id": partner_id,
                "partner_name": partner_name,
                "plan": plan_message
            })
            
            logger.info(f"[ANDREA] Piano video generato per {partner_name} (fase {phase})")
        
        # Aggiorna metriche agente ANDREA
        await db.agents.update_one(
            {"id": "ANDREA"},
            {
                "$inc": {"metrics.plans_generated": len(plans)},
                "$set": {
                    "last_run": now.isoformat(),
                    "status": "ACTIVE"
                }
            }
        )
        
        return {
            "success": True,
            "agente": "ANDREA",
            "partners_reviewed": len(plans),
            "plans": plans,
            "timestamp": now.isoformat()
        }
    
    except Exception as e:
        logger.error(f"[ANDREA] Errore run: {e}")
        raise HTTPException(status_code=500, detail=str(e))
