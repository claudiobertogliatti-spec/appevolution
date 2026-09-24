"""Archivio autenticato dei materiali prodotti in ciascuno step partner."""

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services.partner_step_materials import (
    WORKBOOK_NOTICE, allowed_public_url, categories_for_step, content_type_for_material,
    file_visible_to_partner, normalize_file_material, partner_materiali_listing, safe_step_data,
    step_archive_files, step_assignment_fields, trusted_storage_url,
)

router = APIRouter(tags=["partner-step-materials"])
security = HTTPBearer(auto_error=False)
db = None


def set_db(database):
    global db
    db = database


async def _authorize(partner_id: str, credentials):
    from routers.partner_journey import require_partner_or_admin_for_partner
    return await require_partner_or_admin_for_partner(partner_id, credentials)


async def _file_or_404(file_id: str, credentials):
    doc = await db.files.find_one({"file_id": file_id}, {"_id": 0})
    if not doc or doc.get("superseded"):
        raise HTTPException(404, "Materiale non trovato")
    token_data = await _authorize(str(doc.get("partner_id")), credentials)
    if getattr(token_data, "role", None) not in ("admin", "superadmin") and not file_visible_to_partner(doc):
        raise HTTPException(404, "Materiale non trovato")
    return doc


@router.get("/api/partner-journey/operativo/step-materials/{partner_id}/{step_id}")
async def get_step_materials(partner_id: str, step_id: str,
                             credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = await _authorize(partner_id, credentials)
    is_admin = getattr(token_data, "role", None) in ("admin", "superadmin")
    step = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id}, {"_id": 0}
    )
    if not step:
        raise HTTPException(404, "Step non trovato")

    categories = list(categories_for_step(step_id))
    query = {"partner_id": str(partner_id), "superseded": {"$ne": True}, "$or": [{"step_id": step_id}, {"step_ref": step_id}]}
    if categories:
        query["$or"].append({"category": {"$in": categories}})
    docs = await db.files.find(query, {"_id": 0}).sort("uploaded_at", -1).to_list(length=100)
    materials = [normalize_file_material(doc) for doc in step_archive_files(docs, include_hidden=is_admin)]

    data = safe_step_data(step_id, step.get("data") or {})
    if data:
        materials.append({
            "id": f"data-{step_id}", "type": "data", "title": "Dati approvati",
            "preview_url": None, "download_url": None, "public_url": None,
            "version": 1, "created_at": step.get("completed_at"), "is_current": True,
            "metadata": data,
        })

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "youtube_playlist_url": 1}) or {}
    if step_id in ("08-registra-masterclass", "09-registra-lezioni"):
        playlist = allowed_public_url(partner.get("youtube_playlist_url"))
        if playlist:
            materials.append({
                "id": "youtube-playlist", "type": "video", "title": "Playlist ufficiale su YouTube",
                "preview_url": None, "download_url": None, "public_url": playlist,
                "version": 1, "created_at": None, "is_current": True, "metadata": {},
            })
        elif step_id == "09-registra-lezioni":
            materials.append({
                "id": "youtube-playlist-pending", "type": "video", "title": "Playlist ufficiale in preparazione",
                "preview_url": None, "download_url": None, "public_url": None,
                "version": 1, "created_at": None, "is_current": True, "metadata": {"pending": True},
            })

    return {
        "step_id": step_id, "title": step.get("label") or step_id,
        "status": step.get("status"), "materials": materials,
        "workbook_notice": WORKBOOK_NOTICE,
    }


@router.get("/api/partner-journey/operativo/materiali/{partner_id}")
async def get_all_partner_materiali(partner_id: str,
                                    credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Tutti i materiali del partner (fonte reale: collezione `files`), per la
    pagina Materiali. Un solo elenco di file veri — prodotti da Ciak, caricati
    dal partner o dall'admin — con preview/download autenticati. In vista admin
    (role admin) si vedono anche gli `admin_only`; al partner solo i suoi visibili.
    """
    token_data = await _authorize(partner_id, credentials)
    is_admin = getattr(token_data, "role", None) in ("admin", "superadmin")

    docs = await db.files.find(
        {"partner_id": str(partner_id)}, {"_id": 0}
    ).sort("uploaded_at", -1).to_list(length=500)

    materials = []
    for doc in partner_materiali_listing(docs, include_hidden=is_admin):
        item = normalize_file_material(doc)
        item["category"] = doc.get("category") or "documento"
        item["source"] = doc.get("source")
        item["visibility"] = doc.get("visibility")
        materials.append(item)

    return {"partner_id": partner_id, "materials": materials, "total": len(materials)}


@router.patch("/api/partner-step-materials/{file_id}/step")
async def assign_material_to_step(file_id: str, body: dict,
                                  credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Solo admin: collega un file gia' registrato a uno step del Percorso, cosi'
    compare nell'Archivio di quello step. Non tocca la `visibility`."""
    doc = await db.files.find_one({"file_id": file_id, "superseded": {"$ne": True}}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Materiale non trovato")
    token_data = await _authorize(str(doc.get("partner_id")), credentials)
    if getattr(token_data, "role", None) not in ("admin", "superadmin"):
        raise HTTPException(403, "Accesso riservato agli admin")
    try:
        fields = step_assignment_fields(str((body or {}).get("step_id") or ""))
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    await db.files.update_one({"file_id": file_id, "partner_id": doc.get("partner_id")}, {"$set": fields})
    return {"success": True, "file_id": file_id, **fields}


async def _serve(file_id: str, disposition: str, credentials):
    doc = await _file_or_404(file_id, credentials)
    # I video-materiale del partner (es. reel) sono servibili come gli altri file
    # SE stanno su storage fidato (Cloudinary). Le lezioni/masterclass NON sono
    # qui: vivono in `partner_videocorso`/`masterclass_factory` con streaming GCS
    # dedicato, quindi restano protette a prescindere da questo endpoint.
    source = trusted_storage_url(doc.get("internal_url"))
    if not source:
        raise HTTPException(404, "File non disponibile")
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            upstream = await client.get(source)
            upstream.raise_for_status()
    except Exception as exc:
        raise HTTPException(502, "Materiale temporaneamente non disponibile") from exc
    content_type = content_type_for_material(doc, upstream.headers.get("content-type"))
    filename = str(doc.get("original_name") or doc.get("filename") or "materiale").replace('"', "")
    return Response(upstream.content, media_type=content_type,
                    headers={"Content-Disposition": f'{disposition}; filename="{filename}"', "Cache-Control": "private, max-age=300"})


@router.get("/api/partner-step-materials/{file_id}/preview")
async def preview_material(file_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    return await _serve(file_id, "inline", credentials)


@router.get("/api/partner-step-materials/{file_id}/download")
async def download_material(file_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    return await _serve(file_id, "attachment", credentials)
