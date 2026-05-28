"""
Ciak — Router admin per generazione/lettura analisi (Plan A: test isolato).
La UI di validazione/invio + il trigger webhook arrivano nel Plan B.

Auth: gli endpoint sono protetti da require_ciak_admin (role admin/superadmin),
stesso pattern di routers/ciak_admin.py. Necessario perché /genera triggera
chiamate LLM billabili (Anthropic + web search) ed è raggiungibile via il
rewrite pubblico Vercel /api/*.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services import ciak_analisi

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ciak/analisi", tags=["ciak-analisi-admin"])
security = HTTPBearer(auto_error=False)

db = None


def set_db(database) -> None:
    global db
    db = database
    ciak_analisi.set_db(database)


async def require_ciak_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Identico pattern a routers/ciak_admin.py — role admin/superadmin."""
    from auth import decode_token
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    data = decode_token(credentials.credentials)
    if not data or data.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return data


@router.post("/genera/{session_token}")
async def genera(session_token: str, force: bool = False, admin=Depends(require_ciak_admin)):
    """Genera (o rigenera con force) i 3 artefatti per una diagnostic_session."""
    try:
        return await ciak_analisi.genera_e_salva(session_token, force=force)
    except ciak_analisi.CiakAnalisiError as e:
        raise HTTPException(503, f"Generazione fallita: {e}")


@router.get("/{session_token}")
async def get_analisi(session_token: str, admin=Depends(require_ciak_admin)):
    """Recupera l'analisi salvata (per admin / debug)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    doc = await db.ciak_analisi.find_one({"session_token": session_token}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Analisi non trovata")
    return doc
