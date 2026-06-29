"""Ponte "La tua storia" → I Miei File.

Genera il PDF della storia dalle risposte (step la-tua-storia) e lo salva tra i
file del partner (categoria "storia"), come brand-kit e posizionamento — ma
SENZA coda di approvazione admin: il documento è definitivo e subito disponibile
in I Miei File.

Endpoint partner:
  POST /api/partner/storia/finalize        {partner_id}
  GET  /api/partner/storia/document/{partner_id}
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

from services.storia_pdf_renderer import genera_storia_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/storia", tags=["partner-storia"])

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

STEP_ID = "la-tua-storia"
CATEGORY = "storia"
REQUIRED_IDS = [f"S{n:02d}" for n in range(1, 22)]  # S01..S21, tutte obbligatorie

# Storage: Cloudinary se configurato, fallback locale.
try:
    from cloudinary_service import upload_file_direct, is_cloudinary_configured  # noqa
except Exception:
    async def upload_file_direct(*a, **k):  # type: ignore
        return {"success": False, "error": "cloudinary not available"}

    def is_cloudinary_configured() -> bool:  # type: ignore
        return False


async def _upload_pdf(pdf_bytes: bytes, partner_id: str, filename: str) -> dict:
    if is_cloudinary_configured():
        try:
            res = await upload_file_direct(
                file_data=pdf_bytes, filename=filename, resource_type="raw",
                folder=f"evolution-pro/partners/{partner_id}/storia",
            )
            if res.get("success"):
                return {"url": res.get("secure_url") or res.get("url", ""), "public_id": res.get("public_id", "")}
        except Exception as e:
            logger.warning(f"[STORIA] Cloudinary upload failed for {partner_id}: {e} — fallback locale")
    from pathlib import Path
    d = "/tmp/storia_pdfs"
    Path(d).mkdir(parents=True, exist_ok=True)
    path = os.path.join(d, filename)
    with open(path, "wb") as f:
        f.write(pdf_bytes)
    return {"url": path, "public_id": ""}


class FinalizeBody(BaseModel):
    partner_id: str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _filename(partner_id: str) -> str:
    ts = _now().strftime("%Y%m%d-%H%M%S")
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", partner_id)[:64]
    return f"storia-{safe}-{ts}.pdf"


async def _complete_step(partner_id: str, data: dict) -> None:
    from routers.partner_journey import (
        complete_operativo_step as _impl,
        _OperativoCompleteBody,
    )
    await _impl(partner_id, STEP_ID, _OperativoCompleteBody(data=data))


async def _current_file(partner_id: str) -> Optional[dict]:
    return await db.files.find_one(
        {"partner_id": partner_id, "category": CATEGORY, "superseded": {"$ne": True}},
        {"_id": 0}, sort=[("uploaded_at", -1)],
    )


@router.post("/finalize")
async def finalize_storia(body: FinalizeBody) -> dict:
    partner = await db.partners.find_one({"id": body.partner_id}, {"_id": 0, "name": 1})
    if not partner:
        raise HTTPException(404, "Partner non trovato")
    step = await db.partner_journey_steps.find_one(
        {"partner_id": body.partner_id, "step_id": STEP_ID}, {"_id": 0}
    )
    if not step:
        raise HTTPException(400, f"Step {STEP_ID} non trovato")

    answers = (step.get("data") or {}).get("answers") or {}
    missing = [k for k in REQUIRED_IDS if not (answers.get(k) or "").strip()]
    if missing:
        raise HTTPException(400, f"Rispondi a tutte le domande prima di generare il documento ({len(missing)} mancanti).")

    nome = partner.get("name", "Partner")
    try:
        pdf_bytes = await genera_storia_pdf(answers, nome)
    except Exception as e:
        logger.exception(f"[STORIA] PDF render failed for {body.partner_id}: {e}")
        raise HTTPException(500, "Errore tecnico durante la generazione del documento. Riprova tra qualche minuto.")

    filename = _filename(body.partner_id)
    upload = await _upload_pdf(pdf_bytes, body.partner_id, filename)

    # Sostituisci eventuale documento storia precedente
    await db.files.update_many(
        {"partner_id": body.partner_id, "category": CATEGORY, "superseded": {"$ne": True}},
        {"$set": {"superseded": True}},
    )

    file_id = uuid.uuid4().hex
    now = _now()
    file_doc = {
        "file_id": file_id,
        "partner_id": body.partner_id,
        "category": CATEGORY,
        "file_type": "document",
        "original_name": f"La tua storia - {nome}.pdf",
        "stored_name": filename,
        "internal_url": upload["url"],
        "public_id": upload["public_id"],
        "status": "final",          # nessuna approvazione: definitivo
        "step_ref": STEP_ID,
        "superseded": False,
        "uploaded_at": now.isoformat(),
        "size": len(pdf_bytes),
        "size_readable": f"{len(pdf_bytes) // 1024} KB",
    }
    await db.files.insert_one(file_doc)

    # Completa lo step normalmente (la-tua-storia NON è in _DOC_APPROVAL_STEPS: nessuna review)
    try:
        await _complete_step(body.partner_id, {"answers": answers})
    except Exception as e:
        logger.exception(f"[STORIA] complete_operativo_step failed: {e}")

    return {"file_id": file_id, "internal_url": file_doc["internal_url"], "status": "final", "approval_status": "approved"}


@router.get("/document/{partner_id}")
async def get_document(partner_id: str) -> Optional[dict]:
    f = await _current_file(partner_id)
    if not f:
        return None
    return {
        "file_id": f["file_id"],
        "internal_url": f.get("internal_url", ""),
        "status": f.get("status"),
        "uploaded_at": f.get("uploaded_at"),
    }
