"""Calendario editoriale AI dei 30 giorni di lancio (Step11 — Valida, agente Andrea).

Endpoint partner:
  POST /api/partner/calendar/generate   {partner_id}  → calendario strutturato

Legge le risposte del Posizionamento (step 04-posizionamento) e l'outline del corso
(step 06-outline-lezioni) e li trasforma nel piano editoriale dei 30 giorni di lancio.
Il salvataggio dello step avviene col normale flusso complete_operativo_step lato
frontend (onComplete) — qui generiamo solo.

La generazione non blocca mai: il servizio ricade su uno scheletro deterministico.
"""
from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.editorial_calendar import build_editorial_calendar

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/calendar", tags=["partner-calendar"])

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

POSIZIONAMENTO_STEP_ID = "04-posizionamento"
OUTLINE_STEP_ID = "06-outline-lezioni"


class GenerateBody(BaseModel):
    partner_id: str


async def _step_data(partner_id: str, step_id: str) -> dict:
    step = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"_id": 0, "data": 1},
    )
    return (step or {}).get("data") or {}


@router.post("/generate")
async def generate_calendar(body: GenerateBody) -> dict:
    """Genera il calendario editoriale dei 30 giorni dal Posizionamento + outline.

    Richiede che il Posizionamento sia almeno compilato (serve materiale per i temi).
    L'outline è opzionale: se c'è, i temi attingono ai titoli delle lezioni. In caso
    di AI giù, ritorna comunque uno scheletro utile.
    """
    pos = await _step_data(body.partner_id, POSIZIONAMENTO_STEP_ID)
    answers = pos.get("answers") or {}
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: il calendario parte da lì.",
        )
    outline = (await _step_data(body.partner_id, OUTLINE_STEP_ID)).get("outline")
    calendario = await build_editorial_calendar(answers, outline)
    return calendario
