"""
Agent Task System for Evolution PRO
Orchestrated by STEFANIA - handles escalation and monitoring of AI agent tasks.

Flow:
1. GAIA/VALENTINA/other agents detect issues → create task in db.agent_tasks
2. STEFANIA daily check → reviews open tasks → notifies via Telegram with priority
3. If task > 48h open → escalates to Claudio with urgency
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TaskStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_HUMAN = "waiting_human"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


class TaskType(str, Enum):
    LEAD_BLOCKED = "lead_blocked"           # GAIA: lead non risponde/bloccato
    PARTNER_INACTIVE = "partner_inactive"   # Partner fermo da troppo tempo
    PIPELINE_FAILED = "pipeline_failed"     # Video pipeline fallita
    PAYMENT_ISSUE = "payment_issue"         # Problema pagamento
    ONBOARDING_STUCK = "onboarding_stuck"   # Onboarding bloccato
    CONTENT_REVIEW = "content_review"       # Contenuto da revisionare
    SYSTEM_ERROR = "system_error"           # Errore di sistema
    CUSTOM = "custom"                       # Task personalizzato


class AgentTask(BaseModel):
    task_id: str
    task_type: TaskType
    priority: TaskPriority
    status: TaskStatus
    
    # Who created and who owns
    created_by_agent: str  # gaia, valentina, marco, andrea, system
    assigned_to: str = "stefania"  # Default: Stefania monitors
    
    # What and who it's about
    title: str
    description: str
    entity_type: Optional[str] = None  # lead, partner, client, pipeline
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    
    # Context data
    context: Dict[str, Any] = {}
    
    # Resolution
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    
    # Timestamps
    created_at: str
    updated_at: str
    due_date: Optional[str] = None
    resolved_at: Optional[str] = None
    escalated_at: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# TASK CREATION FUNCTIONS (called by other agents)
# ═══════════════════════════════════════════════════════════════════════════════

async def create_agent_task(
    db,
    task_type: TaskType,
    title: str,
    description: str,
    created_by_agent: str,
    priority: TaskPriority = TaskPriority.MEDIUM,
    entity_type: str = None,
    entity_id: str = None,
    entity_name: str = None,
    context: Dict[str, Any] = None,
    due_date: datetime = None
) -> str:
    """
    Create a new agent task for Stefania to monitor.
    Returns task_id.
    """
    import uuid
    
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    task = {
        "task_id": task_id,
        "task_type": task_type.value,
        "priority": priority.value,
        "status": TaskStatus.OPEN.value,
        "created_by_agent": created_by_agent,
        "assigned_to": "stefania",
        "title": title,
        "description": description,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "context": context or {},
        "resolution_notes": None,
        "resolved_by": None,
        "created_at": now,
        "updated_at": now,
        "due_date": due_date.isoformat() if due_date else None,
        "resolved_at": None,
        "escalated_at": None
    }
    
    await db.agent_tasks.insert_one(task)
    
    logger.info(f"[AGENT_TASK] Created task {task_id}: {title} (by {created_by_agent}, priority: {priority.value})")
    
    # If critical, notify immediately
    if priority == TaskPriority.CRITICAL:
        await notify_critical_task(db, task)
    
    return task_id


async def notify_critical_task(db, task: dict):
    """Send immediate notification for critical tasks"""
    try:
        import httpx
        message = (
            f"🚨 *TASK CRITICO*\n\n"
            f"📋 {task['title']}\n"
            f"🤖 Creato da: {task['created_by_agent'].upper()}\n"
            f"📝 {task['description'][:200]}\n"
            f"🆔 `{task['task_id']}`"
        )
        
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8001/api/notify/telegram",
                json={"message": message},
                timeout=10
            )
    except Exception as e:
        logger.error(f"[AGENT_TASK] Failed to notify critical task: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# STEFANIA ORCHESTRATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def stefania_daily_task_review(db) -> Dict[str, Any]:
    """
    Stefania's daily review of open tasks.
    Called by scheduler at 7:00.
    """
    now = datetime.now(timezone.utc)
    forty_eight_hours_ago = (now - timedelta(hours=48)).isoformat()
    
    # Get all open tasks
    open_tasks = await db.agent_tasks.find({
        "status": {"$in": [TaskStatus.OPEN.value, TaskStatus.IN_PROGRESS.value, TaskStatus.WAITING_HUMAN.value]}
    }).sort([("priority", -1), ("created_at", 1)]).to_list(100)
    
    if not open_tasks:
        return {"reviewed": 0, "escalated": 0, "message": "Nessun task aperto"}
    
    # Categorize tasks
    critical_tasks = []
    high_tasks = []
    overdue_tasks = []
    normal_tasks = []
    
    tasks_to_escalate = []
    
    for task in open_tasks:
        task_priority = task.get("priority", "medium")
        task_created = task.get("created_at", "")
        
        # Check if overdue (>48h)
        is_overdue = task_created < forty_eight_hours_ago
        
        if is_overdue and task.get("status") != TaskStatus.ESCALATED.value:
            tasks_to_escalate.append(task)
            overdue_tasks.append(task)
        elif task_priority == "critical":
            critical_tasks.append(task)
        elif task_priority == "high":
            high_tasks.append(task)
        else:
            normal_tasks.append(task)
    
    # Escalate overdue tasks
    for task in tasks_to_escalate:
        await db.agent_tasks.update_one(
            {"task_id": task["task_id"]},
            {"$set": {
                "status": TaskStatus.ESCALATED.value,
                "escalated_at": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )
    
    # Build notification message
    message = "📋 *STEFANIA - Review Task Giornaliero*\n"
    message += f"_{now.strftime('%d/%m/%Y %H:%M')}_\n\n"
    
    if overdue_tasks:
        message += f"🚨 *ESCALATI A CLAUDIO ({len(overdue_tasks)}):*\n"
        for t in overdue_tasks[:5]:
            days_open = (now - datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))).days
            message += f"  • {t['title'][:40]} ({days_open}gg) - {t['created_by_agent']}\n"
        if len(overdue_tasks) > 5:
            message += f"  ... e altri {len(overdue_tasks) - 5}\n"
        message += "\n"
    
    if critical_tasks:
        message += f"🔴 *CRITICI ({len(critical_tasks)}):*\n"
        for t in critical_tasks[:3]:
            message += f"  • {t['title'][:40]} - {t['created_by_agent']}\n"
        message += "\n"
    
    if high_tasks:
        message += f"🟠 *ALTA PRIORITÀ ({len(high_tasks)}):*\n"
        for t in high_tasks[:3]:
            message += f"  • {t['title'][:40]} - {t['created_by_agent']}\n"
        message += "\n"
    
    if normal_tasks:
        message += f"🟢 *NORMALI ({len(normal_tasks)}):*\n"
        for t in normal_tasks[:3]:
            message += f"  • {t['title'][:40]}\n"
        if len(normal_tasks) > 3:
            message += f"  ... e altri {len(normal_tasks) - 3}\n"
    
    message += f"\n📊 Totale task aperti: {len(open_tasks)}"
    
    # Send notification
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8001/api/notify/telegram",
                json={"message": message},
                timeout=10
            )
    except Exception as e:
        logger.error(f"[STEFANIA] Failed to send daily review notification: {e}")
    
    return {
        "reviewed": len(open_tasks),
        "escalated": len(tasks_to_escalate),
        "critical": len(critical_tasks),
        "high": len(high_tasks),
        "normal": len(normal_tasks),
        "message": message
    }


async def resolve_task(db, task_id: str, resolution_notes: str, resolved_by: str = "claudio") -> bool:
    """Resolve a task"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.agent_tasks.update_one(
        {"task_id": task_id},
        {"$set": {
            "status": TaskStatus.RESOLVED.value,
            "resolution_notes": resolution_notes,
            "resolved_by": resolved_by,
            "resolved_at": now,
            "updated_at": now
        }}
    )
    
    if result.modified_count > 0:
        logger.info(f"[AGENT_TASK] Task {task_id} resolved by {resolved_by}")
        return True
    return False


