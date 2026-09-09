"""T10 — flusso Acquisizione: qualifica contatto e consegna a Vendite.

Tutti ``unit``. Verificano la capacità sia in isolamento sia attraverso il motore
(`execute_and_verify_registered`, T04): il task completa solo con la qualificazione verificata.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.acquisition import (
    QUALIFY_CONTACT,
    QUALIFY_CONTACT_CAPABILITY,
    qualify_contact,
    register,
    validate_qualify_input,
)
from services.operational_tasks.completion import execute_and_verify_registered
from services.operational_tasks.contracts import TaskInputError
from services.operational_tasks.registry import TaskRegistry

pytestmark = pytest.mark.unit


def _registry():
    r = TaskRegistry()
    register(r)
    return r


def _task(contact):
    return {
        "id": "t-acq-1",
        "task_type": QUALIFY_CONTACT,
        "operational_contract": {"input_version": 1, "payload": {"contact": contact}},
    }


WARM_LEAD = {
    "email": "mario@studio.it", "nome": "Mario", "telefono": "+39333",
    "source": "masterclass_landing", "tags": ["ciak_optin_masterclass"],
}


# ─────────────────────── capacità attraverso il motore (T04) ───────────────────────

async def test_qualified_contact_completes_and_hands_off_to_sales():
    outcome = await execute_and_verify_registered(_task(WARM_LEAD), _registry())
    assert outcome.completed is True
    art = outcome.result["artifact"]
    assert art["qualified"] is True
    assert outcome.result["verification"]["evidence_refs"] == [art["qualification_ref"]]
    ns = art["next_step"]
    assert ns["type"] == "handoff" and ns["to_department"] == "vendite"
    assert ns["task_type"] == "sales.prepare_next_action"
    assert ns["entity_ref"] == {"type": "contact", "id": "mario@studio.it"}


async def test_missing_source_completes_but_routes_to_data_integration():
    contact = {k: v for k, v in WARM_LEAD.items() if k != "source"}
    outcome = await execute_and_verify_registered(_task(contact), _registry())
    assert outcome.completed is True  # la qualificazione è comunque prodotta e verificata
    art = outcome.result["artifact"]
    assert art["qualified"] is False
    assert art["missing_fields"] == ["source"]
    assert art["next_step"]["type"] == "data_integration"
    assert art["next_step"]["owner_id"] == "acquisizione"


# ─────────────────────── validazione input ───────────────────────

def test_unidentifiable_contact_is_rejected():
    with pytest.raises(TaskInputError):
        validate_qualify_input({"contact": {"nome": "senza email né id"}})
    with pytest.raises(TaskInputError):
        validate_qualify_input({"contact": {}})
    with pytest.raises(TaskInputError):
        validate_qualify_input({})


# ─────────────────────── decisione di qualifica ───────────────────────

def test_id_only_without_channel_is_not_reachable():
    art = qualify_contact({"contact": {"id": "lead-123", "source": "google_places"}})
    assert art["qualified"] is False
    assert art["next_step"]["needs_channel"] is True


def test_warm_vs_cold_reason():
    warm = qualify_contact({"contact": WARM_LEAD})
    assert warm["warm"] is True and any("caldo" in r for r in warm["reasons"])
    cold_lead = {**WARM_LEAD, "tags": []}
    cold = qualify_contact({"contact": cold_lead})
    assert cold["warm"] is False and any("freddo" in r for r in cold["reasons"])


# ─────────────────────── dedup per identità / aggiornamento ───────────────────────

def test_same_contact_yields_same_ref_no_double_handoff():
    a = qualify_contact({"contact": WARM_LEAD})
    b = qualify_contact({"contact": dict(WARM_LEAD)})
    assert a["qualification_ref"] == b["qualification_ref"]
    assert a["next_step"]["idempotency_key"] == b["next_step"]["idempotency_key"]


def test_contact_update_changes_version_and_ref():
    a = qualify_contact({"contact": {"email": "x@y.it", "source": "manual"}})
    b = qualify_contact({"contact": {"email": "x@y.it", "source": "manual", "telefono": "+39"}})
    assert a["qualification_ref"] != b["qualification_ref"]  # versione nuova


# ─────────────────────── nessun invio in preparazione ───────────────────────

def test_capability_has_no_external_effect_and_no_send():
    assert QUALIFY_CONTACT_CAPABILITY.policy.external_effects is False
    assert QUALIFY_CONTACT_CAPABILITY.policy.requires_approval is False
    art = qualify_contact({"contact": WARM_LEAD})
    # il prossimo passo è una BOZZA: nessun campo che indichi un invio avvenuto
    assert art["next_step"]["type"] in ("handoff", "data_integration")
    assert "sent" not in art and "delivered" not in art
