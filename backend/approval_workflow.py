"""
Evolution PRO OS - Approval Workflow System
Sistema di approvazione per task degli agenti AI
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# MATRICE DI APPROVAZIONE
# Definisce quali task richiedono approvazione umana
# ═══════════════════════════════════════════════════════════════════════════════

# Task che richiedono SEMPRE approvazione (contenuti per partner)
ALWAYS_APPROVE = [
    "generate_email",
    "generate_email_copy",
    "generate_social",
    "generate_social_post",
    "generate_script",
    "generate_masterclass_script",
    "generate_landing_copy",
    "generate_email_sequence",
    "generate_contract",
    "generate_legal",
    "trigger_campaign",
    "trigger_email_campaign",
]

# Task che richiedono approvazione SOLO se scope è EXTERNAL
APPROVE_IF_EXTERNAL = [
    "add_tag",
    "add_systeme_tag",
    "migrate_leads_segment",
]

# Task che non richiedono MAI approvazione (lettura dati)
NEVER_APPROVE = [
    "get_lead_stats",
    "get_hot_leads",
    "analyze_lead",
    "get_leads_to_reactivate",
    "get_lead_trends",
    "get_segment_details",
    "get_conversion_potential",
    "get_sales_kpi",
    "get_pipeline_status",
    "get_partner_revenue",
    "get_retention_stats",
    "check_contract_status",
    "check_funnel_status",
    "sync_contacts",
    "sync_systeme_contacts",
    "create_video_task",
    "get_my_progress",
    "get_next_steps",
    "ask_question",
]


def requires_approval(task_type: str, scope: str = "INTERNAL") -> bool:
    """
    Determina se un task richiede approvazione umana.
    
    Args:
        task_type: Tipo di task (es: "generate_email", "add_tag")
        scope: "INTERNAL" o "EXTERNAL"
    
    Returns:
        True se richiede approvazione, False altrimenti
    """
    if task_type in ALWAYS_APPROVE:
        return True
    
    if task_type in APPROVE_IF_EXTERNAL and scope == "EXTERNAL":
        return True
    
    if task_type in NEVER_APPROVE:
        return False
    
    # Default: se non classificato, richiedi approvazione per sicurezza
    logger.warning(f"Task type '{task_type}' non classificato nella matrice approvazione. Default: richiede approvazione.")
    return True


def get_task_scope(task_data: Dict, partner_id: Optional[str] = None) -> str:
    """
    Determina lo scope di un task.
    
    Returns:
        "EXTERNAL" se il task è per un partner, "INTERNAL" altrimenti
    """
    if partner_id and partner_id not in ["claudio", "admin", "system"]:
        return "EXTERNAL"
    
    if task_data.get("scope") == "EXTERNAL":
        return "EXTERNAL"
    
    if task_data.get("partner_id"):
        return "EXTERNAL"
    
    return "INTERNAL"


# ═══════════════════════════════════════════════════════════════════════════════
# STRUTTURA TASK CON APPROVAZIONE
# ═══════════════════════════════════════════════════════════════════════════════

def create_task_with_approval(
    title: str,
    task_type: str,
    agent: str,
    data: Dict,
    partner_id: Optional[str] = None,
    created_by: str = "valentina"
) -> Dict:
    """
    Crea un task con i campi necessari per il workflow di approvazione.
    """
    import uuid
    
    scope = get_task_scope(data, partner_id)
    needs_approval = requires_approval(task_type, scope)
    
    task = {
        "id": str(uuid.uuid4()),
        "title": title,
        "task_type": task_type,
        "agent": agent,
        "status": "pending",
        "data": data,
        "result": None,
        
        # Campi scope
        "scope": scope,
        "partner_id": partner_id,
        
        # Campi approvazione
        "requires_approval": needs_approval,
        "approval": {
            "required": needs_approval,
            "reviewer": None,
            "status": "pending" if needs_approval else None,
            "feedback": None,
            "reviewed_at": None,
            "revision_count": 0
        } if needs_approval else None,
        
        # Preview e revisioni
        "preview_url": None,
        "revisions": [],
        
        # Timestamp
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    return task


# ═══════════════════════════════════════════════════════════════════════════════
# STATUS TRANSITIONS
# ═══════════════════════════════════════════════════════════════════════════════

VALID_TRANSITIONS = {
    "pending": ["in_progress", "cancelled"],
    "in_progress": ["awaiting_approval", "completed", "failed"],
    "awaiting_approval": ["approved", "rejected"],
    "approved": ["completed"],
    "rejected": ["in_progress"],  # Torna a in_progress per rigenerazione
    "completed": [],
    "failed": ["pending"],  # Può essere ritentato
    "cancelled": []
}


def can_transition(current_status: str, new_status: str) -> bool:
    """Verifica se una transizione di stato è valida."""
    return new_status in VALID_TRANSITIONS.get(current_status, [])


# ═══════════════════════════════════════════════════════════════════════════════
# APPROVAL ACTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def approve_task(db, task_id: str, reviewer: str, notes: Optional[str] = None) -> Dict:
    """
    Approva un task.
    
    Args:
        db: Database connection
        task_id: ID del task
        reviewer: Nome del reviewer (es: "Antonella", "Claudio")
        notes: Note opzionali per il partner
    
    Returns:
        Task aggiornato
    """
    task = await db.agent_tasks.find_one({"id": task_id})
    
    if not task:
        raise ValueError(f"Task {task_id} non trovato")
    
    if task.get("status") != "awaiting_approval":
        raise ValueError(f"Task {task_id} non è in attesa di approvazione (status: {task.get('status')})")
    
    update = {
        "status": "approved",
        "approval.status": "approved",
        "approval.reviewer": reviewer,
        "approval.reviewed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if notes:
        update["approval.notes"] = notes
    
    await db.agent_tasks.update_one(
        {"id": task_id},
        {"$set": update}
    )
    
    logger.info(f"Task {task_id} approvato da {reviewer}")
    
    return await db.agent_tasks.find_one({"id": task_id})


async def reject_task(db, task_id: str, reviewer: str, feedback: str) -> Dict:
    """
    Rifiuta un task con feedback.
    
    Args:
        db: Database connection
        task_id: ID del task
        reviewer: Nome del reviewer
        feedback: Feedback obbligatorio per la rigenerazione
    
    Returns:
        Task aggiornato
    """
    if not feedback or not feedback.strip():
        raise ValueError("Il feedback è obbligatorio per rifiutare un task")
    
    task = await db.agent_tasks.find_one({"id": task_id})
    
    if not task:
        raise ValueError(f"Task {task_id} non trovato")
    
    if task.get("status") != "awaiting_approval":
        raise ValueError(f"Task {task_id} non è in attesa di approvazione (status: {task.get('status')})")
    
    revision_count = task.get("approval", {}).get("revision_count", 0)
    
    if revision_count >= 3:
        raise ValueError(f"Task {task_id} ha già raggiunto il limite di 3 revisioni. Richiede intervento manuale.")
    
    # Salva la versione corrente nello storico revisioni
    current_output = task.get("result", {}).get("output")
    if current_output:
        revision = {
            "version": revision_count + 1,
            "output": current_output,
            "feedback": feedback,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.agent_tasks.update_one(
            {"id": task_id},
            {"$push": {"revisions": revision}}
        )
    
    update = {
        "status": "rejected",
        "approval.status": "rejected",
        "approval.reviewer": reviewer,
        "approval.feedback": feedback,
        "approval.reviewed_at": datetime.now(timezone.utc).isoformat(),
        "approval.revision_count": revision_count + 1,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.agent_tasks.update_one(
        {"id": task_id},
        {"$set": update}
    )
    
    logger.info(f"Task {task_id} rifiutato da {reviewer}. Feedback: {feedback[:50]}...")
    
    return await db.agent_tasks.find_one({"id": task_id})


async def get_pending_approvals(db, agent: Optional[str] = None, partner_id: Optional[str] = None) -> List[Dict]:
    """
    Ottiene la lista di task in attesa di approvazione.
    """
    query = {"status": "awaiting_approval"}
    
    if agent:
        query["agent"] = agent
    
    if partner_id:
        query["partner_id"] = partner_id
    
    tasks = await db.agent_tasks.find(
        query,
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)  # FIFO: più vecchi prima
    
    return tasks


async def get_approval_stats(db) -> Dict:
    """
    Ottiene statistiche sulle approvazioni.
    """
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    four_hours_ago = now - timedelta(hours=4)
    
    pending_count = await db.agent_tasks.count_documents({"status": "awaiting_approval"})
    
    approved_today = await db.agent_tasks.count_documents({
        "approval.status": "approved",
        "approval.reviewed_at": {"$gte": today_start.isoformat()}
    })
    
    rejected_today = await db.agent_tasks.count_documents({
        "approval.status": "rejected",
        "approval.reviewed_at": {"$gte": today_start.isoformat()}
    })
    
    stale_count = await db.agent_tasks.count_documents({
        "status": "awaiting_approval",
        "created_at": {"$lt": four_hours_ago.isoformat()}
    })
    
    return {
        "pending": pending_count,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
        "stale_over_4h": stale_count
    }
