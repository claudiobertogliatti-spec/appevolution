"""
Ciak — Iscrizione pubblica alla masterclass dal funnel di un partner.

  POST /api/partner-optin/{partner_id}

Serve ai funnel in bozza ospitati fuori da Systeme (es. il sito statico su Vercel di
Daniele Andolfi). Salva il contatto in `partner_leads` — la stessa collezione che alimenta
l'elenco lead e l'export CSV del partner — cosi' i contatti si possono trasferire in Systeme
quando il dominio sara' collegato.

Perche' non `/api/partner-journey/leads/webhook/{partner_id}`: accetta qualsiasi JSON, non
valida l'email, non registra il consenso e avvisa Telegram a ogni chiamata. Qui l'endpoint e'
pubblico, quindi:
  - il partner deve aver acceso `partners.public_optin.enabled` (gli id sono numeri
    progressivi: senza il flag chiunque potrebbe inserire lead finti a qualunque partner);
  - email validata, campi con lunghezza massima, nessun JSON grezzo salvato;
  - consenso obbligatorio e registrato con data;
  - campo trappola `website`: se compilato non si salva nulla (risposta identica);
  - tetto orario per partner, cosi' un abuso non diventa spam su Telegram.
"""
import asyncio
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-optin", tags=["partner-optin"])

# Iniettato da server.py via set_db()
db = None

SOURCE = "funnel_bozza_vercel"
DEFAULT_ORIGIN = "masterclass"
MAX_PER_HOUR = 120
_PHONE_RE = re.compile(r"[^0-9+ ()./-]")


def set_db(database) -> None:
    global db
    db = database


class OptinRequest(BaseModel):
    nome: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    telefono: Optional[str] = Field(None, max_length=40)
    consenso: bool = False
    # Campo trappola: un utente vero non lo vede, un bot lo compila.
    website: Optional[str] = Field(None, max_length=200)
    pagina: Optional[str] = Field(None, max_length=300)
    referrer: Optional[str] = Field(None, max_length=500)
    utm_source: Optional[str] = Field(None, max_length=80)
    utm_medium: Optional[str] = Field(None, max_length=80)
    utm_campaign: Optional[str] = Field(None, max_length=80)


class OptinResponse(BaseModel):
    ok: bool


async def _find_partner(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        try:
            partner = await db.partners.find_one({"id": int(partner_id)}, {"_id": 0})
        except ValueError:
            partner = None
    return partner


@router.post("/{partner_id}", response_model=OptinResponse)
async def partner_optin(partner_id: str, payload: OptinRequest):
    if db is None:
        raise HTTPException(503, "Database non configurato")

    # 404 identico per "non esiste" e "non abilitato": non si indovina chi ha il funnel acceso.
    partner = await _find_partner(partner_id)
    cfg = (partner or {}).get("public_optin") or {}
    if not partner or cfg.get("enabled") is not True:
        raise HTTPException(404, "Non trovato")

    if payload.website:  # bot: finge successo, non salva
        return OptinResponse(ok=True)
    if payload.consenso is not True:
        raise HTTPException(422, "Serve il consenso al trattamento dei dati")

    pid = str(partner.get("id", partner_id))
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    recenti = await db.partner_leads.count_documents({
        "partner_id": pid, "source": SOURCE,
        "created_at": {"$gte": (now - timedelta(hours=1)).isoformat()},
    })
    if recenti >= MAX_PER_HOUR:
        raise HTTPException(429, "Troppe richieste, riprova tra poco")

    email = str(payload.email).lower()
    telefono = _PHONE_RE.sub("", payload.telefono or "").strip() or None
    existing = await db.partner_leads.find_one({"partner_id": pid, "email": email})
    if existing:
        await db.partner_leads.update_one(
            {"partner_id": pid, "email": email},
            {
                "$set": {"last_interaction": now_iso},
                "$push": {"interactions": {"timestamp": now_iso, "type": "optin"}},
            },
        )
        return OptinResponse(ok=True)

    utm = {k: v for k, v in {
        "utm_source": payload.utm_source,
        "utm_medium": payload.utm_medium,
        "utm_campaign": payload.utm_campaign,
    }.items() if v}
    origin = str(cfg.get("funnel_origin") or DEFAULT_ORIGIN)[:60]
    await db.partner_leads.insert_one({
        "id": str(uuid.uuid4()),
        "partner_id": pid,
        "name": payload.nome.strip(),
        "email": email,
        "phone": telefono,
        "funnel_origin": origin,
        "status": "new",
        "source": SOURCE,
        "utm": utm,
        "referrer": payload.referrer,
        "pagina": payload.pagina,
        "consent": {"accepted": True, "at": now_iso, "informativa": "privacy.html"},
        "created_at": now_iso,
    })

    try:  # l'avviso non deve mai far fallire l'iscrizione, e non porta l'email
        from routers.partner_journey import notify_telegram
        asyncio.create_task(notify_telegram(
            f"🎯 Nuova iscrizione masterclass\n👤 Partner: {partner.get('name')}\n📍 Origine: {origin}"
        ))
    except Exception:  # noqa: BLE001
        logger.warning("[PARTNER-OPTIN] avviso Telegram non inviato", exc_info=True)

    return OptinResponse(ok=True)
