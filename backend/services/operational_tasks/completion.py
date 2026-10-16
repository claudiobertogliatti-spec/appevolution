"""Boundary tipizzato per completare task solo dopo una verifica reale."""

from __future__ import annotations

import inspect
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping

from .contracts import TaskContractError, TaskKind, compute_input_version
from .registry import TaskRegistry


@dataclass(frozen=True)
class CompletionOutcome:
    completed: bool
    result: Mapping[str, Any]
    error_code: str | None = None
    reconciliation_required: bool = False


def _blocked(code: str, message: str, **details: Any) -> CompletionOutcome:
    return CompletionOutcome(
        completed=False,
        error_code=code,
        result={"success": False, "error_code": code, "message": message, **details},
    )


async def _resolve(value: Any) -> Any:
    return await value if inspect.isawaitable(value) else value


async def execute_and_verify_registered(
    task: Mapping[str, Any], registry: TaskRegistry
) -> CompletionOutcome:
    """Esegue solo un contratto esplicito, inerte sugli effetti esterni, e lo rilegge."""
    contract = task.get("operational_contract")
    if not isinstance(contract, Mapping):
        return _blocked("unsupported_task", "Nessuna capacità operativa verificabile registrata")
    task_type = task.get("task_type")
    if not isinstance(task_type, str) or not task_type:
        return _blocked("invalid_task", "Task type mancante")
    try:
        capability = registry.get(task_type)
    except TaskContractError as exc:
        return _blocked(exc.code, str(exc))
    contract_version = contract.get("input_version")
    if (
        isinstance(contract_version, bool)
        or not isinstance(contract_version, int)
        or contract_version != capability.input_version
    ):
        return _blocked("input_version_mismatch", "Versione input non supportata")
    if capability.kind is not TaskKind.AI:
        return _blocked("unsupported_task_kind", "La capacità non è un task AI eseguibile")
    if capability.policy.requires_approval:
        return _blocked(
            "approval_required",
            "Manca la provenienza dell'artefatto approvato richiesta dal flusso",
        )
    if capability.policy.external_effects:
        return _blocked(
            "external_effect_not_enabled",
            "La capacità con effetti esterni non è abilitata senza riconciliazione",
        )
    payload = contract.get("payload")
    try:
        validated = registry.validate(task_type, payload)
    except TaskContractError as exc:
        return _blocked(exc.code, str(exc))
    try:
        artifact = await _resolve(capability.executor(validated))
    except Exception as exc:
        return CompletionOutcome(
            completed=False,
            error_code="execution_uncertain",
            reconciliation_required=True,
            result={
                "success": False,
                "error_code": "execution_uncertain",
                "message": str(exc),
                "reconciliation_required": True,
            },
        )
    if not isinstance(artifact, Mapping) or not artifact:
        return _blocked("artifact_missing", "Il generatore non ha prodotto un artefatto identificabile")
    try:
        verification = await _resolve(capability.verifier(artifact, validated))
    except Exception as exc:
        return CompletionOutcome(
            completed=False,
            error_code="verification_uncertain",
            reconciliation_required=True,
            result={
                "success": False,
                "error_code": "verification_uncertain",
                "artifact": dict(artifact),
                "message": str(exc),
                "reconciliation_required": True,
            },
        )
    evidence = verification.get("evidence_refs") if isinstance(verification, Mapping) else None
    if not (
        isinstance(verification, Mapping)
        and verification.get("verified") is True
        and isinstance(evidence, (list, tuple))
        and evidence
        and all(isinstance(ref, str) and ref.strip() for ref in evidence)
    ):
        return _blocked(
            "verification_failed",
            "La rilettura non prova l'artefatto prodotto",
            artifact=dict(artifact),
            verification=dict(verification) if isinstance(verification, Mapping) else None,
        )
    checked_verification = dict(verification)
    checked_verification["input_checksum"] = compute_input_version(validated)
    checked_verification["checked_at"] = datetime.now(timezone.utc).isoformat()
    return CompletionOutcome(
        completed=True,
        result={
            "success": True,
            "artifact": dict(artifact),
            "verification": checked_verification,
        },
    )
