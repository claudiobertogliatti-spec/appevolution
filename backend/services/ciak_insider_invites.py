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


_RANK = {"report_generated": 0, "call_done": 1}


def _most_advanced_per_email(sessions: list) -> dict:
    """Una sessione per email (minuscola): lo stato piu' avanzato, a parita' la piu' recente."""
    best: dict = {}
    for s in sessions:
        email = norm_email(s.get("user_email"))
        if not email:
            continue
        key = (_RANK.get(s.get("current_state"), -1), str(s.get("created_at") or ""))
        if email not in best or key > best[email][0]:
            best[email] = (key, s)
    return {email: pair[1] for email, pair in best.items()}


def _pick_proposta(items: list) -> Optional[dict]:
    """Se una proposta risulta pagata/firmata vince; altrimenti la piu' recente."""
    if not items:
        return None
    for p in items:
        if p.get("stato") in PAID_PROPOSTA_STATES:
            return p
    return sorted(items, key=lambda p: str(p.get("creato_at") or ""))[-1]


async def trova_candidati(db, now: Optional[datetime] = None) -> list:
    now = now or datetime.now(timezone.utc)
    sessions = await db.diagnostic_sessions.find({"current_state": {"$in": list(CANDIDATE_STATES)}}).to_list(5000)
    chosen = _most_advanced_per_email(sessions)
    if not chosen:
        return []

    tokens = [s.get("session_token") for s in chosen.values() if s.get("session_token")]

    # Clienti e proposte si leggono per intero (poche centinaia di documenti, con proiezione) e
    # si confrontano in Python con l'email normalizzata: un filtro `$in` non coprirebbe ogni
    # combinazione di maiuscole e un acquirente potrebbe ricevere l'invito per errore.
    clients: dict = {}
    for c in await db.ciak_clients.find(
        {}, {"_id": 0, "email": 1, "start_purchased_at": 1, "access_level": 1, "partnership_attiva": 1}
    ).to_list(20000):
        email = norm_email(c.get("email"))
        if email:
            clients[email] = c
    proposte_by: dict = {}
    for p in await db.proposte.find(
        {}, {"_id": 0, "prospect_email": 1, "scadenza": 1, "stato": 1, "creato_at": 1}
    ).to_list(20000):
        email = norm_email(p.get("prospect_email"))
        if email:
            proposte_by.setdefault(email, []).append(p)
    blueprints = {b.get("session_token"): b for b in await db.ciak_blueprints.find({"session_token": {"$in": tokens}}).to_list(5000)}
    invited = {norm_email(i.get("email")) for i in await db.insider_invites.find({"email": {"$in": list(chosen)}}).to_list(5000)}

    out = []
    for email, s in chosen.items():
        if email in invited:
            continue
        proposta = _pick_proposta(proposte_by.get(email, []))
        if has_bought(clients.get(email), proposta):
            continue
        ref = reference(s, proposta, blueprints.get(s.get("session_token")))
        if not ref:
            continue
        path, when = ref
        if when > now:
            continue
        out.append({
            "email": email,
            "nome": s.get("user_name"),
            "path": path,
            "riferimento": when.isoformat(),
            "session_token": s.get("session_token"),
        })
    out.sort(key=lambda c: c["riferimento"])
    return out


def _mask(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}"


def _max_per_run(explicit: Optional[int]) -> int:
    if explicit:
        return int(explicit)
    try:
        value = int(os.environ.get(MAX_PER_RUN_ENV, DEFAULT_MAX_PER_RUN))
    except ValueError:
        value = DEFAULT_MAX_PER_RUN
    return max(1, value)


async def _default_emit(email, event_name, first_name=None, metadata=None, extra_tags=None) -> bool:
    from services.ciak_systeme import ciak_emit_event
    return await ciak_emit_event(email, event_name, extra_tags=extra_tags, first_name=first_name, metadata=metadata)


