"""
Evolution PRO OS - OpenClaw Integration
=======================================
OpenClaw = Il braccio esecutivo del team AI

OpenClaw NON è un agente del team. Non parla con i partner. 
Non genera contenuti. Non prende decisioni.
È un EXECUTOR SILENZIOSO che esegue azioni tecniche su piattaforme 
esterne quando il worker di Emergent fallisce.

Architettura:
Claudio/Antonella (supervisione) 
    ↓
Stefania (cervello - coordina)
    ↓ task.status = "failed"?
Telegram → OpenClaw (locale)
    ↓
Systeme.io / Stripe / Cloudinary (servizi esterni)

Categorie:
A (esecuzione diretta): add_tag, sync_contacts, create_video_task, genera_pdf, upload_cloudinary
B (dopo approvazione): trigger_campaign, crea_funnel_browser, modifica_automazioni, upload_youtube
C (mai): generazione contenuti, risposte a partner, modifiche DB, decisioni strategiche
"""

import os
import httpx
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, List
import json

logger = logging.getLogger(__name__)

# Telegram config
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
OPENCLAW_CHAT_ID = os.environ.get('OPENCLAW_CHAT_ID', os.environ.get('TELEGRAM_ADMIN_CHAT_ID'))

# ============================================================================
# CATEGORIE AZIONI OPENCLAW
# ============================================================================

# Categoria A: Esecuzione DIRETTA (no approvazione richiesta)
# Zero rischio - non toccano il partner, non inviano nulla, reversibili
CATEGORY_A_ACTIONS = {
    "add_systeme_tag": "Riprova chiamata API Systeme.io per aggiungere tag",
    "sync_systeme_contacts": "Reimporta contatti nel DB",
    "create_video_task": "Ricrea task video nel database",
    "genera_pdf_contratto": "Genera PDF localmente",
    "upload_cloudinary": "Ricarica media su Cloudinary",
    "create_pipeline_column": "Crea colonna pipeline via browser",
    "move_contact_to_column": "Sposta contatto in pipeline via browser",
    "browser_generic_task": "Task browser generico (navigazione, click, form)",
    "delete_contacts": "Elimina contatti dal database",
    "cleanup_data": "Pulizia dati di test",
}

# Categoria B: Esecuzione DOPO APPROVAZIONE
# Toccano il partner o inviano comunicazioni reali
CATEGORY_B_ACTIONS = {
    "trigger_email_campaign": "Invia email reali ai contatti",
    "create_funnel": "Crea funnel via browser automation",
    "modify_automation": "Modifica automazioni Systeme.io via browser",
    "upload_youtube": "Pubblica video pubblicamente",
    "publish_landing": "Mette online contenuto visibile",
    "create_automation": "Crea automazione email",
}

# Categoria C: OpenClaw NON interviene MAI
# Problemi che vanno risolti nel cervello, non nelle braccia
CATEGORY_C_ACTIONS = {
    "generate_content": "Generazione contenuti (copy, script, email)",
    "respond_to_partner": "Risposte dirette ai partner",
    "strategic_decision": "Decisioni strategiche",
    "modify_partner_db": "Modifiche database partner (phase, status)",
    "unapproved_external": "Azioni esterne non approvate",
}

# Lista combinata per retrocompatibilità
OPENCLAW_ACTIONS = list(CATEGORY_A_ACTIONS.keys()) + list(CATEGORY_B_ACTIONS.keys())


def get_action_category(action: str) -> str:
    """Determina la categoria di un'azione"""
    if action in CATEGORY_A_ACTIONS:
        return "A"
    elif action in CATEGORY_B_ACTIONS:
        return "B"
    elif action in CATEGORY_C_ACTIONS:
        return "C"
    return "UNKNOWN"


def requires_openclaw(action: str) -> bool:
    """Verifica se un'azione può essere gestita da OpenClaw"""
    return action in CATEGORY_A_ACTIONS or action in CATEGORY_B_ACTIONS


