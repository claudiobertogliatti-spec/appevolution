"""
STEFANIA AI - Agente Orchestrazione (smistamento e monitoraggio)
Evolution PRO OS
"""

import os
import json
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
| Domanda strategica, dubbi sul metodo, onboarding | → STEFANIA |
| Revisione contenuti, blocco produzione video | → ANDREA |
| Inattività, impegni non rispettati, check-in | → MARCO |
| Problema tecnico, errore piattaforma | → GAIA |
| Abbandono, rimborso, questioni legali, crisi | → Claudio |

Regola di priorità: se una situazione può coinvolgere più agenti, attiva prima quello più urgente.

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


ROUTING_SYSTEM_PROMPT = """
Sei STEFANIA, orchestratrice di Business Evolution PRO.
Analizza il messaggio del partner e rispondi SOLO con un JSON nel formato:
{
  "agente_destinatario": "STEFANIA|ANDREA|MARCO|GAIA|CLAUDIO",
  "motivo": "motivo in una frase",
  "messaggio": "eventuale messaggio da mostrare al partner mentre viene smistato"
}

Regole di routing:
- Domanda strategica, dubbi metodo, onboarding → STEFANIA
- Revisione contenuti, produzione video, blocco corso → ANDREA
- Inattività, impegni, check-in → MARCO
- Problema tecnico, errore piattaforma, strumenti → GAIA
- Rimborso, abbandono, questione legale, crisi → CLAUDIO
"""


def route_message(messaggio: str, contesto: dict) -> dict:
    """
    STEFANIA analizza il messaggio e restituisce agente destinatario + motivo.
    """
    if not EMERGENT_LLM_KEY:
        return {"agente_destinatario": "STEFANIA", "motivo": "fallback - no API key", "messaggio": ""}
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"stefania_routing_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message=ROUTING_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        prompt = f"Partner: {contesto.get('nome_partner', 'N/A')}\nFase: {contesto.get('fase_attuale', 'N/A')}\nMessaggio: {messaggio}"
        
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, chat.send_message(UserMessage(text=prompt)))
                    raw = future.result()
            else:
                raw = asyncio.run(chat.send_message(UserMessage(text=prompt)))
        except RuntimeError:
            raw = asyncio.run(chat.send_message(UserMessage(text=prompt)))
        
        # Parse JSON response
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        
        return json.loads(raw)
        
    except json.JSONDecodeError as e:
        logger.error(f"[STEFANIA] Risposta non JSON: {raw}")
        # Fallback to keyword-based routing
        return _keyword_routing(messaggio)
    except Exception as e:
        logger.error(f"[STEFANIA] Errore route_message: {e}")
        return _keyword_routing(messaggio)


def _keyword_routing(messaggio: str) -> dict:
    """Fallback keyword-based routing"""
    messaggio_lower = messaggio.lower()
    
    # Check for Claudio-level issues first
    if any(kw in messaggio_lower for kw in ["rimborso", "abbandono", "legale", "contratto", "cancellare", "disdetta"]):
        return {"agente_destinatario": "CLAUDIO", "motivo": "Questione critica rilevata", "messaggio": "Sto passando la tua richiesta direttamente a Claudio."}
    
    # Technical issues
    if any(kw in messaggio_lower for kw in ["tecnico", "errore", "bug", "systeme", "stripe", "non funziona", "problema"]):
        return {"agente_destinatario": "GAIA", "motivo": "Problema tecnico", "messaggio": "Ti metto in contatto con GAIA per supporto tecnico."}
    
    # Content/production issues
    if any(kw in messaggio_lower for kw in ["video", "registrazione", "modulo", "contenuto", "produzione", "revisione"]):
        return {"agente_destinatario": "ANDREA", "motivo": "Produzione contenuti", "messaggio": "Ti metto in contatto con ANDREA per la produzione."}
    
    # Accountability
    if any(kw in messaggio_lower for kw in ["inattivo", "fermo", "impegno", "settimana", "check-in"]):
        return {"agente_destinatario": "MARCO", "motivo": "Accountability", "messaggio": "Ti metto in contatto con MARCO."}
    
    # Default to STEFANIA
    return {"agente_destinatario": "STEFANIA", "motivo": "Supporto generale", "messaggio": "Ti metto in contatto con STEFANIA."}


