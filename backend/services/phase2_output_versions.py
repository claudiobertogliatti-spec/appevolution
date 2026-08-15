"""Archivio append-only per gli output generati nella Fase 2."""
import asyncio
import hashlib
import json
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


_RESERVATION_LEASE_SECONDS = 30
_RESERVATION_WAIT_SECONDS = 5
_INITIAL_RESERVATION_BACKOFF_SECONDS = 0.01
_MAX_RESERVATION_BACKOFF_SECONDS = 0.1


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


async def _await_reserved_output(versions, identity: dict):
    """Attende il proprietario oppure acquisisce atomicamente una lease scaduta."""
    deadline = time.monotonic() + _RESERVATION_WAIT_SECONDS
    backoff = _INITIAL_RESERVATION_BACKOFF_SECONDS
    while True:
        existing = await versions.find_one(identity, {"_id": 0})
        if existing and existing.get("output_id"):
            return _result_from_existing(existing), None
        now = datetime.now(timezone.utc)
        if existing and existing.get("reservation_expires_at") and existing["reservation_expires_at"] <= now:
            reservation_token = uuid.uuid4().hex
            reclaimed = await versions.find_one_and_update(
                {
                    **identity,
                    "reservation_state": "allocating",
                    "reservation_expires_at": {"$lte": now},
                },
                {
                    "$set": {
                        "reservation_token": reservation_token,
                        "reservation_expires_at": now + timedelta(seconds=_RESERVATION_LEASE_SECONDS),
                        "reservation_recovered_at": now,
                    }
                },
                return_document=ReturnDocument.AFTER,
            )
            if reclaimed and reclaimed.get("reservation_token") == reservation_token:
                return None, reclaimed
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("Reservation output Fase 2 ancora in corso; riprovare")
        await asyncio.sleep(min(backoff, remaining))
        backoff = min(backoff * 2, _MAX_RESERVATION_BACKOFF_SECONDS)


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
        completed, reservation = await _await_reserved_output(versions, identity)
        if completed:
            return completed
        reservation_token = reservation["reservation_token"]
    else:
        reservation_token = uuid.uuid4().hex
        now = datetime.now(timezone.utc)
        try:
            reservation = await versions.find_one_and_update(
                identity,
                {
                    "$setOnInsert": {
                        "reservation_token": reservation_token,
                        "reservation_state": "allocating",
                        "reservation_expires_at": now + timedelta(seconds=_RESERVATION_LEASE_SECONDS),
                        "created_at": now,
                    }
                },
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            existing = await versions.find_one(identity, {"_id": 0})
            if existing and existing.get("output_id"):
                return _result_from_existing(existing)
            completed, reservation = await _await_reserved_output(versions, identity)
            if completed:
                return completed
            reservation_token = reservation["reservation_token"]
        else:
            if reservation.get("output_id"):
                return _result_from_existing(reservation)
            if reservation.get("reservation_token") != reservation_token:
                completed, reservation = await _await_reserved_output(versions, identity)
                if completed:
                    return completed
                reservation_token = reservation["reservation_token"]

    version = int((reservation or {}).get("reserved_version") or 0)
    if not version:
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
        await versions.update_one(
            {**identity, "reservation_token": reservation_token, "reservation_state": "allocating"},
            {"$set": {"reserved_version": version}},
        )
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
        "reservation_expires_at": None,
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
