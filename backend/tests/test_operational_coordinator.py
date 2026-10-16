"""T14 — Luca coordina tramite capacità limitate. Chiude il gate G2 (M2).

Tutti ``unit``. Scenari del piano: tool sconosciuto, testo malevolo in un documento (task
non catalogato), doppia richiesta, dipendenza non risolta, budget ciclo esaurito, risultato
senza evidenza.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.acquisition import QUALIFY_CONTACT, register as register_acquisition
from services.operational_tasks.coordinator import (
    CoordinatorCycle,
    CycleBudget,
    build_direction_briefing,
    can_start,
    coordinator_tool_call,
)
from services.operational_tasks.registry import TaskRegistry

pytestmark = pytest.mark.unit

VALID_PAYLOAD = {"contact": {"email": "x@y.it", "source": "manual"}}


def _registry():
    r = TaskRegistry()
    register_acquisition(r)
    return r


# ─────────────────────────── briefing dalle 4 code ───────────────────────────

def test_briefing_is_a_report_not_an_executive_agent():
    b = build_direction_briefing({})
    assert b["kind"] == "report" and b["is_executive_agent"] is False
    assert set(b["reparti"]) == {"acquisizione", "vendite", "delivery", "back_office"}


def test_briefing_counts_only_verified_with_evidence_and_lists_blocks():
    queues = {
        "vendite": [
            {"id": "a", "status": "completed", "evidence_refs": ["ref-1"], "updated_at": "2026-09-09T10:00:00+00:00"},
            {"id": "b", "status": "completed"},  # completato SENZA prova → non verificato
            {"id": "c", "status": "blocked", "error_code": "x", "next_action": {"owner_id": "vendite"}},
        ]
    }
    v = build_direction_briefing(queues)["reparti"]["vendite"]
    assert v["verificati"] == 1  # solo 'a'
    assert v["bloccati"] == [{"id": "c", "owner_id": "vendite", "reason": "x"}]
    assert v["ultimo_aggiornamento"] == "2026-09-09T10:00:00+00:00"


# ─────────────────────────── strumenti limitati ───────────────────────────

def test_unknown_tool_is_refused():
    res = coordinator_tool_call("delete_everything", {}, registry=_registry(), cycle=CoordinatorCycle())
    assert res.ok is False and res.error == "tool_not_allowed"


def test_read_state_is_read_only():
    res = coordinator_tool_call("read_state", {"state": {"x": 1}}, registry=_registry(), cycle=CoordinatorCycle())
    assert res.ok is True and res.status == "read" and res.data == {"x": 1}


def test_propose_plan_authorizes_only_catalogued_tasks():
    args = {"tasks": [
        {"task_type": QUALIFY_CONTACT, "payload": VALID_PAYLOAD},
        {"task_type": "send_all_emails", "payload": {}},  # testo malevolo: non catalogato
    ]}
    res = coordinator_tool_call("propose_plan", args, registry=_registry(), cycle=CoordinatorCycle())
    assert [p["task_type"] for p in res.data["proposed"]] == [QUALIFY_CONTACT]
    assert [r["task_type"] for r in res.data["rejected"]] == ["send_all_emails"]


def test_create_task_only_for_catalogued_with_valid_input():
    reg, cycle = _registry(), CoordinatorCycle()
    ok = coordinator_tool_call("create_task", {"task_type": QUALIFY_CONTACT, "payload": VALID_PAYLOAD}, registry=reg, cycle=cycle)
    assert ok.ok is True and ok.status == "planned"
    unknown = coordinator_tool_call("create_task", {"task_type": "wire_money", "payload": {}}, registry=reg, cycle=cycle)
    assert unknown.ok is False and unknown.error == "unknown_task_type"
    bad = coordinator_tool_call("create_task", {"task_type": QUALIFY_CONTACT, "payload": {"contact": {}}}, registry=reg, cycle=cycle)
    assert bad.ok is False and bad.error == "invalid_task_input"


# ─────────────────────────── budget / dedup / dipendenze ───────────────────────────

def test_cycle_budget_exhausts_task_creation():
    reg = _registry()
    cycle = CoordinatorCycle(budget=CycleBudget(max_tasks=2))
    for _ in range(2):
        assert coordinator_tool_call("create_task", {"task_type": QUALIFY_CONTACT, "payload": VALID_PAYLOAD}, registry=reg, cycle=cycle).ok
    third = coordinator_tool_call("create_task", {"task_type": QUALIFY_CONTACT, "payload": VALID_PAYLOAD}, registry=reg, cycle=cycle)
    assert third.ok is False and third.error == "cycle_budget_exhausted"


def test_double_request_is_deduplicated():
    reg, cycle = _registry(), CoordinatorCycle()
    a = coordinator_tool_call("create_task", {"task_type": QUALIFY_CONTACT, "payload": VALID_PAYLOAD}, registry=reg, cycle=cycle, request_key="k1")
    b = coordinator_tool_call("create_task", {"task_type": QUALIFY_CONTACT, "payload": VALID_PAYLOAD}, registry=reg, cycle=cycle, request_key="k1")
    assert a.status == "planned" and b.status == "deduped"
    assert cycle.tasks_created == 1  # la seconda non ha creato nulla


def test_model_call_budget_is_enforced():
    cycle = CoordinatorCycle(budget=CycleBudget(max_model_calls=2))
    assert cycle.charge_model_call() and cycle.charge_model_call()
    assert cycle.charge_model_call() is False


def test_unresolved_dependency_blocks_start():
    task = {"id": "t2", "depends_on": ["t1"]}
    blocked = can_start(task, {"t1": "blocked"})
    assert blocked.ok is False and blocked.status == "blocked"
    started = can_start(task, {"t1": "verified"})
    assert started.ok is True and started.status == "in_execution"
