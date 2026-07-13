"""Fatture passive e pagamenti dei collaboratori Ciak."""

from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, Field

from routers.ciak_admin import require_ciak_admin
from services.collaborator_document_storage import (
    delete_private_document,
    download_private_document,
    upload_private_document,
)
from services.collaborator_settlements import (
    build_settlement,
    calculate_difference,
    can_manage_collaborator_billing,
    validate_transition,
)

router = APIRouter(prefix="/api/admin/ciak/collaboratori", tags=["collaborator-settlements"])
db = None
MAX_FILE_BYTES = 10 * 1024 * 1024


def set_db(database):
    global db
    db = database


class SettlementCreate(BaseModel):
    period_start: date
    period_end: date


class SettlementVerify(BaseModel):
    difference_note: str = ""


class SettlementCancel(BaseModel):
    reason: str = Field(min_length=3)


def _actor(admin):
    return getattr(admin, "email", None) or getattr(admin, "user_id", None) or "admin"


async def require_billing_admin(admin=Depends(require_ciak_admin)):
    if not can_manage_collaborator_billing(admin):
        raise HTTPException(403, "Contabilita' collaboratori riservata")
    return admin


def _clean(doc):
    if doc:
        doc.pop("_id", None)
    return doc


def _validate_document(kind, content_type, data):
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, "Il file supera il limite di 10 MB")
    is_pdf = content_type == "application/pdf" and data.startswith(b"%PDF")
    if kind == "invoice" and not is_pdf:
        raise HTTPException(422, "La fattura deve essere un PDF valido")
    is_png = content_type == "image/png" and data.startswith(b"\x89PNG\r\n\x1a\n")
    is_jpeg = content_type in ("image/jpeg", "image/jpg") and data.startswith(b"\xff\xd8\xff")
    if kind == "payment_receipt" and not (is_pdf or is_png or is_jpeg):
        raise HTTPException(422, "La distinta deve essere PDF, PNG o JPEG")


async def _get(collaborator_id, settlement_id):
    doc = await db.collaborator_settlements.find_one({"collaborator_id": collaborator_id, "settlement_id": settlement_id})
    if not doc:
        raise HTTPException(404, "Liquidazione non trovata")
    return doc


async def _transition(doc, target, payload, actor, extra=None):
    try:
        validate_transition(doc, target, payload)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    now = datetime.now(timezone.utc).isoformat()
    values = {"status": target, "updated_at": now, **(extra or {})}
    result = await db.collaborator_settlements.update_one(
        {"settlement_id": doc["settlement_id"], "status": doc["status"]},
        {"$set": values, "$push": {"audit_log": {"action": target, "actor": actor, "at": now}}},
    )
    if not result.modified_count:
        raise HTTPException(409, "La liquidazione e' gia' stata aggiornata")
    doc.update(values)
    doc.setdefault("audit_log", []).append({"action": target, "actor": actor, "at": now})
    return _clean(doc)


@router.get("/{collaborator_id}/settlements")
async def list_settlements(
    collaborator_id: str,
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    admin=Depends(require_billing_admin),
):
    query = {"collaborator_id": collaborator_id}
    if status:
        query["status"] = status
    if date_from or date_to:
        query["period_start"] = {}
        if date_from:
            query["period_start"]["$gte"] = date_from.isoformat()
        if date_to:
            query["period_start"]["$lte"] = date_to.isoformat()
    docs = [_clean(doc) async for doc in db.collaborator_settlements.find(query).sort("period_start", -1)]
    active = [doc for doc in docs if doc.get("status") != "cancelled"]
    return {
        "settlements": docs,
        "summary": {
            "calculated": round(sum(float(doc.get("calculated_amount") or 0) for doc in active), 2),
            "invoiced": round(sum(float((doc.get("invoice") or {}).get("amount") or 0) for doc in active), 2),
            "to_pay": round(sum(float((doc.get("invoice") or {}).get("amount") or 0) for doc in active if doc.get("status") == "to_pay"), 2),
            "paid": round(sum(float((doc.get("payment") or {}).get("amount") or 0) for doc in active if doc.get("status") == "paid"), 2),
            "anomalies": sum(1 for doc in active if doc.get("status") == "to_verify" and float(doc.get("difference_amount") or 0) != 0),
        },
    }


@router.post("/{collaborator_id}/settlements", status_code=201)
async def create_settlement(collaborator_id: str, req: SettlementCreate, admin=Depends(require_billing_admin)):
    if req.period_end < req.period_start:
        raise HTTPException(422, "La data finale precede quella iniziale")
    start = datetime.combine(req.period_start, time.min, tzinfo=timezone.utc).isoformat()
    end = datetime.combine(req.period_end, time.max, tzinfo=timezone.utc).isoformat()
    tasks = [task async for task in db.agent_tasks.find({
        "assigned_to": collaborator_id,
        "approved_at": {"$gte": start, "$lte": end},
        "collaborator_settlement_id": {"$exists": False},
    })]
    try:
        doc = build_settlement(collaborator_id, req.period_start, req.period_end, tasks, _actor(admin))
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    reserved = []
    try:
        for task_id in doc["task_ids"]:
            result = await db.agent_tasks.update_one(
                {"task_id": task_id, "collaborator_settlement_id": {"$exists": False}},
                {"$set": {"collaborator_settlement_id": doc["settlement_id"]}},
            )
            if not result.modified_count:
                raise HTTPException(409, "Una attivita' e' gia' stata liquidata")
            reserved.append(task_id)
        await db.collaborator_settlements.insert_one(doc)
    except Exception:
        if reserved:
            await db.agent_tasks.update_many(
                {"task_id": {"$in": reserved}, "collaborator_settlement_id": doc["settlement_id"]},
                {"$unset": {"collaborator_settlement_id": ""}},
            )
        raise
    return {"settlement": _clean(doc)}


