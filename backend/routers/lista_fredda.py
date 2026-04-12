"""
Lista Fredda Router - Gestione contatti cold outreach
Evolution PRO - 2026
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import csv
import io
import os
import logging
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lista-fredda", tags=["lista-fredda"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ListaFreddaLead(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    tag: str = "lista-fredda-2025"
    stato: str = "in_sequenza"  # in_sequenza, caldo, in_funnel, convertito, disiscritto
    email_inviata: int = 0
    ultima_apertura: Optional[str] = None
    ultimo_click: Optional[str] = None
    risposta_ricevuta: bool = False
    entrato_in_funnel: bool = False
    date_registered: Optional[str] = None
    created_at: Optional[str] = None
    fonte: str = "import_csv"


class SystemeTrackingEvent(BaseModel):
    event: str  # email_opened, link_clicked, unsubscribed, reply_received
    contact_email: str
    email_number: Optional[int] = None
    timestamp: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# PARTE 1: IMPORT CSV & CRUD
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/import")
async def import_lista_fredda_csv(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    """
    Importa contatti da file CSV nella collection lista_fredda.
    Deduplicazione automatica su email.
    
    Formato CSV atteso:
    email,first_name,last_name,phone,tag,date_registered
    mario@rossi.it,Mario,Rossi,+393331234567,lista-fredda-2025,2025-08-09
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Il file deve essere un CSV")
    
    content = await file.read()
    
    # Try different encodings
    for encoding in ['utf-8', 'latin-1', 'cp1252']:
        try:
            text_content = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(status_code=400, detail="Impossibile decodificare il file CSV")
    
    # Parse CSV
    reader = csv.DictReader(io.StringIO(text_content))
    
    now = datetime.now(timezone.utc).isoformat()
    imported = 0
    duplicates = 0
    errors = 0
    error_details = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            email = row.get('email', '').strip().lower()
            if not email or '@' not in email:
                errors += 1
                error_details.append(f"Row {row_num}: Invalid email")
                continue
            
            # Check duplicate
            existing = await db.lista_fredda.find_one({"email": email})
            if existing:
                duplicates += 1
                continue
            
            # Create lead document
            lead_doc = {
                "email": email,
                "first_name": row.get('first_name', '').strip() or row.get('nome', '').strip() or None,
                "last_name": row.get('last_name', '').strip() or row.get('cognome', '').strip() or None,
                "phone": row.get('phone', '').strip() or row.get('telefono', '').strip() or None,
                "tag": row.get('tag', 'lista-fredda-2025').strip(),
                "stato": "in_sequenza",
                "email_inviata": 0,
                "ultima_apertura": None,
                "ultimo_click": None,
                "risposta_ricevuta": False,
                "entrato_in_funnel": False,
                "date_registered": row.get('date_registered', '').strip() or None,
                "created_at": now,
                "updated_at": now,
                "fonte": "import_csv"
            }
            
            await db.lista_fredda.insert_one(lead_doc)
            imported += 1
            
        except Exception as e:
            errors += 1
            error_details.append(f"Row {row_num}: {str(e)}")
    
    # Log import
    await db.import_logs.insert_one({
        "type": "lista_fredda",
        "filename": file.filename,
        "imported": imported,
        "duplicates": duplicates,
        "errors": errors,
        "timestamp": now
    })
    
    # Send Telegram notification if significant import
    if imported > 100:
        try:
            import httpx
            telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
            admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
            if telegram_token and admin_chat_id:
                msg = f"📥 *Import Lista Fredda*\n\n✅ Importati: {imported:,}\n⚠️ Duplicati: {duplicates:,}\n❌ Errori: {errors}"
                async with httpx.AsyncClient() as http_client:
                    await http_client.post(
                        f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                        json={"chat_id": admin_chat_id, "text": msg, "parse_mode": "Markdown"}
                    )
        except Exception as e:
            logger.warning(f"Telegram notification failed: {e}")
    
    logger.info(f"[LISTA_FREDDA] Import completed: {imported} imported, {duplicates} duplicates, {errors} errors")
    
    return {
        "success": True,
        "imported": imported,
        "duplicates": duplicates,
        "errors": errors,
        "error_details": error_details[:10] if errors > 0 else []
    }


