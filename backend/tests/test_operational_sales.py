"""T11 — flusso Vendite: un solo passo ammissibile e chiusura coerente.

Tutti ``unit``. Il gate ricalca `require_partnership_proposal_eligibility` (proposta.py):
blueprint pagato → analisi consegnata → call_done → decisione partnership.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.completion import execute_and_verify_registered
from services.operational_tasks.contracts import TaskInputError
from services.operational_tasks.registry import TaskRegistry
from services.operational_tasks.sales import (
    PREPARE_NEXT_ACTION,
    PREPARE_NEXT_ACTION_CAPABILITY,
    prepare_next_action,
    register,
    validate_next_action_input,
)

pytestmark = pytest.mark.unit


def _registry():
    r = TaskRegistry()
    register(r)
    return r


def _task(opp):
    return {
        "id": "t-sales-1",
        "task_type": PREPARE_NEXT_ACTION,
        "operational_contract": {"input_version": 1, "payload": {"opportunity": opp}},
    }


WON = {
    "identity": "mario@studio.it",
    "blueprint_paid": True,
    "analysis_delivered": True,
    "call_done": True,
    "offer_decision": "partnership",
}


# ─────────────────────── il primo gate non soddisfatto ───────────────────────

def _step(opp):
    return prepare_next_action({"opportunity": opp})["next_step"]


def test_gate_order_returns_single_admissible_step():
    assert _step({**WON, "blueprint_paid": False})["action"] == "blueprint_payment"
    assert _step({**WON, "analysis_delivered": False})["action"] == "deliver_analysis"
    assert _step({**WON, "call_done": False})["action"] == "do_call"
    assert _step({**WON, "offer_decision": None})["action"] == "commercial_decision"


def test_each_step_has_a_deadline_sla():
    step = _step({**WON, "call_done": False})
    assert step["sla_days"] == 3 and step["owner_id"] == "vendite"


def test_negative_decision_closes_lost_without_handoff():
    step = _step({**WON, "offer_decision": "declined"})
    assert step["type"] == "closed_lost"
    assert "handoffs" not in step


# ─────────────────────── chiusura → handoff Delivery + Back office ───────────────────────

async def test_won_closes_and_hands_off_to_delivery_and_back_office():
    outcome = await execute_and_verify_registered(_task(WON), _registry())
    assert outcome.completed is True
    art = outcome.result["artifact"]
    assert art["stage"] == "won"
    handoffs = art["next_step"]["handoffs"]
    depts = {h["to_department"] for h in handoffs}
    assert depts == {"delivery", "back_office"}
    bo = next(h for h in handoffs if h["to_department"] == "back_office")
    assert "obligations" in bo  # obblighi/condizioni portati alla chiusura


# ─────────────────────── idempotenza (evento ripetuto / proposta già esistente) ───────────────────────

def test_repeated_preparation_is_idempotent():
    a = prepare_next_action({"opportunity": WON})
    b = prepare_next_action({"opportunity": dict(WON)})
    assert a["next_action_ref"] == b["next_action_ref"]
    ha = {h["to_department"]: h["idempotency_key"] for h in a["next_step"]["handoffs"]}
    hb = {h["to_department"]: h["idempotency_key"] for h in b["next_step"]["handoffs"]}
    assert ha == hb  # nessun doppio handoff sulla stessa chiusura


def test_state_change_yields_new_ref():
    a = prepare_next_action({"opportunity": {**WON, "call_done": False}})
    b = prepare_next_action({"opportunity": WON})
    assert a["next_action_ref"] != b["next_action_ref"]


# ─────────────────────── vincoli ───────────────────────

def test_opportunity_without_identity_is_rejected():
    with pytest.raises(TaskInputError):
        validate_next_action_input({"opportunity": {"blueprint_paid": True}})
    with pytest.raises(TaskInputError):
        validate_next_action_input({})


def test_model_never_signs_or_pays():
    assert PREPARE_NEXT_ACTION_CAPABILITY.policy.external_effects is False
    assert PREPARE_NEXT_ACTION_CAPABILITY.policy.requires_approval is False
    art = prepare_next_action({"opportunity": WON})
    blob = repr(art).lower()
    assert "signed" not in blob and "paid_now" not in blob and "sent" not in blob