async def get_open_tasks_summary(db) -> Dict[str, Any]:
    """Get summary of open tasks"""
    pipeline = [
        {"$match": {"status": {"$in": ["open", "in_progress", "waiting_human", "escalated"]}}},
        {"$group": {
            "_id": "$priority",
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.agent_tasks.aggregate(pipeline).to_list(10)
    
    summary = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "total": 0
    }
    
    for r in results:
        priority = r["_id"]
        count = r["count"]
        if priority in summary:
            summary[priority] = count
        summary["total"] += count
    
    return summary


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS FOR OTHER AGENTS
# ═══════════════════════════════════════════════════════════════════════════════

async def gaia_report_lead_blocked(db, lead_id: str, lead_name: str, reason: str):
    """GAIA reports a lead that is blocked or unresponsive"""
    return await create_agent_task(
        db=db,
        task_type=TaskType.LEAD_BLOCKED,
        title=f"Lead bloccato: {lead_name}",
        description=f"GAIA ha rilevato un problema con il lead.\n\nMotivo: {reason}",
        created_by_agent="gaia",
        priority=TaskPriority.MEDIUM,
        entity_type="lead",
        entity_id=lead_id,
        entity_name=lead_name,
        context={"reason": reason}
    )


async def report_partner_inactive(db, partner_id: str, partner_name: str, days_inactive: int):
    """Report a partner that has been inactive for too long"""
    priority = TaskPriority.HIGH if days_inactive > 14 else TaskPriority.MEDIUM
    
    return await create_agent_task(
        db=db,
        task_type=TaskType.PARTNER_INACTIVE,
        title=f"Partner inattivo: {partner_name} ({days_inactive}gg)",
        description=f"Il partner è inattivo da {days_inactive} giorni. Verificare stato e contattare.",
        created_by_agent="system",
        priority=priority,
        entity_type="partner",
        entity_id=partner_id,
        entity_name=partner_name,
        context={"days_inactive": days_inactive}
    )


async def report_pipeline_failed(db, job_id: str, partner_name: str, error: str):
    """Report a failed video pipeline"""
    return await create_agent_task(
        db=db,
        task_type=TaskType.PIPELINE_FAILED,
        title=f"Pipeline fallita: {partner_name}",
        description=f"La pipeline video è fallita.\n\nErrore: {error}",
        created_by_agent="system",
        priority=TaskPriority.HIGH,
        entity_type="pipeline",
        entity_id=job_id,
        entity_name=partner_name,
        context={"error": error, "job_id": job_id}
    )


async def report_onboarding_stuck(db, partner_id: str, partner_name: str, stuck_at: str):
    """Report a partner stuck in onboarding"""
    return await create_agent_task(
        db=db,
        task_type=TaskType.ONBOARDING_STUCK,
        title=f"Onboarding bloccato: {partner_name}",
        description=f"Il partner è bloccato nella fase di onboarding.\n\nFase: {stuck_at}",
        created_by_agent="stefania",
        priority=TaskPriority.MEDIUM,
        entity_type="partner",
        entity_id=partner_id,
        entity_name=partner_name,
        context={"stuck_at": stuck_at}
    )
