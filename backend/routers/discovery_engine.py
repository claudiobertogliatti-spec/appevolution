"""
Discovery Engine AI - Modulo Lead Discovery Proattivo
Evolution PRO OS

Componenti:
1. Database: collection discovery_leads con scoring AI
2. Gaia: browser_search per mappare siti web lead
3. Stefania: generate_first_contact_v2 con regalo strategico
4. Worker: pulizia duplicati ogni 24h
5. Integrazione Systeme.io per lead positivi
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone, timedelta
from enum import Enum
import logging
import os
import re
import json
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/discovery", tags=["discovery-engine"])

# Database
db = None

def set_db(database):
    global db
    db = database

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class LeadSource(str, Enum):
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    YOUTUBE = "youtube"
    GOOGLE = "google"
    FACEBOOK = "facebook"
    MANUAL = "manual"


class LeadStatus(str, Enum):
    PENDING = "pending"                  # In attesa di elaborazione
    DISCOVERED = "discovered"           # Appena scoperto
    ANALYZING = "analyzing"             # In analisi (scraping sito)
    SCORED = "scored"                   # Scoring completato
    CONTACTED = "contacted"             # Contattato
    MESSAGE_READY = "message_ready"     # Messaggio pronto per invio
    MESSAGE_SENT = "message_sent"       # Messaggio inviato
    RESPONDED_POSITIVE = "responded_positive"  # Risposta positiva
    RESPONDED_NEGATIVE = "responded_negative"  # Risposta negativa/no interest
    QUALIFIED = "qualified"             # Qualificato
    CONVERTED = "converted"             # Convertito in cliente
    REJECTED = "rejected"               # Scartato (duplicato, non in target)


class OutreachStatus(str, Enum):
    PENDING = "pending"                 # In attesa approvazione
    APPROVED = "approved"               # Approvato, pronto per invio
    SENT = "sent"                       # Inviato
    FAILED = "failed"                   # Invio fallito


class GiftType(str, Enum):
    CONTENT_ANALYSIS = "content_analysis"       # Analisi di un loro contenuto
    TACTICAL_SUGGESTION = "tactical_suggestion"  # Suggerimento tattico
    FUNNEL_AUDIT = "funnel_audit"               # Mini-audit funnel/bio
    MIXED = "mixed"                             # Combinazione


# ═══════════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class DiscoveryLead(BaseModel):
    """Schema per un lead scoperto"""
    # Identificazione
    id: Optional[str] = None
    source: LeadSource
    platform_username: str
    platform_url: str
    email: Optional[str] = None
    
    # Metadati Social
    display_name: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    website_url: Optional[str] = None
    
    # Metriche
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    engagement_rate: float = 0.0
    
    # Analisi
    niche_detected: Optional[str] = None
    monetization_signals: List[str] = []
    content_frequency: str = "unknown"  # daily, weekly, monthly, sporadic
    
    # Scoring AI (0-100)
    score_total: int = 0
    score_breakdown: Dict[str, int] = {}
    
    # Status
    status: LeadStatus = LeadStatus.DISCOVERED
    target_fit_level: str = "medio"  # basso, medio, alto, altissimo
    
    # Website Analysis (da Gaia)
    website_html: Optional[str] = None
    website_analysis: Optional[Dict] = None
    
    # Outreach
    outreach_message: Optional[str] = None
    outreach_gift_type: Optional[GiftType] = None
    outreach_status: OutreachStatus = OutreachStatus.PENDING
    outreach_sent_at: Optional[str] = None
    
    # Timestamps
    discovered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Systeme.io
    systeme_contact_id: Optional[str] = None
    systeme_injected_at: Optional[str] = None


class SearchQuery(BaseModel):
    """Query di ricerca per discovery"""
    source: LeadSource
    query: str
    niche_filter: Optional[str] = None
    min_followers: int = 1000
    max_followers: int = 100000
    max_results: int = 20


class ScoreLeadRequest(BaseModel):
    lead_id: str


class GenerateOutreachRequest(BaseModel):
    lead_id: str
    gift_type: Optional[GiftType] = None  # None = Stefania sceglie


class ApproveOutreachRequest(BaseModel):
    lead_id: str
    edited_message: Optional[str] = None  # Se Antonella vuole modificarlo


class MarkResponseRequest(BaseModel):
    lead_id: str
    response_type: Literal["positive", "negative"]
    response_notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_llm_chat(session_id: str = "discovery", system_message: str = "Sei STEFANIA, assistente AI di Evolution PRO."):
    """Helper per ottenere istanza LLM"""
    from emergentintegrations.llm.chat import LlmChat
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM Key non configurata")
    return LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message)


def generate_lead_id(source: str, username: str) -> str:
    """Genera ID univoco per lead"""
    import hashlib
    unique_str = f"{source}_{username}".lower()
    return hashlib.md5(unique_str.encode()).hexdigest()[:12]


async def check_duplicate(source: str, username: str, email: Optional[str] = None) -> bool:
    """Verifica se il lead è un duplicato"""
    if db is None:
        return False
    
    # Check by username + platform
    existing = await db.discovery_leads.find_one({
        "source": source,
        "platform_username": username.lower()
    })
    if existing:
        return True
    
    # Check by email if provided
    if email:
        existing_email = await db.discovery_leads.find_one({"email": email.lower()})
        if existing_email:
            return True
    
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 1: DATABASE & CRUD
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/leads")
async def create_lead(lead: DiscoveryLead):
    """Crea un nuovo lead nel database"""
    # Check duplicato
    is_duplicate = await check_duplicate(lead.source.value, lead.platform_username, lead.email)
    if is_duplicate:
        raise HTTPException(status_code=400, detail="Lead già presente nel database")
    
    # Genera ID
    lead.id = generate_lead_id(lead.source.value, lead.platform_username)
    lead.discovered_at = datetime.now(timezone.utc).isoformat()
    lead.updated_at = datetime.now(timezone.utc).isoformat()
    
    # Salva
    doc = lead.model_dump()
    await db.discovery_leads.insert_one(doc)
    
    # Remove MongoDB _id from response
    doc.pop("_id", None)
    
    logger.info(f"[DISCOVERY] Nuovo lead: {lead.display_name} ({lead.source.value})")
    
    return {"success": True, "lead_id": lead.id, "lead": doc}


# ═══════════════════════════════════════════════════════════════════════════════
# IMPORT MASSIVO LEAD (per automazioni esterne)
# ═══════════════════════════════════════════════════════════════════════════════

class ImportLeadItem(BaseModel):
    """Singolo lead da importare"""
    source: LeadSource
    platform_username: str
    display_name: str
    bio: Optional[str] = None
    website_url: Optional[str] = None
    platform_url: Optional[str] = None
    email: Optional[str] = None
    followers_count: Optional[int] = None
    niche_detected: Optional[str] = None


class ImportLeadsRequest(BaseModel):
    """Request per importazione massiva"""
    leads: List[ImportLeadItem]
    auto_score: bool = False  # Se true, calcola automaticamente lo score


@router.post("/import")
async def import_leads(request: ImportLeadsRequest, background_tasks: BackgroundTasks):
    """
    Importa una lista di lead da fonti esterne.
    
    Endpoint usato dallo script automatico alle 7:00 per:
    - Importare lead da ricerche automatiche
    - Importare da CSV o altre fonti
    - Sincronizzare lead da CRM esterni
    
    Returns:
        - imported: numero di lead importati
        - skipped: numero di lead saltati (duplicati)
        - errors: eventuali errori
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    results = {
        "imported": 0,
        "skipped": 0,
        "errors": [],
        "imported_ids": []
    }
    
    for item in request.leads:
        try:
            # Check duplicato
            is_duplicate = await check_duplicate(
                item.source.value, 
                item.platform_username,
                item.email
            )
            
            if is_duplicate:
                results["skipped"] += 1
                continue
            
            # Genera ID e prepara documento
            lead_id = f"lead_{generate_lead_id(item.source.value, item.platform_username)}"
            
            # Genera email se non fornita
            email = item.email
            if not email:
                username = re.sub(r'[^a-zA-Z0-9]', '', item.platform_username.lower())
                email = f"{username}_{item.source.value}@discovery.evolutionpro.it"
            
            doc = {
                "id": lead_id,
                "source": item.source.value,
                "platform_username": item.platform_username.lower(),
                "platform_url": item.platform_url or f"https://{item.source.value}.com/{item.platform_username}",
                "display_name": item.display_name,
                "bio": item.bio,
                "website_url": item.website_url,
                "email": email,
                "followers_count": item.followers_count,
                "niche_detected": item.niche_detected,
                "status": "discovered",
                "score_total": 0,
                "discovered_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.discovery_leads.insert_one(doc)
            results["imported"] += 1
            results["imported_ids"].append(lead_id)
            
            logger.info(f"[DISCOVERY IMPORT] Lead importato: {item.display_name} ({item.source.value})")
            
        except Exception as e:
            results["errors"].append({
                "username": item.platform_username,
                "error": str(e)
            })
            logger.error(f"[DISCOVERY IMPORT] Errore import {item.platform_username}: {e}")
    
    # Se auto_score è attivo, lancia scoring in background
    if request.auto_score and results["imported_ids"]:
        background_tasks.add_task(auto_score_imported_leads, results["imported_ids"])
    
    logger.info(f"[DISCOVERY IMPORT] Completato: {results['imported']} importati, {results['skipped']} saltati")
    
    return {
        "success": True,
        "imported": results["imported"],
        "skipped": results["skipped"],
        "errors": results["errors"],
        "total_processed": len(request.leads)
    }


async def auto_score_imported_leads(lead_ids: List[str]):
    """Background task per assegnare score ai lead importati"""
    import asyncio
    
    for lead_id in lead_ids:
        try:
            lead = await db.discovery_leads.find_one({"id": lead_id})
            if not lead:
                continue
            
            # Calcola score base
            score = 50  # Base score
            
            if lead.get("followers_count"):
                fc = lead["followers_count"]
                if fc >= 100000:
                    score += 30
                elif fc >= 50000:
                    score += 25
                elif fc >= 10000:
                    score += 20
                elif fc >= 5000:
                    score += 15
                elif fc >= 1000:
                    score += 10
            
            if lead.get("website_url"):
                score += 10
            
            if lead.get("bio") and len(lead["bio"]) > 50:
                score += 5
            
            # Aggiorna score
            await db.discovery_leads.update_one(
                {"id": lead_id},
                {"$set": {
                    "score_total": min(score, 100),
                    "score_calculated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            await asyncio.sleep(0.1)  # Rate limiting
            
        except Exception as e:
            logger.error(f"[DISCOVERY] Auto-score error for {lead_id}: {e}")


class ImportCSVRequest(BaseModel):
    """Request per import da CSV"""
    csv_content: str
    source: LeadSource = LeadSource.INSTAGRAM
    auto_score: bool = True


@router.post("/import/csv")
async def import_leads_from_csv(request: ImportCSVRequest):
    """
    Importa lead da contenuto CSV.
    
    Formato CSV atteso:
    username,display_name,bio,followers,website
    
    Esempio:
    mario_rossi,Mario Rossi,Business Coach,25000,https://mariorossi.it
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    import csv
    from io import StringIO
    
    try:
        reader = csv.DictReader(StringIO(request.csv_content))
        leads = []
        
        for row in reader:
            leads.append(ImportLeadItem(
                source=request.source,
                platform_username=row.get("username", ""),
                display_name=row.get("display_name", row.get("name", "")),
                bio=row.get("bio", ""),
                followers_count=int(row.get("followers", 0)) if row.get("followers") else None,
                website_url=row.get("website", None)
            ))
        
        # Usa l'endpoint di import
        import_request = ImportLeadsRequest(leads=leads, auto_score=request.auto_score)
        return await import_leads(import_request, BackgroundTasks())
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore parsing CSV: {e}")


@router.get("/leads/hot")
async def get_hot_leads(limit: int = 20, min_score: int = 50):
    """
    Ritorna i lead caldi ordinati per score.
    Usato dalla tab Discovery Leads nell'Agent Hub.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    leads = await db.discovery_leads.find(
        {"score_total": {"$gte": min_score}},
        {"_id": 0, "website_html": 0}
    ).sort("score_total", -1).limit(limit).to_list(limit)
    
    return {
        "leads": leads,
        "count": len(leads),
        "min_score": min_score
    }


@router.get("/leads")
async def get_leads(
    status: Optional[LeadStatus] = None,
    source: Optional[LeadSource] = None,
    min_score: int = 0,
    limit: int = 50,
    skip: int = 0
):
    """Lista leads con filtri"""
    query = {}
    if status:
        query["status"] = status.value
    if source:
        query["source"] = source.value
    if min_score > 0:
        query["score_total"] = {"$gte": min_score}
    
    leads = await db.discovery_leads.find(
        query, {"_id": 0, "website_html": 0}  # Escludi HTML pesante
    ).sort("score_total", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.discovery_leads.count_documents(query)
    
    return {
        "leads": leads,
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit
    }


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    """Dettaglio singolo lead"""
    lead = await db.discovery_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    return lead


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    """Elimina un lead"""
    result = await db.discovery_leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    return {"success": True, "deleted": lead_id}


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 2: GAIA - BROWSER SEARCH & WEBSITE ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/search")
async def search_leads(query: SearchQuery, background_tasks: BackgroundTasks):
    """
    Gaia esegue ricerca lead su piattaforma specificata.
    Restituisce risultati e avvia analisi in background.
    """
    results = []
    
    # Simula ricerca (in produzione: integrazione API social o scraping)
    # Per ora creiamo un framework che può essere esteso
    
    search_log = {
        "query": query.model_dump(),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "processing"
    }
    await db.discovery_search_logs.insert_one(search_log)
    
    # Qui andrebbe l'integrazione reale con le API social
    # Per ora restituiamo istruzioni
    
    return {
        "success": True,
        "message": f"Ricerca avviata su {query.source.value} per '{query.query}'",
        "instructions": {
            "instagram": "Usa Instagram Basic Display API o scraping con consenso",
            "linkedin": "Usa LinkedIn Sales Navigator API",
            "youtube": "Usa YouTube Data API v3",
            "google": "Usa Google Custom Search API"
        },
        "next_step": "Implementare integrazione API specifica per ogni piattaforma"
    }


@router.post("/analyze-website/{lead_id}")
async def analyze_website(lead_id: str):
    """
    Gaia scarica e analizza il sito web del lead.
    Sistema ibrido: Ollama (se disponibile) + Fallback automatico a Claude.
    """
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    website_url = lead.get("website_url")
    if not website_url:
        raise HTTPException(status_code=400, detail="Lead non ha un sito web configurato")
    
    # Update status
    await db.discovery_leads.update_one(
        {"id": lead_id},
        {"$set": {"status": LeadStatus.ANALYZING.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    try:
        # Scarica HTML della home page
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(website_url)
            html_content = response.text[:50000]
        
        # ═══════════════════════════════════════════════════════════════════
        # ANALISI CON FALLBACK AUTOMATICO (Ollama → Claude)
        # ═══════════════════════════════════════════════════════════════════
        from ollama_service import extract_lead_data_from_html
        
        website_analysis = await extract_lead_data_from_html(html_content, website_url)
        
        # Determina successo
        has_error = website_analysis.get("error") or website_analysis.get("parse_error")
        new_status = LeadStatus.DISCOVERED.value if has_error else LeadStatus.SCORED.value
        
        # Salva risultati
        await db.discovery_leads.update_one(
            {"id": lead_id},
            {"$set": {
                "website_html": html_content[:10000],
                "website_analysis": website_analysis,
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        llm_used = website_analysis.get("llm_used", "unknown")
        logger.info(f"[GAIA] Analisi completata per {lead_id} (LLM: {llm_used})")
        
        return {
            "success": not has_error,
            "lead_id": lead_id,
            "website_analysis": website_analysis,
            "llm_used": llm_used
        }
        
    except httpx.RequestError as e:
        logger.error(f"[GAIA] Errore download sito {lead_id}: {e}")
        await db.discovery_leads.update_one(
            {"id": lead_id},
            {"$set": {
                "status": LeadStatus.DISCOVERED.value,
                "website_analysis": {"error": f"Impossibile raggiungere il sito: {str(e)}"},
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=502, detail=f"Sito non raggiungibile: {website_url}")
        
    except Exception as e:
        logger.error(f"[GAIA] Errore analisi sito {lead_id}: {e}")
        await db.discovery_leads.update_one(
            {"id": lead_id},
            {"$set": {
                "status": LeadStatus.DISCOVERED.value,
                "website_analysis": {"error": str(e)},
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=500, detail=f"Errore analisi: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 2B: SCORING AI
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/score/{lead_id}")
async def score_lead(lead_id: str):
    """
    Calcola lo score AI del lead basato sui criteri definiti.
    
    Criteri:
    - audience_size (followers/iscritti): 0-25 punti
    - engagement_rate: 0-20 punti
    - content_frequency: 0-15 punti
    - monetization_signals: 0-20 punti
    - niche_fit: 0-20 punti
    """
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    score_breakdown = {}
    
    # 1. Audience Size (0-25)
    followers = lead.get("followers_count", 0)
    if followers >= 50000:
        score_breakdown["audience_size"] = 25
    elif followers >= 20000:
        score_breakdown["audience_size"] = 20
    elif followers >= 10000:
        score_breakdown["audience_size"] = 15
    elif followers >= 5000:
        score_breakdown["audience_size"] = 10
    elif followers >= 1000:
        score_breakdown["audience_size"] = 5
    else:
        score_breakdown["audience_size"] = 0
    
    # 2. Engagement Rate (0-20)
    engagement = lead.get("engagement_rate", 0)
    if engagement >= 5:
        score_breakdown["engagement_rate"] = 20
    elif engagement >= 3:
        score_breakdown["engagement_rate"] = 15
    elif engagement >= 2:
        score_breakdown["engagement_rate"] = 10
    elif engagement >= 1:
        score_breakdown["engagement_rate"] = 5
    else:
        score_breakdown["engagement_rate"] = 0
    
    # 3. Content Frequency (0-15)
    frequency = lead.get("content_frequency", "unknown")
    frequency_scores = {
        "daily": 15,
        "weekly": 12,
        "biweekly": 8,
        "monthly": 5,
        "sporadic": 2,
        "unknown": 0
    }
    score_breakdown["content_frequency"] = frequency_scores.get(frequency, 0)
    
    # 4. Monetization Signals (0-20)
    monetization = lead.get("monetization_signals", [])
    website_analysis = lead.get("website_analysis") or {}
    
    mon_score = 0
    if monetization:
        mon_score += min(len(monetization) * 4, 12)
    if website_analysis.get("existing_courses"):
        mon_score += 4
    if website_analysis.get("email_capture"):
        mon_score += 4
    score_breakdown["monetization_signals"] = min(mon_score, 20)
    
    # 5. Niche Fit (0-20) - basato su analisi Stefania
    niche_fit = 10  # Default medio
    if website_analysis:
        opportunity = website_analysis.get("opportunity_score", 5)
        niche_fit = opportunity * 2
    score_breakdown["niche_fit"] = min(niche_fit, 20)
    
    # Calcola totale
    score_total = sum(score_breakdown.values())
    
    # Determina target_fit_level basato sullo score
    if score_total >= 80:
        target_fit_level = "altissimo"
    elif score_total >= 65:
        target_fit_level = "alto"
    elif score_total >= 50:
        target_fit_level = "medio"
    else:
        target_fit_level = "basso"
    
    # Aggiorna lead
    await db.discovery_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "score_total": score_total,
            "score_breakdown": score_breakdown,
            "target_fit_level": target_fit_level,
            "status": LeadStatus.SCORED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"[DISCOVERY] Lead {lead_id} scored: {score_total}/100 (fit: {target_fit_level})")
    
    return {
        "success": True,
        "lead_id": lead_id,
        "score_total": score_total,
        "score_breakdown": score_breakdown,
        "target_fit_level": target_fit_level,
        "recommendation": "hot" if score_total >= 70 else "warm" if score_total >= 50 else "cold"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 3: STEFANIA - GENERATE FIRST CONTACT V2
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/generate-outreach/{lead_id}")
async def generate_first_contact_v2(lead_id: str, request: Optional[GenerateOutreachRequest] = None):
    """
    Stefania genera un messaggio di primo contatto personalizzato
    con un "regalo strategico" basato sui dati reali del lead.
    
    Tipi di regalo:
    - content_analysis: Analisi di un loro contenuto specifico
    - tactical_suggestion: Suggerimento tattico per la loro nicchia
    - funnel_audit: Mini-audit del loro funnel/bio
    - mixed: Combinazione (Stefania sceglie il più appropriato)
    """
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    # Determina tipo di regalo
    gift_type = request.gift_type if request and request.gift_type else None
    
    # Se non specificato, Stefania sceglie
    if not gift_type:
        website_analysis = lead.get("website_analysis") or {}
        if website_analysis.get("existing_courses"):
            gift_type = GiftType.FUNNEL_AUDIT
        elif lead.get("posts_count", 0) > 50:
            gift_type = GiftType.CONTENT_ANALYSIS
        else:
            gift_type = GiftType.TACTICAL_SUGGESTION
    
    # Prepara contesto per Stefania
    website_analysis = lead.get("website_analysis") or {}
    context = {
        "nome": lead.get("display_name"),
        "piattaforma": lead.get("source"),
        "username": lead.get("platform_username"),
        "bio": lead.get("bio", ""),
        "followers": lead.get("followers_count", 0),
        "website": lead.get("website_url", ""),
        "niche": lead.get("niche_detected") or website_analysis.get("niche", ""),
        "business_type": website_analysis.get("business_type", ""),
        "monetization": lead.get("monetization_signals", []),
        "pain_points": website_analysis.get("pain_points", []),
        "score": lead.get("score_total", 0)
    }
    
    # Prompt per Stefania
    gift_instructions = {
        GiftType.CONTENT_ANALYSIS: """
TIPO REGALO: Analisi Contenuto
Fai riferimento a un contenuto specifico che potrebbero aver pubblicato (video, post, articolo).
Esempio: "Ho visto il tuo video su [topic], ecco come potresti raddoppiare i lead con un gancio diverso..."
""",
        GiftType.TACTICAL_SUGGESTION: """
TIPO REGALO: Suggerimento Tattico
Dai un consiglio pratico e specifico per la loro nicchia che possono implementare subito.
Esempio: "Nel tuo settore, i coach che convertono di più usano questa struttura di offerta..."
""",
        GiftType.FUNNEL_AUDIT: """
TIPO REGALO: Mini-Audit Funnel
Analizza la loro bio/sito e suggerisci un miglioramento concreto.
Esempio: "Ho notato che nella tua bio manca [elemento]. Aggiungendolo potresti aumentare del 30% le conversioni..."
""",
        GiftType.MIXED: """
TIPO REGALO: Misto
Scegli tu il regalo più appropriato basandoti sui dati. Combina elementi se utile.
"""
    }
    
    prompt = f"""Sei STEFANIA di Evolution PRO. Devi generare un messaggio di PRIMO CONTATTO per un potenziale lead.

DATI DEL LEAD:
- Nome: {context['nome']}
- Piattaforma: {context['piattaforma']}
- Username: @{context['username']}
- Bio: {context['bio']}
- Followers: {context['followers']:,}
- Sito web: {context['website']}
- Nicchia rilevata: {context['niche']}
- Tipo business: {context['business_type']}
- Segnali monetizzazione: {', '.join(context['monetization']) if context['monetization'] else 'Nessuno rilevato'}
- Pain points potenziali: {', '.join(context['pain_points']) if context['pain_points'] else 'Da approfondire'}
- Score qualità: {context['score']}/100

{gift_instructions.get(gift_type, gift_instructions[GiftType.MIXED])}

REGOLE MESSAGGIO:
1. NON sembrare spam o bot. Sii genuino e specifico.
2. Fai riferimento a qualcosa di REALE del lead (nome, contenuto, bio).
3. Il "regalo" deve essere un valore IMMEDIATO, non una promessa vaga.
4. Chiudi con una domanda aperta che invita alla risposta.
5. Massimo 150 parole. Meglio 100.
6. Tono: professionale ma umano. Come scriveresti a un collega interessante.
7. NON menzionare Evolution PRO nel primo messaggio. È troppo presto.

STRUTTURA CONSIGLIATA:
- Gancio personalizzato (1 riga)
- Regalo/Valore (2-3 righe)
- Domanda aperta (1 riga)

Genera il messaggio:"""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="LLM Key non configurata")
        
        llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"stefania_outreach_{lead_id}",
            system_message="Sei STEFANIA, esperta di vendita e copywriting per Evolution PRO."
        )
        
        response = await llm.send_message(UserMessage(text=prompt))
        outreach_message = response if isinstance(response, str) else response.text
        outreach_message = outreach_message.strip()
        
        # Rimuovi eventuali virgolette iniziali/finali
        outreach_message = outreach_message.strip('"\'')
        
        # Salva nel lead
        await db.discovery_leads.update_one(
            {"id": lead_id},
            {"$set": {
                "outreach_message": outreach_message,
                "outreach_gift_type": gift_type.value,
                "outreach_status": OutreachStatus.PENDING.value,
                "status": LeadStatus.MESSAGE_READY.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"[STEFANIA] Messaggio outreach generato per lead {lead_id}")
        
        return {
            "success": True,
            "lead_id": lead_id,
            "gift_type": gift_type.value,
            "outreach_message": outreach_message,
            "word_count": len(outreach_message.split()),
            "status": "pending_approval"
        }
        
    except Exception as e:
        logger.error(f"[STEFANIA] Errore generazione outreach: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione messaggio: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 4: OUTREACH MANAGEMENT (per Dashboard Antonella)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/outreach/approve/{lead_id}")
async def approve_outreach(lead_id: str, request: ApproveOutreachRequest = None):
    """
    Antonella approva il messaggio (con possibile modifica).
    Dopo approvazione, il messaggio è pronto per l'invio.
    """
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    if lead.get("outreach_status") != OutreachStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Messaggio non in stato pending")
    
    # Se Antonella ha modificato il messaggio
    final_message = request.edited_message if request and request.edited_message else lead.get("outreach_message")
    
    await db.discovery_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "outreach_message": final_message,
            "outreach_status": OutreachStatus.APPROVED.value,
            "outreach_approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"[OUTREACH] Messaggio approvato per lead {lead_id}")
    
    return {
        "success": True,
        "lead_id": lead_id,
        "status": "approved",
        "message": final_message,
        "next_step": "Pronto per invio manuale o automatico"
    }


@router.post("/outreach/send/{lead_id}")
async def mark_outreach_sent(lead_id: str):
    """Segna il messaggio come inviato"""
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    await db.discovery_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "outreach_status": OutreachStatus.SENT.value,
            "outreach_sent_at": datetime.now(timezone.utc).isoformat(),
            "status": LeadStatus.MESSAGE_SENT.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "lead_id": lead_id, "status": "sent"}


# ═══════════════════════════════════════════════════════════════════════════════
# AUTO-APPROVE & EMAIL SEQUENCE FOR €67 ANALYSIS SALE
# ═══════════════════════════════════════════════════════════════════════════════

class AutoApproveSettings(BaseModel):
    """Impostazioni per auto-approvazione outreach"""
    min_score: int = 80
    required_fit_level: str = "altissimo"
    enabled: bool = True


@router.get("/settings/auto-approve")
async def get_auto_approve_settings():
    """Recupera le impostazioni correnti di auto-approvazione"""
    settings = await db.admin_settings.find_one({"type": "auto_approve_outreach"})
    if not settings:
        # Default settings
        return {
            "min_score": 80,
            "required_fit_level": "altissimo",
            "enabled": True
        }
    return {
        "min_score": settings.get("min_score", 80),
        "required_fit_level": settings.get("required_fit_level", "altissimo"),
        "enabled": settings.get("enabled", True)
    }


@router.put("/settings/auto-approve")
async def update_auto_approve_settings(settings: AutoApproveSettings):
    """Aggiorna le impostazioni di auto-approvazione"""
    await db.admin_settings.update_one(
        {"type": "auto_approve_outreach"},
        {"$set": {
            "type": "auto_approve_outreach",
            "min_score": settings.min_score,
            "required_fit_level": settings.required_fit_level,
            "enabled": settings.enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True, "settings": settings.dict()}


@router.post("/trigger-auto-approve")
async def trigger_auto_approve():
    """
    Forza l'esecuzione manuale del job di auto-approvazione.
    Utile per testing o per forzare l'elaborazione immediata.
    """
    try:
        from celery_app import celery_app
        
        # Trigger the task immediately
        task = celery_app.send_task(
            'celery_tasks.process_auto_approve_leads',
            queue='analisi_automation'
        )
        
        return {
            "success": True,
            "message": "Auto-approve job triggered",
            "task_id": task.id
        }
    except Exception as e:
        logger.error(f"[DISCOVERY] Failed to trigger auto-approve: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger: {e}")


async def check_auto_approve(lead: dict) -> bool:
    """Verifica se un lead deve essere auto-approvato per outreach"""
    settings = await db.admin_settings.find_one({"type": "auto_approve_outreach"})
    if not settings or not settings.get("enabled", True):
        return False
    
    min_score = settings.get("min_score", 80)
    required_fit = settings.get("required_fit_level", "altissimo")
    
    lead_score = lead.get("score_total", 0)
    lead_fit = lead.get("target_fit_level", "basso")
    
    return lead_score >= min_score and lead_fit == required_fit


@router.post("/lead/{lead_id}/start-email-sequence")
async def start_email_sequence(lead_id: str, background_tasks: BackgroundTasks):
    """
    Avvia la sequenza email di vendita analisi €67 per un lead.
    
    Sequenza:
    - Email 1 (D+0): Presentazione + problema che risolve Evolution PRO
    - Email 2 (D+2): Caso studio / risultato concreto
    - Email 3 (D+4): Presentazione analisi €67 con CTA checkout
    - Email 4 (D+7): Reminder con urgenza
    """
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    email = lead.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Lead non ha email")
    
    nome = lead.get("display_name", "").split()[0] if lead.get("display_name") else "Ciao"
    
    # Check if sequence already started
    if lead.get("email_sequence_started"):
        return {
            "success": False,
            "message": "Sequenza email già avviata per questo lead",
            "started_at": lead.get("email_sequence_started_at")
        }
    
    # Mark sequence as started
    await db.discovery_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "email_sequence_started": True,
            "email_sequence_started_at": datetime.now(timezone.utc).isoformat(),
            "email_sequence_step": 1,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Schedule Celery tasks for email sequence
    try:
        from celery_app import celery_app
        
        # Get Stripe checkout URL for €67 analysis
        stripe_checkout_url = os.environ.get('STRIPE_CHECKOUT_URL_ANALISI', 'https://buy.stripe.com/test_xxx')
        
        # Email 1 - Immediate
        celery_app.send_task(
            'celery_tasks.send_lead_sequence_email',
            args=[lead_id, 1, email, nome, stripe_checkout_url],
            queue='analisi_automation'
        )
        
        # Email 2 - Day +2 (172800 seconds)
        celery_app.send_task(
            'celery_tasks.send_lead_sequence_email',
            args=[lead_id, 2, email, nome, stripe_checkout_url],
            countdown=172800,
            queue='analisi_automation'
        )
        
        # Email 3 - Day +4 (345600 seconds)
        celery_app.send_task(
            'celery_tasks.send_lead_sequence_email',
            args=[lead_id, 3, email, nome, stripe_checkout_url],
            countdown=345600,
            queue='analisi_automation'
        )
        
        # Email 4 - Day +7 (604800 seconds)
        celery_app.send_task(
            'celery_tasks.send_lead_sequence_email',
            args=[lead_id, 4, email, nome, stripe_checkout_url],
            countdown=604800,
            queue='analisi_automation'
        )
        
        logger.info(f"[EMAIL_SEQUENCE] Scheduled 4 emails for lead {lead_id}")
        
    except Exception as e:
        logger.error(f"[EMAIL_SEQUENCE] Failed to schedule: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    
    return {
        "success": True,
        "lead_id": lead_id,
        "email": email,
        "sequence_scheduled": [
            {"step": 1, "send_at": "immediate"},
            {"step": 2, "send_at": "+2 days"},
            {"step": 3, "send_at": "+4 days"},
            {"step": 4, "send_at": "+7 days"}
        ]
    }


@router.post("/lead/{lead_id}/stop-email-sequence")
async def stop_email_sequence(lead_id: str):
    """Ferma la sequenza email per un lead (es. dopo acquisto o unsubscribe)"""
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    await db.discovery_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "email_sequence_stopped": True,
            "email_sequence_stopped_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"[EMAIL_SEQUENCE] Stopped for lead {lead_id}")
    return {"success": True, "lead_id": lead_id, "status": "sequence_stopped"}


@router.post("/outreach/response/{lead_id}")
async def mark_response(lead_id: str, request: MarkResponseRequest):
    """
    Registra la risposta del lead.
    Se positiva, attiva integrazione Systeme.io.
    """
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    new_status = LeadStatus.RESPONDED_POSITIVE if request.response_type == "positive" else LeadStatus.RESPONDED_NEGATIVE
    
    update_data = {
        "status": new_status.value,
        "response_type": request.response_type,
        "response_notes": request.response_notes,
        "response_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.discovery_leads.update_one({"id": lead_id}, {"$set": update_data})
    
    # Se risposta positiva, inietta in Systeme.io
    systeme_result = None
    if request.response_type == "positive":
        systeme_result = await inject_to_systeme(lead_id)
    
    return {
        "success": True,
        "lead_id": lead_id,
        "status": new_status.value,
        "systeme_injection": systeme_result
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 5: INTEGRAZIONE SYSTEME.IO
# ═══════════════════════════════════════════════════════════════════════════════

async def inject_to_systeme(lead_id: str) -> dict:
    """
    Inietta il lead in Systeme.io con tag PROACTIVE_DISCOVERY.
    Attiva il funnel di risveglio.
    """
    lead = await db.discovery_leads.find_one({"id": lead_id})
    if not lead:
        return {"success": False, "error": "Lead non trovato"}
    
    systeme_api_key = os.environ.get('SYSTEME_API_KEY')
    if not systeme_api_key:
        logger.warning("[SYSTEME] API key non configurata")
        return {"success": False, "error": "Systeme.io non configurato"}
    
    try:
        # Prepara dati contatto
        email = lead.get("email")
        if not email:
            # Usa email placeholder se non disponibile
            username = lead.get("platform_username", "unknown")
            source = lead.get("source", "unknown")
            email = f"{username}_{source}@discovery.evolutionpro.it"
        
        name_parts = lead.get("display_name", "Lead Discovery").split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Crea/aggiorna contatto
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Check se esiste
            check_response = await client.get(
                f"https://api.systeme.io/api/contacts?email={email}",
                headers={"X-API-Key": systeme_api_key}
            )
            contacts = check_response.json().get("items", [])
            
            if contacts:
                contact_id = contacts[0]["id"]
            else:
                # Crea nuovo contatto
                create_response = await client.post(
                    "https://api.systeme.io/api/contacts",
                    headers={"X-API-Key": systeme_api_key},
                    json={
                        "email": email,
                        "firstName": first_name,
                        "lastName": last_name
                    }
                )
                contact_id = create_response.json().get("id")
            
            if not contact_id:
                return {"success": False, "error": "Impossibile creare/trovare contatto"}
            
            # Aggiungi tag PROACTIVE_DISCOVERY
            tag_response = await client.post(
                f"https://api.systeme.io/api/contacts/{contact_id}/tags",
                headers={"X-API-Key": systeme_api_key},
                json={"name": "PROACTIVE_DISCOVERY"}
            )
            
            # Aggiungi tag con source
            source_tag = f"discovery_{lead.get('source', 'unknown')}"
            await client.post(
                f"https://api.systeme.io/api/contacts/{contact_id}/tags",
                headers={"X-API-Key": systeme_api_key},
                json={"name": source_tag}
            )
        
        # Aggiorna lead
        await db.discovery_leads.update_one(
            {"id": lead_id},
            {"$set": {
                "systeme_contact_id": str(contact_id),
                "systeme_injected_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"[SYSTEME] Lead {lead_id} iniettato con tag PROACTIVE_DISCOVERY")
        
        return {
            "success": True,
            "contact_id": contact_id,
            "tags_added": ["PROACTIVE_DISCOVERY", source_tag]
        }
        
    except Exception as e:
        logger.error(f"[SYSTEME] Errore iniezione lead {lead_id}: {e}")
        return {"success": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 1B: WORKER PULIZIA DUPLICATI
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/worker/cleanup-duplicates")
async def cleanup_duplicates():
    """
    Worker che pulisce i duplicati ogni 24 ore.
    Logica:
    1. Raggruppa per email (se presente)
    2. Raggruppa per username + platform
    3. Mantiene il lead con score più alto
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non disponibile")
    
    stats = {
        "email_duplicates_removed": 0,
        "username_duplicates_removed": 0,
        "started_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        # 1. Trova duplicati per email
        pipeline_email = [
            {"$match": {"email": {"$ne": None, "$exists": True}}},
            {"$group": {
                "_id": {"$toLower": "$email"},
                "count": {"$sum": 1},
                "leads": {"$push": {"id": "$id", "score": "$score_total"}}
            }},
            {"$match": {"count": {"$gt": 1}}}
        ]
        
        email_duplicates = await db.discovery_leads.aggregate(pipeline_email).to_list(1000)
        
        for dup_group in email_duplicates:
            leads = sorted(dup_group["leads"], key=lambda x: x.get("score", 0), reverse=True)
            # Mantieni il primo (score più alto), elimina gli altri
            for lead in leads[1:]:
                await db.discovery_leads.delete_one({"id": lead["id"]})
                stats["email_duplicates_removed"] += 1
        
        # 2. Trova duplicati per username + platform
        pipeline_username = [
            {"$group": {
                "_id": {
                    "username": {"$toLower": "$platform_username"},
                    "source": "$source"
                },
                "count": {"$sum": 1},
                "leads": {"$push": {"id": "$id", "score": "$score_total"}}
            }},
            {"$match": {"count": {"$gt": 1}}}
        ]
        
        username_duplicates = await db.discovery_leads.aggregate(pipeline_username).to_list(1000)
        
        for dup_group in username_duplicates:
            leads = sorted(dup_group["leads"], key=lambda x: x.get("score", 0), reverse=True)
            for lead in leads[1:]:
                await db.discovery_leads.delete_one({"id": lead["id"]})
                stats["username_duplicates_removed"] += 1
        
        stats["completed_at"] = datetime.now(timezone.utc).isoformat()
        stats["total_removed"] = stats["email_duplicates_removed"] + stats["username_duplicates_removed"]
        
        # Log
        await db.discovery_cleanup_logs.insert_one(stats)
        
        logger.info(f"[CLEANUP] Pulizia duplicati completata: {stats['total_removed']} rimossi")
        
        return stats
        
    except Exception as e:
        logger.error(f"[CLEANUP] Errore pulizia duplicati: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup/ai-validation")
async def ai_cleanup_validation():
    """
    [OLLAMA] Usa Llama 3 locale per validazione AI avanzata dei lead.
    Identifica duplicati semantici, lead sospetti, e normalizza dati.
    Zero costi, token infiniti.
    """
    from ollama_service import clean_and_deduplicate_leads, ollama_service
    
    # Verifica disponibilità Ollama
    ollama_available = await ollama_service.is_available()
    
    if not ollama_available:
        return {
            "success": False,
            "error": "Ollama non disponibile",
            "fallback": "Usa /cleanup/duplicates per pulizia standard MongoDB"
        }
    
    # Carica lead recenti per analisi
    leads = await db.discovery_leads.find(
        {"status": {"$ne": LeadStatus.REJECTED.value}},
        {"_id": 0, "website_html": 0}
    ).sort("discovered_at", -1).limit(50).to_list(50)
    
    if not leads:
        return {"success": True, "message": "Nessun lead da analizzare"}
    
    logger.info(f"[CLEANUP AI] Analisi {len(leads)} lead con Ollama/Llama3")
    
    # Analisi con Ollama
    analysis = await clean_and_deduplicate_leads(leads)
    
    if analysis.get("error"):
        return {
            "success": False,
            "error": analysis["error"],
            "raw": analysis.get("raw")
        }
    
    stats = {
        "leads_analyzed": len(leads),
        "duplicates_found": analysis.get("duplicates_found", 0),
        "invalid_found": analysis.get("invalid_found", 0),
        "valid_count": analysis.get("valid_count", 0),
        "llm_used": "ollama:llama3:8b",
        "analysis_details": analysis.get("analysis"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Salva log
    await db.discovery_cleanup_logs.insert_one({**stats, "type": "ai_validation"})
    
    logger.info(f"[CLEANUP AI] Completato: {stats['duplicates_found']} duplicati, {stats['invalid_found']} invalidi")
    
    return {
        "success": True,
        **stats
    }


# ═══════════════════════════════════════════════════════════════════════════════
# STATS PER DASHBOARD ANTONELLA (Task 4)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stats/today")
async def get_today_stats():
    """
    Statistiche per la sezione "Cassa Lead Proattiva" di Antonella.
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Lead scoperti oggi
    discovered_today = await db.discovery_leads.count_documents({
        "discovered_at": {"$gte": today_start}
    })
    
    # Messaggi pronti per invio
    messages_ready = await db.discovery_leads.count_documents({
        "outreach_status": OutreachStatus.PENDING.value
    })
    
    # Messaggi approvati (da inviare)
    messages_approved = await db.discovery_leads.count_documents({
        "outreach_status": OutreachStatus.APPROVED.value
    })
    
    # Messaggi inviati oggi
    messages_sent_today = await db.discovery_leads.count_documents({
        "outreach_sent_at": {"$gte": today_start}
    })
    
    # Risposte positive oggi
    positive_responses_today = await db.discovery_leads.count_documents({
        "response_at": {"$gte": today_start},
        "response_type": "positive"
    })
    
    # Lead hot (score >= 70)
    hot_leads = await db.discovery_leads.count_documents({
        "score_total": {"$gte": 70}
    })
    
    # Totali
    total_leads = await db.discovery_leads.count_documents({})
    total_converted = await db.discovery_leads.count_documents({
        "status": LeadStatus.CONVERTED.value
    })
    
    return {
        "today": {
            "discovered": discovered_today,
            "messages_sent": messages_sent_today,
            "positive_responses": positive_responses_today
        },
        "pending_actions": {
            "messages_to_review": messages_ready,
            "messages_to_send": messages_approved
        },
        "pipeline": {
            "hot_leads": hot_leads,
            "total_leads": total_leads,
            "total_converted": total_converted
        },
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/stats/weekly")
async def get_weekly_stats():
    """Statistiche settimanali per report"""
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    # Pipeline per stats per giorno
    pipeline = [
        {"$match": {"discovered_at": {"$gte": week_ago}}},
        {"$group": {
            "_id": {"$substr": ["$discovered_at", 0, 10]},
            "count": {"$sum": 1},
            "avg_score": {"$avg": "$score_total"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_stats = await db.discovery_leads.aggregate(pipeline).to_list(7)
    
    # Conversion rate
    total_sent = await db.discovery_leads.count_documents({
        "outreach_sent_at": {"$gte": week_ago}
    })
    total_positive = await db.discovery_leads.count_documents({
        "response_at": {"$gte": week_ago},
        "response_type": "positive"
    })
    
    conversion_rate = (total_positive / total_sent * 100) if total_sent > 0 else 0
    
    return {
        "daily_discovery": daily_stats,
        "weekly_totals": {
            "discovered": sum(d["count"] for d in daily_stats),
            "messages_sent": total_sent,
            "positive_responses": total_positive,
            "conversion_rate": round(conversion_rate, 1)
        }
    }
