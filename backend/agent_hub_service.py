# =============================================================================
# AGENT ANALYTICS HUB - CENTRALIZED BUSINESS INTELLIGENCE
# Evolution PRO Multi-Agent Orchestration System
# =============================================================================

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class AgentAnalyticsHub:
    """
    Central hub for all 9 Evolution PRO AI agents
    Coordinates analysis and generates unified business insights
    """
    
    # 6 Core Agents as per Evolution PRO OS architecture
    AGENTS = {
        "VALENTINA": {
            "name": "Orchestratrice",
            "category": "Partner Contact",
            "emoji": "💬",
            "metrics": ["conversations", "response_time", "satisfaction"]
        },
        "ANDREA": {
            "name": "Video Production",
            "category": "Produzione",
            "emoji": "🎬",
            "metrics": ["videos_produced", "avg_delivery_time", "quality_score"]
        },
        "MARCO": {
            "name": "Accountability",
            "category": "Accountability Settimanale",
            "emoji": "📋",
            "metrics": ["checkins_sent", "response_rate", "inactive_partners"]
        },
        "GAIA": {
            "name": "Supporto Tecnico",
            "category": "Esecuzione Tech",
            "emoji": "🔧",
            "metrics": ["tickets_resolved", "avg_resolution_time", "funnel_health"]
        },
        "STEFANIA": {
            "name": "Orchestrazione",
            "category": "Coordinamento",
            "emoji": "🎯",
            "metrics": ["routes_today", "escalations", "daily_reports"]
        },
        "MAIN": {
            "name": "Sistema Centrale",
            "category": "Coordinamento",
            "emoji": "🎛️",
            "metrics": ["total_partners", "active_funnels", "system_health"]
        }
    }
    
    def __init__(self, db):
        self.db = db
    
    async def get_agent_status(self, agent_id: str) -> Dict:
        """Get current status and metrics for a specific agent"""
        agent_info = self.AGENTS.get(agent_id)
        if not agent_info:
            return {"error": f"Agent {agent_id} not found"}
        
        # Get agent from database
        agent_data = await self.db.agents.find_one({"id": agent_id}, {"_id": 0})
        
        # Calculate agent-specific metrics
        metrics = await self._calculate_agent_metrics(agent_id)
        
        return {
            "id": agent_id,
            "info": agent_info,
            "status": agent_data.get("status", "UNKNOWN") if agent_data else "UNKNOWN",
            "budget": agent_data.get("budget", 0) if agent_data else 0,
            "metrics": metrics,
            "last_activity": agent_data.get("last_activity") if agent_data else None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _calculate_agent_metrics(self, agent_id: str) -> Dict:
        """Calculate real-time metrics for each agent"""
        metrics = {}
        
        if agent_id == "MAIN":
            metrics["total_partners"] = await self.db.partners.count_documents({})
            metrics["active_partners"] = await self.db.partners.count_documents({"status": "active"})
            metrics["total_leads"] = await self.db.leads.count_documents({})
            
        elif agent_id == "ORION":
            # Lead scoring metrics
            leads = await self.db.leads.find({}, {"score": 1}).to_list(1000)
            scores = [l.get("score", 0) for l in leads if l.get("score")]
            metrics["lead_score_avg"] = round(sum(scores) / len(scores), 1) if scores else 0
            metrics["hot_leads"] = len([s for s in scores if s >= 70])
            metrics["warm_leads"] = len([s for s in scores if 40 <= s < 70])
            metrics["cold_leads"] = len([s for s in scores if s < 40])
            
        elif agent_id == "MARCO":
            # Accountability metrics
            now = datetime.now(timezone.utc)
            week_start = now - timedelta(days=7)
            
            # Count check-ins sent this week
            checkins = await self.db.marco_checkins.count_documents({
                "created_at": {"$gte": week_start.isoformat()}
            })
            metrics["checkins_sent"] = checkins
            
            # Count inactive partners (no activity > 7 days)
            partners = await self.db.partners.find({}, {"last_activity": 1, "updated_at": 1}).to_list(500)
            inactive = 0
            for p in partners:
                last = p.get("last_activity") or p.get("updated_at")
                if last:
                    try:
                        if isinstance(last, str):
                            last = datetime.fromisoformat(last.replace("Z", "+00:00"))
                        if (now - last).days > 7:
                            inactive += 1
                    except:
                        pass
            metrics["inactive_partners"] = inactive
            metrics["response_rate"] = 0  # TODO: track responses to check-ins
            
        elif agent_id == "GAIA":
            # Technical support metrics
            tickets = await self.db.support_tickets.count_documents({})
            resolved = await self.db.support_tickets.count_documents({"status": "resolved"})
            metrics["tickets_total"] = tickets
            metrics["tickets_resolved"] = resolved
            
            # Funnel health from Systeme.io stats
            stats = await self.db.systeme_stats.find_one({"partner_id": "global"}, {"_id": 0})
            if stats:
                metrics["total_contacts"] = stats.get("total_contacts", 0)
                metrics["conversion_rate"] = stats.get("conversion_rate", 0)
                metrics["funnel_health"] = "OK" if stats.get("conversion_rate", 0) > 2 else "NEEDS_ATTENTION"
            
        elif agent_id == "ANDREA":
            # Video production metrics
            videos = await self.db.video_productions.find({}).to_list(100)
            metrics["videos_produced"] = len(videos)
            metrics["pending"] = len([v for v in videos if v.get("status") == "pending"])
            metrics["completed"] = len([v for v in videos if v.get("status") == "completed"])
            
        elif agent_id == "STEFANIA":
            # Orchestration metrics
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Routes handled today
            routes = await self.db.stefania_routes.count_documents({
                "created_at": {"$gte": today_start.isoformat()}
            })
            metrics["routes_today"] = routes
            
            # Escalations to Claudio
            escalations = await self.db.stefania_escalations.count_documents({})
            metrics["escalations"] = escalations
            
            # Daily reports generated
            reports = await self.db.stefania_reports.count_documents({})
            metrics["daily_reports"] = reports
            
        elif agent_id == "VALENTINA":
            # Conversation metrics
            conversations = await self.db.valentina_conversations.count_documents({})
            metrics["total_conversations"] = conversations
            
        return metrics
    
    async def get_all_agents_status(self) -> Dict:
        """Get status and metrics for all agents"""
        agents_status = []
        
        for agent_id in self.AGENTS.keys():
            status = await self.get_agent_status(agent_id)
            agents_status.append(status)
        
        return {
            "agents": agents_status,
            "total_agents": len(agents_status),
            "active_agents": len([a for a in agents_status if a.get("status") == "ACTIVE"]),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def get_business_summary(self) -> Dict:
        """
        Generate comprehensive business summary using the 6 core agents' insights
        """
        # Gather data from core agents
        main_metrics = await self._calculate_agent_metrics("MAIN")
        marco_metrics = await self._calculate_agent_metrics("MARCO")
        gaia_metrics = await self._calculate_agent_metrics("GAIA")
        valentina_metrics = await self._calculate_agent_metrics("VALENTINA")
        
        # Calculate health scores based on new agent structure
        accountability_health = "🟢" if marco_metrics.get("inactive_partners", 0) < 5 else "🟡" if marco_metrics.get("inactive_partners", 0) < 15 else "🔴"
        tech_health = "🟢" if gaia_metrics.get("funnel_health") == "OK" else "🟡"
        engagement_health = "🟢" if valentina_metrics.get("total_conversations", 0) > 50 else "🟡" if valentina_metrics.get("total_conversations", 0) > 10 else "🔴"
        
        return {
            "summary": {
                "total_partners": main_metrics.get("total_partners", 0),
                "active_partners": main_metrics.get("active_partners", 0),
                "mrr": 0,  # To be calculated from payments
                "avg_ltv": "2.580",  # Default LTV
            },
            "health": {
                "accountability": accountability_health,
                "tech": tech_health,
                "engagement": engagement_health,
                "overall": "🟢" if accountability_health == "🟢" and tech_health == "🟢" else "🟡"
            },
            "alerts": await self._generate_alerts(),
            "opportunities": await self._generate_opportunities_v2(marco_metrics, gaia_metrics),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _generate_alerts(self) -> List[Dict]:
        """Generate system-wide alerts based on 6 core agents"""
        alerts = []
        
        # Check for inactive partners (MARCO)
        marco_metrics = await self._calculate_agent_metrics("MARCO")
        if marco_metrics.get("inactive_partners", 0) > 0:
            alerts.append({
                "agent": "MARCO",
                "type": "warning",
                "message": f"⚠️ {marco_metrics['inactive_partners']} partner inattivi da oltre 7 giorni"
            })
        
        # Check for funnel health (GAIA)
        gaia_metrics = await self._calculate_agent_metrics("GAIA")
        if gaia_metrics.get("funnel_health") == "NEEDS_ATTENTION":
            alerts.append({
                "agent": "GAIA",
                "type": "warning",
                "message": f"⚠️ Funnel richiede attenzione - conversion rate basso"
            })
        
        # Check for pending video productions (ANDREA)
        andrea_metrics = await self._calculate_agent_metrics("ANDREA")
        if andrea_metrics.get("pending", 0) > 3:
            alerts.append({
                "agent": "ANDREA",
                "type": "info",
                "message": f"📹 {andrea_metrics['pending']} video in attesa di produzione"
            })
        
        return alerts
    
    async def _generate_opportunities_v2(self, marco: Dict, gaia: Dict) -> List[Dict]:
        """Generate opportunities based on new agent structure"""
        opportunities = []
        
        # Opportunity: Re-engage inactive partners
        inactive = marco.get("inactive_partners", 0)
        if inactive > 0:
            opportunities.append({
                "agent": "MARCO",
                "type": "reengagement",
                "message": f"🔄 {inactive} partner da riattivare con check-in",
                "potential": f"+{inactive * 500}€ potenziale"
            })
        
        # Opportunity: Improve funnel conversion
        contacts = gaia.get("total_contacts", 0)
        if contacts > 1000 and gaia.get("conversion_rate", 0) < 2:
            opportunities.append({
                "agent": "GAIA",
                "type": "optimization",
                "message": f"📈 Ottimizza funnel: {contacts:,} contatti con bassa conversione",
                "potential": "+50% conversioni possibili"
            })
        
        return opportunities
    
    async def _generate_opportunities(self, orion: Dict, marta: Dict) -> List[Dict]:
        """Legacy function - kept for compatibility"""
        return []


# Singleton instance
agent_hub = None

def init_agent_hub(db):
    global agent_hub
    agent_hub = AgentAnalyticsHub(db)
    return agent_hub
