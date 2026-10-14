"""Carico di lezioni GIA' registrate (da Drive) nel videocorso di un partner, senza farle montare.

La pipeline normale (`submit-video-link`) parte subito col montaggio. Qui si registra solo il grezzo:
la lezione compare nel videocorso con il suo titolo e il file nello storage, in stato "caricato", e il
montaggio si lancia dopo, una lezione alla volta, con `video-pipeline-retry` (fase A, revisione dei tagli).

Funzioni pure: nessun accesso a rete o DB (il router scrive).
"""
from __future__ import annotations

import re
from typing import Any, Optional

BUCKET = "gen-lang-client-0744698012_cloudbuild"
STATUS_LOADED = "caricato"            # grezzo nello storage, montaggio non ancora lanciato
LESSON_ID_RE = re.compile(r"^lez-\d{1,3}$")
MAX_ITEMS = 12
MAX_TITLE = 120
EXTENSIONS = (".mp4", ".mov")


class IntakeError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


def raw_prefix(partner_id: str, lesson_id: str) -> str:
    """Dove sta il grezzo di una lezione: la stessa convenzione che la pipeline usa per i caricamenti."""
    return f"gs://{BUCKET}/raw_videos/{partner_id}/videocorso/{lesson_id}/"


def resolve_items(partner_id: str, videocorso: Optional[dict], requests: Any) -> list[dict]:
    """Richieste dell'admin -> lezioni da registrare, tutte verificate. Niente viene inventato."""
    if not isinstance(requests, list) or not requests:
        raise IntakeError(400, "Nessuna lezione da caricare")
    if len(requests) > MAX_ITEMS:
        raise IntakeError(400, f"Massimo {MAX_ITEMS} lezioni per volta")
    lessons = (videocorso or {}).get("lessons") or {}
    out, seen = [], set()
    for raw in requests:
        raw = raw or {}
        lesson_id = str(raw.get("lesson_id") or "").strip()
        title = " ".join(str(raw.get("title") or "").split())
        path = str(raw.get("gcs_path") or "").strip()
        if not LESSON_ID_RE.match(lesson_id):
            raise IntakeError(400, f"Id lezione non valido: «{lesson_id}» (atteso lez-N)")
        if not 3 <= len(title) <= MAX_TITLE:
            raise IntakeError(400, f"{lesson_id}: il titolo deve avere da 3 a {MAX_TITLE} caratteri")
        prefix = raw_prefix(partner_id, lesson_id)
        if (not path.startswith(prefix) or ".." in path or not path.lower().endswith(EXTENSIONS)
                or len(path) == len(prefix)):
            raise IntakeError(400, f"{lesson_id}: il file deve stare in {prefix} ed essere .mp4 o .mov")
        if lesson_id in seen:
            raise IntakeError(400, f"Lezione indicata due volte: {lesson_id}")
        seen.add(lesson_id)
        existing = lessons.get(lesson_id) or {}
        if existing.get("video_raw_url") or existing.get("video_youtube_id"):
            raise IntakeError(409, f"{lesson_id} ha già un video: non si sovrascrive")
        out.append({"lesson_id": lesson_id, "title": title, "gcs_path": path})
    return out


def intake_fields(item: dict, now: str, actor: Optional[str] = None) -> dict:
    """Campi da scrivere sulla lezione. Stato "caricato": non e' in lavorazione (nessun avviso di blocco)
    e non parte nessun montaggio."""
    lk = f"lessons.{item['lesson_id']}"
    return {
        f"{lk}.title": item["title"],
        f"{lk}.video_raw_url": item["gcs_path"],
        f"{lk}.status": STATUS_LOADED,
        f"{lk}.pipeline_status": STATUS_LOADED,
        f"{lk}.video_submitted_at": now,
        f"{lk}.intake_source": "drive",
        f"{lk}.intake_by": actor,
    }
