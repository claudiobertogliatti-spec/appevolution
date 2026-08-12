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

from copy import deepcopy
from datetime import timedelta
import ipaddress
import logging
import os
from datetime import date, datetime, timezone
from typing import Literal
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from services.editorial_calendar import build_editorial_calendar
from services.launch_calendar import (
    calendar_checksum,
    evaluate_launch_calendar,
    normalize_launch_calendar,
)

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


class SubmitCalendarVersionBody(BaseModel):
    partner_confirmed: bool
    expected_checksum: str


class ReviewCalendarVersionBody(BaseModel):
    decision: Literal["approve", "reject"]
    note: str


class DrainCalendarNotificationRecoveryBody(BaseModel):
    """Limite esplicito per il consumer amministrativo della recovery alert."""

    limit: int = Field(default=25, ge=1, le=100)


_STRUCTURAL_READINESS_CODES = {
    "exactly_30_days",
    "consecutive_dates",
    "live_day_28",
    "day_fields",
    "canonical_enums",
    "https_destination_urls",
    "content_cadence",
    "funnel_sequence",
}


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
        "approval_resources",
        "updated_at",
        "updated_by",
    )
    return {field: document[field] for field in public_fields if field in document}


def _structural_readiness_failures(calendar: dict) -> list[str]:
    """Valida la struttura prima della conferma, senza fingere prove esterne.

    Le verifiche di URL, condizioni commerciali e approvazione finale sono
    attestazioni separate: qui il partner puo' presentare soltanto un calendario
    semanticamente coerente al team per la review.
    """
    readiness = evaluate_launch_calendar(calendar, {})
    return [
        code for code in readiness.failed_codes
        if code in _STRUCTURAL_READINESS_CODES
    ]


def _raise_calendar_not_ready(failed_checks: list[str]) -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "launch_calendar_not_ready",
            "failed_checks": failed_checks,
        },
    )


async def _require_calendar_admin(credentials: HTTPAuthorizationCredentials):
    """Distinzione locale: token assente/non valido e' 401, ruolo errato 403."""
    from auth import decode_token

    if not credentials:
        raise HTTPException(401, "Token non fornito")
    actor = decode_token(credentials.credentials)
    if not actor:
        raise HTTPException(401, "Token non valido o scaduto")
    if getattr(actor, "role", None) not in ("admin", "superadmin"):
        raise HTTPException(403, "Accesso riservato agli admin")
    return actor


def _canonical_public_review_host(value: object) -> str | None:
    """Restituisce solo host HTTPS canonici e pubblici, senza alcuna risoluzione DNS."""
    if not isinstance(value, str):
        return None
    try:
        parsed = urlparse(value)
        # Accedere a ``port`` forza anche la validazione delle porte malformate.
        _ = parsed.port
    except ValueError:
        return None
    if (
        parsed.scheme != "https"
        or parsed.username is not None
        or parsed.password is not None
        or not parsed.hostname
    ):
        return None
    hostname = parsed.hostname
    # I nomi FQDN con il punto finale sono semanticamente equivalenti, ma qui non
    # sono una forma canonica: la review deve fissare un URL univoco e pubblico.
    if hostname.endswith("."):
        return None
    try:
        canonical = hostname.encode("idna").decode("ascii").lower()
    except UnicodeError:
        return None
    if (
        not canonical
        or canonical == "localhost"
        or canonical.endswith(".localhost")
        or canonical.endswith(".test")
        or canonical.endswith(".invalid")
    ):
        return None
    try:
        address = ipaddress.ip_address(canonical)
    except ValueError:
        labels = canonical.split(".")
        # Non interpretiamo mai le forme IPv4 legacy: abbreviazioni, interi,
        # esadecimali e ottali sono host ambigui e possono aggirare i controlli.
        if "." not in canonical or all(
            label.isdigit() or label.lower().startswith("0x")
            for label in labels
        ):
            return None
        return canonical
    if not address.is_global or any((
        address.is_private,
        address.is_loopback,
        address.is_link_local,
        address.is_reserved,
        getattr(address, "is_site_local", False),
        address.is_multicast,
        address.is_unspecified,
    )):
        return None
    return canonical