def requires_approval(action: str) -> bool:
    """Verifica se un'azione richiede approvazione prima di OpenClaw"""
    return action in CATEGORY_B_ACTIONS


# ============================================================================
# CLASSE OPENCLAW TASK (aggiornata con tracciabilità)
# ============================================================================

class OpenClawTask:
    """
    Struttura di un task OpenClaw con tracciabilità completa.
    
    Nuovi campi per audit trail:
    - executed_by: "worker" | "openclaw" | "manual"
    - fallback_status: "none" | "requested" | "in_progress" | "completed" | "failed"
    - openclaw_category: "A" | "B" | "C"
    - approval_status: "n/a" | "pending" | "approved" | "rejected"
    - execution_log: Lista di tentativi di esecuzione
    """
    
    def __init__(
        self,
        action: str,
        params: Dict,
        priority: str = "normal",
        description: str = "",
        partner_id: Optional[str] = None,
        scope: str = "INTERNAL",
        approval_status: str = "n/a",
        error_from_worker: Optional[str] = None
    ):
        self.id = f"oc_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.action = action
        self.params = params
        self.priority = priority  # "urgent", "normal", "low"
        self.description = description
        self.partner_id = partner_id
        self.scope = scope  # "INTERNAL" o "EXTERNAL"
        
        # Categoria automatica
        self.category = get_action_category(action)
        
        # Status tracking
        self.status = "pending"
        self.approval_status = approval_status
        self.fallback_status = "requested"
        self.executed_by = None
        
        # Timestamps
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.completed_at = None
        
        # Results
        self.result = None
        self.error_from_worker = error_from_worker
        
        # Execution log per audit trail
        self.execution_log = []
        if error_from_worker:
            self.execution_log.append({
                "executor": "worker",
                "status": "failed",
                "error": error_from_worker,
                "timestamp": self.created_at
            })
    
    def to_telegram_message(self) -> str:
        """
        Formatta il task come messaggio Telegram per OpenClaw.
        Formato standardizzato secondo le specifiche del documento.
        """
        # Verifica categoria B senza approvazione
        if self.category == "B" and self.approval_status != "approved":
            return f"""⚠️ **ERRORE: Task Categoria B non approvato**

Task ID: `{self.id}`
Azione: `{self.action}`
Categoria: B (richiede approvazione)
Stato approvazione: `{self.approval_status}`

❌ **NON ESEGUIRE** - Serve approvazione di Antonella/Claudio prima."""

        # Verifica categoria C
        if self.category == "C":
            return f"""❌ **ERRORE: Task Categoria C**

Task ID: `{self.id}`
Azione: `{self.action}`

Categoria C: NON è nel scope di OpenClaw.
Va gestito dal team Emergent (cervello, non braccia)."""

        # Messaggio standard per task validi
        message = f"""🦞 FALLBACK REQUEST
task_id: {self.id}
task_type: {self.action}
category: {self.category}
approval_status: {self.approval_status if self.category == "B" else "n/a"}
scope: {self.scope}
partner: {self.partner_id or "null"}
data: {json.dumps(self.params, ensure_ascii=False)}
error: {self.error_from_worker or "N/A"}

Esegui l'azione specificata.

---
Rispondi con:
✅ FALLBACK COMPLETATO task_id: {self.id} action: [cosa hai fatto] result: [risultato]
oppure:
❌ FALLBACK FALLITO task_id: {self.id} error: [dettaglio] suggestion: [cosa fare manualmente]"""
        
        return message
    
    def add_execution_log(self, executor: str, status: str, result_or_error: str):
        """Aggiunge un entry al log di esecuzione"""
        self.execution_log.append({
            "executor": executor,
            "status": status,
            "result" if status == "completed" else "error": result_or_error,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    def to_dict(self) -> Dict:
        """Serializza il task per il database"""
        return {
            "id": self.id,
            "action": self.action,
            "params": self.params,
            "priority": self.priority,
            "description": self.description,
            "partner_id": self.partner_id,
            "scope": self.scope,
            "category": self.category,
            "status": self.status,
            "approval_status": self.approval_status,
            "fallback_status": self.fallback_status,
            "executed_by": self.executed_by,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "result": self.result,
            "error_from_worker": self.error_from_worker,
            "execution_log": self.execution_log
        }


# ============================================================================
# FUNZIONE PRINCIPALE: INVIA TASK A OPENCLAW
# ============================================================================

async def send_openclaw_task(task: OpenClawTask, db=None) -> Dict:
    """
    Invia un task a OpenClaw via Telegram.
    
    Verifica prima le regole di categoria:
    - Categoria A: esecuzione immediata
    - Categoria B: solo se approval_status == "approved"
    - Categoria C: rifiuta sempre
    """
    
    # Verifica configurazione Telegram
    if not TELEGRAM_BOT_TOKEN or not OPENCLAW_CHAT_ID:
        logger.error("Telegram not configured for OpenClaw")
        return {"success": False, "error": "Telegram non configurato per OpenClaw"}
    
    # Verifica categoria C (mai eseguire)
    if task.category == "C":
        logger.warning(f"Attempted to send Category C task to OpenClaw: {task.action}")
        return {
            "success": False, 
            "error": f"Azione '{task.action}' è Categoria C: non eseguibile da OpenClaw. Va gestita dal team Emergent."
        }
    
    # Verifica categoria B senza approvazione
    if task.category == "B" and task.approval_status != "approved":
        logger.warning(f"Category B task without approval: {task.action}")
        return {
            "success": False,
            "error": f"Azione '{task.action}' è Categoria B: richiede approvazione di Antonella/Claudio prima dell'esecuzione.",
            "requires_approval": True
        }
    
    # Genera messaggio
    message = task.to_telegram_message()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": OPENCLAW_CHAT_ID,
                    "text": message
                    # NOTA: rimosso parse_mode per evitare errori con caratteri speciali
                },
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"OpenClaw task {task.id} sent successfully (Category {task.category})")
                
                # Update task status
                task.fallback_status = "in_progress"
                
                # Save task to database
                if db is not None:
                    await db.openclaw_tasks.insert_one(task.to_dict())
                
                return {
                    "success": True,
                    "task_id": task.id,
                    "category": task.category,
                    "message": f"Task inviato a OpenClaw. ID: {task.id} (Categoria {task.category})"
                }
            else:
                logger.error(f"Telegram API error: {response.text}")
                return {"success": False, "error": f"Telegram error: {response.status_code}"}
                
    except Exception as e:
        logger.error(f"Error sending OpenClaw task: {e}")
        return {"success": False, "error": str(e)}


