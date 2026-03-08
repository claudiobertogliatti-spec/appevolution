"""
STEFANIA AI - Agente Orchestrazione (smistamento e monitoraggio)
Evolution PRO OS

NOTA: Stefania NON interagisce con i partner direttamente.
Lavora in background, monitora lo stato di tutti e smista.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
from emergentintegrations.llm.chat import LlmChat, UserMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

STEFANIA_SYSTEM_PROMPT = """Sei STEFANIA, agente AI di Business Evolution PRO creato da Claudio Bertogliatti.

Il tuo ruolo: orchestrare il sistema di agenti. Monitori tutti i partner attivi,
identifichi situazioni che richiedono intervento, e smisti al giusto agente
(o a Claudio) prima che un problema diventi critico.

Non sei un agente operativo — sei il sistema nervoso centrale.
Non dai risposte dirette ai partner. Attivi gli altri agenti.

---

CONTESTO DISPONIBILE (variabili iniettate a runtime):
{context}

---

REGOLE DI SMISTAMENTO:

Quando un partner scrive o una situazione richiede intervento:

| Tipo di richiesta/situazione | → Agente |
|------------------------------|----------|
| Domanda strategica, dubbi sul metodo, onboarding | → VALENTINA |
| Revisione contenuti, blocco produzione video | → ANDREA |
| Inattività, impegni non rispettati, check-in | → MARCO |
| Problema tecnico, errore piattaforma | → GAIA |
| Abbandono, rimborso, questioni legali, crisi | → Claudio |

Regola di priorità: se una situazione può coinvolgere più agenti, attiva prima quello più urgente.

---

MONITORAGGIO PROATTIVO:

Ogni giorno verifichi queste condizioni e attivi automaticamente:

1. Partner inattivi da più di 7 giorni → attiva MARCO

2. Partner con problemi tecnici ricorrenti (stesso problema >2 volte) → attiva GAIA + segnala a Claudio

3. Partner in fase 7 (pre-lancio) senza completamento checklist lancio → attiva VALENTINA

4. Partner con piano continuità in scadenza entro 30 giorni → segnala a Claudio

5. Alert aperti non risolti da più di 48h → escalation a Claudio

---

QUANDO SCALA DIRETTAMENTE A CLAUDIO (bypassando gli altri agenti):
- Abbandono dichiarato da un partner.
- Richiesta rimborso.
- Qualsiasi questione legale o contrattuale.
- Partner non raggiungibile da più di 3 settimane.
- Problema tecnico critico che blocca l'accademia (zero accessi studenti).
- Comportamento anomalo di un agente (loop, risposte errate ripetute).

---

NON FAI MAI:
- Non rispondi direttamente ai partner — smisti sempre.
- Non prendere decisioni operative che spettano a Claudio.
- Non aspettare che un problema diventi critico — agisci al primo segnale.
- Non attivare più agenti sullo stesso problema contemporaneamente (scegli il principale).

Rispondi sempre in italiano con report strutturati."""


class StefaniaAI:
    """STEFANIA AI Agent - Orchestration System"""
    
    def __init__(self):
        self.routing_rules = {
            "strategica": "VALENTINA",
            "metodo": "VALENTINA",
            "onboarding": "VALENTINA",
            "nicchia": "VALENTINA",
            "posizionamento": "VALENTINA",
            "video": "ANDREA",
            "registrazione": "ANDREA",
            "modulo": "ANDREA",
            "contenuto": "ANDREA",
            "produzione": "ANDREA",
            "inattivo": "MARCO",
            "accountability": "MARCO",
            "impegno": "MARCO",
            "check-in": "MARCO",
            "tecnico": "GAIA",
            "errore": "GAIA",
            "bug": "GAIA",
            "systeme": "GAIA",
            "stripe": "GAIA",
            "rimborso": "CLAUDIO",
            "abbandono": "CLAUDIO",
            "legale": "CLAUDIO",
            "contratto": "CLAUDIO"
        }
    
    def route_message(self, message: str) -> str:
        """Determine which agent should handle a message"""
        message_lower = message.lower()
        
        # Check for Claudio-level issues first
        claudio_keywords = ["rimborso", "abbandono", "legale", "contratto", "cancellare", "disdetta"]
        for keyword in claudio_keywords:
            if keyword in message_lower:
                return "CLAUDIO"
        
        # Check routing rules
        for keyword, agent in self.routing_rules.items():
            if keyword in message_lower:
                return agent
        
        # Default to VALENTINA for general queries
        return "VALENTINA"
    
    def _build_context(self, system_data: dict) -> str:
        """Build context string from system data"""
        context_parts = []
        
        if system_data.get("tutti_i_partner_attivi"):
            context_parts.append(f"- Tutti i partner attivi: {system_data['tutti_i_partner_attivi']}")
        if system_data.get("alert_aperti"):
            context_parts.append(f"- Alert aperti: {system_data['alert_aperti']}")
        if system_data.get("partner_inattivi_7gg"):
            context_parts.append(f"- Partner inattivi da più di 7 giorni: {system_data['partner_inattivi_7gg']}")
        if system_data.get("partner_in_fase_lancio"):
            context_parts.append(f"- Partner in fase lancio: {system_data['partner_in_fase_lancio']}")
        
        return "\n".join(context_parts) if context_parts else "Nessun contesto disponibile"
    
    async def generate_daily_report(self, system_data: dict) -> str:
        """Generate daily report for Claudio"""
        today = datetime.now().strftime("%d/%m/%Y")
        
        partner_count = system_data.get("partner_attivi_count", 0)
        alert_count = system_data.get("alert_count", 0)
        new_alerts = system_data.get("new_alerts_today", 0)
        inactive_list = system_data.get("partner_inattivi_7gg", [])
        prelaunch_list = system_data.get("partner_in_fase_lancio", [])
        expiring_list = system_data.get("piani_in_scadenza_30gg", [])
        actions_today = system_data.get("azioni_oggi", [])
        critical_situations = system_data.get("situazioni_critiche", [])
        
        report = f"""REPORT STEFANIA — {today}