@router.post("/{collaborator_id}/settlements/{settlement_id}/close")
async def close_settlement(collaborator_id: str, settlement_id: str, admin=Depends(require_billing_admin)):
    doc = await _get(collaborator_id, settlement_id)
    return {"settlement": await _transition(doc, "awaiting_invoice", {}, _actor(admin))}


@router.post("/{collaborator_id}/settlements/{settlement_id}/invoice")
async def upload_invoice(
    collaborator_id: str,
    settlement_id: str,
    file: UploadFile = File(...),
    invoice_number: str = Form(...),
    invoice_date: date = Form(...),
    amount: Decimal = Form(..., gt=0),
    due_date: Optional[date] = Form(None),
    admin=Depends(require_billing_admin),
):
    doc = await _get(collaborator_id, settlement_id)
    if doc.get("status") != "awaiting_invoice":
        raise HTTPException(409, "La liquidazione non e' in attesa della fattura")
    data = await file.read(MAX_FILE_BYTES + 1)
    _validate_document("invoice", file.content_type, data)
    metadata = upload_private_document(collaborator_id, settlement_id, "invoice", file.filename, file.content_type, data)
    invoice = {**metadata, "number": invoice_number.strip(), "date": invoice_date.isoformat(), "amount": float(amount), "due_date": due_date.isoformat() if due_date else None}
    difference = float(calculate_difference(amount, doc.get("calculated_amount")))
    try:
        updated = await _transition(doc, "to_verify", {}, _actor(admin), {"invoice": invoice, "difference_amount": difference})
    except Exception:
        delete_private_document(metadata["object_key"])
        raise
    return {"settlement": updated}


@router.post("/{collaborator_id}/settlements/{settlement_id}/verify")
async def verify_settlement(collaborator_id: str, settlement_id: str, req: SettlementVerify, admin=Depends(require_billing_admin)):
    doc = await _get(collaborator_id, settlement_id)
    return {"settlement": await _transition(doc, "to_pay", req.model_dump(), _actor(admin), {"difference_note": req.difference_note.strip()})}


@router.post("/{collaborator_id}/settlements/{settlement_id}/payment")
async def register_payment(
    collaborator_id: str,
    settlement_id: str,
    paid_at: date = Form(...),
    amount: Decimal = Form(..., gt=0),
    reference: str = Form(""),
    note: str = Form(""),
    receipt: Optional[UploadFile] = File(None),
    admin=Depends(require_billing_admin),
):
    doc = await _get(collaborator_id, settlement_id)
    if doc.get("status") == "paid" and float((doc.get("payment") or {}).get("amount") or 0) == float(amount):
        return {"settlement": _clean(doc)}
    receipt_meta = None
    if receipt:
        data = await receipt.read(MAX_FILE_BYTES + 1)
        _validate_document("payment_receipt", receipt.content_type, data)
        receipt_meta = upload_private_document(collaborator_id, settlement_id, "payment_receipt", receipt.filename, receipt.content_type, data)
    payment = {"paid_at": paid_at.isoformat(), "amount": float(amount), "reference": reference.strip(), "note": note.strip(), "receipt": receipt_meta}
    try:
        updated = await _transition(doc, "paid", payment, _actor(admin), {"payment": payment})
    except Exception:
        if receipt_meta:
            delete_private_document(receipt_meta["object_key"])
        raise
    return {"settlement": updated}


@router.post("/{collaborator_id}/settlements/{settlement_id}/cancel")
async def cancel_settlement(collaborator_id: str, settlement_id: str, req: SettlementCancel, admin=Depends(require_billing_admin)):
    doc = await _get(collaborator_id, settlement_id)
    updated = await _transition(doc, "cancelled", req.model_dump(), _actor(admin), {"cancel_reason": req.reason.strip()})
    await db.agent_tasks.update_many({"collaborator_settlement_id": settlement_id}, {"$unset": {"collaborator_settlement_id": ""}})
    return {"settlement": updated}


@router.get("/{collaborator_id}/settlements/{settlement_id}/files/{kind}")
async def download_file(
    collaborator_id: str,
    settlement_id: str,
    kind: Literal["invoice", "payment_receipt"],
    admin=Depends(require_billing_admin),
):
    doc = await _get(collaborator_id, settlement_id)
    metadata = doc.get("invoice") if kind == "invoice" else (doc.get("payment") or {}).get("receipt")
    if not metadata:
        raise HTTPException(404, "Documento non trovato")
    try:
        data, content_type = download_private_document(metadata["object_key"])
    except FileNotFoundError as exc:
        raise HTTPException(404, "Documento non trovato") from exc
    safe_name = str(metadata.get("filename") or "documento").replace('"', "")
    return Response(data, media_type=content_type, headers={"Content-Disposition": f'attachment; filename="{safe_name}"'})
