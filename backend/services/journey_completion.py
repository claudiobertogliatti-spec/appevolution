"""Policy pure per decidere se uno step EVO può essere completato."""
import hashlib
import json
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


def can_unlock_f20(status_by_step: dict[str, str]) -> bool:
    return all(status_by_step.get(step_id) == "done" for step_id in (
        "13-lancio", "18-certificato-valida", "19-workbook-finale"
    ))


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


def approved_launch_calendar_context(document: dict[str, Any] | None) -> dict[str, Any]:
    """Deriva il gate F-14 solo da una versione approved integra e attestata."""
    document = document or {}
    calendar = document.get("calendar")
    checksum = document.get("checksum")
    review = document.get("admin_review") or {}
    approved_at = document.get("approved_at")
    version = document.get("version")

    if not isinstance(calendar, dict) or not isinstance(checksum, str) or not checksum:
        return {"launch_calendar_approved": False}

    from services.launch_calendar import calendar_checksum

    valid = (
        document.get("status") == "approved"
        and version is not None
        and bool(approved_at)
        and review.get("decision") == "approve"
        and review.get("approved_checksum") == checksum
        and calendar_checksum(calendar) == checksum
    )
    if not valid:
        return {"launch_calendar_approved": False}
    return {
        "launch_calendar_approved": True,
        "calendar_version": version,
        "calendar_checksum": checksum,
        "approved_at": approved_at,
    }


_FINAL_WORKBOOK_SOURCE_STEPS = (
    "12-prezzo-webinar",
    "16-readiness-lancio",
    "13-lancio",
    "18-certificato-valida",
)


def final_workbook_journey_source(
    steps_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    """Snapshot degli output F15-F18 solo quando F19 e' eleggibile."""
    snapshot = []
    for step_id in _FINAL_WORKBOOK_SOURCE_STEPS:
        step = steps_by_id.get(step_id) or {}
        if step.get("status") != "done":
            return None
        snapshot.append({
            "step_id": step_id,
            "status": "done",
            "completed_at": step.get("completed_at"),
            "evidence": step.get("data") or {},
        })
    serialized = json.dumps(
        snapshot, sort_keys=True, separators=(",", ":"), default=str, ensure_ascii=False
    ).encode("utf-8")
    return {
        "journey_source_checksum": hashlib.sha256(serialized).hexdigest(),
        "journey_steps": snapshot,
    }


def approved_calendar_workbook_binding(
    context: dict[str, Any],
    journey_source: dict[str, Any] | None = None,
    renderer_source: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Identita' immutabile del Workbook costruito sul calendario approved corrente."""
    if context.get("launch_calendar_approved") is not True:
        return None
    version = context.get("calendar_version")
    checksum = context.get("calendar_checksum")
    approved_at = context.get("approved_at")
    journey_checksum = (journey_source or {}).get("journey_source_checksum")
    renderer_checksum = (renderer_source or {}).get("renderer_source_checksum")
    if (
        version is None
        or not checksum
        or not approved_at
        or not journey_checksum
        or not renderer_checksum
    ):
        return None
    provenance = {
        "calendar_version": version,
        "calendar_checksum": checksum,
        "calendar_approved_at": approved_at,
        **journey_source,
        **renderer_source,
    }
    return {
        "source_version": (
            f"launch-calendar:{version}:{checksum}:renderer:{renderer_checksum}"
        ),
        "provenance": provenance,
    }


def workbook_renderer_source(payload: dict[str, Any]) -> dict[str, str]:
    """Hash canonico di tutti e soli gli input passati al renderer Workbook."""
    serialized = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), default=str, ensure_ascii=False
    ).encode("utf-8")
    return {"renderer_source_checksum": hashlib.sha256(serialized).hexdigest()}


def evaluate_step_completion(step_id: str, context: dict[str, Any]) -> CompletionResult:
    definition = _STEP_BY_ID.get(step_id)
    if not definition:
        return CompletionResult(False, "unknown_step", "Passaggio non riconosciuto")

    policy = definition["completion_policy"]
    governed = {
        "masterclass_current_version_approved": ("masterclass_approved", "masterclass_not_approved", "La masterclass definitiva deve essere approvata"),
        "all_required_lessons_current_version_approved": ("lessons_approved", "lessons_not_approved", "Tutte le lezioni previste devono essere approvate"),
        "sales_system_ready": ("sales_system_ready", "sales_system_not_ready", "Il sistema di vendita non è ancora verificato"),
        "launch_calendar_approved": ("launch_calendar_approved", "launch_calendar_not_approved", "Il calendario di lancio deve essere confermato e approvato"),
        "launch_readiness_verified": ("launch_readiness_verified", "launch_not_ready", "La verifica pre-lancio non è completa"),
        "launch_verified": ("launch_verified", "launch_not_verified", "Il lancio non è ancora verificato"),
        "valida_certificate_archived": ("certificate_archived", "certificate_not_archived", "Il certificato non è ancora archiviato"),
        "final_workbook_archived": ("workbook_archived", "workbook_not_archived", "Il Workbook non è ancora archiviato"),
        "optimization_active": ("optimization_unlocked", "optimization_locked", "Ottimizza non è ancora sbloccata"),
    }
    if policy in governed:
        result = _required_flag(context, *governed[policy])
        if policy == "launch_calendar_approved" and result.ok:
            evidence = {
                **result.evidence,
                **{
                    key: context[key]
                    for key in ("calendar_version", "calendar_checksum", "approved_at")
                    if context.get(key) is not None
                },
            }
            return CompletionResult(result.ok, result.code, result.message, evidence)
        return result

    # Gli step dichiarativi restano compatibili con i moduli esistenti; le
    # relative policy verranno rese strutturate senza bloccare il journey storico.
    return CompletionResult(True, "declarative_completion", "Conferma registrata", {"policy": policy})
