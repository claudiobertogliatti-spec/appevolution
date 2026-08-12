"""Contratto puro per approvazione e revisioni delle videolezioni Ciak."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

VALID_DECISIONS = {"approve", "request_revision"}
RISK_ORDER = {"green": 0, "yellow": 1, "red": 2}

REVISION_CATALOG = {
    "increase_pace": {"category": "pace", "risk": {"light": "green", "medium": "yellow", "strong": "yellow"}, "intensity": True},
    "slow_down": {"category": "pace", "risk": {"light": "green"}, "intensity": True},
    "reduce_pauses": {"category": "pace", "risk": {"light": "yellow", "medium": "yellow", "strong": "yellow"}, "intensity": True},
    "more_breathing_room": {"category": "pace", "risk": "yellow"},
    "raise_voice": {"category": "audio", "risk": {"light": "green", "medium": "green", "strong": "yellow"}, "intensity": True},
    "reduce_noise_echo": {"category": "audio", "risk": "yellow"},
    "normalize_volume": {"category": "audio", "risk": "green"},
    "fix_av_sync": {"category": "audio", "risk": "yellow"},
    "shorten_start": {"category": "edges", "risk": "red"},
    "more_space_before": {"category": "edges", "risk": "red"},
    "restore_ending": {"category": "edges", "risk": "red"},
    "more_space_after": {"category": "edges", "risk": "red"},
    "restore_cut": {"category": "content", "risk": "red"},
    "remove_passage": {"category": "content", "risk": "red"},
    "fix_unnatural_cut": {"category": "content", "risk": "red"},
    "keep_intentional_pause": {"category": "content", "risk": "red"},
    "keep_repetition": {"category": "content", "risk": "red"},
    "remove_repetition": {"category": "content", "risk": "red"},
    "fix_title_number": {"category": "cover", "risk": "red"},
    "change_brand": {"category": "cover", "risk": "red"},
    "fix_intro_copy": {"category": "cover", "risk": "red"},
    "other_visual": {"category": "cover", "risk": "red", "note_required": True},
}

CONFLICTS = {
    frozenset(("reduce_pauses", "more_breathing_room")),
    frozenset(("keep_repetition", "remove_repetition")),
}


def _risk_for(action: str, intensity: Optional[str]) -> str:
    cfg = REVISION_CATALOG[action]
    risk = cfg["risk"]
    if isinstance(risk, dict):
        if intensity not in risk:
            raise ValueError(f"Intensita non valida per {action}")
        return risk[intensity]
    return risk


def classify_revision_items(items: List[Dict[str, Any]], duration_s: float, cycle: int) -> Dict[str, Any]:
    if not items:
        raise ValueError("Aggiungi almeno una modifica")
    normalized = []
    for index, raw in enumerate(items):
        action = str(raw.get("action") or "")
        if action not in REVISION_CATALOG:
            raise ValueError(f"Modifica non valida: {action}")
        cfg = REVISION_CATALOG[action]
        scope = raw.get("scope") or "global"
        if scope not in ("global", "timestamp"):
            raise ValueError("Ambito non valido")
        timestamp_s = raw.get("timestamp_s")
        if scope == "timestamp":
            if timestamp_s is None or float(timestamp_s) < 0 or float(timestamp_s) > float(duration_s or 0):
                raise ValueError("Timestamp fuori dalla durata del video")
            timestamp_s = round(float(timestamp_s), 2)
        else:
            timestamp_s = None
        note = str(raw.get("note") or "").strip()
        if cfg.get("note_required") and len(note) < 5:
            raise ValueError("Aggiungi una nota di almeno 5 caratteri")
        intensity = raw.get("intensity")
        risk = _risk_for(action, intensity)
        normalized.append({
            "item_id": str(raw.get("item_id") or uuid.uuid4().hex), "order": index,
            "category": cfg["category"], "action": action, "intensity": intensity,
            "scope": scope, "timestamp_s": timestamp_s, "note": note or None,
            "risk": risk, "result": "pending",
        })

    for i, left in enumerate(normalized):
        for right in normalized[i + 1:]:
            same_target = left["scope"] == right["scope"] == "global" or (
                left["scope"] == right["scope"] == "timestamp"
                and abs(left["timestamp_s"] - right["timestamp_s"]) <= 1.0
            )
            if same_target and frozenset((left["action"], right["action"])) in CONFLICTS:
                raise ValueError("La lista contiene modifiche incompatibili sullo stesso punto")

    risk = max((x["risk"] for x in normalized), key=lambda x: RISK_ORDER[x])
    if int(cycle) >= 3 and risk == "green":
        risk = "yellow"
    return {"items": normalized, "risk": risk, "requires_team_review": risk != "green"}


def build_revision_package(lesson: Dict[str, Any], *, partner_id: str, lesson_id: str,
                           output_version: int, items: List[Dict[str, Any]], actor_id: str,
                           now_iso: Optional[str] = None) -> Dict[str, Any]:
    current = int(lesson.get("output_version") or 0)
    if current <= 0 or current != int(output_version):
        raise ValueError("Il video e' stato aggiornato: ricarica la nuova versione")
    if (lesson.get("pipeline_status") or lesson.get("status")) not in ("ready_for_review", "ready_for_review_gcs"):
        raise ValueError("Questa versione non e' disponibile per la revisione")
    cycle = int(lesson.get("revision_cycle") or 0) + 1
    classified = classify_revision_items(items, float(lesson.get("video_final_duration_s") or 0), cycle)
    now = now_iso or datetime.now(timezone.utc).isoformat()
    return {
        "revision_id": uuid.uuid4().hex, "partner_id": str(partner_id), "lesson_id": lesson_id,
        "source_output_version": current, "target_output_version": current + 1,
        "cycle": cycle, "status": "team_review" if classified["requires_team_review"] else "queued",
        "risk": classified["risk"], "requires_team_review": classified["requires_team_review"],
        "items": classified["items"], "submitted_by": actor_id, "submitted_at": now,
        "started_at": None, "completed_at": None, "cancelled_at": None,
    }


def build_partner_review_update(lesson: Dict[str, Any], *, decision: str, output_version: int,
                                actor_id: str, note: Optional[str] = None,
                                now_iso: Optional[str] = None) -> Dict[str, Any]:
    if decision not in VALID_DECISIONS:
        raise ValueError("Decisione non valida")
    current = int(lesson.get("output_version") or 0)
    if current <= 0 or current != int(output_version):
        raise ValueError("Il video e' stato aggiornato: ricarica la pagina e guarda la nuova versione")
    if (lesson.get("pipeline_status") or lesson.get("status")) not in ("ready_for_review", "ready_for_review_gcs"):
        raise ValueError("Questa versione non e' disponibile per l'approvazione")
    if not (lesson.get("output_gcs_url") or lesson.get("video_ciak_url") or lesson.get("video_embed_url") or lesson.get("video_youtube_url")):
        raise ValueError("File editato non disponibile")
    clean_note = (note or "").strip()
    if decision == "request_revision" and len(clean_note) < 5:
        raise ValueError("Descrivi la modifica richiesta in almeno 5 caratteri")
    now = now_iso or datetime.now(timezone.utc).isoformat()
    approved = decision == "approve"
    fields = {
        "partner_review_status": "approved" if approved else "revision_requested",
        "partner_review_version": current, "partner_approved": approved, "video_approved": approved,
        "pipeline_status": "approved" if approved else "revision_requested",
        "status": "approved" if approved else "revision_requested",
        "partner_revision_note": None if approved else clean_note,
        "partner_reviewed_at": now, "partner_reviewed_by": actor_id,
    }
    fields["partner_approved_at" if approved else "partner_revision_requested_at"] = now
    return {"fields": fields, "history": {"action": decision, "output_version": current,
            "note": clean_note or None, "actor_id": actor_id, "at": now}}


def is_partner_approved(lesson: Dict[str, Any]) -> bool:
    version = int(lesson.get("output_version") or 0)
    standard = (lesson.get("lesson_standard_report") or {}).get("standard_version")
    if version <= 0 and standard != "ciak-lesson-v1":
        return bool(lesson.get("video_approved") or lesson.get("pipeline_status") == "approved")
    return bool(version > 0 and lesson.get("partner_approved") is True
                and lesson.get("partner_review_status") == "approved"
                and int(lesson.get("partner_review_version") or 0) == version)
