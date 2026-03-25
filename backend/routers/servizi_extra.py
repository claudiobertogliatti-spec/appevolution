"""
Router per Servizi Extra - Calendario Editoriale con Stripe
Parte F del brief - Offerta commerciale per partner
"""

import os
import json
import logging
import uuid
import stripe
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servizi-extra", tags=["servizi-extra"])

# Database reference (will be set by main app)
db = None

def set_db(database):
    global db
    db = database

# Stripe config
stripe.api_key = os.environ.get('STRIPE_API_KEY')
STRIPE_PRICE_CALENDARIO_PRO = os.environ.get('STRIPE_PRICE_CALENDARIO_PRO', 'price_1TEpHJKjIoAIM4LD1sTFrvz0')
STRIPE_PRICE_CALENDARIO_STARTER = os.environ.get('STRIPE_PRICE_CALENDARIO_STARTER', 'price_1TEpHJKjIoAIM4LD8002kZ5h')

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ServizioExtra(BaseModel):
    id: str
    nome: str
    descrizione: str
    features: List[str]
    prezzo: int
    tipo: str  # "abbonamento_mensile" | "una_tantum"
    stripe_price_id: str
    attivo: bool = True


class AcquistoRequest(BaseModel):
    partner_id: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CalendarioGeneraRequest(BaseModel):
    partner_id: str
    mese: str  # es: "aprile_2026"
    num_contenuti: int = 20


# ═══════════════════════════════════════════════════════════════════════════════
# CATALOGO SERVIZI
# ═══════════════════════════════════════════════════════════════════════════════

SERVIZI_CATALOGO = [
    {
        "id": "calendario-pro",
        "nome": "Calendario Editoriale PRO",
        "descrizione": "20 contenuti/mese pronti da pubblicare",
        "features": [
            "8 post grafici (Canva)",
            "4 caroselli (Canva)",
            "4 reel con avatar AI (HeyGen)",
            "2 reel creativi cinematografici (Kling AI)",
            "2 reel animati (Canva)",
            "Copy e hashtag per ogni contenuto",
            "Consegna entro 48h"
        ],
        "prezzo": 297,
        "tipo": "abbonamento_mensile",
        "stripe_price_id": STRIPE_PRICE_CALENDARIO_PRO,
        "attivo": True
    },
    {
        "id": "calendario-starter",
        "nome": "Pacchetto Starter",
        "descrizione": "Primo mese di prova — 10 contenuti",
        "features": [
            "8 post grafici",
            "2 caroselli",
            "Copy incluso",
            "Nessun reel"
        ],
        "prezzo": 97,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_CALENDARIO_STARTER,
        "attivo": True
    }
]


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT PUBBLICI (per partner)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("")
async def get_servizi_disponibili():
    """Lista servizi disponibili per i partner"""
    # Merge con eventuali override dal database
    servizi = []
    for s in SERVIZI_CATALOGO:
        if s["attivo"]:
            servizi.append(s)
    
    return {
        "servizi": servizi,
        "count": len(servizi)
    }


