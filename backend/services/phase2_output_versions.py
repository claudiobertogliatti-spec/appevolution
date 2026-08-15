"""Archivio append-only per gli output generati nella Fase 2."""
import asyncio
import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


def canonical_source_checksum(source_checksums: dict[str, str]) -> str:
    """Restituisce l'hash stabile delle fonti che hanno prodotto un output."""
    payload = json.dumps(
        source_checksums,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class OutputVersionRequest:
    partner_id: str
    step_id: str
    category: str
    template_id: str
    template_version: str
    content: dict[str, Any]
    source_checksums: dict[str, str]
    actor_id: str
    initial_status: str = "draft"

    def __post_init__(self):
        if self.initial_status not in {"draft", "legacy"}:
            raise ValueError("initial_status deve essere 'draft' o 'legacy'")


@dataclass(frozen=True)
class OutputVersionResult:
    output_id: str
    version: int
    checksum: str
    created: bool


def _result_from_existing(existing: dict) -> OutputVersionResult:
    return OutputVersionResult(
        existing["output_id"],
        existing["version"],
        existing["checksum"],
        False,
    )


async def _await_reserved_output(versions, identity: dict) -> OutputVersionResult:
    """Attende che il proprietario della reservation completi l'archivio."""
    for _ in range(100):
        await asyncio.sleep(0)
        existing = await versions.find_one(identity, {"_id": 0})
        if existing and existing.get("output_id"):
            return _result_from_existing(existing)
    raise RuntimeError("Reservation output Fase 2 non completata")


async def archive_phase2_output(db, request: OutputVersionRequest) -> OutputVersionResult:
    """Archivia un output immutabile, versionato e idempotente per identita'."""
    payload = json.dumps(
        request.content,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    checksum = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    source_hash = canonical_source_checksum(request.source_checksums)
    identity = {
        "partner_id": request.partner_id,
        "step_id": request.step_id,
        "template_id": request.template_id,
        "template_version": request.template_version,
        "checksum": checksum,
        "source_checksum": source_hash,
    }
    versions = db.partner_phase2_output_versions
    existing = await versions.find_one(identity, {"_id": 0})
    if existing:
        if existing.get("output_id"):
            return _result_from_existing(existing)
        return await _await_reserved_output(versions, identity)

    reservation_token = uuid.uuid4().hex
    try:
        reservation = await versions.find_one_and_update(
            identity,
            {
                "$setOnInsert": {
                    "reservation_token": reservation_token,
                    "reservation_state": "allocating",
                    "created_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        existing = await versions.find_one(identity, {"_id": 0})
        if existing and existing.get("output_id"):
            return _result_from_existing(existing)
        return await _await_reserved_output(versions, identity)
    if reservation.get("output_id"):
        return _result_from_existing(reservation)
    if reservation.get("reservation_token") != reservation_token:
        return await _await_reserved_output(versions, identity)

    latest = await versions.find_one(
        {"partner_id": request.partner_id, "step_id": request.step_id},
        {"_id": 0, "version": 1},
        sort=[("version", -1)],
    )
    latest_version = int((latest or {}).get("version") or 0)
    counter_identity = {"partner_id": request.partner_id, "step_id": request.step_id}
    counters = db.partner_phase2_output_counters
    try:
        await counters.update_one(
            counter_identity,
            {"$max": {"version": latest_version}},
            upsert=True,
        )
    except DuplicateKeyError:
        pass
    counter = await counters.find_one_and_update(
        counter_identity,
        {"$inc": {"version": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    version = int(counter["version"])
    output_id = uuid.uuid4().hex
    output = {
        "output_id": output_id,
        "category": request.category,
        "content": request.content,
        "source_checksums": request.source_checksums,
        "version": version,
        "status": request.initial_status,
        "is_current": True,
        "actor_id": request.actor_id,
        "reservation_state": "stored",
    }
    await versions.update_one(
        {**identity, "reservation_token": reservation_token, "reservation_state": "allocating"},
        {"$set": output},
    )

    await versions.update_many(
        {
            "partner_id": request.partner_id,
            "step_id": request.step_id,
            "is_current": True,
            "version": {"$lt": version},
        },
        {"$set": {"status": "superseded", "is_current": False}},
    )
    newer = await versions.find_one(
        {
            "partner_id": request.partner_id,
            "step_id": request.step_id,
            "version": {"$gt": version},
        },
        {"_id": 0, "version": 1},
    )
    if newer:
        await versions.update_one(
            {"output_id": output_id, "is_current": True},
            {"$set": {"status": "superseded", "is_current": False}},
        )
    return OutputVersionResult(output_id, version, checksum, True)


async def current_approved_output(db, partner_id, step_id):
    """Recupera esclusivamente la versione corrente gia' approvata."""
    return await db.partner_phase2_output_versions.find_one(
        {
            "partner_id": partner_id,
            "step_id": step_id,
            "status": "approved",
            "is_current": True,
        }
    )
