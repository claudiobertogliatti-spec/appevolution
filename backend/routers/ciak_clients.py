from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from auth import decode_token
from services.ciak_client_accounts import (
    ACCESS_BLUEPRINT,
    ACCESS_PARTNER,
    ACCESS_START,
    OFFER_PARTNERSHIP,
    OFFER_START,
    START_AMOUNT_CENTS,
    default_start_progress,
    has_start_entitlement,
    partnership_price_for_client,
    verify_magic_login_token,
)


router = APIRouter(prefix="/api/ciak/client", tags=["ciak-client"])
security = HTTPBearer(auto_error=False)

db = None

CLIENT_JWT_ALG = "HS256"
CLIENT_JWT_DAYS = 30
BLUEPRINT_PRICE_CENTS = 2700
PARTNERSHIP_PRICE_CENTS = 279000
PARTNER_AREA_ACTIVE_STATES = {"partner_attivo", "convertito_partner"}
START_EXPLICIT_OFFER_FLAGS = (
    "start_offer_enabled",
    "allow_start_checkout",
    "force_start_offer",
)
PARTNERSHIP_EXPLICIT_OFFER_FLAGS = (
    "partnership_offer_enabled",
    "allow_partnership_checkout",
    "force_partnership_offer",
)


def set_db(database) -> None:
    global db
    db = database


class MagicLoginRequest(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)


class OfferDecisionRequest(BaseModel):
    client_id: str
    offer_decision: str
    admin_email: str | None = None


class ClientIdRequest(BaseModel):
    client_id: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _jwt_secret() -> str:
    secret = (
        os.environ.get("JWT_SECRET")
        or os.environ.get("SECRET_KEY")
        or os.environ.get("JWT_SECRET_KEY")
    )
    if not secret:
        raise RuntimeError("JWT cliente non configurato")
    return secret


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", os.environ.get("FRONTEND_URL_PROD", "https://ciak.io"))


def _create_client_jwt(client: dict[str, Any]) -> str:
    payload = {
        "sub": client["id"],
        "email": client["email"],
        "role": "ciak_client",
        "access_level": client.get("access_level", "cliente_blueprint"),
        "exp": datetime.now(timezone.utc) + timedelta(days=CLIENT_JWT_DAYS),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=CLIENT_JWT_ALG)


def _ensure_stripe_configured() -> str:
    api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    return api_key


