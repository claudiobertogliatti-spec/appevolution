"""
FILE: /app/backend/routers/agents_router.py

Router FastAPI per gli agenti AI di Business Evolution PRO.
Aggiunge endpoint per MARCO, GAIA, STEFANIA, con routing via STEFANIA.

Come integrare in server.py:
  from routers.agents_router import router as agents_router
  app.include_router(agents_router, prefix="/api/agents", tags=["agents"])
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import anthropic
import logging
from datetime import datetime

from marco_ai import ask_marco, MARCO_SYSTEM_PROMPT
from gaia_ai import ask_gaia, GAIA_SYSTEM_PROMPT
from stefania_ai import ask_stefania, route_message, run_daily_monitoring

logger = logging.getLogger(__name__)
router = APIRouter()
client = anthropic.Anthropic()


# ─────────────────────────────────────────────
# MODELLI PYDANTIC
# ─────────────────────────────────────────────

class MarcoCheckinRequest(BaseModel):
    partner_id: str
    nome_partner: str
    piano_attivo: str
    fase_attuale: str
    obiettivi_settimana: str
    settimane_consecutive_inattive: int = 0
    ultimo_check_in: Optional[str] = None
    tipo: str = "lunedi"  # "lunedi" | "venerdi" | "followup"

class GaiaSupportRequest(BaseModel):
    partner_id: str
    nome_partner: str
    piano_attivo: str
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
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"[MARCO] Errore checkin partner {request.partner_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marco/message")
async def marco_message(request: MarcoCheckinRequest, messaggio: str):
    """Risposta di MARCO a un messaggio diretto del partner."""
    try:
        context = {
            "nome_partner": request.nome_partner,
            "piano_attivo": request.piano_attivo,
            "obiettivi_settimana": request.obiettivi_settimana,
            "settimane_consecutive_inattive": request.settimane_consecutive_inattive,
            "ultimo_check_in": request.ultimo_check_in or "mai",
            "fase_attuale": request.fase_attuale,
        }
        risposta = ask_marco(messaggio, context)
        return {"agente": "MARCO", "risposta": risposta}
    except Exception as e:
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
            "accademia_url": request.accademia_url,
            "strumenti_configurati": request.strumenti_configurati,
            "errore_segnalato": request.errore_segnalato,
        }
        risposta = ask_gaia(request.messaggio, context)

        return {
            "agente": "GAIA",
            "partner_id": request.partner_id,
            "risposta": risposta,
            "timestamp": datetime.utcnow().isoformat()
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
            "fase_attuale": request.fase_attuale,
            "piano_attivo": request.piano_attivo,
        }
        risultato = route_message(request.messaggio, contesto)

        return {
            "agente": "STEFANIA",
            "partner_id": request.partner_id,
            "agente_destinatario": risultato.get("agente_destinatario"),
            "motivo": risultato.get("motivo"),
            "messaggio_routing": risultato.get("messaggio"),
            "timestamp": datetime.utcnow().isoformat()
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
            "timestamp": datetime.utcnow().isoformat()
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
        "timestamp": datetime.utcnow().isoformat()
    }
