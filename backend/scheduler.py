"""
Job schedulati per Business Evolution PRO.
Gestisce i trigger automatici di MARCO (lunedì/venerdì),
ANDREA (giovedì), STEFANIA (monitoraggio giornaliero),
Sync Systeme.io, Reminder Scadenze e Report KPI.
"""

import os
import logging
import httpx
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="Europe/Rome")

# Use internal URL for scheduler calls
BASE_URL = "http://localhost:8001/api"


def trigger_marco_run():
    """Ogni lunedì alle 9:00 — check-in settimanale per tutti i partner F3+."""
    try:
        logger.info("[SCHEDULER] MARCO run — avvio check-in settimanali")
        response = httpx.post(f"{BASE_URL}/agents/marco/run", json={}, timeout=60)
        result = response.json()
        partners_contacted = result.get("partners_contacted", 0)
        logger.info(f"[SCHEDULER] MARCO check-in completato — {partners_contacted} partner contattati")
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_marco_run: {e}")


def trigger_andrea_run():
    """Ogni giovedì alle 10:00 — piani video settimanali per partner F4+."""
    try:
        logger.info("[SCHEDULER] ANDREA run — avvio piani video")
        response = httpx.post(f"{BASE_URL}/agents/andrea/run", json={}, timeout=60)
        result = response.json()
        partners_reviewed = result.get("partners_reviewed", 0)
        logger.info(f"[SCHEDULER] ANDREA piani video completati — {partners_reviewed} partner processati")
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_andrea_run: {e}")


def trigger_stefania_daily():
    """Ogni giorno alle 7:00 — monitoraggio giornaliero STEFANIA."""
    try:
        response = httpx.get(f"{BASE_URL}/agents/stefania/daily-report", timeout=60)
        report = response.json()

        critici = report.get("report", {}).get("situazioni_critiche", [])
        azioni = report.get("report", {}).get("azioni_attivate", [])

        logger.info(f"[SCHEDULER] STEFANIA report — Azioni: {len(azioni)} | Critici: {len(critici)}")

        # Log situazioni critiche per Claudio
        for c in critici:
            logger.warning(f"[STEFANIA CRITICO] {c}")

    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_stefania_daily: {e}")


def trigger_discovery_cleanup():
    """Ogni giorno alle 3:00 — pulizia duplicati Discovery Engine."""
    try:
        logger.info("[SCHEDULER] Discovery cleanup — avvio pulizia duplicati")
        response = httpx.post(f"{BASE_URL}/discovery/worker/cleanup-duplicates", json={}, timeout=120)
        result = response.json()
        total_removed = result.get("total_removed", 0)
        logger.info(f"[SCHEDULER] Discovery cleanup completato — {total_removed} duplicati rimossi")
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_discovery_cleanup: {e}")


def trigger_systeme_sync():
    """Ogni 6 ore — sync completo con Systeme.io per non perdere lead."""
    try:
        logger.info("[SCHEDULER] Systeme.io sync — avvio sincronizzazione")
        response = httpx.post(f"{BASE_URL}/systeme/sync-all", json={}, timeout=180)
        result = response.json()
        
        new_contacts = result.get("new_contacts", 0)
        updated = result.get("updated", 0)
        errors = result.get("errors", 0)
        
        logger.info(f"[SCHEDULER] Systeme.io sync completato — Nuovi: {new_contacts} | Aggiornati: {updated} | Errori: {errors}")
        
        # Notifica se ci sono nuovi contatti
        if new_contacts > 0:
            try:
                httpx.post(f"{BASE_URL}/notify/telegram", json={
                    "message": f"📥 *Sync Systeme.io*\n\n🆕 {new_contacts} nuovi contatti\n🔄 {updated} aggiornati"
                }, timeout=10)
            except:
                pass
                
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_systeme_sync: {e}")


