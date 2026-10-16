"""
Redirect pubblico dei link tracciati dei contenuti social: `/api/ciak/go/{codice}`.

Reindirizza SOLO a una destinazione salvata all'approvazione del piano (mai a un indirizzo preso
dalla richiesta: nessun open redirect). Registra il clic; i robot riconoscibili si contano a parte.
Nessun dato personale: niente IP, niente cookie.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from services import ciak_piano_social as ps

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ciak", tags=["ciak-go"])

db = None


def set_db(database) -> None:
    global db
    db = database


@router.get("/go/{codice}")
async def vai(codice: str, request: Request):
    if db is None or not (4 <= len(codice) <= 20):
        raise HTTPException(404, "Link non trovato")
    link = await db.ciak_link_tracciati.find_one({"codice": codice}, {"_id": 0})
    if not link or not link.get("target"):
        raise HTTPException(404, "Link non trovato")
    try:
        await db.ciak_link_clic.insert_one({
            "codice": codice, "robot": ps.e_robot(request.headers.get("user-agent")),
            "ts": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:  # noqa: BLE001  il clic non registrato non deve bloccare chi clicca
        logger.warning("[GO] clic non registrato: %s", e)
    return RedirectResponse(link["target"], status_code=302)
