"""
Partnership Activation Router
Gestisce il flusso di attivazione partnership per clienti approvati
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import os
import uuid
import logging
from pathlib import Path

router = APIRouter(prefix="/api/partnership", tags=["partnership"])

# Database reference (set from main server)
db = None

def set_db(database):
    global db
    db = database

# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class UpdateStepRequest(BaseModel):
    user_id: str
    step: str
    value: bool

class CheckoutRequest(BaseModel):
    user_id: str

# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/get-analisi")
async def get_analisi_for_partnership(user_id: str):
    """
    Recupera l'analisi strategica per il cliente che sta attivando la partnership.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Cerca l'utente
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Recupera l'analisi
    analisi_testo = user.get("analisi_testo")
    if not analisi_testo:
        # Prova a cercare in clienti_analisi
        cliente = await db.clienti_analisi.find_one(
            {"$or": [{"user_id": user_id}, {"email": user.get("email")}]},
            {"_id": 0}
        )
        if cliente:
            analisi_testo = cliente.get("analisi_testo")
    
    if not analisi_testo:
        analisi_testo = "La tua analisi strategica sarà disponibile a breve. Contatta il supporto se necessario."
    
    return {
        "success": True,
        "analisi_testo": analisi_testo,
        "punteggio_fattibilita": user.get("punteggio_fattibilita"),
        "raccomandazione_finale": user.get("raccomandazione_finale")
    }


@router.post("/update-step")
async def update_partnership_step(request: UpdateStepRequest):
    """
    Aggiorna lo stato di uno step del processo di attivazione partnership.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    allowed_steps = [
        "analisi_visualizzata",
        "partnership_confermata", 
        "contratto_firmato",
        "documenti_caricati",
        "pagamento_verificato"
    ]
    
    if request.step not in allowed_steps:
        raise HTTPException(status_code=400, detail=f"Step non valido: {request.step}")
    
    result = await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            request.step: request.value,
            f"{request.step}_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    return {"success": True, "step": request.step, "value": request.value}


@router.post("/upload-documento")
async def upload_documento_partnership(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    tipo: str = Form(...)
):
    """
    Carica un documento per l'attivazione partnership.
    Tipi validi: contratto_firmato, carta_identita, codice_fiscale, distinta_bonifico
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    allowed_types = ["contratto_firmato", "carta_identita", "codice_fiscale", "distinta_bonifico"]
    if tipo not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Tipo documento non valido: {tipo}")
    
    # Verifica utente
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Crea directory se non esiste
    upload_dir = Path("/app/backend/uploads/partnership")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Genera nome file univoco
    ext = Path(file.filename).suffix
    stored_name = f"{user_id}_{tipo}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = upload_dir / stored_name
    
    # Salva file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Salva riferimento nel database
    doc_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tipo": tipo,
        "original_name": file.filename,
        "stored_name": stored_name,
        "file_path": str(file_path),
        "size": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "uploaded"
    }
    
    await db.partnership_documents.insert_one(doc_record)
    
    # Se è il contratto, aggiorna lo stato
    if tipo == "contratto_firmato":
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "contratto_firmato": True,
                "contratto_firmato_at": datetime.now(timezone.utc).isoformat(),
                "contratto_file": stored_name
            }}
        )
    
    # Notifica Telegram
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            nome = user.get('nome', '')
            cognome = user.get('cognome', '')
            tipo_label = {
                "contratto_firmato": "📝 Contratto Firmato",
                "carta_identita": "🪪 Carta d'Identità",
                "codice_fiscale": "🏷️ Codice Fiscale",
                "distinta_bonifico": "🏦 Distinta Bonifico"
            }.get(tipo, tipo)
            
            message = f"📎 DOCUMENTO PARTNERSHIP CARICATO\n\n👤 {nome} {cognome}\n📄 {tipo_label}\n📁 {file.filename}"
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message}
                )
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")
    
    return {
        "success": True,
        "document_id": doc_record["id"],
        "tipo": tipo,
        "message": f"Documento '{tipo}' caricato con successo"
    }


