"""Client Brevo (email transazionale) per l'outreach dell'acquisizione.

Brevo = motore degli INVII di acquisizione (email 1:1 tracciate + campagne a segmenti).
Register (SMTP) resta il transazionale di sistema; Systeme resta le automazioni per stato.
Fail-closed: senza BREVO_API_KEY non invia (ritorna configured=False), nessun crash.
"""
from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def is_brevo_configured() -> bool:
    return bool(os.environ.get("BREVO_API_KEY"))


async def send_email(
    to_email: str,
    to_name: str | None,
    subject: str,
    html: str,
    sender_email: str | None = None,
    sender_name: str = "Evolution PRO",
) -> dict:
    """Invia una email 1:1 via Brevo. Ritorna {configured, ok?, message_id?/error?}."""
    key = os.environ.get("BREVO_API_KEY")
    if not key:
        return {"configured": False, "note": "BREVO_API_KEY non configurata"}
    sender_email = sender_email or os.environ.get("BREVO_SENDER_EMAIL") or "info@evolution-pro.it"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                BREVO_URL,
                headers={"api-key": key, "content-type": "application/json", "accept": "application/json"},
                json={
                    "sender": {"email": sender_email, "name": sender_name},
                    "to": [{"email": to_email, "name": to_name or to_email}],
                    "subject": subject,
                    "htmlContent": html,
                },
            )
        if r.status_code >= 300:
            logger.warning(f"[BREVO] invio a {to_email} fallito {r.status_code}: {r.text[:200]}")
            return {"configured": True, "ok": False, "error": r.text[:300]}
        data = r.json() if r.content else {}
        return {"configured": True, "ok": True, "message_id": data.get("messageId")}
    except Exception as e:  # noqa: BLE001
        logger.error(f"[BREVO] errore invio a {to_email}: {e}")
        return {"configured": True, "ok": False, "error": str(e)[:300]}
