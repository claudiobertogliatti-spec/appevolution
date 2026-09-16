from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from auth import decode_token
from report_key_auth import require_admin_or_report_key
from services.ciak_state_machine import STATE_CALL_DONE, transition_to
from services.paid_offer_gate import require_paid_offer_checkout
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


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ciak/client", tags=["ciak-client"])
security = HTTPBearer(auto_error=False)

db = None

CLIENT_JWT_ALG = "HS256"
CLIENT_JWT_DAYS = 30
BLUEPRINT_PRICE_CENTS = 2700  # €27 storico (funnel gratuito, checkout €27 ritirato)
PARTNERSHIP_PRICE_CENTS = 299000
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


class ConsegnaBlueprintRequest(BaseModel):
    """Identifica il lead da consegnare. Almeno uno tra i campi va valorizzato;
    `session_token` ha la precedenza, poi `email`, poi `client_id`."""
    session_token: str | None = None
    email: str | None = None
    client_id: str | None = None


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
    require_paid_offer_checkout(api_key, metadata.get("tipo"))
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
    except HTTPException:
        raise
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


BONUS_GUIDA_VALORE_CENTS = 4900
BONUS_GUIDA_WINDOW_HOURS = 48
BONUS_GUIDA_TITOLO = "Come creare un videocorso che vende davvero"


