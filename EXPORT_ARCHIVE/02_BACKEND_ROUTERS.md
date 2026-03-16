# PARTE 2: BACKEND ROUTERS

## 📁 /app/backend/routers/dependencies.py
```python
"""
Evolution PRO OS - Database & Shared Dependencies
Provides MongoDB connection and common utilities for all routers
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - Read from environment variables
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')

if not mongo_url:
    raise ValueError("MONGO_URL environment variable is required")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

def get_db():
    """Get database instance for dependency injection"""
    return db
```

## 📁 /app/backend/routers/clienti.py
```python
"""
Clienti Router - Handles potential clients who purchase the Strategic Analysis
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from bson import ObjectId
import os
import stripe

router = APIRouter(prefix="/api/clienti", tags=["clienti"])

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")

# MongoDB connection will be set from server.py
db = None

def set_db(database):
    global db
    db = database

# Pydantic Models
class ClienteRegister(BaseModel):
    nome: str
    cognome: str
    email: EmailStr
    telefono: str
    password: str

class ClienteLogin(BaseModel):
    email: EmailStr
    password: str

class QuestionnaireData(BaseModel):
    answers: Dict[str, Any]

class CheckoutRequest(BaseModel):
    cliente_id: str
    email: str
    nome: str
    cognome: str

class PaymentVerify(BaseModel):
    session_id: str

class UpdateStatus(BaseModel):
    status: str  # pending, in_review, completed, approved, not_approved, roadmap
    notes: Optional[str] = None

# Helper to serialize MongoDB documents
def serialize_cliente(cliente):
    if not cliente:
        return None
    return {
        "id": str(cliente["_id"]),
        "nome": cliente.get("nome"),
        "cognome": cliente.get("cognome"),
        "email": cliente.get("email"),
        "telefono": cliente.get("telefono"),
        "status": cliente.get("status", "pending"),
        "has_paid": cliente.get("has_paid", False),
        "questionnaire": cliente.get("questionnaire"),
        "created_at": cliente.get("created_at"),
        "paid_at": cliente.get("paid_at"),
        "notes": cliente.get("notes")
    }

# Routes
@router.post("/register")
async def register_cliente(data: ClienteRegister):
    """Register a new potential client"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Check if email already exists
    existing = await db.clienti.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email già registrata")
    
    # Create cliente
    cliente_doc = {
        "nome": data.nome,
        "cognome": data.cognome,
        "email": data.email,
        "telefono": data.telefono,
        "password": data.password,  # In production, hash this!
        "status": "registered",
        "has_paid": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "questionnaire": None,
        "paid_at": None,
        "notes": None
    }
    
    result = await db.clienti.insert_one(cliente_doc)
    
    return {
        "success": True,
        "cliente_id": str(result.inserted_id),
        "message": "Registrazione completata"
    }

@router.post("/login")
async def login_cliente(data: ClienteLogin):
    """Login existing client"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    cliente = await db.clienti.find_one({"email": data.email})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    if cliente.get("password") != data.password:
        raise HTTPException(status_code=401, detail="Password errata")
    
    return {
        "success": True,
        "cliente": serialize_cliente(cliente)
    }

@router.post("/{cliente_id}/questionnaire")
async def save_questionnaire(cliente_id: str, data: QuestionnaireData):
    """Save questionnaire answers"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        result = await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": {
                "questionnaire": data.answers,
                "questionnaire_completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-checkout-session")
async def create_checkout_session(data: CheckoutRequest, request: Request):
    """Create Stripe checkout session for €67 analysis"""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Get the base URL for redirects
    origin = request.headers.get("origin", "https://evolution-ops.preview.emergentagent.com")
    
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": "Analisi Strategica Personalizzata",
                        "description": "Check di fattibilità + 7 Bonus formativi inclusi",
                    },
                    "unit_amount": 6700,  # €67.00 in cents
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{origin}/analisi-strategica?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/analisi-strategica?payment=cancelled",
            customer_email=data.email,
            metadata={
                "cliente_id": data.cliente_id,
                "tipo": "analisi_strategica"
            }
        )
        
        return {"checkout_url": checkout_session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify-payment")
async def verify_payment(data: PaymentVerify):
    """Verify payment after Stripe redirect"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    try:
        session = stripe.checkout.Session.retrieve(data.session_id)
        
        if session.payment_status == "paid":
            cliente_id = session.metadata.get("cliente_id")
            
            if cliente_id:
                await db.clienti.update_one(
                    {"_id": ObjectId(cliente_id)},
                    {"$set": {
                        "has_paid": True,
                        "status": "pending",
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                        "stripe_session_id": data.session_id
                    }}
                )
            
            return {"success": True, "status": "paid"}
        else:
            return {"success": False, "status": session.payment_status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{cliente_id}")
async def get_cliente(cliente_id: str):
    """Get cliente details"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        cliente = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return serialize_cliente(cliente)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin routes
@router.get("/admin/list")
async def list_clienti(status: Optional[str] = None, has_paid: Optional[bool] = None):
    """List all clienti (admin)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {}
    if status:
        query["status"] = status
    if has_paid is not None:
        query["has_paid"] = has_paid
    
    clienti = await db.clienti.find(query).sort("created_at", -1).to_list(100)
    return [serialize_cliente(c) for c in clienti]

@router.put("/admin/{cliente_id}/status")
async def update_cliente_status(cliente_id: str, data: UpdateStatus):
    """Update cliente status (admin)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        update_data = {
            "status": data.status,
            "status_updated_at": datetime.now(timezone.utc).isoformat()
        }
        if data.notes:
            update_data["notes"] = data.notes
        
        result = await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# AI Analysis Generation
ANALYSIS_SYSTEM_PROMPT = """Sei un esperto stratega di business digitale per Evolution PRO. 
Il tuo compito è creare un documento di ANALISI STRATEGICA PERSONALIZZATA per un potenziale cliente.

STRUTTURA OBBLIGATORIA DEL DOCUMENTO (usa esattamente questi titoli e formato):

# ANALISI STRATEGICA PERSONALIZZATA

## SEZIONE 1 – INTRODUZIONE
- **NOME:** [nome completo cliente]
- **AMBITO:** [descrizione dell'ambito professionale basata sulle risposte]
- **OBIETTIVO IMPLICITO:** [obiettivo strategico dedotto dalle risposte]
- **PROBLEMA ATTUALE:** [problema principale identificato]
- **Considerazioni:** [breve analisi della situazione]

## SEZIONE 2 – ANALISI DEL PROFILO

### ✅ PUNTI DI FORZA
- [punto 1]
- [punto 2]
- [punto 3]
- **Considerazioni:** [commento sui punti di forza]

### ❌ PUNTI CRITICI
- [punto 1]
- [punto 2]
- [punto 3]
- **Considerazioni:** [commento sui punti critici]

## SEZIONE 3 – ANALISI DEL MERCATO E DEL TARGET

### 🎯 TARGET REALE
**Il Mercato NON è:**
- ❌ [chi non è il target]
- ❌ [chi non è il target]

**Il mercato È:**
- ✅ [chi è il target ideale]
- ✅ [chi è il target ideale]
- **Considerazioni:** [analisi del target]

### ⚠️ RISCHIO DI MERCATO
- [rischio 1]
- [rischio 2]
- **Considerazioni:** [analisi rischi]

### 🔎 PROBLEMA PRINCIPALE
- **❌ OGGI:** [situazione attuale problematica]
- **🎯 IL PROBLEMA NON È:** la competenza, il titolo, la preparazione
- **🎯 IL PROBLEMA È:** [problema reale identificato]

## SEZIONE 4 – VALUTAZIONE DELLA VOSTRA IDEA

### 🔴 IDEA COSÌ COM'È
[valutazione critica dell'idea attuale se troppo ampia o non focalizzata]

### 🟢 ASSET PIÙ ADATTO
**Raccomandazione:** [tipo di asset consigliato: Percorso Digitale, Videocorso, eBook, etc.]

**❌ NON:**
- [cosa evitare]

**✅ SÌ:**
- [cosa fare]

### 🔹 PROPOSTA FORMATIVA (ESEMPIO)
**Nome suggerito:** "[nome corso suggerito]"

**Struttura consigliata:**
- Modulo 1 – [titolo]
- Modulo 2 – [titolo]
- Modulo 3 – [titolo]
- Modulo 4 – [titolo]

**🎯 Obiettivo:** [obiettivi del percorso]

## SEZIONE 5 – COME CAMBIA IL TUO MODELLO DI LAVORO

### 🔁 NUOVO MODELLO
1. **Contenuti divulgativi** → [descrizione ruolo]
2. **Corso online** → [descrizione ruolo]
3. **Percorso strutturato** → [descrizione ruolo]
4. **1:1 / Consulenza** → [descrizione ruolo potenziato]

👉 Il lavoro attuale non viene sostituito, viene protetto e potenziato.

## SEZIONE 6 – TEMPISTICHE DI REALIZZAZIONE

### ⏱️ TIMELINE REALISTICA
- **30–60 giorni:** Definizione posizionamento e struttura
- **30 giorni:** Creazione e lancio primo corso/percorso
- **3–9 mesi:** Consolidamento e crescita

❌ Nessuna scorciatoia
❌ Nessuna promessa irreale
✅ Costruzione solida e sostenibile

### ESITO DEL CHECK DI FATTIBILITÀ
[🟢 ADATTO ALLA PARTNERSHIP / 🟡 ADATTO CON ROADMAP / 🔴 NON ADATTO]

[Motivazione dell'esito con eventuali condizioni]

## CONCLUSIONE
[Sintesi finale personalizzata sul potenziale del progetto]

---
**Evolution PRO**
*Trasformiamo competenze reali in asset digitali sostenibili con metodo, serietà e visione di lungo periodo*

---

IMPORTANTE:
- Scrivi SEMPRE in italiano
- Sii specifico e personalizzato basandoti sulle risposte del questionario
- Usa un tono professionale ma accessibile
- L'analisi deve essere dettagliata (almeno 1500 parole)
- Valuta onestamente se il progetto è adatto (🟢), necessita di roadmap (🟡), o non è adatto (🔴)
"""

QUESTION_CONTEXT = {
    "attivita": "Descrizione dell'attività, ruolo e esperienza",
    "guadagno": "Come guadagna principalmente oggi",
    "difficolta": "Difficoltà principale che sta vivendo",
    "prodotto_digitale": "Interesse verso prodotti digitali",
    "tipo_prodotto": "Tipo di prodotto che lo interessa",
    "tecnologia": "Livello di confidenza con la tecnologia",
    "investimento": "Disponibilità ad investire",
    "aspettative": "Aspettative dalla Valutazione Strategica"
}

@router.post("/admin/{cliente_id}/generate-analysis")
async def generate_analysis(cliente_id: str):
    """Generate AI-powered strategic analysis document"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Get cliente data
        cliente = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        questionnaire = cliente.get("questionnaire")
        if not questionnaire:
            raise HTTPException(status_code=400, detail="Questionario non compilato")
        
        # Build context from questionnaire
        answers_text = f"CLIENTE: {cliente.get('nome')} {cliente.get('cognome')}\n\n"
        answers_text += "RISPOSTE AL QUESTIONARIO:\n\n"
        
        for key, value in questionnaire.items():
            label = QUESTION_CONTEXT.get(key, key)
            answers_text += f"**{label}:**\n{value}\n\n"
        
        # Generate analysis with Claude
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"analysis_{cliente_id}_{datetime.now().timestamp()}",
            system_message=ANALYSIS_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(
            text=f"Genera un'ANALISI STRATEGICA PERSONALIZZATA completa per questo cliente basandoti sulle sue risposte:\n\n{answers_text}"
        )
        
        analysis_content = await chat.send_message(user_message)
        
        # Save analysis to database
        await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": {
                "analysis": analysis_content,
                "analysis_generated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "analysis": analysis_content
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore generazione analisi: {str(e)}")

@router.get("/admin/{cliente_id}/analysis")
async def get_analysis(cliente_id: str):
    """Get stored analysis for a cliente"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        cliente = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        analysis = cliente.get("analysis")
        if not analysis:
            return {"success": False, "message": "Analisi non ancora generata"}
        
        return {
            "success": True,
            "analysis": analysis,
            "generated_at": cliente.get("analysis_generated_at")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/{cliente_id}/analysis/pdf")
async def download_analysis_pdf(cliente_id: str):
    """Download analysis as branded PDF"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        cliente = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        analysis = cliente.get("analysis")
        if not analysis:
            raise HTTPException(status_code=400, detail="Analisi non ancora generata")
        
        # Generate PDF
        from services.pdf_generator import generate_analysis_pdf
        
        pdf_bytes = generate_analysis_pdf(
            analysis_text=analysis,
            cliente_nome=cliente.get("nome", ""),
            cliente_cognome=cliente.get("cognome", "")
        )
        
        filename = f"Analisi_Strategica_{cliente.get('nome')}_{cliente.get('cognome')}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore generazione PDF: {str(e)}")
```
