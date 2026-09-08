"""Presa in carico atomica e ripresa controllata dei task operativi (T05).

Il runner non sceglie esecutori e non produce effetti esterni: coordina soltanto
*chi* possiede un task e *per quanto*, così che un solo worker valido ci lavori e
nessun task sparisca dopo un'interruzione.

Vocabolario di stato: si riusa quello legacy (`pending`/`in_progress`) già letto
dal consumer esistente in ``integrated_services.process_pending_tasks``. Nessun
terzo sistema di stati — la divergenza di schema è un guasto ricorrente di Ciak.

L'atomicità del claim è garantita da ``find_one_and_update`` di MongoDB sul singolo
documento; un mock a thread singolo prova la *logica del filtro*, non l'atomicità:
per quella serve il test su Mongo reale (marcato non-``unit``).
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping, Optional, Sequence

from pymongo import ReturnDocument

# Stati legacy dai quali un task può essere preso in carico.
CLAIMABLE_STATUSES: tuple[str, ...] = ("pending", "in_progress")
# Ritardi (secondi) prima di ogni nuovo tentativo su errore transitorio.
# Dopo che i tentativi sono esauriti → blocked, mai un nuovo giro silenzioso.
DEFAULT_RETRY_BACKOFF_SECONDS: tuple[int, ...] = (60, 300)
DEFAULT_MAX_ATTEMPTS = 3


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_token() -> str:
    return secrets.token_hex(16)


def _claimable_query(now: datetime, statuses: Sequence[str]) -> dict:
    """Task prendibile: stato consentito, lease libero/scaduto e retry maturato."""
    lease_free = {
        "$or": [
            {"lease": None},
            {"lease": {"$exists": False}},
            {"lease.expires_at": {"$lte": now}},
        ]
    }
    retry_ready = {
        "$or": [
            {"retry_at": {"$exists": False}},
            {"retry_at": None},
            {"retry_at": {"$lte": now}},
        ]
    }
    return {"$and": [{"status": {"$in": list(statuses)}}, lease_free, retry_ready]}


async def claim_task(
    collection,
    worker_id: str,
    *,
    lease_seconds: int,
    now: Optional[datetime] = None,
    statuses: Sequence[str] = CLAIMABLE_STATUSES,
    match: Optional[Mapping[str, Any]] = None,
) -> Optional[dict]:
    """Prende UN task in modo atomico. Ritorna il documento aggiornato o ``None``.

    Un solo worker vince il documento: gli altri ricevono ``None``. Il claim segna
    ``status=in_progress``, valorizza il ``lease`` con owner+token e incrementa
    ``attempt_count`` (ogni presa in carico è un tentativo). Recupera anche i task
    con lease scaduto (worker morto), così l'interruzione non fa sparire il lavoro.
    """
    if not isinstance(worker_id, str) or not worker_id.strip():
        raise ValueError("worker_id obbligatorio")
    if isinstance(lease_seconds, bool) or not isinstance(lease_seconds, int) or lease_seconds <= 0:
        raise ValueError("lease_seconds deve essere un intero positivo")
    now = now or _utcnow()
    token = _new_token()
    query = _claimable_query(now, statuses)
    if match:
        query = {"$and": [query, dict(match)]}
    update = {
        "$set": {
            "status": "in_progress",
            "lease": {
                "owner": worker_id,
                "token": token,
                "claimed_at": now,
                "expires_at": now + timedelta(seconds=lease_seconds),
            },
        },
        "$inc": {"attempt_count": 1},
    }
    return await collection.find_one_and_update(
        query, update, sort=[("created_at", 1)], return_document=ReturnDocument.AFTER
    )


async def renew_lease(
    collection,
    task_id: str,
    token: str,
    *,
    lease_seconds: int,
    now: Optional[datetime] = None,
) -> Optional[dict]:
    """Prolunga il lease solo se il token combacia (il worker lo possiede ancora)."""
    now = now or _utcnow()
    return await collection.find_one_and_update(
        {"id": task_id, "lease.token": token},
        {"$set": {"lease.expires_at": now + timedelta(seconds=lease_seconds)}},
        return_document=ReturnDocument.AFTER,
    )


async def complete_with_lease(
    collection,
    task_id: str,
    token: str,
    result: Mapping[str, Any],
    *,
    now: Optional[datetime] = None,
) -> Optional[dict]:
    """Segna ``completed`` solo se il token combacia.

    Un worker vecchio che finisce in ritardo (lease già scaduto e ripreso da altri)
    trova il token cambiato e riceve ``None``: non può chiudere il task di un altro.
    Il chiamante che riceve ``None`` NON deve considerare il lavoro consegnato.
    """
    now = now or _utcnow()
    return await collection.find_one_and_update(
        {"id": task_id, "lease.token": token},
        {
            "$set": {
                "status": "completed",
                "result": dict(result),
                "completed_at": now.isoformat(),
            },
            "$unset": {"lease": "", "retry_at": ""},
        },
        return_document=ReturnDocument.AFTER,
    )


@dataclass(frozen=True)
class RetryDecision:
    action: str  # "retry" | "blocked"
    status: str  # "pending" | "blocked"
    attempt_count: int
    error_code: str
    reason: str
    retry_at: Optional[datetime] = None


def plan_retry(
    attempt_count: int,
    *,
    retryable: bool,
    error_code: str,
    reason: str,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    backoff: Sequence[int] = DEFAULT_RETRY_BACKOFF_SECONDS,
    now: Optional[datetime] = None,
) -> RetryDecision:
    """Decide se ritentare o bloccare, senza toccare il database.

    ``attempt_count`` è il numero di tentativi già effettuati (incluso quello appena
    fallito, cioè il valore incrementato da :func:`claim_task`). Errore permanente o
    permesso mancante → subito ``blocked``. Tentativi esauriti → ``blocked``, con
    ``error_code=attempts_exhausted`` così l'esito è distinguibile.
    """
    if isinstance(attempt_count, bool) or not isinstance(attempt_count, int) or attempt_count < 1:
        raise ValueError("attempt_count deve essere un intero >= 1")
    now = now or _utcnow()
    if not retryable:
        return RetryDecision("blocked", "blocked", attempt_count, error_code, reason)
    if attempt_count >= max_attempts:
        return RetryDecision(
            "blocked", "blocked", attempt_count, "attempts_exhausted",
            f"{reason} (tentativi esauriti dopo {attempt_count})",
        )
    index = attempt_count - 1
    delay = backoff[index] if index < len(backoff) else backoff[-1]
    return RetryDecision(
        "retry", "pending", attempt_count, error_code, reason,
        retry_at=now + timedelta(seconds=delay),
    )


async def apply_retry(
    collection,
    task_id: str,
    token: str,
    decision: RetryDecision,
    *,
    owner_id: Optional[str] = None,
    provider_result: Optional[Mapping[str, Any]] = None,
) -> Optional[dict]:
    """Applica la decisione di :func:`plan_retry`, solo con token combaciante.

    ``retry`` rimette il task in ``pending`` con ``retry_at`` futuro e **rilascia il
    lease**, così un worker potrà riprenderlo alla scadenza. ``blocked`` lo ferma con
    causa e owner del recupero. In entrambi i casi il token deve combaciare: un worker
    scaduto non può declassare il lavoro ripreso da un altro.
    """
    next_action = {"owner_id": owner_id or "operations"}
    set_fields: dict = {
        "error_code": decision.error_code,
        "next_action": next_action,
        "last_error": {"error_code": decision.error_code, "reason": decision.reason},
    }
    if provider_result is not None:
        set_fields["last_error"]["provider_result"] = dict(provider_result)
    if decision.action == "retry":
        set_fields["status"] = "pending"
        set_fields["retry_at"] = decision.retry_at
        unset = {"lease": ""}
    else:
        set_fields["status"] = "blocked"
        unset = {"lease": "", "retry_at": ""}
    return await collection.find_one_and_update(
        {"id": task_id, "lease.token": token},
        {"$set": set_fields, "$unset": unset},
        return_document=ReturnDocument.AFTER,
    )


async def ensure_task_indexes(db) -> None:
    """Indici a supporto del claim atomico. ``create_index`` è idempotente."""
    await db.agent_tasks.create_index([("status", 1), ("lease.expires_at", 1)])
    await db.agent_tasks.create_index([("status", 1), ("retry_at", 1)])
