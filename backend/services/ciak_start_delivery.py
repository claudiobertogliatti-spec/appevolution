"""Consegna transazionale e recovery per un acquisto Ciak Start."""

from __future__ import annotations

import asyncio
import logging
import os
import smtplib
from datetime import datetime, timezone
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from uuid import uuid4

from services.ciak_client_accounts import create_magic_login_token

# Guida videocorso in omaggio: allegata all'email Start SOLO se l'acquisto avviene
# entro la finestra bonus 48h (paid_at <= bonus_expires_at). L'asset e' nel repo.
_ASSET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
_GUIDE_FILENAME = "guida-videocorso-che-vende.pdf"
_GUIDE_ATTACH_NAME = "Guida-Come-creare-un-videocorso-che-vende.pdf"


def _load_guide_pdf() -> bytes | None:
    try:
        with open(os.path.join(_ASSET_DIR, _GUIDE_FILENAME), "rb") as fh:
            return fh.read()
    except OSError:
        return None


def _bonus_guida_earned(bonus_expires_at, paid_at) -> bool:
    """Il bonus e' maturato se l'acquisto (paid_at) e' avvenuto entro la finestra
    (bonus_expires_at). Basato su paid_at, non su 'ora': resta corretto anche in
    un retry di consegna successivo alla scadenza."""
    if not bonus_expires_at or not paid_at:
        return False
    try:
        exp = datetime.fromisoformat(str(bonus_expires_at).replace("Z", "+00:00"))
        paid = datetime.fromisoformat(str(paid_at).replace("Z", "+00:00"))
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if paid.tzinfo is None:
            paid = paid.replace(tzinfo=timezone.utc)
        return paid <= exp
    except (ValueError, TypeError):
        return False

# Le tre date promesse qui sotto sono le stesse che il pannello admin delle
# consegne mostra al team: sorgente unica in `ciak_start_milestones`. Se le due
# si sdoppiassero, il cliente e il team leggerebbero scadenze diverse — e la
# versione giusta e' sempre quella nell'email del cliente.
from services.ciak_start_milestones import format_delivery_dates as _delivery_dates

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _send_email(
    email: str,
    name: str | None,
    access_url: str,
    paid_at: str,
    guide_pdf: bytes | None = None,
) -> tuple[bool, str | None]:
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    if not user or not password:
        return False, "SMTP non configurato"

    safe_name = (name or "").strip() or "Ciao"
    d1, d2, d3 = _delivery_dates(paid_at)
    bonus_line = (
        "\nIn regalo per aver iniziato subito: in allegato trovi la guida "
        "\"Come creare un videocorso che vende davvero\" (40 pagine).\n"
        if guide_pdf
        else ""
    )
    plain = f"""Ciao {safe_name},

il pagamento di 390 euro e' arrivato e Ciak Start e' attivo.

Accedi alla tua area da qui:
{access_url}

Le tre tappe previste sono:
1. Posizionamento e brand entro il {d1}.
2. Profili social e sito vetrina entro il {d2}.
3. Strategia contenuti e calendario 90 giorni entro il {d3}.

I 390 euro saranno scalati interamente se passerai alla Partnership.
{bonus_line}
Se il link non funziona, rispondi a questa email.

Claudio
"""
    html = plain.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    body = MIMEMultipart("alternative")
    body.attach(MIMEText(plain, "plain", "utf-8"))
    body.attach(MIMEText(html, "html", "utf-8"))
    if guide_pdf:
        message = MIMEMultipart("mixed")
        message.attach(body)
        part = MIMEBase("application", "pdf")
        part.set_payload(guide_pdf)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{_GUIDE_ATTACH_NAME}"')
        message.attach(part)
    else:
        message = body
    message["From"] = os.environ.get("CIAK_EMAIL_FROM", f"Claudio Bertogliatti <{user}>")
    message["To"] = email
    message["Reply-To"] = os.environ.get("CIAK_EMAIL_REPLY_TO", "info@evolution-pro.it")
    message["Subject"] = f"{safe_name}, Ciak Start e' attivo"
    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(message)
        return True, None
    except Exception as exc:  # noqa: BLE001 - l'esito viene auditato e recuperato
        return False, str(exc)


