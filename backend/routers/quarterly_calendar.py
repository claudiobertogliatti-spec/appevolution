"""Calendari della fase Ottimizza (hub post-lancio).

Due motori, stesso hub:

1) Calendario "tra le live" (ex trimestrale, 90 giorni) — il ponte di nutrimento tra una live
   e l'altra. NON e il Calendario 1 del lancio (quello e in editorial_calendar.py, Mese 1).
     GET  /api/partner-journey/calendario-trimestrale/{partner_id}
     POST /api/partner-journey/calendario-trimestrale/{partner_id}

2) Ciclo Live 8 settimane — il motore ricorrente "una live ogni 2 mesi"
   (docs/strategy/playbook-partner-6-mesi.md, Sezione 6).
     GET  /api/partner-journey/ciclo-live/{partner_id}
     POST /api/partner-journey/ciclo-live/{partner_id}
     POST /api/partner-journey/ciclo-live/{partner_id}/data-live

Entrambi leggono il Posizionamento (step 04-posizionamento) e l'outline del corso
(step 06-outline-lezioni) e li passano ai motori in services/ (AI tool-use + fallback
deterministico). La generazione non blocca mai: ricade su uno scheletro deterministico.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from services.quarterly_calendar import build_quarterly_calendar
from services.live_cycle import build_live_cycle

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


# ─────────────────────────────────────────────────────────────────────────────
# Ciclo Live 8 settimane — il motore ricorrente "una live ogni 2 mesi".
# Strategia: docs/strategy/playbook-partner-6-mesi.md, Sezione 6.
# Vive nello stesso hub Ottimizza, card "Live ogni 2 mesi".
# ─────────────────────────────────────────────────────────────────────────────


def _settimane_alla_live(prossima_live_at: str | None) -> int | None:
    """Settimane intere mancanti alla prossima live (None se non fissata, 0 se passata)."""
    if not prossima_live_at:
        return None
    try:
        target = datetime.fromisoformat(prossima_live_at)
    except (TypeError, ValueError):
        return None
    if target.tzinfo is None:
        target = target.replace(tzinfo=timezone.utc)
    delta = target - datetime.now(timezone.utc)
    if delta.total_seconds() <= 0:
        return 0
    return max(0, int(delta.days // 7))


@router.get("/ciclo-live/{partner_id}")
async def get_live_cycle(partner_id: str) -> dict:
    """Ritorna il ciclo live salvato (o cycle=null) + la prossima live e le settimane mancanti."""
    doc = await db.partner_live_cycle.find_one({"partner_id": partner_id}, {"_id": 0})
    prossima = (doc or {}).get("prossima_live_at")
    return {
        "cycle": (doc or {}).get("cycle"),
        "generated_at": (doc or {}).get("generated_at"),
        "prossima_live_at": prossima,
        "settimane_alla_live": _settimane_alla_live(prossima),
    }


@router.post("/ciclo-live/{partner_id}")
async def generate_live_cycle(partner_id: str) -> dict:
    """Genera il ciclo live da 8 settimane dal Posizionamento + outline, lo salva e lo ritorna.

    Richiede che il Posizionamento sia almeno compilato. Se non c'e ancora una data live
    fissata, ne propone una di default a 8 settimane da oggi (il partner puo cambiarla).
    """
    pos = await _step_data(partner_id, POSIZIONAMENTO_STEP_ID)
    answers = pos.get("answers") or {}
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: il ciclo live parte da lì.",
        )
    outline = (await _step_data(partner_id, OUTLINE_STEP_ID)).get("outline")
    cycle = await build_live_cycle(answers, outline)

    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    existing = await db.partner_live_cycle.find_one(
        {"partner_id": partner_id}, {"_id": 0, "prossima_live_at": 1}
    )
    prossima = (existing or {}).get("prossima_live_at") or (now_dt + timedelta(weeks=8)).isoformat()

    await db.partner_live_cycle.update_one(
        {"partner_id": partner_id},
        {
            "$set": {"cycle": cycle, "generated_at": now, "prossima_live_at": prossima},
            "$setOnInsert": {"partner_id": partner_id, "created_at": now},
        },
        upsert=True,
    )
    return {
        "cycle": cycle,
        "generated_at": now,
        "prossima_live_at": prossima,
        "settimane_alla_live": _settimane_alla_live(prossima),
    }


@router.post("/ciclo-live/{partner_id}/data-live")
async def set_live_date(partner_id: str, payload: dict = Body(...)) -> dict:
    """Fissa/aggiorna la data della prossima live (ISO date/datetime nel campo 'data')."""
    raw = (payload or {}).get("data")
    if not raw:
        raise HTTPException(400, "Manca la data della live.")
    try:
        target = datetime.fromisoformat(str(raw))
    except (TypeError, ValueError):
        raise HTTPException(400, "Data non valida: usa il formato AAAA-MM-GG.")
    if target.tzinfo is None:
        target = target.replace(tzinfo=timezone.utc)
    iso = target.isoformat()
    now = datetime.now(timezone.utc).isoformat()
    await db.partner_live_cycle.update_one(
        {"partner_id": partner_id},
        {
            "$set": {"prossima_live_at": iso, "updated_at": now},
            "$setOnInsert": {"partner_id": partner_id, "created_at": now},
        },
        upsert=True,
    )
    return {"prossima_live_at": iso, "settimane_alla_live": _settimane_alla_live(iso)}
