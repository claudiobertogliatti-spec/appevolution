"""Script AI della masterclass on-demand (Step05 — Valida, agente Andrea).

Endpoint partner:
  POST /api/partner/masterclass/generate   {partner_id}  → {titolo, durata_min, sezioni, source}

Legge le risposte del Posizionamento (step 04-posizionamento) e l'outline del corso
(step 06-outline-lezioni) e li trasforma nello script della masterclass in 7 blocchi.
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

from services.masterclass_script import build_masterclass_script

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/masterclass", tags=["partner-masterclass"])

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
async def generate_masterclass(body: GenerateBody) -> dict:
    """Genera lo script della masterclass dal Posizionamento + outline.

    Richiede che il Posizionamento sia almeno compilato. L'outline è opzionale:
    se c'è, il metodo attinge ai moduli del corso. In caso di AI giù, ritorna
    comunque uno scheletro utile.
    """
    pos = await _step_data(body.partner_id, POSIZIONAMENTO_STEP_ID)
    answers = pos.get("answers") or {}
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: la masterclass parte da lì.",
        )
    outline = (await _step_data(body.partner_id, OUTLINE_STEP_ID)).get("outline")
    script = await build_masterclass_script(answers, outline)
    return script
