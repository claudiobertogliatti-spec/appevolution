"""
STEFANIA AI - Coordinatrice Evolution PRO
-----------------------------------------
Chat interna per partner e admin con:
- Risposte personalizzate basate su fase e agente responsabile
- Escalation automatica a Claudio per parole chiave sensibili
- Persistenza conversazioni per review admin
- Notifica Telegram per escalation
"""

import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/stefania", tags=["stefania"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPT STEFANIA
# ═══════════════════════════════════════════════════════════════════════════════

STEFANIA_SYSTEM_PROMPT = """Sei STEFANIA, la coordinatrice AI di Evolution PRO.

Parli direttamente con i partner di Evolution PRO — professionisti e manager che stanno costruendo il loro videocorso con il supporto del nostro team.

## Chi sei

Sei il punto di contatto centrale per ogni partner, in qualsiasi fase del percorso.
Non sei un chatbot generico — conosci il partner, la sua fase, i suoi obiettivi.
Il tuo tono è: diretto, professionale, caldo. Mai burocratico.

## Cosa sai fare

- Rispondere a domande sul percorso (dove sono, cosa arriva dopo, cosa ci si aspetta da loro)
- Spiegare cosa sta facendo l'agente responsabile della loro fase (GAIA, ANDREA, MARCO)
- Raccogliere aggiornamenti ("ho caricato il modulo", "ho un problema tecnico", "non riesco a registrare")
- Gestire le aspettative sui tempi
- Escalation a Claudio per rimborsi, reclami o decisioni di business

## Agenti di fase

- **GAIA**: Onboarding (F0-F1), accoglienza, setup iniziale
- **ANDREA**: Contenuti (F2-F5), posizionamento, masterclass, videocorso, funnel
- **MARCO**: Lancio e scaling (F9, LIVE), ottimizzazione, crescita

## Cosa NON fai

- Non fai il lavoro al posto del partner (non scrivi i loro script, non registri i loro video)
- Non gestisci rimborsi o dispute commerciali — li inoltri sempre a Claudio
- Non prometti date precise se non hai conferma dall'agente di fase
- Non dai feedback tecnici sui video — quello è il dominio di ANDREA

## Come rispondi

Quando un partner ti scrive, per prima cosa identifica:
1. In che fase è (F0, F1, F2, F3, F4, F5, F9, LIVE)
2. Qual è il suo agente di riferimento in questo momento
3. Se la sua domanda riguarda un blocco operativo o è una richiesta informativa

Se è un blocco → raccogli i dettagli e dì che lo gestisci entro 24h.
Se è informativa → rispondi direttamente con precisione.

## Tono

- Usa il nome del partner
- Frasi brevi, niente paragrafi lunghi
- Non iniziare mai con "Certo!" o "Assolutamente!" — vai dritto al punto
- Se non sai qualcosa, dillo: "Verifico con [agente responsabile] e ti aggiorno"

## Fasi del percorso Evolution PRO

- **F1**: Onboarding e setup iniziale
- **F2**: Posizionamento e nicchia
- **F3**: Creazione Masterclass (video di vendita)
- **F4**: Strutturazione Videocorso
- **F5**: Costruzione Funnel
- **F9**: Preparazione e Lancio
- **LIVE**: Ottimizzazione continua e scaling"""

# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    partner_id: str
    message: str
    user_role: str = "partner"
    user_name: str = "Partner"
    partner_phase: Optional[str] = None
    partner_niche: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class EscalationRequest(BaseModel):
    partner_id: str
    partner_name: Optional[str] = None
    partner_phase: Optional[str] = None
    message: str
    reason: str = "keyword_detected"

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_responsible_agent(phase: str) -> str:
    """Determina l'agente responsabile in base alla fase"""
    phase_agents = {
        'F0': 'GAIA',
        'F1': 'GAIA',
        'F2': 'ANDREA',
        'F3': 'ANDREA',
        'F4': 'ANDREA',
        'F5': 'ANDREA',
        'F9': 'MARCO',
        'LIVE': 'MARCO'
    }
    return phase_agents.get(phase, 'GAIA')

def build_context_prompt(partner_name: str, phase: str, niche: str, agent: str) -> str:
    """Costruisce il prompt di contesto per la conversazione"""
    return f"""
CONTESTO PARTNER ATTUALE:
- Nome: {partner_name}
- Fase corrente: {phase}
- Nicchia: {niche or 'Non specificata'}
- Agente responsabile: {agent}

Rispondi tenendo conto di questo contesto. Usa il nome del partner quando appropriato.
"""

