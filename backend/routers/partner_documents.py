"""
Partner Documents Router - Evolution PRO
Upload e verifica documenti onboarding partner
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/documents", tags=["partner-documents"])
admin_router = APIRouter(prefix="/api/admin/partners", tags=["admin-documents"])

# MongoDB connection - use same pattern as contract.py
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Document type configuration
DOCUMENT_TYPES = {
    "identity_front": {"label": "Documento d'identità (fronte)", "required": True, "formats": ["jpg", "jpeg", "png", "pdf"]},
    "identity_back": {"label": "Documento d'identità (retro)", "required": True, "formats": ["jpg", "jpeg", "png", "pdf"]},
    "codice_fiscale": {"label": "Codice fiscale", "required": True, "formats": ["jpg", "jpeg", "png", "pdf"]},
    "piva": {"label": "P.IVA (se attiva)", "required": False, "formats": ["jpg", "jpeg", "png", "pdf"]},
    "logo": {"label": "Logo / materiali brand", "required": False, "formats": ["jpg", "jpeg", "png", "svg"]},
    "distinta": {"label": "Distinta di pagamento", "required": True, "formats": ["jpg", "jpeg", "png", "pdf"]},
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

DEFAULT_DOCUMENTS = {
    doc_type: {
        "url": "",
        "status": "pending" if cfg["required"] else "not_required",
        "uploaded_at": None,
        "note": "",
        "original_name": "",
        "size": 0,
        "public_id": ""
    }
    for doc_type, cfg in DOCUMENT_TYPES.items()
}


async def _ensure_documents_field(partner_id: str):
    """Ensure the partner has a documents field initialized."""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "documents": 1})
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    if not partner.get("documents"):
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"documents": DEFAULT_DOCUMENTS, "documents_status": "incomplete"}}
        )
    return partner


# ═══════════════════════════════════════════════════════════════════════════════
# PARTNER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status")
async def get_documents_status(partner_id: str):
    """Get all document statuses for a partner."""
    await _ensure_documents_field(partner_id)
    partner = await db.partners.find_one(
        {"id": partner_id},
        {"_id": 0, "documents": 1, "documents_status": 1, "name": 1}
    )

    documents = partner.get("documents", DEFAULT_DOCUMENTS)
    documents_status = partner.get("documents_status", "incomplete")

    # Calculate progress
    required_types = [k for k, v in DOCUMENT_TYPES.items() if v["required"]]
    uploaded_required = sum(
        1 for t in required_types
        if documents.get(t, {}).get("status") in ("uploaded", "verified")
    )
    total_uploaded = sum(
        1 for d in documents.values()
        if d.get("status") in ("uploaded", "verified")
    )

    return {
        "documents": documents,
        "documents_status": documents_status,
        "progress": {
            "required_total": len(required_types),
            "required_uploaded": uploaded_required,
            "total_uploaded": total_uploaded
        },
        "config": {k: {"label": v["label"], "required": v["required"], "formats": v["formats"]} for k, v in DOCUMENT_TYPES.items()}
    }


@router.post("/upload/{doc_type}")
async def upload_document(
    doc_type: str,
    partner_id: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload a document for a partner."""
    if doc_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo documento non valido: {doc_type}")

    await _ensure_documents_field(partner_id)

    # Validate file extension
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    allowed = DOCUMENT_TYPES[doc_type]["formats"]
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Formato non supportato. Formati accettati: {', '.join(allowed)}"
        )

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File troppo grande. Massimo 10MB.")

    # Upload to Cloudinary
    try:
        from cloudinary_service import upload_file_direct, is_cloudinary_configured
        if not is_cloudinary_configured():
            raise ValueError("Cloudinary non configurato")

        resource_type = "raw" if ext == "pdf" else "image"
        result = await upload_file_direct(
            file_data=content,
            filename=file.filename,
            resource_type=resource_type,
            folder=f"evolution-pro/partners/{partner_id}/docs"
        )

        if not result.get("success"):
            raise ValueError(result.get("error", "Upload fallito"))

        url = result.get("secure_url") or result.get("url", "")
        public_id = result.get("public_id", "")
    except Exception as e:
        logger.error(f"[DOCUMENTS] Cloudinary upload failed for {partner_id}/{doc_type}: {e}")
        # Fallback: save locally
        local_path = f"/tmp/docs_{partner_id}_{doc_type}.{ext}"
        with open(local_path, "wb") as f_out:
            f_out.write(content)
        url = local_path
        public_id = ""

    now = datetime.now(timezone.utc).isoformat()

    # Format size
    size_bytes = len(content)
    size_readable = f"{size_bytes / 1024:.0f} KB" if size_bytes < 1024 * 1024 else f"{size_bytes / (1024 * 1024):.1f} MB"

    doc_data = {
        "url": url,
        "status": "uploaded",
        "uploaded_at": now,
        "note": "",
        "original_name": file.filename,
        "size": size_bytes,
        "size_readable": size_readable,
        "public_id": public_id
    }

    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {f"documents.{doc_type}": doc_data}}
    )

    logger.info(f"[DOCUMENTS] {doc_type} uploaded for partner {partner_id}: {file.filename}")

    return {
        "success": True,
        "doc_type": doc_type,
        "document": doc_data
    }