# ============================================================================
# FUNZIONE FALLBACK: CHIAMATA DA STEFANIA QUANDO WORKER FALLISCE
# ============================================================================

async def request_openclaw_fallback(
    task_type: str,
    params: Dict,
    error_from_worker: str,
    partner_id: Optional[str] = None,
    scope: str = "INTERNAL",
    approval_status: str = "n/a",
    db=None
) -> Dict:
    """
    Richiede a OpenClaw di eseguire un task dopo che il worker ha fallito.
    
    Questa funzione viene chiamata da Stefania quando:
    1. Un task ha status "failed"
    2. L'errore è TECNICO (timeout, API error, rate limit)
    3. Il task è Categoria A, oppure Categoria B già approvato
    
    Args:
        task_type: Tipo di azione (es: "add_systeme_tag")
        params: Parametri dell'azione
        error_from_worker: Messaggio di errore dal worker
        partner_id: ID del partner (se applicabile)
        scope: "INTERNAL" o "EXTERNAL"
        approval_status: "n/a", "pending", "approved", "rejected"
        db: Connessione database (opzionale)
    
    Returns:
        Dict con success, task_id, message o error
    """
    
    # Determina categoria
    category = get_action_category(task_type)
    
    # Log della richiesta
    logger.info(f"OpenClaw fallback requested: {task_type} (Category {category})")
    
    # Crea il task
    task = OpenClawTask(
        action=task_type,
        params=params,
        priority="normal",
        description=f"Fallback per {task_type} dopo errore worker",
        partner_id=partner_id,
        scope=scope,
        approval_status=approval_status,
        error_from_worker=error_from_worker
    )
    
    # Invia a OpenClaw
    result = await send_openclaw_task(task, db)
    
    return result


