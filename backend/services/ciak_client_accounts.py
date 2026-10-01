from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4


BLUEPRINT_AMOUNT_CENTS = 2700  # €27: importo STORICO per fatturare chi ha già pagato (il funnel nuovo è gratuito, checkout €27 ritirato)
START_AMOUNT_CENTS = 39000
PARTNERSHIP_AMOUNT_CENTS = 299000
ACCESS_BLUEPRINT = "cliente_blueprint"
ACCESS_START = "cliente_start"
ACCESS_PARTNER = "partner"
OFFER_START = "ciak_start"
OFFER_PARTNERSHIP = "partnership"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def offer_for_score(score: int | float | None) -> str:
    try:
        value = float(score)
    except (TypeError, ValueError):
        value = 0
    return OFFER_START if value < 50 else OFFER_PARTNERSHIP


def has_start_entitlement(client: dict[str, Any]) -> bool:
    stored_credit = client.get("start_credit_amount")
    return bool(
        client.get("access_level") == ACCESS_START
        or client.get("start_purchased_at")
        or (stored_credit not in (None, "", 0, "0"))
    )


def _valore_pieno(valore: Any) -> bool:
    if isinstance(valore, str):
        return bool(valore.strip())
    if isinstance(valore, (list, dict, tuple, set)):
        return any(_valore_pieno(v) for v in (valore.values() if isinstance(valore, dict) else valore))
    return valore is not None and valore is not False


def ha_risposte(sessione: dict[str, Any] | None) -> bool:
    """True se la sessione contiene almeno UNA risposta vera.

    Non basta che `responses` non sia vuoto: la sessione nata riaprendo il
    questionario ha tutte le chiavi presenti ma con valori nulli (caso Anna Maria
    Bernard, 1/10: il Blueprint "questionario arrivato vuoto" e' stato generato e
    inviato su una sessione cosi'). Conta il contenuto, non la forma.
    """
    risposte = (sessione or {}).get("responses")
    return isinstance(risposte, dict) and any(_valore_pieno(v) for v in risposte.values())


def pick_diagnostic_session(sessions: list[dict[str, Any]] | None) -> dict[str, Any] | None:
    """La sessione diagnostica che conta per un lead: la PIU' RECENTE CON RISPOSTE.

    Chi riapre il questionario crea una sessione nuova e vuota: se si prendesse
    ciecamente "l'ultima", Blueprint e stato "call fatta" finirebbero su una
    sessione senza risposte mentre quella compilata resta ferma. `sessions` va
    passata dalla piu' recente alla meno recente; se nessuna ha risposte si torna
    alla piu' recente.
    """
    ordered = [s for s in (sessions or []) if isinstance(s, dict)]
    for item in ordered:
        if ha_risposte(item):
            return item
    return ordered[0] if ordered else None


async def effective_session_token(db, client: dict[str, Any] | None) -> str | None:
    """Il token della sessione da cui leggere Blueprint e analisi di un cliente.

    Di norma e' quello salvato nella scheda. Ma se la scheda punta a una sessione
    SENZA risposte (chi riapre il questionario ne crea una vuota, caso Anna Maria
    Bernard 1/10) mentre il lead ne ha un'altra compilata, si legge da quella:
    altrimenti pagina Insider e area cliente raccontano al cliente che il suo
    questionario "e' arrivato vuoto". Nessuna scrittura: e' solo lettura.
    """
    client = client or {}
    stored = client.get("session_token") or client.get("diagnostic_session_token")
    if stored:
        current = await db.diagnostic_sessions.find_one({"session_token": stored})
        if ha_risposte(current):
            return stored
    email = (client.get("email") or "").strip()
    if not email:
        return stored
    import logging
    import re

    try:
        pattern = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
        docs = (
            await db.diagnostic_sessions.find({"user_email": pattern})
            .sort("created_at", -1)
            .limit(20)
            .to_list(length=20)
        )
    except Exception as exc:  # noqa: BLE001
        # Pagina cliente/Insider: una lettura in piu' non deve mai romperla.
        logging.getLogger(__name__).warning("[CLIENT] sessioni del lead non leggibili: %s", exc)
        return stored
    best = pick_diagnostic_session(docs)
    if best and ha_risposte(best) and best.get("session_token"):
        return best["session_token"]
    return stored


