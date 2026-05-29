"""
Ciak — Router admin per generazione/lettura analisi (Plan A: test isolato).
La UI di validazione/invio + il trigger webhook arrivano nel Plan B.

Auth: gli endpoint sono protetti da require_ciak_admin (role admin/superadmin),
stesso pattern di routers/ciak_admin.py. Necessario perché /genera triggera
chiamate LLM billabili (Anthropic + web search) ed è raggiungibile via il
rewrite pubblico Vercel /api/*.
"""
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from services import ciak_analisi
from services import ciak_analisi_prompt_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ciak/analisi", tags=["ciak-analisi-admin"])
security = HTTPBearer(auto_error=False)

db = None


def set_db(database) -> None:
    global db
    db = database
    ciak_analisi.set_db(database)
    ciak_analisi_prompt_store.set_db(database)


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


class DefinitivaUpdate(BaseModel):
    analisi_definitiva: dict
    script_call: dict | None = None


@router.get("/coda")
async def coda_da_validare(admin=Depends(require_ciak_admin)):
    """Analisi paganti in attesa di validazione (stato da_validare)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    cur = db.ciak_analisi.find({"stato": "da_validare"}, {"_id": 0}).sort("generated_at", 1)
    items = await cur.to_list(200)
    return {"items": items, "count": len(items)}


@router.get("/{session_token}")
async def get_analisi(session_token: str, admin=Depends(require_ciak_admin)):
    """Recupera l'analisi salvata (per admin / debug)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    doc = await db.ciak_analisi.find_one({"session_token": session_token}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Analisi non trovata")
    return doc


# ─── Prompt-store admin endpoints ────────────────────────────────────────────

class AnalisiPromptCreate(BaseModel):
    label: str
    content: str
    parent_id: str | None = None
    activate: bool = True


@router.get("/prompt/{key}")
async def get_prompt(key: str, admin=Depends(require_ciak_admin)):
    if key not in ciak_analisi_prompt_store.VALID_KEYS:
        raise HTTPException(400, f"key non valida: {key}")
    from services import ciak_analisi
    active = await ciak_analisi_prompt_store.get_active_prompt(key)
    versions = await ciak_analisi_prompt_store.list_versions(key)
    for v in versions:
        v.pop("_id", None)
    if active:
        active.pop("_id", None)
    return {
        "key": key,
        "active": active,
        "fallback_hardcoded": ciak_analisi._PROMPT_FALLBACK[key],
        "versions": versions,
    }


@router.post("/prompt/{key}")
async def create_prompt(key: str, body: AnalisiPromptCreate, admin=Depends(require_ciak_admin)):
    if key not in ciak_analisi_prompt_store.VALID_KEYS:
        raise HTTPException(400, f"key non valida: {key}")
    return await ciak_analisi_prompt_store.create_version(
        key=key, content=body.content, label=body.label,
        author_email=getattr(admin, "email", "admin"),
        parent_id=body.parent_id, activate=body.activate,
    )


@router.post("/prompt/{key}/{version_id}/activate")
async def activate_prompt(key: str, version_id: str, admin=Depends(require_ciak_admin)):
    res = await ciak_analisi_prompt_store.activate_version(version_id)
    if not res:
        raise HTTPException(404, "Versione non trovata")
    return res


@router.put("/{session_token}")
async def salva_definitiva(session_token: str, body: DefinitivaUpdate,
                           admin=Depends(require_ciak_admin)):
    """Salva gli edit di Claudio sui 6 capitoli (e opzionalmente lo script call)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    update = {"analisi_definitiva": body.analisi_definitiva,
              "edited_at": datetime.now(timezone.utc).isoformat()}
    if body.script_call is not None:
        update["script_call"] = body.script_call
    res = await db.ciak_analisi.update_one({"session_token": session_token}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Analisi non trovata")
    return {"success": True}


@router.post("/{session_token}/valida-invia")
async def valida_e_invia(session_token: str, admin=Depends(require_ciak_admin)):
    """Sblocca la definitiva (stato inviata), invia il link al cliente, emette evento Systeme."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    doc = await db.ciak_analisi.find_one({"session_token": session_token})
    if not doc:
        raise HTTPException(404, "Analisi non trovata")

    await db.ciak_analisi.update_one(
        {"session_token": session_token},
        {"$set": {"stato": "inviata", "inviata_at": datetime.now(timezone.utc).isoformat()}},
    )

    base = os.environ.get("CIAK_BASE_URL", "https://ciak.io")
    link = f"{base}/analisi/{session_token}"
    email = doc.get("email")
    nome = doc.get("nome") or (email.split("@")[0] if email else "")

    from services.ciak_analisi_delivery import _send_email_link
    ok, err = _send_email_link(
        to=email, nome=nome,
        subject="La tua analisi strategica Ciak è pronta",
        link=link,
    ) if email else (False, "email mancante")

    try:
        import asyncio
        from services.ciak_systeme import ciak_emit_event
        if email:
            asyncio.create_task(ciak_emit_event(
                email=email, event_name="ciak_analisi_pronta",
                first_name=nome, metadata={"analisi_url": link},
            ))
    except Exception as e:
        logger.warning("[CIAK_ANALISI] emit Systeme ko: %s", e)

    return {"success": True, "link": link, "email_sent": ok, "email_error": err}
