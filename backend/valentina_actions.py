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
# scope: "internal" = solo admin/Claudio, "external" = partner, "both" = entrambi
AVAILABLE_ACTIONS = {
    # =========================================================================
    # ORION - Lead Intelligence (INTERNAL ONLY - Admin vede tutti i lead)
    # =========================================================================
    "get_lead_stats": {
        "agent": "ORION",
        "scope": "internal",
        "description": "Ottieni statistiche sui lead (HOT, WARM, COLD, FROZEN)",
        "keywords": ["lead", "contatti", "statistiche", "quanti lead", "situazione lead", "orion", "report lead"]
    },
    "get_hot_leads": {
        "agent": "ORION",
        "scope": "internal",
        "description": "Lista dei lead HOT pronti a comprare",
        "keywords": ["lead hot", "lead caldi", "pronti a comprare", "lead interessati", "chi è pronto"]
    },
    "analyze_lead": {
        "agent": "ORION",
        "scope": "internal",
        "description": "Analizza un lead specifico per email",
        "keywords": ["analizza lead", "controlla contatto", "verifica lead", "cerca contatto", "trova lead", "info su"]
    },
    "get_leads_to_reactivate": {
        "agent": "ORION",
        "scope": "internal",
        "description": "Identifica lead COLD/FROZEN da riattivare",
        "keywords": ["riattivare", "riattivazione", "lead freddi", "lead inattivi", "recuperare lead", "wake up", "svegliare"]
    },
    "get_lead_trends": {
        "agent": "ORION",
        "scope": "internal",
        "description": "Mostra trend e statistiche degli ultimi giorni",
        "keywords": ["trend", "andamento", "ultimi giorni", "questa settimana", "evoluzione lead", "storico"]
    },
    "get_segment_details": {
        "agent": "ORION",
        "scope": "internal",
        "description": "Dettagli approfonditi di un segmento specifico",
        "keywords": ["dettagli segmento", "approfondisci", "analisi segmento", "breakdown", "scomponi"]
    },
    "get_conversion_potential": {
        "agent": "ORION",
        "scope": "internal",
        "description": "Calcola il potenziale di conversione e revenue stimato",
        "keywords": ["potenziale", "conversione", "revenue stimato", "quanto posso guadagnare", "previsione", "forecast"]
    },
    
    # =========================================================================
    # STEFANIA - Copy & Marketing
    # =========================================================================
    "generate_email_copy": {
        "agent": "STEFANIA",
        "scope": "internal",  # Solo admin può generare campagne email bulk
        "description": "Genera copy per email marketing",
        "keywords": ["scrivi email", "genera email", "copy email", "email marketing"]
    },
    "generate_social_post": {
        "agent": "STEFANIA",
        "scope": "both",  # Partner può chiedere aiuto per i suoi post
        "description": "Genera post per social media",
        "keywords": ["post social", "post linkedin", "post facebook", "post instagram", "contenuto social"]
    },
    "generate_ad_hooks": {
        "agent": "STEFANIA",
        "scope": "internal",  # War Mode è solo per admin
        "description": "Genera hook per ads (War Mode)",
        "keywords": ["hook ads", "creatività ads", "testi pubblicitari", "war mode"]
    },
    "review_script": {
        "agent": "STEFANIA",
        "scope": "both",  # Partner può chiedere revisione del suo script
        "description": "Revisiona uno script per masterclass/video",
        "keywords": ["revisiona script", "controlla script", "feedback script"]
    },
    "generate_course_structure": {
        "agent": "STEFANIA",
        "scope": "external",  # Specifico per partner in F2
        "phases": ["F2"],
        "description": "Genera struttura del corso per il partner",
        "keywords": ["struttura corso", "outline", "moduli corso", "posizionamento"]
    },
    "generate_masterclass_blocks": {
        "agent": "STEFANIA",
        "scope": "external",  # Specifico per partner in F3
        "phases": ["F3"],
        "description": "Genera i 6 blocchi della masterclass",
        "keywords": ["masterclass", "blocchi", "copy masterclass", "6 blocchi"]
    },
    
    # =========================================================================
    # GAIA - Systeme.io Operations
    # =========================================================================
    "add_systeme_tag": {
        "agent": "GAIA",
        "scope": "internal",
        "description": "Aggiungi tag a un contatto su Systeme.io",
        "keywords": ["aggiungi tag", "aggiungi il tag", "aggiungi un tag", "add tag", "taggare", "tag contatto", "metti tag", "metti il tag", "applica tag", "applica il tag"]
    },
    "trigger_email_campaign": {
        "agent": "GAIA",
        "scope": "internal",
        "description": "Trigger campagna email su un segmento via tag",
        "keywords": ["campagna email", "invia email", "email campaign", "riattivazione email", "manda email"]
    },
    "sync_systeme_contacts": {
        "agent": "GAIA",
        "scope": "internal",
        "description": "Sincronizza contatti da Systeme.io",
        "keywords": ["sincronizza systeme", "importa contatti", "sync systeme", "aggiorna lead", "sincronizza contatti"]
    },
    "check_funnel_status": {
        "agent": "GAIA",
        "scope": "both",
        "description": "Verifica stato funnel di un partner",
        "keywords": ["stato funnel", "funnel attivo", "verifica funnel"]
    },
    "setup_systeme_account": {
        "agent": "GAIA",
        "scope": "external",
        "phases": ["F6"],
        "description": "Guida setup sub-account Systeme.io del partner",
        "keywords": ["configura systeme", "setup systeme", "sub-account", "accademia"]
    },
    
    # =========================================================================
    # ANDREA - Video Production
    # =========================================================================
    "create_video_edit": {
        "agent": "ANDREA",
        "scope": "both",
        "description": "Crea o modifica un video (editing, sottotitoli, thumbnail)",
        "keywords": ["video", "editing", "monta video", "sottotitoli", "thumbnail", "andrea"]
    },
    "generate_thumbnail": {
        "agent": "ANDREA",
        "scope": "both",
        "description": "Genera thumbnail per video YouTube",
        "keywords": ["thumbnail", "copertina video", "immagine video"]
    },
    "add_subtitles": {
        "agent": "ANDREA",
        "scope": "both",
        "description": "Aggiungi sottotitoli a un video",
        "keywords": ["sottotitoli", "captions", "trascrizione video"]
    },
    "get_recording_checklist": {
        "agent": "ANDREA",
        "scope": "external",
        "phases": ["F5"],
        "description": "Ottieni checklist per registrazione video",
        "keywords": ["checklist registrazione", "come registrare", "setup video", "consigli registrazione"]
    },
    
    # =========================================================================
    # MARTA - CRM & Revenue
    # =========================================================================
    "get_sales_kpi": {
        "agent": "MARTA",
        "scope": "internal",  # KPI globali solo per admin
        "description": "Ottieni KPI vendite (fatturato, ordini, conversioni)",
        "keywords": ["vendite", "fatturato", "kpi", "revenue", "ordini", "incassi"]
    },
    "get_partner_revenue": {
        "agent": "MARTA",
        "scope": "both",  # Admin vede tutti, partner vede il suo
        "description": "Revenue specifico di un partner",
        "keywords": ["revenue partner", "fatturato partner", "guadagni partner", "mie vendite"]
    },
    "get_pipeline_status": {
        "agent": "MARTA",
        "scope": "internal",  # Pipeline globale solo per admin
        "description": "Stato pipeline commerciale",
        "keywords": ["pipeline", "stato commerciale", "opportunità", "deals"]
    },
    "create_payment_link": {
        "agent": "MARTA",
        "scope": "internal",  # Solo admin crea link pagamento
        "description": "Crea link di pagamento Stripe",
        "keywords": ["link pagamento", "stripe", "checkout", "paga"]
    },
    
    # =========================================================================
    # ATLAS - Post-Sale
    # =========================================================================
    "get_churn_risk": {
        "agent": "ATLAS",
        "scope": "internal",  # Solo admin vede rischio churn
        "description": "Partner a rischio churn",
        "keywords": ["rischio abbandono", "churn", "partner inattivi", "partner a rischio"]
    },
    "get_my_progress": {
        "agent": "ATLAS",
        "scope": "external",
        "description": "Mostra progresso del partner nel percorso",
        "keywords": ["mio progresso", "a che punto sono", "stato percorso", "come sto andando"]
    },
    
    # =========================================================================
    # LUCA - Compliance
    # =========================================================================
    "check_contract_expiry": {
        "agent": "LUCA",
        "scope": "internal",  # Solo admin vede scadenze contratti
        "description": "Contratti in scadenza",
        "keywords": ["contratti scadenza", "rinnovi", "contratti expiring"]
    },
    "check_my_contract": {
        "agent": "LUCA",
        "scope": "external",
        "description": "Mostra dettagli contratto del partner",
        "keywords": ["mio contratto", "vedi contratto", "scadenza contratto", "dettagli accordo"]
    },
    "check_onboarding_docs": {
        "agent": "LUCA",
        "scope": "external",
        "phases": ["F0"],
        "description": "Verifica stato documenti onboarding",
        "keywords": ["documenti", "stato documenti", "upload documenti", "contratto firmato"]
    },
    
    # =========================================================================
    # VALENTINA - Partner Management
    # =========================================================================
    "get_partner_status": {
        "agent": "VALENTINA",
        "scope": "internal",  # Admin vede status di tutti
        "description": "Stato dettagliato di un partner",
        "keywords": ["stato partner", "situazione partner", "come sta", "a che punto è"]
    },
    "list_blocked_partners": {
        "agent": "VALENTINA",
        "scope": "internal",  # Solo admin vede partner bloccati
        "description": "Partner bloccati che necessitano attenzione",
        "keywords": ["partner bloccati", "blocchi", "chi è fermo", "partner fermi"]
    },
    "get_my_status": {
        "agent": "VALENTINA",
        "scope": "external",
        "description": "Mostra stato attuale del partner e prossimi passi",
        "keywords": ["mio stato", "dove sono", "prossimo passo", "cosa devo fare"]
    },
    "get_phase_info": {
        "agent": "VALENTINA",
        "scope": "external",
        "description": "Spiega cosa fare nella fase attuale",
        "keywords": ["cosa fare", "questa fase", "obiettivo fase", "aiutami"]
    },
    "move_partner_phase": {
        "agent": "VALENTINA",
        "scope": "internal",  # Solo admin può spostare fasi
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
    
    def detect_action(self, message: str, is_internal: bool = False, partner_phase: str = None) -> Optional[Tuple[str, str]]:
        """
        Detect if the message requires an action to be executed
        Filters actions based on scope (internal/external) and partner phase
        
        Args:
            message: User message
            is_internal: True if admin/Claudio, False if partner
            partner_phase: Current phase of partner (F0-F10) if external
        
        Returns (action_id, agent) or None
        """
        message_lower = message.lower()
        
        # Determine allowed scope
        allowed_scopes = ["both"]
        if is_internal:
            allowed_scopes.append("internal")
        else:
            allowed_scopes.append("external")
        
        # Check each action's keywords, filtering by scope
        for action_id, action_info in AVAILABLE_ACTIONS.items():
            # Check scope
            action_scope = action_info.get("scope", "both")
            if action_scope not in allowed_scopes:
                continue
            
            # Check phase restriction for external users
            if not is_internal and "phases" in action_info:
                if partner_phase not in action_info["phases"]:
                    continue
            
            # Check keywords
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
            # ORION actions
            if action_id == "get_lead_stats":
                return await self._get_lead_stats()
            elif action_id == "get_hot_leads":
                return await self._get_hot_leads()
            elif action_id == "analyze_lead":
                return await self._analyze_lead(context)
            elif action_id == "get_leads_to_reactivate":
                return await self._get_leads_to_reactivate()
            elif action_id == "get_lead_trends":
                return await self._get_lead_trends()
            elif action_id == "get_segment_details":
                return await self._get_segment_details(context)
            elif action_id == "get_conversion_potential":
                return await self._get_conversion_potential()
            
            # MARTA actions
            elif action_id == "get_sales_kpi":
                return await self._get_sales_kpi()
            elif action_id == "get_pipeline_status":
                return await self._get_pipeline_status()
            elif action_id == "create_payment_link":
                return await self._create_payment_link(context)
            elif action_id == "get_partner_revenue":
                return await self._get_partner_revenue(context)
            
            # VALENTINA actions
            elif action_id == "list_blocked_partners":
                return await self._list_blocked_partners()
            elif action_id == "get_partner_status":
                return await self._get_partner_status(context)
            elif action_id == "get_my_status":
                return await self._get_my_status(context)
            elif action_id == "get_phase_info":
                return await self._get_phase_info(context)
            
            # GAIA actions (Systeme.io)
            elif action_id == "add_systeme_tag":
                return await self._add_systeme_tag(context)
            elif action_id == "trigger_email_campaign":
                return await self._trigger_email_campaign(context)
            elif action_id == "sync_systeme_contacts":
                return await self._sync_systeme_contacts()
            elif action_id == "check_funnel_status":
                return await self._check_funnel_status(context)
            
            # STEFANIA actions
            elif action_id == "generate_email_copy":
                return await self._generate_email_copy(context)
            elif action_id == "generate_social_post":
                return await self._generate_social_post(context)
            elif action_id == "generate_ad_hooks":
                return await self._generate_ad_hooks(context)
            
            # ANDREA actions
            elif action_id == "create_video_edit":
                return await self._create_video_edit(context)
            elif action_id == "generate_thumbnail":
                return await self._generate_thumbnail(context)
            
            # LUCA actions
            elif action_id == "check_contract_expiry":
                return await self._check_contract_expiry()
            
            # ATLAS actions
            elif action_id == "get_churn_risk":
                return await self._get_churn_risk()
            elif action_id == "get_my_progress":
                return await self._get_my_progress(context)
            
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
    
    async def _analyze_lead(self, context: Dict = None) -> Dict:
        """Analyze a specific lead by email"""
        # Try to extract email from context or original message
        email = context.get("email") if context else None
        
        if not email and context and "_original_message" in context:
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', context["_original_message"])
            if email_match:
                email = email_match.group(0)
        
        if not email:
            return {
                "success": True,
                "agent": "ORION",
                "message": "🔍 **ORION - Analisi Lead**\n\nPer analizzare un lead specifico dimmi la sua email.\n\nEsempio: 'Analizza il lead mario@email.it'"
            }
        
        # Find the lead
        lead = await db.systeme_contacts.find_one(
            {"email": {"$regex": email, "$options": "i"}},
            {"_id": 0}
        )
        
        if not lead:
            return {
                "success": True,
                "agent": "ORION",
                "message": f"⚠️ Lead con email `{email}` non trovato nel database."
            }
        
        # Build analysis
        segment = lead.get("orion_segment", "non classificato")
        score = lead.get("orion_score", 0)
        tags = lead.get("tags", [])
        tags_str = ", ".join(tags[:5]) if tags else "Nessuno"
        
        # Recommendation based on segment
        recommendations = {
            "hot": "🎯 **Azione consigliata**: Contatto diretto! Questo lead è pronto all'acquisto.",
            "warm": "📧 **Azione consigliata**: Inserisci in sequenza nurturing per mantenere l'interesse.",
            "cold": "🔄 **Azione consigliata**: Campagna di riattivazione con offerta speciale.",
            "frozen": "❄️ **Azione consigliata**: Email finale 'ultima chance' o rimuovi dalla lista."
        }
        
        rec = recommendations.get(segment, "📋 Classifica questo lead con ORION.")
        
        return {
            "success": True,
            "agent": "ORION",
            "data": lead,
            "message": f"🔍 **Analisi Lead ORION**\n\n📧 **Email**: {lead.get('email')}\n👤 **Nome**: {lead.get('first_name', '')} {lead.get('last_name', '')}\n\n📊 **Segmento**: {segment.upper()}\n⭐ **Score**: {score}/100\n🏷️ **Tags**: {tags_str}\n\n{rec}"
        }
    
    async def _get_leads_to_reactivate(self) -> Dict:
        """Get COLD and FROZEN leads that need reactivation"""
        # Get cold leads
        cold_leads = await db.systeme_contacts.find(
            {"orion_segment": "cold"},
            {"_id": 0, "email": 1, "first_name": 1, "orion_score": 1}
        ).sort("orion_score", -1).limit(10).to_list(10)
        
        # Get frozen leads
        frozen_leads = await db.systeme_contacts.find(
            {"orion_segment": "frozen"},
            {"_id": 0, "email": 1, "first_name": 1, "orion_score": 1}
        ).limit(10).to_list(10)
        
        cold_count = await db.systeme_contacts.count_documents({"orion_segment": "cold"})
        frozen_count = await db.systeme_contacts.count_documents({"orion_segment": "frozen"})
        
        # Format lists
        cold_list = "\n".join([f"• {l.get('first_name', l['email'][:20])} - score: {l.get('orion_score', 0)}" for l in cold_leads[:5]])
        frozen_list = "\n".join([f"• {l.get('first_name', l['email'][:20])}" for l in frozen_leads[:5]])
        
        return {
            "success": True,
            "agent": "ORION",
            "data": {
                "cold_count": cold_count,
                "frozen_count": frozen_count,
                "cold_sample": cold_leads,
                "frozen_sample": frozen_leads
            },
            "message": f"🔄 **Lead da Riattivare**\n\n❄️ **COLD** ({cold_count:,} totali):\n{cold_list or 'Nessuno'}\n\n🧊 **FROZEN** ({frozen_count:,} totali):\n{frozen_list or 'Nessuno'}\n\n💡 **Strategia consigliata**:\n• COLD → Sequenza riattivazione 3 email\n• FROZEN → Email finale 'ultima chance'\n\nVuoi che crei una campagna di riattivazione?"
        }
    
    async def _get_lead_trends(self) -> Dict:
        """Get lead trends and statistics over time"""
        from datetime import timedelta
        
        # Current stats
        total = await db.systeme_contacts.count_documents({})
        hot = await db.systeme_contacts.count_documents({"orion_segment": "hot"})
        warm = await db.systeme_contacts.count_documents({"orion_segment": "warm"})
        cold = await db.systeme_contacts.count_documents({"orion_segment": "cold"})
        frozen = await db.systeme_contacts.count_documents({"orion_segment": "frozen"})
        
        # Get recent imports (last 7 days)
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_imports = await db.systeme_contacts.count_documents({
            "synced_at": {"$gte": week_ago.isoformat()}
        })
        
        # Get recent scoring updates
        recent_scored = await db.systeme_contacts.count_documents({
            "orion_updated_at": {"$gte": week_ago.isoformat()}
        })
        
        # Calculate percentages
        hot_pct = (hot / total * 100) if total > 0 else 0
        warm_pct = (warm / total * 100) if total > 0 else 0
        cold_pct = (cold / total * 100) if total > 0 else 0
        frozen_pct = (frozen / total * 100) if total > 0 else 0
        
        return {
            "success": True,
            "agent": "ORION",
            "data": {
                "total": total,
                "hot": hot,
                "warm": warm,
                "cold": cold,
                "frozen": frozen,
                "recent_imports": recent_imports,
                "recent_scored": recent_scored
            },
            "message": f"📈 **Trend Lead ORION**\n\n📊 **Distribuzione attuale**:\n• 🔥 HOT: {hot:,} ({hot_pct:.1f}%)\n• 🟡 WARM: {warm:,} ({warm_pct:.1f}%)\n• ❄️ COLD: {cold:,} ({cold_pct:.1f}%)\n• 🧊 FROZEN: {frozen:,} ({frozen_pct:.1f}%)\n\n📅 **Ultimi 7 giorni**:\n• Nuovi contatti importati: {recent_imports:,}\n• Lead ri-analizzati: {recent_scored:,}\n\n**Totale database**: {total:,} contatti"
        }
    
    async def _get_segment_details(self, context: Dict = None) -> Dict:
        """Get detailed breakdown of a specific segment"""
        # Try to detect segment from message
        segment = None
        if context and "_original_message" in context:
            msg = context["_original_message"].lower()
            if "hot" in msg:
                segment = "hot"
            elif "warm" in msg:
                segment = "warm"
            elif "cold" in msg:
                segment = "cold"
            elif "frozen" in msg:
                segment = "frozen"
        
        if not segment:
            return {
                "success": True,
                "agent": "ORION",
                "message": "📊 **ORION - Dettagli Segmento**\n\nQuale segmento vuoi approfondire?\n\n• 🔥 HOT - Lead pronti all'acquisto\n• 🟡 WARM - Lead interessati\n• ❄️ COLD - Lead da riattivare\n• 🧊 FROZEN - Lead inattivi\n\nEsempio: 'Dettagli segmento HOT'"
            }
        
        # Get segment data
        count = await db.systeme_contacts.count_documents({"orion_segment": segment})
        
        # Get top leads in segment
        leads = await db.systeme_contacts.find(
            {"orion_segment": segment},
            {"_id": 0, "email": 1, "first_name": 1, "orion_score": 1, "tags": 1}
        ).sort("orion_score", -1).limit(10).to_list(10)
        
        # Get tag distribution for segment
        pipeline = [
            {"$match": {"orion_segment": segment}},
            {"$unwind": "$tags"},
            {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        tag_dist = await db.systeme_contacts.aggregate(pipeline).to_list(5)
        
        emoji_map = {"hot": "🔥", "warm": "🟡", "cold": "❄️", "frozen": "🧊"}
        emoji = emoji_map.get(segment, "📊")
        
        leads_list = "\n".join([f"• {l.get('first_name', l['email'][:25])} (score: {l.get('orion_score', 0)})" for l in leads[:5]])
        tags_list = "\n".join([f"• {t['_id']}: {t['count']}" for t in tag_dist]) if tag_dist else "Nessun tag comune"
        
        return {
            "success": True,
            "agent": "ORION",
            "data": {"segment": segment, "count": count, "leads": leads, "tags": tag_dist},
            "message": f"{emoji} **Dettagli Segmento {segment.upper()}**\n\n📈 **Totale lead**: {count:,}\n\n👤 **Top 5 lead**:\n{leads_list or 'Nessuno'}\n\n🏷️ **Tag più comuni**:\n{tags_list}"
        }
    
    async def _get_conversion_potential(self) -> Dict:
        """Calculate conversion potential and estimated revenue"""
        # Get segment counts
        hot = await db.systeme_contacts.count_documents({"orion_segment": "hot"})
        warm = await db.systeme_contacts.count_documents({"orion_segment": "warm"})
        cold = await db.systeme_contacts.count_documents({"orion_segment": "cold"})
        frozen = await db.systeme_contacts.count_documents({"orion_segment": "frozen"})
        total = hot + warm + cold + frozen
        
        # Conversion rates (conservative estimates)
        conv_rates = {
            "hot": 0.20,      # 20% conversion for hot leads
            "warm": 0.08,     # 8% for warm
            "cold": 0.03,     # 3% for cold
            "frozen": 0.005   # 0.5% for frozen
        }
        
        # Tripwire price
        tripwire_price = 7
        
        # Calculate projections
        hot_conv = int(hot * conv_rates["hot"])
        warm_conv = int(warm * conv_rates["warm"])
        cold_conv = int(cold * conv_rates["cold"])
        frozen_conv = int(frozen * conv_rates["frozen"])
        
        hot_rev = hot_conv * tripwire_price
        warm_rev = warm_conv * tripwire_price
        cold_rev = cold_conv * tripwire_price
        frozen_rev = frozen_conv * tripwire_price
        
        total_conv = hot_conv + warm_conv + cold_conv + frozen_conv
        total_rev = hot_rev + warm_rev + cold_rev + frozen_rev
        
        # Optimistic scenario (1.5x)
        optimistic_rev = int(total_rev * 1.5)
        
        return {
            "success": True,
            "agent": "ORION",
            "data": {
                "hot": {"count": hot, "conversions": hot_conv, "revenue": hot_rev},
                "warm": {"count": warm, "conversions": warm_conv, "revenue": warm_rev},
                "cold": {"count": cold, "conversions": cold_conv, "revenue": cold_rev},
                "frozen": {"count": frozen, "conversions": frozen_conv, "revenue": frozen_rev},
                "total_conversions": total_conv,
                "total_revenue": total_rev,
                "optimistic_revenue": optimistic_rev
            },
            "message": f"💰 **Potenziale Conversione ORION**\n\n**Proiezione conservativa** (Tripwire €{tripwire_price}):\n\n🔥 HOT ({hot:,} lead × 20%):\n   → {hot_conv} conversioni = **€{hot_rev:,}**\n\n🟡 WARM ({warm:,} lead × 8%):\n   → {warm_conv} conversioni = **€{warm_rev:,}**\n\n❄️ COLD ({cold:,} lead × 3%):\n   → {cold_conv} conversioni = **€{cold_rev:,}**\n\n🧊 FROZEN ({frozen:,} lead × 0.5%):\n   → {frozen_conv} conversioni = **€{frozen_rev:,}**\n\n━━━━━━━━━━━━━━━━━━━━\n📊 **TOTALE**: {total_conv:,} conversioni\n💵 **Revenue stimato**: €{total_rev:,} - €{optimistic_rev:,}\n\n💡 Per massimizzare: concentrati sui lead HOT prima!"
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
        """Trigger Systeme.io contact sync using integrated services"""
        systeme_key = os.environ.get("SYSTEME_API_KEY")
        if not systeme_key:
            return {
                "success": False,
                "agent": "GAIA",
                "message": "⚠️ **API Key Systeme.io non configurata.**\n\nPer attivare la sincronizzazione:\n1. Vai su Systeme.io → Impostazioni → API Keys\n2. Crea una nuova API Key\n3. Aggiungila al file .env come SYSTEME_API_KEY\n\nVuoi che ti guidi nel processo?"
            }
        
        # Create and execute task via integrated services
        try:
            from integrated_services import create_agent_task
            
            result = await create_agent_task(
                agent="GAIA",
                title="Sync Systeme.io Contacts",
                task_type="sync_contacts",
                execute_now=True
            )
            
            if result.get("executed") and result.get("result", {}).get("success"):
                return {
                    "success": True,
                    "agent": "GAIA",
                    "task_id": result.get("task_id"),
                    "message": f"✅ **Sincronizzazione Completata!**\n\n{result.get('result', {}).get('message', 'Contatti sincronizzati')}\n\nI dati sono ora aggiornati nel database locale."
                }
            else:
                return {
                    "success": True,
                    "agent": "GAIA",
                    "task_id": result.get("task_id"),
                    "message": f"🔄 **Task di sincronizzazione creato**\n\nID: {result.get('task_id')}\nStato: In coda per l'esecuzione\n\nVerrà processato dal background worker."
                }
        except Exception as e:
            logger.error(f"Sync error: {e}")
            return {
                "success": False,
                "agent": "GAIA",
                "message": f"⚠️ Errore durante la sincronizzazione: {str(e)}"
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
    
    # =========================================================================
    # ANDREA - Video Production Methods
    # =========================================================================
    
    async def _create_video_edit(self, context: Dict = None) -> Dict:
        """Create or edit a video with ANDREA"""
        import uuid
        task_doc = {
            "id": str(uuid.uuid4()),
            "title": "Editing Video",
            "description": "Richiesta editing video da VALENTINA",
            "agent": "ANDREA",
            "priority": "medium",
            "status": "pending",
            "created_by": "valentina",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.agent_tasks.insert_one(task_doc)
        
        return {
            "success": True,
            "agent": "ANDREA",
            "task_id": task_doc["id"],
            "message": "🎬 **ANDREA - Video Production**\n\n📋 Task creato!\n\nPer procedere con l'editing ho bisogno di:\n\n1️⃣ **Video sorgente**: URL o file del video raw\n2️⃣ **Tipo di editing**: Taglio, montaggio, correzione colore?\n3️⃣ **Sottotitoli**: Sì/No? Lingua?\n4️⃣ **Thumbnail**: Serve una copertina?\n5️⃣ **Durata target**: Quanto deve durare il video finale?\n\nDimmi i dettagli!"
        }
    
    async def _generate_thumbnail(self, context: Dict = None) -> Dict:
        """Generate YouTube thumbnail with ANDREA"""
        return {
            "success": True,
            "agent": "ANDREA",
            "message": "🖼️ **ANDREA - Thumbnail Creator**\n\nPer creare una thumbnail accattivante ho bisogno di:\n\n1️⃣ **Titolo video**: Qual è l'argomento?\n2️⃣ **Stile**: Professionale, energetico, minimalista?\n3️⃣ **Testo overlay**: Quale testo mostrare?\n4️⃣ **Colori brand**: Palette specifica?\n\nOppure dimmi il tema e creo qualche proposta!"
        }
    
    # =========================================================================
    # GAIA - Systeme.io Tag & Email Methods
    # =========================================================================
    
    async def _add_systeme_tag(self, context: Dict = None) -> Dict:
        """Add tag to contact in Systeme.io via background task"""
        import uuid
        
        # Extract email and tag from context or parse from original message
        email = context.get("email") if context else None
        tag_name = context.get("tag_name") if context else None
        
        # Try to extract from original message if not in context
        if (not email or not tag_name) and context and "_original_message" in context:
            original_msg = context["_original_message"].lower()
            
            # Extract email using regex
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', original_msg)
            if email_match:
                email = email_match.group(0)
            
            # Extract tag name - look for patterns like "tag 'name'" or "tag name al/a/to"
            # Pattern 1: tag 'name' or tag "name"
            tag_match = re.search(r"tag\s+['\"]([^'\"]+)['\"]", original_msg)
            if tag_match:
                tag_name = tag_match.group(1)
            else:
                # Pattern 2: "il tag name al contatto" or "tag name a"
                tag_match = re.search(r"(?:il\s+)?tag\s+([a-zA-Z0-9_-]+)\s+(?:al|a|to|su)", original_msg)
                if tag_match:
                    tag_name = tag_match.group(1)
                else:
                    # Pattern 3: "aggiungi tag name"
                    tag_match = re.search(r"(?:aggiungi|metti|applica)\s+(?:il\s+)?(?:un\s+)?tag\s+([a-zA-Z0-9_-]+)", original_msg)
                    if tag_match:
                        tag_name = tag_match.group(1)
        
        if not email or not tag_name:
            return {
                "success": True,
                "agent": "GAIA",
                "message": "🏷️ **GAIA - Aggiungi Tag**\n\nPer aggiungere un tag ho bisogno di:\n\n1️⃣ **Email del contatto**: Quale contatto vuoi taggare?\n2️⃣ **Nome del tag**: Quale tag aggiungere?\n\nEsempio: 'Aggiungi il tag premium_lead al contatto mario@email.it'"
            }
        
        # Create task for background execution
        task_doc = {
            "id": str(uuid.uuid4()),
            "title": f"Aggiungi tag '{tag_name}' a {email}",
            "task_type": "add_tag",
            "agent": "GAIA",
            "data": {
                "email": email,
                "tag_name": tag_name
            },
            "priority": "high",
            "status": "pending",
            "created_by": "valentina",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.agent_tasks.insert_one(task_doc)
        
        return {
            "success": True,
            "agent": "GAIA",
            "task_id": task_doc["id"],
            "message": f"✅ **Task creato per GAIA**\n\n🏷️ Tag: `{tag_name}`\n📧 Contatto: `{email}`\n\n⏳ Il background worker eseguirà l'operazione su Systeme.io entro 60 secondi.\n\nID Task: `{task_doc['id'][:8]}...`"
        }
    
    async def _trigger_email_campaign(self, context: Dict = None) -> Dict:
        """Trigger email campaign to segment via background task"""
        import uuid
        
        # Extract campaign details from context
        segment_tag = context.get("segment_tag") if context else None
        campaign_tag = context.get("campaign_tag") if context else None
        
        if not segment_tag or not campaign_tag:
            return {
                "success": True,
                "agent": "GAIA",
                "message": "📧 **GAIA - Campagna Email**\n\nPer lanciare una campagna email ho bisogno di:\n\n1️⃣ **Segmento target**: A chi vuoi inviare? (es: lead_hot, lead_warm)\n2️⃣ **Tag campagna**: Quale automazione attivare? (es: promo_natale, riattivazione)\n\nLa campagna verrà inviata a tutti i contatti con il tag specificato."
            }
        
        # Create task for background execution
        task_doc = {
            "id": str(uuid.uuid4()),
            "title": f"Campagna '{campaign_tag}' per segmento '{segment_tag}'",
            "task_type": "trigger_campaign",
            "agent": "GAIA",
            "data": {
                "segment_tag": segment_tag,
                "campaign_tag": campaign_tag
            },
            "priority": "high",
            "status": "pending",
            "created_by": "valentina",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.agent_tasks.insert_one(task_doc)
        
        return {
            "success": True,
            "agent": "GAIA",
            "task_id": task_doc["id"],
            "message": f"✅ **Campagna Email Schedulata**\n\n🎯 Segmento: `{segment_tag}`\n📧 Campagna: `{campaign_tag}`\n\n⏳ GAIA processerà la campagna entro 60 secondi.\n\nID Task: `{task_doc['id'][:8]}...`"
        }
    
    # =========================================================================
    # GAIA - Funnel & Systeme.io Methods
    # =========================================================================
    
    async def _check_funnel_status(self, context: Dict = None) -> Dict:
        """Check funnel status with GAIA"""
        # Get partner funnel data
        partners_with_funnel = await db.partners.find(
            {"systeme_funnel_url": {"$exists": True, "$ne": ""}},
            {"_id": 0, "name": 1, "systeme_funnel_url": 1, "phase": 1}
        ).to_list(50)
        
        active_funnels = len(partners_with_funnel)
        total_partners = await db.partners.count_documents({})
        
        return {
            "success": True,
            "agent": "GAIA",
            "data": {"active_funnels": active_funnels, "total_partners": total_partners},
            "message": f"🔄 **GAIA - Stato Funnel**\n\n📊 **Funnel Attivi:** {active_funnels}/{total_partners} partner\n\n{'✅ Tutti i partner hanno un funnel configurato!' if active_funnels == total_partners else f'⚠️ {total_partners - active_funnels} partner senza funnel attivo'}\n\nVuoi che verifichi lo stato di un partner specifico o che configuri un nuovo funnel?"
        }
    
    # =========================================================================
    # MARTA - CRM & Revenue Methods
    # =========================================================================
    
    async def _get_pipeline_status(self) -> Dict:
        """Get sales pipeline status with MARTA"""
        # Count partners by phase as pipeline stages
        pipeline = {}
        for i in range(11):
            phase = f"F{i}"
            count = await db.partners.count_documents({"phase": phase})
            if count > 0:
                pipeline[phase] = count
        
        total = sum(pipeline.values())
        
        # Calculate conversion rates
        conversion_info = ""
        if pipeline.get("F0", 0) > 0 and pipeline.get("F1", 0) > 0:
            conv_rate = (pipeline.get("F1", 0) / pipeline.get("F0", 0)) * 100
            conversion_info = f"\n📈 Conversion F0→F1: {conv_rate:.1f}%"
        
        pipeline_text = "\n".join([f"• **{k}**: {v} partner" for k, v in sorted(pipeline.items())])
        
        return {
            "success": True,
            "agent": "MARTA",
            "data": {"pipeline": pipeline, "total": total},
            "message": f"📊 **MARTA - Pipeline Commerciale**\n\n{pipeline_text}\n\n**Totale:** {total} partner{conversion_info}"
        }
    
    async def _create_payment_link(self, context: Dict = None) -> Dict:
        """Create Stripe payment link with MARTA"""
        return {
            "success": True,
            "agent": "MARTA",
            "message": "💳 **MARTA - Payment Link**\n\nPer creare un link di pagamento Stripe ho bisogno di:\n\n1️⃣ **Prodotto**: Quale prodotto/servizio?\n2️⃣ **Importo**: Quanto costa? (€)\n3️⃣ **Destinatario**: Per quale partner/cliente?\n4️⃣ **Scadenza**: Link con scadenza? (opzionale)\n\nDimmi i dettagli e genero il link!"
        }
    
    # =========================================================================
    # STEFANIA - Additional Copy Methods
    # =========================================================================
    
    async def _generate_social_post(self, context: Dict = None) -> Dict:
        """Generate social media post with STEFANIA"""
        return {
            "success": True,
            "agent": "STEFANIA",
            "message": "📱 **STEFANIA - Social Post**\n\nPer creare un post efficace dimmi:\n\n1️⃣ **Piattaforma**: LinkedIn, Facebook, Instagram?\n2️⃣ **Obiettivo**: Engagement, traffico, vendita?\n3️⃣ **Argomento**: Di cosa vuoi parlare?\n4️⃣ **CTA**: Quale azione vuoi far fare?\n\nOppure dimmi il tema e preparo diverse versioni!"
        }
    
    async def _generate_ad_hooks(self, context: Dict = None) -> Dict:
        """Generate ad hooks with STEFANIA War Mode"""
        return {
            "success": True,
            "agent": "STEFANIA",
            "message": "🎯 **STEFANIA - War Mode Hooks**\n\nPer generare hook pubblicitari killer ho bisogno di:\n\n1️⃣ **Prodotto**: Cosa stai vendendo?\n2️⃣ **Target**: Chi è il pubblico ideale?\n3️⃣ **Pain point**: Quale problema risolvi?\n4️⃣ **Numero hook**: Quanti ne vuoi? (consiglio: 5-10)\n\nGenero hook per Facebook, Instagram e YouTube Ads!"
        }
    
    # =========================================================================
    # PARTNER-SPECIFIC Methods (External Use)
    # =========================================================================
    
    async def _get_my_status(self, context: Dict = None) -> Dict:
        """Get current partner status and next steps"""
        partner_id = context.get("partner_id") if context else None
        partner_phase = context.get("partner_phase", "F1") if context else "F1"
        partner_name = context.get("partner_name", "Partner") if context else "Partner"
        
        # Phase descriptions
        phase_info = {
            "F0": {"name": "Pre-Onboarding", "next": "Completa l'upload dei documenti richiesti"},
            "F1": {"name": "Attivazione", "next": "Compila il Profilo Hub definendo chi sei e chi aiuti"},
            "F2": {"name": "Posizionamento", "next": "Rivedi la struttura del corso generata da STEFANIA"},
            "F3": {"name": "Masterclass", "next": "Approva i 6 blocchi della masterclass"},
            "F4": {"name": "Struttura Corso", "next": "Conferma l'outline finale del corso"},
            "F5": {"name": "Produzione", "next": "Registra i video seguendo la checklist di ANDREA"},
            "F6": {"name": "Accademia", "next": "Carica i video e configura il tuo Systeme.io"},
            "F7": {"name": "Pre-Lancio", "next": "Rivedi email e post social preparati da STEFANIA"},
            "F8": {"name": "Lancio", "next": "Monitora le conversioni durante il lancio"},
            "F9": {"name": "Ottimizzazione", "next": "Analizza i dati e ottimizza il funnel"},
            "F10": {"name": "Scalabilità", "next": "Esplora opzioni di scaling (ads, webinar, nuovo corso)"},
        }
        
        current_info = phase_info.get(partner_phase, {"name": "Sconosciuta", "next": "Contatta il supporto"})
        
        return {
            "success": True,
            "agent": "VALENTINA",
            "data": {"phase": partner_phase, "name": partner_name},
            "message": f"📊 **Il Tuo Stato Attuale, {partner_name}**\n\n🎯 **Fase:** {partner_phase} - {current_info['name']}\n\n✅ **Prossimo passo:**\n{current_info['next']}\n\nHai bisogno di aiuto con questo step? Chiedimi pure!"
        }
    
    async def _get_phase_info(self, context: Dict = None) -> Dict:
        """Explain what to do in current phase"""
        partner_phase = context.get("partner_phase", "F1") if context else "F1"
        partner_name = context.get("partner_name", "") if context else ""
        
        phase_details = {
            "F0": {
                "title": "Pre-Onboarding",
                "obiettivo": "Completare la documentazione iniziale per ufficializzare la partnership",
                "tasks": [
                    "📄 Carica il contratto firmato",
                    "🪪 Carica un documento d'identità",
                    "💳 Carica la prova di pagamento"
                ],
                "agente": "LUCA ti guida con la compliance"
            },
            "F1": {
                "title": "Attivazione/Allineamento",
                "obiettivo": "Definire chi sei, chi aiuti e cosa prometti",
                "tasks": [
                    "👤 Compila il tuo Profilo Hub",
                    "🎯 Definisci la tua nicchia specifica",
                    "💡 Chiarisci la tua proposta di valore unica"
                ],
                "agente": "Io (VALENTINA) ti guido in questo processo"
            },
            "F2": {
                "title": "Posizionamento",
                "obiettivo": "Ricevere e validare la struttura del tuo corso",
                "tasks": [
                    "📝 STEFANIA genera la struttura del corso",
                    "🔍 Rivedi i moduli proposti",
                    "✏️ Richiedi modifiche se necessario"
                ],
                "agente": "STEFANIA crea la struttura"
            },
            "F3": {
                "title": "Masterclass/Copy Core",
                "obiettivo": "Creare i 6 blocchi strategici per la tua Masterclass gratuita",
                "tasks": [
                    "🎬 STEFANIA genera i 6 blocchi copy",
                    "📖 Rivedi ogni blocco attentamente",
                    "✅ Approva o richiedi revisioni"
                ],
                "agente": "STEFANIA crea il copy"
            },
            "F4": {
                "title": "Struttura Corso",
                "obiettivo": "Confermare l'outline definitivo del corso",
                "tasks": [
                    "📋 Rivedi tutti i moduli",
                    "🎯 Verifica che coprano tutto il necessario",
                    "✅ Conferma l'outline finale"
                ],
                "agente": "STEFANIA finalizza la struttura"
            },
            "F5": {
                "title": "Produzione/Registrazione",
                "obiettivo": "Registrare tutti i video del corso",
                "tasks": [
                    "🎥 Segui la checklist di registrazione",
                    "💡 Configura luce, audio e sfondo",
                    "🎬 Registra un modulo alla volta"
                ],
                "agente": "ANDREA ti guida nella produzione"
            },
            "F6": {
                "title": "Accademia",
                "obiettivo": "Caricare i video e configurare la piattaforma",
                "tasks": [
                    "📤 Carica i video registrati",
                    "🎨 Configura il tuo Brand Kit",
                    "⚙️ Setup del tuo sub-account Systeme.io"
                ],
                "agente": "ANDREA e GAIA ti supportano"
            },
            "F7": {
                "title": "Pre-Lancio",
                "obiettivo": "Preparare tutti i materiali per il lancio",
                "tasks": [
                    "📧 Rivedi le email di lancio",
                    "📱 Approva i post social",
                    "📅 Conferma il calendario 30 giorni"
                ],
                "agente": "STEFANIA prepara tutto il copy"
            },
            "F8": {
                "title": "Lancio",
                "obiettivo": "Eseguire il lancio e monitorare i risultati",
                "tasks": [
                    "🚀 Lancio attivo!",
                    "📊 Monitora conversioni in tempo reale",
                    "🔧 Fai aggiustamenti se necessario"
                ],
                "agente": "MARTA e ORION monitorano"
            },
            "F9": {
                "title": "Ottimizzazione",
                "obiettivo": "Analizzare i dati e ottimizzare",
                "tasks": [
                    "📈 Analizza i dati del lancio",
                    "🎯 Identifica aree di miglioramento",
                    "🔄 Ottimizza il funnel"
                ],
                "agente": "ORION analizza, GAIA ottimizza"
            },
            "F10": {
                "title": "Scalabilità",
                "obiettivo": "Crescere e scalare il business",
                "tasks": [
                    "📢 Valuta advertising (Facebook, YouTube)",
                    "🎤 Considera webinar di vendita",
                    "🆕 Pianifica un nuovo corso"
                ],
                "agente": "Tutto il team a supporto"
            }
        }
        
        info = phase_details.get(partner_phase, {
            "title": "Fase non riconosciuta",
            "obiettivo": "Contatta il supporto",
            "tasks": ["Verifica la tua fase con il team"],
            "agente": "VALENTINA"
        })
        
        tasks_list = "\n".join(info["tasks"])
        
        return {
            "success": True,
            "agent": "VALENTINA",
            "message": f"📚 **{partner_phase} - {info['title']}**\n\n🎯 **Obiettivo:**\n{info['obiettivo']}\n\n📋 **Cosa fare:**\n{tasks_list}\n\n👤 **Chi ti aiuta:** {info['agente']}\n\nVuoi iniziare con il primo task?"
        }
    
    async def _get_my_progress(self, context: Dict = None) -> Dict:
        """Get partner progress through the program"""
        partner_phase = context.get("partner_phase", "F1") if context else "F1"
        partner_name = context.get("partner_name", "Partner") if context else "Partner"
        
        # Calculate progress
        phase_num = int(partner_phase.replace("F", "")) if partner_phase.startswith("F") else 0
        progress_percent = (phase_num / 10) * 100
        
        phases_completed = phase_num
        phases_remaining = 10 - phase_num
        
        # Progress bar
        filled = "█" * phase_num
        empty = "░" * (10 - phase_num)
        progress_bar = f"[{filled}{empty}]"
        
        return {
            "success": True,
            "agent": "ATLAS",
            "data": {"phase": partner_phase, "progress": progress_percent},
            "message": f"📈 **Il Tuo Progresso, {partner_name}**\n\n{progress_bar} {progress_percent:.0f}%\n\n✅ **Fasi completate:** {phases_completed}/10\n⏳ **Fasi rimanenti:** {phases_remaining}\n🎯 **Fase attuale:** {partner_phase}\n\n{'🎉 Sei quasi alla fine!' if phase_num >= 8 else '💪 Continua così!' if phase_num >= 4 else '🚀 Buon inizio! Il meglio deve ancora venire!'}"
        }
    
    async def _get_partner_revenue(self, context: Dict = None) -> Dict:
        """Get revenue for a specific partner"""
        partner_id = context.get("partner_id") if context else None
        partner_name = context.get("partner_name", "Partner") if context else "Partner"
        
        if not partner_id:
            return {
                "success": False,
                "agent": "MARTA",
                "message": "⚠️ Non riesco a identificare il partner per mostrare il revenue."
            }
        
        # Get partner's payments
        payments = await db.payments.find({"partner_id": partner_id}, {"_id": 0}).to_list(100)
        total_revenue = sum(p.get("amount", 0) for p in payments)
        total_orders = len(payments)
        
        return {
            "success": True,
            "agent": "MARTA",
            "data": {"revenue": total_revenue, "orders": total_orders},
            "message": f"💰 **Revenue di {partner_name}**\n\n📈 **Totale guadagnato:** €{total_revenue:,.2f}\n🛒 **Ordini completati:** {total_orders}\n\n{'🎉 Ottimo lavoro!' if total_revenue > 0 else '💪 Il primo ordine arriverà presto!'}"
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


async def detect_and_execute_action(message: str, context: Dict = None, is_internal: bool = False) -> Optional[Dict]:
    """
    Helper function to detect and execute an action from a message
    Filters by scope (internal/external) and partner phase
    
    Args:
        message: User message
        context: Context dict with partner info
        is_internal: True if admin/Claudio
    
    Returns action result or None if no action detected
    """
    partner_phase = context.get("partner_phase") if context else None
    
    action = action_dispatcher.detect_action(message, is_internal=is_internal, partner_phase=partner_phase)
    if action:
        action_id, agent = action
        logger.info(f"Detected action: {action_id} (agent: {agent}, internal: {is_internal})")
        # Merge context with message for parameter extraction
        exec_context = context.copy() if context else {}
        exec_context["_original_message"] = message
        result = await action_dispatcher.execute_action(action_id, exec_context)
        return result
    return None
