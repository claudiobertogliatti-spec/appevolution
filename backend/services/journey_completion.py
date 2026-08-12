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


def masterclass_current_version_approved(video: dict[str, Any] | None) -> bool:
    if not video or video.get("active_revision_id"):
        return False
    if not any(video.get(key) for key in ("output_gcs_url", "video_ciak_url", "video_embed_url", "video_youtube_url")):
        return False
    from services.ciak_lesson_review import is_partner_approved
    return is_partner_approved(video)


def required_lesson_ids_from_outline(outline: dict[str, Any] | None) -> list[str]:
    identifiers = []
    for module_index, module in enumerate((outline or {}).get("moduli") or [], 1):
        for lesson_index, lesson in enumerate(module.get("lezioni") or [], 1):
            identifier = lesson.get("id") or lesson.get("lesson_id") or f"m{module_index:02d}-l{lesson_index:02d}"
            identifiers.append(str(identifier))
    return identifiers


def all_required_lessons_approved(outline: dict[str, Any] | None, lessons: dict[str, Any] | None) -> bool:
    required = required_lesson_ids_from_outline(outline)
    if not required:
        return False
    lesson_map = lessons or {}
    from services.ciak_lesson_review import is_partner_approved

    explicit = [lesson_id for lesson_id in required if not lesson_id.startswith("m") or "-l" not in lesson_id]
    if any(not masterclass_current_version_approved(lesson_map.get(lesson_id)) for lesson_id in explicit):
        return False
    remaining_required = len(required) - len(explicit)
    unmatched = [lesson for lesson_id, lesson in lesson_map.items() if lesson_id not in explicit]
    approved_unmatched = sum(
        1 for lesson in unmatched
        if isinstance(lesson, dict) and not lesson.get("active_revision_id") and is_partner_approved(lesson)
    )
    return approved_unmatched >= remaining_required


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
