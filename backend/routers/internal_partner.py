"""
Internal Partner Endpoints — Evolution PRO
==========================================
System/agent/admin endpoints for updating partner guided progress.
These are NOT partner-facing. Partners never call these directly.

Auth: X-Internal-Key header (server-to-server) OR admin JWT.
INTERNAL_API_KEY must be set via environment variable — no default.
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, timezone
import os
import logging

from auth import decode_token
from services.stefania_engine import StefaniaEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/internal", tags=["internal"])
security = HTTPBearer(auto_error=False)

# Must be set in environment. No default — fail at call time if missing.
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY")


class InternalUpdateRequest(BaseModel):
    step_code: str
    completed: bool = True
    agent: Optional[str] = None     # e.g. "andrea", "gaia", "admin"
    source: Optional[str] = None    # e.g. "agent:andrea", "webhook:stripe"
    note: Optional[str] = None
    payload: Optional[dict[str, Any]] = None


db = None

def set_db(database):
    global db
    db = database


@router.post("/partner/{partner_id}/update-progress")
async def internal_update_progress(
    partner_id: str,
    request: InternalUpdateRequest,
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Internal endpoint for system/agent/admin step completions.

    Accepts either:
      - X-Internal-Key: value of INTERNAL_API_KEY env var
        Used by: Celery tasks, Stripe webhooks, agent automations
      - Admin JWT (role=admin)
        Used by: admin dashboard manual overrides

    Examples:
      - Admin verifies identity        → step_code=VERIFY_IDENTITY
      - Andrea approves video          → step_code=VIDEO_APPROVED, agent=andrea
      - Gaia publishes funnel          → step_code=FUNNEL_BUILT, agent=gaia
      - Stripe webhook                 → step_code=FIRST_SALE, source=webhook:stripe
      - System cron (7 days post-live) → step_code=FIRST_WEEK_DONE, source=system
    """
    # Validate INTERNAL_API_KEY is configured
    if not INTERNAL_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="INTERNAL_API_KEY non configurata sul server. Contattare l'amministratore di sistema."
        )

    # Auth: internal key OR admin JWT
    is_internal_key = x_internal_key == INTERNAL_API_KEY
    is_admin = False

    if not is_internal_key:
        if not credentials:
            raise HTTPException(status_code=401, detail="Autenticazione richiesta")
        token_data = decode_token(credentials.credentials)
        if not token_data or token_data.role != "admin":
            raise HTTPException(
                status_code=403,
                detail="Accesso riservato ad admin o sistema interno"
            )
        is_admin = True

    # Load partner
    partner = await db.partners.find_one(
        {"$or": [{"id": partner_id}, {"id": str(partner_id)}]},
        {"_id": 0}
    )
    if not partner:
        raise HTTPException(status_code=404, detail=f"Partner {partner_id} non trovato")

    guided = StefaniaEngine.evaluate(partner)
    source = request.source or ("admin" if is_admin else "system")

    updated_guided = StefaniaEngine.advance(
        partner={**partner, "guided": guided},
        step_code=request.step_code,
        payload=request.payload,
        source=source
    )

    # Persist guided + audit trail
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "guided": updated_guided,
            f"guided_audit.{request.step_code}": {
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "source": source,
                "agent": request.agent,
                "note": request.note,
            }
        }}
    )

    logger.info(
        f"[INTERNAL] partner={partner_id} step={request.step_code} "
        f"source={source} new_state={updated_guided['current_state']}"
    )

    return {
        "success": True,
        "partner_id": partner_id,
        "completed_step": request.step_code,
        "source": source,
        "new_state": updated_guided["current_state"],
        "new_step": updated_guided["current_step"],
        "completion_percentage": updated_guided["completion_percentage"],
    }