def _is_real_review_destination(value: object) -> bool:
    """La review non fa rete e non attesta host/IP non pubblici o fixture."""
    return _canonical_public_review_host(value) is not None


def _partner_confirmation_is_consistent(document: dict, calendar: dict) -> bool:
    confirmation = calendar.get("partner_confirmation")
    return (
        isinstance(confirmation, dict)
        and confirmation.get("partner_id") == document.get("partner_id")
        and confirmation.get("confirmed_at") == document.get("partner_confirmed_at")
        and confirmation.get("calendar_version") == document.get("partner_confirmed_version")
        and confirmation.get("calendar_checksum") == document.get("partner_confirmed_checksum")
        and confirmation.get("calendar_checksum") == document.get("checksum")
        and calendar.get("version") == document.get("partner_confirmed_version")
        and calendar_checksum(calendar) == document.get("checksum")
    )


def _admin_review_resources(calendar: dict, reviewed_at: str) -> tuple[dict, list[str]]:
    """Snapshot esclusivamente dal documento pending e dall'atto admin corrente."""
    destinations: dict[str, dict] = {}
    invalid_destinations = False
    for day in calendar.get("days") or []:
        if not isinstance(day, dict):
            invalid_destinations = True
            continue
        url = day.get("destination_url")
        destination_kind = day.get("destination_kind")
        if not _is_real_review_destination(url) or not isinstance(destination_kind, str):
            invalid_destinations = True
            continue
        evidence = {
            "verified": True,
            "verified_at": reviewed_at,
            "purpose": destination_kind,
            "destination_kind": destination_kind,
        }
        if url in destinations and destinations[url]["destination_kind"] != destination_kind:
            invalid_destinations = True
            continue
        destinations[url] = evidence
    return {
        "verified_destinations": destinations,
        "organic_routine": deepcopy(calendar.get("organic_routine")),
        "commercial_terms": deepcopy(calendar.get("commercial_terms")),
        "evaluated_at": reviewed_at,
    }, ["verified_destination_urls"] if invalid_destinations else []


def _notification_event_key(partner_id: str, version: int, checksum: str) -> str:
    """Chiave idempotente: Mongo garantisce l'unicita' del suo ``_id``."""
    return f"calendar-pending-review:{partner_id}:{version}:{checksum}"


