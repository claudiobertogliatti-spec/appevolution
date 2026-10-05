"""Record `files` del video approvato, per la pagina Materiali del partner.

Prima il record aveva solo `internal_url` (YouTube o link Ciak): la lista Materiali scarta i video che non stanno su
storage fidato e non hanno `public_url`, quindi un video APPROVATO non compariva mai (ne al partner ne in supervisione).
Ora il link approvato, se e di un host consentito (YouTube / *.ciak.io), e anche `public_url`: compare con "Apri".
"""
from __future__ import annotations

import uuid
from typing import Optional

from services.partner_step_materials import allowed_public_url


def approved_video_url(video_doc: dict) -> Optional[str]:
    review_url = video_doc.get("video_review_url") or video_doc.get("video_gcs_review_url")
    youtube_url = video_doc.get("video_youtube_url")
    status = video_doc.get("pipeline_status") or video_doc.get("video_pipeline_status") or video_doc.get("status")
    if status == "ready_for_review_gcs":
        return review_url or youtube_url or video_doc.get("video_embed_url")
    return youtube_url or review_url or video_doc.get("video_embed_url")


def build_approved_video_record(*, partner_id: str, partner_name: str, video_type: str, lesson_id: Optional[str],
                                video_doc: dict, now: str) -> Optional[dict]:
    """Ritorna il record da salvare in `files`, o None se il video non ha ancora un link da mostrare."""
    title = (video_doc.get("title") or video_doc.get("video_original_name")
             or ("Masterclass" if video_type == "masterclass" else f"Lezione {lesson_id}"))
    if str(title).lower().endswith((".mp4", ".mov", ".webm", ".mkv")):
        original_name = str(title)
    else:
        prefix = "Masterclass" if video_type == "masterclass" else "Videocorso"
        original_name = f"{prefix} - {title}.mp4"

    approved_url = approved_video_url(video_doc)
    if not approved_url:
        return None
    stable_part = "masterclass" if video_type == "masterclass" else (lesson_id or "lesson")
    return {
        "id": str(uuid.uuid4()),
        "file_id": f"approved-video-{partner_id}-{stable_part}",
        "partner_id": partner_id,
        "original_name": original_name,
        "stored_name": original_name,
        "file_type": "video",
        "category": "video",
        "internal_url": approved_url,
        "public_url": allowed_public_url(approved_url),
        "youtube_url": video_doc.get("video_youtube_url"),
        "embed_url": video_doc.get("video_embed_url"),
        "review_url": video_doc.get("video_review_url") or video_doc.get("video_gcs_review_url"),
        "lesson_id": lesson_id,
        "video_type": video_type,
        "partner_name": partner_name,
        "status": "approved",
        "source": "video_review",
        "size": int(video_doc.get("video_file_size") or 0),
        "uploaded_at": now,
        "verified_at": now,
        "verified_by": "admin",
        "updated_at": now,
    }
