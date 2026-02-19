"""
Evolution PRO OS - OpenClaw Integration
Sistema per eseguire azioni GUI su Systeme.io tramite OpenClaw

OpenClaw viene controllato via Telegram Bot.
Quando Evolution PRO rileva un'azione non fattibile via API,
invia un comando strutturato a OpenClaw che lo esegue sul browser.
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

# Azioni che richiedono OpenClaw (non fattibili via API Systeme.io)
OPENCLAW_ACTIONS = [
    "create_pipeline_column",      # Creare colonna nella pipeline
    "move_contact_to_column",      # Spostare contatto in colonna specifica
    "create_funnel",               # Creare nuovo funnel
    "create_automation",           # Creare automazione
    "modify_automation",           # Modificare automazione esistente
    "create_email_template",       # Creare template email
    "setup_checkout",              # Configurare checkout
    "create_course_section",       # Creare sezione corso
]


def requires_openclaw(action: str) -> bool:
    """Verifica se un'azione richiede OpenClaw"""
    return action in OPENCLAW_ACTIONS


class OpenClawTask:
    """Struttura di un task OpenClaw"""
    
    def __init__(
        self,
        action: str,
        params: Dict,
        priority: str = "normal",
        description: str = "",
        partner_id: Optional[str] = None
    ):
        self.id = f"oc_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.action = action
        self.params = params
        self.priority = priority  # "urgent", "normal", "low"
        self.description = description
        self.partner_id = partner_id
        self.status = "pending"
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.completed_at = None
        self.result = None
    
    def to_telegram_message(self) -> str:
        """Formatta il task come messaggio Telegram per OpenClaw"""
        priority_emoji = {
            "urgent": "🔴",
            "normal": "🟡",
            "low": "🟢"
        }
        
        message = f"""
{priority_emoji.get(self.priority, '🟡')} **OPENCLAW TASK** [{self.id}]

**Azione:** `{self.action}`
**Priorità:** {self.priority.upper()}

**Parametri:**
```json
{json.dumps(self.params, indent=2, ensure_ascii=False)}
```

**Descrizione:** {self.description}

---
⏰ Creato: {self.created_at}
🆔 Partner: {self.partner_id or 'N/A'}

Rispondi con:
✅ `/done {self.id}` quando completato
❌ `/fail {self.id} [motivo]` se fallisce
"""
        return message
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "action": self.action,
            "params": self.params,
            "priority": self.priority,
            "description": self.description,
            "partner_id": self.partner_id,
            "status": self.status,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "result": self.result
        }


async def send_openclaw_task(task: OpenClawTask, db=None) -> Dict:
    """Invia un task a OpenClaw via Telegram"""
    
    if not TELEGRAM_BOT_TOKEN or not OPENCLAW_CHAT_ID:
        logger.error("Telegram not configured for OpenClaw")
        return {"success": False, "error": "Telegram non configurato"}
    
    message = task.to_telegram_message()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": OPENCLAW_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"OpenClaw task {task.id} sent successfully")
                
                # Save task to database
                if db:
                    await db.openclaw_tasks.insert_one(task.to_dict())
                
                return {
                    "success": True,
                    "task_id": task.id,
                    "message": f"Task inviato a OpenClaw. ID: {task.id}"
                }
            else:
                logger.error(f"Telegram API error: {response.text}")
                return {"success": False, "error": f"Telegram error: {response.status_code}"}
                
    except Exception as e:
        logger.error(f"Error sending OpenClaw task: {e}")
        return {"success": False, "error": str(e)}


# ============================================================================
# AZIONI PREDEFINITE PER SYSTEME.IO
# ============================================================================

async def create_pipeline_column(
    column_name: str,
    pipeline_name: str = "default",
    position: str = "end",
    db=None
) -> Dict:
    """Crea una nuova colonna nella pipeline Systeme.io"""
    
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
    """Sposta un contatto in una colonna specifica della pipeline"""
    
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


async def create_funnel(
    funnel_name: str,
    template: str = "blank",
    pages: List[str] = None,
    db=None
) -> Dict:
    """Crea un nuovo funnel su Systeme.io"""
    
    task = OpenClawTask(
        action="create_funnel",
        params={
            "funnel_name": funnel_name,
            "template": template,
            "pages": pages or ["opt-in", "thank-you"],
            "systeme_url": "https://app.systeme.io/funnel"
        },
        priority="normal",
        description=f"Creare funnel '{funnel_name}' con template '{template}'"
    )
    
    return await send_openclaw_task(task, db)


async def create_automation(
    automation_name: str,
    trigger_tag: str,
    action_type: str,
    action_params: Dict,
    db=None
) -> Dict:
    """Crea una nuova automazione su Systeme.io"""
    
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
        description=f"Creare automazione '{automation_name}' triggerata da tag '{trigger_tag}'"
    )
    
    return await send_openclaw_task(task, db)


# ============================================================================
# GESTIONE CALLBACK DA OPENCLAW
# ============================================================================

async def handle_openclaw_callback(
    task_id: str,
    status: str,  # "done" or "fail"
    result: Optional[str] = None,
    db=None
) -> Dict:
    """Gestisce il callback di completamento da OpenClaw"""
    
    if not db:
        return {"success": False, "error": "Database non disponibile"}
    
    task = await db.openclaw_tasks.find_one({"id": task_id})
    
    if not task:
        return {"success": False, "error": f"Task {task_id} non trovato"}
    
    update = {
        "status": "completed" if status == "done" else "failed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "result": result
    }
    
    await db.openclaw_tasks.update_one(
        {"id": task_id},
        {"$set": update}
    )
    
    logger.info(f"OpenClaw task {task_id} marked as {update['status']}")
    
    return {
        "success": True,
        "task_id": task_id,
        "status": update["status"]
    }


async def get_pending_openclaw_tasks(db) -> List[Dict]:
    """Ottiene i task OpenClaw in attesa"""
    
    tasks = await db.openclaw_tasks.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    return tasks
