"""
Ciak — Iscrizioni dei funnel in bozza → CRM Systeme.io del partner.

Il funnel in bozza (sito statico su Vercel) salva l'iscritto su Ciak (`partner_leads`).
Questo modulo lo riflette anche nel Systeme DEL PARTNER: crea il contatto e applica un tag,
cosi' le email automatiche e il CRM del partner partono da li'.

Perche' non riusare `services/ciak_systeme.py`: quello parla sempre con l'account Evolution PRO
(chiave unica `SYSTEME_API_KEY`). Qui la chiave e' DEL PARTNER, ognuno ha il suo account.

Chiave API: variabile d'ambiente `SYSTEME_API_KEY_PARTNER_<id>` (es. `SYSTEME_API_KEY_PARTNER_23`).
Mai nel database, mai nei log, mai in chat. Senza chiave la sincronizzazione e' spenta e
l'iscrizione resta solo su Ciak. Un errore Systeme non deve mai far fallire l'iscrizione:
il chiamante tiene l'esito e lo riprova alla prossima iscrizione della stessa email.

Limiti noti (dichiarati): il telefono non e' inviato (lo slug del campo telefono non e' stato
verificato); un'iscrizione che arriva mentre Systeme e' giu' resta non sincronizzata fino a una
nuova iscrizione della stessa email o a un'esportazione CSV.
"""
import logging
import os
import re
from typing import Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

SYSTEME_BASE_URL = "https://api.systeme.io/api"
DEFAULT_TAG = "iscritto_masterclass"
_TAG_RE = re.compile(r"[^a-z0-9_]+")
_ID_RE = re.compile(r"[^A-Za-z0-9]")


def api_key_for(partner_id: str) -> str:
    """Chiave Systeme del partner dall'ambiente, o stringa vuota se non configurata."""
    pid = _ID_RE.sub("", str(partner_id))
    if not pid:
        return ""
    return os.environ.get(f"SYSTEME_API_KEY_PARTNER_{pid}", "").strip()


def clean_tag(value: Optional[str]) -> str:
    """Nome tag sicuro (minuscolo, solo a-z 0-9 _), massimo 40 caratteri."""
    tag = _TAG_RE.sub("_", str(value or "").strip().lower()).strip("_")[:40]
    return tag or DEFAULT_TAG


def split_name(full_name: str) -> Tuple[str, str]:
    parts = (full_name or "").split()
    if not parts:
        return "", ""
    return parts[0], " ".join(parts[1:])


async def _find_contact_id(client: httpx.AsyncClient, headers: dict, email: str) -> Optional[int]:
    r = await client.get(f"{SYSTEME_BASE_URL}/contacts", params={"email": email}, headers=headers)
    if r.status_code == 200:
        for item in r.json().get("items", []):
            if str(item.get("email", "")).lower() == email:
                return int(item["id"])
    return None


async def _tag_id(client: httpx.AsyncClient, headers: dict, tag: str) -> Optional[int]:
    """Cerca il tag per nome (ricerca lato server: la lista e' paginata); se manca lo crea."""
    async def find() -> Optional[int]:
        r = await client.get(f"{SYSTEME_BASE_URL}/tags", params={"query": tag, "limit": 100}, headers=headers)
        if r.status_code == 200:
            for item in r.json().get("items", []):
                if str(item.get("name", "")).lower() == tag:
                    return int(item["id"])
        return None

    found = await find()
    if found:
        return found
    r = await client.post(f"{SYSTEME_BASE_URL}/tags", json={"name": tag}, headers=headers)
    if r.status_code in (200, 201):
        return int(r.json()["id"])
    if r.status_code == 422:  # esiste gia' ma la ricerca non l'ha visto: ritenta
        return await find()
    return None


async def sync_contact(
    api_key: str,
    email: str,
    full_name: str,
    tag: str,
    client: Optional[httpx.AsyncClient] = None,
) -> dict:
    """Crea (o trova) il contatto nel Systeme del partner e gli applica il tag.

    Ritorna {"ok": bool, "contact_id": int|None, "reason": str}. Non solleva mai: l'esito
    serve al chiamante per registrare cosa e' successo. Ne' la chiave ne' l'email finiscono nei log.
    """
    email = (email or "").strip().lower()
    if not api_key or not email:
        return {"ok": False, "contact_id": None, "reason": "no_key_or_email"}
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    tag = clean_tag(tag)
    own = client is None
    client = client or httpx.AsyncClient(timeout=15)
    try:
        contact_id = await _find_contact_id(client, headers, email)
        if contact_id is None:
            first, last = split_name(full_name)
            fields = [{"slug": "first_name", "value": first}] if first else []
            if last:
                fields.append({"slug": "surname", "value": last})
            r = await client.post(f"{SYSTEME_BASE_URL}/contacts", json={"email": email, "fields": fields}, headers=headers)
            if r.status_code not in (200, 201):
                logger.warning("[PARTNER-SYSTEME] creazione contatto fallita: HTTP %s", r.status_code)
                return {"ok": False, "contact_id": None, "reason": f"create_contact_{r.status_code}"}
            contact_id = int(r.json()["id"])
        tag_id = await _tag_id(client, headers, tag)
        if tag_id is None:
            logger.warning("[PARTNER-SYSTEME] tag '%s' non trovato ne' creato", tag)
            return {"ok": False, "contact_id": contact_id, "reason": "tag_unavailable"}
        r = await client.post(f"{SYSTEME_BASE_URL}/contacts/{contact_id}/tags", json={"tagId": tag_id}, headers=headers)
        if r.status_code not in (200, 201, 204):
            logger.warning("[PARTNER-SYSTEME] applicazione tag fallita: HTTP %s", r.status_code)
            return {"ok": False, "contact_id": contact_id, "reason": f"apply_tag_{r.status_code}"}
        return {"ok": True, "contact_id": contact_id, "reason": "ok"}
    except Exception as e:  # noqa: BLE001  non deve mai propagarsi all'iscrizione
        logger.warning("[PARTNER-SYSTEME] errore di rete: %s", type(e).__name__)
        return {"ok": False, "contact_id": None, "reason": "network_error"}
    finally:
        if own:
            await client.aclose()
