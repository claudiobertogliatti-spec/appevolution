"""Archivio append-only dei documenti finali partner."""
import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class DocumentVersion:
    document_id: str
    version: int
    checksum: str
    created: bool


async def archive_document_version(
    db,
    partner_id: str,
    kind: str,
    source_version: str,
    pdf: bytes,
    provenance: dict | None = None,
) -> DocumentVersion:
    if not pdf or len(pdf) < 100 or not pdf.startswith(b"%PDF"):
        raise ValueError("PDF non valido o vuoto")
    checksum = hashlib.sha256(pdf).hexdigest()
    identity = {"partner_id": partner_id, "kind": kind, "source_version": source_version}
    if provenance is not None:
        identity["provenance"] = provenance
    existing = await db.partner_document_versions.find_one(identity, {"_id": 0})
    if existing:
        return DocumentVersion(existing["document_id"], existing["version"], existing["checksum"], False)
    latest = await db.partner_document_versions.find_one(
        {"partner_id": partner_id, "kind": kind}, {"_id": 0, "version": 1}, sort=[("version", -1)]
    )
    version = int((latest or {}).get("version") or 0) + 1
    document_id = uuid.uuid4().hex
    document = {
        "document_id": document_id, "partner_id": partner_id, "kind": kind,
        "source_version": source_version, "version": version, "checksum": checksum,
        "content": pdf, "size": len(pdf), "created_at": datetime.now(timezone.utc),
    }
    if provenance is not None:
        document["provenance"] = provenance
    await db.partner_document_versions.insert_one(document)
    return DocumentVersion(document_id, version, checksum, True)
