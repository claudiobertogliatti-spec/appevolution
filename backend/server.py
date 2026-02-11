from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# =============================================================================
# MODELS
# =============================================================================

class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    role: str
    status: str  # ACTIVE, IDLE, ALERT
    budget: int
    category: str

class Partner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    niche: str
    phase: str
    revenue: int = 0
    contract: str
    alert: bool = False
    modules: List[int] = Field(default_factory=lambda: [0]*10)

class PartnerCreate(BaseModel):
    name: str
    niche: str
    phase: str = "F1"
    contract: str

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent: str
    type: str  # BUDGET, BLOCCO
    msg: str
    time: str
    partner: str

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # user, assistant
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatRequest(BaseModel):
    session_id: str
    message: str
    partner_name: str
    partner_niche: str
    partner_phase: str
    modules_done: int

class Module(BaseModel):
    num: int
    title: str
    lessons: List[dict]

# =============================================================================
# SEED DATA
# =============================================================================

INITIAL_AGENTS = [
    {"id": "MAIN", "role": "Sistema Centrale", "status": "ACTIVE", "budget": 12, "category": "Coordinamento"},
    {"id": "VALENTINA", "role": "Orchestratrice", "status": "ACTIVE", "budget": 28, "category": "Partner Contact"},
    {"id": "ORION", "role": "Sales Intelligence", "status": "IDLE", "budget": 4, "category": "Acquisizione"},
    {"id": "MARTA", "role": "CRM & Revenue", "status": "ACTIVE", "budget": 19, "category": "Piattaforma"},
    {"id": "GAIA", "role": "Funnel & Incident", "status": "ALERT", "budget": 41, "category": "Esecuzione Tech"},
    {"id": "ANDREA", "role": "Video Production", "status": "IDLE", "budget": 7, "category": "Produzione"},
    {"id": "STEFANIA", "role": "Copy & Traffico", "status": "ACTIVE", "budget": 33, "category": "ADV & Copy"},
    {"id": "LUCA", "role": "Compliance", "status": "IDLE", "budget": 2, "category": "Verifica"},
    {"id": "ATLAS", "role": "Post-Sale & LTV", "status": "IDLE", "budget": 0, "category": "Retention"},
]

INITIAL_PARTNERS = [
    {"id": "1", "name": "Marco Ferretti", "niche": "Business Coach", "phase": "F5", "revenue": 0, "contract": "2025-01-10", "alert": False, "modules": [1,1,1,1,0,0,0,0,0,0]},
    {"id": "2", "name": "Sara Lombardi", "niche": "Psicologa", "phase": "F3", "revenue": 0, "contract": "2025-01-22", "alert": True, "modules": [1,1,1,0,0,0,0,0,0,0]},
    {"id": "3", "name": "Luca Marini", "niche": "Formatore HR", "phase": "F8", "revenue": 4200, "contract": "2024-11-05", "alert": False, "modules": [1,1,1,1,1,1,1,1,0,0]},
    {"id": "4", "name": "Giulia Rossi", "niche": "Life Coach", "phase": "F9", "revenue": 8700, "contract": "2024-10-12", "alert": False, "modules": [1,1,1,1,1,1,1,1,1,0]},
    {"id": "5", "name": "Antonio Bianchi", "niche": "Consulente Fiscale", "phase": "F1", "revenue": 0, "contract": "2025-02-01", "alert": True, "modules": [1,0,0,0,0,0,0,0,0,0]},
]

INITIAL_ALERTS = [
    {"id": "1", "agent": "GAIA", "type": "BUDGET", "msg": "Budget al 41% — monitorare consumo mensile", "time": "14 min fa", "partner": "Marco Ferretti"},
    {"id": "2", "agent": "VALENTINA", "type": "BLOCCO", "msg": "Sara Lombardi non ha inviato ATTIVAZIONE OK", "time": "2h fa", "partner": "Sara Lombardi"},
    {"id": "3", "agent": "VALENTINA", "type": "BLOCCO", "msg": "Antonio Bianchi — nessuna risposta da 48h", "time": "1g fa", "partner": "Antonio Bianchi"},
]

