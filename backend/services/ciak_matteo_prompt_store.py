"""
Ciak — Matteo prompt store.

Persistenza versionata del system prompt di Matteo (KB editor admin).
Una sola versione è "attiva" alla volta. Le precedenti restano leggibili.

Storage: collection MongoDB `ciak_matteo_prompts`.
Fallback: se nessuna versione attiva in DB, ritorna l'hardcoded `_SYSTEM_PROMPT`
del modulo `ciak_matteo` (zero-config first-boot).

Schema documento:
{
    id: str (uuid),
    label: str (es. "v1.5 — riduzione tono motivazionale"),
    content: str (il prompt completo),
    author_email: str,
    created_at: ISO,
    active: bool,
    parent_id: str | None  (versione da cui è stato clonato/modificato)
}
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Iniettato da server.py
db = None


def set_db(database) -> None:
    global db
    db = database


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


async def get_active_prompt() -> Optional[dict]:
    """Ritorna la versione attiva, o None se nessuna attiva in DB."""
    if db is None:
        return None
    doc = await db.ciak_matteo_prompts.find_one({"active": True})
    return _clean(doc)


async def get_active_content() -> Optional[str]:
    """Solo il contenuto della versione attiva, o None per fallback."""
    active = await get_active_prompt()
    return active["content"] if active else None


async def list_versions(limit: int = 50) -> list:
    """Tutte le versioni ordinate per data desc."""
    if db is None:
        return []
    items = []
    async for doc in db.ciak_matteo_prompts.find({}).sort("created_at", -1).limit(limit):
        items.append(_clean(doc))
    return items


async def get_version(version_id: str) -> Optional[dict]:
    if db is None:
        return None
    doc = await db.ciak_matteo_prompts.find_one({"id": version_id})
    return _clean(doc)


async def create_version(
    content: str,
    label: str,
    author_email: str,
    parent_id: Optional[str] = None,
    activate: bool = True,
) -> dict:
    """
    Crea una nuova versione. Se activate=True, la marca come attiva e
    disattiva la precedente. Idempotenza: NESSUNA (ogni POST = nuova versione).
    """
    if db is None:
        raise RuntimeError("DB non configurato")

    version_id = str(uuid.uuid4())
    doc = {
        "id": version_id,
        "label": label.strip()[:200],
        "content": content,
        "author_email": author_email,
        "created_at": _now_iso(),
        "active": activate,
        "parent_id": parent_id,
    }

    if activate:
        await db.ciak_matteo_prompts.update_many(
            {"active": True}, {"$set": {"active": False}}
        )

    await db.ciak_matteo_prompts.insert_one(doc)
    logger.info(
        "[MATTEO PROMPT] new version id=%s label=%s active=%s author=%s",
        version_id, label, activate, author_email,
    )
    return _clean(doc)


async def activate_version(version_id: str) -> Optional[dict]:
    """Riattiva una versione esistente (rollback)."""
    if db is None:
        return None
    target = await db.ciak_matteo_prompts.find_one({"id": version_id})
    if not target:
        return None

    await db.ciak_matteo_prompts.update_many(
        {"active": True}, {"$set": {"active": False}}
    )
    await db.ciak_matteo_prompts.update_one(
        {"id": version_id}, {"$set": {"active": True}}
    )
    return _clean(await db.ciak_matteo_prompts.find_one({"id": version_id}))
