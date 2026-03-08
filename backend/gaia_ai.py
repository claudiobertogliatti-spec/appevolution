"""
GAIA AI - Agente Supporto Tecnico
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

GAIA_SYSTEM_PROMPT = """Sei GAIA, agente AI di Business Evolution PRO creato da Claudio Bertogliatti.

Il tuo ruolo: risolvere i problemi tecnici dei partner in modo rapido e preciso.
Non sei un help desk generico — conosci lo stack Evolution PRO:
Systeme.io, Descript, Stripe, l'app Evolution PRO OS, e gli strumenti consigliati nel programma.

---

CONTESTO DISPONIBILE:
- Nome partner: {nome_partner}
- Piano attivo: {piano_attivo}
- URL accademia: {accademia_url}
- Strumenti configurati: {strumenti_configurati}
- Errore segnalato: {errore_segnalato}

---

COME COMUNICHI:
- Precisa e metodica. Il caos tecnico si risolve con ordine.
- Soluzioni in passaggi numerati — sempre.
- Prima di dare soluzioni, capisci il problema esatto.
- Non supposizioni. Non "prova a fare X e vedi". Steps verificabili.

---

PROTOCOLLO DIAGNOSI:

Prima domanda SEMPRE, senza eccezioni:
"Dimmi esattamente due cose:
1. Cosa stai cercando di fare (azione specifica).
2. Cosa vedi invece (messaggio di errore, schermata, comportamento anomalo)."

Non procedere con soluzioni finché non hai entrambe le informazioni.

---

PROTOCOLLO RISOLUZIONE:

Dopo la diagnosi:
1. Identifica se il problema è noto (errori comuni Systeme.io, Stripe, configurazione DNS, ecc.).
2. Dai la soluzione in passaggi numerati:
   "Ecco i passi da seguire:
   1. [azione specifica]
   2. [azione specifica]
   3. Confermi che hai completato questi passaggi? Dimmi cosa vedi ora."
3. Attendi conferma prima di dare passi successivi.
4. Se il problema non si risolve entro 30 minuti di scambio → escalation a Claudio.

---

NON FAI MAI:
- Non gestisci rimborsi o modifiche contrattuali → Claudio diretto.
- Non dai soluzioni su strumenti fuori dallo stack Evolution PRO.
- Non rispondi a domande strategiche → VALENTINA.
- Non gestisci problemi di avanzamento corso → ANDREA.
- Non improvvisi soluzioni non verificate — se non sei certa, dillo e scala.

Rispondi sempre in italiano."""


def ask_gaia(user_message: str, context: dict) -> str:
    """
    Invia un messaggio a GAIA con il contesto del partner.
    Restituisce la risposta dell'agente come stringa.
    """
    if not EMERGENT_LLM_KEY:
        return "Errore: API key non configurata. Contatta il supporto."
    
    try:
        # Fill context with defaults
        filled_context = {
            "nome_partner": context.get("nome_partner", "Partner"),
            "piano_attivo": context.get("piano_attivo", "N/A"),
            "accademia_url": context.get("accademia_url", "Non configurato"),
            "strumenti_configurati": context.get("strumenti_configurati", "N/A"),
            "errore_segnalato": context.get("errore_segnalato", "Non specificato")
        }
        
        prompt_with_context = GAIA_SYSTEM_PROMPT.format(**filled_context)
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"gaia_{context.get('partner_id', 'unknown')}_{datetime.now().strftime('%Y%m%d%H')}",
            system_message=prompt_with_context
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, chat.send_message(UserMessage(text=user_message)))
                return future.result()
        else:
            return asyncio.run(chat.send_message(UserMessage(text=user_message)))
            
    except Exception as e:
        logger.error(f"[GAIA] Errore ask_gaia: {e}")
        return f"Mi scuso, ho riscontrato un errore tecnico. Riprova tra poco."


class GaiaAI:
    """GAIA AI Agent - Technical Support"""
    
    def __init__(self):
        self.chat_sessions = {}
        self.known_issues = {
            "systeme_login": "Problema accesso Systeme.io: verifica di usare il link corretto del sub-account e che la password sia quella fornita all'attivazione.",
            "stripe_not_connected": "Stripe non collegato: vai su Impostazioni > Integrazioni > Stripe e segui la procedura di connessione.",
            "video_upload_failed": "Upload video fallito: verifica che il file sia in formato MP4, max 2GB, e che la connessione sia stabile.",
            "dns_propagation": "Dominio non funziona: la propagazione DNS può richiedere fino a 48 ore. Verifica su dnschecker.org",
            "email_not_delivered": "Email non ricevute: controlla la cartella spam e aggiungi il dominio ai contatti sicuri."
        }
    
    async def chat(self, partner_id: str, message: str, partner_data: dict = None) -> str:
        """Send message to GAIA and get response"""
        context = partner_data or {}
        context["partner_id"] = partner_id
        return ask_gaia(message, context)
    
    def check_known_issue(self, error_description: str) -> Optional[str]:
        """Check if error matches a known issue"""
        error_lower = error_description.lower()
        
        if "login" in error_lower or "accesso" in error_lower:
            return self.known_issues["systeme_login"]
        if "stripe" in error_lower:
            return self.known_issues["stripe_not_connected"]
        if "upload" in error_lower or "video" in error_lower:
            return self.known_issues["video_upload_failed"]
        if "dominio" in error_lower or "dns" in error_lower:
            return self.known_issues["dns_propagation"]
        if "email" in error_lower or "mail" in error_lower:
            return self.known_issues["email_not_delivered"]
        
        return None
    
    async def diagnose(self, error_description: str) -> str:
        """Start diagnosis protocol"""
        known = self.check_known_issue(error_description)
        
        if known:
            return f"""Ho identificato un problema noto.

**Soluzione rapida:**
{known}

Se questo non risolve il problema, dimmi esattamente:
1. Cosa stai cercando di fare (azione specifica).
2. Cosa vedi invece (messaggio di errore, schermata, comportamento anomalo)."""
        
        return """Per aiutarti al meglio, dimmi esattamente due cose:
1. Cosa stai cercando di fare (azione specifica).
2. Cosa vedi invece (messaggio di errore, schermata, comportamento anomalo).

Non procedere con tentativi casuali — risolviamo questo in modo metodico."""


# Global instance
gaia_ai = GaiaAI()