MODULES_DATA = [
    {"num": 0, "title": "Introduzione", "lessons": [
        {"title": "Complimenti per la scelta", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Come funziona Evolution PRO", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Il tuo ruolo nella Partnership", "ytId": "dQw4w9WgXcQ", "done": True},
    ]},
    {"num": 1, "title": "Attivazione", "lessons": [
        {"title": "Regole operative", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Drive, Systeme, Telegram", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "File di Posizionamento", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Completare l'ATTIVAZIONE", "ytId": "dQw4w9WgXcQ", "done": True},
    ]},
    {"num": 2, "title": "Masterclass Gratuita", "lessons": [
        {"title": "Perché è obbligatoria", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Struttura Masterclass", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Usare lo script", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Verifica tecnica", "ytId": "dQw4w9WgXcQ", "done": True},
    ]},
    {"num": 3, "title": "Videocorso & Bonus", "lessons": [
        {"title": "Struttura del Videocorso", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Cosa registrare", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Bonus e materiali", "ytId": "dQw4w9WgXcQ", "done": True},
        {"title": "Consegna materiali grezzi", "ytId": "dQw4w9WgXcQ", "done": True},
    ]},
    {"num": 4, "title": "Editing & Branding", "lessons": [
        {"title": "Come funziona l'editing", "ytId": None, "done": False},
        {"title": "Materiali di branding richiesti", "ytId": None, "done": False},
    ]},
    {"num": 5, "title": "Accademia & Funnel", "lessons": [
        {"title": "Area studenti", "ytId": None, "done": False},
        {"title": "Funnel e automazioni", "ytId": None, "done": False},
    ]},
    {"num": 6, "title": "Pre-Lancio", "lessons": [
        {"title": "Calendario editoriale 30gg", "ytId": None, "done": False},
        {"title": "Test del sistema", "ytId": None, "done": False},
    ]},
    {"num": 7, "title": "Lancio", "lessons": [
        {"title": "Allineamento finale", "ytId": None, "done": False},
        {"title": "Lancio ufficiale", "ytId": None, "done": False},
    ]},
    {"num": 8, "title": "Monitoraggio & Ottimizzazione", "lessons": [
        {"title": "Lettura dati", "ytId": None, "done": False},
        {"title": "Ottimizzazioni nel tempo", "ytId": None, "done": False},
    ]},
    {"num": 9, "title": "Scalabilità & Asset", "lessons": [
        {"title": "Trasformare il corso in asset", "ytId": None, "done": False},
    ]},
]

PHASE_LABELS = {
    "F0": "Pre-Onboarding", "F1": "Attivazione", "F2": "Posizionamento", "F3": "Masterclass",
    "F4": "Struttura Corso", "F5": "Produzione", "F6": "Accademia", "F7": "Pre-Lancio",
    "F8": "Lancio", "F9": "Ottimizzazione", "F10": "Scalabilità"
}

# =============================================================================
# STARTUP - SEED DATA
# =============================================================================

@app.on_event("startup")
async def seed_database():
    # Seed agents
    if await db.agents.count_documents({}) == 0:
        await db.agents.insert_many(INITIAL_AGENTS)
        logging.info("Seeded agents collection")
    
    # Seed partners
    if await db.partners.count_documents({}) == 0:
        await db.partners.insert_many(INITIAL_PARTNERS)
        logging.info("Seeded partners collection")
    
    # Seed alerts
    if await db.alerts.count_documents({}) == 0:
        await db.alerts.insert_many(INITIAL_ALERTS)
        logging.info("Seeded alerts collection")
    
    # Seed modules
    if await db.modules.count_documents({}) == 0:
        await db.modules.insert_many(MODULES_DATA)
        logging.info("Seeded modules collection")

# =============================================================================
# ROUTES - AGENTS
# =============================================================================

@api_router.get("/agents", response_model=List[Agent])
async def get_agents():
    agents = await db.agents.find({}, {"_id": 0}).to_list(100)
    return agents

@api_router.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, status: Optional[str] = None, budget: Optional[int] = None):
    update = {}
    if status:
        update["status"] = status
    if budget is not None:
        update["budget"] = budget
    if update:
        await db.agents.update_one({"id": agent_id}, {"$set": update})
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    return agent

# =============================================================================
# ROUTES - PARTNERS
# =============================================================================

@api_router.get("/partners", response_model=List[Partner])
async def get_partners():
    partners = await db.partners.find({}, {"_id": 0}).to_list(100)
    return partners

