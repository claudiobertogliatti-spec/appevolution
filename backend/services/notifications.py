"""
Servizio Notifiche Partner — Evolution PRO
Gestisce l'invio di notifiche via Telegram e Systeme.io (tag → automazione email).

Eventi supportati:
  - step_pronto: Lo step è pronto per l'approvazione del partner
  - azione_richiesta: Il partner deve compiere un'azione
  - sistema_attivo: Il sistema è attivo e funzionante per il partner

Regole:
  - No spam: max 1 notifica per evento per step
  - No duplicazioni: controlla se già inviata nelle ultime 24h
  - Solo eventi importanti
"""

import os
import logging
import httpx
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


def _get_db():
    """Importa il db dal router partner_journey (condivisione connessione)"""
    try:
        from routers.partner_journey import db
        return db
    except Exception:
        logger.warning("[NOTIFICA] Impossibile importare db dal router")
        return None

# Telegram
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')

# Systeme.io
SYSTEME_API_KEY = os.environ.get('SYSTEME_API_KEY', '')
SYSTEME_BASE_URL = "https://api.systeme.io/api"

# SLA reference
STEP_SLA = {
    "posizionamento": "24h",
    "funnel-light": "24h",
    "masterclass": "48h",
    "videocorso": "48h",
    "funnel": "48h",
    "lancio": "24h",
    "webinar": "48h",
    "email": "24h",
}

STEP_LABELS = {
    "posizionamento": "Posizionamento",
    "funnel-light": "Funnel Light",
    "masterclass": "Masterclass",
    "videocorso": "Videocorso",
    "funnel": "Funnel di Vendita",
    "lancio": "Piano di Lancio",
    "webinar": "Webinar",
    "email": "Email Automatiche",
}

APP_URL = os.environ.get('APP_URL', 'https://app.evolutionpro.it')


# ═══════════════════════════════════════════════════════════════════════════════
# ANTI-SPAM: Controlla duplicazioni
# ═══════════════════════════════════════════════════════════════════════════════

async def _already_notified(partner_id: str, event_type: str, step_id: str, hours: int = 24) -> bool:
    database = _get_db()
    if database is None:
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    existing = await database.notification_log.find_one({
        "partner_id": partner_id,
        "event_type": event_type,
        "step_id": step_id,
        "sent_at": {"$gte": cutoff.isoformat()}
    })
    return existing is not None


async def _log_notification(partner_id: str, event_type: str, step_id: str, channels: list):
    database = _get_db()
    if database is None:
        return
    await database.notification_log.insert_one({
        "partner_id": partner_id,
        "event_type": event_type,
        "step_id": step_id,
        "channels": channels,
        "sent_at": datetime.now(timezone.utc).isoformat()
    })


# ═══════════════════════════════════════════════════════════════════════════════
# TELEGRAM — Messaggi brevi, link diretto, immediati
# ═══════════════════════════════════════════════════════════════════════════════

