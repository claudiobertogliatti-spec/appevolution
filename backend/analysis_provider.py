"""
Analysis Provider Interface for Evolution PRO
Modular architecture for AI-powered analysis generation.

Supports multiple providers:
- ClaudeAnalysisProvider (default)
- NotebookLMProvider (future, when API available)
- CustomProvider (extensible)

Usage:
    provider = get_analysis_provider()
    result = await provider.generate_analysis(client_data)
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# =============================================================================
# DATA MODELS
# =============================================================================

class ClientData(BaseModel):
    """Input data for analysis generation"""
    cliente_id: str
    user_id: Optional[str] = None
    nome: str
    cognome: Optional[str] = None
    email: str
    telefono: Optional[str] = None
    questionario_responses: Dict[str, Any] = {}
    additional_context: Optional[str] = None


class AnalysisResult(BaseModel):
    """Output from analysis generation"""
    success: bool
    provider: str
    analysis_id: str
    
    # Main content
    executive_summary: str
    current_situation: Dict[str, Any]
    diagnosis: List[Dict[str, Any]]  # 3 main problems
    opportunities: List[Dict[str, Any]]  # 3 opportunities
    recommended_strategy: Dict[str, Any]
    action_plan: List[Dict[str, Any]]
    
    # Metadata
    generated_at: str
    generation_time_seconds: float
    raw_response: Optional[str] = None
    error: Optional[str] = None


class CallScriptResult(BaseModel):
    """Output from call script generation"""
    success: bool
    provider: str
    script_id: str
    
    # 8 blocks
    script_blocks: List[Dict[str, Any]]
    total_duration_minutes: int
    personalization_notes: str
    
    # Metadata
    generated_at: str
    raw_response: Optional[str] = None
    error: Optional[str] = None


# =============================================================================
# ABSTRACT PROVIDER INTERFACE
# =============================================================================

class AnalysisProvider(ABC):
    """
    Abstract base class for analysis providers.
    Implement this interface to add new providers (NotebookLM, etc.)
    """
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return provider name for logging/tracking"""
        pass
    
    @abstractmethod
    async def generate_analysis(self, client_data: ClientData) -> AnalysisResult:
        """
        Generate strategic analysis for a client.
        
        Args:
            client_data: Client information and questionnaire responses
            
        Returns:
            AnalysisResult with structured analysis
        """
        pass
    
    @abstractmethod
    async def generate_call_script(self, client_data: ClientData, analysis: Optional[AnalysisResult] = None) -> CallScriptResult:
        """
        Generate 8-block call script for analysis delivery.
        
        Args:
            client_data: Client information
            analysis: Previously generated analysis (optional)
            
        Returns:
            CallScriptResult with 8 script blocks
        """
        pass
    
    async def health_check(self) -> bool:
        """Check if provider is available"""
        return True


# =============================================================================
# CLAUDE PROVIDER (DEFAULT)
# =============================================================================