@router.get("/stats")
async def get_lista_fredda_stats():
    """
    Statistiche lista fredda: totale, per stato, aperture, click, conversioni.
    """
    pipeline = [
        {
            "$group": {
                "_id": "$stato",
                "count": {"$sum": 1}
            }
        }
    ]
    
    stato_counts = {}
    async for doc in db.lista_fredda.aggregate(pipeline):
        stato_counts[doc["_id"]] = doc["count"]
    
    total = await db.lista_fredda.count_documents({})
    aperture = await db.lista_fredda.count_documents({"ultima_apertura": {"$ne": None}})
    clicks = await db.lista_fredda.count_documents({"ultimo_click": {"$ne": None}})
    risposte = await db.lista_fredda.count_documents({"risposta_ricevuta": True})
    in_funnel = await db.lista_fredda.count_documents({"entrato_in_funnel": True})
    
    return {
        "totale": total,
        "per_stato": {
            "in_sequenza": stato_counts.get("in_sequenza", 0),
            "caldo": stato_counts.get("caldo", 0),
            "in_funnel": stato_counts.get("in_funnel", 0),
            "convertito": stato_counts.get("convertito", 0),
            "disiscritto": stato_counts.get("disiscritto", 0)
        },
        "metriche": {
            "aperture_totali": aperture,
            "click_totali": clicks,
            "risposte_ricevute": risposte,
            "entrati_in_funnel": in_funnel,
            "tasso_apertura": round(aperture / total * 100, 2) if total > 0 else 0,
            "tasso_click": round(clicks / total * 100, 2) if total > 0 else 0,
            "tasso_risposta": round(risposte / total * 100, 2) if total > 0 else 0
        }
    }


@router.get("/leads")
async def get_lista_fredda_leads(
    stato: Optional[str] = Query(None, description="Filtra per stato"),
    tag: Optional[str] = Query(None, description="Filtra per tag"),
    has_phone: Optional[bool] = Query(None, description="Solo con telefono"),
    limit: int = Query(50, le=500),
    skip: int = Query(0)
):
    """
    Lista contatti lista fredda con filtri.
    """
    query = {}
    
    if stato:
        query["stato"] = stato
    if tag:
        query["tag"] = tag
    if has_phone is True:
        query["phone"] = {"$ne": None, "$exists": True}
    
    leads = await db.lista_fredda.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.lista_fredda.count_documents(query)
    
    return {
        "leads": leads,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/leads/caldi")
async def get_leads_caldi(limit: int = Query(50, le=200)):
    """
    Lista contatti caldi (stato = caldo) con info contatto.
    Ordinati per ultima azione.
    """
    leads = await db.lista_fredda.find(
        {"stato": "caldo"},
        {"_id": 0}
    ).sort([("ultimo_click", -1), ("ultima_apertura", -1)]).limit(limit).to_list(limit)
    
    return {
        "leads": leads,
        "count": len(leads)
    }


@router.get("/export")
async def export_lista_fredda_csv(
    stato: Optional[str] = Query(None, description="Filtra per stato")
):
    """
    Export CSV filtrato per stato.
    """
    query = {}
    if stato:
        query["stato"] = stato
    
    leads = await db.lista_fredda.find(query, {"_id": 0}).to_list(50000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "email", "first_name", "last_name", "phone", "tag", "stato",
        "email_inviata", "ultima_apertura", "ultimo_click", 
        "risposta_ricevuta", "entrato_in_funnel", "created_at"
    ])
    
    # Data
    for lead in leads:
        writer.writerow([
            lead.get("email", ""),
            lead.get("first_name", ""),
            lead.get("last_name", ""),
            lead.get("phone", ""),
            lead.get("tag", ""),
            lead.get("stato", ""),
            lead.get("email_inviata", 0),
            lead.get("ultima_apertura", ""),
            lead.get("ultimo_click", ""),
            lead.get("risposta_ricevuta", False),
            lead.get("entrato_in_funnel", False),
            lead.get("created_at", "")
        ])
    
    output.seek(0)
    filename = f"lista_fredda_{stato or 'all'}_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/leads")