async def _emit_safe(emit, email, nome, metadata) -> bool:
    try:
        return bool(await emit(email, EVENT_TAG, first_name=nome, metadata=metadata))
    except Exception as exc:  # noqa: BLE001 - un contatto che fallisce non ferma il giro
        logger.warning("[INSIDER] invito fallito per %s: %s", _mask(email), exc)
        return False


async def invita_insider(db, emit=None, now: Optional[datetime] = None,
                         dry_run: Optional[bool] = None, max_per_run: Optional[int] = None) -> dict:
    """Individua i candidati e, solo con il flag acceso, applica il tag d'invito su Systeme."""
    if db is None:
        return {"error": "no_db", "dry_run": True, "candidati": 0, "inviati": 0, "errori": 0, "riprovati": 0}
    now = now or datetime.now(timezone.utc)
    enabled = os.environ.get(FLAG_ENV) == "1"
    dry = (not enabled) if dry_run is None else bool(dry_run)
    motivo = None
    if not enabled and dry_run is False:
        dry, motivo = True, "flag_spento"  # non si invia mai a flag spento, nemmeno se richiesto

    try:
        candidati = await trova_candidati(db, now)
    except Exception as exc:  # noqa: BLE001
        logger.error("[INSIDER] lettura candidati fallita: %s", exc)
        return {"error": str(exc), "dry_run": dry, "candidati": 0, "inviati": 0, "errori": 0, "riprovati": 0}

    result = {
        "dry_run": dry,
        "candidati": len(candidati),
        "per_path": dict(Counter(c["path"] for c in candidati)),
        "esempi": [_mask(c["email"]) for c in candidati[:5]],
        "inviati": 0, "riprovati": 0, "errori": 0,
    }
    if motivo:
        result["motivo"] = motivo
    if dry:
        return result

    emit = emit or _default_emit
    try:
        await db.insider_invites.create_index("email", unique=True)
    except Exception as exc:  # noqa: BLE001
        logger.warning("[INSIDER] indice non creato: %s", exc)

    budget = _max_per_run(max_per_run)

    # 1. riprova chi era fallito (al massimo MAX_ATTEMPTS volte in tutto)
    failed = await db.insider_invites.find({"status": "failed", "attempts": {"$lt": MAX_ATTEMPTS}}).to_list(100)
    for doc in failed:
        if budget <= 0:
            break
        ok = await _emit_safe(emit, doc["email"], doc.get("nome"), {"path": doc.get("path"), "riprova": True})
        await db.insider_invites.update_one(
            {"email": doc["email"]},
            {"$set": {"status": "applied" if ok else "failed", "attempts": int(doc.get("attempts", 0)) + 1,
                      **({"applied_at": now.isoformat()} if ok else {})}},
        )
        result["riprovati"] += 1
        result["errori"] += 0 if ok else 1
        budget -= 1

    # 2. nuovi inviti: prima si registra (email unica), poi si applica il tag
    from pymongo.errors import DuplicateKeyError

    for c in candidati:
        if budget <= 0:
            break
        try:
            await db.insider_invites.insert_one({
                "email": c["email"], "nome": c["nome"], "path": c["path"], "riferimento": c["riferimento"],
                "status": "pending", "attempts": 0, "created_at": now.isoformat(),
            })
        except DuplicateKeyError:
            continue  # gia' invitato da un altro giro in parallelo
        ok = await _emit_safe(emit, c["email"], c["nome"], {"path": c["path"], "riferimento": c["riferimento"]})
        await db.insider_invites.update_one(
            {"email": c["email"]},
            {"$set": {"status": "applied" if ok else "failed", "attempts": 1,
                      **({"applied_at": now.isoformat()} if ok else {})}},
        )
        result["inviati" if ok else "errori"] += 1
        budget -= 1

    logger.info("[INSIDER] giro: %s", {k: v for k, v in result.items() if k != "esempi"})
    return result
