"""
Partner Guided System — Evolution PRO
======================================
Partner-facing endpoints for the guided step-by-step experience.
Internal update endpoint for agents/admin/system completions.

Auth model:
- Partner-facing endpoints: Bearer JWT with role=partner
- Internal endpoint: requires INTERNAL_API_KEY header (or admin JWT)
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, timezone
import os
import logging

from auth import decode_token
from services.stefania_engine import StefaniaEngine, CANONICAL_PROGRESS, STATE_ORDER
from services.next_action_service import build_next_action, build_progress_summary
from services.agent_dispatcher import AGENT_PROFILES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/me", tags=["partner-guided"])
security = HTTPBearer(auto_error=False)

# Internal API key for agent/system/admin calls
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "evo-internal-2026")

db = None

def set_db(database):
    global db
    db = database


# ── Auth helpers ───────────────────────────────────────────────────────────────

async def _get_partner_from_jwt(credentials: HTTPAuthorizationCredentials) -> tuple[dict, dict]:
    """
    Decode JWT, look up user, look up partner record.
    Returns (user, partner). Raises 401/404 on failure.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")

    token_data = decode_token(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")

    if token_data.role not in ("partner", "admin"):
        raise HTTPException(status_code=403, detail="Accesso riservato ai partner")

    user = await db.users.find_one({"id": token_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    # Resolve partner_id: user.partner_id may be a string int ("1") or UUID
    partner_id = user.get("partner_id")
    partner = None

    if partner_id:
        partner = await db.partners.find_one(
            {"$or": [{"id": partner_id}, {"id": str(partner_id)}]},
            {"_id": 0}
        )

    # Fallback: match by email
    if not partner and user.get("email"):
        partner = await db.partners.find_one({"email": user["email"]}, {"_id": 0})

    if not partner:
        raise HTTPException(status_code=404, detail="Profilo partner non trovato")

    return user, partner


async def _get_or_evaluate(partner: dict) -> dict:
    """Get guided sub-doc, run Stefania evaluation, persist if new/changed."""
    old_guided = partner.get("guided")
    new_guided = StefaniaEngine.evaluate(partner)

    # Persist if guided was just initialized or changed
    if not old_guided or old_guided.get("current_step") != new_guided.get("current_step"):
        await db.partners.update_one(
            {"id": partner["id"]},
            {"$set": {"guided": new_guided}}
        )

    return new_guided


# ── Models ─────────────────────────────────────────────────────────────────────

class CompleteStepRequest(BaseModel):
    step_code: str
    payload: Optional[dict[str, Any]] = None  # extra data (e.g., {"total": 5})

class InternalUpdateRequest(BaseModel):
    step_code: str
    completed: bool = True
    agent: Optional[str] = None    # e.g. "andrea", "gaia", "admin"
    source: Optional[str] = None   # e.g. "agent:andrea", "webhook:stripe"
    note: Optional[str] = None
    payload: Optional[dict[str, Any]] = None

class SupportRequest(BaseModel):
    message: str
    urgency: Optional[str] = "normal"  # "normal" | "urgent"


# ── Partner-facing endpoints ───────────────────────────────────────────────────

@router.get("/status")
async def get_partner_status(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Full partner status: guided state, current step, assigned agent, completion %.
    Used on login / dashboard load.
    """
    user, partner = await _get_partner_from_jwt(credentials)
    guided = await _get_or_evaluate(partner)

    next_action = build_next_action(guided, partner_name=partner.get("name", ""))
    progress = build_progress_summary(guided)

    return {
        "partner_id": partner.get("id"),
        "partner_name": partner.get("name"),
        "current_state": guided["current_state"],
        "current_step": guided["current_step"],
        "assigned_agent": guided["assigned_agent"],
        "internal_coordinator": "STEFANIA",
        "completion_percentage": guided["completion_percentage"],
        "blocked_reason": guided.get("blocked_reason"),
        "state_updated_at": guided.get("state_updated_at"),
        "last_action_at": guided.get("last_action_at"),
        "next_action": next_action,
        "progress": progress,
    }


@router.get("/next-action")
async def get_next_action(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Returns exactly ONE next action for the partner.
    This is what the home screen displays.

    Response type:
      ACTIONABLE → partner has a concrete action to take
      WAITING    → internal review in progress, partner waits
      BLOCKED    → cannot proceed until condition is resolved
      COMPLETE   → entire journey done
    """
    user, partner = await _get_partner_from_jwt(credentials)
    guided = await _get_or_evaluate(partner)

    partner_name = partner.get("name", "").split()[0] if partner.get("name") else ""
    next_action = build_next_action(guided, partner_name=partner_name)

    return {
        "next_action": next_action,
        "completion_percentage": guided["completion_percentage"],
        "current_state": guided["current_state"],
    }


@router.get("/progress")
async def get_partner_progress(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Detailed progress across all states.
    Used by the Accademia section sidebar.
    Returns state list with done/current/locked status.
    """
    user, partner = await _get_partner_from_jwt(credentials)
    guided = await _get_or_evaluate(partner)

    progress = build_progress_summary(guided)

    # Include per-state step detail (for sidebar progressive unlock)
    current_state = guided["current_state"]
    current_idx = STATE_ORDER.index(current_state) if current_state in STATE_ORDER else 0

    state_details = []
    for i, state in enumerate(STATE_ORDER):
        status = "done" if i < current_idx else ("current" if i == current_idx else "locked")
        state_details.append({
            "state": state,
            "label": progress["states_ordered"][i]["label"],
            "status": status,
        })

    return {
        "summary": progress,
        "states": state_details,
        "completion_percentage": guided["completion_percentage"],
        "current_state": current_state,
        "current_step": guided["current_step"],
    }


@router.post("/complete-step")
async def complete_step(
    request: CompleteStepRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Partner marks an ACTIONABLE step as complete.
    Stefania re-evaluates → returns new next_action.

    Rules:
    - Only ACTIONABLE steps can be completed by the partner.
    - INTERNAL steps (WAITING) are rejected with a 400 — they must go through /internal/update-progress.
    - Returns updated next_action immediately.
    """
    from services.stefania_engine import STEP_TYPES

    user, partner = await _get_partner_from_jwt(credentials)
    guided = await _get_or_evaluate(partner)
    current_state = guided["current_state"]

    # Validate: partner can only complete ACTIONABLE steps
    state_types = STEP_TYPES.get(current_state, {})
    step_type = state_types.get(request.step_code, "ACTIONABLE")

    if step_type == "INTERNAL":
        raise HTTPException(
            status_code=400,
            detail=f"Lo step '{request.step_code}' è completato dal team, non direttamente da te."
        )

    # Run advance through engine
    updated_guided = StefaniaEngine.advance(
        partner={**partner, "guided": guided},
        step_code=request.step_code,
        payload=request.payload,
        source="partner"
    )

    # Persist
    await db.partners.update_one(
        {"id": partner["id"]},
        {"$set": {"guided": updated_guided}}
    )

    # Check for stall reset (partner is active again)
    if StefaniaEngine.detect_stall({**partner, "guided": guided}):
        await db.alerts.delete_many({"partner_id": partner["id"], "type": "stall"})

    partner_name = partner.get("name", "").split()[0] if partner.get("name") else ""
    next_action = build_next_action(updated_guided, partner_name=partner_name)

    return {
        "success": True,
        "completed_step": request.step_code,
        "new_state": updated_guided["current_state"],
        "new_step": updated_guided["current_step"],
        "completion_percentage": updated_guided["completion_percentage"],
        "next_action": next_action,
    }


@router.get("/kpis")
async def get_partner_kpis(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Partner KPIs. Only meaningful after LANCIO state.
    Returns empty placeholders before launch to avoid early anxiety.
    """
    user, partner = await _get_partner_from_jwt(credentials)
    guided = partner.get("guided", {})
    current_state = guided.get("current_state", "ONBOARDING")

    # States where KPIs are meaningful
    post_launch_states = {"POST_LAUNCH", "SCALING"}
    has_data = current_state in post_launch_states

    if not has_data:
        return {
            "available": False,
            "message": "I dati saranno disponibili dopo il lancio. Concentrati sul percorso.",
            "kpis": None,
        }

    # Fetch real KPI data from existing collections
    partner_id = partner.get("id")
    revenue = partner.get("revenue", 0)

    # Try to get lead/student counts from existing collections
    lead_count = 0
    try:
        lead_count = await db.leads.count_documents({"partner_id": partner_id})
    except Exception:
        pass

    sales_count = 0
    try:
        sales_count = await db.payments.count_documents({"partner_id": partner_id, "status": "completed"})
    except Exception:
        pass

    conversion = round((sales_count / lead_count * 100), 1) if lead_count > 0 else 0.0

    return {
        "available": True,
        "kpis": {
            "revenue": {"label": "Fatturato", "value": f"€{revenue:,.0f}", "raw": revenue},
            "leads": {"label": "Lead generati", "value": str(lead_count), "raw": lead_count},
            "sales": {"label": "Vendite", "value": str(sales_count), "raw": sales_count},
            "conversion": {"label": "Conversione", "value": f"{conversion}%", "raw": conversion},
        },
    }


@router.post("/request-support")
async def request_support(
    request: SupportRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Partner requests support. Creates an alert and notifies the assigned agent.
    The partner's assigned agent handles the response.
    """
    user, partner = await _get_partner_from_jwt(credentials)
    guided = partner.get("guided", {})
    assigned_agent = guided.get("assigned_agent", "VALENTINA")

    alert = {
        "id": f"support-{partner['id']}-{datetime.now(timezone.utc).timestamp():.0f}",
        "type": "support_request",
        "partner_id": partner.get("id"),
        "partner_name": partner.get("name"),
        "message": request.message,
        "urgency": request.urgency,
        "assigned_agent": assigned_agent,
        "current_state": guided.get("current_state"),
        "current_step": guided.get("current_step"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "resolved": False,
    }

    await db.alerts.insert_one({k: v for k, v in alert.items() if k != "_id"})

    return {
        "success": True,
        "message": f"La tua richiesta è stata inviata a {AGENT_PROFILES.get(assigned_agent, {}).get('name', assigned_agent)}. Ti risponderà al più presto.",
        "assigned_to": assigned_agent,
    }


# ── Internal/system update endpoint ───────────────────────────────────────────

@router.post("/internal/update-progress/{partner_id}",
             tags=["partner-guided-internal"])
async def internal_update_progress(
    partner_id: str,
    request: InternalUpdateRequest,
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Internal endpoint for system/agent/admin step completions.
    Accepts either:
      - X-Internal-Key: INTERNAL_API_KEY header (for Celery tasks, webhooks, agents)
      - Admin JWT token

    Examples of callers:
      - admin verifies identity → VERIFY_IDENTITY = true
      - Andrea approves video  → VIDEO_APPROVED = true
      - Gaia publishes funnel  → FUNNEL_BUILT = true
      - Stripe webhook         → PAYMENT_CONFIGURED = true, CHECKOUT_TEST_PASSED = true
      - System cron (7 days)   → FIRST_WEEK_DONE = true
    """
    # Auth: internal key OR admin JWT
    is_internal_key = x_internal_key == INTERNAL_API_KEY
    is_admin = False

    if not is_internal_key:
        if not credentials:
            raise HTTPException(status_code=401, detail="Autenticazione richiesta")
        token_data = decode_token(credentials.credentials)
        if not token_data or token_data.role != "admin":
            raise HTTPException(status_code=403, detail="Accesso riservato ad admin o sistema interno")
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

    # Persist
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
        f"[STEFANIA] Internal update: partner={partner_id} step={request.step_code} "
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
