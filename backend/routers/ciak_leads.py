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

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from services.ciak_systeme import ciak_emit_event
from services.meta_capi import send_lead_event

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
    "masterclass_landing", # landing principale /masterclass
}
ALLOWED_MASTERCLASS_EVENTS = {
    "video_started", "video_25", "video_50", "video_75", "video_completed",
    "cta_shown", "cta_clicked",
}

# Slug-safe UTM (Systeme tag names devono evitare caratteri strani).
_UTM_SLUG_RE = re.compile(r"[^a-z0-9_]+")


def _utm_slug(value: str) -> str:
    return _UTM_SLUG_RE.sub("_", value.strip().lower())[:40] or "unknown"


class LeadCaptureRequest(BaseModel):
    email: EmailStr
    nome: Optional[str] = Field(None, max_length=120)
    # Telefono: opzionale lato server (i form Landing non lo raccolgono), ma
    # obbligatorio lato client nel gate masterclass (validazione frontend).
    telefono: Optional[str] = Field(None, max_length=40)
    source: str = Field(..., min_length=1, max_length=40)
    utm_source: Optional[str] = Field(None, max_length=80)
    utm_medium: Optional[str] = Field(None, max_length=80)
    utm_campaign: Optional[str] = Field(None, max_length=80)
    utm_term: Optional[str] = Field(None, max_length=80)
    utm_content: Optional[str] = Field(None, max_length=80)
    referrer: Optional[str] = Field(None, max_length=500)
    event_source_url: Optional[str] = Field(None, max_length=1000)
    marketing_consent: bool = False
    # Deduplica CAPI (evento Lead): stesso event_id del pixel browser + cookie
    # Meta per il match. Tutti opzionali (assenti se manca il consenso marketing).
    event_id: Optional[str] = Field(None, max_length=100)
    fbp: Optional[str] = Field(None, max_length=200)
    fbc: Optional[str] = Field(None, max_length=400)


class LeadCaptureResponse(BaseModel):
    ok: bool
    is_new: bool


class MasterclassEventRequest(BaseModel):
    viewer_id: str = Field(..., min_length=8, max_length=100)
    event: str = Field(..., min_length=1, max_length=40)
    email: Optional[EmailStr] = None
    video_id: str = Field(..., min_length=1, max_length=40)
    progress: Optional[int] = Field(None, ge=0, le=100)
    source_url: Optional[str] = Field(None, max_length=1000)


@router.post("/masterclass-event")
async def masterclass_event(payload: MasterclassEventRequest):
    """Registra gli snodi reali del viewer, idempotenti per viewer ed evento."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    if payload.event not in ALLOWED_MASTERCLASS_EVENTS:
        raise HTTPException(422, "Evento masterclass non valido")
    now = datetime.now(timezone.utc).isoformat()
    key = {"viewer_id": payload.viewer_id, "event": payload.event, "video_id": payload.video_id}
    await db.ciak_masterclass_events.update_one(key, {"$setOnInsert": {
        **key,
        "email": str(payload.email).lower() if payload.email else None,
        "progress": payload.progress,
        "source_url": payload.source_url,
        "created_at": now,
    }}, upsert=True)
    return {"ok": True}


# ─── Endpoint ──────────────────────────────────────────────────────────

@router.post("/lead-capture", response_model=LeadCaptureResponse)
async def lead_capture(payload: LeadCaptureRequest, request: Request):
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
    nome = (payload.nome or "").strip() or None
    telefono = (payload.telefono or "").strip() or None
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
            "nome": nome,
            "telefono": telefono,
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
        # Aggiorna ma preserva history: aggiunge source visto + ultimi UTM.
        # Il nome si aggiorna solo se fornito e non già presente (non
        # sovrascrive un nome esistente con uno vuoto).
        update = {
            "$set": {
                "updated_at": now,
                **({"utm": utm} if utm else {}),
                **({"referrer": payload.referrer} if payload.referrer else {}),
                **({"nome": nome} if nome and not existing.get("nome") else {}),
                **({"telefono": telefono} if telefono and not existing.get("telefono") else {}),
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
            first_name=nome,
            extra_tags=extra_tags,
            metadata={"source": source, "utm": utm, "telefono": telefono},
        ))

        # Evento Lead → Meta CAPI (server-side), solo al primo opt-in e con
        # consenso marketing esplicito. La CAPI migliora l'affidabilita' del
        # segnale ma non deve aggirare la scelta espressa nel cookie banner.
        # Dedup con il pixel browser via event_id. IP/UA da header (Cloud Run
        # è dietro proxy → X-Forwarded-For). Fire-and-forget: non blocca l'opt-in.
        if payload.marketing_consent:
            xff = request.headers.get("x-forwarded-for", "")
            client_ip = xff.split(",")[0].strip() if xff else (
                request.client.host if request.client else None
            )
            asyncio.create_task(send_lead_event(
                event_id=payload.event_id,
                email=email,
                event_source_url=payload.event_source_url,
                client_ip=client_ip,
                client_user_agent=request.headers.get("user-agent"),
                fbp=payload.fbp,
                fbc=payload.fbc,
            ))

    return LeadCaptureResponse(ok=True, is_new=is_new)