def ruolo_contatto(client: dict[str, Any] | None, partner: dict[str, Any] | None = None) -> dict[str, Any]:
    """Chi e' questa persona per il business: lead, cliente Start pagante o partner.

    Unica fonte per la scheda admin. Un account `cliente_blueprint` (ha solo
    ricevuto il Blueprint gratuito) resta un LEAD: non ha pagato niente.
    Priorita': partner > cliente Start > lead.
    """
    client = client or {}
    if partner or client.get("access_level") == ACCESS_PARTNER:
        return {"tipo": "partner", "label": "Partner", "dettaglio": "Ha firmato la Partnership."}
    if has_start_entitlement(client):
        when = client.get("start_purchased_at")
        return {
            "tipo": "cliente_start",
            "label": "Cliente Ciak Start",
            "dettaglio": "Ha pagato Ciak Start (390 €)." + (f" Attivo dal {str(when)[:10]}." if when else ""),
        }
    return {"tipo": "lead", "label": "Lead", "dettaglio": "Non ha ancora pagato nessuna offerta."}


def partnership_price_for_client(client: dict[str, Any]) -> dict[str, Any]:
    stored_credit = client.get("start_credit_amount")
    if has_start_entitlement(client):
        try:
            credit = max(START_AMOUNT_CENTS, int(stored_credit or 0))
        except (TypeError, ValueError):
            credit = START_AMOUNT_CENTS
    else:
        try:
            credit = int(stored_credit or 0)
        except (TypeError, ValueError):
            credit = 0
    credit = max(0, min(credit, PARTNERSHIP_AMOUNT_CENTS))
    return {
        "full_amount_cents": PARTNERSHIP_AMOUNT_CENTS,
        "credit_amount_cents": credit,
        "due_amount_cents": PARTNERSHIP_AMOUNT_CENTS - credit,
        "currency": "eur",
    }


def _score_from_session(session: dict[str, Any]) -> int:
    scoring = session.get("scoring") or {}
    if scoring.get("score_percentuale") is not None:
        try:
            return max(0, min(100, int(round(float(scoring["score_percentuale"])))))
        except (TypeError, ValueError):
            pass
    for key in ("score_numerico", "score_total"):
        if scoring.get(key) is not None:
            try:
                raw = float(scoring[key])
                return max(0, min(100, int(round(raw / 13 * 100))))
            except (TypeError, ValueError):
                pass
    return 0


def _session_lookup_tokens(session: dict[str, Any]) -> list[str]:
    tokens: list[str] = []
    for key in ("session_token", "diagnostic_session_token", "token"):
        value = (session.get(key) or "").strip()
        if value and value not in tokens:
            tokens.append(value)
    return tokens


async def _load_persisted_session(db, session: dict[str, Any]) -> dict[str, Any]:
    for token in _session_lookup_tokens(session):
        persisted = await db.diagnostic_sessions.find_one({"session_token": token})
        if persisted:
            return persisted
    return {}


def _merge_session_data(session: dict[str, Any], persisted: dict[str, Any]) -> dict[str, Any]:
    merged = dict(session)
    for key, value in persisted.items():
        if value is not None:
            merged[key] = value
    return merged


def _analysis_snapshot(analysis: dict[str, Any] | None) -> dict[str, Any]:
    if not analysis:
        return {}
    definitiva = analysis.get("analisi_definitiva") or {}
    return {
        "analysis_status": analysis.get("stato"),
        "analysis_generated_at": analysis.get("generated_at"),
        "analysis_delivered_at": analysis.get("bozza_inviata_at"),
        "analysis_title": definitiva.get("titolo"),
        "analysis_publicly_available": analysis.get("stato") == "inviata",
        "analysis_session_token": analysis.get("session_token"),
    }


