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
"""
import logging
from datetime import datetime, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from auth import create_access_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/partner", tags=["partner-setup"])

db = None


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


# ─── Endpoints ──────────────────────────────────────────────────────────

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
