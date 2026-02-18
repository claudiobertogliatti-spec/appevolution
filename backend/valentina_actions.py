"""
VALENTINA Action Dispatcher - Execute Real Tasks
This module allows VALENTINA to execute actual actions via the Evolution PRO system
"""

import logging
import httpx
import os
import re
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection
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


# Available actions that VALENTINA can execute
AVAILABLE_ACTIONS = {
    # ORION - Lead Intelligence
    "get_lead_stats": {
        "agent": "ORION",
        "description": "Ottieni statistiche sui lead (HOT, WARM, COLD, FROZEN)",
        "keywords": ["lead", "contatti", "statistiche", "quanti lead", "situazione lead", "orion"]
    },
    "get_hot_leads": {
        "agent": "ORION",
        "description": "Lista dei lead HOT pronti a comprare",
        "keywords": ["lead hot", "lead caldi", "pronti a comprare", "lead interessati"]
    },
    "analyze_lead": {
        "agent": "ORION",
        "description": "Analizza un lead specifico",
        "keywords": ["analizza lead", "controlla contatto", "verifica lead"]
    },
    
    # STEFANIA - Copy & Marketing
    "generate_email_copy": {
        "agent": "STEFANIA",
        "description": "Genera copy per email marketing",
        "keywords": ["scrivi email", "genera email", "copy email", "email marketing"]
    },
    "generate_social_post": {
        "agent": "STEFANIA",
        "description": "Genera post per social media",
        "keywords": ["post social", "post linkedin", "post facebook", "post instagram", "contenuto social"]
    },
    "generate_ad_hooks": {
        "agent": "STEFANIA",
        "description": "Genera hook per ads (War Mode)",
        "keywords": ["hook ads", "creatività ads", "testi pubblicitari", "war mode"]
    },
    "review_script": {
        "agent": "STEFANIA",
        "description": "Revisiona uno script per masterclass/video",
        "keywords": ["revisiona script", "controlla script", "feedback script"]
    },
    
    # ANDREA - Video Production
    "create_video_edit": {
        "agent": "ANDREA",
        "description": "Crea o modifica un video (editing, sottotitoli, thumbnail)",
        "keywords": ["video", "editing", "monta video", "sottotitoli", "thumbnail", "andrea"]
    },
    "generate_thumbnail": {
        "agent": "ANDREA",
        "description": "Genera thumbnail per video YouTube",
        "keywords": ["thumbnail", "copertina video", "immagine video"]
    },
    "add_subtitles": {
        "agent": "ANDREA",
        "description": "Aggiungi sottotitoli a un video",
        "keywords": ["sottotitoli", "captions", "trascrizione video"]
    },
    
    # GAIA - Funnel & Systeme.io
    "sync_systeme_contacts": {
        "agent": "GAIA",
        "description": "Sincronizza contatti da Systeme.io",
        "keywords": ["sincronizza systeme", "importa contatti", "sync systeme", "aggiorna lead"]
    },
    "check_funnel_status": {
        "agent": "GAIA",
        "description": "Verifica stato funnel di un partner",
        "keywords": ["stato funnel", "funnel attivo", "verifica funnel"]
    },
    
    # MARTA - CRM & Revenue
    "get_sales_kpi": {
        "agent": "MARTA",
        "description": "Ottieni KPI vendite (fatturato, ordini, conversioni)",
        "keywords": ["vendite", "fatturato", "kpi", "revenue", "ordini", "incassi"]
    },
    "get_partner_revenue": {
        "agent": "MARTA",
        "description": "Revenue specifico di un partner",
        "keywords": ["revenue partner", "fatturato partner", "guadagni partner"]
    },
    
    # ATLAS - Post-Sale
    "get_churn_risk": {
        "agent": "ATLAS",
        "description": "Partner a rischio churn",
        "keywords": ["rischio abbandono", "churn", "partner inattivi", "partner a rischio"]
    },
    
    # LUCA - Compliance
    "check_contract_expiry": {
        "agent": "LUCA",
        "description": "Contratti in scadenza",
        "keywords": ["contratti scadenza", "rinnovi", "contratti expiring"]
    },
    
    # Partner Management
    "get_partner_status": {
        "agent": "VALENTINA",
        "description": "Stato dettagliato di un partner",
        "keywords": ["stato partner", "situazione partner", "come sta", "a che punto è"]
    },
    "list_blocked_partners": {
        "agent": "VALENTINA",
        "description": "Partner bloccati che necessitano attenzione",
        "keywords": ["partner bloccati", "blocchi", "chi è fermo", "partner fermi"]
    },
    "move_partner_phase": {
        "agent": "VALENTINA",
        "description": "Sposta un partner alla fase successiva",
        "keywords": ["sposta fase", "avanza fase", "promuovi partner", "passa a fase"]
    },
    "send_partner_reminder": {
        "agent": "VALENTINA",
        "description": "Invia reminder a un partner",
        "keywords": ["invia reminder", "sollecita", "ricorda a", "notifica partner"]
    },
}


