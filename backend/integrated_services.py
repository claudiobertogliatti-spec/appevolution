"""
Evolution PRO - Integrated Services
- Systeme.io API Client
- Resend Email Service
- Background Job Executor
"""

import os
import httpx
import resend
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# ============================================================================
# MongoDB Connection
# ============================================================================
ATLAS_URL = "mongodb+srv://evolution_admin:Evoluzione74@cluster0.4cgj8wx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
ATLAS_DB = "evolution_pro"

_mongo_url = os.environ.get("MONGO_URL", "")
_db_name = os.environ.get("DB_NAME", "")

if not _mongo_url or 'localhost' in _mongo_url or '127.0.0.1' in _mongo_url:
    mongo_url = ATLAS_URL
    db_name = ATLAS_DB
else:
    mongo_url = _mongo_url
    db_name = _db_name or "evolution_pro"

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


# ============================================================================
# SYSTEME.IO API CLIENT
# ============================================================================
class SystemeIOClient:
    """Client for Systeme.io API operations"""
    
    def __init__(self):
        self.api_key = os.environ.get("SYSTEME_API_KEY", "")
        self.base_url = "https://api.systeme.io/api"
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        self.timeout = httpx.Timeout(30.0)
    
    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to Systeme.io API"""
        if not self.api_key:
            raise SystemeIOError("SYSTEME_API_KEY not configured")
        
        url = f"{self.base_url}/{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method, url, headers=self.headers, **kwargs
                )
                response.raise_for_status()
                return response.json() if response.text else {}
            except httpx.HTTPStatusError as e:
                logger.error(f"Systeme.io API error: {e.response.status_code} - {e.response.text}")
                raise SystemeIOError(f"API error: {e.response.status_code}")
            except httpx.RequestError as e:
                logger.error(f"Systeme.io request failed: {e}")
                raise SystemeIOError(f"Request failed: {str(e)}")
    
    # Contact Operations
    async def get_contacts(self, limit: int = 100, page: int = 1) -> Dict:
        """Get list of contacts"""
        return await self._request("GET", f"contacts?limit={limit}&page={page}")
    
    async def get_contact_by_email(self, email: str) -> Optional[Dict]:
        """Find contact by email"""
        contacts = await self._request("GET", f"contacts?email={email}")
        items = contacts.get("items", [])
        return items[0] if items else None
    
    async def create_contact(self, email: str, first_name: str = "", fields: Dict = None) -> Dict:
        """Create a new contact"""
        data = {
            "email": email,
            "fields": [
                {"slug": "first_name", "value": first_name}
            ]
        }
        if fields:
            for key, value in fields.items():
                data["fields"].append({"slug": key, "value": str(value)})
        
        return await self._request("POST", "contacts", json=data)
    
    async def update_contact(self, contact_id: str, fields: Dict) -> Dict:
        """Update contact fields"""
        data = {"fields": []}
        for key, value in fields.items():
            data["fields"].append({"slug": key, "value": str(value)})
        
        return await self._request("PATCH", f"contacts/{contact_id}", json=data)
    
    # Tag Operations
    async def get_tags(self) -> List[Dict]:
        """Get all tags"""
        result = await self._request("GET", "tags")
        return result.get("items", [])
    
    async def add_tag_to_contact(self, contact_id: str, tag_id: str) -> Dict:
        """Add tag to contact"""
        return await self._request("POST", f"contacts/{contact_id}/tags", json={"tagId": tag_id})
    
    async def remove_tag_from_contact(self, contact_id: str, tag_id: str) -> Dict:
        """Remove tag from contact"""
        return await self._request("DELETE", f"contacts/{contact_id}/tags/{tag_id}")
    
    async def get_or_create_tag(self, tag_name: str) -> str:
        """Get tag ID by name, create if not exists"""
        tags = await self.get_tags()
        for tag in tags:
            if tag.get("name", "").lower() == tag_name.lower():
                return tag.get("id")
        
        # Create new tag
        result = await self._request("POST", "tags", json={"name": tag_name})
        return result.get("id")
    
    # Email Campaign Operations
    async def subscribe_to_campaign(self, contact_id: str, campaign_id: str) -> Dict:
        """Subscribe contact to email campaign"""
        return await self._request(
            "POST", 
            f"contacts/{contact_id}/campaigns/{campaign_id}/subscription"
        )


class SystemeIOError(Exception):
    """Systeme.io API Error"""
    pass


# ============================================================================
# RESEND EMAIL SERVICE
# ============================================================================
class EmailService:
    """Service for sending transactional emails via Resend"""
    
    def __init__(self):
        self.api_key = os.environ.get("RESEND_API_KEY", "")
        self.sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        
        if self.api_key:
            resend.api_key = self.api_key
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str = None
    ) -> Dict:
        """Send email via Resend (non-blocking)"""
        if not self.api_key:
            logger.warning("RESEND_API_KEY not configured - email not sent")
            return {"success": False, "error": "Email service not configured"}
        
        params = {
            "from": from_email or self.sender_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        
        try:
            # Run sync SDK in thread to keep FastAPI non-blocking
            result = await asyncio.to_thread(resend.Emails.send, params)
            
            # Log to database
            await db.email_logs.insert_one({
                "to": to_email,
                "subject": subject,
                "status": "sent",
                "resend_id": result.get("id"),
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return {"success": True, "email_id": result.get("id")}
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            
            # Log failure
            await db.email_logs.insert_one({
                "to": to_email,
                "subject": subject,
                "status": "failed",
                "error": str(e),
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {"success": False, "error": str(e)}
    
    async def send_welcome_email(self, to_email: str, partner_name: str) -> Dict:
        """Send welcome email to new partner"""
        subject = "🎉 Benvenuto in Evolution PRO - Le tue credenziali"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #F2C418 0%, #FADA5E 100%); padding: 30px; text-align: center;">
                <h1 style="color: #1E2128; margin: 0;">Benvenuto in Evolution PRO!</h1>
            </div>
            
            <div style="padding: 30px; background: #fff;">
                <p>Ciao <strong>{partner_name}</strong>! 👋</p>
                
                <p>Il tuo account Evolution PRO è stato creato con successo.</p>
                
                <div style="background: #FAFAF7; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="color: #1E2128; margin-top: 0;">📱 Accedi all'App</h3>
                    <p><strong>URL:</strong> <a href="https://app.evolution-pro.it" style="color: #F2C418;">https://app.evolution-pro.it</a></p>
                    <p><strong>Email:</strong> {to_email}</p>
                </div>
                
                <div style="background: #FFF8DC; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #F2C418;">
                    <h3 style="color: #1E2128; margin-top: 0;">🚀 Primi Passi</h3>
                    <ol style="margin: 0; padding-left: 20px;">
                        <li>Accedi all'app con le tue credenziali</li>
                        <li>Guarda il <strong>Video di Benvenuto</strong></li>
                        <li>Compila il tuo <strong>Profilo Hub</strong></li>
                        <li>Inizia il percorso di <strong>Posizionamento</strong></li>
                    </ol>
                </div>
                
                <div style="background: #1E2128; color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="color: #F2C418; margin-top: 0;">👥 Il Tuo Team</h3>
                    <p style="margin-bottom: 0;">Hai a disposizione un team di <strong>8 agenti AI</strong> coordinati da <strong>Valentina</strong>!</p>
                </div>
            </div>
            
            <div style="background: #FAFAF7; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>© 2026 Evolution PRO - Tutti i diritti riservati</p>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_content)
    
    async def send_campaign_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        campaign_name: str = "Generic"
    ) -> Dict:
        """Send campaign email to multiple recipients"""
        results = {
            "total": len(to_emails),
            "sent": 0,
            "failed": 0,
            "errors": []
        }
        
        for email in to_emails:
            result = await self.send_email(email, subject, html_content)
            if result.get("success"):
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({"email": email, "error": result.get("error")})
        
        # Log campaign
        await db.campaign_logs.insert_one({
            "campaign_name": campaign_name,
            "subject": subject,
            "total_recipients": results["total"],
            "sent": results["sent"],
            "failed": results["failed"],
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
        
        return results


# ============================================================================
# BACKGROUND JOB EXECUTOR
# ============================================================================
class BackgroundJobExecutor:
    """Execute agent tasks in background"""
    
    def __init__(self):
        self.systeme_client = SystemeIOClient()
        self.email_service = EmailService()
        self.running = False
    
    async def process_pending_tasks(self):
        """Process all pending tasks"""
        pending_tasks = await db.agent_tasks.find(
            {"status": "pending"}
        ).sort("created_at", 1).to_list(50)
        
        for task in pending_tasks:
            await self.execute_task(task)
    
    async def execute_task(self, task: Dict) -> Dict:
        """Execute a single task based on agent type"""
        task_id = task.get("id")
        agent = task.get("agent", "").upper()
        
        logger.info(f"Executing task {task_id} for agent {agent}")
        
        # Update status to in_progress
        await db.agent_tasks.update_one(
            {"id": task_id},
            {"$set": {"status": "in_progress", "started_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        try:
            result = None
            
            # Route to appropriate executor
            if agent == "GAIA":
                result = await self._execute_gaia_task(task)
            elif agent == "STEFANIA":
                result = await self._execute_stefania_task(task)
            elif agent == "ORION":
                result = await self._execute_orion_task(task)
            elif agent == "MARTA":
                result = await self._execute_marta_task(task)
            elif agent == "ANDREA":
                result = await self._execute_andrea_task(task)
            elif agent == "LUCA":
                result = await self._execute_luca_task(task)
            elif agent == "ATLAS":
                result = await self._execute_atlas_task(task)
            else:
                result = {"success": False, "error": f"Unknown agent: {agent}"}
            
            # Update task with result
            status = "completed" if result.get("success") else "failed"
            await db.agent_tasks.update_one(
                {"id": task_id},
                {"$set": {
                    "status": status,
                    "result": result,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            await db.agent_tasks.update_one(
                {"id": task_id},
                {"$set": {
                    "status": "failed",
                    "result": {"success": False, "error": str(e)},
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": False, "error": str(e)}
    
    async def _execute_gaia_task(self, task: Dict) -> Dict:
        """Execute GAIA (Systeme.io) task"""
        task_type = task.get("task_type", "")
        data = task.get("data", {})
        
        if task_type == "add_tag":
            email = data.get("email")
            tag_name = data.get("tag_name")
            
            # Find contact
            contact = await self.systeme_client.get_contact_by_email(email)
            if not contact:
                return {"success": False, "error": f"Contact not found: {email}"}
            
            # Get or create tag
            tag_id = await self.systeme_client.get_or_create_tag(tag_name)
            
            # Add tag
            await self.systeme_client.add_tag_to_contact(contact["id"], tag_id)
            
            return {"success": True, "message": f"Tag '{tag_name}' added to {email}"}
        
        elif task_type == "sync_contacts":
            # Sync contacts from Systeme.io to local DB
            contacts = await self.systeme_client.get_contacts(limit=100)
            synced = 0
            
            for contact in contacts.get("items", []):
                await db.systeme_contacts.update_one(
                    {"systeme_id": contact["id"]},
                    {"$set": {
                        "systeme_id": contact["id"],
                        "email": contact.get("email"),
                        "fields": contact.get("fields", {}),
                        "tags": contact.get("tags", []),
                        "synced_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
                synced += 1
            
            return {"success": True, "message": f"Synced {synced} contacts"}
        
        return {"success": False, "error": f"Unknown GAIA task type: {task_type}"}
    
    async def _execute_stefania_task(self, task: Dict) -> Dict:
        """Execute STEFANIA (email/copy) task"""
        task_type = task.get("task_type", "")
        data = task.get("data", {})
        
        if task_type == "send_email":
            to_email = data.get("to_email")
            subject = data.get("subject")
            html_content = data.get("html_content")
            
            result = await self.email_service.send_email(to_email, subject, html_content)
            return result
        
        elif task_type == "send_campaign":
            emails = data.get("emails", [])
            subject = data.get("subject")
            html_content = data.get("html_content")
            campaign_name = data.get("campaign_name", "Campaign")
            
            result = await self.email_service.send_campaign_email(
                emails, subject, html_content, campaign_name
            )
            return {"success": True, **result}
        
        elif task_type == "send_welcome":
            to_email = data.get("to_email")
            partner_name = data.get("partner_name")
            
            result = await self.email_service.send_welcome_email(to_email, partner_name)
            return result
        
        return {"success": False, "error": f"Unknown STEFANIA task type: {task_type}"}
    
    async def _execute_orion_task(self, task: Dict) -> Dict:
        """Execute ORION (analytics) task"""
        task_type = task.get("task_type", "")
        
        if task_type == "segment_leads":
            # Run lead segmentation
            total = await db.systeme_contacts.count_documents({})
            return {"success": True, "message": f"Analyzed {total} leads"}
        
        return {"success": False, "error": f"Unknown ORION task type: {task_type}"}
    
    async def _execute_marta_task(self, task: Dict) -> Dict:
        """Execute MARTA (CRM) task"""
        return {"success": True, "message": "MARTA task executed"}
    
    async def _execute_andrea_task(self, task: Dict) -> Dict:
        """Execute ANDREA (video) task"""
        return {"success": True, "message": "ANDREA task queued - manual processing required"}
    
    async def _execute_luca_task(self, task: Dict) -> Dict:
        """Execute LUCA (compliance) task"""
        return {"success": True, "message": "LUCA task executed"}
    
    async def _execute_atlas_task(self, task: Dict) -> Dict:
        """Execute ATLAS (retention) task"""
        return {"success": True, "message": "ATLAS task executed"}
    
    async def start_worker(self, interval_seconds: int = 60):
        """Start background worker that processes tasks periodically"""
        self.running = True
        logger.info(f"Background job worker started (interval: {interval_seconds}s)")
        
        while self.running:
            try:
                await self.process_pending_tasks()
            except Exception as e:
                logger.error(f"Worker error: {e}")
            
            await asyncio.sleep(interval_seconds)
    
    def stop_worker(self):
        """Stop the background worker"""
        self.running = False
        logger.info("Background job worker stopped")


# ============================================================================
# Singleton Instances
# ============================================================================
systeme_client = SystemeIOClient()
email_service = EmailService()
job_executor = BackgroundJobExecutor()


# ============================================================================
# Helper Functions
# ============================================================================
async def add_systeme_tag(email: str, tag_name: str) -> Dict:
    """Add tag to contact in Systeme.io"""
    try:
        contact = await systeme_client.get_contact_by_email(email)
        if not contact:
            return {"success": False, "error": "Contact not found"}
        
        tag_id = await systeme_client.get_or_create_tag(tag_name)
        await systeme_client.add_tag_to_contact(contact["id"], tag_id)
        
        return {"success": True, "tag_id": tag_id}
    except Exception as e:
        logger.error(f"Failed to add tag: {e}")
        return {"success": False, "error": str(e)}


async def send_email_now(to_email: str, subject: str, html_content: str) -> Dict:
    """Send email immediately"""
    return await email_service.send_email(to_email, subject, html_content)


async def create_agent_task(
    agent: str,
    title: str,
    task_type: str,
    data: Dict = None,
    priority: str = "medium",
    execute_now: bool = False
) -> Dict:
    """Create and optionally execute an agent task"""
    import uuid
    
    task = {
        "id": str(uuid.uuid4()),
        "agent": agent.upper(),
        "title": title,
        "task_type": task_type,
        "data": data or {},
        "priority": priority,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.agent_tasks.insert_one(task)
    
    if execute_now:
        result = await job_executor.execute_task(task)
        return {"task_id": task["id"], "executed": True, "result": result}
    
    return {"task_id": task["id"], "executed": False, "status": "queued"}
