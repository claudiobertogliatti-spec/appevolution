"""
Evolution Insider — inviti alla community per chi non ha acquistato.

Ogni giorno individua chi ha gia' interagito con noi e non ha comprato, e applica su
Systeme il tag `insider_invito`: da li' parte il workflow d'invito (creato su Systeme).
Una sola volta per persona (`insider_invites`, email unica). Spento finche'
INSIDER_INVITES_ENABLED != "1": spento, conta soltanto i candidati ("conta a secco").
Disegno: docs/superpowers/specs/2026-10-01-evolution-insider-community-design.md
"""
import logging
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

PATH_PROPOSTA = "proposta_scaduta"
PATH_BLUEPRINT = "blueprint_senza_acquisto"
PATH_QUESTIONARIO = "questionario_senza_call"

BLUEPRINT_WAIT_DAYS = 7
QUESTIONARIO_WAIT_DAYS = 14
MAX_ATTEMPTS = 3
DEFAULT_MAX_PER_RUN = 25
EVENT_TAG = "insider_invito"
FLAG_ENV = "INSIDER_INVITES_ENABLED"
MAX_PER_RUN_ENV = "INSIDER_INVITES_MAX_PER_RUN"

PAID_PROPOSTA_STATES = {"pagamento_completato", "contratto_firmato"}
BOUGHT_ACCESS_LEVELS = {"cliente_start", "partner"}
CANDIDATE_STATES = ("report_generated", "call_done")


def parse_iso(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def norm_email(value) -> str:
    """Minuscolo e senza spazi; stringa vuota se non e' un indirizzo plausibile."""
    email = str(value or "").strip().lower()
    return email if "@" in email and " " not in email else ""


def state_time(session: dict, state: str) -> Optional[datetime]:
    """Ultimo timestamp di `state_history` per lo stato dato."""
    found = None
    for entry in session.get("state_history") or []:
        if isinstance(entry, dict) and entry.get("state") == state:
            ts = parse_iso(entry.get("timestamp"))
            if ts and (found is None or ts > found):
                found = ts
    return found


def has_bought(client: Optional[dict], proposta: Optional[dict]) -> bool:
    c = client or {}
    if c.get("start_purchased_at") or c.get("partnership_attiva") is True:
        return True
    if c.get("access_level") in BOUGHT_ACCESS_LEVELS:
        return True
    return bool(proposta and proposta.get("stato") in PAID_PROPOSTA_STATES)


def reference(session: dict, proposta: Optional[dict], blueprint: Optional[dict]) -> Optional[tuple]:
    """(percorso, data di riferimento) oppure None se la persona non e' candidabile."""
    state = session.get("current_state")
    if state == "call_done":
        if proposta:
            scadenza = parse_iso(proposta.get("scadenza"))
            if scadenza:
                return PATH_PROPOSTA, scadenza
        base = parse_iso((blueprint or {}).get("consegna_inviata_at")) or state_time(session, "call_done")
        if not base:
            return None
        return PATH_BLUEPRINT, base + timedelta(days=BLUEPRINT_WAIT_DAYS)
    if state == "report_generated":
        reached = state_time(session, "report_generated")
        if not reached:
            return None
        return PATH_QUESTIONARIO, reached + timedelta(days=QUESTIONARIO_WAIT_DAYS)
    return None
