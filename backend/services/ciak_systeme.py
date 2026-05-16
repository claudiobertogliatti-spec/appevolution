"""
Ciak — Systeme.io tag emission per eventi state machine.

Wrapper unico che fa due cose in sequenza:
  1. `ciak_ensure_contact(email)` — find_or_create contact su Systeme.io
  2. `ciak_emit_event(email, event_name, **fields)` — applica uno o più tag

L'infrastruttura Systeme è già esistente (vedi services/notifications.py per
`_add_systeme_tag` e routers/systeme_contacts.py per `find_or_create_contact`).
Qui consolido tutto in un helper Ciak-specifico, async, non-bloccante, con
logging strutturato e degradazione graceful (errori loggati ma non bloccano
il flow utente — un tag mancato non rompe l'esperienza lead).

Tag emessi (spec ciak_technical_spec.md §4):
  ciak_started              alla creazione diagnostic session
  ciak_completed            alla fine delle 8 domande
  stato_1 | stato_2 | stato_3 | stato_4  → da scoring
  segment_<x>               da Q1 (classificato da Matteo)
  digital_level_<x>         da Q7 (diretto)
  obiettivo_<x>             da Q8 (opzionale)
  ciak_clicked_67           click CTA Analisi €67
  ciak_bought_67            pagamento Stripe €67 confermato
  ciak_call_booked          call Cal.com prenotata
  ciak_call_done            call effettuata
  ciak_partner_approved     idoneo per partnership
  ciak_partner_active       partnership attiva

Tag additivi: un lead accumula tutti i tag del suo percorso. Ogni tag ha un
timestamp sul lato Systeme. Per audit interno conserviamo anche un log su
MongoDB collection `ciak_systeme_events`.
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

SYSTEME_API_KEY = os.environ.get("SYSTEME_API_KEY", "")
SYSTEME_BASE_URL = "https://api.systeme.io/api"

# Iniettato da server.py via set_db()
_db = None


def set_db(database) -> None:
    global _db
    _db = database


def _headers() -> dict:
    return {"X-API-Key": SYSTEME_API_KEY, "Content-Type": "application/json"}


async def ciak_ensure_contact(
    email: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
) -> Optional[int]:
    """find_or_create contact su Systeme.io. Ritorna contact_id (int) o None.
    Idempotente: se il contatto esiste lo trova; se no lo crea con i fields forniti.
    """
    if not SYSTEME_API_KEY or not email:
        return None
    email = email.strip().lower()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # 1. Cerca per email
            r = await client.get(
                f"{SYSTEME_BASE_URL}/contacts",
                params={"email": email},
                headers=_headers(),
            )
            if r.status_code == 200:
                items = r.json().get("items", [])
                for item in items:
                    if item.get("email", "").lower() == email:
                        return int(item.get("id"))
            # 2. Crea
            payload = {"email": email, "fields": []}
            if first_name:
                payload["fields"].append({"slug": "first_name", "value": first_name})
            if last_name:
                payload["fields"].append({"slug": "surname", "value": last_name})
            r = await client.post(f"{SYSTEME_BASE_URL}/contacts", headers=_headers(), json=payload)
            if r.status_code in (200, 201):
                return int(r.json().get("id"))
            logger.warning(f"[CIAK-SYSTEME] create contact {email} failed: {r.status_code} {r.text[:200]}")
    except Exception as e:
        logger.warning(f"[CIAK-SYSTEME] ensure_contact error for {email}: {e}")
    return None


async def _get_or_create_tag_id(client: httpx.AsyncClient, tag_name: str) -> Optional[int]:
    """Find tag_id su Systeme; se non esiste, lo crea. Tag normalizzato lowercase."""
    tag_name = tag_name.strip().lower()
    try:
        r = await client.get(f"{SYSTEME_BASE_URL}/tags", headers=_headers())
        if r.status_code == 200:
            for tag in r.json().get("items", []):
                if tag.get("name", "").lower() == tag_name:
                    return int(tag.get("id"))
        r = await client.post(
            f"{SYSTEME_BASE_URL}/tags",
            headers=_headers(),
            json={"name": tag_name},
        )
        if r.status_code in (200, 201):
            return int(r.json().get("id"))
        logger.warning(f"[CIAK-SYSTEME] create tag '{tag_name}' failed: {r.status_code}")
    except Exception as e:
        logger.warning(f"[CIAK-SYSTEME] tag '{tag_name}' resolve error: {e}")
    return None


async def _apply_tag(client: httpx.AsyncClient, contact_id: int, tag_id: int) -> bool:
    try:
        r = await client.post(
            f"{SYSTEME_BASE_URL}/contacts/{contact_id}/tags",
            headers=_headers(),
            json={"tagId": tag_id},
        )
        return r.status_code in (200, 201, 204)
    except Exception as e:
        logger.warning(f"[CIAK-SYSTEME] apply_tag {tag_id} to {contact_id} error: {e}")
        return False


async def ciak_emit_event(
    email: str,
    event_name: str,
    extra_tags: Optional[list] = None,
    first_name: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> bool:
    """Applica `event_name` + `extra_tags` al contatto Systeme corrispondente a `email`.

    Crea il contatto se non esiste. Garantisce che `event_name` (es. "ciak_started")
    sia sempre applicato; `extra_tags` è una lista opzionale (es. ["stato_3", "segment_coach"]).
    Logga l'evento in `ciak_systeme_events` con timestamp per audit/debug.

    Ritorna True se almeno un tag è stato applicato con successo.
    """
    if not SYSTEME_API_KEY or not email:
        logger.info(f"[CIAK-SYSTEME] skip emit '{event_name}' for {email} — no API key or email")
        return False

    contact_id = await ciak_ensure_contact(email, first_name=first_name)
    if not contact_id:
        logger.warning(f"[CIAK-SYSTEME] cannot ensure contact for {email} — skip emit '{event_name}'")
        return False

    tags_to_apply = [event_name] + (extra_tags or [])
    applied = []
    failed = []

    async with httpx.AsyncClient(timeout=15) as client:
        for tag_name in tags_to_apply:
            tag_id = await _get_or_create_tag_id(client, tag_name)
            if not tag_id:
                failed.append(tag_name)
                continue
            ok = await _apply_tag(client, contact_id, tag_id)
            if ok:
                applied.append(tag_name)
            else:
                failed.append(tag_name)

    # Audit log su Mongo (best-effort)
    if _db is not None:
        try:
            await _db.ciak_systeme_events.insert_one({
                "email": email.lower(),
                "contact_id": contact_id,
                "event_name": event_name,
                "applied_tags": applied,
                "failed_tags": failed,
                "metadata": metadata or {},
                "at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning(f"[CIAK-SYSTEME] audit log failed: {e}")

    if applied:
        logger.info(f"[CIAK-SYSTEME] {email} ← {applied}{f' (failed: {failed})' if failed else ''}")
        return True
    logger.warning(f"[CIAK-SYSTEME] {email} event '{event_name}' — ALL tags failed: {failed}")
    return False


async def ciak_set_contact_fields(
    email: str,
    fields: dict,
    first_name: Optional[str] = None,
) -> bool:
    """Scrive uno o più custom field sul contatto Systeme.

    `fields` è un dict {slug: value}. Esempio:
        await ciak_set_contact_fields(email, {"partner_setup_url": "https://..."})

    Crea il contatto se non esiste. Usato per propagare dati dinamici al
    template delle email Systeme (es. magic link non template-friendly).

    NOTA: il custom field con quel slug deve esistere lato Systeme dashboard
    (Contacts → Custom fields → Add). Se non esiste, Systeme ignora il valore
    silenziosamente (no errore HTTP).

    Ritorna True se la PATCH ha risposto 200/204.
    """
    if not SYSTEME_API_KEY or not email or not fields:
        return False

    contact_id = await ciak_ensure_contact(email, first_name=first_name)
    if not contact_id:
        return False

    payload = {
        "fields": [{"slug": slug, "value": value} for slug, value in fields.items()],
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.patch(
                f"{SYSTEME_BASE_URL}/contacts/{contact_id}",
                headers={**_headers(), "Content-Type": "application/merge-patch+json"},
                json=payload,
            )
        if r.status_code in (200, 204):
            logger.info(f"[CIAK-SYSTEME] {email} fields updated: {list(fields.keys())}")
            return True
        logger.warning(f"[CIAK-SYSTEME] {email} PATCH fields failed: {r.status_code} {r.text[:200]}")
        return False
    except Exception as e:
        logger.warning(f"[CIAK-SYSTEME] {email} PATCH fields error: {e}")
        return False
