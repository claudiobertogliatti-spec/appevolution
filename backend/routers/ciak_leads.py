"""
Ciak — Router lead capture (email opt-in).

Endpoint pubblico per l'opt-in alla masterclass / lead magnet:
  POST /api/ciak/lead-capture

Salva l'email in `ciak_leads` (upsert by email) ed emette il tag Systeme.io
`ciak_optin_masterclass` (+ UTM tags se presenti) in fire-and-forget. La
sequenza email di nurture e' configurata su Systeme.io a partire da quel tag.

Pattern coerente con routers/diagnostic.py:
  - db = None globale, set via set_db()
  - Pydantic inline
  - Async/await su Mongo, asyncio.create_task() per Systeme
"""
import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from services.ciak_systeme import ciak_emit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ciak", tags=["ciak-leads"])

# Iniettato da server.py via set_db()
db = None


def set_db(database) -> None:
    global db
    db = database


# ─── Models ────────────────────────────────────────────────────────────

# Source whitelist: previene tagging spazzatura (chiunque potrebbe POSTare).
ALLOWED_SOURCES = {
    "landing_hero",        # form email su / (hero)
    "landing_secondary",   # eventuale secondo form sulla / (sezione bassa)
    "masterclass_gate",    # gate fallback su /masterclass se utente arriva diretto
}

# Slug-safe UTM (Systeme tag names devono evitare caratteri strani).
_UTM_SLUG_RE = re.compile(r"[^a-z0-9_]+")


def _utm_slug(value: str) -> str:
    return _UTM_SLUG_RE.sub("_", value.strip().lower())[:40] or "unknown"


class LeadCaptureRequest(BaseModel):
    email: EmailStr
    source: str = Field(..., min_length=1, max_length=40)
    utm_source: Optional[str] = Field(None, max_length=80)
    utm_medium: Optional[str] = Field(None, max_length=80)
    utm_campaign: Optional[str] = Field(None, max_length=80)
    utm_term: Optional[str] = Field(None, max_length=80)
    utm_content: Optional[str] = Field(None, max_length=80)
    referrer: Optional[str] = Field(None, max_length=500)


class LeadCaptureResponse(BaseModel):
    ok: bool
    is_new: bool


# ─── Endpoint ──────────────────────────────────────────────────────────

@router.post("/lead-capture", response_model=LeadCaptureResponse)
async def lead_capture(payload: LeadCaptureRequest):
    """
    Cattura email opt-in. Idempotente su `email`:
      - Primo opt-in: insert + emit tag `ciak_optin_masterclass` (+ UTM tags).
      - Re-opt-in (stessa email): update `updated_at` + sources/UTM, NON ri-emette
        il tag (sarebbe rumore — Systeme gia' ha il contatto nella sequenza).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    source = payload.source if payload.source in ALLOWED_SOURCES else "unknown"
    if source == "unknown":
        logger.warning(f"[CIAK-LEADS] source non riconosciuto: {payload.source!r}")

    email = payload.email.lower()
    now = datetime.now(timezone.utc).isoformat()

    utm = {
        k: v for k, v in {
            "utm_source": payload.utm_source,
            "utm_medium": payload.utm_medium,
            "utm_campaign": payload.utm_campaign,
            "utm_term": payload.utm_term,
            "utm_content": payload.utm_content,
        }.items() if v
    }

    existing = await db.ciak_leads.find_one({"email": email})
    is_new = existing is None

    if is_new:
        doc = {
            "email": email,
            "source": source,
            "sources_seen": [source],
            "utm": utm,
            "referrer": payload.referrer,
            "first_event": "ciak_optin_masterclass",
            "created_at": now,
            "updated_at": now,
        }
        await db.ciak_leads.insert_one(doc)
    else:
        # Aggiorna ma preserva history: aggiunge source visto + ultimi UTM
        update = {
            "$set": {
                "updated_at": now,
                **({"utm": utm} if utm else {}),
                **({"referrer": payload.referrer} if payload.referrer else {}),
            },
            "$addToSet": {"sources_seen": source},
        }
        await db.ciak_leads.update_one({"email": email}, update)

    # Emetti tag Systeme SOLO al primo opt-in. Re-opt-in non rifa fire (lead e'
    # gia' in sequenza, ri-applicare il tag genererebbe duplicati nel workflow).
    if is_new:
        extra_tags = [f"source_{source}"]
        if utm.get("utm_source"):
            extra_tags.append(f"utm_source_{_utm_slug(utm['utm_source'])}")
        if utm.get("utm_campaign"):
            extra_tags.append(f"utm_campaign_{_utm_slug(utm['utm_campaign'])}")
        if utm.get("utm_medium"):
            extra_tags.append(f"utm_medium_{_utm_slug(utm['utm_medium'])}")

        asyncio.create_task(ciak_emit_event(
            email=email,
            event_name="ciak_optin_masterclass",
            extra_tags=extra_tags,
            metadata={"source": source, "utm": utm},
        ))

    return LeadCaptureResponse(ok=True, is_new=is_new)
