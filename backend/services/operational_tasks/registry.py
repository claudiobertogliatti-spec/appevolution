"""Registro esplicito e fail-closed delle capacità operative."""

from __future__ import annotations

from copy import deepcopy
from types import MappingProxyType
from typing import Any, Dict, Mapping, Optional

from .contracts import TaskCapability, TaskInputError, UnknownTaskTypeError


def _freeze(value: Any) -> Any:
    if isinstance(value, Mapping):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(_freeze(item) for item in value)
    if isinstance(value, tuple):
        return tuple(_freeze(item) for item in value)
    return value


class TaskRegistry:
    def __init__(self) -> None:
        self._capabilities: Dict[str, TaskCapability] = {}

    @property
    def capabilities(self) -> Mapping[str, TaskCapability]:
        return MappingProxyType(self._capabilities)

    def register(self, capability: TaskCapability) -> None:
        if not isinstance(capability, TaskCapability):
            raise TypeError("capability deve essere TaskCapability")
        if capability.task_type in self._capabilities:
            raise ValueError(f"Task type già registrato: {capability.task_type}")
        self._capabilities[capability.task_type] = capability

    def get(self, task_type: str) -> TaskCapability:
        try:
            return self._capabilities[task_type]
        except (KeyError, TypeError):
            raise UnknownTaskTypeError(task_type) from None

    def validate(self, task_type: str, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        capability = self.get(task_type)
        if not isinstance(payload, Mapping):
            raise TaskInputError(task_type, "il payload deve essere un oggetto")
        try:
            validated = capability.validate_input(deepcopy(dict(payload)))
        except TaskInputError:
            raise
        except (KeyError, TypeError, ValueError) as exc:
            raise TaskInputError(task_type, str(exc) or exc.__class__.__name__) from exc
        if not isinstance(validated, Mapping):
            raise TaskInputError(task_type, "il validatore deve restituire un oggetto")
        return _freeze(deepcopy(dict(validated)))


# Vuoto per scelta: T03 non abilita capacità in produzione.
DEFAULT_TASK_REGISTRY = TaskRegistry()


def validate_task_input(
    task_type: str,
    payload: Mapping[str, Any],
    registry: Optional[TaskRegistry] = None,
) -> Mapping[str, Any]:
    return (registry or DEFAULT_TASK_REGISTRY).validate(task_type, payload)
