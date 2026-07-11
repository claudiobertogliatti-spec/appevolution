"""
Serving pubblico del video-lezione montato: link permanente Ciak -> redirect a GCS.
GET /api/lesson-video/{partner_id}/{lesson_id} -> 302 verso l'URL GCS del montato.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/api/lesson-video", tags=["lesson-video"])

db = None


def set_db(database) -> None:
    global db
    db = database


def _resolve_output_url(vc_doc, lesson_id: str):
    if not vc_doc:
        return None
    lesson = (vc_doc.get("lessons") or {}).get(lesson_id) or {}
    return lesson.get("output_gcs_url") or None


@router.get("/{partner_id}/{lesson_id}")
async def serve_lesson_video(partner_id: str, lesson_id: str):
    if db is None:
        raise HTTPException(503, "Database non configurato")
    vc = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"lessons." + lesson_id: 1})
    url = _resolve_output_url(vc, lesson_id)
    if not url:
        raise HTTPException(404, "Video lezione non disponibile")
    return RedirectResponse(url, status_code=302)