@router.post("/{servizio_id}/acquista")
async def acquista_servizio(
    servizio_id: str,
    request: AcquistoRequest,
    background_tasks: BackgroundTasks
):
    """
    Avvia checkout Stripe per acquisto servizio.
    Restituisce URL per redirect a Stripe Checkout.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Trova servizio
    servizio = next((s for s in SERVIZI_CATALOGO if s["id"] == servizio_id), None)
    if not servizio:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    
    if not servizio["attivo"]:
        raise HTTPException(status_code=400, detail="Servizio non disponibile")
    
    # Verifica partner
    partner = await db.partners.find_one({"id": request.partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    # Recupera email partner
    user = await db.users.find_one({"partner_id": request.partner_id})
    customer_email = user.get("email") if user else partner.get("email")
    
    # URL di ritorno
    base_url = os.environ.get('FRONTEND_URL', 'https://app.evolution-pro.it')
    success_url = request.success_url or f"{base_url}/partner/servizi?success=true&servizio={servizio_id}"
    cancel_url = request.cancel_url or f"{base_url}/partner/servizi?cancelled=true"
    
    try:
        # Crea sessione Stripe Checkout
        checkout_params = {
            "payment_method_types": ["card"],
            "line_items": [{
                "price": servizio["stripe_price_id"],
                "quantity": 1
            }],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {
                "partner_id": request.partner_id,
                "servizio_id": servizio_id,
                "tipo": servizio["tipo"]
            }
        }
        
        if customer_email:
            checkout_params["customer_email"] = customer_email
        
        # Abbonamento vs pagamento singolo
        if servizio["tipo"] == "abbonamento_mensile":
            checkout_params["mode"] = "subscription"
        else:
            checkout_params["mode"] = "payment"
        
        session = stripe.checkout.Session.create(**checkout_params)
        
        logger.info(f"[SERVIZI] Checkout creato per {partner.get('name')} - {servizio['nome']}")
        
        return {
            "checkout_url": session.url,
            "session_id": session.id,
            "servizio": servizio["nome"],
            "prezzo": servizio["prezzo"]
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"[SERVIZI] Stripe error: {e}")
        raise HTTPException(status_code=400, detail=f"Errore Stripe: {str(e)}")


@router.get("/miei")
async def get_miei_servizi(partner_id: str):
    """Servizi attivi del partner loggato"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    servizi = await db.partner_servizi.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(100)
    
    # Aggiungi dettagli servizio
    for s in servizi:
        servizio_info = next((cat for cat in SERVIZI_CATALOGO if cat["id"] == s.get("servizio_id")), None)
        if servizio_info:
            s["nome"] = servizio_info["nome"]
            s["descrizione"] = servizio_info["descrizione"]
            s["features"] = servizio_info["features"]
    
    return {
        "servizi_attivi": servizi,
        "count": len(servizi)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK STRIPE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/webhook/stripe")
async def stripe_webhook_servizi(request: dict, background_tasks: BackgroundTasks):
    """
    Webhook per gestire pagamenti Stripe dei servizi extra.
    Chiamato da Stripe dopo pagamento riuscito.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    event_type = request.get("type")
    data = request.get("data", {}).get("object", {})
    
    logger.info(f"[SERVIZI WEBHOOK] Received event: {event_type}")
    
    if event_type == "checkout.session.completed":
        metadata = data.get("metadata", {})
        partner_id = metadata.get("partner_id")
        servizio_id = metadata.get("servizio_id")
        tipo = metadata.get("tipo")
        
        if not partner_id or not servizio_id:
            logger.warning("[SERVIZI WEBHOOK] Missing metadata")
            return {"received": True}
        
        # Recupera partner
        partner = await db.partners.find_one({"id": partner_id})
        partner_nome = partner.get("name", "Partner") if partner else "Partner"
        
        # Crea record servizio attivo
        servizio_doc = {
            "id": str(uuid.uuid4()),
            "partner_id": partner_id,
            "servizio_id": servizio_id,
            "stato": "attivo",
            "stripe_session_id": data.get("id"),
            "stripe_subscription_id": data.get("subscription"),
            "data_attivazione": datetime.now(timezone.utc).isoformat(),
            "prossimo_rinnovo": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat() if tipo == "abbonamento_mensile" else None,
            "calendari_generati": 0,
            "ultimo_calendario": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.partner_servizi.insert_one(servizio_doc)
        logger.info(f"[SERVIZI] Servizio {servizio_id} attivato per partner {partner_id}")
        
        # Avvia generazione calendario in background
        if servizio_id in ["calendario-pro", "calendario-starter"]:
            mese_corrente = datetime.now().strftime("%B_%Y").lower()
            background_tasks.add_task(
                genera_calendario_task,
                partner_id,
                mese_corrente,
                20 if servizio_id == "calendario-pro" else 10
            )
        
        # Notifica Telegram
        try:
            from .telegram_notifications import send_telegram_notification
            await send_telegram_notification(
                f"💰 *Nuovo Acquisto Servizio Extra*\n\n"
                f"👤 Partner: {partner_nome}\n"
                f"📦 Servizio: {servizio_id}\n"
                f"💵 Tipo: {tipo}\n"
                f"📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            )
        except:
            pass
    
    elif event_type == "invoice.payment_succeeded":
        # Rinnovo abbonamento
        subscription_id = data.get("subscription")
        if subscription_id:
            servizio = await db.partner_servizi.find_one({"stripe_subscription_id": subscription_id})
            if servizio:
                # Aggiorna data rinnovo e avvia nuovo calendario
                await db.partner_servizi.update_one(
                    {"stripe_subscription_id": subscription_id},
                    {"$set": {
                        "prossimo_rinnovo": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Genera nuovo calendario
                mese_corrente = datetime.now().strftime("%B_%Y").lower()
                background_tasks.add_task(
                    genera_calendario_task,
                    servizio["partner_id"],
                    mese_corrente,
                    20
                )
    
    elif event_type == "customer.subscription.deleted":
        # Abbonamento cancellato
        subscription_id = data.get("id")
        if subscription_id:
            await db.partner_servizi.update_one(
                {"stripe_subscription_id": subscription_id},
                {"$set": {"stato": "cancellato", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"received": True}


# ═══════════════════════════════════════════════════════════════════════════════
# GENERAZIONE CALENDARIO (con stub per Canva/Kling)
# ═══════════════════════════════════════════════════════════════════════════════

async def genera_calendario_task(partner_id: str, mese: str, num_contenuti: int):
    """Task background per generare calendario editoriale"""
    try:
        logger.info(f"[CALENDARIO] Avvio generazione per partner {partner_id}, mese {mese}")
        
        # Crea documento calendario
        calendario_id = f"cal_{partner_id}_{mese}"
        calendario_doc = {
            "id": calendario_id,
            "partner_id": partner_id,
            "mese": mese,
            "stato": "in_generazione",
            "totale": num_contenuti,
            "completati": 0,
            "contenuti": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completato_at": None
        }
        
        await db.calendari_editoriali.update_one(
            {"id": calendario_id},
            {"$set": calendario_doc},
            upsert=True
        )
        
        # TODO: Qui va la generazione con Claude + Canva/HeyGen/Kling
        # Per ora usiamo contenuti mock
        contenuti_mock = genera_contenuti_mock(num_contenuti, mese)
        
        # Aggiorna calendario con contenuti mock
        await db.calendari_editoriali.update_one(
            {"id": calendario_id},
            {"$set": {
                "stato": "pronto",
                "contenuti": contenuti_mock,
                "completati": len(contenuti_mock),
                "completato_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Aggiorna servizio partner
        await db.partner_servizi.update_one(
            {"partner_id": partner_id, "servizio_id": {"$in": ["calendario-pro", "calendario-starter"]}},
            {
                "$inc": {"calendari_generati": 1},
                "$set": {"ultimo_calendario": mese}
            }
        )
        
        # Notifica completamento
        partner = await db.partners.find_one({"id": partner_id})
        partner_nome = partner.get("name", "Partner") if partner else "Partner"
        
        try:
            from .telegram_notifications import send_telegram_notification
            await send_telegram_notification(
                f"✅ *Calendario Completato*\n\n"
                f"👤 Partner: {partner_nome}\n"
                f"📅 Mese: {mese}\n"
                f"📊 Contenuti: {num_contenuti}\n"
                f"⏱ Completato in: {datetime.now().strftime('%H:%M')}"
            )
        except:
            pass
        
        logger.info(f"[CALENDARIO] Completato per partner {partner_id}")
        
    except Exception as e:
        logger.error(f"[CALENDARIO] Errore: {e}")
        await db.calendari_editoriali.update_one(
            {"partner_id": partner_id, "mese": mese},
            {"$set": {"stato": "errore", "errore": str(e)}}
        )


def genera_contenuti_mock(num: int, mese: str) -> List[Dict]:
    """Genera contenuti mock per testing"""
    tipi = ["post", "post", "post", "post", "carosello", "carosello", "reel_avatar", "reel_avatar", "reel_kling", "reel_animato"]
    topics = [
        "Come superare la paura di vendere",
        "3 errori che bloccano il tuo business",
        "La routine mattutina dei top performer",
        "Perché il tuo corso non vende",
        "5 step per creare contenuti virali",
        "Il segreto del pricing premium",
        "Come trovare clienti su LinkedIn",
        "Mindset imprenditoriale: le basi",
        "Storytelling per vendere",
        "Costruire un personal brand forte"
    ]
    
    contenuti = []
    for i in range(num):
        tipo = tipi[i % len(tipi)]
        topic = topics[i % len(topics)]
        
        contenuto = {
            "giorno": i + 1,
            "tipo": tipo,
            "topic": topic,
            "copy": f"💡 {topic}\n\nEcco cosa devi sapere...\n\n#business #formazione #crescita",
            "hashtag": ["#business", "#formazione", "#crescita", "#coaching"],
            "asset_url": None,  # Sarà popolato da Canva/HeyGen/Kling
            "pronto": False,
            "generazione_status": "pending"
        }
        
        if tipo in ["reel_avatar", "reel_kling"]:
            contenuto["script"] = f"Ciao! Oggi parliamo di {topic.lower()}. È fondamentale capire che..."
        
        if tipo == "carosello":
            contenuto["num_slide"] = 5
        
        if tipo == "reel_kling":
            contenuto["prompt_visivo"] = f"Professional business coach speaking confidently, modern office background, cinematic lighting, 4K quality"
        
        contenuti.append(contenuto)
    
    return contenuti


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT CALENDARIO
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/calendario/{partner_id}")
async def get_calendari_partner(partner_id: str):
    """Lista tutti i calendari di un partner"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    calendari = await db.calendari_editoriali.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "calendari": calendari,
        "count": len(calendari)
    }


