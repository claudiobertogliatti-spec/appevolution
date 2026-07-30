"""
Ciak — Partner setup-password router.

Magic link flow per primo accesso partner Ciak post-pagamento €2.790.

Pattern (LOCK 17/5/2026):
  1. Backend crea magic_token con scadenza 7gg (vedi routers/proposta.py
     _activate_partner_account_and_notify)
  2. Token inviato al partner via email Systeme (custom field partner_setup_url)
  3. Partner clicca link → frontend ciak.io/partner/setup-password?token=...
  4. Form chiede nuova password (+ conferma) → POST /api/partner/setup-password
  5. Backend valida token, hash bcrypt, salva, consuma token, restituisce JWT
  6. Frontend salva JWT, redirect a /partner dashboard

Sicurezza:
  - Token monouso (consumed_at)
  - Scadenza 7gg
  - Niente password mai in chiaro (richiesta solo client-side, hash subito server-side)
  - Endpoint pubblico (no auth richiesta — il token È l'auth)

PASSWORD DIMENTICATA (aggiunto 30/7/2026)
  POST /api/partner/forgot-password riusa ESATTAMENTE lo stesso meccanismo:
  rigenera partner_setup_token (azzerando consumed_at) e manda il link via SMTP
  dal backend, non da Systeme. L'utente atterra sulla stessa pagina di setup.
  Differenze volute rispetto all'onboarding: TTL più corto (24h invece di 7gg)
  e `partner_setup_reason="password_reset"` per distinguere i due casi in admin.
  Chi ha perso la password non passa da qui: la pagina "Cambia password"
  richiede la password attuale, questa no — il possesso della casella è l'auth.
"""
import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from auth import create_access_token
from services.ciak_password_reset_email import send_password_reset_email_sync

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/partner", tags=["partner-setup"])

# Reset password: link più corto dell'onboarding (7gg) ma non "da smanettone".
# 24h è il compromesso per un target poco digitalizzato che legge la posta una
# volta al giorno: un link morto qui diventa una telefonata a Claudio.
RESET_TOKEN_TTL_HOURS = 24
# Anti-abuso: una sola email di reset ogni 2 minuti per indirizzo. Non protegge
# da un attacco distribuito, evita che un bottone premuto 10 volte mandi 10 mail.
RESET_COOLDOWN_SECONDS = 120

db = None


def _public_base_url() -> str:
    return os.environ.get("CIAK_PUBLIC_BASE_URL", "https://www.ciak.io").rstrip("/")


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    """ISO string → datetime aware. None se manca o non è parsabile."""
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def set_db(database) -> None:
    global db
    db = database


# ─── Models ─────────────────────────────────────────────────────────────

class VerifyTokenRequest(BaseModel):
    token: str = Field(..., min_length=20, max_length=128)


class VerifyTokenResponse(BaseModel):
    ok: bool
    email: Optional[str] = None
    nome: Optional[str] = None
    expires_at: Optional[str] = None
    error: Optional[str] = None


class SetupPasswordRequest(BaseModel):
    token: str = Field(..., min_length=20, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class SetupPasswordResponse(BaseModel):
    ok: bool
    access_token: Optional[str] = None
    user: Optional[dict] = None
    error: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)


class ForgotPasswordResponse(BaseModel):
    """Risposta volutamente sempre identica: non deve mai rivelare se un
    indirizzo è registrato (user enumeration)."""
    ok: bool = True