async def send_telegram_escalation(partner_name: str, partner_phase: str, message: str):
    """Invia notifica Telegram a Claudio per escalation"""
    try:
        import httpx
        
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
        chat_id = os.environ.get("TELEGRAM_CHAT_ID") or os.environ.get("CLAUDIO_TELEGRAM_ID")
        
        if not bot_token or not chat_id:
            logging.warning("Telegram credentials not configured for escalation")
            return False
        
        text = f"""🚨 *ESCALATION STEFANIA*

👤 Partner: {partner_name}
📍 Fase: {partner_phase}
💬 Messaggio:
_{message[:500]}_

⚡ Richiede intervento diretto."""
        
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "Markdown"
                }
            )
        
        return True
    except Exception as e:
        logging.error(f"Error sending Telegram escalation: {e}")
        return False

# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/chat")
async def stefania_chat(data: ChatMessage):
    """Chat con STEFANIA - Coordinatrice AI"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key non configurata")
    
    partner_name = data.user_name or "Partner"
    phase = data.partner_phase or "F1"
    niche = data.partner_niche or ""
    agent = get_responsible_agent(phase)
    
    # Carica storico conversazione
    session_id = f"stefania-{data.partner_id}"
    conversation_history = []
    
    try:
        history = await db.stefania_conversations.find_one(
            {"partner_id": data.partner_id},
            {"_id": 0}
        )
        if history and history.get("messages"):
            conversation_history = history["messages"][-10:]  # Ultimi 10 messaggi
    except Exception as e:
        logging.error(f"Error loading conversation history: {e}")
    
    # Costruisci system prompt con contesto
    context_prompt = build_context_prompt(partner_name, phase, niche, agent)
    full_system_prompt = STEFANIA_SYSTEM_PROMPT + "\n\n" + context_prompt
    
    try:
        # Inizializza chat con Claude Sonnet 4.5
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=full_system_prompt
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Invia messaggio
        reply = await chat.send_message(UserMessage(text=data.message))
        
        # Salva conversazione nel DB
        message_doc = {
            "role": "user",
            "content": data.message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        reply_doc = {
            "role": "assistant",
            "content": reply,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.stefania_conversations.update_one(
            {"partner_id": data.partner_id},
            {
                "$set": {
                    "partner_id": data.partner_id,
                    "partner_name": partner_name,
                    "partner_phase": phase,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "messages": {
                        "$each": [message_doc, reply_doc]
                    }
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "reply": reply,
            "agent": "STEFANIA",
            "responsible_agent": agent
        }
        
    except Exception as e:
        logging.error(f"Error in Stefania chat: {e}")
        raise HTTPException(status_code=500, detail=f"Errore chat: {str(e)}")


@router.post("/escalation")
async def create_escalation(data: EscalationRequest):
    """Crea escalation a Claudio"""
    
    # Salva escalation nel DB
    escalation_doc = {
        "id": str(uuid.uuid4()),
        "partner_id": data.partner_id,
        "partner_name": data.partner_name,
        "partner_phase": data.partner_phase,
        "message": data.message,
        "reason": data.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stefania_escalations.insert_one(escalation_doc)
    
    # Invia notifica Telegram
    await send_telegram_escalation(
        data.partner_name or "Partner",
        data.partner_phase or "N/D",
        data.message
    )
    
    logging.info(f"Escalation created for partner {data.partner_id}: {data.reason}")
    
    return {
        "success": True,
        "escalation_id": escalation_doc["id"],
        "message": "Escalation creata e notificata a Claudio"
    }


@router.get("/conversations/{partner_id}")
async def get_conversation_history(partner_id: str):
    """Recupera storico conversazioni per admin review"""
    conversation = await db.stefania_conversations.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    
    if not conversation:
        return {"messages": [], "partner_id": partner_id}
    
    return conversation


@router.get("/escalations")
async def get_escalations(status: str = None):
    """Lista escalation per admin (filtrabili per status)"""
    query = {}
    if status:
        query["status"] = status
    
    escalations = await db.stefania_escalations.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"escalations": escalations, "count": len(escalations)}


@router.patch("/escalations/{escalation_id}")
async def update_escalation(escalation_id: str, status: str):
    """Aggiorna status escalation (resolved, in_progress, etc.)"""
    await db.stefania_escalations.update_one(
        {"id": escalation_id},
        {"$set": {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "escalation_id": escalation_id, "new_status": status}
