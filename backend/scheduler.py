"""
Job schedulati per Business Evolution PRO.
Gestisce i trigger automatici di MARCO (lunedì/venerdì),
ANDREA (giovedì) e STEFANIA (monitoraggio giornaliero).
"""

import os
import logging
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="Europe/Rome")

# Use internal URL for scheduler calls
BASE_URL = "http://localhost:8001/api/agents"


def trigger_marco_run():
    """Ogni lunedì alle 9:00 — check-in settimanale per tutti i partner F3+."""
    try:
        logger.info("[SCHEDULER] MARCO run — avvio check-in settimanali")
        response = httpx.post(f"{BASE_URL}/marco/run", json={}, timeout=60)
        result = response.json()
        partners_contacted = result.get("partners_contacted", 0)
        logger.info(f"[SCHEDULER] MARCO check-in completato — {partners_contacted} partner contattati")
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_marco_run: {e}")


def trigger_andrea_run():
    """Ogni giovedì alle 10:00 — piani video settimanali per partner F4+."""
    try:
        logger.info("[SCHEDULER] ANDREA run — avvio piani video")
        response = httpx.post(f"{BASE_URL}/andrea/run", json={}, timeout=60)
        result = response.json()
        partners_reviewed = result.get("partners_reviewed", 0)
        logger.info(f"[SCHEDULER] ANDREA piani video completati — {partners_reviewed} partner processati")
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_andrea_run: {e}")


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
    
    # MARCO — ogni lunedì alle 9:00 (ora italiana)
    scheduler.add_job(
        trigger_marco_run,
        CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="marco_run",
        replace_existing=True
    )

    # ANDREA — ogni giovedì alle 10:00 (ora italiana)
    scheduler.add_job(
        trigger_andrea_run,
        CronTrigger(day_of_week="thu", hour=10, minute=0),
        id="andrea_run",
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
    logger.info("[SCHEDULER] Avviato — MARCO lunedì ore 9, ANDREA giovedì ore 10, STEFANIA giornaliero ore 7")


def stop_scheduler():
    """Ferma lo scheduler alla chiusura dell'app."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[SCHEDULER] Fermato")
