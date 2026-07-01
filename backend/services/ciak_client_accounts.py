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


def partnership_price_for_client(client: dict[str, Any]) -> dict[str, Any]:
    has_start_credit = (
        client.get("access_level") == ACCESS_START
        or client.get("start_purchased_at")
        or client.get("start_credit_amount")
    )
    credit = START_AMOUNT_CENTS if has_start_credit else 0
    credit = int(client.get("start_credit_amount") or credit)
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
    for key in ("score_percentuale", "score_numerico", "score_total"):
        if scoring.get(key) is not None:
            try:
                raw = float(scoring[key])
                return int(raw if raw > 13 else round(raw / 13 * 100))
            except (TypeError, ValueError):
                pass
    return 0


async def ensure_client_for_blueprint(db, session: dict[str, Any]) -> dict[str, Any]:
    email = (session.get("user_email") or "").strip().lower()
    if not email:
        raise ValueError("sessione senza email")
    score = _score_from_session(session)
    existing = await db.ciak_clients.find_one({"email": email})
    base_update = {
        "email": email,
        "name": session.get("user_name"),
        "session_token": session.get("session_token"),
        "diagnostic_session_token": session.get("session_token"),
        "blueprint_score": score,
        "recommended_offer": offer_for_score(score),
        "blueprint_amount_cents": BLUEPRINT_AMOUNT_CENTS,
        "updated_at": _now_iso(),
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
    await db.ciak_client_login_tokens.update_one(
        {"id": doc["id"]},
        {"$set": {"used_at": _now_iso()}},
    )
    client = await db.ciak_clients.find_one({"id": doc["client_id"]}, {"_id": 0})
    if not client:
        raise ValueError("cliente non trovato")
    return client
