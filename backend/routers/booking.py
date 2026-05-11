"""
Ciak — Booking router (Cal.com).

Endpoint:
  POST /api/booking/webhook → riceve eventi Cal.com (booking.created, ended, cancelled)

Gestione eventi:
  BOOKING_CREATED       → state call_booked + email reminder programmate
  BOOKING_RESCHEDULED   → event log (state resta call_booked)
  BOOKING_CANCELLED     → tag ciak_call_cancelled (state non cambia, gestione admin)
  MEETING_ENDED         → state call_done

Configurazione Cal.com:
  Settings → Webhooks → New webhook
    URL: https://api.evolution-pro.it/api/booking/webhook
    Secret: env CALCOM_WEBHOOK_SECRET (HMAC-SHA256)
    Subscriber events: BOOKING_CREATED, BOOKING_RESCHEDULED,
                       BOOKING_CANCELLED, MEETING_ENDED

Identificazione lead: lookup per email dell'attendee → ultima diagnostic_session
con state purchased_67.

Riferimento: memory/funnel_67_analisi.md (flow booking).
"""
import hashlib
import hmac
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status

from services.ciak_state_machine import (
    STATE_CALL_BOOKED, STATE_CALL_DONE, STATE_PURCHASED_67,
    add_event, transition_to,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/booking", tags=["ciak-booking"])

db = None


def set_db(database) -> None:
    global db
    db = database


# ─── Signature verification ──────────────────────────────────────────

def _verify_signature(payload: bytes, signature: Optional[str], secret: str) -> bool:
    """Cal.com firma con HMAC-SHA256 hex digest sul body raw."""
    if not signature:
        return False
    expected = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# ─── Lead lookup ─────────────────────────────────────────────────────

async def _find_diagnostic_by_email(email: str) -> Optional[dict]:
    """
    Trova la diagnostic session più recente con questa email
    in stato purchased_67 o successivo.
    """
    cursor = db.diagnostic_sessions.find(
        {
            "user_email": email,
            "current_state": {
                "$in": [
                    STATE_PURCHASED_67,
                    STATE_CALL_BOOKED,
                    STATE_CALL_DONE,
                ]
            },
        }
    ).sort("created_at", -1).limit(1)

    docs = await cursor.to_list(length=1)
    return docs[0] if docs else None


def _extract_attendee_email(body: dict) -> Optional[str]:
    """
    Estrae email attendee dal payload Cal.com.
    Schema riferimento: payload.attendees[0].email oppure payload.responses.email.
    """
    payload = body.get("payload", {}) or {}

    attendees = payload.get("attendees") or []
    if attendees and isinstance(attendees, list):
        first = attendees[0]
        if isinstance(first, dict) and "email" in first:
            return first["email"]

    responses = payload.get("responses") or {}
    email_field = responses.get("email")
    if isinstance(email_field, dict):
        return email_field.get("value")
    if isinstance(email_field, str):
        return email_field

    # Fallback root-level
    return body.get("email")


# ═══════════════════════════════════════════════════════════════════
#  WEBHOOK
# ═══════════════════════════════════════════════════════════════════

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def calcom_webhook(request: Request):
    """
    Cal.com webhook handler.

    In produzione, configurare CALCOM_WEBHOOK_SECRET per validare la firma.
    Senza secret, il webhook accetta payload non firmati (solo dev mode).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    raw = await request.body()
    secret = os.environ.get("CALCOM_WEBHOOK_SECRET")

    if secret:
        sig = request.headers.get("X-Cal-Signature-256") or request.headers.get(
            "x-cal-signature-256"
        )
        if not _verify_signature(raw, sig, secret):
            logger.error("[CALCOM_WEBHOOK] Invalid signature")
            raise HTTPException(401, "Invalid signature")
    else:
        logger.warning("[CALCOM_WEBHOOK] CALCOM_WEBHOOK_SECRET non configurato — dev mode")

    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON")

    trigger_event = body.get("triggerEvent") or body.get("type") or ""

    # Estrai email per identificare il lead
    email = _extract_attendee_email(body)
    if not email:
        logger.warning("[CALCOM_WEBHOOK] Nessuna email attendee trovata: trigger=%s", trigger_event)
        return {"status": "ignored", "reason": "no_attendee_email"}

    diagnostic = await _find_diagnostic_by_email(email)
    if not diagnostic:
        logger.warning(
            "[CALCOM_WEBHOOK] Nessuna diagnostic session trovata per email=%s trigger=%s",
            email, trigger_event,
        )
        return {"status": "ignored", "reason": "no_matching_lead"}

    payload_data = body.get("payload", {}) or {}
    booking_id = payload_data.get("uid") or payload_data.get("id")

    if trigger_event == "BOOKING_CREATED":
        if diagnostic.get("current_state") != STATE_CALL_BOOKED:
            transition_to(
                diagnostic,
                STATE_CALL_BOOKED,
                event_metadata={
                    "booking_id": booking_id,
                    "starts_at": payload_data.get("startTime"),
                },
            )
        add_event(diagnostic, "calcom_booking_created", {
            "booking_id": booking_id,
            "starts_at": payload_data.get("startTime"),
        })

    elif trigger_event == "BOOKING_RESCHEDULED":
        add_event(diagnostic, "calcom_booking_rescheduled", {
            "booking_id": booking_id,
            "new_starts_at": payload_data.get("startTime"),
        })

    elif trigger_event == "BOOKING_CANCELLED":
        add_event(diagnostic, "calcom_booking_cancelled", {
            "booking_id": booking_id,
        })
        if "ciak_call_cancelled" not in diagnostic.get("crm_tags", []):
            diagnostic.setdefault("crm_tags", []).append("ciak_call_cancelled")

    elif trigger_event == "MEETING_ENDED":
        if diagnostic.get("current_state") != STATE_CALL_DONE:
            transition_to(
                diagnostic,
                STATE_CALL_DONE,
                event_metadata={"booking_id": booking_id},
            )
        add_event(diagnostic, "calcom_meeting_ended", {"booking_id": booking_id})

    else:
        logger.info("[CALCOM_WEBHOOK] Trigger ignorato: %s", trigger_event)
        return {"status": "ignored", "reason": "trigger_not_handled"}

    await db.diagnostic_sessions.replace_one(
        {"_id": diagnostic["_id"]},
        diagnostic,
    )

    # Fire-and-forget Systeme.io tag emission per eventi Cal.com.
    # Triggera email automation: pre-call reminder, post-call thank-you, no-show follow-up.
    import asyncio as _asyncio
    from services.ciak_systeme import ciak_emit_event as _ciak_emit_event
    _user_email = diagnostic.get("user_email") or email
    _systeme_event_map = {
        "BOOKING_CREATED":     "ciak_call_booked",
        "BOOKING_RESCHEDULED": "ciak_call_rescheduled",
        "BOOKING_CANCELLED":   "ciak_call_cancelled",
        "MEETING_ENDED":       "ciak_call_done",
    }
    _systeme_event = _systeme_event_map.get(trigger_event)
    if _user_email and _systeme_event:
        _asyncio.create_task(_ciak_emit_event(
            email=_user_email,
            event_name=_systeme_event,
            first_name=diagnostic.get("user_name"),
            metadata={
                "booking_id": booking_id,
                "trigger_event": trigger_event,
                "session_token": diagnostic.get("session_token"),
            },
        ))

    return {"status": "ok", "trigger": trigger_event}