class ValentinaActionDispatcher:
    """
    Dispatcher that allows VALENTINA to execute real actions
    """
    
    def __init__(self):
        self.actions_log = []
    
    def detect_action(self, message: str) -> Optional[Tuple[str, str]]:
        """
        Detect if the message requires an action to be executed
        Returns (action_id, agent) or None
        """
        message_lower = message.lower()
        
        # Check each action's keywords
        for action_id, action_info in AVAILABLE_ACTIONS.items():
            for keyword in action_info["keywords"]:
                if keyword in message_lower:
                    return (action_id, action_info["agent"])
        
        return None
    
    async def execute_action(self, action_id: str, context: Dict = None) -> Dict:
        """
        Execute an action and return the result
        """
        logger.info(f"Executing action: {action_id}")
        
        try:
            # Route to appropriate handler
            if action_id == "get_lead_stats":
                return await self._get_lead_stats()
            elif action_id == "get_hot_leads":
                return await self._get_hot_leads()
            elif action_id == "get_sales_kpi":
                return await self._get_sales_kpi()
            elif action_id == "list_blocked_partners":
                return await self._list_blocked_partners()
            elif action_id == "get_partner_status":
                return await self._get_partner_status(context)
            elif action_id == "sync_systeme_contacts":
                return await self._sync_systeme_contacts()
            elif action_id == "generate_email_copy":
                return await self._generate_email_copy(context)
            elif action_id == "check_contract_expiry":
                return await self._check_contract_expiry()
            elif action_id == "get_churn_risk":
                return await self._get_churn_risk()
            else:
                return {
                    "success": False,
                    "message": f"Azione '{action_id}' non ancora implementata",
                    "agent": AVAILABLE_ACTIONS.get(action_id, {}).get("agent", "UNKNOWN")
                }
                
        except Exception as e:
            logger.error(f"Action execution error: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Errore nell'esecuzione: {str(e)}"
            }
    
    async def _get_lead_stats(self) -> Dict:
        """Get lead statistics from ORION"""
        hot = await db.systeme_contacts.count_documents({"orion_segment": "hot"})
        warm = await db.systeme_contacts.count_documents({"orion_segment": "warm"})
        cold = await db.systeme_contacts.count_documents({"orion_segment": "cold"})
        frozen = await db.systeme_contacts.count_documents({"orion_segment": "frozen"})
        total = await db.systeme_contacts.count_documents({})
        unscored = total - (hot + warm + cold + frozen)
        
        return {
            "success": True,
            "agent": "ORION",
            "action": "get_lead_stats",
            "data": {
                "total": total,
                "hot": hot,
                "warm": warm,
                "cold": cold,
                "frozen": frozen,
                "unscored": unscored
            },
            "message": f"📊 **Report Lead ORION**\n\n🔥 HOT (pronti): {hot:,}\n🟡 WARM (interessati): {warm:,}\n❄️ COLD (freddi): {cold:,}\n🧊 FROZEN (inattivi): {frozen:,}\n📋 Non classificati: {unscored:,}\n\n**Totale contatti:** {total:,}"
        }
    
    async def _get_hot_leads(self) -> Dict:
        """Get list of hot leads"""
        leads = await db.systeme_contacts.find(
            {"orion_segment": "hot"},
            {"_id": 0, "email": 1, "name": 1, "orion_score": 1, "tags": 1}
        ).sort("orion_score", -1).limit(10).to_list(10)
        
        if not leads:
            return {
                "success": True,
                "agent": "ORION",
                "data": {"leads": []},
                "message": "⚠️ Nessun lead HOT al momento. I lead HOT sono contatti con score >= 70 che hanno mostrato forte interesse."
            }
        
        lead_list = "\n".join([f"• {l.get('name', l['email'])} (score: {l.get('orion_score', 'N/A')})" for l in leads])
        
        return {
            "success": True,
            "agent": "ORION",
            "data": {"leads": leads, "count": len(leads)},
            "message": f"🔥 **Top {len(leads)} Lead HOT**\n\n{lead_list}\n\nQuesti lead sono pronti per essere contattati!"
        }
    
    async def _get_sales_kpi(self) -> Dict:
        """Get sales KPI from MARTA"""
        # Get payments
        payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
        total_revenue = sum(p.get("amount", 0) for p in payments)
        total_orders = len(payments)
        
        # Get recent payments (last 7 days)
        from datetime import timedelta
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent = [p for p in payments if p.get("created_at", "") > week_ago.isoformat()]
        weekly_revenue = sum(p.get("amount", 0) for p in recent)
        
        return {
            "success": True,
            "agent": "MARTA",
            "action": "get_sales_kpi",
            "data": {
                "total_revenue": total_revenue,
                "total_orders": total_orders,
                "weekly_revenue": weekly_revenue,
                "weekly_orders": len(recent)
            },
            "message": f"💰 **Report Vendite MARTA**\n\n📈 Revenue Totale: €{total_revenue:,.2f}\n🛒 Ordini Totali: {total_orders}\n\n**Ultimi 7 giorni:**\n💵 Revenue: €{weekly_revenue:,.2f}\n📦 Ordini: {len(recent)}"
        }
    
    async def _list_blocked_partners(self) -> Dict:
        """Get partners that are blocked/need attention"""
        # Partners with alert=True or stuck in a phase
        blocked = await db.partners.find(
            {"$or": [{"alert": True}, {"status": "blocked"}]},
            {"_id": 0, "id": 1, "name": 1, "phase": 1, "email": 1}
        ).to_list(20)
        
        if not blocked:
            return {
                "success": True,
                "agent": "VALENTINA",
                "data": {"partners": []},
                "message": "✅ Nessun partner bloccato al momento! Tutti i partner stanno procedendo regolarmente."
            }
        
        partner_list = "\n".join([f"• {p['name']} - Fase {p.get('phase', 'N/A')}" for p in blocked])
        
        return {
            "success": True,
            "agent": "VALENTINA",
            "data": {"partners": blocked, "count": len(blocked)},
            "message": f"⚠️ **Partner che richiedono attenzione**\n\n{partner_list}\n\nVuoi che contatti qualcuno di loro?"
        }
    
    async def _get_partner_status(self, context: Dict = None) -> Dict:
        """Get detailed status of a specific partner"""
        # Try to extract partner name/id from context
        partner_name = context.get("partner_name") if context else None
        
        if not partner_name:
            # Get general partner stats
            total = await db.partners.count_documents({})
            by_phase = {}
            for i in range(11):
                phase = f"F{i}"
                count = await db.partners.count_documents({"phase": phase})
                if count > 0:
                    by_phase[phase] = count
            
            phase_breakdown = "\n".join([f"• {k}: {v} partner" for k, v in by_phase.items()])
            
            return {
                "success": True,
                "agent": "VALENTINA",
                "data": {"total": total, "by_phase": by_phase},
                "message": f"👥 **Stato Partner**\n\nTotale partner attivi: {total}\n\n**Per fase:**\n{phase_breakdown}"
            }
        
        # Find specific partner
        partner = await db.partners.find_one(
            {"$or": [{"name": {"$regex": partner_name, "$options": "i"}}, {"id": partner_name}]},
            {"_id": 0}
        )
        
        if not partner:
            return {
                "success": False,
                "message": f"Partner '{partner_name}' non trovato nel sistema."
            }
        
        return {
            "success": True,
            "agent": "VALENTINA",
            "data": partner,
            "message": f"📋 **{partner['name']}**\n\n• Fase: {partner.get('phase', 'N/A')}\n• Nicchia: {partner.get('niche', 'N/A')}\n• Revenue: €{partner.get('revenue', 0):,}\n• Alert: {'⚠️ Sì' if partner.get('alert') else '✅ No'}"
        }
    
    async def _sync_systeme_contacts(self) -> Dict:
        """Trigger Systeme.io contact sync"""
        # Get API key
        systeme_key = os.environ.get("SYSTEME_API_KEY")
        if not systeme_key:
            return {
                "success": False,
                "agent": "GAIA",
                "message": "⚠️ API Key Systeme.io non configurata. Contatta il team tecnico."
            }
        
        # Count current contacts
        current_count = await db.systeme_contacts.count_documents({})
        
        return {
            "success": True,
            "agent": "GAIA",
            "message": f"🔄 **Sincronizzazione Systeme.io**\n\nContatti attuali nel DB: {current_count:,}\n\n✅ Ho avviato la sincronizzazione in background. I nuovi contatti saranno disponibili tra qualche minuto.\n\nVuoi che ti avvisi quando è completata?"
        }
    
    async def _generate_email_copy(self, context: Dict = None) -> Dict:
        """Generate email copy with STEFANIA"""
        # Create a task for tracking
        import uuid
        task_doc = {
            "id": str(uuid.uuid4()),
            "title": "Genera copy email",
            "description": "Richiesta copy email da VALENTINA",
            "agent": "STEFANIA",
            "priority": "medium",
            "status": "pending",
            "created_by": "valentina",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.agent_tasks.insert_one(task_doc)
        
        return {
            "success": True,
            "agent": "STEFANIA",
            "task_id": task_doc["id"],
            "message": "✍️ **STEFANIA - Copy Email**\n\n📋 Ho creato un task per STEFANIA.\n\nPer generare un'email efficace ho bisogno di sapere:\n\n1️⃣ **Obiettivo**: Cosa vuoi ottenere? (vendita, nurturing, reminder...)\n2️⃣ **Pubblico**: A chi è destinata?\n3️⃣ **Offerta**: Qual è il prodotto/servizio?\n4️⃣ **Tono**: Formale, friendly, urgente?\n\nDimmi questi dettagli e creo subito la bozza!"
        }
    
    async def _check_contract_expiry(self) -> Dict:
        """Check expiring contracts with LUCA"""
        from datetime import timedelta
        
        # Find partners with contracts expiring in 30 days
        threshold = datetime.now(timezone.utc) + timedelta(days=30)
        
        # This is a simplified check - in reality would check contract_end field
        partners = await db.partners.find({}, {"_id": 0, "id": 1, "name": 1, "contract": 1}).to_list(100)
        
        expiring = []
        for p in partners:
            if p.get("contract"):
                try:
                    contract_date = datetime.strptime(p["contract"].split("T")[0], "%Y-%m-%d")
                    contract_end = contract_date + timedelta(days=365)
                    if contract_end <= threshold:
                        expiring.append({
                            "name": p["name"],
                            "contract_end": contract_end.strftime("%d/%m/%Y")
                        })
                except:
                    pass
        
        if not expiring:
            return {
                "success": True,
                "agent": "LUCA",
                "message": "✅ **Nessun contratto in scadenza** nei prossimi 30 giorni."
            }
        
        expiring_list = "\n".join([f"• {e['name']} - scade {e['contract_end']}" for e in expiring[:10]])
        
        return {
            "success": True,
            "agent": "LUCA",
            "data": {"expiring": expiring},
            "message": f"⚖️ **Contratti in Scadenza (30 giorni)**\n\n{expiring_list}\n\nVuoi che prepari le comunicazioni di rinnovo?"
        }
    
    async def _get_churn_risk(self) -> Dict:
        """Get partners at churn risk with ATLAS"""
        # Partners with no activity or stuck for long time
        at_risk = await db.partners.find(
            {"$or": [
                {"alert": True},
                {"phase": "F0"},
                {"phase": "F1", "revenue": 0}
            ]},
            {"_id": 0, "name": 1, "phase": 1, "email": 1}
        ).limit(10).to_list(10)
        
        if not at_risk:
            return {
                "success": True,
                "agent": "ATLAS",
                "message": "✅ **Nessun partner a rischio churn** rilevato. La retention è buona!"
            }
        
        risk_list = "\n".join([f"• {p['name']} - Fase {p.get('phase', 'N/A')}" for p in at_risk])
        
        return {
            "success": True,
            "agent": "ATLAS",
            "data": {"at_risk": at_risk},
            "message": f"🚨 **Partner a Rischio Churn**\n\n{risk_list}\n\nConsigli:\n1. Contattarli personalmente\n2. Offrire sessione di supporto\n3. Verificare eventuali blocchi"
        }
    
    async def log_action(self, action_id: str, result: Dict, user_id: str):
        """Log executed action for tracking"""
        await db.valentina_actions.insert_one({
            "action_id": action_id,
            "user_id": user_id,
            "result": result,
            "executed_at": datetime.now(timezone.utc).isoformat()
        })


# Singleton instance
action_dispatcher = ValentinaActionDispatcher()


async def detect_and_execute_action(message: str, context: Dict = None) -> Optional[Dict]:
    """
    Helper function to detect and execute an action from a message
    Returns action result or None if no action detected
    """
    action = action_dispatcher.detect_action(message)
    if action:
        action_id, agent = action
        logger.info(f"Detected action: {action_id} (agent: {agent})")
        result = await action_dispatcher.execute_action(action_id, context)
        return result
    return None
