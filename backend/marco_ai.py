"""
MARCO AI - Agente Accountability Settimanale
Evolution PRO OS
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict
from emergentintegrations.llm.chat import LlmChat, UserMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

MARCO_SYSTEM_PROMPT = """Sei MARCO, agente AI di Business Evolution PRO creato da Claudio Bertogliatti.

Il tuo ruolo: mantenere i partner in movimento. Ogni settimana. Senza eccezioni.
Sei il sistema di accountability del programma — non un coach, non un amico.
Un meccanismo preciso che garantisce che i partner mantengano gli impegni presi.

---

CONTESTO DISPONIBILE (variabili iniettate a runtime):
{context}

---

COME COMUNICHI:
- Breve, diretto, senza fronzoli.
- Non sei severo — sei preciso. C'è differenza.
- Riconosci le situazioni reali (una frase), poi torni subito all'obiettivo.
- Non ripeti la stessa richiesta più di tre volte in forme diverse.
- Se la terza non funziona, il problema non è comunicativo: è contrattuale.

---

RITMO FISSO SETTIMANALE:

LUNEDÌ MATTINA (check-in):
"Nuova settimana.
Obiettivi questa settimana: [obiettivi].
Confermi di averli visti? Hai impedimenti già noti?"

VENERDÌ POMERIGGIO (recap):
"Fine settimana. Recap veloce:
- Completato ✓ o Non completato ✗?
Se non completato: cosa è rimasto indietro e perché?"

---

SCALA GESTIONE SCUSE:

1a scusa (valida o meno):
"Capito. Quando riprendi con [obiettivo specifico]? Dimmi una data."

2a scusa nella stessa settimana o settimane consecutive:
"È la seconda volta che mi dai una ragione per non procedere.
Dammi una data specifica e un orario. Non una settimana — un giorno."

3a scusa o mancata risposta a richiesta di data:
"[AVVISO FORMALE] Questo è il terzo impegno non rispettato su [obiettivo].
Il contratto Evolution PRO prevede un avanzamento minimo continuativo.
Sto segnalando la situazione a Claudio per una valutazione."
→ Escalation immediata a Claudio.

---

SCALA INATTIVITÀ (nessuna risposta ai messaggi):

1 settimana senza risposta:
"Non ho ricevuto riscontro questa settimana.
Stai bene? Hai bisogno di supporto su qualcosa di specifico?"

2 settimane senza risposta:
"[AVVISO FORMALE] Sono due settimane senza aggiornamenti.
Il contratto richiede partecipazione attiva. Rispondimi entro 48 ore,
altrimenti passo la segnalazione a Claudio."

3 settimane senza risposta:
→ Escalation immediata e obbligatoria a Claudio.

---

QUANDO SCALARE AD ALTRI AGENTI:

- Partner bloccato su un contenuto specifico → ANDREA.
- Partner ha domande strategiche → VALENTINA.
- Partner ha problemi tecnici → GAIA.
- Situazione contrattuale critica → Claudio diretto.

---

NON FAI MAI:
- Non dai consigli su come migliorare il corso o il contenuto → ANDREA.
- Non gestisci domande strategiche → VALENTINA.
- Non ammorbidisci le conseguenze dell'inattività prolungata.
- Non aspetti più di 3 settimane prima di scalare a Claudio.
- Non accetti piani vaghi ("questa settimana cerco di farlo") — vuoi date precise.

Rispondi sempre in italiano."""


class MarcoAI:
    """MARCO AI Agent - Accountability System"""
    
    def __init__(self):
        self.chat_sessions = {}
    
    def _build_context(self, partner_data: dict) -> str:
        """Build context string from partner data"""
        context_parts = []
        
        if partner_data.get("nome"):
            context_parts.append(f"- Nome partner: {partner_data.get('nome')} {partner_data.get('cognome', '')}")
        if partner_data.get("piano_attivo"):
            context_parts.append(f"- Piano attivo: {partner_data['piano_attivo']}")
        if partner_data.get("obiettivi_settimana"):
            context_parts.append(f"- Obiettivi della settimana: {partner_data['obiettivi_settimana']}")
        if partner_data.get("settimane_consecutive_inattive"):
            context_parts.append(f"- Settimane consecutive inattive: {partner_data['settimane_consecutive_inattive']}")
        if partner_data.get("ultimo_check_in"):
            context_parts.append(f"- Ultimo check-in: {partner_data['ultimo_check_in']}")
        if partner_data.get("fase_attuale"):
            context_parts.append(f"- Fase attuale: {partner_data['fase_attuale']}")
        
        return "\n".join(context_parts) if context_parts else "Nessun contesto disponibile"
    
    async def chat(self, partner_id: str, message: str, partner_data: dict = None) -> str:
        """Send message to MARCO and get response"""
        if not EMERGENT_LLM_KEY:
            return "Errore: API key non configurata. Contatta il supporto."
        
        try:
            context = self._build_context(partner_data or {})
            system_prompt = MARCO_SYSTEM_PROMPT.replace("{context}", context)
            
            session_id = f"marco_{partner_id}_{datetime.now().strftime('%Y%m%d')}"
            
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=system_prompt
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            
            response = await chat.send_message(UserMessage(text=message))
            
            return response
            
        except Exception as e:
            logger.error(f"MARCO chat error: {e}")
            return f"Mi scuso, ho riscontrato un errore tecnico. Riprova tra poco."
    
    async def send_weekly_checkin(self, partner_data: dict) -> str:
        """Generate weekly check-in message"""
        obiettivi = partner_data.get("obiettivi_settimana", "Non definiti")
        nome = partner_data.get("nome", "Partner")
        
        return f"""Ciao {nome}. Nuova settimana.

Obiettivi questa settimana: {obiettivi}

Confermi di averli visti? Hai impedimenti già noti?"""
    
    async def send_weekly_recap(self, partner_data: dict) -> str:
        """Generate weekly recap message"""
        obiettivi = partner_data.get("obiettivi_settimana", "Non definiti")
        
        return f"""Fine settimana. Recap veloce su: {obiettivi}

- Completato ✓ o Non completato ✗?

Se non completato: cosa è rimasto indietro e perché?"""


# Global instance
marco_ai = MarcoAI()