async def _ensure_pending_review_notification_outbox(
    partner_id: str,
    version: int,
    checksum: str,
) -> str:
    """Materializza l'outbox deterministico senza eseguire alcun side effect."""
    from pymongo import ReturnDocument

    event_key = _notification_event_key(partner_id, version, checksum)
    await db.partner_launch_calendar_notification_recovery.find_one_and_update(
        {"_id": event_key},
        {
            "$setOnInsert": {
                "event_key": event_key,
                "partner_id": partner_id,
                "version": version,
                "checksum": checksum,
                "event": "pending_review",
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return event_key


async def _claim_pending_review_notification(
    partner_id: str,
    version: int,
    checksum: str,
) -> dict | None:
    """Claim con lease: i sender morti restano recuperabili dopo la scadenza."""
    from pymongo import ReturnDocument

    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    lease_expires_at = (now_dt + timedelta(minutes=5)).isoformat()
    owner = uuid4().hex
    event_key = await _ensure_pending_review_notification_outbox(
        partner_id, version, checksum
    )
    claim = await db.partner_launch_calendar_notification_recovery.find_one_and_update(
        {"_id": event_key, "status": "pending"},
        {
            "$set": {
                "status": "sending",
                "lease_owner": owner,
                "claimed_at": now,
                "lease_expires_at": lease_expires_at,
                "last_attempt_at": now,
                "last_attempt_status": "sending",
            },
            "$inc": {"attempt_count": 1},
        },
        return_document=ReturnDocument.AFTER,
    )
    if claim:
        return claim
    return await db.partner_launch_calendar_notification_recovery.find_one_and_update(
        {"_id": event_key, "status": "sending", "lease_expires_at": {"$lte": now}},
        {
            "$set": {
                "lease_owner": owner,
                "claimed_at": now,
                "lease_expires_at": lease_expires_at,
                "reclaimed_at": now,
                "last_attempt_at": now,
                "last_attempt_status": "sending",
            },
            "$inc": {"attempt_count": 1},
        },
        return_document=ReturnDocument.AFTER,
    )


async def _write_pending_review_in_app_alert(
    partner_id: str,
    version: int,
    event_key: str,
) -> str:
    """Consegna garantita: alert in-app idempotente. Telegram e' solo best-effort."""
    from pymongo import ReturnDocument
    from routers.partner_journey import notify_telegram

    partner = await db.partners.find_one(
        {"id": partner_id}, {"_id": 0, "name": 1, "email": 1}
    )
    name = (partner or {}).get("name") or f"Partner {partner_id}"
    now = datetime.now(timezone.utc)
    alert = {
        "_id": event_key,
        "id": event_key,
        "event_key": event_key,
        "agent": "STEFANIA",
        "type": "CONSEGNA",
        "msg": f"{name} ha confermato il calendario di lancio v{version} — da approvare",
        "time": now.strftime("%d/%m %H:%M"),
        "partner": name,
        "partner_id": partner_id,
        "kind": "partner_activity",
        "requires_approval": True,
        "resolved": False,
        "created_at": now.isoformat(),
        "link": f"/admin/partner?id={partner_id}",
    }
    await db.alerts.find_one_and_update(
        {"_id": event_key},
        {"$setOnInsert": alert},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    try:
        await notify_telegram(f"📥 {name} ha confermato il calendario di lancio v{version} (da approvare)")
        return "best_effort_attempted"
    except Exception:
        logger.warning("Telegram calendario non consegnato per %s v%s", partner_id, version)
        return "best_effort_failed"


async def _notify_pending_review_or_record_recovery(
    partner_id: str,
    version: int,
    checksum: str,
) -> None:
    """Invia una sola volta; solo un recovery ``pending`` puo' essere ritentato."""
    claim = await _claim_pending_review_notification(partner_id, version, checksum)
    if not claim:
        return
    await _deliver_pending_review_notification_claim(claim)


async def _attempt_pending_review_notification(
    partner_id: str,
    version: int,
    checksum: str,
) -> None:
    """Il submit resta deterministico: il drain riconciliera' un outbox non creato."""
    try:
        await _notify_pending_review_or_record_recovery(partner_id, version, checksum)
    except Exception:
        logger.warning(
            "Outbox calendario non creato per %s v%s; verra' riconciliato dal drain",
            partner_id,
            version,
        )


async def _deliver_pending_review_notification_claim(claim: dict) -> bool:
    """Consegna l'alert in-app per un claim; il lease resta recuperabile se il processo muore."""
    from pymongo import ReturnDocument

    partner_id = str(claim["partner_id"])
    version = int(claim["version"])
    event_key = str(claim["event_key"])
    now = datetime.now(timezone.utc).isoformat()
    try:
        telegram_status = await _write_pending_review_in_app_alert(
            partner_id, version, event_key
        )
    except Exception:
        await db.partner_launch_calendar_notification_recovery.find_one_and_update(
            {"_id": event_key, "status": "sending", "lease_owner": claim["lease_owner"]},
            {
                "$set": {
                    "status": "pending",
                    "error_code": "admin_notification_failed",
                    "last_failed_at": now,
                    "last_attempt_status": "pending",
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        return False

    sent = await db.partner_launch_calendar_notification_recovery.find_one_and_update(
        {"_id": event_key, "status": "sending", "lease_owner": claim["lease_owner"]},
        {"$set": {
            "status": "sent",
            "sent_at": now,
            "delivery_contract": "in_app_alert",
            "telegram_status": telegram_status,
            "last_attempt_status": "sent",
        }},
        return_document=ReturnDocument.AFTER,
    )
    return sent is not None


async def _drain_calendar_notification_recovery(limit: int = 25) -> dict:
    """Consumer schedulabile: recupera alert pending o lease scaduti una sola volta."""
    pending_reviews = await db.partner_launch_calendar_versions.find(
        {"status": "pending_review"}, {"_id": 0}
    ).sort("created_at", 1).to_list(limit)
    for document in pending_reviews:
        calendar = document.get("calendar") or {}
        if _partner_confirmation_is_consistent(document, calendar):
            await _ensure_pending_review_notification_outbox(
                str(document["partner_id"]),
                int(document["version"]),
                str(document["checksum"]),
            )

    now = datetime.now(timezone.utc).isoformat()
    candidates = await db.partner_launch_calendar_notification_recovery.find(
        {
            "$or": [
                {"status": "pending"},
                {"status": "sending", "lease_expires_at": {"$lte": now}},
            ]
        },
        {"_id": 0},
    ).sort("created_at", 1).to_list(limit)
    result = {"claimed": 0, "sent": 0, "pending": 0}
    for candidate in candidates:
        claim = await _claim_pending_review_notification(
            str(candidate["partner_id"]),
            int(candidate["version"]),
            str(candidate["checksum"]),
        )
        if not claim:
            continue
        result["claimed"] += 1
        if await _deliver_pending_review_notification_claim(claim):
            result["sent"] += 1
        else:
            result["pending"] += 1
    return result


@router.post("/admin/notification-recovery/drain")
async def drain_calendar_notification_recovery(
    body: DrainCalendarNotificationRecoveryBody,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Retry amministrabile per l'outbox alert; adatto anche a un job schedulato."""
    await _require_calendar_admin(credentials)
    return await _drain_calendar_notification_recovery(body.limit)


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


@router.post("/{partner_id}/versions/{version}/submit")
async def submit_calendar_version(
    partner_id: str,
    version: int,
    body: SubmitCalendarVersionBody,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Il partner conferma una bozza strutturalmente pronta per la review admin."""
    from pymongo import ReturnDocument
    from routers.partner_journey import require_partner_or_admin_for_partner

    actor = await require_partner_or_admin_for_partner(partner_id, credentials)
    if getattr(actor, "role", None) != "partner":
        raise HTTPException(403, "La conferma deve essere effettuata dal partner")

    existing = await db.partner_launch_calendar_versions.find_one(
        {"partner_id": partner_id, "version": version},
        {"_id": 0},
    )
    if not existing:
        raise HTTPException(404, "Versione del calendario non trovata")
    if existing.get("status") == "pending_review":
        if (
            existing.get("partner_confirmed_by") == _actor_id(actor)
            and existing.get("partner_confirmed_expected_checksum") == body.expected_checksum
            and body.partner_confirmed is True
        ):
            await _attempt_pending_review_notification(
                partner_id, version, existing.get("checksum") or ""
            )
            return _response_document(existing)
        raise HTTPException(409, "La conferma gia' registrata non corrisponde alla richiesta")
    if existing.get("status") != "draft":
        raise HTTPException(409, "La versione non e' piu' una bozza modificabile")
    if existing.get("checksum") != body.expected_checksum:
        raise HTTPException(409, "La bozza e' stata modificata altrove")
    if not body.partner_confirmed:
        _raise_calendar_not_ready(["partner_confirmation"])

    failed_checks = _structural_readiness_failures(existing.get("calendar") or {})
    if failed_checks:
        _raise_calendar_not_ready(failed_checks)

    confirmed_at = datetime.now(timezone.utc).isoformat()
    calendar = deepcopy(existing.get("calendar") or {})
    calendar["version"] = str(version)
    confirmed_checksum = calendar_checksum(calendar)
    calendar["partner_confirmation"] = {
        "partner_id": partner_id,
        "confirmed_at": confirmed_at,
        "calendar_version": str(version),
        "calendar_checksum": confirmed_checksum,
    }
    document = await db.partner_launch_calendar_versions.find_one_and_update(
        {
            "partner_id": partner_id,
            "version": version,
            "status": "draft",
            "checksum": body.expected_checksum,
        },
        {
            "$set": {
                "status": "pending_review",
                "calendar": calendar,
                "checksum": confirmed_checksum,
                "partner_confirmed_at": confirmed_at,
                "partner_confirmed_by": _actor_id(actor),
                "partner_confirmed_version": str(version),
                "partner_confirmed_checksum": confirmed_checksum,
                "partner_confirmed_expected_checksum": body.expected_checksum,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not document:
        winner = await db.partner_launch_calendar_versions.find_one(
            {"partner_id": partner_id, "version": version},
            {"_id": 0},
        )
        if (
            winner
            and winner.get("status") == "pending_review"
            and winner.get("partner_confirmed_by") == _actor_id(actor)
            and winner.get("partner_confirmed_expected_checksum") == body.expected_checksum
            and body.partner_confirmed is True
        ):
            await _attempt_pending_review_notification(
                partner_id, version, winner.get("checksum") or ""
            )
            return _response_document(winner)
        raise HTTPException(409, "La bozza e' stata modificata altrove")

    await _attempt_pending_review_notification(partner_id, version, document["checksum"])
    return _response_document(document)


@router.post("/{partner_id}/versions/{version}/review")
async def review_calendar_version(
    partner_id: str,
    version: int,
    body: ReviewCalendarVersionBody,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Registra una sola decisione admin sulla versione confermata dal partner."""
    from pymongo import ReturnDocument

    actor = await _require_calendar_admin(credentials)
    existing = await db.partner_launch_calendar_versions.find_one(
        {"partner_id": partner_id, "version": version},
        {"_id": 0},
    )
    if not existing:
        raise HTTPException(404, "Versione del calendario non trovata")

    target_status = "approved" if body.decision == "approve" else "rejected"
    existing_review = existing.get("admin_review") or {}
    if existing.get("status") in ("approved", "rejected"):
        if (
            existing.get("status") == target_status
            and existing_review.get("decision") == body.decision
            and existing_review.get("note") == body.note
            and existing_review.get("reviewed_by") == _actor_id(actor)
        ):
            return _response_document(existing)
        raise HTTPException(409, "La review gia' registrata non corrisponde alla richiesta")
    if existing.get("status") != "pending_review":
        raise HTTPException(409, "La versione non e' in attesa di review")

    reviewed_at = datetime.now(timezone.utc).isoformat()
    review = {
        "decision": body.decision,
        "note": body.note,
        "reviewed_at": reviewed_at,
        "reviewed_by": _actor_id(actor),
    }
    review_updates = {
        "status": target_status,
        "admin_review": review,
    }
    if body.decision == "approve":
        calendar = deepcopy(existing.get("calendar") or {})
        if not _partner_confirmation_is_consistent(existing, calendar):
            _raise_calendar_not_ready(["partner_confirmation"])
        approved_checksum = calendar_checksum(calendar)
        admin_approval = {
            "admin_id": _actor_id(actor),
            "approved_at": reviewed_at,
            "calendar_version": calendar.get("version"),
            "calendar_checksum": approved_checksum,
        }
        calendar["admin_approval"] = admin_approval
        resources, resource_failures = _admin_review_resources(calendar, reviewed_at)
        readiness = evaluate_launch_calendar(calendar, resources)
        failed_checks = sorted(set(resource_failures + readiness.failed_codes))
        if failed_checks:
            _raise_calendar_not_ready(failed_checks)
        review["approved_checksum"] = approved_checksum
        review_updates.update(
            {
                "calendar": calendar,
                "checksum": approved_checksum,
                "approval_resources": resources,
                "approved_checksum": approved_checksum,
                "approved_at": reviewed_at,
                "approved_by": _actor_id(actor),
            }
        )

    document = await db.partner_launch_calendar_versions.find_one_and_update(
        {
            "partner_id": partner_id,
            "version": version,
            "status": "pending_review",
            "checksum": existing.get("checksum"),
        },
        {"$set": review_updates},
        return_document=ReturnDocument.AFTER,
    )
    if not document:
        winner = await db.partner_launch_calendar_versions.find_one(
            {"partner_id": partner_id, "version": version},
            {"_id": 0},
        )
        winner_review = (winner or {}).get("admin_review") or {}
        if (
            winner
            and winner.get("status") == target_status
            and winner_review.get("decision") == body.decision
            and winner_review.get("note") == body.note
            and winner_review.get("reviewed_by") == _actor_id(actor)
        ):
            return _response_document(winner)
        raise HTTPException(409, "La review e' gia' stata registrata o la versione e' cambiata")
    return _response_document(document)
