from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4


BLUEPRINT_AMOUNT_CENTS = 2700
START_AMOUNT_CENTS = 49900
PARTNERSHIP_AMOUNT_CENTS = 279000
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


def partnership_price_for_client(client: dict[str, Any]) -> dict[str, Any]:
    stored_credit = client.get("start_credit_amount")
    plan = client.get("start_payment_plan") or {}
    if plan and not plan.get("complete"):
        # Piano rateale ancora aperto: si scala l'incassato, non i 499 promessi.
        # Col saldo il piano si chiude e il credito torna pieno.
        try:
            credit = int(plan.get("paid_cents") or client.get("start_paid_cents") or 0)
        except (TypeError, ValueError):
            credit = 0
        credit = max(0, min(credit, PARTNERSHIP_AMOUNT_CENTS))
        return {
            "full_amount_cents": PARTNERSHIP_AMOUNT_CENTS,
            "credit_amount_cents": credit,
            "due_amount_cents": PARTNERSHIP_AMOUNT_CENTS - credit,
            "currency": "eur",
        }
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


def default_start_progress() -> list[dict[str, Any]]:
    labels = [
        "Direzione di posizionamento",
        "Basi del brand",
        "Sistemazione profili social",
        "Sito vetrina semplice",
        "Strategia contenuti",
        "Calendario contenuti",
        "Revisione finale e readiness partnership",
    ]
    return [
        {"id": f"start_{idx + 1}", "label": label, "status": "locked" if idx else "todo"}
        for idx, label in enumerate(labels)
    ]


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
        "start_progress": [],
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
        "start_progress": [],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "events": [{"event": "client_created_for_direct_start", "timestamp": _now_iso()}],
    }
    await db.ciak_clients.insert_one(doc)
    doc.pop("_id", None)
    return doc, True


def build_start_payment_updates(
    client: dict[str, Any],
    *,
    amount_cents: int,
    reference_id: str,
    kind: str,
    now: str,
) -> dict[str, Any] | None:
    """Applica una rata Ciak Start a un cliente e ritorna i campi da scrivere.

    Ritorna None se quella rata risulta gia' registrata (stesso reference_id):
    un webhook consegnato due volte non deve raddoppiare l'incasso.
    Solleva ValueError se l'importo non e' valido o supera i 499 EUR.
    """
    try:
        amount = int(amount_cents)
    except (TypeError, ValueError):
        raise ValueError("importo non valido")
    if amount <= 0:
        raise ValueError("importo non valido")

    plan = dict(client.get("start_payment_plan") or {})
    installments = [dict(item) for item in (plan.get("installments") or [])]
    if any(item.get("reference_id") == reference_id for item in installments):
        return None

    try:
        already_paid = int(plan.get("paid_cents") or client.get("start_paid_cents") or 0)
    except (TypeError, ValueError):
        already_paid = 0
    paid = already_paid + amount
    if paid > START_AMOUNT_CENTS:
        raise ValueError(
            f"rata da {amount} su {already_paid} gia' versati: supera i {START_AMOUNT_CENTS} di Ciak Start"
        )

    installments.append({
        "kind": kind,
        "amount_cents": amount,
        "reference_id": reference_id,
        "at": now,
    })
    complete = paid >= START_AMOUNT_CENTS

    return {
        "access_level": ACCESS_START,
        "start_purchased_at": client.get("start_purchased_at") or now,
        "start_progress": client.get("start_progress") or default_start_progress(),
        "start_paid_cents": paid,
        "start_credit_amount": START_AMOUNT_CENTS if complete else paid,
        "start_payment_plan": {
            "total_cents": START_AMOUNT_CENTS,
            "paid_cents": paid,
            "complete": complete,
            "installments": installments,
        },
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
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat(),
        "created_at": _now_iso(),
    }
    await db.ciak_client_login_tokens.insert_one(doc)
    return {"token": token, "expires_at": doc["expires_at"]}


async def verify_magic_login_token(db, token: str) -> dict[str, Any]:
    doc = await db.ciak_client_login_tokens.find_one({"token_hash": _token_hash(token)})
    if not doc or doc.get("used_at"):
        raise ValueError("token non valido")
    expires_at = datetime.fromisoformat(doc["expires_at"].replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        raise ValueError("token scaduto")
    client = await db.ciak_clients.find_one({"id": doc["client_id"]}, {"_id": 0})
    if not client:
        raise ValueError("cliente non trovato")
    result = await db.ciak_client_login_tokens.update_one(
        {"id": doc["id"], "used_at": None},
        {"$set": {"used_at": _now_iso()}},
    )
    modified_count = getattr(result, "modified_count", None)
    if modified_count is None and isinstance(result, dict):
        modified_count = result.get("modified_count", 0)
    if not modified_count:
        raise ValueError("token non valido")
    return client