@router.post("/create-checkout-session")
async def create_partnership_checkout(request: CheckoutRequest):
    """
    Crea una sessione di checkout Stripe per il pagamento della partnership (€2.790).
    Supporta pagamento singolo o 3 rate con Klarna.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    # Verifica utente
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # URL di frontend
    frontend_url = os.environ.get('FRONTEND_URL', 'https://business-cockpit-7.preview.emergentagent.com')
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        
        checkout = StripeCheckout(api_key=stripe_key)
        
        session_request = CheckoutSessionRequest(
            amount=2790.00,  # €2.790,00
            currency="eur",
            success_url=f"{frontend_url}/attivazione-partnership?payment=success&user_id={user['id']}",
            cancel_url=f"{frontend_url}/attivazione-partnership?payment=cancelled",
            metadata={
                "user_id": user["id"],
                "tipo": "attivazione_partnership",
                "importo": "2790",
                "email": user.get("email", ""),
                "nome": f"{user.get('nome', '')} {user.get('cognome', '')}"
            }
        )
        
        session = await checkout.create_checkout_session(session_request)
        
        # Salva riferimento sessione
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "partnership_stripe_session_id": session.session_id,
                "partnership_checkout_url": session.url,
                "partnership_checkout_created_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id,
            "amount": 2790.00,
            "currency": "eur"
        }
        
    except Exception as e:
        logging.error(f"Stripe partnership checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore creazione checkout: {str(e)}")


@router.post("/verify-payment")
async def verify_partnership_payment(user_id: str = None, session_id: str = None):
    """
    Verifica il pagamento della partnership e aggiorna lo stato.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    # Trova utente
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Se già pagato
    if user.get("pagamento_partnership_verificato"):
        return {"success": True, "already_paid": True, "message": "Pagamento già verificato"}
    
    # Verifica con Stripe
    session_to_check = session_id or user.get("partnership_stripe_session_id")
    if not session_to_check:
        raise HTTPException(status_code=400, detail="Nessuna sessione di pagamento trovata")
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        checkout = StripeCheckout(api_key=stripe_key)
        status = await checkout.get_checkout_status(session_to_check)
        
        if status.payment_status == "paid":
            # Aggiorna utente
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {
                    "pagamento_partnership_verificato": True,
                    "pagamento_verificato": True,  # Per il frontend
                    "data_pagamento_partnership": datetime.now(timezone.utc).isoformat(),
                    "partnership_payment_status": "paid"
                }}
            )
            
            # Notifica Telegram
            try:
                import httpx
                telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
                admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
                if telegram_token and admin_chat_id:
                    nome = user.get('nome', '')
                    cognome = user.get('cognome', '')
                    message = f"💰 PAGAMENTO PARTNERSHIP RICEVUTO €2.790\n\n👤 {nome} {cognome}\n📧 {user.get('email')}\n\n✅ Pronto per conversione a partner!"
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                            json={"chat_id": admin_chat_id, "text": message}
                        )
            except:
                pass
            
            return {
                "success": True,
                "paid": True,
                "message": "Pagamento verificato con successo"
            }
        else:
            return {
                "success": False,
                "paid": False,
                "status": status.payment_status,
                "message": "Pagamento non ancora completato"
            }
            
    except Exception as e:
        logging.error(f"Partnership payment verification error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore verifica pagamento: {str(e)}")


@router.post("/convert-to-partner")
async def convert_to_partner(user_id: str = None):
    """
    Converte un cliente in partner dopo che tutti gli step sono completati.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Trova utente
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Verifica che tutti gli step siano completati
    required_steps = [
        "contratto_firmato",
        "documenti_caricati",
        "pagamento_verificato"
    ]
    
    missing_steps = [step for step in required_steps if not user.get(step)]
    if missing_steps:
        raise HTTPException(
            status_code=400, 
            detail=f"Step mancanti: {', '.join(missing_steps)}"
        )
    
    # Crea record partner
    partner_id = str(uuid.uuid4())
    new_partner = {
        "id": partner_id,
        "user_id": user["id"],
        "name": f"{user.get('nome', '')} {user.get('cognome', '')}".strip(),
        "email": user.get("email"),
        "niche": user.get("expertise", ""),
        "phase": "F1",  # Inizia dalla fase di attivazione
        "revenue": 0,
        "contract": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "alert": False,
        "modules": [0] * 10,
        "converted_from_client": True,
        "conversion_date": datetime.now(timezone.utc).isoformat(),
        "onboarding_status": {
            "welcome_email_sent": False,
            "systeme_account_created": False,
            "registered_at": datetime.now(timezone.utc).isoformat()
        }
    }
    
    await db.partners.insert_one(new_partner)
    
    # Aggiorna utente
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "user_type": "partner",
            "role": "partner",
            "partner_id": partner_id,
            "converted_to_partner_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notifica Telegram
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            nome = user.get('nome', '')
            cognome = user.get('cognome', '')
            message = f"🎉 NUOVO PARTNER ATTIVATO!\n\n👤 {nome} {cognome}\n📧 {user.get('email')}\n💼 {user.get('expertise', 'N/D')}\n\n✅ Conversione completata - Fase F1"
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message}
                )
    except:
        pass
    
    return {
        "success": True,
        "partner_id": partner_id,
        "message": "Conversione a partner completata!",
        "redirect_to": "/dashboard-partner"
    }


@router.get("/status/{user_id}")
async def get_partnership_status(user_id: str):
    """
    Ritorna lo stato corrente del processo di attivazione partnership.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Conta documenti caricati
    docs_count = await db.partnership_documents.count_documents({"user_id": user_id})
    
    return {
        "user_id": user_id,
        "analisi_visualizzata": user.get("analisi_visualizzata", False),
        "partnership_confermata": user.get("partnership_confermata", False),
        "contratto_firmato": user.get("contratto_firmato", False),
        "documenti_caricati": user.get("documenti_caricati", False),
        "pagamento_verificato": user.get("pagamento_verificato", False),
        "documenti_count": docs_count,
        "is_partner": user.get("user_type") == "partner"
    }
