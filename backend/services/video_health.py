"""
Video pipeline health + ops health — helper PURI (nessun I/O).

Tutta la logica di classificazione stato, decisione retry, aggregazione
system-health e mapping stato-tecnico→messaggio-partner vive qui e non tocca
DB o FastAPI: è interamente testabile a unità. I router (routers/ciak_admin.py,
routers/partner_journey.py) leggono i documenti Mongo e passano solo dati grezzi.

Consumatori:
  - GET  /api/admin/ciak/video-pipeline-health
  - POST /api/admin/ciak/video-pipeline-retry
  - GET  /api/admin/ciak/system-health
  - messaggi partner-facing sugli stati video
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

# ── Stati pipeline ────────────────────────────────────────────────────────────
# Stati tecnici "in lavorazione": se restano fermi troppo a lungo (heartbeat
# vecchio o assente) vengono riclassificati come "bloccati".
IN_PROGRESS_STATES = {
    "queued", "downloading", "cleaning", "transcribing", "smart_editing",
    "cutting_fillers", "rendering", "uploading_youtube", "syncing_audio",
    "burning_subtitles", "montaggio",
}
ERROR_STATES = {"error", "error_youtube"}
REVIEW_STATE = "da_revisionare"
MONTAGGIO_STATE = "montaggio"
READY_STATES = {"ready_for_review", "ready_for_review_gcs"}

# Categoria operativa → etichetta semplice per l'admin (niente gergo tecnico).
CATEGORY_LABELS = {
    "da_revisionare": "Da revisionare",
    "montaggio": "In montaggio",
    "error_youtube": "Upload YouTube fallito",
    "error": "Errore",
    "stuck": "Bloccato",
    "in_progress": "In lavorazione",
    "ready": "Pronto da approvare",
    "approved": "Approvato",
    "idle": "Nessuna lavorazione",
}

# Categorie che richiedono un intervento dell'admin.
ATTENTION_CATEGORIES = {"error", "error_youtube", "stuck"}

DEFAULT_STUCK_AFTER_S = 360  # 6 min senza heartbeat → bloccato


def parse_iso(value) -> Optional[datetime]:
    """Parsing tollerante di un timestamp ISO (o datetime) → datetime aware UTC."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _age_seconds(ref: Optional[datetime], now: datetime) -> Optional[float]:
    if ref is None:
        return None
    return (now - ref).total_seconds()


def classify(status, heartbeat_at, updated_at, now, stuck_after_s=DEFAULT_STUCK_AFTER_S):
    """Ritorna (categoria, is_stuck).

    is_stuck = lo stato è tecnico/in-lavorazione MA l'ultimo heartbeat (o, in
    sua assenza, l'ultimo updated_at) è più vecchio di stuck_after_s. Se manca
    ogni timestamp e lo stato è in-lavorazione, viene considerato bloccato.
    Gli stati di errore hanno priorità e non sono mai "stuck".
    """
    status = (status or "").strip()
    if not status:
        return "idle", False

    if status in ERROR_STATES:
        return status, False  # "error" | "error_youtube"

    ref = parse_iso(heartbeat_at) or parse_iso(updated_at)
    age = _age_seconds(ref, now)
    is_progress = status in IN_PROGRESS_STATES
    is_stuck = bool(is_progress and (age is None or age > stuck_after_s))

    if is_stuck:
        return "stuck", True
    if status == REVIEW_STATE:
        return "da_revisionare", False
    if status == MONTAGGIO_STATE:
        return "montaggio", False
    if status in READY_STATES:
        return "ready", False
    if status == "approved":
        return "approved", False
    if is_progress:
        return "in_progress", False
    return "idle", False