# ─── Endpoints ──────────────────────────────────────────────────────────

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(body: ForgotPasswordRequest):
    """
    "Password dimenticata": manda all'indirizzo un magic link per rimpostare
    la password. Endpoint pubblico (chi ha perso la password non è loggato).

    Risponde SEMPRE {"ok": true}, in ogni ramo:
      - indirizzo sconosciuto
      - account disattivato
      - richiesta troppo ravvicinata (cooldown)
      - invio SMTP fallito
    Qualsiasi differenza — nel corpo, nello status o nei tempi — sarebbe un
    oracolo per capire chi è registrato. Gli errori veri finiscono nel log e
    nell'audit `ciak_password_reset_requests`, non nella response.

    Effetto sul DB (solo se l'utente esiste ed è attivo): rigenera
    partner_setup_token con scadenza 24h e AZZERA partner_setup_consumed_at —
    senza quest'ultimo, verify-setup-token rifiuterebbe il link nuovo con
    "già utilizzato" per chi la password l'aveva già impostata una volta.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    email_norm = (body.email or "").strip().lower()
    now = datetime.now(timezone.utc)

    # Match esatto (come fa il login), poi fallback case-insensitive: chi ha
    # dimenticato la password spesso sbaglia anche le maiuscole. L'email parte
    # comunque verso l'indirizzo REGISTRATO, non verso quello digitato.
    user = await db.users.find_one({"email": email_norm})
    if not user and email_norm:
        user = await db.users.find_one(
            {"email": {"$regex": f"^{re.escape(email_norm)}$", "$options": "i"}}
        )

    if not user:
        logger.info("[PWD-RESET] richiesta per indirizzo non registrato (%s)", email_norm)
        return ForgotPasswordResponse()

    if not user.get("is_active", True):
        logger.info("[PWD-RESET] richiesta per account disattivato %s", user.get("email"))
        return ForgotPasswordResponse()

    last_request = _parse_iso(user.get("password_reset_requested_at"))
    if last_request and (now - last_request).total_seconds() < RESET_COOLDOWN_SECONDS:
        logger.info("[PWD-RESET] cooldown attivo per %s — nessuna nuova email", user.get("email"))
        return ForgotPasswordResponse()

    reset_token = uuid.uuid4().hex
    expires_at = (now + timedelta(hours=RESET_TOKEN_TTL_HOURS)).isoformat()
    now_iso = now.isoformat()

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "partner_setup_token": reset_token,
            "partner_setup_expires_at": expires_at,
            "partner_setup_created_at": now_iso,
            "partner_setup_consumed_at": None,
            "partner_setup_reason": "password_reset",
            "password_reset_requested_at": now_iso,
        }},
    )

    reset_url = f"{_public_base_url()}/partner/setup-password?token={reset_token}"

    sent, error = await asyncio.to_thread(
        send_password_reset_email_sync,
        user.get("email"),
        user.get("name"),
        reset_url,
        RESET_TOKEN_TTL_HOURS,
    )

    # Audit con l'esito REALE: un reset richiesto e mai consegnato è un partner
    # che resta fuori e telefona. Il link resta comunque recuperabile
    # dall'admin (GET /api/admin/ciak/partner-setup-pending).
    try:
        await db.ciak_password_reset_requests.insert_one({
            "email": user.get("email"),
            "email_requested": email_norm,
            "user_id": user.get("id"),
            "role": user.get("role"),
            "sent": sent,
            "sent_via": "smtp",
            "error": error,
            "expires_at": expires_at,
            "at": now_iso,
            "sent_at": now_iso if sent else None,
        })
    except Exception as e:  # l'audit non deve mai far fallire la request
        logger.warning("[PWD-RESET] audit insert fallito per %s: %s", user.get("email"), e)

    if sent:
        logger.info(
            "[PWD-RESET] magic link inviato a %s (token=%s..., scade %s)",
            user.get("email"), reset_token[:8], expires_at,
        )
    else:
        logger.error("[PWD-RESET] invio fallito per %s: %s", user.get("email"), error)

    return ForgotPasswordResponse()


@router.post("/verify-setup-token", response_model=VerifyTokenResponse)
async def verify_setup_token(body: VerifyTokenRequest):
    """
    Verifica che il token magic link sia valido (esiste, non scaduto, non consumato).
    Usato dal frontend al rendering della pagina /partner/setup-password per:
      - Mostrare "Ciao {nome}" personalizzato
      - Mostrare errore se token già usato/scaduto
    NON consuma il token (è solo lettura).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    user = await db.users.find_one(
        {"partner_setup_token": body.token},
        {"_id": 0, "email": 1, "name": 1, "partner_setup_expires_at": 1, "partner_setup_consumed_at": 1},
    )
    if not user:
        return VerifyTokenResponse(ok=False, error="Link non valido o già utilizzato")

    if user.get("partner_setup_consumed_at"):
        return VerifyTokenResponse(ok=False, error="Link già utilizzato. Usa il login normale.")

    expires_at = user.get("partner_setup_expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                return VerifyTokenResponse(ok=False, error="Link scaduto. Contatta assistenza@evolution-pro.it per uno nuovo.")
        except Exception:
            pass  # se parse fallisce, lascia passare (best-effort)

    return VerifyTokenResponse(
        ok=True,
        email=user.get("email"),
        nome=user.get("name"),
        expires_at=expires_at,
    )


@router.post("/setup-password", response_model=SetupPasswordResponse)
async def setup_password(body: SetupPasswordRequest):
    """
    Consuma il token + salva la password scelta dal partner.

    Validazione:
      - Token esiste su un user
      - Non scaduto
      - Non consumato (replay protection)
      - Password >= 8 char (Pydantic gestisce)

    Effetti:
      - Hash bcrypt + salva su user.password_hash
      - Rimuove partner_setup_token (single-use, no re-trigger)
      - Imposta partner_setup_consumed_at = now
      - Imposta must_change_password = False
      - Restituisce JWT pronto per login automatico
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    user = await db.users.find_one({"partner_setup_token": body.token})
    if not user:
        raise HTTPException(400, "Token non valido o già utilizzato")

    if user.get("partner_setup_consumed_at"):
        raise HTTPException(400, "Token già utilizzato")

    expires_at = user.get("partner_setup_expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(400, "Token scaduto")
        except HTTPException:
            raise
        except Exception:
            pass

    # Hash + save + consume (atomic via update_one)
    hashed = bcrypt.hashpw(body.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now_iso = datetime.now(timezone.utc).isoformat()

    result = await db.users.update_one(
        {
            "id": user["id"],
            "partner_setup_token": body.token,
            "partner_setup_consumed_at": None,
        },
        {
            "$set": {
                "password_hash": hashed,
                # 🔴 FIX 30/7/2026 — scrivere ENTRAMBI i campi, non solo password_hash.
                # auth.py:211 (authenticate_user) legge
                #   user.get("hashed_password") or user.get("password_hash")
                # e `admin/setup-default-passwords` (server.py:10078) ha popolato
                # `hashed_password` in bulk su TUTTI i partner. Aggiornando solo
                # password_hash, il login continuava a validare contro l'hash
                # vecchio: il partner impostava la password dal magic link e
                # restava comunque fuori. /api/auth/change-password scriveva già
                # entrambi (server.py:9977) — qui mancava.
                "hashed_password": hashed,
                "must_change_password": False,
                "partner_setup_consumed_at": now_iso,
                "password_set_via_magic_link_at": now_iso,
            },
            "$unset": {"partner_setup_token": ""},  # invalida il token, replay impossibile
        },
    )

    if result.modified_count != 1:
        # Race condition: token consumato tra verify e setup. Idempotente.
        raise HTTPException(409, "Token già utilizzato (race condition). Prova il login normale.")

    logger.info(
        "[PARTNER-SETUP] password set per %s via magic link (user_id=%s)",
        user.get("email"), user.get("id"),
    )

    # Genera JWT per auto-login (stesso pattern di POST /api/auth/login)
    access_token = create_access_token(data={
        "sub": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role", "partner"),
    })

    return SetupPasswordResponse(
        ok=True,
        access_token=access_token,
        user={
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role", "partner"),
            "admin_type": user.get("admin_type"),
        },
    )
