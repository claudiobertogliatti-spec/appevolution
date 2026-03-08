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

CONTESTO DISPONIBILE (variabili iniettate a runtime):
{context}

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

ESCALATION TECNICA (30 minuti senza risoluzione):

"Il problema richiede un intervento diretto.
Sto segnalando a Claudio con tutti i dettagli.
Nel frattempo: [workaround temporaneo se disponibile]."

---

STRUMENTI CHE SUPPORTI:
- Systeme.io (configurazione corsi, automazioni, Stripe, pagine)
- Descript (editing video, overdub, pubblicazione)
- App Evolution PRO OS (accessi, percorso, documenti)
- Email/DNS (configurazione dominio accademia)
- Zoom/Meet (problemi registrazione, link sessioni)

---

NON FAI MAI:
- Non gestisci rimborsi o modifiche contrattuali → Claudio diretto.
- Non dai soluzioni su strumenti fuori dallo stack Evolution PRO.
- Non rispondi a domande strategiche → VALENTINA.
- Non gestisci problemi di avanzamento corso → ANDREA.
- Non improvvisi soluzioni non verificate — se non sei certa, dillo e scala.

Rispondi sempre in italiano."""


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
    
    def _build_context(self, partner_data: dict) -> str:
        """Build context string from partner data"""
        context_parts = []
        
        if partner_data.get("nome"):
            context_parts.append(f"- Nome partner: {partner_data.get('nome')} {partner_data.get('cognome', '')}")
        if partner_data.get("piano_attivo"):
            context_parts.append(f"- Piano attivo: {partner_data['piano_attivo']}")
        if partner_data.get("accademia_url"):
            context_parts.append(f"- URL accademia: {partner_data['accademia_url']}")
        if partner_data.get("strumenti_configurati"):
            context_parts.append(f"- Strumenti configurati: {partner_data['strumenti_configurati']}")
        if partner_data.get("errore_segnalato"):
            context_parts.append(f"- Errore segnalato: {partner_data['errore_segnalato']}")
        
        return "\n".join(context_parts) if context_parts else "Nessun contesto disponibile"
    
    async def chat(self, partner_id: str, message: str, partner_data: dict = None) -> str:
        """Send message to GAIA and get response"""
        if not EMERGENT_LLM_KEY:
            return "Errore: API key non configurata. Contatta il supporto."
        
        try:
            context = self._build_context(partner_data or {})
            system_prompt = GAIA_SYSTEM_PROMPT.replace("{context}", context)
            
            session_id = f"gaia_{partner_id}_{datetime.now().strftime('%Y%m%d%H')}"
            
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=system_prompt
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            
            response = await chat.send_message(UserMessage(text=message))
            
            return response
            
        except Exception as e:
            logger.error(f"GAIA chat error: {e}")
            return f"Mi scuso, ho riscontrato un errore tecnico. Riprova tra poco."
    
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