class ClaudeAnalysisProvider(AnalysisProvider):
    """
    Claude-based analysis provider using Emergent LLM integration.
    Default provider for Evolution PRO.
    """
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.model = "claude-sonnet-4-20250514"
    
    @property
    def provider_name(self) -> str:
        return "claude"
    
    async def health_check(self) -> bool:
        return bool(self.api_key)
    
    async def generate_analysis(self, client_data: ClientData) -> AnalysisResult:
        """Generate analysis using Claude"""
        import time
        import uuid
        
        start_time = time.time()
        analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
        
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            if not self.api_key:
                raise ValueError("EMERGENT_LLM_KEY not configured")
            
            # Build prompt
            prompt = self._build_analysis_prompt(client_data)
            
            # Call LLM
            llm = LlmChat(api_key=self.api_key, model=self.model)
            response = await llm.send_message(UserMessage(text=prompt))
            
            # Parse response
            analysis = self._parse_analysis_response(response, analysis_id)
            analysis.generation_time_seconds = time.time() - start_time
            analysis.raw_response = response
            
            logger.info(f"[{self.provider_name}] Analysis generated: {analysis_id} in {analysis.generation_time_seconds:.2f}s")
            
            return analysis
            
        except Exception as e:
            logger.error(f"[{self.provider_name}] Analysis generation failed: {e}")
            return AnalysisResult(
                success=False,
                provider=self.provider_name,
                analysis_id=analysis_id,
                executive_summary="",
                current_situation={},
                diagnosis=[],
                opportunities=[],
                recommended_strategy={},
                action_plan=[],
                generated_at=datetime.now(timezone.utc).isoformat(),
                generation_time_seconds=time.time() - start_time,
                error=str(e)
            )
    
    async def generate_call_script(self, client_data: ClientData, analysis: Optional[AnalysisResult] = None) -> CallScriptResult:
        """Generate 8-block call script using Claude"""
        import time
        import uuid
        
        start_time = time.time()
        script_id = f"script_{uuid.uuid4().hex[:12]}"
        
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            if not self.api_key:
                raise ValueError("EMERGENT_LLM_KEY not configured")
            
            # Build prompt
            prompt = self._build_call_script_prompt(client_data, analysis)
            
            # Call LLM
            llm = LlmChat(api_key=self.api_key, model=self.model)
            response = await llm.send_message(UserMessage(text=prompt))
            
            # Parse response
            script = self._parse_call_script_response(response, script_id)
            script.raw_response = response
            
            logger.info(f"[{self.provider_name}] Call script generated: {script_id}")
            
            return script
            
        except Exception as e:
            logger.error(f"[{self.provider_name}] Call script generation failed: {e}")
            return CallScriptResult(
                success=False,
                provider=self.provider_name,
                script_id=script_id,
                script_blocks=[],
                total_duration_minutes=0,
                personalization_notes="",
                generated_at=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )
    
    def _build_analysis_prompt(self, client_data: ClientData) -> str:
        """Build analysis generation prompt"""
        questionario_json = json.dumps(client_data.questionario_responses, indent=2, ensure_ascii=False)
        
        return f"""Sei un consulente strategico esperto di Evolution PRO. Genera un'analisi strategica completa per questo cliente.

DATI CLIENTE:
- Nome: {client_data.nome} {client_data.cognome or ''}
- Email: {client_data.email}

RISPOSTE QUESTIONARIO:
{questionario_json if client_data.questionario_responses else "Non disponibili - genera analisi generica basata su best practices"}

{f"CONTESTO AGGIUNTIVO: {client_data.additional_context}" if client_data.additional_context else ""}

Genera un'analisi strategica strutturata in JSON con questo formato:
{{
    "executive_summary": "Riepilogo esecutivo di 3-4 frasi",
    "current_situation": {{
        "description": "Descrizione della situazione attuale",
        "strengths": ["punto di forza 1", "punto di forza 2"],
        "weaknesses": ["debolezza 1", "debolezza 2"]
    }},
    "diagnosis": [
        {{
            "problem_number": 1,
            "title": "Titolo problema principale",
            "description": "Descrizione dettagliata",
            "impact": "Impatto sul business",
            "priority": "alta"
        }},
        {{
            "problem_number": 2,
            "title": "Secondo problema",
            "description": "...",
            "impact": "...",
            "priority": "media"
        }},
        {{
            "problem_number": 3,
            "title": "Terzo problema",
            "description": "...",
            "impact": "...",
            "priority": "media"
        }}
    ],
    "opportunities": [
        {{
            "opportunity_number": 1,
            "title": "Opportunità principale",
            "description": "Descrizione",
            "potential_impact": "Impatto potenziale",
            "timeframe": "breve termine"
        }},
        {{
            "opportunity_number": 2,
            "title": "Seconda opportunità",
            "description": "...",
            "potential_impact": "...",
            "timeframe": "medio termine"
        }},
        {{
            "opportunity_number": 3,
            "title": "Terza opportunità",
            "description": "...",
            "potential_impact": "...",
            "timeframe": "lungo termine"
        }}
    ],
    "recommended_strategy": {{
        "overview": "Panoramica della strategia consigliata",
        "key_pillars": ["pilastro 1", "pilastro 2", "pilastro 3"],
        "expected_outcomes": ["risultato atteso 1", "risultato atteso 2"]
    }},
    "action_plan": [
        {{
            "step": 1,
            "action": "Prima azione da intraprendere",
            "timeline": "Settimana 1-2",
            "resources_needed": "Risorse necessarie"
        }},
        {{
            "step": 2,
            "action": "Seconda azione",
            "timeline": "Settimana 3-4",
            "resources_needed": "..."
        }},
        {{
            "step": 3,
            "action": "Terza azione",
            "timeline": "Mese 2",
            "resources_needed": "..."
        }}
    ]
}}

Rispondi SOLO con il JSON, senza markdown o testo aggiuntivo."""

    def _build_call_script_prompt(self, client_data: ClientData, analysis: Optional[AnalysisResult]) -> str:
        """Build call script generation prompt"""
        analysis_context = ""
        if analysis and analysis.success:
            analysis_context = f"""
ANALISI GIÀ GENERATA:
- Executive Summary: {analysis.executive_summary}
- Problemi identificati: {len(analysis.diagnosis)}
- Opportunità: {len(analysis.opportunities)}
"""
        
        return f"""Genera uno script per la videocall di consegna analisi strategica per il cliente {client_data.nome}.

{analysis_context}

DATI QUESTIONARIO:
{json.dumps(client_data.questionario_responses, indent=2, ensure_ascii=False) if client_data.questionario_responses else "Non disponibili"}

Lo script deve avere esattamente 8 blocchi:

1. APERTURA (2 min) - Saluto, ringraziamento per la fiducia, agenda della call
2. SITUAZIONE ATTUALE (3 min) - Riepilogo della situazione emersa dal questionario
3. DIAGNOSI (5 min) - I 3 principali blocchi/problemi identificati
4. OPPORTUNITÀ (3 min) - Le 3 opportunità di crescita più immediate
5. STRATEGIA (5 min) - Il percorso consigliato (high level)
6. CASI STUDIO (3 min) - 1-2 esempi di risultati simili ottenuti
7. PROPOSTA (5 min) - Presentazione della partnership Evolution PRO
8. PROSSIMI PASSI (2 min) - Call to action, scadenza offerta, Q&A

Rispondi in JSON:
{{
    "script_blocks": [
        {{
            "block_number": 1,
            "title": "APERTURA",
            "duration_minutes": 2,
            "script": "Testo dello script parlato in prima persona...",
            "coach_notes": "Note per il coach su come gestire questa sezione"
        }},
        ... (tutti e 8 i blocchi)
    ],
    "total_duration_minutes": 28,
    "personalization_notes": "Note sulla personalizzazione per questo specifico cliente"
}}

Rispondi SOLO con il JSON."""

    def _parse_analysis_response(self, response: str, analysis_id: str) -> AnalysisResult:
        """Parse LLM response into AnalysisResult"""
        try:
            # Extract JSON from response
            response_text = response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            data = json.loads(response_text.strip())
            
            return AnalysisResult(
                success=True,
                provider=self.provider_name,
                analysis_id=analysis_id,
                executive_summary=data.get("executive_summary", ""),
                current_situation=data.get("current_situation", {}),
                diagnosis=data.get("diagnosis", []),
                opportunities=data.get("opportunities", []),
                recommended_strategy=data.get("recommended_strategy", {}),
                action_plan=data.get("action_plan", []),
                generated_at=datetime.now(timezone.utc).isoformat(),
                generation_time_seconds=0
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse analysis JSON: {e}")
            # Return partial result with raw response
            return AnalysisResult(
                success=False,
                provider=self.provider_name,
                analysis_id=analysis_id,
                executive_summary=response[:500] if response else "",
                current_situation={},
                diagnosis=[],
                opportunities=[],
                recommended_strategy={},
                action_plan=[],
                generated_at=datetime.now(timezone.utc).isoformat(),
                generation_time_seconds=0,
                error=f"JSON parse error: {e}"
            )

    def _parse_call_script_response(self, response: str, script_id: str) -> CallScriptResult:
        """Parse LLM response into CallScriptResult"""
        try:
            response_text = response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            data = json.loads(response_text.strip())
            
            return CallScriptResult(
                success=True,
                provider=self.provider_name,
                script_id=script_id,
                script_blocks=data.get("script_blocks", []),
                total_duration_minutes=data.get("total_duration_minutes", 28),
                personalization_notes=data.get("personalization_notes", ""),
                generated_at=datetime.now(timezone.utc).isoformat()
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse call script JSON: {e}")
            return CallScriptResult(
                success=False,
                provider=self.provider_name,
                script_id=script_id,
                script_blocks=[],
                total_duration_minutes=0,
                personalization_notes="",
                generated_at=datetime.now(timezone.utc).isoformat(),
                error=f"JSON parse error: {e}"
            )


# =============================================================================
# NOTEBOOKLM PROVIDER (FUTURE)
# =============================================================================

class NotebookLMProvider(AnalysisProvider):
    """
    NotebookLM provider - placeholder for future API integration.
    Will be implemented when Google releases public API.
    """
    
    def __init__(self):
        self.api_available = False
        logger.info("[NotebookLM] Provider initialized (API not yet available)")
    
    @property
    def provider_name(self) -> str:
        return "notebooklm"
    
    async def health_check(self) -> bool:
        return self.api_available
    
    async def generate_analysis(self, client_data: ClientData) -> AnalysisResult:
        raise NotImplementedError("NotebookLM API not yet available. Use Claude provider.")
    
    async def generate_call_script(self, client_data: ClientData, analysis: Optional[AnalysisResult] = None) -> CallScriptResult:
        raise NotImplementedError("NotebookLM API not yet available. Use Claude provider.")


# =============================================================================
# PROVIDER FACTORY
# =============================================================================

_provider_instance: Optional[AnalysisProvider] = None

def get_analysis_provider(provider_name: str = None) -> AnalysisProvider:
    """
    Get analysis provider instance.
    
    Args:
        provider_name: Optional provider name. If None, uses ANALYSIS_PROVIDER env var or defaults to 'claude'
    
    Returns:
        AnalysisProvider instance
    """
    global _provider_instance
    
    # Get provider name from param, env, or default
    if provider_name is None:
        provider_name = os.environ.get('ANALYSIS_PROVIDER', 'claude')
    
    # Return cached instance if same provider
    if _provider_instance and _provider_instance.provider_name == provider_name:
        return _provider_instance
    
    # Create new provider
    if provider_name == 'claude':
        _provider_instance = ClaudeAnalysisProvider()
    elif provider_name == 'notebooklm':
        _provider_instance = NotebookLMProvider()
    else:
        logger.warning(f"Unknown provider '{provider_name}', falling back to Claude")
        _provider_instance = ClaudeAnalysisProvider()
    
    logger.info(f"[AnalysisProvider] Using provider: {_provider_instance.provider_name}")
    return _provider_instance


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

async def generate_client_analysis(
    cliente_id: str,
    nome: str,
    email: str,
    questionario_responses: Dict[str, Any] = None,
    cognome: str = None,
    telefono: str = None,
    user_id: str = None,
    additional_context: str = None
) -> AnalysisResult:
    """
    Convenience function to generate analysis.
    
    Example:
        result = await generate_client_analysis(
            cliente_id="123",
            nome="Mario",
            email="mario@example.com",
            questionario_responses={"domanda1": "risposta1"}
        )
    """
    client_data = ClientData(
        cliente_id=cliente_id,
        user_id=user_id,
        nome=nome,
        cognome=cognome,
        email=email,
        telefono=telefono,
        questionario_responses=questionario_responses or {},
        additional_context=additional_context
    )
    
    provider = get_analysis_provider()
    return await provider.generate_analysis(client_data)


async def generate_client_call_script(
    cliente_id: str,
    nome: str,
    email: str,
    questionario_responses: Dict[str, Any] = None,
    analysis: AnalysisResult = None
) -> CallScriptResult:
    """
    Convenience function to generate call script.
    """
    client_data = ClientData(
        cliente_id=cliente_id,
        nome=nome,
        email=email,
        questionario_responses=questionario_responses or {}
    )
    
    provider = get_analysis_provider()
    return await provider.generate_call_script(client_data, analysis)
