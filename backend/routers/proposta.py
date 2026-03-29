"""
Proposta Router - Evolution PRO
Gestione pagina proposta pubblica con token,
firma contratto inline, pagamento Stripe/bonifico, upload documenti.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import secrets
import logging
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proposta", tags=["proposta"])

# MongoDB connection (fallback Atlas come server.py)
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
ATLAS_FALLBACK = "mongodb+srv://evolution_admin:EvoPro2026!@cluster0.4cgj8wx.mongodb.net/evolution_pro?appName=Cluster0&maxPoolSize=5&retryWrites=true&timeoutMS=10000&w=majority"
if not mongo_url or "customer-apps" in mongo_url:
    mongo_url = ATLAS_FALLBACK
    db_name = "evolution_pro"
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Allow server.py to inject its db reference
def set_db(database):
    global db
    db = database

SCADENZA_GIORNI = 7
BASE_URL = os.environ.get('BASE_URL', os.environ.get('FRONTEND_URL', 'https://app.evolution-pro.it'))


class GeneraPropostaRequest(BaseModel):
    analisi_posizionamento: Optional[str] = None
    analisi_punti_forza: Optional[List[str]] = None
    analisi_pdf_url: Optional[str] = None
    video_benvenuto_url: Optional[str] = None
    contract_params: Optional[dict] = None


# ─────────────────────────────────────────────────
# ADMIN: Genera proposta per un partner
# ─────────────────────────────────────────────────
@router.post("/genera/{partner_id}")
async def genera_proposta(partner_id: str, body: GeneraPropostaRequest = None):
    """Genera token proposta e salva in MongoDB."""
    # Cerca in entrambe le collection (users/clienti per il flusso analisi, o partners)
    prospect = await db.users.find_one({"id": partner_id}, {"_id": 0})
    if not prospect:
        prospect = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not prospect:
        raise HTTPException(404, "Prospect non trovato")

    # Controlla se esiste già una proposta attiva
    existing = await db.proposte.find_one(
        {"partner_id": partner_id, "stato": {"$nin": ["scaduta"]}}, {"_id": 0})
    if existing:
        return {
            "success": True,
            "token": existing["token"],
            "url": f"{BASE_URL}/proposta/{existing['token']}",
            "message": "Proposta esistente"
        }

    token = secrets.token_urlsafe(12)
    now = datetime.now(timezone.utc)

    nome = prospect.get("nome", prospect.get("name", ""))
    cognome = prospect.get("cognome", "")
    email = prospect.get("email", "")
    prospect_nome = f"{nome} {cognome}".strip() or email

    proposta = {
        "id": str(uuid.uuid4()),
        "token": token,
        "partner_id": partner_id,
        "prospect_nome": prospect_nome,
        "prospect_email": email,
        "analisi_posizionamento": body.analisi_posizionamento if body else None,
        "analisi_punti_forza": body.analisi_punti_forza if body else [],
        "analisi_pdf_url": body.analisi_pdf_url if body else prospect.get("analisi_pdf_url"),
        "video_benvenuto_url": body.video_benvenuto_url if body else None,
        "contract_params": body.contract_params if body else prospect.get("contract_params", {}),
        "creato_at": now.isoformat(),
        "visto_at": None,
        "accettato_at": None,
        "contratto_firmato_at": None,
        "pagamento_metodo": None,
        "pagamento_completato": False,
        "pagamento_completato_at": None,
        "stripe_session_id_partnership": None,
        "documenti_identita_url": [],
        "distinta_bonifico_url": None,
        "stato": "inviata",
        "scadenza": (now + timedelta(days=SCADENZA_GIORNI)).isoformat()
    }

    await db.proposte.insert_one(proposta)
    logger.info(f"[PROPOSTA] Generata per {prospect_nome} — token={token}")

    await _notify_telegram(f"Proposta generata per {prospect_nome}\nLink: {BASE_URL}/proposta/{token}")

    return {
        "success": True,
        "token": token,
        "url": f"{BASE_URL}/proposta/{token}",
        "message": "Proposta generata"
    }


# ─────────────────────────────────────────────────
# PUBBLICA: Leggi proposta via token
# ─────────────────────────────────────────────────
@router.get("/{token}")
async def get_proposta(token: str):
    """Ritorna dati proposta — pubblica, no auth."""
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    # Check scadenza
    scadenza = proposta.get("scadenza", "")
    if scadenza:
        try:
            scad_dt = datetime.fromisoformat(scadenza)
            if datetime.now(timezone.utc) > scad_dt and proposta["stato"] not in ["pagamento_completato", "contratto_firmato"]:
                await db.proposte.update_one({"token": token}, {"$set": {"stato": "scaduta"}})
                raise HTTPException(410, "Proposta scaduta")
        except (ValueError, TypeError):
            pass

    # Primo accesso → aggiorna visto_at
    if not proposta.get("visto_at"):
        now = datetime.now(timezone.utc).isoformat()
        await db.proposte.update_one({"token": token}, {"$set": {"visto_at": now, "stato": "vista"}})
        proposta["visto_at"] = now
        proposta["stato"] = "vista"
        await _notify_telegram(f"Proposta aperta da {proposta.get('prospect_nome', '?')}")

    return proposta


# ─────────────────────────────────────────────────
# PUBBLICA: Accetta proposta
# ─────────────────────────────────────────────────
@router.post("/{token}/accetta")
async def accetta_proposta(token: str):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    if proposta.get("accettato_at"):
        return {"success": True, "message": "Gia accettata"}

    now = datetime.now(timezone.utc).isoformat()
    await db.proposte.update_one({"token": token}, {"$set": {
        "accettato_at": now, "stato": "accettata"
    }})
    await _notify_telegram(f"Proposta ACCETTATA da {proposta.get('prospect_nome', '?')}")
    return {"success": True, "message": "Proposta accettata"}


# ─────────────────────────────────────────────────
# PUBBLICA: Registra firma contratto dalla proposta
# ─────────────────────────────────────────────────
@router.post("/{token}/firma-contratto")
async def firma_contratto_proposta(token: str, request: Request):
    """Salva firma contratto dalla pagina proposta."""
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    body = await request.json()
    now = datetime.now(timezone.utc)

    contract_data = {
        "version": "v1.0",
        "signed_at": now.isoformat(),
        "signature_base64": body.get("signature_base64", ""),
        "ip_address": request.client.host if request.client else "unknown",
        "clausole_vessatorie_approved": body.get("clausole_vessatorie_approved", False)
    }

    # Aggiorna proposta
    await db.proposte.update_one({"token": token}, {"$set": {
        "contratto_firmato_at": now.isoformat(),
        "stato": "contratto_firmato"
    }})

    # Aggiorna partner
    partner_id = proposta.get("partner_id")
    if partner_id:
        for coll in ["partners", "users"]:
            await db[coll].update_one(
                {"id": partner_id},
                {"$set": {
                    "contract": contract_data,
                    "contract_signed": True,
                    "contract_signed_at": now.isoformat(),
                    "stato_funnel": "contratto_firmato"
                }}
            )

    # Genera PDF + invia email (riusa logica da contract.py)
    pdf_url = None
    try:
        from routers.contract import generate_contract_pdf, send_contract_email
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        if not partner:
            partner = await db.users.find_one({"id": partner_id}, {"_id": 0})
        if partner:
            pdf_url = await generate_contract_pdf(partner, contract_data)
            await send_contract_email(partner, pdf_url)
    except Exception as e:
        logger.error(f"[PROPOSTA] Errore PDF/email post-firma: {e}")

    await _notify_telegram(f"Contratto FIRMATO da {proposta.get('prospect_nome', '?')} (via proposta)")

    return {"success": True, "signed_at": now.isoformat(), "pdf_url": pdf_url}


# ─────────────────────────────────────────────────
# PUBBLICA: Pagamento Stripe partnership
# ─────────────────────────────────────────────────
@router.post("/{token}/pagamento-stripe")
async def pagamento_stripe(token: str, request: Request):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    corrispettivo = proposta.get("contract_params", {}).get("corrispettivo", 2790.0)
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(500, "Stripe non configurato")

    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

        origin = str(request.base_url).rstrip('/')
        success_url = f"{origin}/proposta/{token}?pagamento=successo&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/proposta/{token}?pagamento=annullato"

        webhook_url = f"{origin}/api/webhook/stripe"
        checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)

        session_request = CheckoutSessionRequest(
            amount=float(corrispettivo),
            currency="eur",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "tipo": "partnership",
                "token": token,
                "partner_id": proposta.get("partner_id", ""),
                "prospect_email": proposta.get("prospect_email", ""),
                "prospect_nome": proposta.get("prospect_nome", "")
            }
        )

        session = await checkout.create_checkout_session(session_request)

        # Salva transaction
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "service_type": "partnership",
            "amount": corrispettivo,
            "currency": "eur",
            "partner_id": proposta.get("partner_id"),
            "partner_email": proposta.get("prospect_email"),
            "partner_name": proposta.get("prospect_nome"),
            "payment_status": "initiated",
            "token": token,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        await db.proposte.update_one({"token": token}, {"$set": {
            "pagamento_metodo": "stripe",
            "stripe_session_id_partnership": session.session_id
        }})

        return {"success": True, "checkout_url": session.url, "session_id": session.session_id}

    except Exception as e:
        logger.error(f"[PROPOSTA] Errore Stripe: {e}")
        raise HTTPException(500, f"Errore creazione checkout: {str(e)}")


# ─────────────────────────────────────────────────
# PUBBLICA: Scegli pagamento bonifico
# ─────────────────────────────────────────────────
@router.post("/{token}/scelta-bonifico")
async def scelta_bonifico(token: str):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    await db.proposte.update_one({"token": token}, {"$set": {
        "pagamento_metodo": "bonifico"
    }})
    return {"success": True, "iban": "LT94 3250 0974 4929 5781",
            "beneficiario": "Evolution PRO LLC",
            "banca": "Revolut Bank UAB",
            "causale": f"Partnership Evolution PRO - {proposta.get('prospect_nome', '')}"}


# ─────────────────────────────────────────────────
# PUBBLICA: Upload distinta bonifico
# ─────────────────────────────────────────────────
@router.post("/{token}/upload-distinta")
async def upload_distinta(token: str, file: UploadFile = File(...)):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET'))

        contents = await file.read()
        result = cloudinary.uploader.upload(contents, resource_type="auto",
            folder=f"evolution_pro/distinte/{token}",
            public_id=f"distinta_{token}")

        url = result.get("secure_url")
        await db.proposte.update_one({"token": token}, {"$set": {
            "distinta_bonifico_url": url,
            "pagamento_metodo": "bonifico",
            "stato": "pagamento_in_attesa_verifica"
        }})

        await _notify_telegram(
            f"Distinta bonifico caricata da {proposta.get('prospect_nome', '')}\nVerifica e approva nel pannello admin")

        return {"success": True, "url": url}
    except Exception as e:
        logger.error(f"[PROPOSTA] Upload distinta error: {e}")
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────────
# PUBBLICA: Upload documenti identita
# ─────────────────────────────────────────────────
@router.post("/{token}/upload-documenti")
async def upload_documenti(token: str, files: List[UploadFile] = File(...)):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET'))

        urls = []
        for i, f in enumerate(files[:2]):
            contents = await f.read()
            result = cloudinary.uploader.upload(contents, resource_type="auto",
                folder=f"evolution_pro/documenti/{token}",
                public_id=f"doc_{i+1}")
            urls.append(result.get("secure_url"))

        await db.proposte.update_one({"token": token}, {"$set": {"documenti_identita_url": urls}})
        await _notify_telegram(f"{proposta.get('prospect_nome', '')} ha caricato i documenti identita")
        return {"success": True, "urls": urls}
    except Exception as e:
        logger.error(f"[PROPOSTA] Upload documenti error: {e}")
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────────
# ADMIN: Conferma bonifico
# ─────────────────────────────────────────────────
@router.post("/{token}/conferma-bonifico")
async def conferma_bonifico(token: str):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    now = datetime.now(timezone.utc).isoformat()
    await db.proposte.update_one({"token": token}, {"$set": {
        "pagamento_completato": True,
        "pagamento_completato_at": now,
        "stato": "pagamento_completato"
    }})

    partner_id = proposta.get("partner_id")
    if partner_id:
        for coll in ["partners", "users"]:
            await db[coll].update_one({"id": partner_id}, {"$set": {
                "stato_funnel": "pagamento_completato",
                "pagamento_partnership_at": now
            }})

    await _add_systeme_tag(proposta.get("prospect_email", ""), "contratto_firmato")
    await _notify_telegram(f"Bonifico verificato per {proposta.get('prospect_nome', '')} — onboarding avviato")

    return {"success": True}


# ─────────────────────────────────────────────────
# ADMIN: Lista proposte
# ─────────────────────────────────────────────────
@router.get("/admin/lista")
async def lista_proposte():
    proposte = await db.proposte.find({}, {"_id": 0}).sort("creato_at", -1).to_list(100)
    return {"items": proposte, "count": len(proposte)}


# ─────────────────────────────────────────────────
# WEBHOOK: gestione pagamento partnership (chiamata dal webhook Stripe in server.py)
# ─────────────────────────────────────────────────
async def gestisci_pagamento_partnership(session_id: str, metadata: dict):
    """Chiamata dal webhook Stripe quando tipo=partnership."""
    token = metadata.get("token")
    if not token:
        logger.warning("[PROPOSTA] Webhook partnership senza token")
        return

    now = datetime.now(timezone.utc).isoformat()
    await db.proposte.update_one({"token": token}, {"$set": {
        "pagamento_completato": True,
        "pagamento_completato_at": now,
        "stato": "pagamento_completato"
    }})

    partner_id = metadata.get("partner_id")
    if partner_id:
        for coll in ["partners", "users"]:
            await db[coll].update_one({"id": partner_id}, {"$set": {
                "stato_funnel": "pagamento_completato",
                "pagamento_partnership_at": now
            }})

    await _add_systeme_tag(metadata.get("prospect_email", ""), "contratto_firmato")
    nome = metadata.get("prospect_nome", "")
    await _notify_telegram(f"Pagamento partnership completato da {nome}")

    logger.info(f"[PROPOSTA] Pagamento partnership completato — token={token}, partner={partner_id}")


# ─────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────
async def _notify_telegram(message: str):
    try:
        token = os.environ.get('TELEGRAM_BOT_TOKEN')
        chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if token and chat_id:
            async with httpx.AsyncClient(timeout=5) as c:
                await c.post(f"https://api.telegram.org/bot{token}/sendMessage",
                    json={"chat_id": chat_id, "text": message})
    except Exception as e:
        logger.warning(f"Telegram notify error: {e}")


async def _add_systeme_tag(email: str, tag_name: str):
    if not email:
        return
    try:
        api_key = os.environ.get('SYSTEME_API_KEY')
        if not api_key:
            return
        headers = {"X-API-Key": api_key, "accept": "application/json"}
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get("https://api.systeme.io/api/tags?limit=50", headers=headers)
            tags = resp.json().get("items", [])
            tag_id = next((t["id"] for t in tags if t["name"] == tag_name), None)
            if not tag_id:
                return
            resp2 = await c.get(f"https://api.systeme.io/api/contacts?email={email}", headers=headers)
            contacts = resp2.json().get("items", [])
            if not contacts:
                return
            contact_id = contacts[0]["id"]
            await c.post(f"https://api.systeme.io/api/contacts/{contact_id}/tags",
                headers={**headers, "Content-Type": "application/json"},
                json={"tagId": tag_id})
            logger.info(f"[SYSTEME] Tag '{tag_name}' aggiunto a {email}")
    except Exception as e:
        logger.warning(f"[SYSTEME] Tag error: {e}")