def trigger_partnership_expiry_reminder():
    """Ogni giorno alle 8:00 — reminder scadenza partnership (30/15/7 giorni)."""
    try:
        logger.info("[SCHEDULER] Partnership expiry check — controllo scadenze")
        
        response = httpx.get(f"{BASE_URL}/partners", timeout=30)
        partners_data = response.json()
        partners = partners_data.get("partners", [])
        
        reminders_30 = []
        reminders_15 = []
        reminders_7 = []
        expired = []
        
        now = datetime.now()
        
        for p in partners:
            # Calcola data scadenza (12 mesi dal pagamento)
            payment_date_str = p.get("data_pagamento_partnership") or p.get("conversion_date") or p.get("created_at")
            if not payment_date_str:
                continue
                
            try:
                payment_date = datetime.fromisoformat(payment_date_str.replace("Z", "+00:00"))
                expiry_date = payment_date + timedelta(days=365)
                days_remaining = (expiry_date - now).days
                
                partner_info = f"{p.get('name', 'N/A')} ({p.get('email', 'N/A')}) - {days_remaining} giorni"
                
                if days_remaining < 0:
                    expired.append(partner_info)
                elif days_remaining <= 7:
                    reminders_7.append(partner_info)
                elif days_remaining <= 15:
                    reminders_15.append(partner_info)
                elif days_remaining <= 30:
                    reminders_30.append(partner_info)
            except:
                continue
        
        # Invia notifica se ci sono reminder
        if expired or reminders_7 or reminders_15 or reminders_30:
            message = "⏰ *Reminder Scadenze Partnership*\n\n"
            
            if expired:
                message += f"🔴 *SCADUTE ({len(expired)}):*\n"
                for r in expired[:5]:
                    message += f"  • {r}\n"
                if len(expired) > 5:
                    message += f"  ... e altri {len(expired) - 5}\n"
                message += "\n"
            
            if reminders_7:
                message += f"🟠 *Scadono in 7 giorni ({len(reminders_7)}):*\n"
                for r in reminders_7:
                    message += f"  • {r}\n"
                message += "\n"
            
            if reminders_15:
                message += f"🟡 *Scadono in 15 giorni ({len(reminders_15)}):*\n"
                for r in reminders_15:
                    message += f"  • {r}\n"
                message += "\n"
            
            if reminders_30:
                message += f"🟢 *Scadono in 30 giorni ({len(reminders_30)}):*\n"
                for r in reminders_30[:5]:
                    message += f"  • {r}\n"
                if len(reminders_30) > 5:
                    message += f"  ... e altri {len(reminders_30) - 5}\n"
            
            try:
                httpx.post(f"{BASE_URL}/notify/telegram", json={"message": message}, timeout=10)
            except:
                pass
            
            logger.info(f"[SCHEDULER] Partnership expiry — Scadute: {len(expired)} | 7gg: {len(reminders_7)} | 15gg: {len(reminders_15)} | 30gg: {len(reminders_30)}")
        else:
            logger.info("[SCHEDULER] Partnership expiry — Nessuna scadenza imminente")
            
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_partnership_expiry_reminder: {e}")


