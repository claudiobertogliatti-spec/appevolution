"""
Job schedulati per Business Evolution PRO.
Gestisce i trigger automatici di MARCO (lunedì/venerdì)
e STEFANIA (monitoraggio giornaliero).
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


def get_all_active_partners():
    """Fetch all active partners from database"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        
        mongo_url = os.environ.get("MONGO_URL", "")
        db_name = os.environ.get("DB_NAME", "evolution_pro")
        
        if not mongo_url:
            logger.warning("[SCHEDULER] No MONGO_URL configured")
            return []
        
        async def fetch():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            partners = await db.partners.find({"status": {"$in": ["active", "attivo"]}}).to_list(100)
            client.close()
            
            # Format for scheduler
            result = []
            for p in partners:
                result.append({
                    "id": str(p.get("_id", "")),
                    "nome": p.get("nome", "Partner"),
                    "piano_attivo": p.get("piano_attivo", ""),
                    "fase_attuale": p.get("current_phase", p.get("fase_attuale", "")),
                    "obiettivi_settimana": p.get("obiettivi_settimana", "obiettivi definiti nel percorso"),
                    "settimane_inattive": p.get("settimane_inattive", 0),
                    "ultimo_check_in": p.get("ultimo_check_in", "")
                })
            return result
        
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, fetch())
                    return future.result()
            else:
                return asyncio.run(fetch())
        except RuntimeError:
            return asyncio.run(fetch())
            
    except Exception as e:
        logger.error(f"[SCHEDULER] Error fetching partners: {e}")
        return []


def trigger_marco_lunedi():
    """Ogni lunedì alle 8:30 — check-in settimanale per tutti i partner attivi."""
    try:
        partners = get_all_active_partners()
        logger.info(f"[SCHEDULER] MARCO lunedì - {len(partners)} partner attivi")

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
            try:
                httpx.post(f"{BASE_URL}/marco/checkin", json=payload, timeout=30)
                logger.info(f"[SCHEDULER] MARCO check-in lunedì → {p['nome']}")
            except Exception as req_error:
                logger.error(f"[SCHEDULER] Failed to send checkin to {p['nome']}: {req_error}")

    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_marco_lunedi: {e}")


def trigger_marco_venerdi():
    """Ogni venerdì alle 17:00 — recap settimanale per tutti i partner attivi."""
    try:
        partners = get_all_active_partners()
        logger.info(f"[SCHEDULER] MARCO venerdì - {len(partners)} partner attivi")

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
            try:
                httpx.post(f"{BASE_URL}/marco/checkin", json=payload, timeout=30)
                logger.info(f"[SCHEDULER] MARCO recap venerdì → {p['nome']}")
            except Exception as req_error:
                logger.error(f"[SCHEDULER] Failed to send recap to {p['nome']}: {req_error}")

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