async def add_single_lead(lead: ListaFreddaLead):
    """Aggiunge un singolo contatto alla lista fredda (form manuale)."""
    existing = await db.lista_fredda.find_one({"email": lead.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=409, detail="Email già presente nella lista")

    doc = lead.dict()
    doc["email"] = doc["email"].lower().strip()
    doc["id"] = f"lf_{re.sub(r'[^a-z0-9]', '', doc['email'])[:20]}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.lista_fredda.insert_one(doc)
    return {"success": True, "id": doc["id"], "message": "Contatto aggiunto"}


@router.patch("/leads/{email}")
async def update_lista_fredda_lead(email: str, body: dict):
    """Admin modifica un contatto della lista fredda (ricerca per email)."""
    from urllib.parse import unquote
    email_decoded = unquote(email).lower().strip()

    existing = await db.lista_fredda.find_one({"email": email_decoded})
    if not existing:
        raise HTTPException(status_code=404, detail="Contatto non trovato")

    allowed = {
        "first_name", "last_name", "phone", "email", "tag",
        "stato", "note_admin", "risposta_ricevuta", "entrato_in_funnel"
    }
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="Nessun campo valido")

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.lista_fredda.update_one({"email": email_decoded}, {"$set": update})
    return {"success": True, "message": "Contatto aggiornato"}


