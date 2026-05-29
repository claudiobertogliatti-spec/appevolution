"""
Prompt-store versionato per il motore analisi (Plan B).
Gemello di ciak_matteo_prompt_store, ma KEYED: 4 prompt indipendenti
(research | definitiva | bozza | script_call). Una sola versione attiva per chiave.

Doc collection `ciak_analisi_prompts`:
  {id, key, label, content, author_email, created_at, active, parent_id}
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

VALID_KEYS = ("research", "definitiva", "bozza", "script_call")

db = None


def set_db(database) -> None:
    global db
    db = database


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_active_prompt(key: str) -> Optional[dict]:
    if db is None:
        return None
    return await db.ciak_analisi_prompts.find_one({"key": key, "active": True})


async def get_active_content(key: str) -> Optional[str]:
    doc = await get_active_prompt(key)
    return doc.get("content") if doc else None


async def list_versions(key: str, limit: int = 50) -> list:
    if db is None:
        return []
    cur = db.ciak_analisi_prompts.find({"key": key}).sort("created_at", -1).limit(limit)
    return await cur.to_list(limit)


async def create_version(key: str, content: str, label: str, author_email: str,
                         parent_id: Optional[str] = None, activate: bool = True) -> dict:
    if key not in VALID_KEYS:
        raise ValueError(f"key non valida: {key}")
    if db is None:
        raise RuntimeError("Database non configurato")
    doc = {
        "id": str(uuid4()),
        "key": key,
        "label": label,
        "content": content,
        "author_email": author_email,
        "created_at": _now_iso(),
        "active": activate,
        "parent_id": parent_id,
    }
    if activate:
        await db.ciak_analisi_prompts.update_many(
            {"key": key, "active": True}, {"$set": {"active": False}}
        )
    await db.ciak_analisi_prompts.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def activate_version(version_id: str) -> Optional[dict]:
    if db is None:
        return None
    target = await db.ciak_analisi_prompts.find_one({"id": version_id})
    if not target:
        return None
    await db.ciak_analisi_prompts.update_many(
        {"key": target["key"], "active": True}, {"$set": {"active": False}}
    )
    await db.ciak_analisi_prompts.update_one(
        {"id": version_id}, {"$set": {"active": True}}
    )
    target["active"] = True
    target.pop("_id", None)
    return target
