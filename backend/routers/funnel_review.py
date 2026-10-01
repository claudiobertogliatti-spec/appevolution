"""Revisione del funnel da parte del partner (step F-13 "Il tuo funnel").

Azioni del partner, tutte a un clic o due campi brevi:
  GET  /{partner_id}                 stato mostrato nella schermata
  POST /{partner_id}/approve         "Va bene" su una pagina (o sui dati legali)
  POST /{partner_id}/correction      "C'è un dato sbagliato": cosa è sbagliato + come dovrebbe essere
  POST /{partner_id}/golive          via libera finale (solo con tutto approvato e team pronto)

Azioni del team (solo admin):
  POST /{partner_id}/admin/set          rilascio anteprima, collegamenti, team pronto
  POST /{partner_id}/admin/new-version  nuova versione: decadono solo le pagine toccate

La logica sta in services/funnel_review.py (pura e testata).
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from services import funnel_review as fr
from services import legal_documents as legal_docs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-journey/funnel-review", tags=["funnel-review"])
security = HTTPBearer(auto_error=False)
db = None


def set_db(database):
    global db
    db = database


class ApproveBody(BaseModel):
    page_id: str


class CorrectionBody(BaseModel):
    page_id: str
    wrong: str
    right: str


class AdminSetBody(BaseModel):
    preview_released: Optional[bool] = None
    documents_released: Optional[bool] = None
    team_ready: Optional[bool] = None
    preview_url: Optional[str] = None
    preview_version: Optional[int] = None
    connections: Optional[Dict[str, bool]] = None


class NewVersionBody(BaseModel):
    version: int
    pages: Optional[List[str]] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _authorize(partner_id: str, credentials):
    from routers.partner_journey import require_partner_or_admin_for_partner
    return await require_partner_or_admin_for_partner(partner_id, credentials)


def _is_admin(token_data) -> bool:
    return getattr(token_data, "role", None) in ("admin", "superadmin")


async def _record(partner_id: str) -> Dict[str, Any]:
    return await db.partner_funnel.find_one({"partner_id": str(partner_id)}, {"_id": 0}) or {}


async def _state(partner_id: str) -> Dict[str, Any]:
    rec = await _record(partner_id)
    partner = await db.partners.find_one({"id": str(partner_id)}, {"_id": 0, "name": 1, "email": 1, "dati_burocrazia": 1}) or {}
    return fr.review_state(rec, fr.legal_data_from_partner(partner))


async def _notify(text: str) -> None:
    try:
        from routers.partner_journey import notify_telegram
        await notify_telegram(text)
    except Exception as e:  # la notifica non deve mai bloccare l'azione del partner
        logger.warning(f"[funnel-review] notifica non inviata: {e}")


def _fail(e: fr.ReviewError):
    raise HTTPException(status_code=400, detail=str(e))


@router.get("/{partner_id}")
async def get_review(partner_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    await _authorize(partner_id, credentials)
    return {"success": True, **(await _state(partner_id))}


@router.get("/{partner_id}/documents")
async def get_documents(partner_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Privacy, cookie e condizioni di vendita scritte con i dati del partner, da leggere e approvare.
    Visibili solo dopo che il team li ha rilasciati."""
    await _authorize(partner_id, credentials)
    rec = await _record(partner_id)
    if not fr.docs_released(rec):
        raise HTTPException(status_code=400, detail="I documenti non sono ancora pronti da leggere.")
    partner = await db.partners.find_one({"id": str(partner_id)}, {"_id": 0, "name": 1, "corso_titolo": 1}) or {}
    stamp = str(rec.get("documents_released_at") or "")[:10]
    try:
        updated = datetime.strptime(stamp, "%Y-%m-%d").strftime("%d/%m/%Y")
        docs = legal_docs.render_documents(partner.get("name", ""), partner.get("corso_titolo", ""), updated)
    except ValueError as e:  # data mancante o dato obbligatorio assente: messaggio chiaro, mai documenti con vuoti
        raise HTTPException(status_code=400, detail=f"Documenti non generabili: {e}")
    return {"success": True, "documents": [{"id": k, **v} for k, v in docs.items()]}


