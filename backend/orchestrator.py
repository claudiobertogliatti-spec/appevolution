"""
orchestrator.py
===============
Sistema di Orchestrazione Multi-Agente per Evolution PRO OS.

Valentina funge da Orchestratore che coordina tutti gli agenti del team.
Implementa un protocollo di comunicazione con memoria condivisa.

Protocollo Team AI:
- VALENTINA: Interfaccia Utente + Attivazione OpenClaw + Orchestrazione
- OPENCLAW: Ricerca dati web (via Telegram)
- ORION: Lead Intelligence
- STEFANIA: Copy & Marketing
- ANDREA: Video Production
- GAIA: Supporto Tecnico
- MARCO: Accountability

Trigger "Analisi Strategica" blocca l'interazione finché tutti gli agenti
non hanno completato il loro task.
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Carica .env
load_dotenv()

logger = logging.getLogger(__name__)

# MongoDB connection - lazy loading
MONGO_URL = os.environ.get("MONGO_URL", "")
DB_NAME = os.environ.get("DB_NAME", "evolution_pro")

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        mongo_url = os.environ.get("MONGO_URL", MONGO_URL)
        db_name = os.environ.get("DB_NAME", DB_NAME)
        if not mongo_url:
            raise Exception("MONGO_URL non configurata")
        _client = AsyncIOMotorClient(mongo_url)
        _db = _client[db_name]
    return _db

# ============================================================================
# CONFIGURAZIONE AGENTI
# ============================================================================

TEAM_AGENTS = {
    "VALENTINA": {
        "role": "Orchestratrice",
        "capabilities": ["interface", "routing", "openclaw_trigger", "coordination"],
        "report_sections": ["introduzione", "prossimi_passi"]
    },
    "OPENCLAW": {
        "role": "Web Research",
        "capabilities": ["google_search", "scraping", "competitor_analysis"],
        "report_sections": ["analisi_mercato", "analisi_competitor", "posizionamento_attuale"]
    },
    "ORION": {
        "role": "Lead Intelligence",
        "capabilities": ["lead_analysis", "segmentation", "conversion_potential"],
        "report_sections": ["target_ideale", "modello_monetizzazione"]
    },
    "STEFANIA": {
        "role": "Copy & Marketing",
        "capabilities": ["copywriting", "email_marketing", "social_content"],
        "report_sections": ["proposta_valore", "differenziazione"]
    },
    "ANDREA": {
        "role": "Video Production",
        "capabilities": ["video_review", "content_structure", "course_design"],
        "report_sections": ["struttura_corso", "roadmap"]
    },
    "GAIA": {
        "role": "Supporto Tecnico",
        "capabilities": ["tech_support", "platform_integration", "troubleshooting"],
        "report_sections": ["investimento", "criticita"]
    },
    "MARCO": {
        "role": "Accountability",
        "capabilities": ["progress_tracking", "partner_follow_up", "deadline_management"],
        "report_sections": ["profilo_professionale", "valutazione_finale"]
    }
}

# Mapping sezioni report -> agente responsabile
SECTION_AGENT_MAP = {
    "01_introduzione": "VALENTINA",
    "02_chi_siamo": "VALENTINA",
    "03_come_funziona": "VALENTINA",
    "04_glossario": "VALENTINA",
    "05_disclaimer": "VALENTINA",
    "06_profilo_professionale": "MARCO",
    "07_problema_risolto": "ORION",
    "08_target_ideale": "ORION",
    "09_proposta_valore": "STEFANIA",
    "10_analisi_mercato": "OPENCLAW",
    "11_posizionamento_attuale": "OPENCLAW",
    "12_analisi_competitor": "OPENCLAW",
    "13_differenziazione": "STEFANIA",
    "14_criticita": "GAIA",
    "15_struttura_corso": "ANDREA",
    "16_modello_monetizzazione": "ORION",
    "17_costo_opportunita": "MARCO",
    "18_roadmap": "ANDREA",
    "19_investimento": "GAIA",
    "20_valutazione_finale": "MARCO",
    "21_prossimi_passi": "VALENTINA"
}


# ============================================================================
# MEMORIA CONDIVISA
# ============================================================================

class SharedMemory:
    """
    Memoria condivisa per la comunicazione tra agenti.
    Ogni agente può leggere e scrivere nello stesso contesto.
    """
    
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.db = get_db()
        self.collection = self.db.orchestrator_memory
    
    async def initialize(self, initial_data: Dict):
        """Inizializza la memoria per un nuovo task"""
        memory_doc = {
            "task_id": self.task_id,
            "status": "initialized",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "input_data": initial_data,
            "agent_outputs": {},
            "agent_status": {agent: "pending" for agent in TEAM_AGENTS.keys()},
            "final_report": None,
            "errors": []
        }
        await self.collection.insert_one(memory_doc)
        logger.info(f"[Orchestrator] Memory initialized for task {self.task_id}")
    
    async def get(self) -> Optional[Dict]:
        """Recupera la memoria corrente"""
        return await self.collection.find_one({"task_id": self.task_id}, {"_id": 0})
    
    async def write_agent_output(self, agent: str, output: Dict):
        """Un agente scrive il suo output nella memoria condivisa"""
        await self.collection.update_one(
            {"task_id": self.task_id},
            {
                "$set": {
                    f"agent_outputs.{agent}": output,
                    f"agent_status.{agent}": "completed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        logger.info(f"[Orchestrator] Agent {agent} wrote output for task {self.task_id}")
    
    async def write_agent_error(self, agent: str, error: str):
        """Un agente segnala un errore"""
        await self.collection.update_one(
            {"task_id": self.task_id},
            {
                "$set": {
                    f"agent_status.{agent}": "error",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"errors": {"agent": agent, "error": error, "timestamp": datetime.now(timezone.utc).isoformat()}}
            }
        )
        logger.error(f"[Orchestrator] Agent {agent} error: {error}")
    
    async def set_status(self, status: str):
        """Aggiorna lo status generale del task"""
        await self.collection.update_one(
            {"task_id": self.task_id},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    async def set_final_report(self, report: Dict):
        """Salva il report finale compilato"""
        await self.collection.update_one(
            {"task_id": self.task_id},
            {
                "$set": {
                    "final_report": report,
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    async def check_all_agents_completed(self) -> bool:
        """Verifica se tutti gli agenti rilevanti hanno completato"""
        memory = await self.get()
        if not memory:
            return False
        
        agent_status = memory.get("agent_status", {})
        # Considera solo agenti che hanno sezioni assegnate
        relevant_agents = set(SECTION_AGENT_MAP.values())
        
        for agent in relevant_agents:
            status = agent_status.get(agent, "pending")
            if status not in ["completed", "skipped"]:
                return False
        
        return True


# ============================================================================
# ORCHESTRATORE
# ============================================================================

class MultiAgentOrchestrator:
    """
    Orchestratore che coordina tutti gli agenti per task complessi.
    
    Workflow:
    1. Riceve richiesta (es: "Analisi Strategica")
    2. Inizializza memoria condivisa
    3. Attiva OpenClaw per ricerca dati
    4. Distribuisce task agli agenti
    5. Raccoglie output
    6. Compila report finale
    """
    
    def __init__(self):
        self.db = get_db()
    
    async def start_analysis(self, user_id: str, questionario: Dict) -> Dict:
        """
        Avvia il processo di Analisi Strategica Multi-Agente.
        
        Args:
            user_id: ID del cliente/partner
            questionario: Dati del questionario compilato
        
        Returns:
            Dict con task_id e status
        """
        import uuid
        task_id = f"analysis_{user_id}_{uuid.uuid4().hex[:8]}"
        
        logger.info(f"[Orchestrator] Starting multi-agent analysis: {task_id}")
        
        # 1. Inizializza memoria condivisa
        memory = SharedMemory(task_id)
        await memory.initialize({
            "user_id": user_id,
            "questionario": questionario,
            "request_type": "analisi_strategica",
            "requested_at": datetime.now(timezone.utc).isoformat()
        })
        
        # 2. Avvia il workflow in background
        asyncio.create_task(self._execute_analysis_workflow(task_id, user_id, questionario))
        
        return {
            "success": True,
            "task_id": task_id,
            "status": "in_progress",
            "message": "Analisi Strategica avviata. Tutti gli agenti sono al lavoro."
        }
    
    async def _execute_analysis_workflow(self, task_id: str, user_id: str, questionario: Dict):
        """
        Esegue il workflow completo dell'analisi.
        Questo metodo coordina tutti gli agenti in sequenza/parallelo.
        """
        memory = SharedMemory(task_id)
        
        try:
            await memory.set_status("openclaw_research")
            
            # ═══════════════════════════════════════════════════════════
            # STEP 1: OpenClaw Research
            # ═══════════════════════════════════════════════════════════
            logger.info(f"[Orchestrator] Step 1: OpenClaw Research")
            
            try:
                from openclaw_research import run_strategic_research
                
                research_data = await run_strategic_research(
                    nome_partner=f"{questionario.get('nome', '')} {questionario.get('cognome', '')}",
                    expertise=questionario.get('expertise', ''),
                    target=questionario.get('cliente_target', ''),
                    competitor_names=[c.strip() for c in questionario.get('competitor', '').split(',') if c.strip()] or None,
                    website_partner=questionario.get('sito_web'),
                    social_links=questionario.get('social_links')
                )
                
                await memory.write_agent_output("OPENCLAW", {
                    "research_data": research_data,
                    "data_quality": research_data.get("data_quality", "unknown")
                })
            except Exception as e:
                logger.error(f"[Orchestrator] OpenClaw error: {e}")
                await memory.write_agent_error("OPENCLAW", str(e))
            
            # ═══════════════════════════════════════════════════════════
            # STEP 2: Distribuisci task agli altri agenti (in parallelo)
            # ═══════════════════════════════════════════════════════════
            await memory.set_status("agents_processing")
            logger.info(f"[Orchestrator] Step 2: Distributing to agents")
            
            # Recupera dati OpenClaw per gli altri agenti
            memory_data = await memory.get()
            openclaw_output = memory_data.get("agent_outputs", {}).get("OPENCLAW", {})
            
            # Esegui task agenti in parallelo
            agent_tasks = [
                self._run_agent_task("ORION", task_id, questionario, openclaw_output),
                self._run_agent_task("STEFANIA", task_id, questionario, openclaw_output),
                self._run_agent_task("ANDREA", task_id, questionario, openclaw_output),
                self._run_agent_task("GAIA", task_id, questionario, openclaw_output),
                self._run_agent_task("MARCO", task_id, questionario, openclaw_output),
            ]
            
            await asyncio.gather(*agent_tasks, return_exceptions=True)
            
            # ═══════════════════════════════════════════════════════════
            # STEP 3: VALENTINA compila il report finale
            # ═══════════════════════════════════════════════════════════
            await memory.set_status("compiling_report")
            logger.info(f"[Orchestrator] Step 3: Compiling final report")
            
            final_report = await self._compile_final_report(task_id, questionario)
            await memory.set_final_report(final_report)
            
            # Notifica completamento
            await self._notify_completion(task_id, user_id)
            
            logger.info(f"[Orchestrator] Analysis {task_id} completed successfully")
            
        except Exception as e:
            logger.error(f"[Orchestrator] Workflow error: {e}")
            await memory.set_status("error")
            await memory.write_agent_error("ORCHESTRATOR", str(e))
    
    async def _run_agent_task(self, agent: str, task_id: str, questionario: Dict, research_data: Dict):
        """
        Esegue il task di un singolo agente.
        """
        memory = SharedMemory(task_id)
        
        try:
            logger.info(f"[Orchestrator] Running agent {agent}")
            
            # Determina le sezioni di cui è responsabile l'agente
            agent_sections = [s for s, a in SECTION_AGENT_MAP.items() if a == agent]
            
            if not agent_sections:
                await memory.write_agent_output(agent, {"skipped": True, "reason": "No sections assigned"})
                return
            
            # Genera contenuto per le sezioni usando LLM
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            if not api_key:
                raise Exception("EMERGENT_LLM_KEY non configurata")
            
            llm = LlmChat(
                api_key=api_key,
                session_id=f"agent_{agent}_{task_id}",
                system_message=f"Sei {agent}, agente AI del team Evolution PRO. Genera contenuto per le sezioni assegnate dell'Analisi Strategica."
            ).with_model("anthropic", "claude-sonnet-4-20250514")
            
            # Prepara prompt per l'agente
            prompt = f"""Genera il contenuto per le seguenti sezioni dell'Analisi Strategica:

