"""Rigenera e riallinea i materiali Fase 1 di Daniele Andolfi.

Senza ``--apply`` genera i due PDF nuovi in locale. Con ``--apply`` li carica
su Cloudinary, registra anche contratto e distinta canonici, conserva i record
storici e collega i nuovi file ai journey step.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from cloudinary_service import is_cloudinary_configured, upload_file_direct
from services.brand_kit_pdf_renderer import genera_brand_kit_pdf
from services.brand_kit_storage import upload_brand_kit_pdf
from services.posizionamento_pdf_renderer import genera_posizionamento_pdf
from services.posizionamento_statement import build_brand_positioning_statement, genera_documento_definitivo
from services.posizionamento_storage import upload_posizionamento_pdf

PARTNER_ID = "23"
MIGRATION_KEY = "daniele_phase1_new_templates_2026_08_14"


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _repair_text(value):
    if isinstance(value, dict):
        return {key: _repair_text(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_repair_text(item) for item in value]
    if not isinstance(value, str) or "�" not in value:
        return value
    replacements = {
        "benessere � un viaggio": "benessere è un viaggio", "rigidit�": "rigidità",
        "stress � diventato": "stress è diventato", "non � ancora": "non è ancora",
        "davvero � respiro, tensioni, postura � prima": "davvero - respiro, tensioni, postura - prima",
        "97�": "97 euro", "con s�": "con sé", "lucidit�": "lucidità",
        "ci�": "ciò", "perch�": "perché", "finch�": "finché", "l�": "lì",
        "pi�": "più", "qualit�": "qualità", "disponibilit�": "disponibilità",
    }
    repaired = value
    for broken, correct in replacements.items():
        repaired = repaired.replace(broken, correct)
    if "�" in repaired:
        raise ValueError(f"Carattere corrotto non risolto: {repaired}")
    return repaired


def _file_doc(*, file_id, category, original_name, stored_name, upload, content, step_id, now):
    return {
        "file_id": file_id, "partner_id": PARTNER_ID, "category": category,
        "file_type": "document", "content_type": "application/pdf",
        "original_name": original_name, "stored_name": stored_name,
        "internal_url": upload["url"], "public_id": upload.get("public_id", ""),
        "status": "approved", "approval_status": "approved",
        "step_ref": step_id, "step_id": step_id, "superseded": False,
        "uploaded_at": now.isoformat(), "size": len(content),
        "size_readable": f"{len(content) // 1024} KB", "sha256": _sha256(content),
        "migration_key": MIGRATION_KEY,
    }


async def _upload_pdf(content: bytes, filename: str, folder: str) -> dict:
    result = await upload_file_direct(
        file_data=content, filename=filename, resource_type="raw", folder=folder,
    )
    if not result.get("success"):
        raise RuntimeError(result.get("error", "Upload Cloudinary fallito"))
    return {"url": result.get("secure_url") or result.get("url"), "public_id": result.get("public_id", "")}


async def run(args: argparse.Namespace) -> None:
    mongo_url = os.environ.get("MONGO_URL", "")
    if not mongo_url:
        raise RuntimeError("MONGO_URL non configurata")
    db = MongoClient(mongo_url)[os.environ.get("DB_NAME", "evolution_pro")]
    partner = db.partners.find_one({"id": PARTNER_ID}, {"_id": 0, "name": 1})
    if not partner:
        raise RuntimeError("Partner 23 non trovato")
    steps = {row["step_id"]: row for row in db.partner_journey_steps.find(
        {"partner_id": PARTNER_ID, "step_id": {"$in": ["03-brand-kit", "04-posizionamento"]}}
    )}
    brand_data = _repair_text((steps["03-brand-kit"].get("data") or {}).copy())
    pos_data = (steps["04-posizionamento"].get("data") or {}).copy()
    answers = _repair_text((pos_data.get("answers") or {}).copy())

    statement = await build_brand_positioning_statement(answers)
    revisione = await genera_documento_definitivo(answers, partner["name"])
    brand_pdf = await genera_brand_kit_pdf(brand_data, partner["name"])
    positioning_pdf = await genera_posizionamento_pdf(answers, partner["name"], statement, revisione)
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    brand_path = output_dir / "Brand_Kit_Daniele_Andolfi_2026.pdf"
    positioning_path = output_dir / "Posizionamento_Daniele_Andolfi_2026.pdf"
    brand_path.write_bytes(brand_pdf)
    positioning_path.write_bytes(positioning_pdf)
    print(f"GENERATED {brand_path} {len(brand_pdf)} bytes sha256={_sha256(brand_pdf)}")
    print(f"GENERATED {positioning_path} {len(positioning_pdf)} bytes sha256={_sha256(positioning_pdf)}")
    if not args.apply:
        print("DRY-RUN: produzione non modificata")
        return
    if not is_cloudinary_configured():
        raise RuntimeError("Cloudinary non configurato: applicazione annullata")

    contract_path, receipt_path = Path(args.contract).resolve(), Path(args.receipt).resolve()
    contract_pdf, receipt_pdf = contract_path.read_bytes(), receipt_path.read_bytes()
    if not contract_pdf.startswith(b"%PDF") or not receipt_pdf.startswith(b"%PDF"):
        raise ValueError("Contratto o distinta non sono PDF validi")
    existing = db.files.count_documents({"partner_id": PARTNER_ID, "migration_key": MIGRATION_KEY})
    if existing:
        raise RuntimeError(f"Migrazione già applicata: trovati {existing} record")

    brand_upload = await upload_brand_kit_pdf(brand_pdf, PARTNER_ID, "brand_kit_daniele_andolfi_2026.pdf")
    pos_upload = await upload_posizionamento_pdf(positioning_pdf, PARTNER_ID, "posizionamento_daniele_andolfi_2026.pdf")
    contract_upload = await _upload_pdf(contract_pdf, contract_path.name, f"evolution-pro/partners/{PARTNER_ID}/contratto")
    receipt_upload = await _upload_pdf(receipt_pdf, receipt_path.name, f"evolution-pro/partners/{PARTNER_ID}/contratto")
    if brand_upload.get("storage") != "cloudinary" or pos_upload.get("storage") != "cloudinary":
        raise RuntimeError("Upload PDF generati non persistente: applicazione annullata")

    now = datetime.now(timezone.utc)
    records = [
        _file_doc(file_id=uuid.uuid4().hex, category="brand-kit", original_name="Brand Kit - Daniele Andolfi.pdf", stored_name="brand_kit_daniele_andolfi_2026.pdf", upload=brand_upload, content=brand_pdf, step_id="03-brand-kit", now=now),
        _file_doc(file_id=uuid.uuid4().hex, category="posizionamento", original_name="Documento di Posizionamento - Daniele Andolfi.pdf", stored_name="posizionamento_daniele_andolfi_2026.pdf", upload=pos_upload, content=positioning_pdf, step_id="04-posizionamento", now=now),
        _file_doc(file_id=uuid.uuid4().hex, category="contratto_firmato", original_name=contract_path.name, stored_name=contract_path.name, upload=contract_upload, content=contract_pdf, step_id="01-contratto", now=now),
        _file_doc(file_id=uuid.uuid4().hex, category="distinta_pagamento", original_name=receipt_path.name, stored_name=receipt_path.name, upload=receipt_upload, content=receipt_pdf, step_id="01-contratto", now=now),
    ]
    db.files.update_many(
        {"partner_id": PARTNER_ID, "category": {"$in": ["brand-kit", "brand_kit", "posizionamento"]}, "superseded": {"$ne": True}},
        {"$set": {"superseded": True, "superseded_at": now.isoformat(), "superseded_by_migration": MIGRATION_KEY}},
    )
    db.files.insert_many(records)
    for step_id, file_id, repaired_data in (
        ("03-brand-kit", records[0]["file_id"], brand_data),
        ("04-posizionamento", records[1]["file_id"], {**pos_data, "answers": answers}),
    ):
        db.partner_journey_steps.update_one(
            {"partner_id": PARTNER_ID, "step_id": step_id},
            {"$set": {"data": repaired_data, "approval_status": "approved", "approval_file_id": file_id, "updated_at": now, "material_refresh_key": MIGRATION_KEY}},
        )
    db.partner_journey_steps.update_one(
        {"partner_id": PARTNER_ID, "step_id": "01-contratto"},
        {"$set": {"approval_status": "approved", "approval_file_ids": [records[2]["file_id"], records[3]["file_id"]], "updated_at": now, "material_refresh_key": MIGRATION_KEY}},
    )
    print("APPLIED 4 current file records and repaired Phase 1 text")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--output-dir", default="output/pdf")
    parser.add_argument("--contract", required=True)
    parser.add_argument("--receipt", required=True)
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
