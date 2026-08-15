"""Valutazione pura delle evidenze governate della Fase 2 (F-8--F-19)."""
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Any, Mapping

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION


PHASE2_POLICY_EVIDENCE = {
    "05-script-masterclass": "masterclass_script_approved",
    "06-outline-lezioni": "course_outline_approved",
    "07-script-videolezioni": "lesson_scripts_approved",
    "08-registra-masterclass": "masterclass_current_version_approved",
    "09-registra-lezioni": "all_required_lessons_current_version_approved",
    "10-sistema-vendita": "sales_system_ready",
    "11-calendario-30gg": "launch_calendar_approved",
    "12-prezzo-webinar": "price_webinar_approved",
    "16-readiness-lancio": "launch_readiness_verified",
    "13-lancio": "launch_verified",
    "18-certificato-valida": "valida_certificate_archived",
    "19-workbook-finale": "final_workbook_archived",
}


_PHASE2_STEP_IDS = tuple(
    step["step_id"]
    for step in JOURNEY_STEPS_DEFINITION
    if step["macro_phase"] == "valida"
)


@dataclass(frozen=True)
class StepConformity:
    step_id: str
    conformant: bool
    evidence_key: str | None
    reason: str
    details: Mapping[str, bool] = field(
        default_factory=lambda: MappingProxyType({})
    )


def _sanitized_details(evidence_key: str | None, value: bool) -> Mapping[str, bool]:
    if evidence_key is None:
        return MappingProxyType({})
    return MappingProxyType({evidence_key: value})


def evaluate_phase2_conformity(
    step_id: str, evidence: Mapping[str, Any] | None,
) -> StepConformity:
    """Classifica uno step F-8--F-19 dalle sole evidenze gia' normalizzate.

    Il valore deve essere il booleano ``True``: stati journey, dati client e
    qualunque altro campo non possono completare uno step governato.
    """
    evidence_key = PHASE2_POLICY_EVIDENCE.get(step_id)
    if evidence_key is None:
        return StepConformity(
            step_id=step_id,
            conformant=False,
            evidence_key=None,
            reason="step_not_governed_by_phase2_policy",
            details=_sanitized_details(None, False),
        )

    verified = (evidence or {}).get(evidence_key) is True
    return StepConformity(
        step_id=step_id,
        conformant=verified,
        evidence_key=evidence_key,
        reason="server_evidence_verified" if verified else "server_evidence_missing",
        details=_sanitized_details(evidence_key, verified),
    )


def dependent_step_ids(step_id: str) -> tuple[str, ...]:
    """Restituisce gli step Fase 2 successivi nell'ordine canonico."""
    try:
        current_index = _PHASE2_STEP_IDS.index(step_id)
    except ValueError:
        return ()
    return _PHASE2_STEP_IDS[current_index + 1:]
