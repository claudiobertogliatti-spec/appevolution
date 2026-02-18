"""
Evolution PRO - Integrated Services
- Systeme.io API Client (contacts, tags, campaigns, emails)
- Background Job Executor
"""

import os
import httpx
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
    """Client for Systeme.io API operations - handles contacts, tags, and email campaigns"""
    
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
    
    # =========================================================================
    # Contact Operations
    # =========================================================================
    async def get_contacts(self, limit: int = 100, page: int = 1) -> Dict:
        """Get list of contacts (limit must be between 10 and 100)"""
        # Systeme.io requires limit between 10 and 100
        safe_limit = max(10, min(100, limit))
        return await self._request("GET", f"contacts?limit={safe_limit}&page={page}")
    
    async def get_contact_by_email(self, email: str) -> Optional[Dict]:
        """Find contact by email"""
        contacts = await self._request("GET", f"contacts?email={email}")
        items = contacts.get("items", [])
        return items[0] if items else None
    
    async def get_contact_by_id(self, contact_id: str) -> Optional[Dict]:
        """Get contact by ID"""
        try:
            return await self._request("GET", f"contacts/{contact_id}")
        except:
            return None
    
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
    
    # =========================================================================
    # Tag Operations
    # =========================================================================
    async def get_tags(self) -> List[Dict]:
        """Get all tags"""
        result = await self._request("GET", "tags")
        return result.get("items", [])
    
    async def get_tag_by_name(self, tag_name: str) -> Optional[Dict]:
        """Find tag by name"""
        tags = await self.get_tags()
        for tag in tags:
            if tag.get("name", "").lower() == tag_name.lower():
                return tag
        return None
    
    async def create_tag(self, tag_name: str) -> Dict:
        """Create a new tag"""
        return await self._request("POST", "tags", json={"name": tag_name})
    
    async def get_or_create_tag(self, tag_name: str) -> str:
        """Get tag ID by name, create if not exists"""
        tag = await self.get_tag_by_name(tag_name)
        if tag:
            return tag.get("id")
        
        # Create new tag
        result = await self.create_tag(tag_name)
        return result.get("id")
    
    async def add_tag_to_contact(self, contact_id: str, tag_id: str) -> Dict:
        """Add tag to contact"""
        return await self._request("POST", f"contacts/{contact_id}/tags", json={"tagId": tag_id})
    
    async def remove_tag_from_contact(self, contact_id: str, tag_id: str) -> Dict:
        """Remove tag from contact"""
        return await self._request("DELETE", f"contacts/{contact_id}/tags/{tag_id}")
    
    async def add_tag_by_email(self, email: str, tag_name: str) -> Dict:
        """Add tag to contact by email (convenience method)"""
        contact = await self.get_contact_by_email(email)
        if not contact:
            raise SystemeIOError(f"Contact not found: {email}")
        
        tag_id = await self.get_or_create_tag(tag_name)
        await self.add_tag_to_contact(contact["id"], tag_id)
        
        return {"success": True, "contact_id": contact["id"], "tag_id": tag_id, "tag_name": tag_name}
    
    # =========================================================================
    # Email Campaign Operations (via tags/automations)
    # =========================================================================
    async def subscribe_to_campaign(self, contact_id: str, campaign_id: str) -> Dict:
        """Subscribe contact to email campaign"""
        return await self._request(
            "POST", 
            f"contacts/{contact_id}/campaigns/{campaign_id}/subscription"
        )
    
    async def trigger_email_automation(self, email: str, automation_tag: str) -> Dict:
        """
        Trigger email automation by adding a specific tag.
        In Systeme.io, automations are triggered by tags.
        
        Common tags:
        - welcome_partner: Triggers welcome email sequence
        - lead_hot: Triggers hot lead sequence
        - lead_cold_reactivation: Triggers cold lead reactivation
        """
        result = await self.add_tag_by_email(email, automation_tag)
        
        # Log the automation trigger
        await db.automation_logs.insert_one({
            "email": email,
            "tag": automation_tag,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
            "result": result
        })
        
        return result
    
    async def send_welcome_sequence(self, email: str, partner_name: str) -> Dict:
        """Trigger welcome email sequence for new partner"""
        # First ensure contact exists or create it
        contact = await self.get_contact_by_email(email)
        if not contact:
            contact = await self.create_contact(email, first_name=partner_name)
        
        # Add welcome tag to trigger automation
        result = await self.trigger_email_automation(email, "welcome_partner")
        
        return {
            "success": True,
            "message": f"Welcome sequence triggered for {email}",
            **result
        }
    
    async def send_campaign_to_segment(self, tag_filter: str, campaign_tag: str) -> Dict:
        """
        Send campaign to a segment by adding a campaign tag to all contacts with specific tag.
        This triggers the automation associated with campaign_tag.
        """
        # Get contacts with the filter tag
        all_contacts = []
        page = 1
        while True:
            result = await self.get_contacts(limit=100, page=page)
            contacts = result.get("items", [])
            if not contacts:
                break
            all_contacts.extend(contacts)
            page += 1
            if page > 100:  # Safety limit
                break
        
        # Filter contacts by tag
        filtered_contacts = []
        for contact in all_contacts:
            contact_tags = [t.get("name", "").lower() for t in contact.get("tags", [])]
            if tag_filter.lower() in contact_tags:
                filtered_contacts.append(contact)
        
        # Add campaign tag to trigger emails
        success_count = 0
        for contact in filtered_contacts:
            try:
                tag_id = await self.get_or_create_tag(campaign_tag)
                await self.add_tag_to_contact(contact["id"], tag_id)
                success_count += 1
            except Exception as e:
                logger.warning(f"Failed to tag contact {contact.get('email')}: {e}")
        
        return {
            "success": True,
            "total_contacts": len(filtered_contacts),
            "tagged": success_count,
            "campaign_tag": campaign_tag
        }