# ============================================================================
# AZIONI PREDEFINITE (Helper Functions)
# ============================================================================

async def create_pipeline_column(
    column_name: str,
    pipeline_name: str = "default",
    position: str = "end",
    db=None
) -> Dict:
    """Crea una nuova colonna nella pipeline Systeme.io (Categoria A)"""
    
    task = OpenClawTask(
        action="create_pipeline_column",
        params={
            "column_name": column_name,
            "pipeline_name": pipeline_name,
            "position": position,
            "systeme_url": "https://app.systeme.io/pipeline"
        },
        priority="normal",
        description=f"Creare colonna '{column_name}' nella pipeline '{pipeline_name}'"
    )
    
    return await send_openclaw_task(task, db)


async def move_contact_to_column(
    email: str,
    target_column: str,
    pipeline_name: str = "default",
    db=None
) -> Dict:
    """Sposta un contatto in una colonna specifica della pipeline (Categoria A)"""
    
    task = OpenClawTask(
        action="move_contact_to_column",
        params={
            "email": email,
            "target_column": target_column,
            "pipeline_name": pipeline_name,
            "systeme_url": "https://app.systeme.io/pipeline"
        },
        priority="normal",
        description=f"Spostare '{email}' nella colonna '{target_column}'"
    )
    
    return await send_openclaw_task(task, db)


async def add_systeme_tag_fallback(
    email: str,
    tag_name: str,
    error_from_worker: str,
    db=None
) -> Dict:
    """Fallback per aggiungere tag via OpenClaw (Categoria A)"""
    
    return await request_openclaw_fallback(
        task_type="add_systeme_tag",
        params={
            "email": email,
            "tag_name": tag_name,
            "systeme_api_url": "https://api.systeme.io/api"
        },
        error_from_worker=error_from_worker,
        scope="INTERNAL",
        approval_status="n/a",
        db=db
    )


async def create_funnel(
    funnel_name: str,
    template: str = "blank",
    pages: List[str] = None,
    approval_status: str = "n/a",
    db=None
) -> Dict:
    """Crea un nuovo funnel su Systeme.io (Categoria B - richiede approvazione)"""
    
    task = OpenClawTask(
        action="create_funnel",
        params={
            "funnel_name": funnel_name,
            "template": template,
            "pages": pages or ["opt-in", "thank-you"],
            "systeme_url": "https://app.systeme.io/funnel"
        },
        priority="normal",
        description=f"Creare funnel '{funnel_name}' con template '{template}'",
        approval_status=approval_status
    )
    
    return await send_openclaw_task(task, db)


async def create_automation(
    automation_name: str,
    trigger_tag: str,
    action_type: str,
    action_params: Dict,
    approval_status: str = "n/a",
    db=None
) -> Dict:
    """Crea una nuova automazione su Systeme.io (Categoria B - richiede approvazione)"""
    
    task = OpenClawTask(
        action="create_automation",
        params={
            "automation_name": automation_name,
            "trigger_tag": trigger_tag,
            "action_type": action_type,
            "action_params": action_params,
            "systeme_url": "https://app.systeme.io/workflow"
        },
        priority="normal",
        description=f"Creare automazione '{automation_name}' triggerata da tag '{trigger_tag}'",
        approval_status=approval_status
    )
    
    return await send_openclaw_task(task, db)


