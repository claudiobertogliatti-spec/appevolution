"""Pubblicazione dei video FINALI su YouTube (archivio non in elenco del partner): richiesta, validazione, accodamento.

Il corso su Systeme usa il link di Ciak, non YouTube: YouTube e l'archivio. Qui l'admin dice QUALI video finali mettere
nella playlist del partner e con quale titolo; il worker scarica il file dallo storage, lo carica, registra l'id sulla
lezione (o sulla masterclass) e lo aggiunge alla playlist. Niente file in una richiesta HTTP (Cloud Run: 32 MB).

Separato da server.py per poterlo provare con un finto DB. Solleva `PublishError(status, message)`.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from services.ciak_manual_cut import gs_url_from_public

BUCKET = "gen-lang-client-0744698012_cloudbuild"
MAX_ITEMS = 10
MAX_TITLE = 100
ACTIVE_STATUSES = ("queued", "processing")


class PublishError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


def _edited_source(partner_id: str, gcs_path: str, cosa: str) -> str:
    """Un video montato fuori dall'app va prima copiato sotto edited_videos/<partner>/ (e li che si cerca)."""
    prefix = f"gs://{BUCKET}/edited_videos/{partner_id}/"
    path = str(gcs_path or "").strip()
    if not path.startswith(prefix) or ".." in path or not path.lower().endswith(".mp4") or len(path) == len(prefix):
        raise PublishError(400, f"Il file {cosa} deve stare in {prefix} ed essere un .mp4")
    return path


def _masterclass_source(partner_id: str, gcs_path: str) -> str:
    return _edited_source(partner_id, gcs_path, "della masterclass")


def resolve_items(partner_id: str, videocorso: Optional[dict], requests: list) -> list[dict]:
    """Richieste dell'admin -> elementi da pubblicare, tutti verificati. Nessun id inventato: se manca qualcosa, errore."""
    if not requests or not isinstance(requests, list):
        raise PublishError(400, "Nessun video da pubblicare")
    if len(requests) > MAX_ITEMS:
        raise PublishError(400, f"Massimo {MAX_ITEMS} video per volta")
    lessons = (videocorso or {}).get("lessons") or {}
    items, seen = [], set()
    for raw in requests:
        raw = raw or {}
        kind = raw.get("kind")
        title = str(raw.get("title") or "").strip()
        if not title or len(title) > MAX_TITLE:
            raise PublishError(400, f"Ogni video ha bisogno di un titolo di al massimo {MAX_TITLE} caratteri")
        if kind == "lesson":
            lesson_id = str(raw.get("lesson_id") or "").strip()
            lesson = lessons.get(lesson_id) or {}
            gs_url = gs_url_from_public(lesson.get("output_gcs_url") or "")
            if not lesson_id or not gs_url:
                raise PublishError(400, f"La lezione {lesson_id or '?'} non ha un video montato nello storage")
            key, item = f"lesson:{lesson_id}", {"kind": "lesson", "lesson_id": lesson_id, "gs_url": gs_url,
                                                "source_version": int(lesson.get("output_version") or 0)}
        elif kind == "masterclass":
            key = "masterclass"
            item = {"kind": "masterclass", "lesson_id": None,
                    "gs_url": _masterclass_source(partner_id, raw.get("gcs_path"))}
        elif kind == "material":
            # Bonus e altri video di supporto: stanno su YouTube e compaiono tra i Materiali del partner come LINK.
            # La chiave e' il nome del file: lo stesso file non si pubblica due volte (vedi `already_published`).
            path = _edited_source(partner_id, raw.get("gcs_path"), "del materiale")
            key = "material:" + path.rsplit("/", 1)[-1].lower()
            item = {"kind": "material", "lesson_id": None, "gs_url": path}
        else:
            raise PublishError(400, "Il tipo del video deve essere 'lesson', 'masterclass' o 'material'")
        if key in seen:
            raise PublishError(400, f"Video indicato due volte: {key}")
        seen.add(key)
        items.append({**item, "key": key, "title": title, "status": "queued"})
    return items


