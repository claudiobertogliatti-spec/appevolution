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
import asyncio

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

# New: Pre-call questionnaire model
class QuestionarioPreCall(BaseModel):
    expertise: str
    cliente_ideale: str
    pubblico_esistente: str
    esperienze_passate: str
    ostacolo_principale: str
    obiettivo_12_mesi: str
    perche_adesso: str

class CheckoutRequest(BaseModel):
    cliente_id: str
    email: str
    nome: str
    cognome: str

class PaymentVerify(BaseModel):
    session_id: str

class UpdateStatus(BaseModel):
    status: str  # pagato, questionario_completato, call_fissata, proposta_inviata, convertito, non_convertito
    notes: Optional[str] = None

class FissaCallRequest(BaseModel):
    data_call: str
    note: Optional[str] = None

class NoteClaudoRequest(BaseModel):
    note: str

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
        "stato": cliente.get("stato", "pagato"),
        "has_paid": cliente.get("has_paid", False),
        "data_acquisto": cliente.get("data_acquisto") or cliente.get("paid_at"),
        "created_at": cliente.get("created_at"),
        # Questionario pre-call
        "questionario": cliente.get("questionario", {
            "completato": False,
            "data_compilazione": None,
            "risposte": None
        }),
        # Legacy questionnaire (old flow)
        "questionnaire": cliente.get("questionnaire"),
        # Call info
        "call": cliente.get("call", {
            "data_call": None,
            "note_claudio": None,
            "esito": None
        }),
        # Conversione
        "conversione": cliente.get("conversione", {
            "data_proposta": None,
            "data_risposta": None,
            "convertito": None
        }),
        "notes": cliente.get("notes"),
        # Workflow analisi
        "workflow_status": cliente.get("workflow_status"),
        "docx_analisi_url": cliente.get("docx_analisi_url"),
        "testo_ai": cliente.get("testo_ai"),
        "analisi_generata_at": cliente.get("analisi_generata_at")
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
    """Save questionnaire answers (legacy)"""
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

# ============================================================================
# QUESTIONARIO PRE-CALL (nuovo sistema)
# ============================================================================

@router.post("/{cliente_id}/questionario")
async def save_questionario_precall(cliente_id: str, data: QuestionarioPreCall):
    """Save pre-call questionnaire answers"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        now = datetime.now(timezone.utc).isoformat()
        result = await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": {
                "questionario": {
                    "completato": True,
                    "data_compilazione": now,
                    "risposte": {
                        "expertise": data.expertise,
                        "cliente_ideale": data.cliente_ideale,
                        "pubblico_esistente": data.pubblico_esistente,
                        "esperienze_passate": data.esperienze_passate,
                        "ostacolo_principale": data.ostacolo_principale,
                        "obiettivo_12_mesi": data.obiettivo_12_mesi,
                        "perche_adesso": data.perche_adesso
                    }
                },
                "stato": "questionario_completato"
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {"success": True, "message": "Questionario salvato con successo"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{cliente_id}/questionario")
async def get_questionario_precall(cliente_id: str):
    """Get pre-call questionnaire for a client"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        cliente = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {
            "success": True,
            "questionario": cliente.get("questionario", {
                "completato": False,
                "data_compilazione": None,
                "risposte": None
            })
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# WORKFLOW ANALISI STRATEGICA AUTOMATICA
# ============================================================================