@router.get("/calendario/{partner_id}/{mese}")
async def get_calendario_mese(partner_id: str, mese: str):
    """Dettaglio calendario specifico"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    calendario = await db.calendari_editoriali.find_one(
        {"partner_id": partner_id, "mese": mese},
        {"_id": 0}
    )
    
    if not calendario:
        raise HTTPException(status_code=404, detail="Calendario non trovato")
    
    return calendario


@router.post("/calendario/genera")
async def genera_calendario_manuale(
    request: CalendarioGeneraRequest,
    background_tasks: BackgroundTasks
):
    """
    Genera calendario editoriale manualmente (admin).
    In produzione usa Claude + Canva + HeyGen + Kling.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Verifica partner
    partner = await db.partners.find_one({"id": request.partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    # Avvia generazione in background
    background_tasks.add_task(
        genera_calendario_task,
        request.partner_id,
        request.mese,
        request.num_contenuti
    )
    
    return {
        "success": True,
        "message": f"Generazione calendario avviata per {partner.get('name')}",
        "mese": request.mese,
        "num_contenuti": request.num_contenuti,
        "stato": "in_generazione"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/admin/stats")
async def get_admin_stats():
    """Statistiche servizi extra per admin"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Conta servizi attivi
    attivi_pro = await db.partner_servizi.count_documents({"servizio_id": "calendario-pro", "stato": "attivo"})
    attivi_starter = await db.partner_servizi.count_documents({"servizio_id": "calendario-starter", "stato": "attivo"})
    
    # Calcola revenue
    revenue_pro = attivi_pro * 297
    revenue_starter_docs = await db.partner_servizi.count_documents({"servizio_id": "calendario-starter"})
    revenue_starter = revenue_starter_docs * 97
    
    # Ultimi acquisti
    ultimi = await db.partner_servizi.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Aggiungi nome partner
    for u in ultimi:
        partner = await db.partners.find_one({"id": u.get("partner_id")})
        u["partner_nome"] = partner.get("name") if partner else "N/A"
    
    return {
        "servizi_attivi": {
            "calendario_pro": attivi_pro,
            "pacchetto_starter": attivi_starter,
            "totale": attivi_pro + attivi_starter
        },
        "revenue_mensile": {
            "calendario_pro": revenue_pro,
            "totale_ricorrente": revenue_pro
        },
        "revenue_totale": {
            "calendario_pro": revenue_pro,
            "pacchetto_starter": revenue_starter,
            "totale": revenue_pro + revenue_starter
        },
        "ultimi_acquisti": ultimi
    }


@router.put("/admin/servizi/{servizio_id}")
async def update_servizio_admin(servizio_id: str, attivo: bool = None, prezzo: int = None):
    """Aggiorna servizio (toggle attivo, modifica prezzo)"""
    # Questo modifica solo il catalogo locale
    # Per modificare prezzi Stripe serve API separata
    
    servizio = next((s for s in SERVIZI_CATALOGO if s["id"] == servizio_id), None)
    if not servizio:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    
    if attivo is not None:
        servizio["attivo"] = attivo
    
    if prezzo is not None:
        servizio["prezzo"] = prezzo
        # Nota: questo non aggiorna Stripe, solo il display
    
    return {"success": True, "servizio": servizio}
