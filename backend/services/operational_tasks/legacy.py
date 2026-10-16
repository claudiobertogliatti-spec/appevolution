"""Proiezione di sola lettura degli schemi task storici."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Mapping, Optional

from .contracts import TaskKind, VerificationStatus
from .registry import TaskRegistry


_CLOSED_STATUSES = {"completed", "resolved", "cancelled", "dismissed"}
_SIGNAL_TYPES = {
    "lead_blocked", "partner_inactive", "pipeline_failed", "payment_issue",
    "onboarding_stuck", "content_review", "system_error", "custom",
}
_HUMAN_ASSIGNEES = {"antonella"}


@dataclass(frozen=True)
class LegacyTaskProjection:
    task_id: str
    task_type: Optional[str]
    status: Optional[str]
    kind: TaskKind
    verification: VerificationStatus
    eligible_for_ai: bool
    original: Mapping[str, Any]


def _identifier(document: Mapping[str, Any]) -> Optional[str]:
    value = document.get("id") or document.get("task_id")
    return value if isinstance(value, str) and value.strip() else None


def _kind(document: Mapping[str, Any]) -> TaskKind:
    assignee = document.get("assigned_to") or document.get("assignee") or document.get("owner_id")
    economic_markers = {"time_entries", "approved_minutes", "hourly_rate", "collaborator_settlement_id"}
    entity_type = document.get("entity_type")
    if (
        isinstance(assignee, str) and assignee.strip().lower() in _HUMAN_ASSIGNEES
    ) or entity_type == "collaborator" or any(key in document for key in economic_markers):
        return TaskKind.COLLABORATOR
    explicit = document.get("task_kind") or document.get("kind")
    if isinstance(explicit, str):
        if explicit in {TaskKind.AI.value, "agent", "ai_task"}:
            return TaskKind.AI
        if explicit in {TaskKind.COLLABORATOR.value, "human", "collaborator_task"}:
            return TaskKind.COLLABORATOR
        if explicit in {TaskKind.SIGNAL.value, "alert", "incident"}:
            return TaskKind.SIGNAL
    task_type = document.get("task_type")
    if isinstance(task_type, str) and task_type in _SIGNAL_TYPES and "created_by_agent" in document:
        return TaskKind.SIGNAL
    # Lo schema dell'executor storico ha id + agent + data. Richiediamo tutti i marker.
    if isinstance(document.get("id"), str) and isinstance(document.get("agent"), str) and isinstance(document.get("data"), Mapping):
        return TaskKind.AI
    return TaskKind.AMBIGUOUS


def _verification(document: Mapping[str, Any], status: Optional[str]) -> VerificationStatus:
    raw = document.get("verification")
    if isinstance(raw, Mapping):
        raw = raw.get("status")
    evidence = document.get("evidence_refs") or document.get("evidence")
    if status in _CLOSED_STATUSES and not evidence:
        return VerificationStatus.UNKNOWN
    if raw == VerificationStatus.VERIFIED.value and not evidence:
        return VerificationStatus.UNKNOWN
    try:
        return VerificationStatus(raw)
    except (ValueError, TypeError):
        pass
    return VerificationStatus.PENDING


def project_legacy_task(document: Mapping[str, Any], registry: Optional[TaskRegistry] = None) -> LegacyTaskProjection:
    """Normalizza per lettura senza mutare o riscrivere il documento sorgente."""
    if not isinstance(document, Mapping):
        raise TypeError("document deve essere una mappa")
    task_id = _identifier(document)
    if task_id is None:
        raise ValueError("il task storico non ha id/task_id leggibile")
    task_type = document.get("task_type")
    task_type = task_type if isinstance(task_type, str) and task_type.strip() else None
    status = document.get("status")
    status = status if isinstance(status, str) else None
    kind = _kind(document)
    # T03 è sola compatibilità di lettura: nessun documento legacy è eseguibile
    # finché un bridge successivo non lo importa esplicitamente nel nuovo schema.
    eligible = False
    original = MappingProxyType(deepcopy(dict(document)))
    return LegacyTaskProjection(
        task_id=task_id,
        task_type=task_type,
        status=status,
        kind=kind,
        verification=_verification(document, status),
        eligible_for_ai=eligible,
        original=original,
    )
