"""
Ollama Service - Local LLM Integration
Evolution PRO OS

Gestisce le chiamate al modello Llama 3 locale via Ollama per:
- Gaia: Scraping massivo e analisi HTML
- Discovery Engine: Pulizia lead e deduplica
- Micro-post generation: Contenuti social brevi
- Data validation: Controllo e normalizzazione dati

Gerarchia Potenza:
- Claude Opus (Cloud): Strategia, Analisi 21 Sezioni, Marco Coaching
- Ollama/Llama 3 (Local): Scraping, micro-post, controllo dati (zero costi, token infiniti)
"""

import os
import httpx
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_HOST = os.environ.get('OLLAMA_HOST', 'http://host.docker.internal:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3:8b')
OLLAMA_TIMEOUT = int(os.environ.get('OLLAMA_TIMEOUT', '120'))

# Fallback hosts to try
OLLAMA_FALLBACK_HOSTS = [
    'http://host.docker.internal:11434',
    'http://172.17.0.1:11434',
    'http://localhost:11434',
]


class OllamaService:
    """
    Servizio per interagire con Ollama (LLM locale).
    Usato per task ad alto volume e basso costo.
    """
    
    def __init__(self):
        self.host = OLLAMA_HOST
        self.model = OLLAMA_MODEL
        self.timeout = OLLAMA_TIMEOUT
        self._connected = None
        self._active_host = None
        # Headers per tunnel (ngrok, localtunnel)
        self._headers = {
            "ngrok-skip-browser-warning": "true",
            "bypass-tunnel-reminder": "true",
            "User-Agent": "EvolutionPRO-Ollama/1.0"
        }
    
    async def _find_active_host(self) -> Optional[str]:
        """Trova un host Ollama attivo tra i fallback"""
        hosts_to_try = [self.host] + [h for h in OLLAMA_FALLBACK_HOSTS if h != self.host]
        
        for host in hosts_to_try:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(f"{host}/api/tags", headers=self._headers)
                    if response.status_code == 200:
                        logger.info(f"[Ollama] Connesso a {host}")
                        self._active_host = host
                        return host
            except Exception as e:
                logger.debug(f"[Ollama] Host {host} non raggiungibile: {e}")
                continue
        
        logger.warning("[Ollama] Nessun host Ollama raggiungibile")
        return None
    
    async def is_available(self) -> bool:
        """Verifica se Ollama è disponibile"""
        if self._active_host:
            return True
        
        host = await self._find_active_host()
        self._connected = host is not None
        return self._connected
    
    async def get_status(self) -> Dict[str, Any]:
        """Ritorna lo stato del servizio Ollama"""
        available = await self.is_available()
        
        if not available:
            return {
                "available": False,
                "host": self.host,
                "model": self.model,
                "error": "Ollama non raggiungibile"
            }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self._active_host}/api/tags", headers=self._headers)
                data = response.json()
                models = [m.get("name") for m in data.get("models", [])]
                
                return {
                    "available": True,
                    "host": self._active_host,
                    "model": self.model,
                    "models_available": models,
                    "model_loaded": self.model in models or any(self.model.split(":")[0] in m for m in models)
                }
        except Exception as e:
            return {
                "available": False,
                "host": self._active_host,
                "model": self.model,
                "error": str(e)
            }
    
    async def pull_model(self, model: str = None) -> Dict[str, Any]:
        """Scarica un modello se non presente"""
        model = model or self.model
        
        if not await self.is_available():
            return {"success": False, "error": "Ollama non disponibile"}
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    f"{self._active_host}/api/pull",
                    json={"name": model},
                    headers=self._headers,
                    timeout=300.0
                )
                
                if response.status_code == 200:
                    logger.info(f"[Ollama] Modello {model} scaricato/aggiornato")
                    return {"success": True, "model": model}
                else:
                    return {"success": False, "error": response.text}
        except Exception as e:
            logger.error(f"[Ollama] Errore pull modello: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate(
        self,
        prompt: str,
        system: str = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        format: str = None  # "json" for JSON output
    ) -> Optional[str]:
        """
        Genera testo con Ollama.
        
        Args:
            prompt: Il prompt utente
            system: System message opzionale
            temperature: Creatività (0.0-1.0)
            max_tokens: Massimo token in output
            format: "json" per output JSON strutturato
        
        Returns:
            Il testo generato o None se errore
        """
        if not await self.is_available():
            logger.error("[Ollama] Servizio non disponibile")
            return None
        
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            if system:
                payload["system"] = system
            
            if format == "json":
                payload["format"] = "json"
            
            async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                response = await client.post(
                    f"{self._active_host}/api/generate",
                    json=payload,
                    headers=self._headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("response", "")
                else:
                    logger.error(f"[Ollama] Errore generate: {response.status_code} - {response.text}")
                    return None
                    
        except httpx.TimeoutException:
            logger.error(f"[Ollama] Timeout dopo {self.timeout}s")
            return None
        except Exception as e:
            logger.error(f"[Ollama] Errore generate: {e}")
            return None
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 2048,
        format: str = None
    ) -> Optional[str]:
        """
        Chat multi-turn con Ollama.
        
        Args:
            messages: Lista di messaggi [{"role": "user/assistant/system", "content": "..."}]
            temperature: Creatività
            max_tokens: Massimo token
            format: "json" per output strutturato
        
        Returns:
            Risposta dell'assistente
        """
        if not await self.is_available():
            logger.error("[Ollama] Servizio non disponibile")
            return None
        
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            if format == "json":
                payload["format"] = "json"
            
            async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                response = await client.post(
                    f"{self._active_host}/api/chat",
                    json=payload,
                    headers=self._headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("message", {}).get("content", "")
                else:
                    logger.error(f"[Ollama] Errore chat: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"[Ollama] Errore chat: {e}")
            return None


# ═══════════════════════════════════════════════════════════════════════════════
# TASK-SPECIFIC FUNCTIONS (Gaia, Discovery, Micro-posts)
# Con FALLBACK AUTOMATICO a Claude quando Ollama non è disponibile
# ═══════════════════════════════════════════════════════════════════════════════

async def extract_lead_data_from_html(html_content: str, source_url: str) -> Dict[str, Any]:
    """
    [GAIA] Estrae dati strutturati da HTML di un sito web.
    USA OLLAMA se disponibile, altrimenti FALLBACK AUTOMATICO a Claude.
    """
    ollama = OllamaService()
    
    # Tronca HTML se troppo lungo
    max_html_length = 12000
    if len(html_content) > max_html_length:
        html_content = html_content[:max_html_length] + "\n... [TRONCATO]"
    
    # ═══════════════════════════════════════════════════════════════════
    # PROVA PRIMA CON OLLAMA (gratis, locale)
    # ═══════════════════════════════════════════════════════════════════
    ollama_available = await ollama.is_available()
    
    if ollama_available:
        logger.info(f"[GAIA] Usando Ollama per analisi: {source_url}")
        
        system_prompt = """Sei un estrattore di dati. Analizza l'HTML e estrai info sul professionista.
Rispondi SOLO con JSON valido."""

        prompt = f"""Analizza questo HTML ed estrai informazioni:

URL: {source_url}

HTML:
{html_content[:8000]}

Rispondi con JSON:
{{
    "nome": "Nome della persona/azienda",
    "titolo": "Titolo professionale",
    "email": "email o null",
    "settore": "Settore/nicchia",
    "servizi": ["servizio1", "servizio2"],
    "confidence_score": 0.0-1.0
}}"""

        response = await ollama.generate(
            prompt=prompt,
            system=system_prompt,
            temperature=0.1,
            max_tokens=1000
        )
        
        if response:
            try:
                result = json.loads(response)
                result["llm_used"] = f"ollama:{ollama.model}"
                result["opportunity_score"] = int(result.get("confidence_score", 0.5) * 10)
                return result
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    try:
                        result = json.loads(json_match.group(0))
                        result["llm_used"] = f"ollama:{ollama.model}"
                        result["opportunity_score"] = int(result.get("confidence_score", 0.5) * 10)
                        return result
                    except json.JSONDecodeError:
                        pass
                logger.warning("[GAIA] Ollama risposta non valida, fallback a Claude")
    
    # ═══════════════════════════════════════════════════════════════════
    # FALLBACK A CLAUDE (sempre disponibile)
    # ═══════════════════════════════════════════════════════════════════
    logger.info(f"[GAIA] Usando Claude (fallback) per analisi: {source_url}")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Crea istanza LLM 
        EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
        if not EMERGENT_KEY:
            return {"error": "EMERGENT_LLM_KEY non configurata", "llm_used": "none"}
        
        llm = LlmChat(
            api_key=EMERGENT_KEY,
            session_id="gaia_fallback",
            system_message="Sei GAIA, un estrattore di dati di Evolution PRO. Rispondi sempre in JSON."
        )
        
        claude_prompt = f"""Analizza questo sito web e estrai informazioni sul professionista/azienda.

URL: {source_url}

HTML (estratto):
{html_content[:10000]}

Rispondi con questo JSON esatto:
{{
    "nome": "Nome completo",
    "titolo": "Titolo professionale o tagline",
    "email": "email se trovata, altrimenti null",
    "settore": "Settore/nicchia",
    "servizi": ["lista", "servizi"],
    "target_audience": "A chi si rivolge",
    "has_courses": true/false,
    "opportunity_score": 1-10,
    "notes": "note utili"
}}

Rispondi SOLO con il JSON."""

        response = await llm.send_message(UserMessage(text=claude_prompt))
        # La risposta può essere stringa o oggetto con .text
        analysis_text = response if isinstance(response, str) else response.text
        analysis_text = analysis_text.strip()
        
        import re
        json_match = re.search(r'\{[\s\S]*\}', analysis_text)
        if json_match:
            result = json.loads(json_match.group())
            result["llm_used"] = "claude:fallback"
            return result
        else:
            return {"raw_analysis": analysis_text, "llm_used": "claude:fallback", "parse_error": True}
            
    except Exception as e:
        logger.error(f"[GAIA] Anche Claude fallito: {e}")
        return {"error": str(e), "llm_used": "none"}


async def clean_and_deduplicate_leads(leads: List[Dict]) -> Dict[str, Any]:
    """
    [DISCOVERY] Pulisce e deduplica una lista di lead.
    Identifica duplicati, normalizza dati, assegna score.
    """
    ollama = OllamaService()
    
    if not leads:
        return {"cleaned_leads": [], "duplicates_removed": 0, "issues": []}
    
    # Prepara i lead per l'analisi
    leads_summary = json.dumps([{
        "id": lead.get("id", ""),
        "name": lead.get("display_name", lead.get("nome", "")),
        "email": lead.get("email", ""),
        "platform": lead.get("source", ""),
        "username": lead.get("platform_username", ""),
        "website": lead.get("website_url", "")
    } for lead in leads[:50]], indent=2)  # Max 50 lead per batch
    
    system_prompt = """Sei un analista dati specializzato in lead management. 
Analizza i lead e identifica duplicati, anomalie e problemi.
Rispondi SOLO con JSON valido."""

    prompt = f"""Analizza questi lead e identifica:
1. Duplicati (stesso email, stesso username su piattaforme diverse, stesso sito web)
2. Dati incompleti o sospetti
3. Lead da scartare (bot, spam, fuori target)

LEAD:
{leads_summary}

Rispondi con questo JSON:
{{
    "duplicate_groups": [
        {{"lead_ids": ["id1", "id2"], "reason": "stesso email/username"}}
    ],
    "invalid_leads": [
        {{"lead_id": "id", "reason": "motivo"}}
    ],
    "data_issues": [
        {{"lead_id": "id", "field": "campo", "issue": "problema"}}
    ],
    "keep_lead_ids": ["lista", "di", "id", "validi"],
    "summary": "Breve riepilogo dell'analisi"
}}"""

    response = await ollama.generate(
        prompt=prompt,
        system=system_prompt,
        temperature=0.1,
        format="json"
    )
    
    if not response:
        return {"error": "Ollama non disponibile", "cleaned_leads": leads}
    
    try:
        analysis = json.loads(response)
        return {
            "analysis": analysis,
            "duplicates_found": len(analysis.get("duplicate_groups", [])),
            "invalid_found": len(analysis.get("invalid_leads", [])),
            "valid_count": len(analysis.get("keep_lead_ids", []))
        }
    except json.JSONDecodeError:
        return {"error": "JSON parsing failed", "raw": response, "cleaned_leads": leads}


async def generate_micro_post(
    topic: str,
    platform: str = "linkedin",
    tone: str = "professionale",
    max_length: int = 280
) -> Dict[str, Any]:
    """
    [MICRO-POST] Genera un micro-post per social media.
    Veloce e a costo zero con Llama 3 locale.
    """
    ollama = OllamaService()
    
    platform_specs = {
        "linkedin": {"max_chars": 3000, "hashtags": 3, "style": "professionale e autorevole"},
        "twitter": {"max_chars": 280, "hashtags": 2, "style": "conciso e incisivo"},
        "instagram": {"max_chars": 2200, "hashtags": 5, "style": "engaging e visivo"},
    }
    
    spec = platform_specs.get(platform, platform_specs["linkedin"])
    actual_max = min(max_length, spec["max_chars"])
    
    system_prompt = f"""Sei un copywriter esperto per Evolution PRO, agenzia che aiuta professionisti a creare videocorsi.
Scrivi post {spec['style']}. Usa massimo {spec['hashtags']} hashtag pertinenti."""

    prompt = f"""Scrivi un micro-post su questo argomento:
TOPIC: {topic}
PIATTAFORMA: {platform}
TONO: {tone}
LUNGHEZZA MAX: {actual_max} caratteri

Il post deve:
- Iniziare con un hook che cattura l'attenzione
- Fornire valore concreto
- Chiudere con una CTA o riflessione
- Includere hashtag pertinenti

Scrivi SOLO il post, nient'altro."""

    response = await ollama.generate(
        prompt=prompt,
        system=system_prompt,
        temperature=0.7,
        max_tokens=500
    )
    
    if not response:
        return {"error": "Ollama non disponibile"}
    
    return {
        "post": response.strip(),
        "platform": platform,
        "char_count": len(response.strip()),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


async def validate_and_normalize_data(data: Dict, schema_type: str = "lead") -> Dict[str, Any]:
    """
    [DATA CONTROL] Valida e normalizza dati secondo uno schema.
    """
    ollama = OllamaService()
    
    schemas = {
        "lead": {
            "required": ["nome", "email"],
            "optional": ["telefono", "website", "settore", "note"]
        },
        "partner": {
            "required": ["nome", "email", "niche"],
            "optional": ["telefono", "website", "social", "note"]
        }
    }
    
    schema = schemas.get(schema_type, schemas["lead"])
    
    system_prompt = """Sei un validatore dati. Controlla i dati e normalizza i formati.
Rispondi SOLO con JSON valido."""

    prompt = f"""Valida e normalizza questi dati:

DATI:
{json.dumps(data, indent=2, ensure_ascii=False)}

SCHEMA:
- Campi obbligatori: {schema['required']}
- Campi opzionali: {schema['optional']}

Controlla:
1. Email valida (formato corretto)
2. Telefono normalizzato (formato italiano +39...)
3. URL validi (http/https)
4. Nomi capitalizzati correttamente

Rispondi con:
{{
    "valid": true/false,
    "normalized_data": {{...dati corretti...}},
    "issues": ["lista problemi trovati"],
    "missing_required": ["campi obbligatori mancanti"]
}}"""

    response = await ollama.generate(
        prompt=prompt,
        system=system_prompt,
        temperature=0.1,
        format="json"
    )
    
    if not response:
        return {"valid": False, "error": "Ollama non disponibile", "original_data": data}
    
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"valid": False, "error": "JSON parsing failed", "raw": response}


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

ollama_service = OllamaService()

# Export
__all__ = [
    "OllamaService",
    "ollama_service",
    "extract_lead_data_from_html",
    "clean_and_deduplicate_leads",
    "generate_micro_post",
    "validate_and_normalize_data"
]