@router.post("/submit-review")
async def submit_for_review(partner_id: str = Form(...)):
    """Submit all documents for admin review."""
    await _ensure_documents_field(partner_id)
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "documents": 1, "name": 1})
    documents = partner.get("documents", {})

    # Check all required docs are uploaded
    for doc_type, cfg in DOCUMENT_TYPES.items():
        if cfg["required"]:
            status = documents.get(doc_type, {}).get("status", "pending")
            if status not in ("uploaded", "verified"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Documento obbligatorio mancante: {cfg['label']}"
                )

    now = datetime.now(timezone.utc).isoformat()
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "documents_status": "under_review",
            "documents_submitted_at": now
        }}
    )

    # Telegram notification to admin
    try:
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            import httpx
            message = f"📄 *Nuovi documenti da verificare*\nPartner: {partner.get('name', partner_id)}\nInviati il: {now[:10]}"
            async with httpx.AsyncClient() as http_client:
                await http_client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message, "parse_mode": "Markdown"}
                )
    except Exception as e:
        logger.warning(f"[DOCUMENTS] Telegram notification failed: {e}")

    logger.info(f"[DOCUMENTS] Partner {partner_id} submitted documents for review")

    # Systeme.io notification
    try:
        from services.systeme_notifications import notify_documents_submitted
        await notify_documents_submitted(partner_id)
    except Exception as e:
        logger.warning(f"[DOCUMENTS] Systeme.io notification failed: {e}")

    return {"success": True, "documents_status": "under_review"}


@router.delete("/{doc_type}")
async def delete_document(doc_type: str, partner_id: str):
    """Delete an uploaded document (only if not verified)."""
    if doc_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo documento non valido")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "documents": 1})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    doc = partner.get("documents", {}).get(doc_type, {})
    if doc.get("status") == "verified":
        raise HTTPException(status_code=400, detail="Non puoi eliminare un documento già verificato")

    is_required = DOCUMENT_TYPES[doc_type]["required"]
    reset_doc = {
        "url": "",
        "status": "pending" if is_required else "not_required",
        "uploaded_at": None,
        "note": "",
        "original_name": "",
        "size": 0,
        "public_id": ""
    }

    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            f"documents.{doc_type}": reset_doc,
            "documents_status": "incomplete"
        }}
    )

    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class RejectBody(BaseModel):
    note: str


@admin_router.get("/{partner_id}/documents")
async def admin_get_documents(partner_id: str):
    """Admin: get all documents for a partner."""
    await _ensure_documents_field(partner_id)
    partner = await db.partners.find_one(
        {"id": partner_id},
        {"_id": 0, "documents": 1, "documents_status": 1, "name": 1, "email": 1}
    )
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    return {
        "partner_name": partner.get("name", ""),
        "partner_email": partner.get("email", ""),
        "documents": partner.get("documents", {}),
        "documents_status": partner.get("documents_status", "incomplete"),
        "config": {k: {"label": v["label"], "required": v["required"]} for k, v in DOCUMENT_TYPES.items()}
    }


@admin_router.patch("/{partner_id}/documents/{doc_type}/verify")
async def admin_verify_document(partner_id: str, doc_type: str):
    """Admin: verify a specific document."""
    if doc_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo documento non valido")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "documents": 1, "name": 1, "email": 1})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    doc = partner.get("documents", {}).get(doc_type, {})
    if doc.get("status") != "uploaded":
        raise HTTPException(status_code=400, detail="Il documento deve essere in stato 'uploaded' per essere verificato")

    now = datetime.now(timezone.utc).isoformat()
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            f"documents.{doc_type}.status": "verified",
            f"documents.{doc_type}.verified_at": now
        }}
    )

    # Check if all required docs are now verified
    updated = await db.partners.find_one({"id": partner_id}, {"_id": 0, "documents": 1})
    all_verified = all(
        updated.get("documents", {}).get(dt, {}).get("status") in ("verified", "not_required")
        for dt, cfg in DOCUMENT_TYPES.items()
    )

    if all_verified:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"documents_status": "verified", "documents_verified_at": now}}
        )
        logger.info(f"[DOCUMENTS] All documents verified for partner {partner_id}")
        # Systeme.io notification - all docs verified
        try:
            from services.systeme_notifications import notify_documents_verified
            await notify_documents_verified(partner_id)
        except Exception as e:
            logger.warning(f"[DOCUMENTS] Systeme.io notification failed: {e}")

    logger.info(f"[DOCUMENTS] Admin verified {doc_type} for partner {partner_id}")

    return {
        "success": True,
        "doc_type": doc_type,
        "status": "verified",
        "all_verified": all_verified
    }


@admin_router.patch("/{partner_id}/documents/{doc_type}/reject")
async def admin_reject_document(partner_id: str, doc_type: str, body: RejectBody):
    """Admin: reject a specific document with a note."""
    if doc_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo documento non valido")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "documents": 1, "name": 1})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    now = datetime.now(timezone.utc).isoformat()
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            f"documents.{doc_type}.status": "rejected",
            f"documents.{doc_type}.note": body.note,
            f"documents.{doc_type}.rejected_at": now,
            "documents_status": "rejected"
        }}
    )

    logger.info(f"[DOCUMENTS] Admin rejected {doc_type} for partner {partner_id}: {body.note}")

    # Systeme.io notification - doc rejected
    try:
        from services.systeme_notifications import notify_document_rejected
        doc_label = DOCUMENT_TYPES.get(doc_type, {}).get("label", doc_type)
        await notify_document_rejected(partner_id, doc_type, doc_label, body.note)
    except Exception as e:
        logger.warning(f"[DOCUMENTS] Systeme.io notification failed: {e}")

    return {
        "success": True,
        "doc_type": doc_type,
        "status": "rejected",
        "note": body.note
    }
