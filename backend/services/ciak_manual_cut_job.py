"""Creazione del lavoro di taglio manuale: validazione, prenotazione della lezione, accodamento.

Separato da server.py per poterlo provare con un finto DB. Solleva `ManualCutError(status, message)`.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Optional

from services.ciak_manual_cut import normalize_ranges

REVIEW_STATUSES = ("ready_for_review", "ready_for_review_gcs")


class ManualCutError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


async def create_manual_cut_job(db: Any, *, partner_id: str, lesson_id: Optional[str], video_type: str,
                                ranges: list, actor_id: Optional[str],
                                dispatch: Callable[[str], Any]) -> dict:
    if video_type != "videocorso" or not lesson_id:
        raise ManualCutError(400, "Il taglio manuale vale per le videolezioni (serve lesson_id)")
    vc = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    lesson = ((vc.get("lessons") or {}).get(lesson_id) or {})
    version = int(lesson.get("output_version") or 0)
    if not lesson or version <= 0 or not lesson.get("output_gcs_url"):
        raise ManualCutError(400, "Questa lezione non ha un video montato da tagliare")
    if (lesson.get("pipeline_status") or lesson.get("status")) not in REVIEW_STATUSES:
        raise ManualCutError(400, "Il taglio si fa sulle lezioni in attesa di approvazione")
    try:
        clean = normalize_ranges(ranges or [], float(lesson.get("video_final_duration_s") or 0))
    except ValueError as exc:
        raise ManualCutError(400, str(exc))

    cut_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()
    lk = f"lessons.{lesson_id}"
    claimed = await db.partner_videocorso.update_one(
        {"partner_id": partner_id, f"{lk}.output_version": version,
         f"{lk}.active_manual_cut_id": {"$in": [None, ""]}},
        {"$set": {f"{lk}.active_manual_cut_id": cut_id, "updated_at": now}},
    )
    if not claimed.modified_count:
        raise ManualCutError(409, "C'è già un taglio in corso su questa lezione")
    job = {"cut_id": cut_id, "partner_id": partner_id, "lesson_id": lesson_id, "ranges": clean,
           "source_output_version": version, "target_output_version": version + 1,
           "status": "queued", "submitted_by": actor_id, "submitted_at": now}
    await db.lesson_manual_cuts.insert_one({**job})
    try:
        result = dispatch(cut_id)
        if hasattr(result, "__await__"):
            await result
    except Exception as exc:
        await db.lesson_manual_cuts.update_one({"cut_id": cut_id},
                                               {"$set": {"status": "failed", "error": str(exc)[:300]}})
        await db.partner_videocorso.update_one({"partner_id": partner_id},
                                               {"$set": {f"{lk}.active_manual_cut_id": None}})
        raise ManualCutError(503, "Worker video non raggiungibile: riprova tra poco")
    return {"success": True, "cut_id": cut_id, "ranges": clean, "target_output_version": version + 1}