async def trigger_email_campaign(
    campaign_name: str,
    target_tag: str,
    email_sequence: List[Dict],
    partner_id: str,
    approval_status: str = "n/a",
    db=None
) -> Dict:
    """Attiva una campagna email (Categoria B - richiede approvazione)"""
    
    task = OpenClawTask(
        action="trigger_email_campaign",
        params={
            "campaign_name": campaign_name,
            "target_tag": target_tag,
            "email_sequence": email_sequence,
            "systeme_url": "https://app.systeme.io/workflow"
        },
        priority="normal",
        description=f"Attivare campagna '{campaign_name}' per tag '{target_tag}'",
        partner_id=partner_id,
        scope="EXTERNAL",
        approval_status=approval_status
    )
    
    return await send_openclaw_task(task, db)


# ============================================================================
# GESTIONE CALLBACK DA OPENCLAW
# ============================================================================

async def handle_openclaw_callback(
    task_id: str,
    status: str,  # "completed" or "failed"
    result: Optional[str] = None,
    db=None
) -> Dict:
    """
    Gestisce il callback di completamento da OpenClaw.
    
    Quando OpenClaw risponde su Telegram con:
    - ✅ FALLBACK COMPLETATO task_id: xxx result: yyy
    - ❌ FALLBACK FALLITO task_id: xxx error: zzz
    
    Questa funzione aggiorna il database.
    """
    
    if not db:
        return {"success": False, "error": "Database non disponibile"}
    
    task = await db.openclaw_tasks.find_one({"id": task_id})
    
    if not task:
        return {"success": False, "error": f"Task {task_id} non trovato"}
    
    # Prepara update
    now = datetime.now(timezone.utc).isoformat()
    
    if status == "completed":
        update = {
            "status": "completed",
            "fallback_status": "completed",
            "executed_by": "openclaw",
            "completed_at": now,
            "result": result
        }
        # Aggiungi al log
        log_entry = {
            "executor": "openclaw",
            "status": "completed",
            "result": result,
            "timestamp": now
        }
    else:
        update = {
            "status": "failed",
            "fallback_status": "failed",
            "executed_by": "openclaw",
            "completed_at": now,
            "result": result
        }
        log_entry = {
            "executor": "openclaw",
            "status": "failed",
            "error": result,
            "timestamp": now
        }
    
    # Update database
    await db.openclaw_tasks.update_one(
        {"id": task_id},
        {
            "$set": update,
            "$push": {"execution_log": log_entry}
        }
    )
    
    logger.info(f"OpenClaw task {task_id} marked as {update['status']}")
    
    return {
        "success": True,
        "task_id": task_id,
        "status": update["status"],
        "executed_by": "openclaw"
    }


async def get_pending_openclaw_tasks(db) -> List[Dict]:
    """Ottiene i task OpenClaw in attesa"""
    
    tasks = await db.openclaw_tasks.find(
        {"fallback_status": {"$in": ["requested", "in_progress"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    return tasks


async def get_openclaw_stats(db) -> Dict:
    """Ottiene statistiche di utilizzo OpenClaw"""
    
    total = await db.openclaw_tasks.count_documents({})
    completed = await db.openclaw_tasks.count_documents({"fallback_status": "completed"})
    failed = await db.openclaw_tasks.count_documents({"fallback_status": "failed"})
    pending = await db.openclaw_tasks.count_documents({"fallback_status": {"$in": ["requested", "in_progress"]}})
    
    # Per categoria
    cat_a = await db.openclaw_tasks.count_documents({"category": "A"})
    cat_b = await db.openclaw_tasks.count_documents({"category": "B"})
    
    return {
        "total_tasks": total,
        "completed": completed,
        "failed": failed,
        "pending": pending,
        "by_category": {
            "A": cat_a,
            "B": cat_b
        },
        "success_rate": round((completed / total * 100), 1) if total > 0 else 0
    }
