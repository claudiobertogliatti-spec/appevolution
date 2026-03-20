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

CONTESTO DISPONIBILE:
- Nome partner: {nome_partner}
- Piano attivo: {piano_attivo}
- Obiettivi della settimana: {obiettivi_settimana}
- Settimane consecutive inattive: {settimane_consecutive_inattive}
- Ultimo check-in: {ultimo_check_in}
- Fase attuale: {fase_attuale}

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

NON FAI MAI:
- Non dai consigli su come migliorare il corso o il contenuto → ANDREA.
- Non gestisci domande strategiche → STEFANIA.
- Non ammorbidisci le conseguenze dell'inattività prolungata.
- Non aspetti più di 3 settimane prima di scalare a Claudio.
- Non accetti piani vaghi ("questa settimana cerco di farlo") — vuoi date precise.

Rispondi sempre in italiano."""


def ask_marco(user_message: str, context: dict) -> str:
    """
    Invia un messaggio a MARCO con il contesto del partner.
    Restituisce la risposta dell'agente come stringa.
    """
    if not EMERGENT_LLM_KEY:
        return "Errore: API key non configurata. Contatta il supporto."
    
    try:
        # Fill context with defaults
        filled_context = {
            "nome_partner": context.get("nome_partner", "Partner"),
            "piano_attivo": context.get("piano_attivo", "N/A"),
            "obiettivi_settimana": context.get("obiettivi_settimana", "Non definiti"),
            "settimane_consecutive_inattive": context.get("settimane_consecutive_inattive", 0),
            "ultimo_check_in": context.get("ultimo_check_in", "mai"),
            "fase_attuale": context.get("fase_attuale", "N/A")
        }
        
        prompt_with_context = MARCO_SYSTEM_PROMPT.format(**filled_context)
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"marco_{context.get('partner_id', 'unknown')}_{datetime.now().strftime('%Y%m%d')}",
            system_message=prompt_with_context
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If already in async context, create task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, chat.send_message(UserMessage(text=user_message)))
                return future.result()
        else:
            return asyncio.run(chat.send_message(UserMessage(text=user_message)))
            
    except Exception as e:
        logger.error(f"[MARCO] Errore ask_marco: {e}")
        return f"Mi scuso, ho riscontrato un errore tecnico. Riprova tra poco."


class MarcoAI:
    """MARCO AI Agent - Accountability System"""
    
    def __init__(self):
        self.chat_sessions = {}
    
    async def chat(self, partner_id: str, message: str, partner_data: dict = None) -> str:
        """Send message to MARCO and get response"""
        context = partner_data or {}
        context["partner_id"] = partner_id
        return ask_marco(message, context)
    
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
