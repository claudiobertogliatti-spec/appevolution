"""
Ciak Social — motore di pubblicazione server-side (coda `ciak_social_queue`).

Endpoint interni chiamati da APScheduler (`backend/scheduler.py`) lun/mer/ven:
pubblicano i post GIA' APPROVATI in coda su Instagram e ne salvano il permalink.
Vedi `services/social_publisher.py` per il perche' e la ricetta validata.

Auth: `require_admin_or_report_key` — lo scheduler passa `X-Report-Key` (stessa
chiave del briefing di Luca), un admin loggato passa il JWT. Fail-closed.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from report_key_auth import require_admin_or_report_key
from services.social_publisher import (
    pubblica_coda_social,
    is_meta_publish_configured,
    COLLECTION,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ciak/social", tags=["ciak-social"])

db = None


def set_db(database) -> None:
    global db
    db = database


@router.post("/publish-due")
async def publish_due(admin=Depends(require_admin_or_report_key)):
    """Pubblica i post in coda scaduti (chiamato dallo scheduler mer/ven/lun)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    return await pubblica_coda_social(db)


@router.get("/queue")
async def queue_status(admin=Depends(require_admin_or_report_key)):
    """
    Stato della coda in forma aggregata — per il collaudo e per Luca.
    Nessun contenuto sensibile: solo conteggi per stato + i prossimi in uscita.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    per_stato = {}
    for stato in ("pending", "published", "failed", "skipped"):
        per_stato[stato] = await db[COLLECTION].count_documents({"status": stato})

    prossimi = await db[COLLECTION].find(
        {"status": "pending"}, {"_id": 0, "post_id": 1, "scheduled_date": 1, "type": 1}
    ).sort("scheduled_date", 1).limit(5).to_list(length=5)

    ultimo = await db[COLLECTION].find_one(
        {"status": "published"}, {"_id": 0, "post_id": 1, "permalink": 1, "published_at": 1},
        sort=[("published_at", -1)],
    )

    return {
        "configurato": is_meta_publish_configured(),
        "per_stato": per_stato,
        "prossimi_in_uscita": prossimi,
        "ultimo_pubblicato": ultimo,
    }
