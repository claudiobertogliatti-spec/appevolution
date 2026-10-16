"""T23 — regole delle collaborazioni: schema e validazione.

Tutti ``unit``. Nessun dato personale: solo schema/criteri. Verificano che un campo
ambiguo/mancante resti `non_calcolabile` (mai zero) bloccando solo il proprio calcolo, che
il riferimento al contratto sia tracciabile, e che il CONTENUTO del contratto non entri nel payload.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.collaborations import (
    VALIDATE_RULES,
    VALIDATE_RULES_CAPABILITY,
    is_calculable,
    register,
    validate_collaboration_rules,
    validate_rules_input,
)
from services.operational_tasks.completion import execute_and_verify_registered
from services.operational_tasks.contracts import TaskInputError
from services.operational_tasks.registry import TaskRegistry

pytestmark = pytest.mark.unit

DOC = {"storage_ref": "drive://private/x", "sha256": "abc123", "version": "v1", "source": "google_drive"}
HOURLY = {"kind": "hourly", "clause_ref": "art. 2", "valid_from": "2026-09-01", "basis": {"hourly_rate": 25}}
COMMISSION = {"kind": "commission", "clause_ref": "art. 4", "valid_from": "2026-09-01",
              "basis": {"on": "partnership_sale", "percent": 10}, "maturation": "on_payment"}


def _registry():
    r = TaskRegistry()
    register(r)
    return r


def _run(payload):
    return validate_collaboration_rules(validate_rules_input(payload))


def _payload(rules, collaborator_id="antonella", document_ref=None):
    return {"collaborator_id": collaborator_id, "document_ref": document_ref or dict(DOC), "rules": rules}


# ─────────────────────────── validazione input / privacy ───────────────────────────

def test_input_requires_id_rules_and_document_ref():
    with pytest.raises(TaskInputError):
        validate_rules_input({"document_ref": DOC, "rules": [HOURLY]})  # no id
    with pytest.raises(TaskInputError):
        validate_rules_input({"collaborator_id": "x", "rules": [HOURLY]})  # no doc ref
    with pytest.raises(TaskInputError):
        validate_rules_input({"collaborator_id": "x", "document_ref": DOC, "rules": []})  # no rules


def test_contract_content_is_refused_in_payload():
    with pytest.raises(TaskInputError):
        validate_rules_input(_payload([HOURLY], document_ref={**DOC, "text": "clausole integrali del contratto..."}))


# ─────────────────────────── regole valide / ambigue ───────────────────────────

def test_valid_rules_are_validated_and_await_human():
    art = _run(_payload([HOURLY, COMMISSION]))
    assert len(art["validated_rules"]) == 2 and art["non_calcolabile"] == []
    assert art["needs_human_validation"] is True  # niente si applica senza ok umano


def test_missing_clause_is_non_calcolabile_not_zero():
    no_clause = {k: v for k, v in HOURLY.items() if k != "clause_ref"}
    art = _run(_payload([no_clause]))
    assert art["validated_rules"] == []
    assert art["non_calcolabile"][0]["status"] == "non_calcolabile"
    assert any("clausola" in r for r in art["non_calcolabile"][0]["reasons"])


def test_ambiguous_commission_base_blocks_only_that_rule():
    ambiguous = {"kind": "commission", "clause_ref": "art. 4", "valid_from": "2026-09-01",
                 "basis": {"percent": 10}, "maturation": "on_payment"}  # manca `on`
    art = _run(_payload([HOURLY, ambiguous]))
    assert is_calculable(art, "hourly") is True       # l'orario resta calcolabile
    assert is_calculable(art, "commission") is False  # solo la provvigione è bloccata
    assert any("ambiguo" in r or "matura" in r for r in art["non_calcolabile"][0]["reasons"])


def test_fixed_zero_is_real_value_but_missing_amount_is_not():
    zero = {"kind": "fixed", "clause_ref": "art. 1", "valid_from": "2026-09-01", "basis": {"amount": 0, "period": "monthly"}}
    assert is_calculable(_run(_payload([zero])), "fixed") is True
    missing = {"kind": "fixed", "clause_ref": "art. 1", "valid_from": "2026-09-01", "basis": {"period": "monthly"}}
    assert is_calculable(_run(_payload([missing])), "fixed") is False


def test_missing_basis_is_non_calcolabile():
    art = _run(_payload([{"kind": "hourly", "clause_ref": "art. 2", "valid_from": "2026-09-01"}]))
    assert art["validated_rules"] == []
    assert any("base di calcolo" in r for r in art["non_calcolabile"][0]["reasons"])


# ─────────────────────────── riferimento contratto tracciabile ───────────────────────────

def test_incomplete_document_ref_is_flagged():
    art = _run(_payload([HOURLY], document_ref={"storage_ref": "drive://x", "version": "v1"}))  # no sha256/source
    assert art["document_ref_complete"] is False
    assert any("riferimento contratto" in r for r in art["reasons"])


# ─────────────────────────── nessuna eredità fra collaboratori ───────────────────────────

def test_rules_are_scoped_to_the_collaborator():
    a = _run(_payload([HOURLY], collaborator_id="antonella"))
    m = _run(_payload([HOURLY], collaborator_id="mariangela"))
    assert a["collaborator_id"] == "antonella" and m["collaborator_id"] == "mariangela"
    assert a["validation_ref"] != m["validation_ref"]  # riferimenti indipendenti, niente copia


# ─────────────────────────── motore ───────────────────────────

async def test_completes_via_engine():
    task = {"id": "t", "task_type": VALIDATE_RULES, "operational_contract": {"input_version": 1, "payload": _payload([HOURLY, COMMISSION])}}
    outcome = await execute_and_verify_registered(task, _registry())
    assert outcome.completed is True
    assert outcome.result["artifact"]["needs_human_validation"] is True


def test_capability_has_no_effect_and_no_approval():
    assert VALIDATE_RULES_CAPABILITY.policy.external_effects is False
    assert VALIDATE_RULES_CAPABILITY.policy.requires_approval is False