def build_item(*, partner_id, partner_name, video_type, lesson_id, status,
               error, updated_at, heartbeat_at, has_raw_url, now,
               stuck_after_s=DEFAULT_STUCK_AFTER_S):
    """Costruisce una riga health normalizzata (etichette semplici per admin)."""
    category, is_stuck = classify(status, heartbeat_at, updated_at, now, stuck_after_s)
    return {
        "partner_id": partner_id,
        "partner_name": partner_name,
        "video_type": video_type,
        "lesson_id": lesson_id,
        "status": status,
        "category": category,
        "label": CATEGORY_LABELS.get(category, category),
        "is_stuck": is_stuck,
        "needs_attention": category in ATTENTION_CATEGORIES,
        "updated_at": updated_at,
        "heartbeat_at": heartbeat_at,
        "has_raw_url": bool(has_raw_url),
        # Campo tecnico: mostrato solo in un blocco collassabile lato admin.
        "error": (error or None),
    }


def item_from_masterclass(doc, partner_names=None, now=None,
                          stuck_after_s=DEFAULT_STUCK_AFTER_S):
    """Riga health da un documento masterclass_factory. None se stato vuoto/approvato."""
    now = now or datetime.now(timezone.utc)
    partner_names = partner_names or {}
    pid = doc.get("partner_id")
    status = (doc.get("video_pipeline_status") or "").strip()
    if not status or status == "approved":
        return None
    return build_item(
        partner_id=pid,
        partner_name=doc.get("partner_name") or partner_names.get(pid),
        video_type="masterclass",
        lesson_id=None,
        status=status,
        error=doc.get("video_pipeline_error") or doc.get("pipeline_error"),
        updated_at=doc.get("updated_at"),
        heartbeat_at=doc.get("pipeline_heartbeat_at"),
        has_raw_url=bool(doc.get("video_raw_url")),
        now=now, stuck_after_s=stuck_after_s,
    )


def items_from_videocorso(doc, partner_names=None, now=None,
                          stuck_after_s=DEFAULT_STUCK_AFTER_S):
    """Righe health dalle lezioni di un documento partner_videocorso.

    Il heartbeat della pipeline videocorso è scritto a livello di documento
    (`pipeline_heartbeat_at`), quindi lo si usa come fallback per ogni lezione.
    """
    now = now or datetime.now(timezone.utc)
    partner_names = partner_names or {}
    pid = doc.get("partner_id")
    pname = doc.get("partner_name") or partner_names.get(pid)
    hb_root = doc.get("pipeline_heartbeat_at")
    out = []
    for lid, lesson in (doc.get("lessons") or {}).items():
        lesson = lesson or {}
        status = (lesson.get("pipeline_status") or "").strip()
        if not status or status == "approved":
            continue
        out.append(build_item(
            partner_id=pid,
            partner_name=pname,
            video_type="videocorso",
            lesson_id=lid,
            status=status,
            error=lesson.get("pipeline_error"),
            updated_at=lesson.get("updated_at") or doc.get("updated_at"),
            heartbeat_at=lesson.get("pipeline_heartbeat_at") or hb_root,
            has_raw_url=bool(lesson.get("video_raw_url") or lesson.get("drive_file_id")),
            now=now, stuck_after_s=stuck_after_s,
        ))
    return out


def build_summary(items, now=None):
    """Aggrega le righe in bucket operativi con conteggi e flag attention."""
    now = now or datetime.now(timezone.utc)
    buckets = {
        "da_revisionare": [], "montaggio": [], "bloccati": [],
        "errori_youtube": [], "errori": [], "in_lavorazione": [], "pronti": [],
    }
    routing = {
        "da_revisionare": "da_revisionare",
        "montaggio": "montaggio",
        "stuck": "bloccati",
        "error_youtube": "errori_youtube",
        "error": "errori",
        "in_progress": "in_lavorazione",
        "ready": "pronti",
    }
    for it in items:
        key = routing.get(it["category"])
        if key:
            buckets[key].append(it)
    counts = {k: len(v) for k, v in buckets.items()}
    total_attention = counts["bloccati"] + counts["errori_youtube"] + counts["errori"]
    return {
        "generated_at": now.isoformat() if isinstance(now, datetime) else now,
        "counts": counts,
        "total_attention": total_attention,
        "attention": total_attention > 0,
        **buckets,
    }