async def ensure_client_for_blueprint(db, session: dict[str, Any]) -> dict[str, Any]:
    persisted = await _load_persisted_session(db, session)
    merged_session = _merge_session_data(session, persisted)
    email = (merged_session.get("user_email") or "").strip().lower()
    if not email:
        raise ValueError("sessione senza email")
    score = _score_from_session(merged_session)
    session_token = (
        merged_session.get("session_token")
        or session.get("session_token")
        or session.get("diagnostic_session_token")
    )
    analysis = await db.ciak_analisi.find_one({"session_token": session_token}) if session_token else None
    existing = await db.ciak_clients.find_one({"email": email})
    base_update = {
        "email": email,
        "name": merged_session.get("user_name"),
        "session_token": session_token,
        "diagnostic_session_token": session_token,
        "blueprint_score": score,
        "recommended_offer": offer_for_score(score),
        "blueprint_amount_cents": BLUEPRINT_AMOUNT_CENTS,
        "diagnostic_completed_at": merged_session.get("completed_at"),
        "diagnostic_current_state": merged_session.get("current_state"),
        "diagnostic_responses": merged_session.get("responses") or {},
        "diagnostic_report": merged_session.get("report"),
        "diagnostic_tracking": merged_session.get("tracking") or {},
        "updated_at": _now_iso(),
        **_analysis_snapshot(analysis),
    }
    if existing:
        await db.ciak_clients.update_one({"id": existing["id"]}, {"$set": base_update})
        updated = await db.ciak_clients.find_one({"id": existing["id"]}, {"_id": 0})
        return updated
    doc = {
        "id": str(uuid4()),
        **base_update,
        "access_level": ACCESS_BLUEPRINT,
        "created_at": _now_iso(),
        "start_credit_amount": 0,
        "events": [{"event": "client_created_from_blueprint", "timestamp": _now_iso()}],
    }
    await db.ciak_clients.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def ensure_client_for_direct_start(
    db,
    *,
    email: str,
    name: str | None = None,
) -> tuple[dict[str, Any], bool]:
    """Account cliente per chi entra da Ciak Start senza passare dal Blueprint.

    Serve ai ko dell'Edizione Settembre: pagano da Payment Link e non hanno una
    diagnostic session, quindi `ensure_client_for_blueprint` non li puo' creare.
    Ritorna (client, created). Non assegna entitlement: lo fa chi la chiama.
    """
    normalized = (email or "").strip().lower()
    if not normalized or "@" not in normalized:
        raise ValueError("email non valida")

    clean_name = (name or "").strip() or None
    existing = await db.ciak_clients.find_one({"email": normalized}, {"_id": 0})
    if existing:
        if clean_name and not existing.get("name"):
            await db.ciak_clients.update_one(
                {"id": existing["id"]},
                {"$set": {"name": clean_name, "updated_at": _now_iso()}},
            )
            existing = {**existing, "name": clean_name}
        return existing, False

    doc = {
        "id": str(uuid4()),
        "email": normalized,
        "name": clean_name,
        "access_level": ACCESS_BLUEPRINT,
        "created_from": "ciak_start_direct",
        "start_credit_amount": 0,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "events": [{"event": "client_created_for_direct_start", "timestamp": _now_iso()}],
    }
    await db.ciak_clients.insert_one(doc)
    doc.pop("_id", None)
    return doc, True


def build_start_entitlement_updates(
    client: dict[str, Any],
    *,
    reference_id: str,
    now: str,
) -> dict[str, Any] | None:
    """Campi da scrivere per attivare Ciak Start su un cliente.

    Ciak Start si paga intero: nessun piano rateale, il credito verso la
    Partnership e' sempre quello garantito. Ritorna None se quel pagamento
    risulta gia' registrato (stesso reference_id) — riattivare per rimandare
    l'accesso non deve registrare un secondo incasso.
    """
    registrati = [dict(item) for item in (client.get("start_payments") or [])]
    if any(item.get("reference_id") == reference_id for item in registrati):
        return None
    registrati.append({"amount_cents": START_AMOUNT_CENTS, "reference_id": reference_id, "at": now})

    return {
        "access_level": ACCESS_START,
        "start_purchased_at": client.get("start_purchased_at") or now,
        "start_credit_amount": START_AMOUNT_CENTS,
        "start_payments": registrati,
        "updated_at": now,
    }


async def create_magic_login_token(db, client_id: str, email: str) -> dict[str, str]:
    token = secrets.token_urlsafe(32)
    doc = {
        "id": str(uuid4()),
        "client_id": client_id,
        "email": email.strip().lower(),
        "token_hash": _token_hash(token),
        "used_at": None,
        # 30 giorni + riutilizzabile (vedi verify): copre la finestra "leggo il
        # Blueprint, decido, pago" senza costringere a rigenerare il link.
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "created_at": _now_iso(),
    }
    await db.ciak_client_login_tokens.insert_one(doc)
    return {"token": token, "expires_at": doc["expires_at"]}


async def verify_magic_login_token(db, token: str) -> dict[str, Any]:
    doc = await db.ciak_client_login_tokens.find_one({"token_hash": _token_hash(token)})
    if not doc:
        raise ValueError("token non valido")
    expires_at = datetime.fromisoformat(doc["expires_at"].replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        raise ValueError("token scaduto")
    client = await db.ciak_clients.find_one({"id": doc["client_id"]}, {"_id": 0})
    if not client:
        raise ValueError("cliente non trovato")
    # Link RIUTILIZZABILE entro la validità (30gg): non si "brucia" al primo uso,
    # così la persona può riaprire lo stesso link finché non scade. Registriamo
    # comunque il primo accesso (`used_at`) come traccia di audit, senza bloccare
    # i riusi successivi.
    if not doc.get("used_at"):
        await db.ciak_client_login_tokens.update_one(
            {"id": doc["id"], "used_at": None},
            {"$set": {"used_at": _now_iso()}},
        )
    return client
