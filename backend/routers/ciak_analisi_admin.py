"""
Ciak — Router admin per generazione/lettura analisi (Plan A: test isolato).
La UI di validazione/invio + il trigger webhook arrivano nel Plan B.
"""
import logging
from fastapi import APIRouter, HTTPException

from services import ciak_analisi

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ciak/analisi", tags=["ciak-analisi-admin"])

db = None


def set_db(database) -> None:
    global db
    db = database
    ciak_analisi.set_db(database)


@router.post("/genera/{session_token}")
async def genera(session_token: str, force: bool = False):
    """Genera (o rigenera con force) i 3 artefatti per una diagnostic_session."""
    try:
        return await ciak_analisi.genera_e_salva(session_token, force=force)
    except ciak_analisi.CiakAnalisiError as e:
        raise HTTPException(503, f"Generazione fallita: {e}")


@router.get("/{session_token}")
async def get_analisi(session_token: str):
    """Recupera l'analisi salvata (per admin / debug)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    doc = await db.ciak_analisi.find_one({"session_token": session_token}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Analisi non trovata")
    return doc
