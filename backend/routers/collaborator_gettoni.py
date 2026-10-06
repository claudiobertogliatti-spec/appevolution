"""Gettoni di Mariangela nel Back office → Collaboratori."""

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from routers.collaborator_settlements import require_billing_admin
from services.collaborator_gettoni import COLLABORATOR_ID, build_gettoni, month_bounds_ok

router = APIRouter(prefix="/api/admin/ciak/collaboratori/mariangela", tags=["collaborator-gettoni"])
db = None


def set_db(database):
    global db
    db = database


class Attribution(BaseModel):
    email: str = Field(min_length=3)
    nota: str = ""


def _email(value) -> str:
    return (value or "").strip().lower()


def _actor(admin):
    return getattr(admin, "email", None) or getattr(admin, "user_id", None) or "admin"


@router.get("/gettoni")
async def gettoni(month: str = Query(default=None), admin=Depends(require_billing_admin)):
    month = month or datetime.now(timezone.utc).strftime("%Y-%m")
    if not month_bounds_ok(month):
        raise HTTPException(422, "Mese non valido (YYYY-MM)")
    manual = {
        _email(a.get("email"))
        async for a in db.collaborator_attributions.find({"collaborator_id": COLLABORATOR_ID}, {"_id": 0})
    }
    diagnostics = [d async for d in db.diagnostic_sessions.find({}, {"_id": 0}).sort("created_at", -1)]
    seen, latest = set(), []
    for d in diagnostics:  # una sola sessione per lead: la più recente
        em = _email(d.get("user_email"))
        if em and em not in seen:
            seen.add(em)
            latest.append(d)
    clients = {
        _email(c.get("email")): c
        async for c in db.ciak_clients.find({}, {"_id": 0, "email": 1, "start_purchased_at": 1, "partnership_purchased_at": 1})
    }
    data = build_gettoni(month, latest, clients, manual)
    data["attributions_manual"] = sorted(manual)
    return data


@router.post("/attribuzioni", status_code=201)
async def add_attribution(req: Attribution, admin=Depends(require_billing_admin)):
    email = _email(req.email)
    if not await db.diagnostic_sessions.find_one({"user_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}):
        raise HTTPException(404, "Nessun lead con questa email")
    await db.collaborator_attributions.update_one(
        {"collaborator_id": COLLABORATOR_ID, "email": email},
        {"$set": {"nota": req.nota, "created_by": _actor(admin), "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "email": email}


@router.delete("/attribuzioni/{email}")
async def remove_attribution(email: str, admin=Depends(require_billing_admin)):
    res = await db.collaborator_attributions.delete_one({"collaborator_id": COLLABORATOR_ID, "email": _email(email)})
    return {"ok": True, "removed": res.deleted_count}
