"""
FILE: /app/backend/marco_ai.py
Aggiungere queste funzioni al file marco_ai.py già creato da Emergent.
"""

import anthropic
import logging

logger = logging.getLogger(__name__)
client = anthropic.Anthropic()

# Il MARCO_SYSTEM_PROMPT è già nel file creato da Emergent.
# Aggiungere solo queste funzioni sotto la variabile del prompt:

def ask_marco(user_message: str, context: dict) -> str:
    """
    Invia un messaggio a MARCO con il contesto del partner.
    Restituisce la risposta dell'agente come stringa.
    """
    try:
        prompt_with_context = MARCO_SYSTEM_PROMPT.format(**context)
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            system=prompt_with_context,
            messages=[{"role": "user", "content": user_message}]
        )
        return message.content[0].text
    except Exception as e:
        logger.error(f"[MARCO] Errore ask_marco: {e}")
        raise


# ─────────────────────────────────────────────────────────────────────────────

"""
FILE: /app/backend/gaia_ai.py
Aggiungere queste funzioni al file gaia_ai.py già creato da Emergent.
"""

def ask_gaia(user_message: str, context: dict) -> str:
    """
    Invia un messaggio a GAIA con il contesto del partner.
    Restituisce la risposta dell'agente come stringa.
    """
    try:
        prompt_with_context = GAIA_SYSTEM_PROMPT.format(**context)
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            system=prompt_with_context,
            messages=[{"role": "user", "content": user_message}]
        )
        return message.content[0].text
    except Exception as e:
        logger.error(f"[GAIA] Errore ask_gaia: {e}")
        raise


# ─────────────────────────────────────────────────────────────────────────────

"""
FILE: /app/backend/stefania_ai.py
Aggiungere queste funzioni al file stefania_ai.py già creato da Emergent.
"""

import json
from database import get_all_active_partners, get_open_alerts, get_inactive_partners

ROUTING_SYSTEM_PROMPT = """
Sei STEFANIA, orchestratrice di Business Evolution PRO.
Analizza il messaggio del partner e rispondi SOLO con un JSON nel formato:
{
  "agente_destinatario": "VALENTINA|ANDREA|MARCO|GAIA|CLAUDIO",
  "motivo": "motivo in una frase",
  "messaggio": "eventuale messaggio da mostrare al partner mentre viene smistato"
}

Regole di routing:
- Domanda strategica, dubbi metodo, onboarding → VALENTINA
- Revisione contenuti, produzione video, blocco corso → ANDREA
- Inattività, impegni, check-in → MARCO
- Problema tecnico, errore piattaforma, strumenti → GAIA
- Rimborso, abbandono, questione legale, crisi → CLAUDIO
"""

def route_message(messaggio: str, contesto: dict) -> dict:
    """
    STEFANIA analizza il messaggio e restituisce agente destinatario + motivo.
    """
    try:
        client_ai = anthropic.Anthropic()
        response = client_ai.messages.create(
            model="claude-opus-4-5",
            max_tokens=256,
            system=ROUTING_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Partner: {contesto.get('nome_partner')}\nFase: {contesto.get('fase_attuale')}\nMessaggio: {messaggio}"
            }]
        )
        raw = response.content[0].text.strip()
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error(f"[STEFANIA] Risposta non JSON: {raw}")
        return {"agente_destinatario": "VALENTINA", "motivo": "fallback", "messaggio": ""}
    except Exception as e:
        logger.error(f"[STEFANIA] Errore route_message: {e}")
        raise


def run_daily_monitoring(partner_ids=None) -> dict:
    """
    Ciclo di monitoraggio giornaliero di STEFANIA.
    Controlla inattivi, pre-lancio, alert aperti, piani in scadenza.
    Restituisce un dict con azioni intraprese e situazioni critiche.
    """
    try:
        # Recupera dati dal DB
        partner_attivi = get_all_active_partners(partner_ids)
        alert_aperti = get_open_alerts()

        azioni = []
        critici = []

        for p in partner_attivi:
            giorni_inattivo = p.get("giorni_inattivo", 0)
            fase = p.get("fase_attuale", "")
            piano = p.get("piano_attivo", "")
            giorni_a_scadenza = p.get("giorni_a_scadenza_piano", 999)

            # Partner inattivi >7 giorni → trigger MARCO
            if giorni_inattivo > 7:
                azioni.append({
                    "trigger": "MARCO",
                    "partner": p["nome"],
                    "motivo": f"Inattivo da {giorni_inattivo} giorni"
                })

            # Pre-lancio senza checklist → trigger VALENTINA
            if "F7" in str(fase) or "lancio" in str(fase).lower():
                if not p.get("checklist_lancio_completa", False):
                    azioni.append({
                        "trigger": "VALENTINA",
                        "partner": p["nome"],
                        "motivo": "In fase lancio senza checklist completa"
                    })

            # Piano in scadenza entro 30 giorni → segnala a Claudio
            if giorni_a_scadenza <= 30:
                critici.append({
                    "tipo": "RINNOVO",
                    "partner": p["nome"],
                    "piano": piano,
                    "giorni_rimasti": giorni_a_scadenza
                })

        # Alert aperti da >48h → escalation Claudio
        for alert in alert_aperti:
            ore_aperto = alert.get("ore_aperto", 0)
            if ore_aperto > 48:
                critici.append({
                    "tipo": "ALERT_SCADUTO",
                    "partner": alert.get("partner"),
                    "alert": alert.get("tipo"),
                    "ore": ore_aperto
                })

        return {
            "partner_analizzati": len(partner_attivi),
            "azioni_attivate": azioni,
            "situazioni_critiche": critici,
            "alert_aperti_totali": len(alert_aperti),
            "data": __import__("datetime").datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"[STEFANIA] Errore run_daily_monitoring: {e}")
        raise
