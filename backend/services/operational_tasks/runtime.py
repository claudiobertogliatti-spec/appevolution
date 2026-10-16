"""Salute runtime, arresto controllato dei claim e proprietario unico dei periodici (T09).

Tre pezzi, tutti puri (i dati grezzi arrivano dal chiamante — heartbeat da Redis/Mongo,
`is_redis_available()` da celery_manager):

1. `classify_runtime_health` — distingue **istanza API** e **servizio worker separato**.
   L'istanza API NON vede il processo worker (`_worker_process` è locale): l'assenza del
   processo locale non significa "worker giù". Senza un heartbeat condiviso il verdetto è
   `UNKNOWN_SEPARATE`, mai `DOWN`. È la lezione del monitor video che mentiva.
2. `is_claim_suspended` — arresto controllato dei NUOVI claim per reparto/capacità, senza
   toccare i lavori e le prove in corso.
3. `claim_periodic_window` — un solo proprietario per finestra temporale (dedup dei periodici).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Iterable, Mapping, Optional

DEFAULT_HEARTBEAT_MAX_AGE_SECONDS = 180


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────── 1. salute runtime ───────────────────────────────

class RuntimeHealth(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"            # vivo ma heartbeat vecchio / non riporta
    DOWN = "down"                    # sicuramente fermo (broker giù, o worker locale morto)
    UNKNOWN_SEPARATE = "unknown_separate"  # servizio separato non osservabile da qui


def classify_runtime_health(
    *,
    is_worker_service: bool,
    redis_ok: bool,
    local_worker_alive: Optional[bool],
    heartbeat_age_seconds: Optional[float],
    heartbeat_max_age_seconds: int = DEFAULT_HEARTBEAT_MAX_AGE_SECONDS,
) -> RuntimeHealth:
    """Verdetto onesto sulla salute del consumer/scheduler.

    `is_worker_service`: True se GIRO sul servizio worker (posso guardare il processo
    locale); False se sono l'istanza API (NON vedo il worker, mi fido solo dell'heartbeat
    condiviso). `heartbeat_age_seconds` None = nessun heartbeat noto.
    """
    if not redis_ok:
        # Il broker Celery è giù: la coda non può lavorare. Verdetto certo.
        return RuntimeHealth.DOWN

    fresh = heartbeat_age_seconds is not None and heartbeat_age_seconds <= heartbeat_max_age_seconds

    if is_worker_service:
        if not local_worker_alive:
            return RuntimeHealth.DOWN
        return RuntimeHealth.HEALTHY if fresh else RuntimeHealth.DEGRADED

    # Istanza API: non può vedere il processo del worker separato.
    if heartbeat_age_seconds is None:
        return RuntimeHealth.UNKNOWN_SEPARATE  # niente heartbeat: NON dichiarare "down"
    return RuntimeHealth.HEALTHY if fresh else RuntimeHealth.DEGRADED


# ─────────────────────────── 2. arresto controllato dei claim ───────────────────────────

@dataclass(frozen=True)
class ClaimGate:
    allowed: bool
    reason: str = ""


def is_claim_suspended(
    suspensions: Iterable[Mapping],
    department_id: Optional[str],
    capability: Optional[str] = None,
) -> ClaimGate:
    """Un nuovo claim è sospeso se esiste una sospensione ATTIVA che copre reparto+capacità.

    Una sospensione con `department_id=None` copre tutti i reparti; con `capability=None`
    copre tutte le capacità del reparto. NON tocca i lease in corso: ferma solo le NUOVE prese.
    """
    for s in suspensions:
        if s.get("resolved") is True or s.get("active") is False:
            continue
        dep = s.get("department_id")
        cap = s.get("capability")
        if dep not in (None, department_id):
            continue
        if cap not in (None, capability):
            continue
        return ClaimGate(False, s.get("reason") or f"claim sospeso (reparto={dep}, capacità={cap})")
    return ClaimGate(True, "")


# ─────────────────────────── 3. proprietario unico dei periodici ───────────────────────────

def periodic_window_key(job_name: str, now: datetime, window_seconds: int) -> str:
    """Chiave stabile della finestra temporale: tutti i tick della stessa finestra la condividono."""
    if window_seconds <= 0:
        raise ValueError("window_seconds deve essere positivo")
    epoch_window = int(now.timestamp()) // window_seconds
    return f"{job_name}:{epoch_window}"


async def claim_periodic_window(
    collection,
    job_name: str,
    window_key: str,
    *,
    now: Optional[datetime] = None,
) -> bool:
    """Un solo proprietario per finestra: vince chi inserisce la chiave unica.

    Usa un upsert su `_id = window_key`: il primo chiamante ottiene `upserted_id`, gli
    altri trovano il documento già presente e ricevono `False`. L'atomicità è garantita da
    MongoDB (chiave `_id` unica), come per il claim dei task in T05.
    """
    now = now or _utcnow()
    res = await collection.update_one(
        {"_id": window_key},
        {"$setOnInsert": {"job": job_name, "claimed_at": now.isoformat()}},
        upsert=True,
    )
    return getattr(res, "upserted_id", None) is not None
