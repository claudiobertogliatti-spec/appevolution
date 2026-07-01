from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from services.ciak_client_accounts import partnership_price_for_client, verify_magic_login_token


router = APIRouter(prefix="/api/ciak/client", tags=["ciak-client"])
security = HTTPBearer(auto_error=False)

db = None

CLIENT_JWT_SECRET = "ciak-client-local-secret"
CLIENT_JWT_ALG = "HS256"
CLIENT_JWT_DAYS = 30
BLUEPRINT_PRICE_CENTS = 2700
START_PRICE_CENTS = 49900
PARTNERSHIP_PRICE_CENTS = 279000
PARTNER_AREA_ACTIVE_STATES = {"partner_attivo", "attivazione_partnership", "convertito_partner"}


def set_db(database) -> None:
    global db
    db = database


class MagicLoginRequest(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _jwt_secret() -> str:
    return (
        os.environ.get("JWT_SECRET")
        or os.environ.get("SECRET_KEY")
        or os.environ.get("JWT_SECRET_KEY")
        or CLIENT_JWT_SECRET
    )


def _public_client(client: dict[str, Any]) -> dict[str, Any]:
    allowed = {
        "id",
        "email",
        "name",
        "access_level",
        "blueprint_score",
        "recommended_offer",
        "offer_decision",
        "start_credit_amount",
        "start_progress",
        "analysis_status",
        "analysis_title",
        "analysis_generated_at",
        "analysis_delivered_at",
        "analysis_publicly_available",
        "diagnostic_completed_at",
        "diagnostic_current_state",
        "created_at",
        "updated_at",
    }
    return {key: value for key, value in client.items() if key in allowed and value is not None}


def _create_client_jwt(client: dict[str, Any]) -> str:
    payload = {
        "sub": client["id"],
        "email": client["email"],
        "role": "ciak_client",
        "access_level": client.get("access_level", "cliente_blueprint"),
        "exp": datetime.now(timezone.utc) + timedelta(days=CLIENT_JWT_DAYS),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=CLIENT_JWT_ALG)


async def require_client(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")

    try:
        payload = jwt.decode(credentials.credentials, _jwt_secret(), algorithms=[CLIENT_JWT_ALG])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido")

    if payload.get("role") != "ciak_client":
        raise HTTPException(status_code=403, detail="Accesso cliente richiesto")

    client_id = payload.get("sub")
    if not client_id:
        raise HTTPException(status_code=401, detail="Token non valido")

    client = await db.ciak_clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return client


def _analysis_payload(analysis: dict[str, Any] | None, client: dict[str, Any]) -> dict[str, Any]:
    definitive = (analysis or {}).get("analisi_definitiva") or {}
    return {
        "status": (analysis or {}).get("stato") or client.get("analysis_status") or "non_generata",
        "title": definitive.get("titolo") or client.get("analysis_title"),
        "roadmap": definitive.get("roadmap") or [],
        "available": bool(
            client.get("analysis_publicly_available")
            or (analysis or {}).get("stato") == "inviata"
        ),
        "generated_at": (analysis or {}).get("generated_at") or client.get("analysis_generated_at"),
        "delivered_at": (analysis or {}).get("bozza_inviata_at") or client.get("analysis_delivered_at"),
    }


def _partner_area_available(client: dict[str, Any]) -> bool:
    if client.get("partnership_attiva") is True:
        return True
    stato_cliente = str(client.get("stato_cliente") or "").strip().lower()
    if stato_cliente in PARTNER_AREA_ACTIVE_STATES:
        return True
    return client.get("access_level") == "partner"


async def _dashboard_for_client(client: dict[str, Any]) -> dict[str, Any]:
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")

    session_token = client.get("session_token") or client.get("diagnostic_session_token")
    analysis = None
    session = None
    if session_token:
        analysis = await db.ciak_analisi.find_one({"session_token": session_token}, {"_id": 0})
        session = await db.diagnostic_sessions.find_one({"session_token": session_token}, {"_id": 0})

    partnership_price = partnership_price_for_client(client)
    is_partner = _partner_area_available(client)

    return {
        "client": _public_client(client),
        "diagnostic": {
            "state": (session or {}).get("current_state") or client.get("diagnostic_current_state"),
            "score": client.get("blueprint_score"),
            "recommended_offer": client.get("recommended_offer"),
            "offer_decision": client.get("offer_decision"),
        },
        "analysis": _analysis_payload(analysis, client),
        "start": {
            "credit_amount_cents": partnership_price["credit_amount_cents"],
            "progress": client.get("start_progress") or [],
        },
        "pricing": {
            "blueprint": {
                "amount_cents": BLUEPRINT_PRICE_CENTS,
                "currency": "eur",
                "label": "Blueprint",
            },
            "ciak_start": {
                "amount_cents": START_PRICE_CENTS,
                "currency": "eur",
                "label": "Ciak Start",
                "credit_guaranteed": True,
            },
            "partnership": {
                **partnership_price,
                "label": "Partnership",
                "upgrade_from_start_cents": PARTNERSHIP_PRICE_CENTS - START_PRICE_CENTS,
            },
        },
        "partner_area": {
            "available": is_partner,
            "status": "attiva" if is_partner else "in_attesa_attivazione",
            "message": (
                "La tua area Partnership e' attiva."
                if is_partner
                else "La Partnership si attiva dopo la conferma del percorso dedicato."
            ),
        },
        "generated_at": _now_iso(),
    }


@router.post("/auth/magic-login")
async def magic_login(body: MagicLoginRequest):
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")

    try:
        client = await verify_magic_login_token(db, body.token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    return {
        "token": _create_client_jwt(client),
        "client": _public_client(client),
    }


@router.get("/me")
async def me(client: dict[str, Any] = Depends(require_client)):
    return {"client": _public_client(client)}


@router.get("/dashboard")
async def dashboard(client: dict[str, Any] = Depends(require_client)):
    return await _dashboard_for_client(client)
