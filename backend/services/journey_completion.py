"""Policy pure per decidere se uno step EVO può essere completato."""
from dataclasses import dataclass, field
from typing import Any

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION


@dataclass(frozen=True)
class CompletionResult:
    ok: bool
    code: str
    message: str
    evidence: dict[str, Any] = field(default_factory=dict)


_STEP_BY_ID = {step["step_id"]: step for step in JOURNEY_STEPS_DEFINITION}


def _required_flag(context, flag: str, code: str, message: str) -> CompletionResult:
    value = bool(context.get(flag))
    return CompletionResult(value, "ready" if value else code, "Pronto" if value else message, {flag: value})


def evaluate_step_completion(step_id: str, context: dict[str, Any]) -> CompletionResult:
    definition = _STEP_BY_ID.get(step_id)
    if not definition:
        return CompletionResult(False, "unknown_step", "Passaggio non riconosciuto")

    policy = definition["completion_policy"]
    governed = {
        "masterclass_current_version_approved": ("masterclass_approved", "masterclass_not_approved", "La masterclass definitiva deve essere approvata"),
        "all_required_lessons_current_version_approved": ("lessons_approved", "lessons_not_approved", "Tutte le lezioni previste devono essere approvate"),
        "sales_system_ready": ("sales_system_ready", "sales_system_not_ready", "Il sistema di vendita non è ancora verificato"),
        "launch_readiness_verified": ("launch_readiness_verified", "launch_not_ready", "La verifica pre-lancio non è completa"),
        "launch_verified": ("launch_verified", "launch_not_verified", "Il lancio non è ancora verificato"),
        "valida_certificate_archived": ("certificate_archived", "certificate_not_archived", "Il certificato non è ancora archiviato"),
        "final_workbook_archived": ("workbook_archived", "workbook_not_archived", "Il Workbook non è ancora archiviato"),
        "optimization_active": ("optimization_unlocked", "optimization_locked", "Ottimizza non è ancora sbloccata"),
    }
    if policy in governed:
        return _required_flag(context, *governed[policy])

    # Gli step dichiarativi restano compatibili con i moduli esistenti; le
    # relative policy verranno rese strutturate senza bloccare il journey storico.
    return CompletionResult(True, "declarative_completion", "Conferma registrata", {"policy": policy})