@router.delete("/leads/{email}")
async def delete_lista_fredda_lead(email: str):
    """Elimina un contatto dalla lista fredda."""
    from urllib.parse import unquote
    email_decoded = unquote(email).lower().strip()
    result = await db.lista_fredda.delete_one({"email": email_decoded})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contatto non trovato")
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# PARTE 2: WEBHOOK TRACKING DA SYSTEME.IO
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/webhook/systeme-tracking")
async def systeme_tracking_webhook(event: SystemeTrackingEvent, background_tasks: BackgroundTasks):
    """
    Webhook per eventi tracking da Systeme.io.
    
    Eventi supportati:
    - email_opened: Contatto ha aperto un'email
    - link_clicked: Contatto ha cliccato un link
    - unsubscribed: Contatto si è disiscritto
    - reply_received: Contatto ha risposto all'email
    """
    now = datetime.now(timezone.utc)
    email = event.contact_email.strip().lower()
    
    # Find contact
    contact = await db.lista_fredda.find_one({"email": email})
    if not contact:
        logger.warning(f"[SYSTEME_TRACKING] Contact not found: {email}")
        # Create new contact from tracking event
        await db.lista_fredda.insert_one({
            "email": email,
            "first_name": None,
            "last_name": None,
            "phone": None,
            "tag": "lista-fredda-2025",
            "stato": "in_sequenza",
            "email_inviata": event.email_number or 0,
            "ultima_apertura": now.isoformat() if event.event == "email_opened" else None,
            "ultimo_click": now.isoformat() if event.event == "link_clicked" else None,
            "risposta_ricevuta": event.event == "reply_received",
            "entrato_in_funnel": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "fonte": "systeme_webhook"
        })
        return {"success": True, "action": "contact_created"}
    
    update_fields = {"updated_at": now.isoformat()}
    alert_message = None
    trigger_stefania = False
    
    # ─────────────────────────────────────────────────────────────
    # EVENT: email_opened
    # ─────────────────────────────────────────────────────────────
    if event.event == "email_opened":
        update_fields["ultima_apertura"] = now.isoformat()
        if event.email_number:
            update_fields["email_inviata"] = max(contact.get("email_inviata", 0), event.email_number)
        
        # Se apre email 4, schedule check 48h per STEFANIA
        if event.email_number == 4:
            background_tasks.add_task(
                schedule_stefania_check_48h,
                email,
                contact.get("first_name"),
                contact.get("phone")
            )
    
    # ─────────────────────────────────────────────────────────────
    # EVENT: link_clicked
    # ─────────────────────────────────────────────────────────────
    elif event.event == "link_clicked":
        update_fields["ultimo_click"] = now.isoformat()
        if event.email_number:
            update_fields["email_inviata"] = max(contact.get("email_inviata", 0), event.email_number)
        
        # Se clicca link email 4 → entra nel funnel
        if event.email_number == 4:
            update_fields["stato"] = "in_funnel"
            update_fields["entrato_in_funnel"] = True
            
            # Alert sistema
            alert_message = f"🎯 {contact.get('first_name', email)} è entrato nel funnel analisi €67!"
            
            # Schedule check 24h per STEFANIA (reminder se non paga)
            background_tasks.add_task(
                schedule_stefania_funnel_check_24h,
                email,
                contact.get("first_name"),
                contact.get("phone")
            )
        else:
            # Qualsiasi click → diventa caldo
            if contact.get("stato") == "in_sequenza":
                update_fields["stato"] = "caldo"
                alert_message = f"🔥 Lead caldo: {contact.get('first_name', email)} ha cliccato!"
    
    # ─────────────────────────────────────────────────────────────
    # EVENT: unsubscribed
    # ─────────────────────────────────────────────────────────────
    elif event.event == "unsubscribed":
        update_fields["stato"] = "disiscritto"
        logger.info(f"[SYSTEME_TRACKING] Contact unsubscribed: {email}")
    
    # ─────────────────────────────────────────────────────────────
    # EVENT: reply_received
    # ─────────────────────────────────────────────────────────────
    elif event.event == "reply_received":
        update_fields["risposta_ricevuta"] = True
        update_fields["stato"] = "caldo"
        trigger_stefania = True
        
        nome = contact.get("first_name") or email
        alert_message = f"📩 RISPOSTA RICEVUTA: {nome} ha risposto alla sequenza email!"
        
        # Alert immediato Telegram
        await send_telegram_alert(
            f"📩 *RISPOSTA EMAIL LISTA FREDDA*\n\n"
            f"👤 {nome}\n"
            f"📧 {email}\n"
            f"📱 {contact.get('phone') or 'N/A'}\n\n"
            f"⚡ Verificare subito la risposta!"
        )
    
    # Update contact
    await db.lista_fredda.update_one(
        {"email": email},
        {"$set": update_fields}
    )
    
    # Create system alert if needed
    if alert_message:
        await db.system_alerts.insert_one({
            "type": "lista_fredda_tracking",
            "event": event.event,
            "email": email,
            "message": alert_message,
            "created_at": now.isoformat(),
            "read": False
        })
    
    # Log tracking event
    await db.tracking_events.insert_one({
        "source": "systeme",
        "event": event.event,
        "email": email,
        "email_number": event.email_number,
        "timestamp": event.timestamp or now.isoformat(),
        "processed_at": now.isoformat()
    })
    
    logger.info(f"[SYSTEME_TRACKING] Processed {event.event} for {email}")
    
    return {
        "success": True,
        "event": event.event,
        "contact_email": email,
        "updates": list(update_fields.keys())
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PARTE 3: TRIGGER STEFANIA (Background Tasks)
# ═══════════════════════════════════════════════════════════════════════════════

async def schedule_stefania_check_48h(email: str, nome: str, phone: str):
    """
    Schedule Celery task per check STEFANIA 48h dopo apertura email 4.
    Se non ha cliccato → task WhatsApp.
    """
    try:
        from celery_app import celery_app
        
        celery_app.send_task(
            'celery_tasks.stefania_check_email4_noclick',
            args=[email, nome, phone],
            countdown=172800,  # 48 hours
            queue='analisi_automation'
        )
        logger.info(f"[STEFANIA] Scheduled 48h check for {email}")
    except Exception as e:
        logger.error(f"[STEFANIA] Failed to schedule 48h check: {e}")


async def schedule_stefania_funnel_check_24h(email: str, nome: str, phone: str):
    """
    Schedule Celery task per check STEFANIA 24h dopo ingresso funnel.
    Se non ha pagato → reminder automatico.
    """
    try:
        from celery_app import celery_app
        
        celery_app.send_task(
            'celery_tasks.stefania_check_funnel_nopayment',
            args=[email, nome, phone],
            countdown=86400,  # 24 hours
            queue='analisi_automation'
        )
        logger.info(f"[STEFANIA] Scheduled 24h funnel check for {email}")
    except Exception as e:
        logger.error(f"[STEFANIA] Failed to schedule funnel check: {e}")


async def send_telegram_alert(message: str):
    """Send immediate Telegram alert"""
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message, "parse_mode": "Markdown"}
                )
    except Exception as e:
        logger.error(f"[TELEGRAM] Alert failed: {e}")
