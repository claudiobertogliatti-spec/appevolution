"""Normalizzazione sicura dei materiali mostrati nel Percorso partner."""

import mimetypes
from pathlib import PurePosixPath
from typing import Any, Dict, Iterable, Optional
from urllib.parse import urlparse

WORKBOOK_NOTICE = ("Puoi consultare e scaricare questo materiale ora. Al termine del percorso "
                   "riceverai anche il Workbook completo, con tutti gli output ordinati fase per fase.")

STEP_CATEGORIES = {
    "01-contratto": {
        "contratto", "contratto_firmato", "contract",
        "distinta_ingresso", "distinta_pagamento",
    },
    "02-discovery-video": {"video_benvenuto", "discovery_video"},
    "burocrazia": {"dati_burocratici", "anagrafica"},
    "03-brand-kit": {"brand_kit", "brand-kit", "logo", "palette"},
    "la-tua-storia": {"storia", "storia_missione", "missione"},
    "04-posizionamento": {"posizionamento", "brand_positioning"},
    "05-script-masterclass": {"masterclass", "masterclass_script", "script_masterclass"},
    "06-outline-lezioni": {"videocorso_outline", "outline_lezioni", "course_outline"},
    "07-script-videolezioni": {"videocorso_script", "videocorso_teleprompter", "script_videolezioni"},
    "08-registra-masterclass": {"masterclass", "masterclass_video"},
    "09-registra-lezioni": {"lezione_video", "videocorso_video"},
    "10-sistema-vendita": {"funnel", "vendita", "checkout", "sales_page"},
    "11-calendario-30gg": {"calendario_lancio", "launch_calendar"},
    "13-lancio": {"lancio", "launch_asset", "risultati_lancio"},
}

DATA_WHITELISTS = {
    "01-contratto": {"signed_at", "contract_status", "partner_name"},
    "burocrazia": {"ragione_sociale", "partita_iva", "codice_fiscale", "paese", "citta"},
    "06-outline-lezioni": {"titolo", "descrizione", "moduli"},
    "09-registra-lezioni": {"lessons_count", "approved_count", "modules_count"},
    "13-lancio": {"launched_at", "funnel_url", "status"},
}

PUBLIC_HOSTS = {"youtube.com", "www.youtube.com", "youtu.be", "ciak.io", "www.ciak.io"}
STORAGE_HOSTS = {"res.cloudinary.com", "storage.googleapis.com"}
BLOCKED_HOST_MARKERS = ("drive.google", "googleusercontent", "storage.googleapis", "googleapis.com")
PARTNER_HIDDEN_VISIBILITIES = {"admin_only", "legal_dispute", "needs_review", "foreign_owner"}
MIGRATION_VISIBILITIES = PARTNER_HIDDEN_VISIBILITIES | {"partner_visible"}


def categories_for_step(step_id: str) -> set[str]:
    return set(STEP_CATEGORIES.get(step_id, set()))


def allowed_public_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    parsed = urlparse(str(url))
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or any(marker in host for marker in BLOCKED_HOST_MARKERS):
        return None
    if host in PUBLIC_HOSTS or host.endswith(".ciak.io"):
        return str(url)
    return None


def trusted_storage_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    parsed = urlparse(str(url))
    host = (parsed.hostname or "").lower()
    return str(url) if parsed.scheme == "https" and host in STORAGE_HOSTS else None


def material_type(doc: Dict[str, Any]) -> str:
    mime = str(doc.get("content_type") or doc.get("mime_type") or "").lower()
    name = str(doc.get("original_name") or doc.get("filename") or "").lower()
    suffix = PurePosixPath(name).suffix
    if "pdf" in mime or suffix == ".pdf": return "pdf"
    if mime.startswith("image/") or suffix in {".png", ".jpg", ".jpeg", ".webp", ".svg"}: return "image"
    if mime.startswith("video/") or suffix in {".mp4", ".mov", ".webm"}: return "video"
    return "document"