@api_router.get("/partners/{partner_id}")
async def get_partner(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner

@api_router.post("/partners", response_model=Partner)
async def create_partner(data: PartnerCreate):
    partner = Partner(**data.model_dump())
    doc = partner.model_dump()
    await db.partners.insert_one(doc)
    return partner

@api_router.patch("/partners/{partner_id}")
async def update_partner(partner_id: str, phase: Optional[str] = None, alert: Optional[bool] = None, modules: Optional[List[int]] = None):
    update = {}
    if phase:
        update["phase"] = phase
    if alert is not None:
        update["alert"] = alert
    if modules:
        update["modules"] = modules
    if update:
        await db.partners.update_one({"id": partner_id}, {"$set": update})
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    return partner

# =============================================================================
# ROUTES - ALERTS
# =============================================================================

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts():
    alerts = await db.alerts.find({}, {"_id": 0}).to_list(100)
    return alerts

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    result = await db.alerts.delete_one({"id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "deleted"}

# =============================================================================
# ROUTES - MODULES
# =============================================================================

@api_router.get("/modules")
async def get_modules():
    modules = await db.modules.find({}, {"_id": 0}).to_list(100)
    return modules

# =============================================================================
# ROUTES - CHAT (VALENTINA)
# =============================================================================

def build_system_prompt(partner_name: str, partner_niche: str, partner_phase: str, modules_done: int):
    phase_label = PHASE_LABELS.get(partner_phase, partner_phase)
    return f"""Sei VALENTINA, l'Orchestratrice di Evolution PRO LLC. Il tuo ruolo è guidare i Partner nel percorso operativo con tono professionale, diretto e caldo. Non sei un chatbot generico: sei parte del team Evolution PRO.

CONTESTO PARTNER ATTUALE:
- Nome: {partner_name}
- Nicchia: {partner_niche}
- Fase corrente: {partner_phase} — {phase_label}
- Moduli completati: {modules_done}/10

REGOLE OPERATIVE (non derogabili):
1. Non anticipare mai le fasi — ogni step deve essere completato nell'ordine stabilito
2. Al termine del Modulo 1, il Partner DEVE scrivere "ATTIVAZIONE OK" su Telegram
3. Non prendere decisioni strategiche al posto di Claudio — scala se necessario
4. Non discutere termini contrattuali — rimanda a Claudio
5. Se la domanda supera il tuo ambito operativo, di' chiaramente che stai escalando ad Antonella
6. Rispondi sempre in italiano, in modo conciso e operativo
7. Non inventare informazioni sul progetto — se non sai, di' che verifichi

COSA PUOI FARE:
- Spiegare come funziona ogni modulo del videocorso operativo
- Ricordare cosa il Partner deve consegnare e quando
- Dare supporto tecnico su Drive, Systeme.io, Telegram
- Rispondere a domande sul metodo EVO (Ecosistema, Validazione, Ottimizzazione)
- Rassicurare il Partner sui tempi e sul processo

Rispondi in modo naturale, come farebbe un membro senior del team. Massimo 3-4 frasi per risposta, a meno che non sia necessario un elenco operativo."""

@api_router.post("/chat")
async def chat_with_valentina(request: ChatRequest):
    try:
        # Get or create chat history for this session
        history = await db.chat_messages.find(
            {"session_id": request.session_id}, 
            {"_id": 0}
        ).sort("timestamp", 1).to_list(50)
        
        # Build messages for LLM
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=request.session_id,
            system_message=build_system_prompt(
                request.partner_name,
                request.partner_niche,
                request.partner_phase,
                request.modules_done
            )
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Add history to chat context
        for msg in history:
            if msg["role"] == "user":
                await chat.send_message(UserMessage(text=msg["content"]))
            # Assistant messages are already in the context from previous calls
        
        # Save user message
        user_msg = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.message
        )
        await db.chat_messages.insert_one(user_msg.model_dump())
        
        # Get response from LLM
        response = await chat.send_message(UserMessage(text=request.message))
        
        # Save assistant response
        assistant_msg = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response
        )
        await db.chat_messages.insert_one(assistant_msg.model_dump())
        
        return {"response": response, "timestamp": assistant_msg.timestamp}
        
    except Exception as e:
        logging.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chat/{session_id}")
async def get_chat_history(session_id: str):
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return messages

@api_router.delete("/chat/{session_id}")
async def clear_chat_history(session_id: str):
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"status": "cleared"}

# =============================================================================
# ROUTES - STATS
# =============================================================================

@api_router.get("/stats")
async def get_stats():
    partners = await db.partners.find({}, {"_id": 0}).to_list(100)
    alerts = await db.alerts.find({}, {"_id": 0}).to_list(100)
    
    total_partners = len(partners)
    active_partners = sum(1 for p in partners if p.get("phase") not in ["F0", "F10"])
    total_revenue = sum(p.get("revenue", 0) for p in partners)
    alerts_count = len(alerts)
    
    # Phase distribution
    phase_dist = {}
    for p in partners:
        phase = p.get("phase", "F0")
        phase_dist[phase] = phase_dist.get(phase, 0) + 1
    
    return {
        "total_partners": total_partners,
        "active_partners": active_partners,
        "total_revenue": total_revenue,
        "alerts_count": alerts_count,
        "phase_distribution": phase_dist
    }

# =============================================================================
# ROOT
# =============================================================================

@api_router.get("/")
async def root():
    return {"message": "Evolution PRO API v1.0"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