async def _create_checkout_session(
    *,
    amount_cents: int,
    success_url: str,
    cancel_url: str,
    metadata: dict[str, Any],
):
    api_key = _ensure_stripe_configured()
    from emergentintegrations.payments.stripe.checkout import CheckoutSessionRequest, StripeCheckout

    checkout = StripeCheckout(api_key=api_key)
    session_request = CheckoutSessionRequest(
        amount=amount_cents / 100,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    try:
        return await checkout.create_checkout_session(session_request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Errore creazione checkout: {exc}") from exc


async def require_client(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")

    try:
        payload = jwt.decode(credentials.credentials, _jwt_secret(), algorithms=[CLIENT_JWT_ALG])
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
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


async def require_admin_or_internal(
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    internal_api_key = os.environ.get("INTERNAL_API_KEY")
    if internal_api_key and x_internal_key == internal_api_key:
        return {"auth_type": "internal", "actor": "internal"}

    if not credentials:
        raise HTTPException(status_code=401, detail="Autenticazione richiesta")

    token_data = decode_token(credentials.credentials)
    if not token_data or token_data.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=403,
            detail="Accesso riservato ad admin o sistema interno",
        )

    return {
        "auth_type": "admin",
        "actor": getattr(token_data, "email", None)
        or getattr(token_data, "user_id", None)
        or "admin",
    }


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
    return client.get("access_level") == ACCESS_PARTNER


def _has_explicit_offer_flag(client: dict[str, Any], flags: tuple[str, ...]) -> bool:
    return any(client.get(flag) is True for flag in flags)


async def _blueprint_context(client: dict[str, Any]) -> dict[str, Any]:
    session_token = client.get("session_token") or client.get("diagnostic_session_token")
    if not session_token or db is None:
        return {"session": {}, "analysis": {}}
    session = await db.diagnostic_sessions.find_one({"session_token": session_token}, {"_id": 0}) or {}
    analysis = await db.ciak_analisi.find_one({"session_token": session_token}, {"_id": 0}) or {}
    return {"session": session, "analysis": analysis}


def _ensure_completed_blueprint_path(context: dict[str, Any]) -> None:
    session = context.get("session") or {}
    analysis = context.get("analysis") or {}
    paid = any(event.get("event") == "stripe_payment_completed" for event in session.get("events", []))
    if not paid:
        raise HTTPException(status_code=403, detail="Il pagamento Blueprint da 27 EUR non risulta completato.")
    if not analysis.get("bozza_inviata_at"):
        raise HTTPException(
            status_code=409,
            detail="L'analisi Blueprint deve essere consegnata prima di proporre Ciak Start.",
        )
    if session.get("current_state") != "call_done":
        raise HTTPException(
            status_code=409,
            detail="La call Blueprint deve essere completata prima di acquistare Ciak Start.",
        )


def _ensure_start_checkout_allowed(client: dict[str, Any], context: dict[str, Any]) -> None:
    if _partner_area_available(client) or client.get("access_level") == ACCESS_PARTNER:
        raise HTTPException(status_code=409, detail="La Partnership risulta gia' attiva su questo account.")
    if client.get("access_level") == ACCESS_START or has_start_entitlement(client):
        raise HTTPException(status_code=409, detail="Ciak Start risulta gia' attivo su questo account.")
    if client.get("access_level") not in (None, "", ACCESS_BLUEPRINT):
        raise HTTPException(status_code=403, detail="Ciak Start non e' disponibile per questo account.")
    if client.get("offer_decision") != OFFER_START:
        raise HTTPException(
            status_code=403,
            detail="Ciak Start richiede la decisione esplicita del team dopo la call.",
        )
    _ensure_completed_blueprint_path(context)


def _ensure_partnership_checkout_allowed(client: dict[str, Any]) -> None:
    if _partner_area_available(client) or client.get("access_level") == ACCESS_PARTNER:
        raise HTTPException(status_code=409, detail="La Partnership risulta gia' attiva su questo account.")
    if (
        client.get("offer_decision") == OFFER_PARTNERSHIP
        or client.get("recommended_offer") == OFFER_PARTNERSHIP
        or _has_explicit_offer_flag(client, PARTNERSHIP_EXPLICIT_OFFER_FLAGS)
        or has_start_entitlement(client)
    ):
        return
    raise HTTPException(
        status_code=403,
        detail="La Partnership si attiva solo dopo la call e la decisione dedicata.",
    )


def _user_lookup_queries(client: dict[str, Any]) -> list[dict[str, Any]]:
    queries: list[dict[str, Any]] = []
    seen: set[tuple[tuple[str, Any], ...]] = set()

    def add_query(field: str, value: Any) -> None:
        if value in (None, ""):
            return
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return
            value = normalized.lower() if field == "email" else normalized
        query = {field: value}
        key = tuple(sorted(query.items()))
        if key in seen:
            return
        seen.add(key)
        queries.append(query)

    add_query("email", client.get("email"))
    add_query("id", client.get("user_id"))
    add_query("id", client.get("linked_user_id"))
    add_query("id", client.get("id"))
    add_query("session_token", client.get("session_token"))
    add_query("session_token", client.get("diagnostic_session_token"))
    add_query("diagnostic_session_token", client.get("session_token"))
    add_query("diagnostic_session_token", client.get("diagnostic_session_token"))
    return queries


async def _canonical_user_for_client(client: dict[str, Any]) -> dict[str, Any] | None:
    users_collection = getattr(db, "users", None)
    if db is None or users_collection is None:
        return None
    for query in _user_lookup_queries(client):
        user = await users_collection.find_one(query, {"_id": 0})
        if user:
            return user
    return None


def _effective_client_snapshot(client: dict[str, Any], user: dict[str, Any] | None) -> dict[str, Any]:
    effective = dict(client)
    if not user:
        return effective
    for field in ("partnership_attiva", "stato_cliente"):
        if user.get(field) is not None:
            effective[field] = user[field]
    return effective


def _effective_access_level(client: dict[str, Any], user: dict[str, Any] | None) -> str:
    if user and _partner_area_available(_effective_client_snapshot(client, user)):
        return "partner"
    return client.get("access_level") or "cliente_blueprint"


def _public_client(client: dict[str, Any], user: dict[str, Any] | None = None) -> dict[str, Any]:
    public = {
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
    payload = {key: value for key, value in client.items() if key in public and value is not None}
    payload["access_level"] = _effective_access_level(client, user)
    return payload


async def _dashboard_for_client(client: dict[str, Any]) -> dict[str, Any]:
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")

    session_token = client.get("session_token") or client.get("diagnostic_session_token")
    analysis = None
    session = None
    if session_token:
        analysis = await db.ciak_analisi.find_one({"session_token": session_token}, {"_id": 0})
        session = await db.diagnostic_sessions.find_one({"session_token": session_token}, {"_id": 0})

    canonical_user = await _canonical_user_for_client(client)
    effective_client = _effective_client_snapshot(client, canonical_user)
    effective_client["access_level"] = _effective_access_level(client, canonical_user)
    partnership_price = partnership_price_for_client(effective_client)
    is_partner = _partner_area_available(effective_client)

    return {
        "client": _public_client(client, canonical_user),
        "diagnostic": {
            "state": (session or {}).get("current_state") or client.get("diagnostic_current_state"),
            "score": client.get("blueprint_score"),
            "recommended_offer": client.get("recommended_offer"),
            "offer_decision": client.get("offer_decision"),
        },
        "analysis": _analysis_payload(analysis, client),
        "start": {
            "credit_amount_cents": partnership_price["credit_amount_cents"],
            "progress": effective_client.get("start_progress") or [],
        },
        "pricing": {
            "blueprint": {
                "amount_cents": BLUEPRINT_PRICE_CENTS,
                "currency": "eur",
                "label": "Blueprint",
            },
            "ciak_start": {
                "amount_cents": START_AMOUNT_CENTS,
                "currency": "eur",
                "label": "Ciak Start",
                "credit_guaranteed": True,
            },
            "partnership": {
                **partnership_price,
                "label": "Partnership",
                "upgrade_from_start_cents": PARTNERSHIP_PRICE_CENTS - START_AMOUNT_CENTS,
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
        _jwt_secret()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    try:
        client = await verify_magic_login_token(db, body.token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    canonical_user = await _canonical_user_for_client(client)
    effective_client = dict(client)
    effective_client["access_level"] = _effective_access_level(client, canonical_user)

    try:
        token = _create_client_jwt(effective_client)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {"token": token, "client": _public_client(effective_client, canonical_user)}


@router.get("/me")
async def me(client: dict[str, Any] = Depends(require_client)):
    canonical_user = await _canonical_user_for_client(client)
    return {"client": _public_client(client, canonical_user)}


@router.get("/dashboard")
async def dashboard(client: dict[str, Any] = Depends(require_client)):
    return await _dashboard_for_client(client)


@router.post("/admin/offer-decision")
async def offer_decision(
    body: OfferDecisionRequest,
    auth=Depends(require_admin_or_internal),
):
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")
    if body.offer_decision not in ("ciak_start", "partnership"):
        raise HTTPException(status_code=400, detail="offerta non valida")

    client = await db.ciak_clients.find_one({"id": body.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    context = await _blueprint_context(client)
    if (context.get("session") or {}).get("current_state") != "call_done":
        raise HTTPException(
            status_code=409,
            detail="La decisione commerciale si registra solo dopo la call completata.",
        )
    decided_at = _now_iso()

    res = await db.ciak_clients.update_one(
        {"id": body.client_id},
        {
            "$set": {
                "offer_decision": body.offer_decision,
                "offer_decided_by": body.admin_email or auth["actor"],
                "offer_decided_at": decided_at,
                "offer_decision_context": {
                    "diagnostic_state": "call_done",
                    "session_token": client.get("session_token") or client.get("diagnostic_session_token"),
                    "recorded_at": decided_at,
                },
            }
        },
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return {"success": True}


@router.post("/start/activate")
async def activate_start(
    body: ClientIdRequest,
    _auth=Depends(require_admin_or_internal),
):
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")

    res = await db.ciak_clients.update_one(
        {"id": body.client_id},
        {
            "$set": {
                "access_level": ACCESS_START,
                "start_purchased_at": _now_iso(),
                "start_credit_amount": START_AMOUNT_CENTS,
                "start_progress": default_start_progress(),
            }
        },
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return {"success": True, "start_credit_amount": START_AMOUNT_CENTS}


@router.post("/start/checkout")
async def start_checkout(client: dict[str, Any] = Depends(require_client)):
    canonical_user = await _canonical_user_for_client(client)
    effective_client = _effective_client_snapshot(client, canonical_user)
    effective_client["access_level"] = _effective_access_level(client, canonical_user)
    context = await _blueprint_context(client)
    _ensure_start_checkout_allowed(effective_client, context)
    frontend = _frontend_url()
    session = await _create_checkout_session(
        amount_cents=START_AMOUNT_CENTS,
        success_url=f"{frontend}/cliente?checkout=start&payment=success",
        cancel_url=f"{frontend}/cliente?checkout=start&payment=cancel",
        metadata={
            "tipo": "ciak_start",
            "client_id": client["id"],
            "email": client["email"],
        },
    )
    return {
        "success": True,
        "checkout_url": session.url,
        "amount_cents": START_AMOUNT_CENTS,
        "credit_amount_cents": START_AMOUNT_CENTS,
    }


@router.post("/partnership/checkout")
async def partnership_checkout(client: dict[str, Any] = Depends(require_client)):
    canonical_user = await _canonical_user_for_client(client)
    effective_client = _effective_client_snapshot(client, canonical_user)
    effective_client["access_level"] = _effective_access_level(client, canonical_user)
    _ensure_partnership_checkout_allowed(effective_client)
    frontend = _frontend_url()
    pricing = partnership_price_for_client(effective_client)
    session = await _create_checkout_session(
        amount_cents=pricing["due_amount_cents"],
        success_url=f"{frontend}/cliente?checkout=partnership&payment=success",
        cancel_url=f"{frontend}/cliente?checkout=partnership&payment=cancel",
        metadata={
            "tipo": "partnership",
            "client_id": client["id"],
            "email": client["email"],
            "full_amount_cents": pricing["full_amount_cents"],
            "credit_amount_cents": pricing["credit_amount_cents"],
            "due_amount_cents": pricing["due_amount_cents"],
        },
    )
    return {
        "success": True,
        "checkout_url": session.url,
        "amount_cents": pricing["due_amount_cents"],
        "credit_amount_cents": pricing["credit_amount_cents"],
    }
