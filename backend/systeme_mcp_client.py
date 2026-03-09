"""
Systeme.io MCP Client
Integrazione con le API MCP di Systeme.io per Evolution PRO OS

Chiavi richieste:
- SYSTEME_MCP_READ_KEY: chiave con permessi READ ONLY
- SYSTEME_MCP_WRITE_KEY: chiave con permessi READ + WRITE
"""

import os
import httpx
import logging
from typing import Optional, List, Dict
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SYSTEME_MCP_READ_KEY = os.getenv("SYSTEME_MCP_READ_KEY")
SYSTEME_MCP_WRITE_KEY = os.getenv("SYSTEME_MCP_WRITE_KEY")
SYSTEME_MCP_BASE_URL = os.getenv("SYSTEME_MCP_BASE_URL", "https://api.systeme.io/mcp/v1")


def _headers(write: bool = False) -> dict:
    """Genera headers per le richieste API."""
    key = SYSTEME_MCP_WRITE_KEY if write else SYSTEME_MCP_READ_KEY
    if not key:
        logger.warning(f"[SYSTEME MCP] Chiave {'WRITE' if write else 'READ'} non configurata")
    return {
        "Authorization": f"Bearer {key}" if key else "",
        "Content-Type": "application/json"
    }


def is_configured() -> bool:
    """Verifica se le chiavi MCP sono configurate."""
    return bool(SYSTEME_MCP_READ_KEY)


# ─── LETTURA ────────────────────────────────────────────────────

def get_contact_by_email(email: str) -> Optional[dict]:
    """Recupera contatto da Systeme.io per email."""
    if not is_configured():
        logger.warning("[SYSTEME MCP] Chiavi non configurate - modalità demo")
        return None
    try:
        r = httpx.get(
            f"{SYSTEME_MCP_BASE_URL}/contacts",
            params={"email": email},
            headers=_headers(),
            timeout=10
        )
        r.raise_for_status()
        data = r.json()
        return data.get("contacts", [None])[0]
    except Exception as e:
        logger.error(f"[SYSTEME MCP] get_contact_by_email error: {e}")
        return None


def get_partner_orders(email: str) -> List[dict]:
    """Recupera tutti gli ordini di un partner (fee mensili + upfront)."""
    if not is_configured():
        return []
    try:
        r = httpx.get(
            f"{SYSTEME_MCP_BASE_URL}/orders",
            params={"email": email},
            headers=_headers(),
            timeout=10
        )
        r.raise_for_status()
        return r.json().get("orders", [])
    except Exception as e:
        logger.error(f"[SYSTEME MCP] get_partner_orders error: {e}")
        return []


def get_accademia_revenue(course_id: str) -> dict:
    """Recupera fatturato di un corso/accademia partner."""
    if not is_configured():
        return {"revenue": 0, "students": 0, "demo_mode": True}
    try:
        r = httpx.get(
            f"{SYSTEME_MCP_BASE_URL}/courses/{course_id}/stats",
            headers=_headers(),
            timeout=10
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"[SYSTEME MCP] get_accademia_revenue error: {e}")
        return {"revenue": 0, "students": 0, "error": str(e)}


def get_active_subscriptions() -> List[dict]:
    """Recupera tutti i piani attivi (fee mensili continuità)."""
    if not is_configured():
        return []
    try:
        r = httpx.get(
            f"{SYSTEME_MCP_BASE_URL}/subscriptions",
            params={"status": "active"},
            headers=_headers(),
            timeout=10
        )
        r.raise_for_status()
        return r.json().get("subscriptions", [])
    except Exception as e:
        logger.error(f"[SYSTEME MCP] get_active_subscriptions error: {e}")
        return []


def get_expiring_plans(days: int = 30) -> List[dict]:
    """Recupera piani in scadenza nei prossimi N giorni."""
    if not is_configured():
        return []
    try:
        r = httpx.get(
            f"{SYSTEME_MCP_BASE_URL}/subscriptions",
            params={"status": "active", "expiring_in_days": days},
            headers=_headers(),
            timeout=10
        )
        r.raise_for_status()
        return r.json().get("subscriptions", [])
    except Exception as e:
        logger.error(f"[SYSTEME MCP] get_expiring_plans error: {e}")
        return []


def get_mrr_summary() -> dict:
    """Calcola MRR totale da tutte le sottoscrizioni attive."""
    if not is_configured():
        return {
            "mrr_totale": 0,
            "piani_attivi": 0,
            "fee_mensili": 0,
            "commissioni_mese": 0,
            "rinnovi_30gg": 0,
            "demo_mode": True
        }
    try:
        subs = get_active_subscriptions()
        expiring = get_expiring_plans(30)
        
        mrr_totale = sum(s.get("amount", 0) for s in subs)
        fee_mensili = sum(s.get("fee", 0) for s in subs)
        commissioni = sum(s.get("commission", 0) for s in subs)
        
        return {
            "mrr_totale": mrr_totale,
            "piani_attivi": len(subs),
            "fee_mensili": fee_mensili,
            "commissioni_mese": commissioni,
            "rinnovi_30gg": len(expiring),
            "dettaglio": subs,
            "demo_mode": False
        }
    except Exception as e:
        logger.error(f"[SYSTEME MCP] get_mrr_summary error: {e}")
        return {
            "mrr_totale": 0,
            "piani_attivi": 0,
            "fee_mensili": 0,
            "commissioni_mese": 0,
            "rinnovi_30gg": 0,
            "error": str(e)
        }


