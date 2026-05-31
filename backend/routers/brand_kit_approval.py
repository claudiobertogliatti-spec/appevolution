"""Ponte Brand Kit → I Miei File + coda approvazione admin.

Endpoint partner:
  POST /api/partner/brand-kit/finalize
  GET  /api/partner/brand-kit/document/{partner_id}

L'admin queue/approve/reject sono nel router del Posizionamento
(category-agnostic): vedi routers/posizionamento_approval.py admin_router.
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.brand_kit_pdf_renderer import genera_brand_kit_pdf
from services.brand_kit_storage import upload_brand_kit_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/brand-kit", tags=["partner-brand-kit"])

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

STEP_ID = "03-brand-kit"
CATEGORY = "brand-kit"

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
TONE_MIN_CHARS = 40
PAROLE_CHIAVE_MIN = 3


async def _complete_journey_step(partner_id: str, step_id: str, data: dict) -> None:
    """Stessa logica di complete_operativo_step: mark done, notifica admin
    requires_approval, advance. Import lazy per evitare coupling al load time."""
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
    safe_pid = re.sub(r"[^A-Za-z0-9_-]", "_", partner_id)[:64]
    return f"brand-kit-{safe_pid}-{ts}.pdf"


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
    """File 'corrente' (non-superseded) brand-kit, più recente."""
    return await db.files.find_one(
        {"partner_id": partner_id, "category": CATEGORY, "superseded": {"$ne": True}},
        {"_id": 0},
        sort=[("uploaded_at", -1)],
    )


def _validate_payload(data: dict) -> list[str]:
    """Ritorna lista di messaggi di errore (vuota = ok)."""
    errors: list[str] = []
    if not (data.get("logo_url") or "").strip():
        errors.append("logo mancante")
    if not (data.get("foto_url") or "").strip():
        errors.append("foto personale mancante")
    colors = data.get("colors") or []
    if not isinstance(colors, list) or len(colors) != 3 or not all(
        isinstance(c, str) and HEX_RE.match(c) for c in colors
    ):
        errors.append("servono 3 colori in formato HEX (#RRGGBB)")
    tone = (data.get("tone_of_voice") or "").strip()
    if len(tone) < TONE_MIN_CHARS:
        errors.append(f"tone of voice troppo breve (min {TONE_MIN_CHARS} caratteri)")
    parole_chiave = [p for p in (data.get("parole_chiave") or []) if (p or "").strip()]
    if len(parole_chiave) < PAROLE_CHIAVE_MIN:
        errors.append(f"servono almeno {PAROLE_CHIAVE_MIN} parole chiave")
    return errors


@router.post("/finalize")
async def finalize_brand_kit(body: FinalizeBody) -> dict:
    partner = await _get_partner_or_404(body.partner_id)
    step = await _get_step_or_400(body.partner_id)

    data = step.get("data") or {}
    errors = _validate_payload(data)
    if errors:
        raise HTTPException(400, f"Brand kit incompleto: {', '.join(errors)}")

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
                "Brand kit già approvato; per modificarlo chiedi al team di riaprire lo step",
            )
        # status rejected → procedi, vecchio file viene marcato superseded sotto

    # Render PDF (se fallisce, NO side effects)
    try:
        pdf_bytes = await genera_brand_kit_pdf(data, partner.get("name", "Partner"))
    except Exception as e:
        logger.exception(f"[BRAND-KIT] PDF render failed for {body.partner_id}: {e}")
        try:
            await db.alerts.insert_one({
                "id": uuid.uuid4().hex,
                "agent": "STEFANIA",
                "type": "BLOCCO",
                "msg": f"Render PDF brand kit fallito per {partner.get('name', body.partner_id)}",
                "partner": partner.get("name", body.partner_id),
                "partner_id": body.partner_id,
                "resolved": False,
                "created_at": _now_utc().isoformat(),
            })
        except Exception:
            pass
        raise HTTPException(500, "Errore tecnico durante la generazione del brand kit. Riprova tra qualche minuto.")

    filename = _filename_for(body.partner_id)
    upload = await upload_brand_kit_pdf(pdf_bytes, body.partner_id, filename)

    # Marca vecchi rejected come superseded
    await db.files.update_many(
        {"partner_id": body.partner_id, "category": CATEGORY,
         "status": "rejected", "superseded": {"$ne": True}},
        {"$set": {"superseded": True}},
    )

    # Insert nuovo file record
    file_id = uuid.uuid4().hex
    now = _now_utc()
    file_doc = {
        "file_id": file_id,
        "partner_id": body.partner_id,
        "category": CATEGORY,
        "file_type": "document",
        "original_name": f"Brand Kit - {partner.get('name', 'Partner')}.pdf",
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
    # così l'alert generato dal complete trova già il file_id collegato.
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

    # Riusa logica esistente: mark done + notifica admin + advance
    try:
        await _complete_journey_step(body.partner_id, STEP_ID, data)
    except Exception as e:
        logger.exception(f"[BRAND-KIT] complete_operativo_step failed: {e}")

    # Arricchisci l'alert appena creato col file_id (deep-link Apri PDF).
    latest_alert = await db.alerts.find_one(
        {"partner_id": body.partner_id, "kind": "partner_activity",
         "requires_approval": True, "resolved": False, "file_id": {"$exists": False}},
        {"_id": 0, "id": 1},
        sort=[("created_at", -1)],
    )
    if latest_alert:
        await db.alerts.update_one(
            {"id": latest_alert["id"]},
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
