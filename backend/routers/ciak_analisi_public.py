"""
Endpoint PUBBLICO della definitiva (Plan B). Nessuna auth (token = capability).
Espone la definitiva SOLO se stato == "inviata" (sbloccata da Claudio post-call).
Non espone mai lo script_call (interno vendita).
"""
import logging
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ciak/analisi", tags=["ciak-analisi-public"])

db = None


def set_db(database) -> None:
    global db
    db = database


@router.get("/{token}")
async def get_analisi_pubblica(token: str):
    if db is None:
        raise HTTPException(503, "Database non configurato")
    doc = await db.ciak_analisi.find_one({"session_token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Analisi non trovata")
    if doc.get("stato") != "inviata":
        raise HTTPException(409, "Analisi non ancora disponibile")
    return {
        "session_token": token,
        "titolo": (doc.get("analisi_definitiva") or {}).get("titolo"),
        "analisi_definitiva": doc.get("analisi_definitiva"),
        "research_data": doc.get("research_data"),
        "nome": (doc.get("nome") or doc.get("email", "").split("@")[0]),
    }