def registration_fields(kind: str, lesson_id: Optional[str], youtube_id: str) -> dict:
    """Campi da scrivere dopo il caricamento. Lezione: solo l'archivio YouTube (il corso usa il link di Ciak).
    Masterclass: l'incorporamento e proprio YouTube, quindi si aggiorna tutto il gruppo coerente."""
    url = f"https://www.youtube.com/watch?v={youtube_id}"
    if kind == "material":
        return {}  # niente da aggiornare sul percorso: il materiale si registra a parte (`material_registration_item`)
    if kind == "lesson":
        lk = f"lessons.{lesson_id}"
        return {f"{lk}.video_youtube_id": youtube_id, f"{lk}.video_youtube_url": url}
    embed = f"https://www.youtube.com/embed/{youtube_id}"
    return {"video_youtube_id": youtube_id, "video_youtube_url": url, "video_embed_url": embed,
            "video_systeme_embed": f'<iframe src="{embed}" width="560" height="315" frameborder="0" allowfullscreen></iframe>'}


def material_registration_item(title: str, youtube_id: str) -> dict:
    """Voce per `register_drive_file_once`: il video su YouTube come materiale del partner, apribile dal link.
    `drive_id` e' stabile (`yt-<id>`): registrare due volte lo stesso video non crea un secondo record."""
    return {"name": title, "url": f"https://www.youtube.com/watch?v={youtube_id}", "drive_id": f"yt-{youtube_id}",
            "category": "video", "mime_type": "video/mp4", "folder": "Bonus e risorse",
            "visibility": "partner_visible", "approval_status": "approved"}


async def _material_items(db: Any, partner_id: str, exclude_job_id: Optional[str] = None) -> list[dict]:
    """Voci `material` gia' caricate su YouTube per questo partner (qualunque lavoro precedente)."""
    found = []
    async for job in db.youtube_publish_jobs.find({"partner_id": partner_id}):
        if exclude_job_id and job.get("job_id") == exclude_job_id:
            continue
        for it in job.get("items") or []:
            if it.get("kind") == "material" and it.get("youtube_id") and it.get("status") in ("uploaded", "done"):
                found.append(it)
    return found


async def already_published(db: Any, partner_id: str, key: str, exclude_job_id: Optional[str] = None) -> Optional[str]:
    """Id YouTube se questo materiale (stessa chiave = stesso nome file) e' gia' stato caricato: non si carica due volte."""
    for it in await _material_items(db, partner_id, exclude_job_id):
        if it.get("key") == key:
            return it["youtube_id"]
    return None


async def published_material_ids(db: Any, partner_id: str) -> set:
    """Id YouTube dei materiali caricati: la pulizia della playlist (`prune-playlist`) deve TENERLI."""
    return {it["youtube_id"] for it in await _material_items(db, partner_id)}


async def create_publish_job(db: Any, *, partner_id: str, requests: list, actor_id: Optional[str],
                             dispatch: Callable[[str], Any]) -> dict:
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "id": 1})
    if not partner:
        raise PublishError(404, "Partner non trovato")
    vc = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    items = resolve_items(partner_id, vc, requests)
    if await db.youtube_publish_jobs.find_one({"partner_id": partner_id, "status": {"$in": list(ACTIVE_STATUSES)}}):
        raise PublishError(409, "C'è già una pubblicazione in corso per questo partner")
    job_id = uuid.uuid4().hex
    job = {"job_id": job_id, "partner_id": partner_id, "items": items, "status": "queued",
           "submitted_by": actor_id, "submitted_at": datetime.now(timezone.utc).isoformat()}
    await db.youtube_publish_jobs.insert_one({**job})
    try:
        result = dispatch(job_id)
        if hasattr(result, "__await__"):
            await result
    except Exception:
        await db.youtube_publish_jobs.update_one({"job_id": job_id},
                                                 {"$set": {"status": "failed", "error": "worker non raggiungibile"}})
        raise PublishError(503, "Worker video non raggiungibile: riprova tra poco")
    return {"success": True, "job_id": job_id,
            "items": [{"key": i["key"], "title": i["title"], "source": i["gs_url"]} for i in items]}
