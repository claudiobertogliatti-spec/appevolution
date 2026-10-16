"""Registro eventi, escalation persistente e guardie di recupero (T08).

- Ogni transizione di un task lascia una traccia (timeline append-only).
- L'escalation è persistente e **deduplicata per incidente**: una notifica fallita
  NON chiude il problema (``delivery=failed`` ma ``resolved`` resta ``False``).
- Il recupero manuale è controllato: un task con effetto esterno incerto (UNKNOWN,
  vedi T07) non si ritenta alla cieca — prima si riconcilia.

Le funzioni operano su collection passate dal chiamante (motor in produzione, un
fake nei test): nessun client creato qui.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, List, Mapping, Optional, Tuple

# Errori/flag di effetto esterno incerto: vietato ritentare, si riconcilia prima
# (coerente con evidence.EffectOutcome.UNKNOWN, T07).
UNCERTAIN_ERROR_CODES = frozenset({
    "execution_uncertain",
    "verification_uncertain",
    "reconciliation_required",
})
# Stati dai quali un admin può legittimamente ritentare.
RETRYABLE_STATUSES = frozenset({"blocked", "failed"})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def append_event(
    events,
    task_id: str,
    kind: str,
    *,
    actor: Optional[str] = None,
    detail: Optional[Mapping[str, Any]] = None,
    now: Optional[datetime] = None,
) -> dict:
    """Aggiunge un evento alla timeline del task (append-only)."""
    now = now or _utcnow()
    doc = {
        "task_id": task_id,
        "kind": kind,
        "actor": actor,
        "detail": dict(detail or {}),
        "at": now.isoformat(),
    }
    await events.insert_one(doc)
    return doc


async def timeline(events, task_id: str) -> List[dict]:
    """Timeline ordinata di un task."""
    return await events.find({"task_id": task_id}, {"_id": 0}).sort("at", 1).to_list(500)


def incident_key(task_id: str, error_code: Optional[str]) -> str:
    raw = f"{task_id}::{error_code or 'generic'}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


async def escalate(
    escalations,
    task_id: str,
    error_code: Optional[str],
    *,
    owner_id: str,
    reason: str,
    now: Optional[datetime] = None,
) -> dict:
    """Apre un'escalation deduplicando per incidente.

    Se esiste già un'escalation NON risolta per lo stesso ``(task, error_code)``, la
    ritorna con ``_deduped=True`` senza crearne un'altra: niente valanghe di avvisi
    per lo stesso problema.
    """
    now = now or _utcnow()
    key = incident_key(task_id, error_code)
    existing = await escalations.find_one({"incident_key": key, "resolved": False})
    if existing:
        return {**existing, "_deduped": True}
    doc = {
        "incident_key": key,
        "task_id": task_id,
        "error_code": error_code,
        "owner_id": owner_id,
        "reason": reason,
        "opened_at": now.isoformat(),
        "delivery": "pending",
        "resolved": False,
    }
    await escalations.insert_one(doc)
    return {**doc, "_deduped": False}


async def record_escalation_delivery(
    escalations,
    key: str,
    *,
    delivered: bool,
    detail: Optional[str] = None,
    now: Optional[datetime] = None,
) -> None:
    """Registra l'esito della notifica. Una consegna FALLITA non risolve nulla: il
    problema resta aperto (``resolved`` non viene toccato)."""
    now = now or _utcnow()
    await escalations.update_one(
        {"incident_key": key},
        {"$set": {
            "delivery": "delivered" if delivered else "failed",
            "delivery_detail": detail,
            "delivery_at": now.isoformat(),
        }},
    )


async def resolve_escalation(escalations, key: str, *, resolved_by: str, now: Optional[datetime] = None) -> None:
    """Chiude esplicitamente un'escalation (solo un'azione voluta la risolve)."""
    now = now or _utcnow()
    await escalations.update_one(
        {"incident_key": key},
        {"$set": {"resolved": True, "resolved_by": resolved_by, "resolved_at": now.isoformat()}},
    )


def can_admin_retry(task: Mapping[str, Any]) -> Tuple[bool, str]:
    """Un admin può ritentare solo se lo stato è recuperabile e l'effetto NON è incerto.

    Un effetto incerto (``reconciliation_required`` o un ``error_code`` UNKNOWN) va
    riconciliato prima: ritentarlo alla cieca è ciò che crea i doppioni (T07).
    """
    status = task.get("status")
    if status not in RETRYABLE_STATUSES:
        return (False, f"stato non ritentabile: {status!r}")
    if task.get("reconciliation_required") is True:
        return (False, "effetto incerto: riconciliare prima di ritentare")
    if task.get("error_code") in UNCERTAIN_ERROR_CODES:
        return (False, f"esito incerto ({task.get('error_code')}): riconciliare prima")
    return (True, "")