@router.post("/{partner_id}/approve")
async def approve(partner_id: str, body: ApproveBody,
                  credentials: HTTPAuthorizationCredentials = Depends(security)):
    await _authorize(partner_id, credentials)
    rec = await _record(partner_id)
    try:
        update = fr.approve_update(rec, body.page_id, _now())
    except fr.ReviewError as e:
        _fail(e)
    await db.partner_funnel.update_one({"partner_id": str(partner_id)}, update, upsert=True)
    return {"success": True, **(await _state(partner_id))}


@router.post("/{partner_id}/correction")
async def correction(partner_id: str, body: CorrectionBody,
                     credentials: HTTPAuthorizationCredentials = Depends(security)):
    await _authorize(partner_id, credentials)
    rec = await _record(partner_id)
    try:
        update, entry = fr.correction_update(rec, body.page_id, body.wrong, body.right, _now())
    except fr.ReviewError as e:
        _fail(e)
    await db.partner_funnel.update_one({"partner_id": str(partner_id)}, update, upsert=True)
    partner = await db.partners.find_one({"id": str(partner_id)}, {"_id": 0, "name": 1}) or {}
    await _notify(
        f"✏️ FUNNEL: DATO DA CORREGGERE\n\n👤 {partner.get('name', partner_id)}\n"
        f"📄 Pagina: {entry['page']} (versione {entry['version']})\n"
        f"❌ Sbagliato: {entry['wrong']}\n✅ Giusto: {entry['right']}"
    )
    return {"success": True, **(await _state(partner_id))}


@router.post("/{partner_id}/golive")
async def golive(partner_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    await _authorize(partner_id, credentials)
    rec = await _record(partner_id)
    try:
        update = fr.golive_update(rec, _now())
    except fr.ReviewError as e:
        _fail(e)
    await db.partner_funnel.update_one({"partner_id": str(partner_id)}, update, upsert=True)
    partner = await db.partners.find_one({"id": str(partner_id)}, {"_id": 0, "name": 1}) or {}
    await _notify(f"🚀 FUNNEL: VIA LIBERA DEL PARTNER\n\n👤 {partner.get('name', partner_id)}\n"
                  "Il partner ha approvato tutto: si può mettere online.")
    return {"success": True, **(await _state(partner_id))}


@router.post("/{partner_id}/admin/set")
async def admin_set(partner_id: str, body: AdminSetBody,
                    credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = await _authorize(partner_id, credentials)
    if not _is_admin(token):
        raise HTTPException(status_code=403, detail="Solo il team può farlo.")
    rec = await _record(partner_id)
    payload = body.model_dump(exclude_none=True)
    try:
        update = fr.admin_set_update(rec, payload, _now())
    except fr.ReviewError as e:
        _fail(e)
    await db.partner_funnel.update_one(
        {"partner_id": str(partner_id)},
        {**update, "$setOnInsert": {"partner_id": str(partner_id), "created_at": _now()}},
        upsert=True,
    )
    return {"success": True, **(await _state(partner_id))}


@router.post("/{partner_id}/admin/new-version")
async def admin_new_version(partner_id: str, body: NewVersionBody,
                            credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = await _authorize(partner_id, credentials)
    if not _is_admin(token):
        raise HTTPException(status_code=403, detail="Solo il team può farlo.")
    rec = await _record(partner_id)
    try:
        update = fr.new_version_update(rec, body.version, body.pages, _now())
    except fr.ReviewError as e:
        _fail(e)
    await db.partner_funnel.update_one({"partner_id": str(partner_id)}, update, upsert=True)
    return {"success": True, **(await _state(partner_id))}