async def _send_telegram(chat_id: str, message: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                }
            )
            if resp.status_code == 200:
                logger.info(f"[NOTIFICA] Telegram inviato a {chat_id}")
                return True
            logger.warning(f"[NOTIFICA] Telegram errore {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"[NOTIFICA] Telegram fallito per {chat_id}: {e}")
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEME.IO — Tag per triggerare automazione email
# ═══════════════════════════════════════════════════════════════════════════════

async def _get_systeme_contact_id(email: str) -> str:
    """Cerca il contatto su Systeme.io per email"""
    if not SYSTEME_API_KEY or not email:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{SYSTEME_BASE_URL}/contacts",
                params={"email": email},
                headers={"X-API-Key": SYSTEME_API_KEY}
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                if items:
                    return str(items[0].get("id"))
    except Exception as e:
        logger.warning(f"[SYSTEME] Errore ricerca contatto {email}: {e}")
    return None


async def _get_or_create_systeme_tag(tag_name: str) -> str:
    """Trova o crea un tag su Systeme.io e restituisce l'ID numerico"""
    if not SYSTEME_API_KEY:
        return None
    headers = {"X-API-Key": SYSTEME_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Cerca tag esistente
            resp = await client.get(f"{SYSTEME_BASE_URL}/tags", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                for tag in data.get("items", []):
                    if tag.get("name") == tag_name:
                        return str(tag.get("id"))
            
            # Tag non trovato, crealo
            resp = await client.post(
                f"{SYSTEME_BASE_URL}/tags",
                json={"name": tag_name},
                headers={**headers, "Content-Type": "application/json"}
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                tag_id = data.get("id")
                if tag_id:
                    logger.info(f"[SYSTEME] Tag '{tag_name}' creato con id {tag_id}")
                    return str(tag_id)
    except Exception as e:
        logger.warning(f"[SYSTEME] Errore gestione tag '{tag_name}': {e}")
    return None


async def _add_systeme_tag(email: str, tag_name: str) -> bool:
    """Aggiunge un tag al contatto su Systeme.io per triggerare l'automazione email"""
    if not SYSTEME_API_KEY or not email:
        return False
    try:
        contact_id = await _get_systeme_contact_id(email)
        if not contact_id:
            logger.warning(f"[SYSTEME] Contatto non trovato per {email}")
            return False

        tag_id = await _get_or_create_systeme_tag(tag_name)
        if not tag_id:
            logger.warning(f"[SYSTEME] Tag '{tag_name}' non trovato/creato")
            return False

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{SYSTEME_BASE_URL}/contacts/{contact_id}/tags",
                json={"tagId": int(tag_id)},
                headers={"X-API-Key": SYSTEME_API_KEY, "Content-Type": "application/json"}
            )
            if resp.status_code in (200, 201, 204):
                logger.info(f"[SYSTEME] Tag '{tag_name}' (id:{tag_id}) aggiunto a {email}")
                return True
            logger.warning(f"[SYSTEME] Errore tag {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"[SYSTEME] Errore aggiunta tag per {email}: {e}")
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# FUNZIONE HELPER — Recupera dati partner
# ═══════════════════════════════════════════════════════════════════════════════

async def _get_partner_data(partner_id: str) -> dict:
    """Recupera i dati del partner necessari per le notifiche"""
    database = _get_db()
    if database is None:
        logger.warning("[NOTIFICA] DB non disponibile")
        return {}
    query = {"id": partner_id}
    if partner_id.isdigit():
        query = {"$or": [{"id": partner_id}, {"id": int(partner_id)}]}
    
    partner = await database.partners.find_one(query, {"_id": 0})
    if not partner:
        return {}
    return {
        "nome": partner.get("nome") or partner.get("name", "Partner").split(" ")[0],
        "email": partner.get("email"),
        "telegram_chat_id": partner.get("telegram_chat_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# EVENTI NOTIFICA
# ═══════════════════════════════════════════════════════════════════════════════

async def notify_step_pronto(partner_id: str, step_id: str):
    """Notifica il partner che uno step è pronto per l'approvazione"""
    if await _already_notified(partner_id, "step_pronto", step_id):
        logger.info(f"[NOTIFICA] Già notificato step_pronto {step_id} per {partner_id}")
        return

    partner = await _get_partner_data(partner_id)
    if not partner:
        logger.warning(f"[NOTIFICA] Partner {partner_id} non trovato")
        return

    nome = partner["nome"]
    step_label = STEP_LABELS.get(step_id, step_id)
    channels = []

    # TELEGRAM — Messaggio breve con link diretto
    if partner.get("telegram_chat_id"):
        msg = (
            f"<b>{nome}, il tuo {step_label} e pronto.</b>\n\n"
            f"Il team ha completato questo step per te.\n"
            f"Accedi alla dashboard per rivederlo e approvarlo.\n\n"
            f"{APP_URL}/dashboard"
        )
        sent = await _send_telegram(partner["telegram_chat_id"], msg)
        if sent:
            channels.append("telegram")

    # SYSTEME.IO — Tag per triggerare email automatica
    if partner.get("email"):
        tag = f"step_{step_id.replace('-', '_')}_pronto"
        sent = await _add_systeme_tag(partner["email"], tag)
        if sent:
            channels.append("systeme_email")

    await _log_notification(partner_id, "step_pronto", step_id, channels)
    logger.info(f"[NOTIFICA] step_pronto '{step_id}' → partner {partner_id} via {channels}")


async def notify_azione_richiesta(partner_id: str, step_id: str, azione: str = None):
    """Notifica il partner che è richiesta un'azione da parte sua"""
    if await _already_notified(partner_id, "azione_richiesta", step_id):
        return

    partner = await _get_partner_data(partner_id)
    if not partner:
        return

    nome = partner["nome"]
    step_label = STEP_LABELS.get(step_id, step_id)
    azione_text = azione or f"completare il {step_label}"
    channels = []

    # TELEGRAM
    if partner.get("telegram_chat_id"):
        msg = (
            f"<b>{nome}, serve una tua azione.</b>\n\n"
            f"Per proseguire con il {step_label}, ti chiediamo di: {azione_text}.\n\n"
            f"Accedi ora: {APP_URL}/dashboard"
        )
        sent = await _send_telegram(partner["telegram_chat_id"], msg)
        if sent:
            channels.append("telegram")

    # SYSTEME.IO
    if partner.get("email"):
        tag = f"azione_{step_id.replace('-', '_')}_richiesta"
        sent = await _add_systeme_tag(partner["email"], tag)
        if sent:
            channels.append("systeme_email")

    await _log_notification(partner_id, "azione_richiesta", step_id, channels)
    logger.info(f"[NOTIFICA] azione_richiesta '{step_id}' → partner {partner_id} via {channels}")


async def notify_sistema_attivo(partner_id: str, messaggio: str = None):
    """Notifica il partner che il sistema è attivo e funzionante"""
    if await _already_notified(partner_id, "sistema_attivo", "global"):
        return

    partner = await _get_partner_data(partner_id)
    if not partner:
        return

    nome = partner["nome"]
    channels = []
    msg_custom = messaggio or "Il tuo sistema Evolution PRO e attivo e operativo."

    # TELEGRAM
    if partner.get("telegram_chat_id"):
        msg = (
            f"<b>{nome}, il tuo sistema e attivo.</b>\n\n"
            f"{msg_custom}\n\n"
            f"Dashboard: {APP_URL}/dashboard"
        )
        sent = await _send_telegram(partner["telegram_chat_id"], msg)
        if sent:
            channels.append("telegram")

    # SYSTEME.IO
    if partner.get("email"):
        sent = await _add_systeme_tag(partner["email"], "sistema_attivo")
        if sent:
            channels.append("systeme_email")

    await _log_notification(partner_id, "sistema_attivo", "global", channels)
    logger.info(f"[NOTIFICA] sistema_attivo → partner {partner_id} via {channels}")


async def notify_step_in_lavorazione(partner_id: str, step_id: str):
    """Notifica il partner che il team ha iniziato a lavorare su uno step"""
    if await _already_notified(partner_id, "step_in_lavorazione", step_id):
        return

    partner = await _get_partner_data(partner_id)
    if not partner:
        return

    nome = partner["nome"]
    step_label = STEP_LABELS.get(step_id, step_id)
    sla = STEP_SLA.get(step_id, "48h")
    channels = []

    # TELEGRAM
    if partner.get("telegram_chat_id"):
        msg = (
            f"<b>{nome}, stiamo lavorando al tuo {step_label}.</b>\n\n"
            f"Il team ha preso in carico questo step.\n"
            f"Sara pronto entro {sla}.\n\n"
            f"Non devi fare nulla: ti avviseremo quando sara pronto."
        )
        sent = await _send_telegram(partner["telegram_chat_id"], msg)
        if sent:
            channels.append("telegram")

    # SYSTEME.IO
    if partner.get("email"):
        tag = f"step_{step_id.replace('-', '_')}_in_lavorazione"
        sent = await _add_systeme_tag(partner["email"], tag)
        if sent:
            channels.append("systeme_email")

    await _log_notification(partner_id, "step_in_lavorazione", step_id, channels)
    logger.info(f"[NOTIFICA] step_in_lavorazione '{step_id}' → partner {partner_id} via {channels}")
