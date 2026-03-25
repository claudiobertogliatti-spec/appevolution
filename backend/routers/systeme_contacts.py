"""
Systeme.io Contacts Router - Import e gestione contatti
Evolution PRO - 2026

Questo router gestisce l'import massivo di contatti su Systeme.io
con assegnazione automatica del tag Lista_Fredda.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
import os
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/systeme", tags=["systeme-contacts"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Systeme.io Configuration
SYSTEME_API_KEY = os.environ.get('SYSTEME_API_KEY', '')
SYSTEME_BASE_URL = "https://api.systeme.io/api"
TAG_LISTA_FREDDA_ID = 1934404  # ID del tag "Lista_Fredda" su Systeme.io


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SystemeContact(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class SystemeImportRequest(BaseModel):
    contacts: List[SystemeContact]
    tag_id: int = TAG_LISTA_FREDDA_ID


class SystemeTagRequest(BaseModel):
    email: str
    tag_id: int = TAG_LISTA_FREDDA_ID


class SystemeBulkImportRequest(BaseModel):
    tag_id: int = TAG_LISTA_FREDDA_ID
    batch_size: int = Field(default=50, ge=10, le=100)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_systeme_headers():
    """Genera headers per le richieste API Systeme.io"""
    return {
        "X-API-Key": SYSTEME_API_KEY,
        "Content-Type": "application/json"
    }


async def find_or_create_contact(client: httpx.AsyncClient, contact: SystemeContact) -> dict:
    """
    Cerca un contatto su Systeme.io per email.
    Se non esiste, lo crea.
    Ritorna: {"contact_id": int, "created": bool, "error": str|None}
    """
    headers = get_systeme_headers()
    email = contact.email.strip().lower()
    
    try:
        # 1. Cerca contatto esistente
        search_response = await client.get(
            f"{SYSTEME_BASE_URL}/contacts",
            params={"email": email},
            headers=headers,
            timeout=15
        )
        
        if search_response.status_code == 200:
            data = search_response.json()
            items = data.get("items", [])
            for item in items:
                if item.get("email", "").lower() == email:
                    return {
                        "contact_id": item.get("id"),
                        "created": False,
                        "error": None
                    }
        
        # 2. Contatto non trovato, crea nuovo
        create_payload = {
            "email": email,
            "fields": []
        }
        
        if contact.first_name:
            create_payload["fields"].append({"slug": "first_name", "value": contact.first_name})
        if contact.last_name:
            create_payload["fields"].append({"slug": "surname", "value": contact.last_name})
        if contact.phone:
            create_payload["fields"].append({"slug": "phone_number", "value": contact.phone})
        
        create_response = await client.post(
            f"{SYSTEME_BASE_URL}/contacts",
            headers=headers,
            json=create_payload,
            timeout=15
        )
        
        if create_response.status_code in [200, 201]:
            contact_data = create_response.json()
            return {
                "contact_id": contact_data.get("id"),
                "created": True,
                "error": None
            }
        else:
            return {
                "contact_id": None,
                "created": False,
                "error": f"Errore creazione: {create_response.status_code} - {create_response.text[:200]}"
            }
            
    except Exception as e:
        return {
            "contact_id": None,
            "created": False,
            "error": str(e)
        }


async def add_tag_to_contact_by_id(client: httpx.AsyncClient, contact_id: int, tag_id: int) -> bool:
    """
    Assegna un tag a un contatto su Systeme.io tramite ID.
    Ritorna True se successo, False altrimenti.
    """
    headers = get_systeme_headers()
    
    try:
        response = await client.post(
            f"{SYSTEME_BASE_URL}/contacts/{contact_id}/tags",
            headers=headers,
            json={"tagId": tag_id},
            timeout=10
        )
        
        if response.status_code in [200, 201, 204]:
            return True
        elif response.status_code == 422:
            # Tag già presente
            logger.info(f"[SYSTEME] Tag {tag_id} già presente su contatto {contact_id}")
            return True
        else:
            logger.warning(f"[SYSTEME] Errore assegnazione tag: {response.status_code} - {response.text[:200]}")
            return False
            
    except Exception as e:
        logger.error(f"[SYSTEME] Errore add_tag: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: POST /api/systeme/contacts/import
# Importa array di contatti su Systeme.io con tag automatico
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/contacts/import")
async def import_contacts_to_systeme(request: SystemeImportRequest):
    """
    Importa un array di contatti su Systeme.io via API nativa.
    Crea i contatti se non esistono e assegna automaticamente il tag specificato.
    
    Request body:
    {
        "contacts": [
            {"email": "mario@rossi.it", "first_name": "Mario", "last_name": "Rossi", "phone": "+393331234567"},
            ...
        ],
        "tag_id": 1934404
    }
    
    Rispetta i rate limit API: max ~50 contatti per batch consigliato.
    """
    if not SYSTEME_API_KEY:
        raise HTTPException(status_code=500, detail="SYSTEME_API_KEY non configurata")
    
    if not request.contacts:
        raise HTTPException(status_code=400, detail="Lista contatti vuota")
    
    now = datetime.now(timezone.utc)
    results = {
        "total": len(request.contacts),
        "created": 0,
        "existing": 0,
        "tagged": 0,
        "errors": 0,
        "error_details": []
    }
    
    async with httpx.AsyncClient(timeout=30) as http_client:
        for i, contact in enumerate(request.contacts):
            try:
                # Delay per rispettare rate limit (max 5 req/sec)
                if i > 0 and i % 5 == 0:
                    await asyncio.sleep(1)
                
                # 1. Trova o crea contatto
                result = await find_or_create_contact(http_client, contact)
                
                if result.get("error"):
                    results["errors"] += 1
                    results["error_details"].append({
                        "email": contact.email,
                        "error": result["error"]
                    })
                    continue
                
                contact_id = result.get("contact_id")
                if not contact_id:
                    results["errors"] += 1
                    results["error_details"].append({
                        "email": contact.email,
                        "error": "Nessun contact_id ritornato"
                    })
                    continue
                
                if result.get("created"):
                    results["created"] += 1
                else:
                    results["existing"] += 1
                
                # 2. Assegna tag
                tag_success = await add_tag_to_contact_by_id(http_client, contact_id, request.tag_id)
                if tag_success:
                    results["tagged"] += 1
                else:
                    results["error_details"].append({
                        "email": contact.email,
                        "error": f"Contatto creato ma tag {request.tag_id} non assegnato"
                    })
                    
            except Exception as e:
                results["errors"] += 1
                results["error_details"].append({
                    "email": contact.email,
                    "error": str(e)
                })
    
    # Log operazione
    await db.systeme_import_logs.insert_one({
        "type": "contacts_import",
        "tag_id": request.tag_id,
        "total": results["total"],
        "created": results["created"],
        "existing": results["existing"],
        "tagged": results["tagged"],
        "errors": results["errors"],
        "timestamp": now.isoformat()
    })
    
    logger.info(f"[SYSTEME] Import completato: {results['created']} creati, {results['existing']} esistenti, {results['tagged']} taggati, {results['errors']} errori")
    
    # Limita error_details a 20 per non appesantire la response
    if len(results["error_details"]) > 20:
        results["error_details"] = results["error_details"][:20]
        results["error_details_truncated"] = True
    
    return {
        "success": True,
        "results": results
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: POST /api/systeme/contacts/tag
# Assegna un tag a un singolo contatto già presente su Systeme.io
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/contacts/tag")
async def tag_single_contact(request: SystemeTagRequest):
    """
    Assegna un tag a un singolo contatto già presente su Systeme.io.
    
    Request body:
    {
        "email": "mario@rossi.it",
        "tag_id": 1934404
    }
    
    Se il contatto non esiste, ritorna errore.
    """
    if not SYSTEME_API_KEY:
        raise HTTPException(status_code=500, detail="SYSTEME_API_KEY non configurata")
    
    email = request.email.strip().lower()
    headers = get_systeme_headers()
    
    async with httpx.AsyncClient(timeout=30) as http_client:
        # 1. Cerca contatto
        search_response = await http_client.get(
            f"{SYSTEME_BASE_URL}/contacts",
            params={"email": email},
            headers=headers
        )
        
        if search_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Errore ricerca contatto: {search_response.status_code}"
            )
        
        data = search_response.json()
        items = data.get("items", [])
        
        contact_id = None
        for item in items:
            if item.get("email", "").lower() == email:
                contact_id = item.get("id")
                break
        
        if not contact_id:
            raise HTTPException(
                status_code=404,
                detail=f"Contatto {email} non trovato su Systeme.io"
            )
        
        # 2. Assegna tag
        success = await add_tag_to_contact_by_id(http_client, contact_id, request.tag_id)
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail=f"Impossibile assegnare tag {request.tag_id} al contatto {email}"
            )
    
    logger.info(f"[SYSTEME] Tag {request.tag_id} assegnato a {email}")
    
    return {
        "success": True,
        "email": email,
        "contact_id": contact_id,
        "tag_id": request.tag_id,
        "message": f"Tag {request.tag_id} assegnato con successo"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: POST /api/systeme/contacts/import-bulk
# Legge dal MongoDB lista_fredda e importa in batch su Systeme.io
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/contacts/import-bulk")
async def import_bulk_from_mongodb(request: SystemeBulkImportRequest, background_tasks: BackgroundTasks):
    """
    Legge tutti i contatti dalla collection `lista_fredda` di MongoDB
    e li importa in batch su Systeme.io, assegnando il tag specificato.
    
    Request body:
    {
        "tag_id": 1934404,
        "batch_size": 50
    }
    
    L'operazione viene eseguita in background per non bloccare la richiesta.
    I contatti vengono processati in batch da 50 (default) per rispettare i rate limit.
    """
    if not SYSTEME_API_KEY:
        raise HTTPException(status_code=500, detail="SYSTEME_API_KEY non configurata")
    
    # Conta quanti contatti ci sono nella lista fredda
    total_contacts = await db.lista_fredda.count_documents({})
    
    if total_contacts == 0:
        return {
            "success": True,
            "message": "Nessun contatto nella lista fredda",
            "total": 0
        }
    
    # Crea job di import
    job_id = f"systeme_bulk_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    
    await db.systeme_bulk_jobs.insert_one({
        "job_id": job_id,
        "tag_id": request.tag_id,
        "batch_size": request.batch_size,
        "total_contacts": total_contacts,
        "status": "started",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "progress": {
            "processed": 0,
            "created": 0,
            "existing": 0,
            "tagged": 0,
            "errors": 0
        }
    })
    
    # Avvia job in background
    background_tasks.add_task(
        process_bulk_import_job,
        job_id,
        request.tag_id,
        request.batch_size
    )
    
    logger.info(f"[SYSTEME] Bulk import job avviato: {job_id} - {total_contacts} contatti")
    
    return {
        "success": True,
        "job_id": job_id,
        "total_contacts": total_contacts,
        "batch_size": request.batch_size,
        "message": f"Import avviato in background. Job ID: {job_id}"
    }


async def process_bulk_import_job(job_id: str, tag_id: int, batch_size: int):
    """
    Background task che processa l'import bulk dalla lista fredda.
    Lavora in batch per rispettare i rate limit di Systeme.io.
    """
    logger.info(f"[SYSTEME] Processing bulk import job: {job_id}")
    
    progress = {
        "processed": 0,
        "created": 0,
        "existing": 0,
        "tagged": 0,
        "errors": 0,
        "batches_completed": 0
    }
    
    try:
        # Crea nuova connessione MongoDB per il background task
        from motor.motor_asyncio import AsyncIOMotorClient
        bg_client = AsyncIOMotorClient(mongo_url)
        bg_db = bg_client[db_name]
        
        # Recupera tutti i contatti dalla lista fredda
        cursor = bg_db.lista_fredda.find({}, {"_id": 0, "email": 1, "first_name": 1, "last_name": 1, "phone": 1})
        contacts_list = await cursor.to_list(length=50000)
        
        async with httpx.AsyncClient(timeout=30) as http_client:
            # Processa in batch
            for batch_start in range(0, len(contacts_list), batch_size):
                batch = contacts_list[batch_start:batch_start + batch_size]
                
                for contact_data in batch:
                    try:
                        contact = SystemeContact(
                            email=contact_data.get("email", ""),
                            first_name=contact_data.get("first_name"),
                            last_name=contact_data.get("last_name"),
                            phone=contact_data.get("phone")
                        )
                        
                        if not contact.email or "@" not in contact.email:
                            progress["errors"] += 1
                            continue
                        
                        result = await find_or_create_contact(http_client, contact)
                        
                        if result.get("error"):
                            progress["errors"] += 1
                            continue
                        
                        contact_id = result.get("contact_id")
                        if not contact_id:
                            progress["errors"] += 1
                            continue
                        
                        if result.get("created"):
                            progress["created"] += 1
                        else:
                            progress["existing"] += 1
                        
                        # Assegna tag
                        if await add_tag_to_contact_by_id(http_client, contact_id, tag_id):
                            progress["tagged"] += 1
                        
                        progress["processed"] += 1
                        
                        # Rate limit: max 5 richieste al secondo
                        await asyncio.sleep(0.25)
                        
                    except Exception as e:
                        progress["errors"] += 1
                        logger.warning(f"[SYSTEME] Errore contatto {contact_data.get('email')}: {e}")
                
                progress["batches_completed"] += 1
                
                # Aggiorna progresso nel database
                await bg_db.systeme_bulk_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {
                        "progress": progress,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                logger.info(f"[SYSTEME] Batch {progress['batches_completed']} completato - Processati: {progress['processed']}")
                
                # Pausa tra i batch per non sovraccaricare l'API
                await asyncio.sleep(2)
        
        # Job completato
        await bg_db.systeme_bulk_jobs.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": "completed",
                "progress": progress,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Notifica Telegram
        try:
            telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
            admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
            if telegram_token and admin_chat_id:
                msg = (
                    f"✅ *Import Lista Fredda → Systeme.io Completato*\n\n"
                    f"📊 Job ID: `{job_id}`\n"
                    f"👥 Processati: {progress['processed']}\n"
                    f"➕ Creati: {progress['created']}\n"
                    f"🔄 Esistenti: {progress['existing']}\n"
                    f"🏷️ Taggati: {progress['tagged']}\n"
                    f"❌ Errori: {progress['errors']}"
                )
                async with httpx.AsyncClient() as tg_client:
                    await tg_client.post(
                        f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                        json={"chat_id": admin_chat_id, "text": msg, "parse_mode": "Markdown"}
                    )
        except Exception as e:
            logger.warning(f"[SYSTEME] Telegram notification failed: {e}")
        
        logger.info(f"[SYSTEME] Bulk import job completato: {job_id} - {progress}")
        
        bg_client.close()
        
    except Exception as e:
        logger.error(f"[SYSTEME] Bulk import job failed: {job_id} - {e}")
        
        # Marca job come fallito
        await db.systeme_bulk_jobs.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "progress": progress,
                "failed_at": datetime.now(timezone.utc).isoformat()
            }}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 4: GET /api/systeme/contacts/import-bulk/status/{job_id}
# Verifica lo stato di un job di import bulk
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/contacts/import-bulk/status/{job_id}")
async def get_bulk_import_status(job_id: str):
    """
    Recupera lo stato di un job di import bulk.
    """
    job = await db.systeme_bulk_jobs.find_one({"job_id": job_id}, {"_id": 0})
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} non trovato")
    
    return {
        "success": True,
        "job": job
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 5: GET /api/systeme/contacts/import-bulk/jobs
# Lista tutti i job di import bulk
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/contacts/import-bulk/jobs")
async def list_bulk_import_jobs(limit: int = 20):
    """
    Lista gli ultimi job di import bulk.
    """
    jobs = await db.systeme_bulk_jobs.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "jobs": jobs,
        "count": len(jobs)
    }
