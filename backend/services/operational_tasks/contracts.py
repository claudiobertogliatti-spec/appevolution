"""Tipi condivisi del catalogo task operativo.

Il modulo non registra esecutori e non produce effetti. Le capacità vengono
aggiunte esplicitamente a un :class:`TaskRegistry` dal futuro runtime.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Mapping


class TaskKind(str, Enum):
    AI = "ai"
    COLLABORATOR = "collaborator"
    SIGNAL = "signal"
    AMBIGUOUS = "ambiguous"


class OperationalTaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    VERIFYING = "verifying"
    RETRY_SCHEDULED = "retry_scheduled"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    UNKNOWN = "unknown"


class TaskContractError(ValueError):
    """Errore tipizzato e mappabile senza scegliere un esecutore implicito."""

    code = "task_contract_error"


class UnknownTaskTypeError(TaskContractError):
    code = "unknown_task_type"

    def __init__(self, task_type: object):
        super().__init__(f"Task type non registrato: {task_type!r}")
        self.task_type = task_type


class TaskInputError(TaskContractError):
    code = "invalid_task_input"

    def __init__(self, task_type: str, reason: str):
        super().__init__(f"Input non valido per {task_type!r}: {reason}")
        self.task_type = task_type
        self.reason = reason


@dataclass(frozen=True)
class ExecutionPolicy:
    requires_approval: bool
    max_attempts: int = 3
    external_effects: bool = False

    def __post_init__(self) -> None:
        if not isinstance(self.requires_approval, bool) or not isinstance(self.external_effects, bool):
            raise TypeError("i flag della policy devono essere booleani")
        if isinstance(self.max_attempts, bool) or not isinstance(self.max_attempts, int) or self.max_attempts < 1:
            raise ValueError("max_attempts deve essere un intero positivo")


InputValidator = Callable[[Mapping[str, Any]], Mapping[str, Any]]


@dataclass(frozen=True)
class TaskCapability:
    task_type: str
    input_version: int
    kind: TaskKind
    executor: Callable[..., Any]
    verifier: Callable[..., Any]
    policy: ExecutionPolicy
    validate_input: InputValidator

    def __post_init__(self) -> None:
        if not isinstance(self.task_type, str) or not self.task_type.strip():
            raise ValueError("task_type è obbligatorio")
        if isinstance(self.input_version, bool) or not isinstance(self.input_version, int) or self.input_version < 1:
            raise ValueError("input_version deve essere un intero positivo")
        if not isinstance(self.kind, TaskKind):
            raise TypeError("kind deve essere TaskKind")
        if self.kind is TaskKind.AMBIGUOUS:
            raise ValueError("una capacità registrata non può essere ambigua")
        if not isinstance(self.policy, ExecutionPolicy):
            raise TypeError("policy deve essere ExecutionPolicy")
        if not callable(self.executor) or not callable(self.verifier):
            raise TypeError("executor e verifier devono essere callable")
        if not callable(self.validate_input):
            raise ValueError("validate_input deve essere callable")


def _json_value(value: object) -> object:
    """Copia una struttura frozen nei soli tipi ammessi dal contratto JSON."""
    if isinstance(value, Mapping):
        normalized = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise ValueError("le chiavi del payload JSON devono essere stringhe")
            normalized[key] = _json_value(item)
        return normalized
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if value is None or isinstance(value, (str, bool, int, float)):
        return value
    raise ValueError(f"tipo non supportato nel payload JSON: {type(value).__name__}")


def _canonical_json(value: object) -> str:
    try:
        return json.dumps(
            _json_value(value),
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        if isinstance(exc, ValueError) and str(exc).startswith(("le chiavi", "tipo non supportato")):
            raise
        raise ValueError("il payload deve essere JSON canonico") from exc


def compute_input_version(payload: Mapping[str, Any]) -> str:
    """Restituisce la versione contenuto stabile del payload validato."""
    if not isinstance(payload, Mapping):
        raise ValueError("payload deve essere una mappa")
    return hashlib.sha256(_canonical_json(dict(payload)).encode("utf-8")).hexdigest()


def build_idempotency_key(task_type: str, entity_ref: Mapping[str, Any], input_version: str) -> str:
    """Costruisce ``type:entity:version`` senza dipendere dall'ordine delle chiavi."""
    if not isinstance(task_type, str) or not task_type.strip():
        raise ValueError("task_type è obbligatorio")
    if not isinstance(entity_ref, Mapping) or not entity_ref:
        raise ValueError("entity_ref è obbligatorio")
    if not isinstance(input_version, str) or not input_version.strip():
        raise ValueError("input_version è obbligatorio")
    # Hash della struttura canonica: evita collisioni fra componenti contenenti ':'.
    entity_token = hashlib.sha256(
        _canonical_json(dict(entity_ref)).encode("utf-8")
    ).hexdigest()[:24]
    return f"{task_type}:{entity_token}:{input_version}"
