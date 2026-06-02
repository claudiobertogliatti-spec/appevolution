"""Strategia AI webinar + prezzo del corso (Step12 — Valida, agente Andrea).

Endpoint partner:
  POST /api/partner/webinar/generate   {partner_id}  → {webinar, prezzo, source}

Legge le risposte del Posizionamento (step 04-posizionamento) e l'outline del corso
(step 06-outline-lezioni) e li trasforma nello script del webinar live + nel prezzo
con promo a scadenza. Il salvataggio dello step avviene col normale flusso
complete_operativo_step lato frontend (onComplete) — qui generiamo solo.

La generazione non blocca mai: il servizio ricade su uno scheletro deterministico.
"""
from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.webinar_strategy import build_webinar_strategy
from services.webinar_deck import (
    build_webinar_deck,
    export_deck_to_gamma,
    poll_gamma_generation,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/webinar", tags=["partner-webinar"])

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

POSIZIONAMENTO_STEP_ID = "04-posizionamento"
OUTLINE_STEP_ID = "06-outline-lezioni"
WEBINAR_STEP_ID = "12-prezzo-webinar"


class GenerateBody(BaseModel):
    partner_id: str


class ExportDeckBody(BaseModel):
    partner_id: str
    deck: dict | None = None


async def _step_data(partner_id: str, step_id: str) -> dict:
    step = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"_id": 0, "data": 1},
    )
    return (step or {}).get("data") or {}


@router.post("/generate")
async def generate_webinar(body: GenerateBody) -> dict:
    """Genera lo script del webinar + il prezzo dal Posizionamento + outline.

    Richiede che il Posizionamento sia almeno compilato. L'outline è opzionale:
    se c'è, prezzo e bonus attingono al corso. In caso di AI giù, ritorna comunque
    uno scheletro utile.
    """
    pos = await _step_data(body.partner_id, POSIZIONAMENTO_STEP_ID)
    answers = pos.get("answers") or {}
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: il webinar parte da lì.",
        )
    outline = (await _step_data(body.partner_id, OUTLINE_STEP_ID)).get("outline")
    strategia = await build_webinar_strategy(answers, outline)
    return strategia


@router.post("/deck")
async def generate_deck(body: GenerateBody) -> dict:
    """Genera il DECK del webinar slide-per-slide dal Posizionamento + outline +
    strategia gia' approvata (Step12). Coerente con lo script, non riparte da zero."""
    pos = await _step_data(body.partner_id, POSIZIONAMENTO_STEP_ID)
    answers = pos.get("answers") or {}
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: il deck parte da lì.",
        )
    outline = (await _step_data(body.partner_id, OUTLINE_STEP_ID)).get("outline")
    strategia = (await _step_data(body.partner_id, WEBINAR_STEP_ID)).get("strategia")
    deck = await build_webinar_deck(answers, outline, strategia)
    return deck


@router.post("/deck/export")
async def export_deck(body: ExportDeckBody) -> dict:
    """Esporta il deck su Gamma (servizio EXTRA). Se non c'è GAMMA_API_KEY ritorna
    il markdown pronto da incollare in Gamma. Il deck può arrivare dal client
    (modifiche del partner) o, se assente, viene rigenerato."""
    deck = body.deck
    if not isinstance(deck, dict) or not (deck.get("slides")):
        pos = await _step_data(body.partner_id, POSIZIONAMENTO_STEP_ID)
        answers = pos.get("answers") or {}
        outline = (await _step_data(body.partner_id, OUTLINE_STEP_ID)).get("outline")
        strategia = (await _step_data(body.partner_id, WEBINAR_STEP_ID)).get("strategia")
        deck = await build_webinar_deck(answers, outline, strategia)
    return await export_deck_to_gamma(deck)


@router.get("/deck/export/{generation_id}")
async def export_deck_status(generation_id: str) -> dict:
    """Stato di una generazione Gamma: pending|completed|failed|unknown (+ gamma_url)."""
    return await poll_gamma_generation(generation_id)