def get_contacts_stats() -> dict:
    """Recupera statistiche generali sui contatti."""
    if not is_configured():
        return {
            "total_contacts": 0,
            "new_today": 0,
            "new_month": 0,
            "demo_mode": True
        }
    try:
        r = httpx.get(
            f"{SYSTEME_MCP_BASE_URL}/contacts/stats",
            headers=_headers(),
            timeout=10
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"[SYSTEME MCP] get_contacts_stats error: {e}")
        return {"total_contacts": 0, "error": str(e)}


def get_funnel_stats(funnel_id: str = None) -> dict:
    """Recupera statistiche funnel."""
    if not is_configured():
        return {"conversions": 0, "visits": 0, "demo_mode": True}
    try:
        url = f"{SYSTEME_MCP_BASE_URL}/funnels"
        if funnel_id:
            url = f"{url}/{funnel_id}/stats"
        r = httpx.get(url, headers=_headers(), timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"[SYSTEME MCP] get_funnel_stats error: {e}")
        return {"conversions": 0, "error": str(e)}


# ─── SCRITTURA (solo write key) ─────────────────────────────────

def add_tag_to_contact(email: str, tag: str) -> bool:
    """Aggiunge un tag a un contatto Systeme.io."""
    if not SYSTEME_MCP_WRITE_KEY:
        logger.warning("[SYSTEME MCP] Write key non configurata - operazione saltata")
        return False
    try:
        r = httpx.post(
            f"{SYSTEME_MCP_BASE_URL}/contacts/tag",
            json={"email": email, "tag": tag},
            headers=_headers(write=True),
            timeout=10
        )
        r.raise_for_status()
        logger.info(f"[SYSTEME MCP] Tag '{tag}' aggiunto a {email}")
        return True
    except Exception as e:
        logger.error(f"[SYSTEME MCP] add_tag_to_contact error: {e}")
        return False


def remove_tag_from_contact(email: str, tag: str) -> bool:
    """Rimuove un tag da un contatto Systeme.io."""
    if not SYSTEME_MCP_WRITE_KEY:
        return False
    try:
        r = httpx.delete(
            f"{SYSTEME_MCP_BASE_URL}/contacts/tag",
            json={"email": email, "tag": tag},
            headers=_headers(write=True),
            timeout=10
        )
        r.raise_for_status()
        logger.info(f"[SYSTEME MCP] Tag '{tag}' rimosso da {email}")
        return True
    except Exception as e:
        logger.error(f"[SYSTEME MCP] remove_tag_from_contact error: {e}")
        return False


def trigger_automation(automation_id: str, email: str) -> bool:
    """Attiva un'automazione Systeme.io per un contatto specifico."""
    if not SYSTEME_MCP_WRITE_KEY:
        logger.warning("[SYSTEME MCP] Write key non configurata - automazione saltata")
        return False
    try:
        r = httpx.post(
            f"{SYSTEME_MCP_BASE_URL}/automations/{automation_id}/trigger",
            json={"email": email},
            headers=_headers(write=True),
            timeout=10
        )
        r.raise_for_status()
        logger.info(f"[SYSTEME MCP] Automazione {automation_id} attivata per {email}")
        return True
    except Exception as e:
        logger.error(f"[SYSTEME MCP] trigger_automation error: {e}")
        return False


# ─── HELPER PER PIANO CONTINUITÀ ────────────────────────────────

PIANO_TAGS = {
    "starter": "piano_starter",
    "builder": "piano_builder",
    "pro": "piano_pro",
    "elite": "piano_elite"
}

def activate_piano_continuita(email: str, piano: str) -> bool:
    """Attiva un piano continuità aggiungendo il tag corrispondente."""
    if piano not in PIANO_TAGS:
        logger.error(f"[SYSTEME MCP] Piano non valido: {piano}")
        return False
    
    tag = PIANO_TAGS[piano]
    
    # Rimuovi eventuali tag di altri piani
    for p, t in PIANO_TAGS.items():
        if p != piano:
            remove_tag_from_contact(email, t)
    
    # Aggiungi il nuovo tag
    success = add_tag_to_contact(email, tag)
    if success:
        add_tag_to_contact(email, "piano_continuita_attivo")
    
    return success


def deactivate_piano_continuita(email: str) -> bool:
    """Disattiva il piano continuità rimuovendo tutti i tag relativi."""
    success = True
    for tag in PIANO_TAGS.values():
        if not remove_tag_from_contact(email, tag):
            success = False
    remove_tag_from_contact(email, "piano_continuita_attivo")
    return success


# ─── HELPER PER PARTNER REVENUE ─────────────────────────────────

def get_partner_mrr(email: str) -> dict:
    """Recupera MRR specifico di un partner dalla sua accademia."""
    orders = get_partner_orders(email)
    
    if not orders:
        return {"mrr": 0, "total_revenue": 0, "orders_count": 0}
    
    # Filtra ordini mensili ricorrenti
    monthly_orders = [o for o in orders if o.get("type") == "subscription"]
    one_time = [o for o in orders if o.get("type") == "one_time"]
    
    mrr = sum(o.get("amount", 0) for o in monthly_orders)
    total = sum(o.get("amount", 0) for o in orders)
    
    return {
        "mrr": mrr,
        "total_revenue": total,
        "orders_count": len(orders),
        "subscriptions": len(monthly_orders),
        "one_time_purchases": len(one_time)
    }
