"""
Clienti Router - Handles potential clients who purchase the Strategic Analysis
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from bson import ObjectId
import os
import stripe

router = APIRouter(prefix="/api/clienti", tags=["clienti"])

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

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
    origin = request.headers.get("origin", "https://optimistic-mclaren.preview.emergentagent.com")
    
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