Partner attivi: {partner_count}
Alert aperti: {alert_count} | Nuovi oggi: {new_alerts}
Partner inattivi >7gg: {', '.join(inactive_list) if inactive_list else 'Nessuno'}
Partner in pre-lancio: {', '.join(prelaunch_list) if prelaunch_list else 'Nessuno'}
Piani in scadenza 30gg: {', '.join(expiring_list) if expiring_list else 'Nessuno'}

Azioni attivate oggi:
{chr(10).join(['- ' + a for a in actions_today]) if actions_today else '- Nessuna azione automatica'}

Situazioni che richiedono tua attenzione:
{chr(10).join(['- ' + s for s in critical_situations]) if critical_situations else '- Nessuna situazione critica'}"""
        
        return report
    
    async def check_and_trigger(self, partners_data: List[dict], db) -> List[dict]:
        """Check all partners and trigger appropriate agents"""
        triggers = []
        today = datetime.now(timezone.utc)
        
        for partner in partners_data:
            partner_id = str(partner.get("_id", ""))
            nome = partner.get("nome", "Partner")
            
            # Check inactivity
            last_activity = partner.get("last_activity")
            if last_activity:
                if isinstance(last_activity, str):
                    last_activity = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
                days_inactive = (today - last_activity).days
                
                if days_inactive >= 7:
                    triggers.append({
                        "partner_id": partner_id,
                        "partner_name": nome,
                        "trigger_type": "inactivity",
                        "agent": "MARCO",
                        "message": f"[TRIGGER STEFANIA] {nome} inattivo da {days_inactive} giorni. Attiva protocollo accountability.",
                        "days": days_inactive
                    })
            
            # Check pre-launch phase
            current_phase = partner.get("current_phase", "")
            if current_phase == "F7":
                checklist_complete = partner.get("checklist_lancio_completata", False)
                if not checklist_complete:
                    triggers.append({
                        "partner_id": partner_id,
                        "partner_name": nome,
                        "trigger_type": "prelaunch_incomplete",
                        "agent": "VALENTINA",
                        "message": f"[PRE-LANCIO] {nome} è in fase 7. Checklist lancio non completata."
                    })
            
            # Check plan expiration
            plan_expiry = partner.get("plan_expiry_date")
            if plan_expiry:
                if isinstance(plan_expiry, str):
                    plan_expiry = datetime.fromisoformat(plan_expiry.replace("Z", "+00:00"))
                days_to_expiry = (plan_expiry - today).days
                
                if 0 < days_to_expiry <= 30:
                    piano = partner.get("piano_attivo", "N/A")
                    triggers.append({
                        "partner_id": partner_id,
                        "partner_name": nome,
                        "trigger_type": "plan_expiring",
                        "agent": "CLAUDIO",
                        "message": f"[RINNOVO] {nome} — piano {piano} scade tra {days_to_expiry} giorni. Check-in consigliato."
                    })
        
        return triggers
    
    async def analyze_situation(self, message: str, partner_data: dict = None) -> dict:
        """Analyze a situation and recommend routing"""
        agent = self.route_message(message)
        
        return {
            "recommended_agent": agent,
            "analysis": f"Messaggio analizzato. Situazione pertinente a {agent}.",
            "priority": "HIGH" if agent == "CLAUDIO" else "NORMAL"
        }


# Global instance
stefania_ai = StefaniaAI()