def run_daily_monitoring(partner_ids=None) -> dict:
    """
    Ciclo di monitoraggio giornaliero di STEFANIA.
    Controlla inattivi, pre-lancio, alert aperti, piani in scadenza.
    Usa Systeme.io MCP per dati MRR e piani reali.
    Restituisce un dict con azioni intraprese e situazioni critiche.
    """
    try:
        # Import Systeme.io MCP client per dati reali
        try:
            from systeme_mcp_client import get_mrr_summary, get_expiring_plans, is_configured as mcp_configured
            use_mcp = mcp_configured()
        except ImportError:
            use_mcp = False
            logger.warning("[STEFANIA] systeme_mcp_client non disponibile - uso dati locali")
        
        # Get MRR summary from Systeme.io (if configured)
        mrr_data = {}
        piani_scadenza = []
        if use_mcp:
            try:
                mrr_data = get_mrr_summary()
                piani_scadenza = get_expiring_plans(30)
                logger.info(f"[STEFANIA] Dati MRR da Systeme.io: MRR={mrr_data.get('mrr_totale', 0)}, Piani={mrr_data.get('piani_attivi', 0)}")
            except Exception as mcp_err:
                logger.warning(f"[STEFANIA] Errore MCP: {mcp_err}")
        
        # Try to get data from database
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            mongo_url = os.environ.get("MONGO_URL", "")
            db_name = os.environ.get("DB_NAME", "evolution_pro")
            
            if mongo_url:
                import asyncio
                
                async def fetch_data():
                    client = AsyncIOMotorClient(mongo_url)
                    db = client[db_name]
                    
                    # Get active partners
                    query = {"status": {"$in": ["active", "attivo"]}}
                    if partner_ids:
                        from bson import ObjectId
                        query["_id"] = {"$in": [ObjectId(pid) for pid in partner_ids]}
                    
                    partners = await db.partners.find(query).to_list(100)
                    alerts = await db.alerts.find({"status": "open"}).to_list(100)
                    client.close()
                    return partners, alerts
                
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        import concurrent.futures
                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            future = executor.submit(asyncio.run, fetch_data())
                            partner_attivi, alert_aperti = future.result()
                    else:
                        partner_attivi, alert_aperti = asyncio.run(fetch_data())
                except RuntimeError:
                    partner_attivi, alert_aperti = asyncio.run(fetch_data())
            else:
                partner_attivi = []
                alert_aperti = []
        except Exception as db_error:
            logger.warning(f"[STEFANIA] Could not fetch from DB: {db_error}")
            partner_attivi = []
            alert_aperti = []

        azioni = []
        critici = []
        today = datetime.now(timezone.utc)

        for p in partner_attivi:
            nome = p.get("nome", "Partner")
            partner_email = p.get("email", "")
            
            # Calculate days inactive
            last_activity = p.get("last_activity") or p.get("updated_at")
            giorni_inattivo = 0
            if last_activity:
                if isinstance(last_activity, str):
                    last_activity = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
                giorni_inattivo = (today - last_activity).days
            
            fase = p.get("current_phase", p.get("fase_attuale", ""))
            piano = p.get("piano_attivo", "")
            
            # Calculate days to plan expiry
            plan_expiry = p.get("plan_expiry_date")
            giorni_a_scadenza = 999
            if plan_expiry:
                if isinstance(plan_expiry, str):
                    plan_expiry = datetime.fromisoformat(plan_expiry.replace("Z", "+00:00"))
                giorni_a_scadenza = (plan_expiry - today).days

            # Partner inattivi >7 giorni → trigger MARCO
            if giorni_inattivo > 7:
                azioni.append({
                    "trigger": "MARCO",
                    "partner": nome,
                    "motivo": f"Inattivo da {giorni_inattivo} giorni"
                })

            # Pre-lancio senza checklist → trigger STEFANIA
            if "F7" in str(fase) or "lancio" in str(fase).lower():
                if not p.get("checklist_lancio_completa", False):
                    azioni.append({
                        "trigger": "STEFANIA",
                        "partner": nome,
                        "motivo": "In fase lancio senza checklist completa"
                    })

            # Piano in scadenza entro 30 giorni → segnala a Claudio
            if 0 < giorni_a_scadenza <= 30:
                critici.append({
                    "tipo": "RINNOVO",
                    "partner": nome,
                    "piano": piano,
                    "giorni_rimasti": giorni_a_scadenza
                })

        # Add expiring plans from Systeme.io MCP
        for plan in piani_scadenza:
            critici.append({
                "tipo": "RINNOVO_SYSTEME",
                "partner": plan.get("customer_email", "N/A"),
                "piano": plan.get("plan_name", "N/A"),
                "giorni_rimasti": plan.get("days_until_expiry", 0),
                "amount": plan.get("amount", 0)
            })

        # Alert aperti da >48h → escalation Claudio
        for alert in alert_aperti:
            created = alert.get("created_at")
            ore_aperto = 0
            if created:
                if isinstance(created, str):
                    created = datetime.fromisoformat(created.replace("Z", "+00:00"))
                ore_aperto = int((today - created).total_seconds() / 3600)
            
            if ore_aperto > 48:
                critici.append({
                    "tipo": "ALERT_SCADUTO",
                    "partner": alert.get("partner_name", "N/A"),
                    "alert": alert.get("type", "N/A"),
                    "ore": ore_aperto
                })

        return {
            "partner_analizzati": len(partner_attivi),
            "azioni_attivate": azioni,
            "situazioni_critiche": critici,
            "alert_aperti_totali": len(alert_aperti),
            "mrr_systeme": mrr_data,
            "piani_scadenza_systeme": len(piani_scadenza),
            "mcp_configured": use_mcp,
            "data": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"[STEFANIA] Errore run_daily_monitoring: {e}")
        return {
            "partner_analizzati": 0,
            "azioni_attivate": [],
            "situazioni_critiche": [],
            "alert_aperti_totali": 0,
            "data": datetime.utcnow().isoformat(),
            "error": str(e)
        }


def ask_stefania(messaggio: str, contesto: dict) -> str:
    """Send message to STEFANIA for routing analysis"""
    result = route_message(messaggio, contesto)
    return f"Agente destinatario: {result.get('agente_destinatario')}\nMotivo: {result.get('motivo')}"


class StefaniaAI:
    """STEFANIA AI Agent - Orchestration System"""
    
    def __init__(self):
        pass
    
    def route(self, messaggio: str, contesto: dict) -> dict:
        """Route a message to the appropriate agent"""
        return route_message(messaggio, contesto)
    
    def daily_report(self, partner_ids=None) -> dict:
        """Generate daily monitoring report"""
        return run_daily_monitoring(partner_ids)


# Global instance
stefania_ai = StefaniaAI()
