"""Registro operativo dei task: lista, dettaglio e azioni di recupero controllate (T08).

Ogni azione richiede admin autenticato, controlla la concorrenza (agisce solo se lo
stato è ancora quello letto) e lascia una traccia nella timeline. Un task con effetto
esterno incerto non si può ritentare: prima si riconcilia (T07).
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from services.operational_tasks import events as ev

router = APIRouter(prefix="/api/operational-tasks", tags=["operational-tasks"])
security = HTTPBearer(auto_error=False)

db = None


def set_db(database):
    global db
    db = database


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from auth import decode_token
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    data = decode_token(credentials.credentials)
    if not data or data.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return data


def _actor(admin) -> str:
    return admin.email or admin.user_id


class ActionRequest(BaseModel):
    reason: Optional[str] = None


class AssignRequest(BaseModel):
    owner_id: str
    reason: Optional[str] = None


@router.get("")
async def list_operational_tasks(
    department: Optional[str] = None,
    status: Optional[str] = None,
    owner: Optional[str] = None,
    due_before: Optional[str] = None,
    limit: int = 100,
    _admin=Depends(require_admin),
):
    """Lista con filtri reparto/stato/owner/scadenza (solo admin)."""
    query: dict = {}
    if department:
        query["department_id"] = department
    if status:
        query["status"] = status
    if owner:
        query["next_action.owner_id"] = owner
    if due_before:
        query["due_at"] = {"$lte": due_before}
    tasks = await db.agent_tasks.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"tasks": tasks, "count": len(tasks)}


@router.get("/{task_id}")
async def operational_task_detail(task_id: str, _admin=Depends(require_admin)):
    """Dettaglio con timeline eventi ed escalation aperta (solo admin)."""
    task = await db.agent_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
    escalation = await db.agent_task_escalations.find_one(
        {"task_id": task_id, "resolved": False}, {"_id": 0}
    )
    return {
        "task": task,
        "timeline": await ev.timeline(db.agent_task_events, task_id),
        "escalation": escalation,
    }


@router.post("/{task_id}/retry")
async def retry_operational_task(task_id: str, request: ActionRequest, _admin=Depends(require_admin)):
    """Ritenta un task recuperabile. Vietato se l'effetto è incerto (riconciliare prima)."""
    task = await db.agent_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
    ok, reason = ev.can_admin_retry(task)
    if not ok:
        raise HTTPException(status_code=409, detail=reason)
    # Controllo concorrenza: agisci solo se lo stato è ancora quello letto.
    res = await db.agent_tasks.update_one(
        {"id": task_id, "status": task.get("status")},
        {"$set": {"status": "pending"}, "$unset": {"lease": "", "error_code": "", "retry_at": ""}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=409, detail="Stato cambiato nel frattempo: ricarica")
    await ev.append_event(db.agent_task_events, task_id, "retry", actor=_actor(_admin),
                          detail={"reason": request.reason})
    return {"success": True, "task_id": task_id, "status": "pending"}


@router.post("/{task_id}/reconcile")
async def reconcile_operational_task(task_id: str, request: ActionRequest, _admin=Depends(require_admin)):
    """Marca il task per riconciliazione dell'effetto (cerca l'operazione remota)."""
    res = await db.agent_tasks.update_one({"id": task_id}, {"$set": {"reconcile_requested": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task non trovato")
    await ev.append_event(db.agent_task_events, task_id, "reconcile", actor=_actor(_admin),
                          detail={"reason": request.reason})
    return {"success": True, "task_id": task_id}


@router.post("/{task_id}/assign")
async def assign_operational_task(task_id: str, request: AssignRequest, _admin=Depends(require_admin)):
    """Assegna l'owner del prossimo passo."""
    res = await db.agent_tasks.update_one(
        {"id": task_id}, {"$set": {"next_action.owner_id": request.owner_id}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task non trovato")
    await ev.append_event(db.agent_task_events, task_id, "assign", actor=_actor(_admin),
                          detail={"owner_id": request.owner_id, "reason": request.reason})
    return {"success": True, "task_id": task_id, "owner_id": request.owner_id}


@router.post("/{task_id}/cancel")
async def cancel_operational_task(task_id: str, request: ActionRequest, _admin=Depends(require_admin)):
    """Annulla un task non ancora terminale."""
    task = await db.agent_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
    if task.get("status") in ("completed", "cancelled"):
        raise HTTPException(status_code=409, detail=f"non annullabile: {task.get('status')}")
    await db.agent_tasks.update_one({"id": task_id}, {"$set": {"status": "cancelled"}})
    await ev.append_event(db.agent_task_events, task_id, "cancel", actor=_actor(_admin),
                          detail={"reason": request.reason})
    return {"success": True, "task_id": task_id, "status": "cancelled"}