def decide_retry_action(*, status, has_raw_url, has_approved_cuts,
                        has_final_video=False, force_phase=None):
    """Decide se rilanciare Fase A (dal grezzo) o Fase B (montaggio/upload).

    Fase B: stato `montaggio`/`error_youtube` con tagli approvati o video finale.
    Fase A: fallback quando c'è il video grezzo.
    force_phase ("a"|"b") forza la scelta se fattibile.
    """
    status = (status or "").strip()
    fase_b_eligible = (
        status in ("montaggio", "error_youtube")
        and (has_approved_cuts or has_final_video)
    )
    if force_phase == "b":
        if has_approved_cuts or has_final_video:
            return {"action": "fase_b", "reason": "Forzato montaggio (Fase B)."}
        return {"action": "none",
                "reason": "Fase B richiesta ma nessun taglio approvato o video finale."}
    if force_phase == "a":
        if has_raw_url:
            return {"action": "fase_a", "reason": "Forzato riprocesso dal grezzo (Fase A)."}
        return {"action": "none", "reason": "Fase A richiesta ma manca il video grezzo."}
    if fase_b_eligible:
        return {"action": "fase_b",
                "reason": f"Stato «{status}»: rilancio montaggio/upload dai tagli approvati."}
    if has_raw_url:
        return {"action": "fase_a", "reason": "Rilancio pipeline dal video grezzo."}
    return {"action": "none", "reason": "Nessun video grezzo disponibile per il retry."}


# ── System health ────────────────────────────────────────────────────────────

_SEVERITY_ORDER = {"ok": 0, "attention": 1, "critical": 2}
_SEVERITY_REVERSE = {v: k for k, v in _SEVERITY_ORDER.items()}


def aggregate_system_status(statuses) -> str:
    """Stato globale = peggiore tra i componenti (ok < attention < critical)."""
    worst = 0
    for s in statuses:
        worst = max(worst, _SEVERITY_ORDER.get((s or "ok"), 0))
    return _SEVERITY_REVERSE[worst]


# ── Mapping stato tecnico → messaggio partner (nessun dettaglio tecnico) ──────
# Il partner non deve mai vedere Mongo/AssemblyAI/YouTube/stack trace.
_PARTNER_STATUS_MAP = {
    None:                  ("nessuno", ""),
    "":                    ("nessuno", ""),
    "queued":              ("ricevuto", "Video ricevuto"),
    "downloading":         ("lavorazione", "Il team sta lavorando al tuo video"),
    "cleaning":            ("lavorazione", "Il team sta lavorando al tuo video"),
    "transcribing":        ("lavorazione", "Il team sta lavorando al tuo video"),
    "smart_editing":       ("lavorazione", "Il team sta lavorando al tuo video"),
    "cutting_fillers":     ("lavorazione", "Il team sta lavorando al tuo video"),
    "syncing_audio":       ("lavorazione", "Il team sta lavorando al tuo video"),
    "burning_subtitles":   ("lavorazione", "Il team sta lavorando al tuo video"),
    "rendering":           ("montaggio", "Montaggio in corso"),
    "uploading_youtube":   ("montaggio", "Montaggio in corso"),
    "da_revisionare":      ("revisione", "Il team sta revisionando"),
    "montaggio":           ("montaggio", "Montaggio in corso"),
    "ready_for_review":    ("pronto", "Pronto da approvare"),
    "ready_for_review_gcs": ("pronto", "Pronto da approvare"),
    "approved":            ("approvato", "Approvato"),
    # Errori: MAI mostrati come tecnici. Il team li gestisce dietro le quinte.
    "error":               ("lavorazione", "Il team sta sistemando il tuo video"),
    "error_youtube":       ("lavorazione", "Il team sta sistemando il tuo video"),
}


def partner_facing_video_status(status, needs_reupload=False):
    """Traduce lo stato tecnico pipeline nel messaggio mostrato al partner.

    needs_reupload=True (richiesta esplicita di un nuovo file) → messaggio dedicato.
    Ritorna {"partner_status", "partner_message"}.
    """
    if needs_reupload:
        return {"partner_status": "nuovo_file", "partner_message": "Serve un nuovo file"}
    key = (status or "").strip() or None
    phase, message = _PARTNER_STATUS_MAP.get(key, ("lavorazione", "Il team sta lavorando al tuo video"))
    return {"partner_status": phase, "partner_message": message}
