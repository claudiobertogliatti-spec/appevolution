"""
Notifiche Systeme.io per Evolution PRO
Usa il tagging dei contatti per triggerare automazioni email
configurate nella dashboard Systeme.io.

Tag da creare su Systeme.io:
- doc_rifiutato       → Automazione: Email "Documento rifiutato - ricarica"
- docs_in_verifica    → Automazione: Email "Documenti ricevuti"
- docs_verificati     → Automazione: Email "Benvenuto nella partnership"
- contratto_firmato   → Automazione: Email "Conferma firma contratto"
"""

import httpx
import os
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

SYSTEME_API_KEY = os.environ.get('SYSTEME_API_KEY', '')
SYSTEME_BASE_URL = "https://api.systeme.io/api"

# Tag IDs su Systeme.io — l'admin deve creare questi tag e inserire gli ID
# Configurabili via env vars per flessibilità
TAG_IDS = {
    "doc_rifiutato": int(os.environ.get("SYSTEME_TAG_DOC_RIFIUTATO", "0")),
    "docs_in_verifica": int(os.environ.get("SYSTEME_TAG_DOCS_IN_VERIFICA", "0")),
    "docs_verificati": int(os.environ.get("SYSTEME_TAG_DOCS_VERIFICATI", "0")),
    "contratto_firmato": int(os.environ.get("SYSTEME_TAG_CONTRATTO_FIRMATO", "0")),
}

# MongoDB
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]


def _headers():
    return {"X-API-Key": SYSTEME_API_KEY, "Content-Type": "application/json"}


async def _find_contact_by_email(email: str) -> int | None:
    """Trova il contact_id su Systeme.io cercando per email."""
    if not SYSTEME_API_KEY:
        return None
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{SYSTEME_BASE_URL}/contacts",
                params={"email": email.strip().lower()},
                headers=_headers(),
                timeout=15
            )
            if res.status_code == 200:
                for item in res.json().get("items", []):
                    if item.get("email", "").lower() == email.strip().lower():
                        return item.get("id")
    except Exception as e:
        logger.warning(f"[NOTIFY] Errore ricerca contatto Systeme.io: {e}")
    return None


async def _add_tag(contact_id: int, tag_id: int) -> bool:
    """Assegna un tag a un contatto Systeme.io."""
    if not tag_id or not contact_id or not SYSTEME_API_KEY:
        return False
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{SYSTEME_BASE_URL}/contacts/{contact_id}/tags",
                headers=_headers(),
                json={"tagId": tag_id},
                timeout=10
            )
            if res.status_code in [200, 201, 204, 422]:
                logger.info(f"[NOTIFY] Tag {tag_id} assegnato a contatto {contact_id}")
                return True
            logger.warning(f"[NOTIFY] Errore tag: {res.status_code} - {res.text[:200]}")
    except Exception as e:
        logger.warning(f"[NOTIFY] Errore assegnazione tag: {e}")
    return False


async def _log_notification(partner_id: str, event: str, details: dict):
    """Salva log notifica su MongoDB."""
    try:
        await _db.notifications_log.insert_one({
            "partner_id": partner_id,
            "event": event,
            "details": details,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "_id": None  # Let MongoDB generate
        })
    except Exception:
        pass  # Non bloccare il flusso per un log


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

async def notify_document_rejected(partner_id: str, doc_type: str, doc_label: str, note: str):
    """
    Notifica al partner che un documento è stato rifiutato.
    Assegna tag 'doc_rifiutato' su Systeme.io → trigga automazione email.
    """
    partner = await _db.partners.find_one({"id": partner_id}, {"_id": 0, "email": 1, "name": 1})
    if not partner or not partner.get("email"):
        logger.info(f"[NOTIFY] Skip doc_rifiutato: partner {partner_id} senza email")
        return

    email = partner["email"]
    contact_id = await _find_contact_by_email(email)
    
    tag_id = TAG_IDS.get("doc_rifiutato")
    tagged = False
    if contact_id and tag_id:
        tagged = await _add_tag(contact_id, tag_id)
    
    await _log_notification(partner_id, "doc_rifiutato", {
        "email": email,
        "doc_type": doc_type,
        "doc_label": doc_label,
        "note": note,
        "systeme_contact_id": contact_id,
        "tag_applied": tagged
    })
    
    logger.info(f"[NOTIFY] doc_rifiutato → {email} (tag={'OK' if tagged else 'SKIP/FAIL'})")


async def notify_documents_submitted(partner_id: str):
    """
    Notifica che i documenti sono stati inviati per verifica.
    Assegna tag 'docs_in_verifica' su Systeme.io.
    """
    partner = await _db.partners.find_one({"id": partner_id}, {"_id": 0, "email": 1, "name": 1})
    if not partner or not partner.get("email"):
        return

    email = partner["email"]
    contact_id = await _find_contact_by_email(email)
    
    tag_id = TAG_IDS.get("docs_in_verifica")
    tagged = False
    if contact_id and tag_id:
        tagged = await _add_tag(contact_id, tag_id)
    
    await _log_notification(partner_id, "docs_in_verifica", {
        "email": email,
        "systeme_contact_id": contact_id,
        "tag_applied": tagged
    })
    
    logger.info(f"[NOTIFY] docs_in_verifica → {email}")


async def notify_documents_verified(partner_id: str):
    """
    Notifica che tutti i documenti sono stati verificati.
    Assegna tag 'docs_verificati' su Systeme.io.
    """
    partner = await _db.partners.find_one({"id": partner_id}, {"_id": 0, "email": 1, "name": 1})
    if not partner or not partner.get("email"):
        return

    email = partner["email"]
    contact_id = await _find_contact_by_email(email)
    
    tag_id = TAG_IDS.get("docs_verificati")
    tagged = False
    if contact_id and tag_id:
        tagged = await _add_tag(contact_id, tag_id)
    
    await _log_notification(partner_id, "docs_verificati", {
        "email": email,
        "systeme_contact_id": contact_id,
        "tag_applied": tagged
    })
    
    logger.info(f"[NOTIFY] docs_verificati → {email}")


async def notify_contract_signed(partner_id: str):
    """
    Notifica che il contratto è stato firmato.
    Assegna tag 'contratto_firmato' su Systeme.io.
    """
    partner = await _db.partners.find_one({"id": partner_id}, {"_id": 0, "email": 1, "name": 1})
    if not partner or not partner.get("email"):
        return

    email = partner["email"]
    contact_id = await _find_contact_by_email(email)
    
    tag_id = TAG_IDS.get("contratto_firmato")
    tagged = False
    if contact_id and tag_id:
        tagged = await _add_tag(contact_id, tag_id)
    
    await _log_notification(partner_id, "contratto_firmato", {
        "email": email,
        "systeme_contact_id": contact_id,
        "tag_applied": tagged
    })
    
    logger.info(f"[NOTIFY] contratto_firmato → {email}")
