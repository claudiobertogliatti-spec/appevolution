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
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.editorial_calendar import build_editorial_calendar
from services.launch_calendar import calendar_checksum, normalize_launch_calendar

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/calendar", tags=["partner-calendar"])
security = HTTPBearer(auto_error=False)

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

POSIZIONAMENTO_STEP_ID = "04-posizionamento"
OUTLINE_STEP_ID = "06-outline-lezioni"


class GenerateBody(BaseModel):
    partner_id: str


class CreateCalendarVersionBody(BaseModel):
    start_date: date
    live_date: date


class UpdateCalendarDraftBody(BaseModel):
    expected_checksum: str
    calendar: dict


async def _step_data(partner_id: str, step_id: str) -> dict:
    step = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"_id": 0, "data": 1},
    )
    return (step or {}).get("data") or {}


async def _generate_version_calendar(partner_id: str, start_date: date, live_date: date) -> dict:
    """Genera e normalizza il contenuto immutabile di una nuova versione."""
    pos = await _step_data(partner_id, POSIZIONAMENTO_STEP_ID)
    answers = pos.get("answers") or {}
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: il calendario parte da lì.",
        )
    outline = (await _step_data(partner_id, OUTLINE_STEP_ID)).get("outline")
    generated = await build_editorial_calendar(answers, outline)
    try:
        return normalize_launch_calendar(generated, start_date, live_date)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


def _actor_id(actor) -> str:
    return str(getattr(actor, "user_id", None) or getattr(actor, "email", None) or "")


def _without_task_three_attestations(calendar: dict) -> dict:
    """Task 2 gestisce solo bozze: conferma partner e review admin arrivano dopo."""
    editable = dict(calendar)
    editable.pop("partner_confirmation", None)
    editable.pop("admin_approval", None)
    return editable


def _response_document(document: dict) -> dict:
    """Contratto pubblico stabile: le future chiavi Mongo restano interne."""
    public_fields = (
        "partner_id",
        "version",
        "status",
        "calendar",
        "checksum",
        "source",
        "created_at",
        "created_by",
        "partner_confirmed_at",
        "admin_review",
        "updated_at",
        "updated_by",
    )
    return {field: document[field] for field in public_fields if field in document}


@router.post("/generate")
async def generate_calendar(
    body: GenerateBody,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Genera il calendario editoriale dei 30 giorni dal Posizionamento + outline.

    Richiede che il Posizionamento sia almeno compilato (serve materiale per i temi).
    L'outline è opzionale: se c'è, i temi attingono ai titoli delle lezioni. In caso
    di AI giù, ritorna comunque uno scheletro utile.
    """
    from routers.partner_journey import require_partner_or_admin_for_partner
    await require_partner_or_admin_for_partner(body.partner_id, credentials)

    pos = await _step_data(body.partner_id, POSIZIONAMENTO_STEP_ID)
    answers = pos.get("answers") or {}
    if not (answers.get("metodo_nome") or answers.get("nicchia") or answers.get("promessa")):
        raise HTTPException(
            400,
            "Completa prima il Posizionamento: il calendario parte da lì.",
        )
    outline = (await _step_data(body.partner_id, OUTLINE_STEP_ID)).get("outline")
    return await build_editorial_calendar(answers, outline)


@router.post("/{partner_id}/versions", status_code=status.HTTP_201_CREATED)
async def create_calendar_version(
    partner_id: str,
    body: CreateCalendarVersionBody,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Crea sempre una nuova bozza, senza sovrascrivere le versioni precedenti."""
    from pymongo import ReturnDocument
    from routers.partner_journey import require_partner_or_admin_for_partner

    actor = await require_partner_or_admin_for_partner(partner_id, credentials)
    calendar = await _generate_version_calendar(partner_id, body.start_date, body.live_date)
    counter = await db.partner_launch_calendar_counters.find_one_and_update(
        {"_id": partner_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    version = int(counter["seq"])
    now = datetime.now(timezone.utc).isoformat()
    document = {
        "partner_id": partner_id,
        "version": version,
        "status": "draft",
        "calendar": calendar,
        "checksum": calendar_checksum(calendar),
        "source": calendar.get("source"),
        "created_at": now,
        "created_by": _actor_id(actor),
        "partner_confirmed_at": None,
        "admin_review": None,
    }
    await db.partner_launch_calendar_versions.insert_one(document)
    return _response_document(document)


@router.get("/{partner_id}/versions/current")
async def get_current_calendar_version(
    partner_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Restituisce l'ultima versione disponibile al partner o all'admin."""
    from routers.partner_journey import require_partner_or_admin_for_partner

    await require_partner_or_admin_for_partner(partner_id, credentials)
    document = await db.partner_launch_calendar_versions.find_one(
        {"partner_id": partner_id},
        {"_id": 0},
        sort=[("version", -1)],
    )
    if not document:
        raise HTTPException(404, "Nessuna versione del calendario disponibile")
    return _response_document(document)


@router.put("/{partner_id}/versions/{version}/draft")
async def update_calendar_draft(
    partner_id: str,
    version: int,
    body: UpdateCalendarDraftBody,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Aggiorna una bozza solo se il checksum osservato e' ancora quello corrente."""
    from pymongo import ReturnDocument
    from routers.partner_journey import require_partner_or_admin_for_partner

    actor = await require_partner_or_admin_for_partner(partner_id, credentials)
    existing = await db.partner_launch_calendar_versions.find_one(
        {"partner_id": partner_id, "version": version},
        {"_id": 0},
    )
    if not existing:
        raise HTTPException(404, "Versione del calendario non trovata")
    if existing.get("status") != "draft" or existing.get("checksum") != body.expected_checksum:
        raise HTTPException(409, "La bozza e' stata modificata altrove")

    editable = _without_task_three_attestations(body.calendar)
    source = existing.get("source") or (existing.get("calendar") or {}).get("source")
    editable["source"] = source
    try:
        start_date = date.fromisoformat(editable["start_date"])
        live_date = date.fromisoformat(editable["live_date"])
        calendar = normalize_launch_calendar(editable, start_date, live_date)
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(400, "Bozza calendario non valida") from exc
    checksum = calendar_checksum(calendar)
    document = await db.partner_launch_calendar_versions.find_one_and_update(
        {
            "partner_id": partner_id,
            "version": version,
            "status": "draft",
            "checksum": body.expected_checksum,
        },
        {
            "$set": {
                "calendar": calendar,
                "checksum": checksum,
                "source": source,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": _actor_id(actor),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not document:
        raise HTTPException(409, "La bozza e' stata modificata altrove")
    return _response_document(document)