@router.post("/{cliente_id}/avvia-analisi")
async def avvia_analisi(cliente_id: str):
    """
    Avvia il workflow completo di generazione analisi in background.
    Chiamato automaticamente quando il cliente invia il questionario.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Import del workflow
        from analisi_workflow import esegui_workflow_analisi
        
        # Avvia in background per non bloccare la risposta al browser
        asyncio.create_task(esegui_workflow_analisi(str(cliente_id), db))
        
        return {"status": "avviato", "messaggio": "Analisi in elaborazione"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{cliente_id}/workflow-status")
async def workflow_status(cliente_id: str):
    """Stato corrente del workflow (polling dal frontend)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        cliente = await db.clienti.find_one(
            {"_id": ObjectId(cliente_id)},
            {"workflow_status": 1, "docx_analisi_url": 1, "validazione_campi_ko": 1}
        )
        if not cliente:
            # Prova con id stringa
            cliente = await db.clienti.find_one(
                {"id": cliente_id},
                {"workflow_status": 1, "docx_analisi_url": 1, "validazione_campi_ko": 1}
            )
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {
            "workflow_status": cliente.get("workflow_status", "attesa"),
            "docx_url": cliente.get("docx_analisi_url"),
            "campi_ko": cliente.get("validazione_campi_ko", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{cliente_id}/scarica-docx")
async def scarica_docx(cliente_id: str):
    """Download del DOCX generato"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    from fastapi.responses import FileResponse
    from pathlib import Path
    
    try:
        cliente = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            cliente = await db.clienti.find_one({"id": cliente_id})
        
        if not cliente or not cliente.get("docx_analisi_path"):
            raise HTTPException(status_code=404, detail="DOCX non disponibile")
        
        docx_path = cliente["docx_analisi_path"]
        
        if not Path(docx_path).exists():
            raise HTTPException(status_code=404, detail="File non trovato sul server")
        
        return FileResponse(
            path=docx_path,
            filename=Path(docx_path).name,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cliente_id}/fissa-call")
async def fissa_call(cliente_id: str, data: FissaCallRequest):
    """Set call date for a client"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        result = await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": {
                "call.data_call": data.data_call,
                "call.note_claudio": data.note,
                "stato": "call_fissata"
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {"success": True, "message": "Call fissata"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cliente_id}/note-claudio")
async def save_note_claudio(cliente_id: str, data: NoteClaudoRequest):
    """Save Claudio's internal notes"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        result = await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": {"call.note_claudio": data.note}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cliente_id}/converti-partner")
async def converti_in_partner(cliente_id: str):
    """Convert client to partner (creates new partner record)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        cliente = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        # Check if partner already exists
        existing_partner = await db.partners.find_one({"email": cliente.get("email")})
        if existing_partner:
            # Update cliente status
            await db.clienti.update_one(
                {"_id": ObjectId(cliente_id)},
                {"$set": {
                    "stato": "convertito",
                    "conversione.data_risposta": datetime.now(timezone.utc).isoformat(),
                    "conversione.convertito": True
                }}
            )
            return {
                "success": True,
                "partner_id": str(existing_partner["_id"]),
                "message": "Partner già esistente, stato aggiornato"
            }
        
        # Create new partner
        now = datetime.now(timezone.utc).isoformat()
        new_partner = {
            "name": f"{cliente.get('nome', '')} {cliente.get('cognome', '')}".strip(),
            "email": cliente.get("email"),
            "phone": cliente.get("telefono"),
            "niche": "—",
            "phase": "F1",
            "current_phase": "F1",
            "status": "active",
            "created_at": now,
            "source": "analisi_strategica",
            "cliente_id": str(cliente_id),
            "admin_user": "Claudio",
            "admin_notes": f"Convertito da Analisi Strategica il {now[:10]}"
        }
        
        result = await db.partners.insert_one(new_partner)
        
        # Update cliente status
        await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": {
                "stato": "convertito",
                "conversione.data_risposta": now,
                "conversione.convertito": True,
                "partner_id": str(result.inserted_id)
            }}
        )
        
        return {
            "success": True,
            "partner_id": str(result.inserted_id),
            "message": "Cliente convertito in Partner F1"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cliente_id}/segna-non-adatto")
async def segna_non_adatto(cliente_id: str):
    """Mark client as not suitable"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        result = await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": {
                "stato": "non_convertito",
                "conversione.data_risposta": datetime.now(timezone.utc).isoformat(),
                "conversione.convertito": False
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {"success": True, "message": "Cliente segnato come non adatto"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_clienti_stats():
    """Get statistics for admin dashboard"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        total = await db.clienti.count_documents({"has_paid": True})
        questionario_completato = await db.clienti.count_documents({
            "has_paid": True,
            "questionario.completato": True
        })
        call_fissata = await db.clienti.count_documents({
            "has_paid": True,
            "stato": "call_fissata"
        })
        convertiti = await db.clienti.count_documents({
            "has_paid": True,
            "stato": "convertito"
        })
        
        return {
            "totale": total,
            "questionario_completato": questionario_completato,
            "call_fissata": call_fissata,
            "convertiti": convertiti
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-checkout-session")
async def create_checkout_session(data: CheckoutRequest, request: Request):
    """Create Stripe checkout session for €67 analysis"""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Get the base URL for redirects
    origin = request.headers.get("origin", "https://workflow-ai-hub-2.preview.emergentagent.com")
    
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

# ============================================================================
# ANALISI DA REVISIONARE (per Admin Approvazioni)
# ============================================================================

@router.get("/admin/analisi-da-revisionare")
async def get_analisi_da_revisionare():
    """Get all analyses ready for review (stato = analisi_pronta and not reviewed)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Find clients with generated analysis that haven't been reviewed yet
        clienti = await db.clienti.find({
            "docx_analisi_url": {"$exists": True, "$ne": None},
            "analisi_revisionata": {"$ne": True}
        }).sort("analisi_generata_at", -1).to_list(100)
        
        return [serialize_cliente(c) for c in clienti]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/{cliente_id}/approva-analisi")
async def approva_analisi(cliente_id: str):
    """Approve an analysis (mark as reviewed)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        result = await db.clienti.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": {
                "analisi_revisionata": True,
                "analisi_revisionata_at": datetime.now(timezone.utc).isoformat(),
                "stato": "analisi_approvata"
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        return {"success": True, "message": "Analisi approvata"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
