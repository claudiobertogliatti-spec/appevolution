"""
Ciak — Campagne email (statistiche per la pagina admin "Oggi").

Il backend NON può leggere da solo le statistiche delle campagne email: vivono
dietro la sessione Systeme.io dell'account evolutionpro (endpoint interni, non
esposti dalla API pubblica con la chiave). Soluzione: un task giornaliero gira
nel browser loggato su Systeme, legge le stats e le invia qui con
POST /api/admin/ciak/email-campaigns/snapshot. La pagina "Oggi" legge poi
GET /api/admin/ciak/email-campaigns. (Sessione CLAUDE.md 2026-06-27.)

Collection scritta/letta: email_campaign_stats (upsert per mailing_id).
"""
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ciak", tags=["ciak-email-campaigns"])
security = HTTPBearer(auto_error=False)

# Iniettato da server.py via set_db()
db = None


def set_db(database) -> None:
    global db
    db = database


async def require_ciak_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Stesso pattern di routers/ciak_admin.py — role admin/superadmin."""
    from auth import decode_token
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    data = decode_token(credentials.credentials)
    if not data or data.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return data


# Chiave condivisa per il POST snapshot: il task gira nel browser e NON è sempre
# loggato come admin Ciak, quindi la scrittura usa una chiave condivisa
# (env EMAIL_SNAPSHOT_KEY, con fallback) invece del JWT admin.
EMAIL_SNAPSHOT_KEY = os.environ.get("EMAIL_SNAPSHOT_KEY", "ciak-email-snapshot-2026")


class EmailCampaignIn(BaseModel):
    mailing_id: str
    subject: Optional[str] = None
    from_name: Optional[str] = None
    sent_at: Optional[str] = None          # ISO 8601 (scheduledAt / createdAt)
    sent: int = 0
    delivered: Optional[int] = None        # se assente: sent - bounced
    opened: int = 0
    clicked: int = 0
    bounced: int = 0
    spam: int = 0
    source: Optional[str] = "newsletter"   # "newsletter" | "campaign" | "extra"


class EmailCampaignSnapshotIn(BaseModel):
    campaigns: List[EmailCampaignIn] = Field(default_factory=list)


@router.post("/email-campaigns/snapshot", include_in_schema=False)
async def email_campaigns_snapshot(
    payload: EmailCampaignSnapshotIn,
    x_snapshot_key: Optional[str] = Header(None),
):
    """Upsert delle statistiche campagne email (una per mailing_id). Protetto da
    chiave condivisa (header X-Snapshot-Key), NON dal JWT admin: il chiamante è
    il task schedulato che gira nel browser."""
    if x_snapshot_key != EMAIL_SNAPSHOT_KEY:
        raise HTTPException(status_code=403, detail="Chiave snapshot non valida")
    if db is None:
        raise HTTPException(503, "Database non configurato")
    now = datetime.now(timezone.utc).isoformat()
    upserted = 0
    for c in payload.campaigns:
        delivered = c.delivered if c.delivered is not None else max(c.sent - c.bounced, 0)
        doc = {
            "mailing_id": str(c.mailing_id),
            "subject": c.subject,
            "from_name": c.from_name,
            "sent_at": c.sent_at,
            "sent": int(c.sent or 0),
            "delivered": int(delivered),
            "opened": int(c.opened or 0),
            "clicked": int(c.clicked or 0),
            "bounced": int(c.bounced or 0),
            "spam": int(c.spam or 0),
            "source": c.source or "newsletter",
            "updated_at": now,
        }
        await db.email_campaign_stats.update_one(
            {"mailing_id": str(c.mailing_id)},
            {"$set": doc, "$setOnInsert": {"first_seen_at": now}},
            upsert=True,
        )
        upserted += 1
    return {"ok": True, "upserted": upserted}


@router.get("/email-campaigns")
async def email_campaigns_list(
    admin=Depends(require_ciak_admin),
    limit: int = Query(10, ge=1, le=50),
):
    """Lista campagne email recenti (pagina "Oggi"), ordinate per data invio."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    items = []
    async for doc in db.email_campaign_stats.find({}).sort(
        [("sent_at", -1), ("updated_at", -1)]
    ).limit(limit):
        doc.pop("_id", None)
        items.append(doc)
    return {"items": items, "count": len(items)}