def trigger_weekly_kpi_report():
    """Ogni lunedì alle 8:30 — report KPI settimanale."""
    try:
        logger.info("[SCHEDULER] Weekly KPI report — generazione report")
        
        # Recupera statistiche
        stats = {}
        
        # Partner stats
        try:
            response = httpx.get(f"{BASE_URL}/partners", timeout=30)
            partners = response.json().get("partners", [])
            
            now = datetime.now()
            week_ago = now - timedelta(days=7)
            
            new_partners = sum(1 for p in partners if p.get("created_at") and datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")) > week_ago)
            active_partners = sum(1 for p in partners if p.get("lastActivity") and datetime.fromisoformat(p["lastActivity"].replace("Z", "+00:00")) > week_ago)
            
            # Conta per fase
            phase_counts = {}
            for p in partners:
                phase = p.get("phase", "F0")
                phase_counts[phase] = phase_counts.get(phase, 0) + 1
            
            stats["partners"] = {
                "total": len(partners),
                "new_this_week": new_partners,
                "active_this_week": active_partners,
                "by_phase": phase_counts
            }
        except Exception as e:
            logger.error(f"[KPI] Errore partner stats: {e}")
        
        # Discovery leads stats
        try:
            response = httpx.get(f"{BASE_URL}/discovery/leads?limit=100", timeout=30)
            leads = response.json().get("leads", [])
            
            new_leads = sum(1 for l in leads if l.get("created_at") and datetime.fromisoformat(l["created_at"].replace("Z", "+00:00")) > week_ago)
            hot_leads = sum(1 for l in leads if l.get("score_total", 0) >= 70)
            
            stats["leads"] = {
                "total": len(leads),
                "new_this_week": new_leads,
                "hot_leads": hot_leads
            }
        except Exception as e:
            logger.error(f"[KPI] Errore leads stats: {e}")
        
        # Clienti analisi stats
        try:
            response = httpx.get(f"{BASE_URL}/admin/clienti-analisi", timeout=30)
            clienti = response.json().get("clienti", [])
            
            new_clienti = sum(1 for c in clienti if c.get("data_pagamento") and datetime.fromisoformat(c["data_pagamento"].replace("Z", "+00:00")) > week_ago)
            
            stats["clienti_analisi"] = {
                "total": len(clienti),
                "new_this_week": new_clienti
            }
        except Exception as e:
            logger.error(f"[KPI] Errore clienti stats: {e}")
        
        # Genera messaggio
        message = f"📊 *Report KPI Settimanale*\n_{now.strftime('%d/%m/%Y')}_\n\n"
        
        if "partners" in stats:
            p = stats["partners"]
            message += "👥 *Partner*\n"
            message += f"  • Totali: {p['total']}\n"
            message += f"  • Nuovi questa settimana: {p['new_this_week']}\n"
            message += f"  • Attivi questa settimana: {p['active_this_week']}\n"
            if p.get("by_phase"):
                phases_str = ", ".join([f"{k}: {v}" for k, v in sorted(p["by_phase"].items())])
                message += f"  • Per fase: {phases_str}\n"
            message += "\n"
        
        if "leads" in stats:
            l = stats["leads"]
            message += "🎯 *Discovery Leads*\n"
            message += f"  • Totali: {l['total']}\n"
            message += f"  • Nuovi questa settimana: {l['new_this_week']}\n"
            message += f"  • Hot leads (score ≥70): {l['hot_leads']}\n\n"
        
        if "clienti_analisi" in stats:
            c = stats["clienti_analisi"]
            message += "💼 *Clienti Analisi (€67)*\n"
            message += f"  • Totali: {c['total']}\n"
            message += f"  • Nuovi questa settimana: {c['new_this_week']}\n"
        
        # Invia via Telegram
        try:
            httpx.post(f"{BASE_URL}/notify/telegram", json={"message": message}, timeout=10)
        except:
            pass
        
        logger.info("[SCHEDULER] Weekly KPI report inviato")
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_weekly_kpi_report: {e}")


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

    # DISCOVERY CLEANUP — ogni giorno alle 3:00
    scheduler.add_job(
        trigger_discovery_cleanup,
        CronTrigger(hour=3, minute=0),
        id="discovery_cleanup",
        replace_existing=True
    )
    
    # SYSTEME.IO SYNC — ogni 6 ore
    scheduler.add_job(
        trigger_systeme_sync,
        IntervalTrigger(hours=6),
        id="systeme_sync",
        replace_existing=True
    )
    
    # PARTNERSHIP EXPIRY REMINDER — ogni giorno alle 8:00
    scheduler.add_job(
        trigger_partnership_expiry_reminder,
        CronTrigger(hour=8, minute=0),
        id="partnership_expiry_reminder",
        replace_existing=True
    )
    
    # WEEKLY KPI REPORT — ogni lunedì alle 8:30
    scheduler.add_job(
        trigger_weekly_kpi_report,
        CronTrigger(day_of_week="mon", hour=8, minute=30),
        id="weekly_kpi_report",
        replace_existing=True
    )

    scheduler.start()
    logger.info(
        "[SCHEDULER] Avviato:\n"
        "  • MARCO: lunedì ore 9\n"
        "  • ANDREA: giovedì ore 10\n"
        "  • STEFANIA: giornaliero ore 7\n"
        "  • DISCOVERY CLEANUP: giornaliero ore 3\n"
        "  • SYSTEME.IO SYNC: ogni 6 ore\n"
        "  • PARTNERSHIP EXPIRY: giornaliero ore 8\n"
        "  • WEEKLY KPI: lunedì ore 8:30"
    )


def stop_scheduler():
    """Ferma lo scheduler alla chiusura dell'app."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[SCHEDULER] Fermato")
