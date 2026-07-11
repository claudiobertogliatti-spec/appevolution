"""
Ciak Publish — helper PURI per la pubblicazione delle lezioni montate su GCS.

Nessun I/O: costruisce path GCS, URL permanente servito da Ciak, snippet embed e
il record da inserire nei File del partner (collezione db.files).
"""
from __future__ import annotations

import uuid

DEFAULT_BASE = "https://www.ciak.io"
EDITED_PREFIX = "edited_videos"
LESSON_VIDEO_CATEGORY = "lezione_video"


def edited_gcs_subpath(partner_id: str, lesson_id: str, version: int) -> str:
    """Sub-path GCS del montato: edited_videos/{pid}/{lesson_id}/v{version}.mp4."""
    return f"{EDITED_PREFIX}/{partner_id}/{lesson_id}/v{int(version)}.mp4"


def ciak_lesson_url(partner_id: str, lesson_id: str, base: str = DEFAULT_BASE) -> str:
    """Link permanente servito da Ciak (redirect verso GCS)."""
    return f"{base.rstrip('/')}/api/lesson-video/{partner_id}/{lesson_id}"


def embed_snippet(url: str) -> str:
    """Snippet HTML da incollare in Systeme (blocco codice)."""
    return f'<video src="{url}" controls width="720" style="max-width:100%"></video>'


def partner_file_doc(partner_id: str, lesson_id: str, title: str, ciak_url: str, now: str) -> dict:
    """Record da inserire in db.files (I Miei File del partner)."""
    return {
        "file_id": uuid.uuid4().hex,
        "partner_id": str(partner_id),
        "lesson_id": lesson_id,
        "original_name": title or f"Lezione {lesson_id}",
        "category": LESSON_VIDEO_CATEGORY,
        "internal_url": ciak_url,
        "created_at": now,
    }