async def _record_recovery(db, *, client_id: str, email: str, checkout_session_id: str, error: str) -> None:
    await db.ciak_client_access_recovery.update_one(
        {"tier": "start", "checkout_session_id": checkout_session_id},
        {"$set": {
            "id": str(uuid4()),
            "tier": "start",
            "client_id": client_id,
            "email": email,
            "checkout_session_id": checkout_session_id,
            "status": "pending",
            "error": error[:1000],
            "updated_at": _now(),
            "created_at": _now(),
        }},
        upsert=True,
    )


async def deliver_start_access(
    db,
    *,
    client_id: str,
    email: str,
    name: str | None,
    paid_at: str,
    checkout_session_id: str,
) -> bool:
    """Crea un token monouso, invia la mail e rende ogni fallimento recuperabile."""
    audit = {
        "id": str(uuid4()),
        "client_id": client_id,
        "email": email or "",
        "tier": "start",
        "checkout_session_id": checkout_session_id,
        "attempt": 1,
        "sent": False,
        "sent_via": "smtp",
        "error": None,
        "at": _now(),
        "sent_at": None,
    }
    if not email or "@" not in email:
        audit["error"] = "email mancante/non valida"
        await db.ciak_onboarding_emails.insert_one(audit)
        await _record_recovery(
            db, client_id=client_id, email=email or "", checkout_session_id=checkout_session_id,
            error=audit["error"],
        )
        return False

    # Guida in omaggio: allegata solo se l'acquisto e' entro la finestra 48h e non
    # e' gia' stata consegnata (idempotente sui retry). Non deve mai bloccare la
    # consegna dell'accesso Start: se qualcosa va storto, si procede senza allegato.
    guide_pdf = None
    try:
        cdoc = await db.ciak_clients.find_one(
            {"id": client_id},
            {"_id": 0, "bonus_expires_at": 1, "bonus_guida_consegnata_at": 1},
        )
        if (
            cdoc
            and not cdoc.get("bonus_guida_consegnata_at")
            and _bonus_guida_earned(cdoc.get("bonus_expires_at"), paid_at)
        ):
            guide_pdf = _load_guide_pdf()
    except Exception as exc:  # noqa: BLE001 - il bonus non blocca la consegna Start
        logger.warning("[CIAK_START] check bonus guida fallito per %s: %s", client_id, exc)
        guide_pdf = None

    try:
        login = await create_magic_login_token(db, client_id, email)
        base_url = os.environ.get("CIAK_BASE_URL", "https://www.ciak.io").rstrip("/")
        access_url = f"{base_url}/cliente/accesso?token={login['token']}"
        sent, error = await asyncio.to_thread(_send_email, email, name, access_url, paid_at, guide_pdf)
    except Exception as exc:  # noqa: BLE001 - persistenza recovery obbligatoria
        sent, error = False, str(exc)

    audit.update({"sent": sent, "error": error, "sent_at": _now() if sent else None})
    await db.ciak_onboarding_emails.insert_one(audit)
    if not sent:
        await _record_recovery(
            db, client_id=client_id, email=email, checkout_session_id=checkout_session_id,
            error=error or "invio non riuscito",
        )
    elif guide_pdf:
        try:
            await db.ciak_clients.update_one(
                {"id": client_id, "bonus_guida_consegnata_at": {"$in": [None, ""]}},
                {"$set": {"bonus_guida_consegnata_at": _now()}},
            )
        except Exception as exc:  # noqa: BLE001 - il flag e' informativo, non critico
            logger.warning("[CIAK_START] flag bonus guida non salvato per %s: %s", client_id, exc)
    return sent
