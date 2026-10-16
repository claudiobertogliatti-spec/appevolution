"""Contratti inerti per il futuro runtime dei task operativi Ciak."""

from .contracts import (
    ExecutionPolicy,
    OperationalTaskStatus,
    TaskCapability,
    TaskInputError,
    TaskKind,
    UnknownTaskTypeError,
    VerificationStatus,
    build_idempotency_key,
    compute_input_version,
)
from .legacy import LegacyTaskProjection, project_legacy_task
from .registry import TaskRegistry, validate_task_input

__all__ = [
    "ExecutionPolicy",
    "LegacyTaskProjection",
    "OperationalTaskStatus",
    "TaskCapability",
    "TaskInputError",
    "TaskKind",
    "TaskRegistry",
    "UnknownTaskTypeError",
    "VerificationStatus",
    "build_idempotency_key",
    "compute_input_version",
    "project_legacy_task",
    "validate_task_input",
]
