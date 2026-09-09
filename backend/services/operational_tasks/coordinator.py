"""Coordinamento di Luca tramite capacità LIMITATE (T14).

`admin_luca.py` oggi chiama il modello SENZA `tools`: Luca legge, ragiona, propone; le mani
stanno nel briefing schedulato ("misura e propone, non esegue"). T14 costruisce gli strumenti
STRUTTURATI e limitati con cui coordinare in sicurezza, mai fuori catalogo:

- `read_state` (sola lettura), `propose_plan` (proposte), `create_task` (solo task_type
  **catalogati** nel registry: nessuna delega a un nome senza esecutore).
- Ogni richiesta passa da autorizzazione + validazione backend; limiti per ciclo (task, chiamate
  modello) applicati; stati etichettati proposto/pianificato/in_esecuzione/verificato/bloccato.
- Un report server NON è un agente esecutivo: il briefing è marcato come report.

Puro e testabile. Il cablaggio nella chat (che richiede di riscrivere `LUCA_AD_SYSTEM`, vedi la
nota ⛔ in admin_luca.py) è l'attivazione esplicita, non inclusa qui.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Mapping, Optional, Set

from .contracts import TaskContractError

ALLOWED_TOOLS = ("read_state", "propose_plan", "create_task")
DEPARTMENTS = ("acquisizione", "vendite", "delivery", "back_office")


class WorkStatus(str, Enum):
    PROPOSED = "proposed"
    PLANNED = "planned"
    IN_EXECUTION = "in_execution"
    VERIFIED = "verified"
    BLOCKED = "blocked"


# ─────────────────────────── briefing dallo stato VERIFICATO ───────────────────────────

def _is_verified(task: Mapping[str, Any]) -> bool:
    """Verificato SOLO con prova: stato completed/verified E evidence_refs non vuoti."""
    if task.get("status") not in ("completed", "verified"):
        return False
    evidence = task.get("evidence_refs")
    if not evidence:
        result = task.get("result")
        if isinstance(result, Mapping):
            verification = result.get("verification")
            if isinstance(verification, Mapping):
                evidence = verification.get("evidence_refs")
    return bool(evidence)


def build_direction_briefing(
    queues: Mapping[str, List[Mapping[str, Any]]],
    *,
    generated_at: Optional[str] = None,
) -> dict:
    """Briefing direzionale dalle 4 code: risultati verificati, blocchi (con owner e motivo),
    decisioni attese, ultimo aggiornamento. È un REPORT, non un agente esecutivo."""
    reparti: Dict[str, dict] = {}
    for dept in DEPARTMENTS:
        tasks = list(queues.get(dept) or [])
        blocked = [
            {
                "id": t.get("id"),
                "owner_id": (t.get("next_action") or {}).get("owner_id"),
                "reason": t.get("error_code") or (t.get("next_action") or {}).get("reason"),
            }
            for t in tasks if t.get("status") == "blocked"
        ]
        dependencies = [
            {"id": t.get("id"), "depends_on": t.get("depends_on")}
            for t in tasks if t.get("depends_on")
        ]
        updates = [t.get("updated_at") or t.get("created_at") for t in tasks if (t.get("updated_at") or t.get("created_at"))]
        reparti[dept] = {
            "totale": len(tasks),
            "verificati": sum(1 for t in tasks if _is_verified(t)),
            "bloccati": blocked,
            "dipendenze": dependencies,
            "decisioni_attese": sum(1 for t in tasks if t.get("status") == "awaiting_approval"),
            "ultimo_aggiornamento": max(updates) if updates else None,
        }
    return {"kind": "report", "is_executive_agent": False, "generated_at": generated_at, "reparti": reparti}


# ─────────────────────────── autorizzazione + budget ───────────────────────────

@dataclass(frozen=True)
class ToolResult:
    ok: bool
    status: Optional[str] = None
    data: Any = None
    error: str = ""


@dataclass
class CycleBudget:
    max_tasks: int = 5
    max_model_calls: int = 8


@dataclass
class CoordinatorCycle:
    budget: CycleBudget = field(default_factory=CycleBudget)
    tasks_created: int = 0
    model_calls: int = 0
    seen_keys: Set[str] = field(default_factory=set)

    def charge_model_call(self) -> bool:
        if self.model_calls >= self.budget.max_model_calls:
            return False
        self.model_calls += 1
        return True

    def can_create_task(self) -> bool:
        return self.tasks_created < self.budget.max_tasks


def authorize_proposed_task(task_type: Any, payload: Optional[Mapping[str, Any]], registry) -> ToolResult:
    """Autorizza SOLO task catalogati (con esecutore) e con input valido. Un task_type non
    registrato = delega a un nome senza esecutore → rifiutato."""
    try:
        registry.get(task_type)
    except TaskContractError as exc:
        return ToolResult(False, error=getattr(exc, "code", "unknown_task_type"))
    try:
        registry.validate(task_type, payload or {})
    except TaskContractError as exc:
        return ToolResult(False, error=getattr(exc, "code", "invalid_task_input"))
    return ToolResult(True)


def can_start(task: Mapping[str, Any], dependency_statuses: Mapping[str, str]) -> ToolResult:
    """Un task con una dipendenza non risolta resta bloccato, non parte."""
    for dep in task.get("depends_on") or []:
        if dependency_statuses.get(dep) not in ("completed", "verified"):
            return ToolResult(False, status=WorkStatus.BLOCKED.value, error=f"dipendenza non risolta: {dep}")
    return ToolResult(True, status=WorkStatus.IN_EXECUTION.value)


def coordinator_tool_call(
    tool: str,
    args: Mapping[str, Any],
    *,
    registry,
    cycle: CoordinatorCycle,
    request_key: Optional[str] = None,
) -> ToolResult:
    """Dispatcher degli strumenti limitati di Luca. Tutto ciò che non è nel catalogo è rifiutato."""
    if tool not in ALLOWED_TOOLS:
        return ToolResult(False, error="tool_not_allowed")

    # Doppia richiesta: stessa chiave nel ciclo → deduplicata, nessuna azione ripetuta.
    if request_key is not None:
        if request_key in cycle.seen_keys:
            return ToolResult(True, status="deduped", data={"request_key": request_key})
        cycle.seen_keys.add(request_key)

    args = args or {}

    if tool == "read_state":
        return ToolResult(True, status="read", data=args.get("state"))

    if tool == "propose_plan":
        # Solo proposte: ogni item deve essere catalogato; nessuna esecuzione.
        proposed, rejected = [], []
        for item in args.get("tasks") or []:
            auth = authorize_proposed_task(item.get("task_type"), item.get("payload"), registry)
            entry = {"task_type": item.get("task_type"), "depends_on": item.get("depends_on")}
            if auth.ok:
                proposed.append(entry)
            else:
                rejected.append({**entry, "error": auth.error})
        return ToolResult(True, status=WorkStatus.PROPOSED.value, data={"proposed": proposed, "rejected": rejected})

    # tool == "create_task"
    if not cycle.can_create_task():
        return ToolResult(False, error="cycle_budget_exhausted")
    auth = authorize_proposed_task(args.get("task_type"), args.get("payload"), registry)
    if not auth.ok:
        return ToolResult(False, error=auth.error)
    cycle.tasks_created += 1
    return ToolResult(True, status=WorkStatus.PLANNED.value, data={"task_type": args.get("task_type")})
