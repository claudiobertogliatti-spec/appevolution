"""Ponte Posizionamento → I Miei File + coda approvazione admin.

Endpoint partner:
  POST /api/partner/posizionamento/finalize
  GET  /api/partner/posizionamento/document/{partner_id}

Endpoint admin (registrati separatamente — IN ARRIVO Bundle 3):
  GET  /api/admin/approvazioni/queue
  POST /api/admin/approvazioni/{file_id}/approve
  POST /api/admin/approvazioni/{file_id}/reject

Vedi spec: docs/superpowers/specs/2026-05-30-ponte-posizionamento-approvazione-design.md
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.posizionamento_pdf_renderer import genera_posizionamento_pdf
from services.posizionamento_storage import upload_posizionamento_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/posizionamento", tags=["partner-posizionamento"])
admin_router = APIRouter(prefix="/api/admin/approvazioni", tags=["admin-approvazioni"])

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

STEP_ID = "04-posizionamento"


async def _complete_journey_step(partner_id: str, step_id: str, data: dict) -> None:
    """Chiama internamente la stessa logica di complete_operativo_step:
    mark step done, notifica admin requires_approval, advance prossimo.
    Wrapper per isolare l'import circolare e per facilitare patching nei test."""
    from routers.partner_journey import (
        complete_operativo_step as _impl,
        _OperativoCompleteBody,
    )
    await _impl(partner_id, step_id, _OperativoCompleteBody(data=data))


class FinalizeBody(BaseModel):
    partner_id: str


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _filename_for(partner_id: str) -> str:
    ts = _now_utc().strftime("%Y%m%d-%H%M%S")
    return f"posizionamento-{partner_id}-{ts}.pdf"


async def _get_partner_or_404(partner_id: str) -> dict:
    p = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Partner non trovato")
    return p


async def _get_step_or_400(partner_id: str) -> dict:
    s = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": STEP_ID}, {"_id": 0}
    )
    if not s:
        raise HTTPException(400, f"Step {STEP_ID} non trovato per {partner_id}")
    return s


async def _current_file(partner_id: str) -> Optional[dict]:
    """File 'corrente' (non-superseded) della categoria posizionamento, più recente."""
    return await db.files.find_one(
        {"partner_id": partner_id, "category": "posizionamento", "superseded": {"$ne": True}},
        {"_id": 0},
        sort=[("uploaded_at", -1)],
    )


@router.post("/finalize")
async def finalize_posizionamento(body: FinalizeBody) -> dict:
    partner = await _get_partner_or_404(body.partner_id)
    step = await _get_step_or_400(body.partner_id)

    answers = (step.get("data") or {}).get("answers") or {}
    if not answers or not any((answers.get(k) or "").strip() for k in answers):
        raise HTTPException(400, "Nessuna risposta al wizard Posizionamento trovata")

    # Idempotenza
    existing = await _current_file(body.partner_id)
    if existing:
        if existing.get("status") == "under_review":
            return {
                "file_id": existing["file_id"],
                "internal_url": existing.get("internal_url", ""),
                "status": "under_review",
                "approval_status": "pending_review",
            }
        if existing.get("status") == "approved":
            raise HTTPException(
                409,
                "Documento già approvato; per modificarlo chiedi al team di riaprire lo step",
            )
        # status rejected → procedi, vecchio file viene marcato superseded sotto

    # Render PDF (se fallisce, NO side effects)
    try:
        pdf_bytes = await genera_posizionamento_pdf(answers, partner.get("name", "Partner"))
    except Exception as e:
        logger.exception(f"[POSIZIONAMENTO] PDF render failed for {body.partner_id}: {e}")
        try:
            await db.alerts.insert_one({
                "id": uuid.uuid4().hex,
                "agent": "STEFANIA",
                "type": "BLOCCO",
                "msg": f"Render PDF posizionamento fallito per {partner.get('name', body.partner_id)}",
                "partner": partner.get("name", body.partner_id),
                "partner_id": body.partner_id,
                "resolved": False,
                "created_at": _now_utc().isoformat(),
            })
        except Exception:
            pass
        raise HTTPException(500, "Errore tecnico durante la generazione del documento. Riprova tra qualche minuto.")

    filename = _filename_for(body.partner_id)
    upload = await upload_posizionamento_pdf(pdf_bytes, body.partner_id, filename)

    # Marca vecchi rejected come superseded
    await db.files.update_many(
        {"partner_id": body.partner_id, "category": "posizionamento",
         "status": "rejected", "superseded": {"$ne": True}},
        {"$set": {"superseded": True}},
    )

    # Insert nuovo file record
    file_id = uuid.uuid4().hex
    now = _now_utc()
    file_doc = {
        "file_id": file_id,
        "partner_id": body.partner_id,
        "category": "posizionamento",
        "file_type": "document",
        "original_name": f"Documento di Posizionamento - {partner.get('name', 'Partner')}.pdf",
        "stored_name": filename,
        "internal_url": upload["url"],
        "public_id": upload["public_id"],
        "status": "under_review",
        "step_ref": STEP_ID,
        "rejection_note": None,
        "approved_by": None,
        "approved_at": None,
        "rejected_at": None,
        "superseded": False,
        "uploaded_at": now.isoformat(),
        "size": len(pdf_bytes),
        "size_readable": f"{len(pdf_bytes) // 1024} KB",
    }
    await db.files.insert_one(file_doc)

    # Aggiorna journey step con approval_status PRIMA del complete,
    # così l'alert generato dal complete trova già il file_id collegato
    await db.partner_journey_steps.update_one(
        {"partner_id": body.partner_id, "step_id": STEP_ID},
        {"$set": {
            "approval_status": "pending_review",
            "approval_file_id": file_id,
            "approval_note": None,
            "approval_resolved_at": None,
            "updated_at": now,
        }},
    )

    # Riusa logica esistente: mark done + notifica admin requires_approval=true + advance
    try:
        await _complete_journey_step(body.partner_id, STEP_ID, {"answers": answers})
    except Exception as e:
        logger.exception(f"[POSIZIONAMENTO] complete_operativo_step failed: {e}")
        # Non blocchiamo: file creato, admin lo vedrà comunque nella coda

    # Arricchisci l'alert appena creato col file_id (per deep-link Apri PDF dalla coda)
    await db.alerts.update_one(
        {"partner_id": body.partner_id, "kind": "partner_activity",
         "requires_approval": True, "resolved": False, "file_id": {"$exists": False}},
        {"$set": {"file_id": file_id}},
    )

    return {
        "file_id": file_id,
        "internal_url": file_doc["internal_url"],
        "status": "under_review",
        "approval_status": "pending_review",
    }


@router.get("/document/{partner_id}")
async def get_document_metadata(partner_id: str) -> Optional[dict]:
    f = await _current_file(partner_id)
    if not f:
        return None
    return {
        "file_id": f["file_id"],
        "internal_url": f.get("internal_url", ""),
        "status": f.get("status"),
        "rejection_note": f.get("rejection_note"),
        "uploaded_at": f.get("uploaded_at"),
    }
