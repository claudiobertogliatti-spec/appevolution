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
        Generate comprehensive business summary using all agents' insights
        """
        # Gather data from all agents
        main_metrics = await self._calculate_agent_metrics("MAIN")
        orion_metrics = await self._calculate_agent_metrics("ORION")
        marta_metrics = await self._calculate_agent_metrics("MARTA")
        atlas_metrics = await self._calculate_agent_metrics("ATLAS")
        
        # Calculate health scores
        lead_health = "🟢" if orion_metrics.get("hot_leads", 0) > 10 else "🟡" if orion_metrics.get("hot_leads", 0) > 0 else "🔴"
        revenue_health = "🟢" if marta_metrics.get("mrr", 0) > 1000 else "🟡" if marta_metrics.get("mrr", 0) > 0 else "🔴"
        retention_health = "🟢" if atlas_metrics.get("churn_risk_count", 0) < 5 else "🟡" if atlas_metrics.get("churn_risk_count", 0) < 15 else "🔴"
        
        return {
            "summary": {
                "total_partners": main_metrics.get("total_partners", 0),
                "total_leads": main_metrics.get("total_leads", 0),
                "mrr": marta_metrics.get("mrr", 0),
                "avg_ltv": atlas_metrics.get("avg_ltv", 0),
                "hot_leads": orion_metrics.get("hot_leads", 0),
            },
            "health": {
                "leads": lead_health,
                "revenue": revenue_health,
                "retention": retention_health,
                "overall": "🟢" if lead_health == "🟢" and revenue_health == "🟢" else "🟡"
            },
            "alerts": await self._generate_alerts(),
            "opportunities": await self._generate_opportunities(orion_metrics, marta_metrics),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _generate_alerts(self) -> List[Dict]:
        """Generate system-wide alerts"""
        alerts = []
        
        # Check for expiring contracts
        luca_metrics = await self._calculate_agent_metrics("LUCA")
        if luca_metrics.get("expiring_30_days", 0) > 0:
            alerts.append({
                "agent": "LUCA",
                "type": "warning",
                "message": f"⚠️ {luca_metrics['expiring_30_days']} contratti in scadenza nei prossimi 30 giorni"
            })
        
        # Check for stuck partners
        atlas_metrics = await self._calculate_agent_metrics("ATLAS")
        if atlas_metrics.get("churn_risk_count", 0) > 5:
            alerts.append({
                "agent": "ATLAS",
                "type": "warning",
                "message": f"⚠️ {atlas_metrics['churn_risk_count']} partner fermi in fase iniziale (rischio churn)"
            })
        
        # Check for pending video productions
        andrea_metrics = await self._calculate_agent_metrics("ANDREA")
        if andrea_metrics.get("pending", 0) > 3:
            alerts.append({
                "agent": "ANDREA",
                "type": "info",
                "message": f"📹 {andrea_metrics['pending']} video in attesa di produzione"
            })
        
        return alerts
    
    async def _generate_opportunities(self, orion: Dict, marta: Dict) -> List[Dict]:
        """Generate revenue opportunities"""
        opportunities = []
        
        hot_leads = orion.get("hot_leads", 0)
        if hot_leads > 0:
            potential = hot_leads * 7 * 0.2  # 20% conversion on €7 tripwire
            opportunities.append({
                "agent": "ORION",
                "type": "revenue",
                "message": f"🔥 {hot_leads} lead HOT pronti per offerta tripwire",
                "potential": f"€{potential:.0f}+"
            })
        
        warm_leads = orion.get("warm_leads", 0)
        if warm_leads > 0:
            potential = warm_leads * 7 * 0.08  # 8% after nurturing
            opportunities.append({
                "agent": "ORION",
                "type": "nurture",
                "message": f"🟡 {warm_leads} lead WARM da nurturare",
                "potential": f"€{potential:.0f}+"
            })
        
        return opportunities


# Singleton instance
agent_hub = None

def init_agent_hub(db):
    global agent_hub
    agent_hub = AgentAnalyticsHub(db)
    return agent_hub