def _offer_payload(client: dict[str, Any], already_active: bool) -> dict[str, Any]:
    """Finestra bonus 48h post-call: la guida videocorso e' in omaggio con Ciak
    Start solo entro 48h dalla consegna del Blueprint (`bonus_expires_at`, ancorato
    alla PRIMA consegna). Il countdown in pagina e' guidato da questo timestamp
    reale — non e' un conto alla rovescia finto (Cod. Consumo). Scaduto o gia'
    cliente attivo: bonus non attivo.
    """
    expires = client.get("bonus_expires_at")
    attiva = False
    if expires and not already_active:
        try:
            exp_dt = datetime.fromisoformat(str(expires).replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            attiva = datetime.now(timezone.utc) < exp_dt
        except (ValueError, TypeError):
            attiva = False
    return {
        "bonus_expires_at": expires,
        "bonus_guida_attiva": bool(attiva),
        "guida_valore_cents": BONUS_GUIDA_VALORE_CENTS,
        "guida_titolo": BONUS_GUIDA_TITOLO,
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
    """Blueprint GRATUITO: l'unico requisito e' che la call sia avvenuta.

    Il Blueprint non si paga piu' (niente `stripe_payment_completed`) e le offerte
    non dipendono dalla consegna dell'analisi Carlo (niente `bozza_inviata_at`): la
    generazione puo' degradare o tardare senza bloccare l'acquisto. Il via lo da'
    l'admin confermando di aver fatto la call di consegna (stato `call_done`), non
    un pagamento.
    """
    session = context.get("session") or {}
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
    # Modello gratuito: nessuna `offer_decision` manuale per-lead. Dopo la call
    # (call_done) il cliente vede l'offerta e puo' acquistare da solo Ciak Start.
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
        "offer": _offer_payload(
            effective_client,
            already_active=(
                effective_client.get("access_level") in (ACCESS_START, ACCESS_PARTNER)
                or is_partner
            ),
        ),
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


@router.get("/start/deliverables")
async def start_deliverables(client: dict[str, Any] = Depends(require_client)):
    """Rende visibili al cliente solo gli output Start approvati dal team."""
    if not has_start_entitlement(client):
        raise HTTPException(status_code=403, detail="Ciak Start non attivo")
    docs = await db.ciak_start_deliverables.find(
        {"partner_id": client["id"], "approval_status": "approved"},
        {"_id": 0, "generated_by": 0, "approved_by": 0},
    ).sort("approved_at", 1).to_list(20)
    return {"items": docs}


async def _deliver_blueprint(
    diagnostic: dict[str, Any], background_tasks: BackgroundTasks
) -> dict[str, Any]:
    """Consegna del Blueprint GRATUITO, innescata dall'admin a fine call.

    Crea/aggiorna l'account cliente + magic-link e avvia in background la
    generazione + consegna dell'analisi Carlo (il "blueprint"). Idempotente
    (`ensure_client_for_blueprint` fa upsert per email; `processa_acquisto` salta
    se l'analisi e' gia' stata inviata). Il magic-link e' secondario: se fallisce,
    l'analisi parte comunque. Ritorna un riepilogo per la UI admin.
    """
    from services.ciak_client_accounts import (
        create_magic_login_token,
        ensure_client_for_blueprint,
    )

    client = await ensure_client_for_blueprint(db, diagnostic)

    # Finestra bonus 48h (guida videocorso in omaggio con Ciak Start): ancorata
    # alla PRIMA consegna del Blueprint e mai resettata (il filtro esclude i doc
    # dove e' gia' valorizzata). Onesta': la scadenza e' reale, il countdown la usa.
    if not client.get("bonus_expires_at"):
        _bonus_expires = (
            datetime.now(timezone.utc) + timedelta(hours=BONUS_GUIDA_WINDOW_HOURS)
        ).isoformat()
        await db.ciak_clients.update_one(
            {"id": client["id"], "bonus_expires_at": {"$in": [None, ""]}},
            {"$set": {"bonus_expires_at": _bonus_expires, "blueprint_delivered_at": _now_iso()}},
        )
        client["bonus_expires_at"] = _bonus_expires

    magic_link = None
    try:
        login = await create_magic_login_token(db, client["id"], client["email"])
        base = os.environ.get("CIAK_BASE_URL") or os.environ.get(
            "FRONTEND_URL_PROD", "https://ciak.io"
        )
        magic_link = f"{base}/cliente/accesso?token={login['token']}"
        await db.ciak_clients.update_one(
            {"id": client["id"]},
            {"$set": {
                "last_magic_link_created_at": _now_iso(),
                "last_magic_login_url": magic_link,
            }},
        )
    except Exception as exc:
        logger.error("[CONSEGNA_BLUEPRINT] magic-link fallito: %s", exc)

    # Analisi Carlo (blueprint): genera + consegna in background. Idempotente e
    # non solleva (processa_acquisto logga e ritorna lo stato).
    from services import ciak_analisi_delivery

    ciak_analisi_delivery.set_db(db)
    background_tasks.add_task(
        ciak_analisi_delivery.processa_acquisto,
        session_token=diagnostic.get("session_token"),
        email=client.get("email") or diagnostic.get("user_email"),
        nome=diagnostic.get("user_name") or client.get("name"),
    )
    return {
        "client_id": client.get("id"),
        "email": client.get("email"),
        "magic_link": magic_link,
    }


@router.post("/admin/consegna-blueprint")
async def consegna_blueprint(
    body: ConsegnaBlueprintRequest,
    background_tasks: BackgroundTasks,
    auth=Depends(require_admin_or_internal),
):
    """L'admin conferma di aver fatto la call di consegna.

    Porta il lead a `call_done`, crea l'account cliente, invia il Blueprint
    (analisi Carlo) via email col magic-link e sblocca le offerte (Ciak Start /
    Partnership). Sostituisce il vecchio automatismo sul webhook Cal.com: il via
    lo da' l'admin, non l'evento MEETING_ENDED.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")

    # 1. Trova la diagnostic session del lead (session_token > email > client_id).
    diagnostic = None
    if body.session_token:
        diagnostic = await db.diagnostic_sessions.find_one({"session_token": body.session_token})
    if diagnostic is None and body.email:
        normalized = body.email.strip().lower()
        cursor = db.diagnostic_sessions.find({"user_email": normalized}).sort("created_at", -1).limit(1)
        docs = await cursor.to_list(length=1)
        diagnostic = docs[0] if docs else None
    if diagnostic is None and body.client_id:
        client_doc = await db.ciak_clients.find_one({"id": body.client_id})
        token = (client_doc or {}).get("session_token") or (client_doc or {}).get("diagnostic_session_token")
        if token:
            diagnostic = await db.diagnostic_sessions.find_one({"session_token": token})
    if diagnostic is None:
        raise HTTPException(
            status_code=404,
            detail="Lead non trovato: fornisci session_token, email o client_id validi.",
        )

    # 2. Attesta la call completata: porta a call_done (idempotente).
    if diagnostic.get("current_state") != STATE_CALL_DONE:
        transition_to(
            diagnostic,
            STATE_CALL_DONE,
            event_metadata={"confirmed_by": auth.get("actor"), "source": "admin_consegna"},
        )
        await db.diagnostic_sessions.replace_one({"_id": diagnostic["_id"]}, diagnostic)

    # 3. Consegna Blueprint + sblocco offerte.
    summary = await _deliver_blueprint(diagnostic, background_tasks)
    return {"success": True, **summary}


def _consegna_manuale_email_body(nome: str, sales_link: str, pdf_url: str | None) -> str:
    primo = (nome or "").split()[0] if nome else "ciao"
    scarica = f"\n\nSe preferisci, puoi scaricarlo anche qui:\n{pdf_url}\n" if pdf_url else "\n"
    return (
        f"Ciao {primo},\n\n"
        "come promesso, in allegato trovi il tuo Blueprint Evolution: l'analisi strategica "
        "che abbiamo visto insieme nella call."
        f"{scarica}\n"
        "Da qui accedi alla tua area riservata e scegli come proseguire — Ciak Start "
        f"oppure la Partnership completa:\n{sales_link}\n\n"
        "A presto,\nClaudio\nEvolution PRO"
    )


@router.post("/admin/consegna-manuale")
async def consegna_manuale(
    request: Request,
    auth=Depends(require_admin_or_internal),
):
    """Consegna manuale di un Blueprint per un cliente FUORI-FUNNEL (PDF gia' pronto).

    Per i lead che non passano dalle 8 domande (es. ProVideo outbound): l'admin
    fornisce email + nome + il PDF, e questo endpoint crea l'account cliente + una
    diagnostic session gia' a `call_done` (sblocca Ciak Start / Partnership e soddisfa
    i gate di checkout), genera il magic-link e invia l'email col PDF allegato + il
    link alla sales page. NON genera l'analisi Carlo: usa il PDF caricato.

    Multipart/form-data: `email`, `nome`, `file` (application/pdf).
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")

    form = await request.form()
    email = (form.get("email") or "").strip().lower()
    nome = (form.get("nome") or "").strip()
    upload = form.get("file")
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Email cliente non valida")
    if upload is None or not hasattr(upload, "read"):
        raise HTTPException(status_code=400, detail="PDF mancante (campo 'file')")
    pdf_bytes = await upload.read()
    if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail="Il file caricato non e' un PDF valido")

    now = _now_iso()
    session_token = str(uuid4())

    # 1. Diagnostic session minima a call_done: sblocca le offerte lato cliente e
    #    soddisfa i gate di checkout (che leggono lo stato dalla sessione).
    session = {
        "session_token": session_token,
        "user_email": email,
        "user_name": nome or None,
        "current_state": STATE_CALL_DONE,
        "source": "manual_delivery",
        "created_at": now,
        "state_history": [{"state": STATE_CALL_DONE, "timestamp": now}],
        "events": [{
            "event": "manual_delivery",
            "timestamp": now,
            "metadata": {"by": auth.get("actor")},
        }],
    }
    await db.diagnostic_sessions.insert_one(dict(session))

    # 2. Account cliente collegato alla sessione.
    from services.ciak_client_accounts import (
        create_magic_login_token,
        ensure_client_for_blueprint,
    )

    client = await ensure_client_for_blueprint(db, session)

    # 3. Magic-link d'accesso.
    login = await create_magic_login_token(db, client["id"], client["email"])
    base = os.environ.get("CIAK_BASE_URL") or os.environ.get(
        "FRONTEND_URL_PROD", "https://ciak.io"
    )
    magic_link = f"{base}/cliente/accesso?token={login['token']}"
    await db.ciak_clients.update_one(
        {"id": client["id"]},
        {"$set": {
            "last_magic_link_created_at": now,
            "last_magic_login_url": magic_link,
            "manual_delivery": True,
        }},
    )

    # 4. Upload PDF (best-effort) + email col PDF allegato e il link alla sales page.
    from services import ciak_analisi_delivery

    ciak_analisi_delivery.set_db(db)
    pdf_url = await ciak_analisi_delivery._upload_pdf(pdf_bytes, session_token)
    primo = (nome or "cliente").split()[0].lower() if nome else "cliente"
    ok, err = ciak_analisi_delivery._send_email_attachment(
        to=email,
        subject="Il tuo Blueprint Evolution — analisi + prossimo passo",
        body_text=_consegna_manuale_email_body(nome, magic_link, pdf_url),
        pdf_bytes=pdf_bytes,
        pdf_filename=f"blueprint_{primo}.pdf",
    )
    if not ok:
        logger.error("[CONSEGNA_MANUALE] email ko per %s: %s", email, err)

    return {
        "success": bool(ok),
        "email_sent": bool(ok),
        "email_error": err,
        "client_id": client["id"],
        "email": client["email"],
        "magic_link": magic_link,
        "pdf_url": pdf_url,
    }


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
    # A client entitlement is not consent to a particular contract. The only
    # Partnership checkout must go through its proposal and saved declaration.
    raise HTTPException(409, detail={
        "code": "PARTNERSHIP_PROPOSAL_REQUIRED",
        "message": "Per la Partnership apri il link alla proposta ricevuto dal team e completa l'accettazione del contratto.",
    })


@router.post("/bonus-reminder/run")
async def bonus_reminder_run(_auth=Depends(require_admin_or_report_key)):
    """Innescato ogni ora dallo scheduler (X-Report-Key): manda il promemoria a
    chi ha la finestra bonus 48h in chiusura entro ~24h e non ha ancora comprato
    Ciak Start. Idempotente lato servizio. Vedi services/ciak_bonus_reminder."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")
    from services.ciak_bonus_reminder import invia_promemoria_bonus

    return await invia_promemoria_bonus(db)