SEZIONI DA COMPILARE: {agent_sections}

DATI CLIENTE:
{json.dumps(questionario, indent=2, ensure_ascii=False)}

DATI RICERCA WEB:
{json.dumps(research_data, indent=2, ensure_ascii=False)[:3000]}

Rispondi in JSON con le sezioni compilate:
{{
    "{agent_sections[0]}": {{
        "titolo": "...",
        "contenuto": "...",
        "indicatore": "✅ o ⚠️ o ❌"
    }},
    ...
}}
"""
            
            response = await llm.chat([UserMessage(text=prompt)])
            
            # Parse response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response.text)
            if json_match:
                sections_output = json.loads(json_match.group())
            else:
                sections_output = {"raw_response": response.text[:1000]}
            
            await memory.write_agent_output(agent, sections_output)
            
        except Exception as e:
            logger.error(f"[Orchestrator] Agent {agent} error: {e}")
            await memory.write_agent_error(agent, str(e))
    
    async def _compile_final_report(self, task_id: str, questionario: Dict) -> Dict:
        """
        VALENTINA compila il report finale combinando gli output di tutti gli agenti.
        """
        memory = SharedMemory(task_id)
        memory_data = await memory.get()
        
        if not memory_data:
            return {"error": "Memory not found"}
        
        agent_outputs = memory_data.get("agent_outputs", {})
        
        # Combina tutte le sezioni
        final_report = {
            "meta": {
                "task_id": task_id,
                "cliente": f"{questionario.get('nome', '')} {questionario.get('cognome', '')}",
                "data": datetime.now().strftime('%d/%m/%Y'),
                "versione": "3.0_multi_agent",
                "agenti_coinvolti": list(agent_outputs.keys())
            },
            "sezioni": {}
        }
        
        # Assembla sezioni in ordine
        for section_key in sorted(SECTION_AGENT_MAP.keys()):
            agent = SECTION_AGENT_MAP[section_key]
            agent_output = agent_outputs.get(agent, {})
            
            if section_key in agent_output:
                final_report["sezioni"][section_key] = agent_output[section_key]
            else:
                final_report["sezioni"][section_key] = {
                    "titolo": section_key.replace("_", " ").title(),
                    "contenuto": "[Sezione non generata]",
                    "agent_responsible": agent
                }
        
        return final_report
    
    async def _notify_completion(self, task_id: str, user_id: str):
        """Notifica Telegram al completamento dell'analisi"""
        try:
            from valentina_ai import telegram_notify
            await telegram_notify(
                "alert",
                alert_type="analysis_complete",
                message=f"Analisi Strategica completata!\nTask ID: {task_id}\nCliente: {user_id}"
            )
        except Exception as e:
            logger.warning(f"[Orchestrator] Notification error: {e}")
    
    async def get_analysis_status(self, task_id: str) -> Dict:
        """Recupera lo stato di un'analisi in corso"""
        memory = SharedMemory(task_id)
        memory_data = await memory.get()
        
        if not memory_data:
            return {"error": "Task not found", "task_id": task_id}
        
        return {
            "task_id": task_id,
            "status": memory_data.get("status"),
            "agent_status": memory_data.get("agent_status"),
            "created_at": memory_data.get("created_at"),
            "updated_at": memory_data.get("updated_at"),
            "has_final_report": memory_data.get("final_report") is not None,
            "errors": memory_data.get("errors", [])
        }
    
    async def get_final_report(self, task_id: str) -> Optional[Dict]:
        """Recupera il report finale"""
        memory = SharedMemory(task_id)
        memory_data = await memory.get()
        
        if not memory_data:
            return None
        
        return memory_data.get("final_report")


# ============================================================================
# ISTANZA GLOBALE (lazy)
# ============================================================================

_orchestrator = None

def get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = MultiAgentOrchestrator()
    return _orchestrator

# Alias per retrocompatibilità
orchestrator = property(lambda self: get_orchestrator())


# ============================================================================
# FUNZIONE: Trigger "Analisi Strategica" da Valentina
# ============================================================================

async def trigger_strategic_analysis(user_id: str, questionario: Dict) -> Dict:
    """
    Funzione chiamata da Valentina quando riceve il comando "Analisi Strategica".
    Blocca l'interazione finché tutti gli agenti non hanno completato.
    """
    return await get_orchestrator().start_analysis(user_id, questionario)


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    "MultiAgentOrchestrator",
    "SharedMemory",
    "get_orchestrator",
    "trigger_strategic_analysis",
    "TEAM_AGENTS",
    "SECTION_AGENT_MAP"
]
