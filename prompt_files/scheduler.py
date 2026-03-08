"""
FILE: /app/backend/scheduler.py

Job schedulati per Business Evolution PRO.
Gestisce i trigger automatici di MARCO (lunedì/venerdì)
e STEFANIA (monitoraggio giornaliero).

Dipendenze da installare:
  pip install apscheduler

Come integrare in server.py (startup/shutdown):

  from scheduler import start_scheduler, stop_scheduler

  @app.on_event("startup")
  async def startup():
      start_scheduler()

  @app.on_event("shutdown")
  async def shutdown():
      stop_scheduler()
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import httpx

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="Europe/Rome")

BASE_URL = "http://localhost:8000/api/agents"


def trigger_marco_lunedi():
    """Ogni lunedì alle 8:30 — check-in settimanale per tutti i partner attivi."""
    try:
        from database import get_all_active_partners
        partners = get_all_active_partners()

        for p in partners:
            payload = {
                "partner_id": p["id"],
                "nome_partner": p["nome"],
                "piano_attivo": p.get("piano_attivo", ""),
                "fase_attuale": p.get("fase_attuale", ""),
                "obiettivi_settimana": p.get("obiettivi_settimana", "obiettivi definiti nel percorso"),
                "settimane_consecutive_inattive": p.get("settimane_inattive", 0),
                "ultimo_check_in": p.get("ultimo_check_in"),
                "tipo": "lunedi"
            }
            httpx.post(f"{BASE_URL}/marco/checkin", json=payload, timeout=30)
            logger.info(f"[SCHEDULER] MARCO check-in lunedì → {p['nome']}")

    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_marco_lunedi: {e}")


def trigger_marco_venerdi():
    """Ogni venerdì alle 17:00 — recap settimanale per tutti i partner attivi."""
    try:
        from database import get_all_active_partners
        partners = get_all_active_partners()

        for p in partners:
            payload = {
                "partner_id": p["id"],
                "nome_partner": p["nome"],
                "piano_attivo": p.get("piano_attivo", ""),
                "fase_attuale": p.get("fase_attuale", ""),
                "obiettivi_settimana": p.get("obiettivi_settimana", "obiettivi definiti nel percorso"),
                "settimane_consecutive_inattive": p.get("settimane_inattive", 0),
                "ultimo_check_in": p.get("ultimo_check_in"),
                "tipo": "venerdi"
            }
            httpx.post(f"{BASE_URL}/marco/checkin", json=payload, timeout=30)
            logger.info(f"[SCHEDULER] MARCO recap venerdì → {p['nome']}")

    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_marco_venerdi: {e}")


def trigger_stefania_daily():
    """Ogni giorno alle 7:00 — monitoraggio giornaliero STEFANIA."""
    try:
        response = httpx.get(f"{BASE_URL}/stefania/daily-report", timeout=60)
        report = response.json()

        critici = report.get("report", {}).get("situazioni_critiche", [])
        azioni = report.get("report", {}).get("azioni_attivate", [])

        logger.info(f"[SCHEDULER] STEFANIA report — Azioni: {len(azioni)} | Critici: {len(critici)}")

        # Log situazioni critiche per Claudio
        for c in critici:
            logger.warning(f"[STEFANIA CRITICO] {c}")

    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_stefania_daily: {e}")


def start_scheduler():
    """Avvia tutti i job schedulati."""

    # MARCO — ogni lunedì alle 8:30
    scheduler.add_job(
        trigger_marco_lunedi,
        CronTrigger(day_of_week="mon", hour=8, minute=30),
        id="marco_lunedi",
        replace_existing=True
    )

    # MARCO — ogni venerdì alle 17:00
    scheduler.add_job(
        trigger_marco_venerdi,
        CronTrigger(day_of_week="fri", hour=17, minute=0),
        id="marco_venerdi",
        replace_existing=True
    )

    # STEFANIA — ogni giorno alle 7:00
    scheduler.add_job(
        trigger_stefania_daily,
        CronTrigger(hour=7, minute=0),
        id="stefania_daily",
        replace_existing=True
    )

    scheduler.start()
    logger.info("[SCHEDULER] Avviato — MARCO lunedì/venerdì, STEFANIA giornaliero")


def stop_scheduler():
    """Ferma lo scheduler alla chiusura dell'app."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[SCHEDULER] Fermato")
