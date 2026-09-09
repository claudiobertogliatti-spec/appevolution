"""Flusso Vendite (T11): da un'opportunità propone UN solo passo ammissibile.

Riusa il **gate reale** del percorso, quello di
`backend/routers/proposta.py::require_partnership_proposal_eligibility`, che impone in
ordine: (1) pagamento Blueprint (`stripe_payment_completed`), (2) analisi consegnata
(`bozza_inviata_at`), (3) call completata (`current_state == "call_done"`),
(4) decisione commerciale (`offer_decision == "partnership"`). Il passo ammissibile è il
**primo gate non soddisfatto**; a gate completi la chiusura collega Delivery e Back office.

Deterministico e senza effetti: propone, non firma e non incassa. La scadenza è un SLA
relativo (`sla_days`); la data assoluta la fissa il wiring alla creazione dell'handoff.
"""

from __future__ import annotations

from typing import Any, List, Mapping

from .contracts import (
    ExecutionPolicy,
    TaskCapability,
    TaskInputError,
    TaskKind,
    build_idempotency_key,
    compute_input_version,
)

PREPARE_NEXT_ACTION = "sales.prepare_next_action"
PREPARE_INPUT_VERSION = 1

# SLA (giorni) per il passo proposto. È una scadenza relativa e deterministica.
_STEP_SLA = {
    "blueprint_payment": 3,
    "deliver_analysis": 2,
    "do_call": 3,
    "commercial_decision": 5,
}
# Decisioni terminali negative: si chiude perso, nessun handoff.
NEGATIVE_DECISIONS = frozenset({"declined", "rifiutata", "no", "lost", "persa"})
POSITIVE_DECISION = "partnership"


def _norm(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


def validate_next_action_input(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    if not isinstance(payload, Mapping):
        raise TaskInputError(PREPARE_NEXT_ACTION, "payload non valido")
    opp = payload.get("opportunity")
    if not isinstance(opp, Mapping):
        raise TaskInputError(PREPARE_NEXT_ACTION, "manca l'opportunità")
    if not _norm(opp.get("identity")):
        raise TaskInputError(PREPARE_NEXT_ACTION, "opportunità senza identità")
    return {"opportunity": dict(opp)}


def prepare_next_action(validated: Mapping[str, Any]) -> Mapping[str, Any]:
    """Esecutore: propone UN passo ammissibile. Deterministico, nessun effetto."""
    opp = validated["opportunity"]
    identity = _norm(opp.get("identity"))
    version = compute_input_version(validated)
    ref = build_idempotency_key(PREPARE_NEXT_ACTION, {"identity": identity}, version)

    paid = bool(opp.get("blueprint_paid"))
    analysis = bool(opp.get("analysis_delivered"))
    call = bool(opp.get("call_done"))
    decision = _norm(opp.get("offer_decision"))

    def advance(action: str, reason: str) -> dict:
        return {
            "type": "advance",
            "action": action,
            "owner_id": "vendite",
            "sla_days": _STEP_SLA[action],
            "reason": reason,
            "idempotency_key": ref,
        }

    if not paid:
        stage, step = "blueprint_payment", advance("blueprint_payment", "pagamento Blueprint non verificato")
    elif not analysis:
        stage, step = "analysis", advance("deliver_analysis", "analisi Blueprint non ancora consegnata")
    elif not call:
        stage, step = "call", advance("do_call", "call Blueprint non ancora completata")
    elif decision in NEGATIVE_DECISIONS:
        stage = "closed_lost"
        step = {"type": "closed_lost", "owner_id": "vendite", "reason": f"decisione: {decision}"}
    elif decision != POSITIVE_DECISION:
        stage, step = "decision", advance("commercial_decision", "decisione commerciale non ancora presa")
    else:
        # Tutti i gate soddisfatti → chiusura. UN handoff (non duplicato) verso Delivery e
        # Back office, con obblighi/condizioni. Idempotente per identità+versione.
        stage = "won"
        step = {
            "type": "closure",
            "handoffs": [
                {
                    "to_department": "delivery",
                    "task_type": "delivery.generate_positioning",
                    "entity_ref": {"type": "client", "id": identity},
                    "idempotency_key": build_idempotency_key("handoff.delivery", {"identity": identity}, version),
                },
                {
                    "to_department": "back_office",
                    "task_type": "back_office.check_due_item",
                    "entity_ref": {"type": "client", "id": identity},
                    "idempotency_key": build_idempotency_key("handoff.back_office", {"identity": identity}, version),
                    "obligations": {"note": "corrispettivo e scadenze dal contratto, da riconciliare"},
                },
            ],
        }

    reasons: List[str] = [step.get("reason")] if step.get("reason") else ["percorso completato: chiusura"]
    return {
        "next_action_ref": ref,
        "stage": stage,
        "next_step": step,
        "reasons": reasons,
        "input_version": PREPARE_INPUT_VERSION,
    }


def verify_next_action(artifact: Mapping[str, Any], validated: Mapping[str, Any]) -> Mapping[str, Any]:
    ok = bool(
        isinstance(artifact, Mapping)
        and artifact.get("next_action_ref")
        and isinstance(artifact.get("next_step"), Mapping)
        and artifact.get("reasons")
        and artifact.get("stage")
    )
    return {
        "verified": ok,
        "evidence_refs": [artifact["next_action_ref"]] if ok else [],
        "checks": {
            "has_ref": bool(artifact.get("next_action_ref")),
            "has_step": isinstance(artifact.get("next_step"), Mapping),
            "has_stage": bool(artifact.get("stage")),
        },
    }


PREPARE_NEXT_ACTION_CAPABILITY = TaskCapability(
    task_type=PREPARE_NEXT_ACTION,
    input_version=PREPARE_INPUT_VERSION,
    kind=TaskKind.AI,
    executor=prepare_next_action,
    verifier=verify_next_action,
    policy=ExecutionPolicy(requires_approval=False, external_effects=False),
    validate_input=validate_next_action_input,
)


def register(registry) -> None:
    """Abilita la capacità in un registry. NON registrata nel DEFAULT_TASK_REGISTRY:
    l'attivazione in produzione è una scelta esplicita (T21)."""
    registry.register(PREPARE_NEXT_ACTION_CAPABILITY)