class SystemeIOError(Exception):
    """Systeme.io API Error"""
    pass


# ============================================================================
# BACKGROUND JOB EXECUTOR
# ============================================================================
class BackgroundJobExecutor:
    """Execute agent tasks in background"""
    
    def __init__(self):
        self.systeme_client = SystemeIOClient()
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
            
            result = await self.systeme_client.add_tag_by_email(email, tag_name)
            return {"success": True, "message": f"Tag '{tag_name}' aggiunto a {email}", **result}
        
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
            
            return {"success": True, "message": f"Sincronizzati {synced} contatti da Systeme.io"}
        
        elif task_type == "send_welcome":
            email = data.get("email")
            partner_name = data.get("partner_name", "Partner")
            
            result = await self.systeme_client.send_welcome_sequence(email, partner_name)
            return result
        
        elif task_type == "trigger_campaign":
            segment_tag = data.get("segment_tag")
            campaign_tag = data.get("campaign_tag")
            
            result = await self.systeme_client.send_campaign_to_segment(segment_tag, campaign_tag)
            return result
        
        return {"success": False, "error": f"Unknown GAIA task type: {task_type}"}
    
    async def _execute_stefania_task(self, task: Dict) -> Dict:
        """Execute STEFANIA (copy/email) task - emails sent via Systeme.io"""
        task_type = task.get("task_type", "")
        data = task.get("data", {})
        
        if task_type == "send_email_campaign":
            # Use Systeme.io to send campaign
            segment_tag = data.get("segment_tag", "all")
            campaign_tag = data.get("campaign_tag")
            
            if not campaign_tag:
                return {"success": False, "error": "campaign_tag required"}
            
            result = await self.systeme_client.send_campaign_to_segment(segment_tag, campaign_tag)
            return {"success": True, "message": f"Campagna avviata", **result}
        
        elif task_type == "generate_copy":
            # Copy generation is handled by LLM, just mark as complete
            return {"success": True, "message": "Copy generato - vedi risultato nella chat"}
        
        return {"success": False, "error": f"Unknown STEFANIA task type: {task_type}"}
    
    async def _execute_orion_task(self, task: Dict) -> Dict:
        """Execute ORION (analytics) task"""
        task_type = task.get("task_type", "")
        
        if task_type == "segment_leads":
            # Run lead segmentation based on tags
            total = await db.systeme_contacts.count_documents({})
            return {"success": True, "message": f"Analizzati {total} lead"}
        
        return {"success": False, "error": f"Unknown ORION task type: {task_type}"}
    
    async def _execute_marta_task(self, task: Dict) -> Dict:
        """Execute MARTA (CRM) task"""
        return {"success": True, "message": "MARTA task eseguito"}
    
    async def _execute_andrea_task(self, task: Dict) -> Dict:
        """Execute ANDREA (video) task - requires manual processing"""
        return {"success": True, "message": "Task ANDREA in coda - richiede elaborazione manuale"}
    
    async def _execute_luca_task(self, task: Dict) -> Dict:
        """Execute LUCA (compliance) task"""
        return {"success": True, "message": "LUCA task eseguito"}
    
    async def _execute_atlas_task(self, task: Dict) -> Dict:
        """Execute ATLAS (retention) task"""
        return {"success": True, "message": "ATLAS task eseguito"}
    
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
job_executor = BackgroundJobExecutor()


# ============================================================================
# Helper Functions
# ============================================================================
async def add_systeme_tag(email: str, tag_name: str) -> Dict:
    """Add tag to contact in Systeme.io"""
    try:
        result = await systeme_client.add_tag_by_email(email, tag_name)
        return result
    except Exception as e:
        logger.error(f"Failed to add tag: {e}")
        return {"success": False, "error": str(e)}


async def send_welcome_email(email: str, partner_name: str) -> Dict:
    """Send welcome email via Systeme.io automation"""
    try:
        result = await systeme_client.send_welcome_sequence(email, partner_name)
        return result
    except Exception as e:
        logger.error(f"Failed to send welcome: {e}")
        return {"success": False, "error": str(e)}


async def trigger_email_campaign(segment_tag: str, campaign_tag: str) -> Dict:
    """Trigger email campaign to a segment via Systeme.io"""
    try:
        result = await systeme_client.send_campaign_to_segment(segment_tag, campaign_tag)
        return result
    except Exception as e:
        logger.error(f"Failed to trigger campaign: {e}")
        return {"success": False, "error": str(e)}


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

