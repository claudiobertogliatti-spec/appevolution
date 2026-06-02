"""Bozza AI della scaletta del corso (Step06 — Valida, agente Andrea).

Endpoint partner:
  POST /api/partner/outline/generate   {partner_id}  → scaletta strutturata

Legge le risposte del Posizionamento (step 04-posizionamento) e le trasforma in
una bozza di curriculum editabile. Il salvataggio dello step avviene col normale
flusso complete_operativo_step lato frontend (onComplete) — qui generiamo solo.

La generazione non blocca mai: il servizio ricade su uno scheletro deterministico.
"""
from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.curriculum_outline import build_curriculum_outline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/outline", tags=["partner-outline"])

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

POSIZIONAMENTO_STEP_ID = "04-posizionamento"


class GenerateBody(BaseModel):
    partner_id: str


async def _posizionamento_answers(partner_id: str) -> dict:
    step = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": POSIZIONAMENTO_STEP_ID},
        {"_id": 0, "data": 1},
    )
    return ((step or {}).get("data") or {}).get("answers") or {}


@router.post("/generate")
async def generate_outline(body: GenerateBody) -> dict:
    """Genera la bozza della scaletta dal Posizionamento del partner.

    Richiede che lo step Posizionamento sia almeno compilato (serve materiale
    per la bozza). In caso di AI giù, ritorna comunque uno scheletro utile.
    """
    answers = await _posizionamento_answers(body.partner_id)
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: la scaletta parte da lì.",
        )
    outline = await build_curriculum_outline(answers)
    return outline