def content_type_for_material(doc: Dict[str, Any], upstream_content_type: Optional[str] = None) -> str:
    """Restituisce un MIME visualizzabile anche per i record storici incompleti.

    Molti PDF archiviati prima del nuovo registry non hanno `content_type` e
    Cloudinary li serve come `application/octet-stream`. Quel MIME conserva i
    byte ma impedisce al browser di renderizzare il blob dentro l'iframe.
    """
    registered = str(doc.get("content_type") or doc.get("mime_type") or "").split(";", 1)[0].strip().lower()
    upstream = str(upstream_content_type or "").split(";", 1)[0].strip().lower()
    generic = {"", "application/octet-stream", "binary/octet-stream"}
    if registered not in generic:
        return registered
    if upstream not in generic:
        return upstream

    filename = str(doc.get("original_name") or doc.get("filename") or doc.get("stored_name") or "")
    guessed, _ = mimetypes.guess_type(filename)
    if guessed:
        return guessed

    return {
        "pdf": "application/pdf",
        "image": "image/jpeg",
        "video": "video/mp4",
    }.get(material_type(doc), "application/octet-stream")


def normalize_file_material(doc: Dict[str, Any]) -> Dict[str, Any]:
    file_id = str(doc.get("file_id") or doc.get("id") or "")
    kind = material_type(doc)
    base = f"/api/partner-step-materials/{file_id}"
    return {
        "id": file_id, "type": kind,
        "title": doc.get("original_name") or doc.get("filename") or doc.get("category") or "Materiale",
        "preview_url": f"{base}/preview" if kind != "video" else None,
        "download_url": f"{base}/download" if kind != "video" else None,
        "public_url": allowed_public_url(doc.get("public_url")),
        "version": int(doc.get("version") or 1),
        "created_at": doc.get("uploaded_at") or doc.get("created_at"),
        "is_current": not bool(doc.get("superseded")), "metadata": {},
    }


def safe_step_data(step_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    allowed = DATA_WHITELISTS.get(step_id, set())
    return {key: data[key] for key in allowed if key in data and data[key] not in (None, "", [], {})}


def current_files(files: Iterable[Dict[str, Any]]) -> list[Dict[str, Any]]:
    return [f for f in files if not f.get("superseded")
            and file_visible_to_partner(f)
            and f.get("approval_status", "approved") in ("approved", "final")
            and f.get("status", "approved") in ("approved", "final")]


def file_visible_to_partner(file_doc: Dict[str, Any]) -> bool:
    """I record legacy restano visibili; le nuove classi fail-closed no."""
    return file_doc.get("visibility") not in PARTNER_HIDDEN_VISIBILITIES


def build_drive_registration_record(
    partner_id: str,
    item: Dict[str, Any],
    now: str,
    record_id: str,
) -> Dict[str, Any]:
    visibility = str(item.get("visibility") or "admin_only")
    if visibility not in MIGRATION_VISIBILITIES:
        raise ValueError("visibility non valida")
    drive_id = str(item.get("drive_id") or "").strip()
    if not drive_id:
        raise ValueError("drive_id obbligatorio")
    url = str(item.get("url") or "")
    explicitly_approved = item.get("approval_status") in ("approved", "final")
    serveable = bool(trusted_storage_url(url) or allowed_public_url(url))
    approved = visibility == "partner_visible" and explicitly_approved and serveable
    state = "approved" if approved else "pending_review"
    name = str(item.get("name") or "")
    return {
        "id": record_id,
        "file_id": drive_id,
        "partner_id": str(partner_id),
        "original_name": name,
        "stored_name": name,
        "file_type": item.get("category", "document"),
        "category": item.get("category", "document"),
        "internal_url": url,
        "drive_url": url,
        "drive_id": drive_id,
        "mime_type": item.get("mime_type", "application/octet-stream"),
        "size": item.get("size", 0),
        "folder": item.get("folder", ""),
        "step_id": item.get("step_id"),
        "step_ref": item.get("step_ref") or item.get("step_id"),
        "visibility": visibility,
        "status": state,
        "approval_status": state,
        "source": "drive",
        "uploaded_at": now,
        "registered_at": now,
        "last_edited_by": "admin",
    }


def drive_registration_key(partner_id: str, record: Dict[str, Any]) -> Dict[str, Any]:
    return {"partner_id": str(partner_id), "drive_id": record["drive_id"]}


async def register_drive_file_once(
    files_collection,
    partner_id: str,
    item: Dict[str, Any],
    now: str,
    record_id: str,
):
    """Registra una sola volta per partner+Drive ID, preservando ogni review esistente."""
    record = build_drive_registration_record(partner_id, item, now, record_id)
    result = await files_collection.update_one(
        drive_registration_key(partner_id, record),
        {"$setOnInsert": record},
        upsert=True,
    )
    outcome = "inserted" if result.upserted_id is not None else "existing"
    return outcome, record
