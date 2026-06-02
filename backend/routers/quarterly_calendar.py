"""Calendario editoriale di REGIME — il piano trimestrale (90 giorni) della fase Ottimizza.

Endpoint partner (hub Ottimizza, card "Calendario 90 giorni"):
  GET  /api/partner-journey/calendario-trimestrale/{partner_id}  -> piano salvato (o null)
  POST /api/partner-journey/calendario-trimestrale/{partner_id}  -> genera, salva e ritorna

Legge il Posizionamento (step 04-posizionamento) e l'outline del corso (step 06-outline-lezioni)
e li passa al motore services/quarterly_calendar.py (AI tool-use + fallback deterministico).
A regime il corso e gia online: il piano e 3 cicli mensili (15gg vendita corso + 15gg riempimento
webinar). Il calendario generato viene persistito cosi il partner non lo rigenera ad ogni apertura.

La generazione non blocca mai: il servizio ricade su uno scheletro deterministico.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from services.quarterly_calendar import build_quarterly_calendar

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-journey", tags=["partner-quarterly-calendar"])

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

POSIZIONAMENTO_STEP_ID = "04-posizionamento"
OUTLINE_STEP_ID = "06-outline-lezioni"


async def _step_data(partner_id: str, step_id: str) -> dict:
    step = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"_id": 0, "data": 1},
    )
    return (step or {}).get("data") or {}


@router.get("/calendario-trimestrale/{partner_id}")
async def get_quarterly_calendar(partner_id: str) -> dict:
    """Ritorna il piano trimestrale salvato, o calendar=null se non ancora generato."""
    doc = await db.partner_quarterly_calendar.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    return {
        "calendar": (doc or {}).get("calendar"),
        "generated_at": (doc or {}).get("generated_at"),
    }


@router.post("/calendario-trimestrale/{partner_id}")
async def generate_quarterly_calendar(partner_id: str) -> dict:
    """Genera il piano da 90 giorni dal Posizionamento + outline, lo salva e lo ritorna.

    Richiede che il Posizionamento sia almeno compilato (serve materiale per i temi).
    L'outline e opzionale: se c'e, i temi ruotano sui titoli delle lezioni. AI giu => scheletro.
    """
    pos = await _step_data(partner_id, POSIZIONAMENTO_STEP_ID)
    answers = pos.get("answers") or {}
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: il calendario parte da lì.",
        )
    outline = (await _step_data(partner_id, OUTLINE_STEP_ID)).get("outline")
    calendar = await build_quarterly_calendar(answers, outline)

    now = datetime.now(timezone.utc).isoformat()
    await db.partner_quarterly_calendar.update_one(
        {"partner_id": partner_id},
        {
            "$set": {"calendar": calendar, "generated_at": now},
            "$setOnInsert": {"partner_id": partner_id, "created_at": now},
        },
        upsert=True,
    )
    return {"calendar": calendar, "generated_at": now}
