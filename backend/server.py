from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import httpx

# Import custom modules
from video_processor import video_processor, VideoProcessor
from file_storage import file_storage, FileStorageManager
from youtube_uploader import youtube_uploader, YouTubeUploader
from tts_generator import tts_generator, TTSGenerator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="Evolution PRO OS", version="3.0")
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
    role: str
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatRequest(BaseModel):
    session_id: str
    message: str
    partner_name: str
    partner_niche: str
    partner_phase: str
    modules_done: int

class VideoJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    partner_name: str
    input_file: str
    status: str = "queued"  # queued, processing, completed, approved, uploaded, failed
    output_file: Optional[str] = None
    processing_result: Optional[dict] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    youtube_url: Optional[str] = None
    youtube_video_id: Optional[str] = None

class VideoProcessRequest(BaseModel):
    partner_id: str
    partner_name: str
    input_file: str
    auto_trim: bool = True
    remove_fillers: bool = True
    apply_speed: bool = True
    normalize: bool = True
    add_branding: bool = True

class YouTubeUploadRequest(BaseModel):
    job_id: str
    title: str
    lesson_title: str
    module_title: str
    privacy_status: str = "unlisted"

class SystemeTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str  # lead_gen, masterclass, vendita, webinar, altri
    share_link: str
    description: str = ""
    brand_variables: List[str] = Field(default_factory=lambda: ["Nome_Partner", "Colore_Brand"])
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BrandKit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    partner_id: str
    nome_partner: str
    colore_brand: str = "#F5C518"
    logo_url: Optional[str] = None
    email_partner: Optional[str] = None
    telefono: Optional[str] = None
    sito_web: Optional[str] = None
    social_instagram: Optional[str] = None
    social_linkedin: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    voice: str = "onyx"
    type: str = "intro"  # intro or outro
    partner_name: str

# =============================================================================
# MASTERCLASS & STEFANIA MODELS
# =============================================================================

class MasterclassScript(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    partner_name: str
    status: str = "draft"  # draft, in_review, approved, needs_revision
    blocks: Dict[str, str] = Field(default_factory=lambda: {
        "hook": "",
        "grande_promessa": "",
        "metodo": "",
        "case_history": "",
        "offerta": "",
        "cta": ""
    })
    stefania_feedback: Optional[str] = None
    last_review_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MasterclassScriptUpdate(BaseModel):
    blocks: Dict[str, str]

class PartnerBrandKit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    partner_id: str
    nome_partner: str
    brand_color: str = "#F5C518"
    brand_color_secondary: str = "#1a2332"
    logo_url: Optional[str] = None
    tagline: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    social_instagram: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_youtube: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PartnerBrandKitUpdate(BaseModel):
    brand_color: Optional[str] = None
    brand_color_secondary: Optional[str] = None
    logo_url: Optional[str] = None
    tagline: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    social_instagram: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_youtube: Optional[str] = None

class StefaniaChatRequest(BaseModel):
    session_id: str
    message: str
    partner_id: str
    partner_name: str
    partner_niche: str
    current_block: Optional[str] = None  # hook, grande_promessa, etc.
    script_context: Optional[Dict[str, str]] = None

class ScriptReviewRequest(BaseModel):
    partner_id: str
    partner_name: str
    script_blocks: Dict[str, str]

class SuccessCase(BaseModel):
    """Model for Evolution PRO Success Cases - Master Input"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_name: str
    niche: str
    result: str  # e.g., "€15.000 in 45 giorni"
    hook_example: Optional[str] = None
    grande_promessa_example: Optional[str] = None
    metodo_name: Optional[str] = None
    testimonial_quote: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DraftGenerationRequest(BaseModel):
    """Request to generate a script draft via STEFANIA"""
    partner_id: str
    partner_name: str
    partner_niche: str
    positioning_data: Optional[Dict[str, str]] = None  # From wizard posizionamento

class AdminScriptEdit(BaseModel):
    """Admin edit for script before partner approval"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    script_id: str
    partner_id: str
    admin_user: str  # "Claudio" or "Antonella"
    original_blocks: Dict[str, str]
    edited_blocks: Dict[str, str]
    admin_notes: Optional[str] = None
    status: str = "pending_partner_approval"  # pending_partner_approval, approved_by_partner, revision_requested
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdminEditRequest(BaseModel):
    """Request from Admin to edit script"""
    blocks: Dict[str, str]
    admin_user: str
    admin_notes: Optional[str] = None

# =============================================================================
# STEFANIA WAR MODE - ADS & TRAFFIC MODELS
# =============================================================================

class AdsCampaign(BaseModel):
    """Model for tracking ad campaigns"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    partner_name: str
    platform: str  # meta, linkedin, google, tiktok
    campaign_name: str
    status: str = "active"  # active, paused, stopped
    hooks: List[str] = Field(default_factory=list)  # Generated hooks
    hook_gallery: Optional[Dict[str, str]] = None  # {pain, secret, result} for Meta
    linkedin_content: Optional[Dict[str, Any]] = None  # {thought_leadership, abm_targeting, lead_form}
    budget_daily: float = 0
    spend_total: float = 0
    leads: int = 0
    qualified_leads: int = 0  # For LinkedIn lead quality tracking
    conversions: int = 0
    revenue: float = 0
    cpl: float = 0  # Cost Per Lead
    cpl_qualified: float = 0  # Cost per Qualified Lead
    roas: float = 0  # Return on Ad Spend
    ltv_avg: float = 0  # Average Lifetime Value of leads from this platform
    cpl_max_threshold: float = 15.0  # Default €15 max CPL
    targeting_type: str = "broad"  # broad (Meta), abm (LinkedIn), custom
    utm_params: Dict[str, str] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdsPerformanceMetrics(BaseModel):
    """Performance metrics from MARTA"""
    model_config = ConfigDict(extra="ignore")
    partner_id: str
    date: str
    impressions: int = 0
    clicks: int = 0
    ctr: float = 0  # Click Through Rate
    spend: float = 0
    leads: int = 0
    qualified_leads: int = 0
    cpl: float = 0
    conversions: int = 0
    revenue: float = 0
    roas: float = 0
    ltv_avg: float = 0

class AdHookRequest(BaseModel):
    """Request to generate ad hooks from Copy Core"""
    partner_id: str
    partner_name: str
    partner_niche: str
    platform: str = "meta"  # meta, linkedin
    hook_type: Optional[str] = None  # pain, secret, result (for Hook Gallery)

class HookGalleryRequest(BaseModel):
    """Request to generate 3-variant Hook Gallery for Meta"""
    partner_id: str
    partner_name: str
    partner_niche: str
    masterclass_topic: Optional[str] = None

class LinkedInContentRequest(BaseModel):
    """Request to generate LinkedIn-specific content"""
    partner_id: str
    partner_name: str
    partner_niche: str
    content_type: str = "thought_leadership"  # thought_leadership, abm_ad, lead_gen_form
    target_segment: Optional[str] = None  # e.g., "agency_owners", "senior_consultants"

class CrossPlatformAnalysis(BaseModel):
    """Model for cross-platform performance comparison"""
    model_config = ConfigDict(extra="ignore")
    partner_id: str
    meta_data: Optional[Dict] = None
    linkedin_data: Optional[Dict] = None
    recommended_platform: str = "meta"
    pivot_suggestion: Optional[str] = None
    ltv_comparison: Optional[Dict] = None

class UTMGeneratorRequest(BaseModel):
    """Request to generate UTM tracked links"""
    partner_id: str
    partner_name: str
    destination_url: str
    campaign_name: str
    medium: str = "paid"  # paid, organic, email
    source: str = "meta"  # meta, linkedin, google, tiktok, email
    content: Optional[str] = None  # Ad variation identifier

class PerformanceAlert(BaseModel):
    """Alert for low performance campaigns"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    campaign_id: str
    alert_type: str  # cpl_exceeded, low_roas, budget_depleted
    severity: str = "warning"  # warning, critical
    current_value: float
    threshold_value: float
    message: str
    suggested_action: str
    resolved: bool = False

# =============================================================================
# ATLAS MODULE - POST-SALE & LTV MODELS
# =============================================================================

class AcademyStudent(BaseModel):
    """Model for Academy student tracking"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    email: str
    name: str
    enrolled_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "active"  # active, completed, inactive, churned
    progress_percent: float = 0
    completed_modules: List[str] = Field(default_factory=list)
    unlocked_bonuses: List[str] = Field(default_factory=list)
    gamification_points: int = 0
    last_activity: Optional[str] = None
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    utm_source: Optional[str] = None

class BonusContent(BaseModel):
    """Dynamic bonus content that can be unlocked"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    title: str
    description: str
    content_type: str  # video, pdf, template, webinar, coaching
    unlock_condition: str  # progress_50, all_modules, referral_1, quiz_perfect, streak_7
    unlock_threshold: int = 0  # For numeric conditions
    points_value: int = 100
    is_active: bool = True

class StudentFeedback(BaseModel):
    """Student feedback/comments for Copy Bridge analysis"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    student_id: str
    module_id: Optional[str] = None
    feedback_type: str  # question, comment, testimonial, complaint
    content: str
    sentiment: Optional[str] = None  # positive, neutral, negative
    analyzed: bool = False
    copy_angle_extracted: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CopyAngleSuggestion(BaseModel):
    """STEFANIA's copy angle suggestions from feedback analysis"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    angle_type: str  # pain_point, success_story, objection, desire
    headline: str
    description: str
    source_feedbacks: List[str] = Field(default_factory=list)  # List of feedback IDs
    relevance_score: float = 0.0
    used_in_campaign: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReferralRecord(BaseModel):
    """Track referrals for LTV calculation"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    referrer_student_id: str
    referred_email: str
    referral_code: str
    status: str = "pending"  # pending, converted, expired
    conversion_value: float = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# =============================================================================
# ANDREA - VIDEO PRODUCTION MODELS
# =============================================================================

class AndreaChatRequest(BaseModel):
    session_id: str
    message: str
    partner_id: str
    partner_name: str
    partner_niche: str
    current_block: Optional[str] = None
    recording_status: Optional[str] = None  # setup, recording, review

class VideoBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    block_type: str  # hook, grande_promessa, metodo, case_history, offerta, cta
    block_label: str
    script_content: str
    status: str = "pending"  # pending, recording, uploaded, approved, needs_revision
    video_file: Optional[str] = None
    duration: Optional[float] = None
    feedback: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PreFlightCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    partner_id: str
    checklist: Dict[str, bool] = Field(default_factory=lambda: {
        "sfondo_ordinato": False,
        "luce_frontale": False,
        "microfono_posizionato": False,
        "inquadratura_corretta": False,
        "silenzio_ambiente": False,
        "script_pronto": False
    })
    test_video_uploaded: bool = False
    test_video_approved: bool = False
    feedback: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VideoAssemblyRequest(BaseModel):
    partner_id: str
    include_intro: bool = True
    include_outro: bool = True
    upload_to_youtube: bool = False

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # modulo, escalation, video, file, script_review
    icon: str
    title: str
    body: str
    time: str
    partner: str
    read: bool = False
    action: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StoredFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_id: str
    original_name: str
    stored_name: str
    file_type: str  # video, document
    partner_id: str
    status: str  # raw, processed, approved, pending, verified
    internal_url: str
    size: int
    uploaded_at: str
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None

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
# STEFANIA - MASTER INPUT: SUCCESSI EVOLUTION PRO
# =============================================================================

EVOLUTION_PRO_SUCCESS_CASES = [
    {
        "id": "success-1",
        "partner_name": "Marco Ferretti",
        "niche": "Business Coach",
        "result": "€28.000 in 60 giorni",
        "hook_example": "Il 90% dei business coach fallisce perché insegna teoria. Io ho scoperto che il vero problema è la mancanza di un sistema PRATICO.",
        "grande_promessa_example": "Trasforma la tua consulenza in un videocorso che genera €10.000/mese in automatico, anche mentre dormi.",
        "metodo_name": "Sistema BCA (Business Coach Accelerator)",
        "testimonial_quote": "In 60 giorni ho generato più di quanto facevo in 6 mesi di consulenze one-to-one."
    },
    {
        "id": "success-2", 
        "partner_name": "Giulia Rossi",
        "niche": "Life Coach",
        "result": "€15.000 in 45 giorni",
        "hook_example": "Tutti ti dicono di 'credere in te stesso'. Ma nessuno ti spiega COME farlo concretamente in 30 giorni.",
        "grande_promessa_example": "Il mio metodo ti permette di eliminare l'auto-sabotaggio e raggiungere i tuoi obiettivi in 30 giorni, garantito.",
        "metodo_name": "Metodo RIT (Riprogrammazione Identità Trasformativa)",
        "testimonial_quote": "Ho finalmente capito perché fallivo sempre. Il metodo RIT ha cambiato tutto."
    },
    {
        "id": "success-3",
        "partner_name": "Luca Marini", 
        "niche": "Formatore HR",
        "result": "€32.000 in 90 giorni",
        "hook_example": "Le aziende spendono migliaia in formazione HR che non funziona. Il problema? Formano le persone sbagliate nel modo sbagliato.",
        "grande_promessa_example": "Riduci il turnover del 40% in 90 giorni con il mio sistema di selezione e onboarding predittivo.",
        "metodo_name": "Framework PEO (Predict, Engage, Optimize)",
        "testimonial_quote": "Abbiamo ridotto il turnover dal 35% al 12% in tre mesi. ROI incredibile."
    },
    {
        "id": "success-4",
        "partner_name": "Sara Lombardi",
        "niche": "Psicologa",
        "result": "€12.000 in 30 giorni",
        "hook_example": "La terapia tradizionale richiede anni. Ma cosa succederebbe se potessi risolvere l'ansia in sole 6 sessioni?",
        "grande_promessa_example": "Elimina l'ansia cronica in 6 settimane con il protocollo scientificamente validato che ha già aiutato 500+ persone.",
        "metodo_name": "Protocollo RESET",
        "testimonial_quote": "Dopo anni di terapia senza risultati, in 6 settimane ho finalmente risolto la mia ansia."
    }
]

# =============================================================================
# STEFANIA - LE 10 REGOLE D'ORO DEL COPY CORE
# Ispirate ai maestri: Eugene Schwartz, Todd Brown, Gary Halbert
# =============================================================================

GOLDEN_RULES_COPY_CORE = [
    {
        "num": 1,
        "title": "Vendi la Nuova Identità, non il Prodotto",
        "master": "Eugene Schwartz",
        "description": "Non vendi un corso, vendi il Punto B: la persona che il lead diventerà dopo aver seguito il tuo metodo.",
        "example": "Non 'Impara il marketing' → 'Diventa il consulente che le aziende chiamano quando hanno bisogno di risultati veri'"
    },
    {
        "num": 2,
        "title": "Uccidi gli Aggettivi Deboli",
        "master": "Gary Halbert",
        "description": "Niente 'fantastico', 'innovativo', 'unico'. Solo fatti, numeri e prove concrete.",
        "example": "Non 'Risultati fantastici' → '€4.700 in 22 giorni con 3 clienti'"
    },
    {
        "num": 3,
        "title": "La Regola dell'Uno",
        "master": "Eugene Schwartz",
        "description": "Un solo grande problema, una sola grande idea, una sola azione richiesta. La confusione uccide le conversioni.",
        "example": "Tutta la Masterclass ruota attorno a UN problema centrale e UNA soluzione"
    },
    {
        "num": 4,
        "title": "Usa il 'Perché' Sempre",
        "master": "Robert Cialdini",
        "description": "Ogni affermazione deve essere seguita da una spiegazione logica. Il cervello accetta più facilmente quando c'è un 'perché'.",
        "example": "'Questo funziona PERCHÉ attiva il meccanismo di...' non solo 'Questo funziona'"
    },
    {
        "num": 5,
        "title": "Entra nel Dialogo Interno del Cliente",
        "master": "Eugene Schwartz",
        "description": "Rispondi ai dubbi e alle obiezioni PRIMA che vengano formulati. Se il lead pensa 'mi legge nel pensiero', la vendita è fatta.",
        "example": "'So cosa stai pensando: e se non funziona per me? Ecco perché...'"
    },
    {
        "num": 6,
        "title": "Crea un Nemico Comune",
        "master": "Gary Halbert",
        "description": "Dai la colpa del fallimento del lead a un fattore ESTERNO: il sistema, i vecchi guru, la tecnologia obsoleta. Mai al lead stesso.",
        "example": "'Non è colpa tua se hai fallito. È colpa del metodo sbagliato che ti hanno insegnato'"
    },
    {
        "num": 7,
        "title": "Sii Iper-Specifico",
        "master": "Claude Hopkins",
        "description": "La specificità crea credibilità. I numeri dispari e precisi battono sempre i numeri tondi.",
        "example": "'Perdi 4.7kg in 22 giorni' batte SEMPRE 'Perdi peso velocemente'"
    },
    {
        "num": 8,
        "title": "Bullet Points 'Fascinations'",
        "master": "Gary Bencivenga",
        "description": "Elenchi puntati che promettono un segreto senza svelarlo del tutto. Creano curiosità irresistibile.",
        "example": "'Il trucco controintuitivo che i coach da €10k/mese usano (e che nessuno ti dirà mai)'"
    },
    {
        "num": 9,
        "title": "L'Offerta deve essere un 'Affare Stupido' da Rifiutare",
        "master": "Dan Kennedy",
        "description": "Il valore percepito deve essere 10X il prezzo. Stack visivo dei bonus che valgono più del corso principale.",
        "example": "Valore totale: €4.997 → Oggi solo €497 + 5 Bonus (valore €2.000)"
    },
    {
        "num": 10,
        "title": "Il Meccanismo Unico (Big Idea)",
        "master": "Todd Brown",
        "description": "Isola un 'pezzo' del metodo del partner e battezzalo con un nome proprietario. Questo rende la soluzione logicamente superiore a qualsiasi altra.",
        "example": "'Il Sistema XYZ' o 'Il Protocollo ABC' - deve avere un NOME che nessun altro può copiare"
    }
]

# Principi cardine del Copy Core (i 3 Maestri)
COPY_CORE_PRINCIPLES = {
    "schwartz": {
        "name": "Eugene Schwartz - L'Ossessione per il Problema",
        "principle": "Prima di scrivere i benefici, descrivi il dolore del lead meglio di quanto il lead sappia fare. Se il lead pensa 'Questa persona mi legge nel pensiero', la vendita è già fatta."
    },
    "brown": {
        "name": "Todd Brown - Il Meccanismo Unico", 
        "principle": "Non basta dire che il partner è bravo. Devi isolare un 'pezzo' del metodo e battezzarlo con un nome proprietario. Questo rende la soluzione logicamente superiore a qualsiasi altra."
    },
    "halbert": {
        "name": "Gary Halbert - Il Ritmo del Desiderio",
        "principle": "Usa paragrafi brevi, domande retoriche e linguaggio parlato. Il copy deve scorrere come una conversazione al bar, non come un manuale tecnico."
    }
}

# Initial GAIA Systeme.io Templates
INITIAL_GAIA_TEMPLATES = [
    {
        "id": "masterclass-transformation",
        "name": "Masterclass Transformation Template",
        "category": "masterclass",
        "share_link": "https://systeme.io/share/masterclass-transformation",
        "description": "Template completo per Masterclass Trasformativa: Opt-in page, Watch page, sequenza email post-visione. Include tutti i 6 blocchi strategici pre-configurati.",
        "brand_variables": ["Brand_Color", "Logo_URL", "Nome_Partner", "Tagline", "Hook_Text", "Grande_Promessa", "Metodo_Nome", "CTA_Button"],
        "includes": ["opt_in_page", "watch_page", "email_sequence", "thank_you_page"],
        "created_at": "2026-02-11T00:00:00Z"
    },
    {
        "id": "lead-gen-basic",
        "name": "Lead Gen — Freebie Download",
        "category": "lead_gen",
        "share_link": "https://systeme.io/share/lead-gen-basic",
        "description": "Funnel semplice per acquisire lead con un freebie scaricabile. Include landing page e sequenza email di nurturing.",
        "brand_variables": ["Brand_Color", "Logo_URL", "Nome_Partner", "Freebie_Name"],
        "includes": ["landing_page", "thank_you_page", "email_sequence"],
        "created_at": "2026-02-11T00:00:00Z"
    },
    {
        "id": "webinar-evergreen",
        "name": "Webinar Evergreen Funnel",
        "category": "webinar",
        "share_link": "https://systeme.io/share/webinar-evergreen",
        "description": "Funnel per webinar evergreen con replay automatico. Include registrazione, reminder, replay page e offerta.",
        "brand_variables": ["Brand_Color", "Logo_URL", "Nome_Partner", "Webinar_Title", "Webinar_Date"],
        "includes": ["registration_page", "thank_you_page", "reminder_emails", "replay_page", "offer_page"],
        "created_at": "2026-02-11T00:00:00Z"
    },
    {
        "id": "sales-page-pro",
        "name": "Sales Page PRO — Long Form",
        "category": "vendita",
        "share_link": "https://systeme.io/share/sales-page-pro",
        "description": "Sales page lunga e persuasiva con tutti gli elementi: hook, storia, benefici, testimonial, FAQ, garanzia, CTA multiple.",
        "brand_variables": ["Brand_Color", "Logo_URL", "Nome_Partner", "Product_Name", "Price", "Testimonials"],
        "includes": ["sales_page", "checkout_page", "upsell_page", "thank_you_page"],
        "created_at": "2026-02-11T00:00:00Z"
    }
]

# Initial Notifications for demo
INITIAL_NOTIFICATIONS = [
    {"id": "n1", "type": "modulo", "icon": "✅", "title": "Modulo Completato", "body": "Marco Ferretti ha completato M4 – Editing & Branding", "time": "12 min fa", "partner": "Marco Ferretti", "read": False, "action": "partner"},
    {"id": "n2", "type": "escalation", "icon": "🚨", "title": "Escalation VALENTINA", "body": "Sara Lombardi non risponde da 72h – richiede intervento Antonella", "time": "2h fa", "partner": "Sara Lombardi", "read": False, "action": "alert"},
    {"id": "n3", "type": "video", "icon": "🎬", "title": "Video Pronto", "body": "ANDREA ha completato editing M3L2 per Luca Marini", "time": "3h fa", "partner": "Luca Marini", "read": True, "action": "andrea"},
    {"id": "n4", "type": "file", "icon": "📁", "title": "Nuovo File Caricato", "body": "Antonio Bianchi ha caricato Scheda Posizionamento.pdf", "time": "5h fa", "partner": "Antonio Bianchi", "read": True, "action": "partner"},
]

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
    
    # Seed GAIA templates
    if await db.systeme_templates.count_documents({}) == 0:
        await db.systeme_templates.insert_many(INITIAL_GAIA_TEMPLATES)
        logging.info("Seeded GAIA templates collection")
    
    # Seed notifications
    if await db.notifications.count_documents({}) == 0:
        await db.notifications.insert_many(INITIAL_NOTIFICATIONS)
        logging.info("Seeded notifications collection")
    
    # Seed Evolution PRO Success Cases (Master Input for STEFANIA)
    if await db.success_cases.count_documents({}) == 0:
        await db.success_cases.insert_many(EVOLUTION_PRO_SUCCESS_CASES)
        logging.info("Seeded Evolution PRO success cases collection")

# =============================================================================
# AUTHENTICATION
# =============================================================================

from auth import AuthService, LoginRequest, RegisterRequest, Token, decode_token, UserResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)
auth_service = None  # Will be initialized after db connection

@api_router.on_event("startup")
async def init_auth():
    global auth_service
    auth_service = AuthService(db)
    await auth_service.seed_default_users()
    # Load Telegram admins
    await load_telegram_admins()

@api_router.post("/auth/login", response_model=Token)
async def login(request: LoginRequest):
    """Login and get access token"""
    global auth_service
    if not auth_service:
        auth_service = AuthService(db)
    
    token = await auth_service.login(request.email, request.password)
    
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Email o password non corretti"
        )
    
    return token

@api_router.post("/auth/register")
async def register(request: RegisterRequest):
    """Register a new user"""
    global auth_service
    if not auth_service:
        auth_service = AuthService(db)
    
    try:
        user = await auth_service.create_user(request)
        return {"success": True, "user": user, "message": "Utente registrato con successo"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auth/me")
async def get_current_user(credentials: HTTPAuthorizationCredentials = None):
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    
    token_data = decode_token(credentials.credentials)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")
    
    global auth_service
    if not auth_service:
        auth_service = AuthService(db)
    
    user = await auth_service.get_user_by_id(token_data.user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        is_active=user.get("is_active", True),
        partner_id=user.get("partner_id"),
        phase=user.get("phase"),
        admin_type=user.get("admin_type")
    )

@api_router.post("/auth/verify")
async def verify_token(credentials: HTTPAuthorizationCredentials = None):
    """Verify if token is valid"""
    if not credentials:
        return {"valid": False, "error": "No token provided"}
    
    token_data = decode_token(credentials.credentials)
    
    if not token_data:
        return {"valid": False, "error": "Invalid or expired token"}
    
    return {"valid": True, "user_id": token_data.user_id, "role": token_data.role}

@api_router.get("/auth/users")
async def list_users():
    """List all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(100)
    return {"users": users, "count": len(users)}

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

@api_router.post("/alerts")
async def create_alert(agent: str, type: str, msg: str, partner: str):
    alert = Alert(
        agent=agent,
        type=type,
        msg=msg,
        partner=partner,
        time="adesso"
    )
    await db.alerts.insert_one(alert.model_dump())
    return alert

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
        # Import VALENTINA AI module
        from valentina_ai import valentina_ai
        
        # Build context
        context = {
            "name": request.partner_name,
            "phase": request.partner_phase,
            "niche": request.partner_niche,
            "is_admin": request.context.get("is_admin", False) if request.context else False
        }
        
        # Get response from VALENTINA AI
        response = await valentina_ai.chat(
            partner_id=request.session_id or request.partner_name or "anonymous",
            message=request.message,
            context=context
        )
        
        # Save to chat history
        user_msg = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.message
        )
        await db.chat_messages.insert_one(user_msg.model_dump())
        
        assistant_msg = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response
        )
        await db.chat_messages.insert_one(assistant_msg.model_dump())
        
        return {"response": response, "reply": response, "timestamp": assistant_msg.timestamp}
        
    except Exception as e:
        logging.error(f"Chat error: {e}")
        # Fallback response
        fallback = f"Ciao! Sono VALENTINA. Al momento ho qualche difficoltà tecnica, ma sono qui per aiutarti. Riprova tra poco! 🙏"
        return {"response": fallback, "reply": fallback, "error": str(e)}

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
# ROUTES - STEFANIA (Copy & Marketing Tutor)
# =============================================================================

def build_stefania_system_prompt(partner_name: str, partner_niche: str, current_block: str = None, script_context: dict = None):
    """Build the system prompt for STEFANIA - Copy & Marketing tutor"""
    
    block_hints = {
        "hook": "Il GANCIO deve distruggere lo status quo. Non spiegare COME funziona qualcosa, ma PERCHÉ il metodo attuale del mercato è sbagliato. Deve essere provocatorio e far sentire il pubblico 'chiamato in causa'.",
        "grande_promessa": "La GRANDE PROMESSA deve essere specifica, misurabile e credibile. Non 'migliorare la vita' ma '€10.000 in 30 giorni' o 'perdere 5kg in 2 settimane'. Deve creare desiderio immediato.",
        "metodo": "IL METODO deve avere un nome memorabile e 3 pilastri chiari. Non spiegare tutto il 'come' - mostra solo la mappa del tesoro, non il tesoro stesso. Lascia che vogliano saperne di più.",
        "case_history": "La CASE HISTORY deve essere specifica: nome, situazione di partenza, risultato numerico, tempo impiegato. Le storie astratte non vendono, i numeri sì.",
        "offerta": "L'OFFERTA deve essere irresistibile: prezzo ancorato alto, poi scontato, con bonus che valgono più del corso stesso. Stack di valore visivo.",
        "cta": "La CTA deve essere urgente e specifica: 'clicca ora', 'solo 10 posti', 'scade domani'. Mai 'se ti interessa'."
    }
    
    block_context = ""
    if current_block and current_block in block_hints:
        block_context = f"\n\nBLOCCO ATTUALE: {current_block.upper()}\n{block_hints[current_block]}"
    
    script_summary = ""
    if script_context:
        filled_blocks = [k for k, v in script_context.items() if v.strip()]
        if filled_blocks:
            script_summary = f"\n\nBLOCCHI GIÀ COMPILATI: {', '.join(filled_blocks)}"
    
    return f"""Sei STEFANIA, tutor specializzata in copywriting persuasivo e marketing per videocorsi.
Il tuo ruolo è guidare i partner di Evolution PRO nella creazione della loro Masterclass TRASFORMATIVA.

PARTNER ATTUALE:
- Nome: {partner_name}
- Nicchia: {partner_niche}
{block_context}
{script_summary}

🎯 IL TUO OBIETTIVO PRIMARIO:
Trasformare contenuti "enciclopedici" in messaggi che VENDONO. Non stiamo creando un corso, stiamo creando un'ESPERIENZA che distrugge i dubbi del pubblico.

❌ ERRORI COMUNI DA CORREGGERE:
1. Spiegare il "COME" invece del "PERCHÉ" → Devi forzare il partner a spiegare PERCHÉ il suo metodo funziona, non come
2. Contenuto troppo accademico/educativo → La Masterclass non è una lezione, è una vendita elegante
3. Linguaggio generico ("migliorare", "aiutare") → Devi spingere per numeri, risultati specifici
4. Mancanza di urgenza e scarsità → Ogni blocco deve creare tensione

✅ COME INTERAGIRE:
- Analizza criticamente ogni input del partner
- Se è troppo "da professore", FERMALO e chiedi di riscrivere in modo più persuasivo
- Dai esempi concreti di come riformulare
- Non approvare mai un blocco mediocre - alza sempre l'asticella
- Usa un tono diretto ma incoraggiante: "Buon inizio, ma possiamo renderlo magnetico così..."

📊 STRUTTURA MASTERCLASS (6 BLOCCHI):
1. HOOK - Distruzione dello status quo (il grande errore che tutti fanno)
2. GRANDE PROMESSA - Risultato specifico e desiderabile
3. IL METODO - Framework proprietario in 3 pilastri
4. CASE HISTORY - Prova sociale con numeri reali
5. OFFERTA - Stack di valore irresistibile
6. CTA - Call to action urgente

⚠️ ALERT ADMIN:
Se dopo 2-3 tentativi il partner non riesce a produrre contenuto sufficientemente persuasivo, segnala che è necessario un intervento di Claudio.

Rispondi in italiano, in modo diretto e operativo. Non fare complimenti vuoti - dai feedback costruttivo e actionable."""

@api_router.post("/stefania/chat")
async def chat_with_stefania(request: StefaniaChatRequest):
    """Chat with STEFANIA - Copy & Marketing tutor for Masterclass creation"""
    try:
        session_id = f"stefania_{request.session_id}"
        
        # Get chat history
        history = await db.chat_messages.find(
            {"session_id": session_id}, 
            {"_id": 0}
        ).sort("timestamp", 1).to_list(50)
        
        # Build STEFANIA chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=build_stefania_system_prompt(
                request.partner_name,
                request.partner_niche,
                request.current_block,
                request.script_context
            )
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Add history
        for msg in history:
            if msg["role"] == "user":
                await chat.send_message(UserMessage(text=msg["content"]))
        
        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message
        )
        await db.chat_messages.insert_one(user_msg.model_dump())
        
        # Get response
        response = await chat.send_message(UserMessage(text=request.message))
        
        # Save assistant response
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=response
        )
        await db.chat_messages.insert_one(assistant_msg.model_dump())
        
        return {"response": response, "timestamp": assistant_msg.timestamp, "tutor": "STEFANIA"}
        
    except Exception as e:
        logging.error(f"Stefania chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stefania/review-script")
async def stefania_review_script(request: ScriptReviewRequest):
    """Have STEFANIA review a complete script and provide feedback"""
    try:
        script_text = "\n\n".join([
            f"**{block.upper()}**:\n{content}" 
            for block, content in request.script_blocks.items() 
            if content.strip()
        ])
        
        review_prompt = f"""Analizza lo script Masterclass completo di {request.partner_name} ({request.partner_niche}):

{script_text}

Fornisci:
1. PUNTEGGIO PERSUASIVITÀ (1-10)
2. BLOCCHI DA RIVEDERE (se ce ne sono)
3. FEEDBACK SPECIFICO per ogni blocco debole
4. VERDETTO FINALE: APPROVATO / DA RIVEDERE / NECESSITA INTERVENTO CLAUDIO"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"review_{request.partner_id}_{datetime.now().timestamp()}",
            system_message=build_stefania_system_prompt(request.partner_name, request.partner_niche)
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        review = await chat.send_message(UserMessage(text=review_prompt))
        
        # Determine if admin alert is needed
        needs_admin = "NECESSITA INTERVENTO CLAUDIO" in review.upper() or "DA RIVEDERE" in review.upper()
        
        # Create notification if needed
        if needs_admin and "NECESSITA INTERVENTO" in review.upper():
            notification = Notification(
                type="script_review",
                icon="📝",
                title="Script Masterclass - Richiede Attenzione",
                body=f"STEFANIA segnala che lo script di {request.partner_name} necessita revisione di Claudio",
                time=datetime.now().strftime("%H:%M"),
                partner=request.partner_name,
                action="masterclass"
            )
            await db.notifications.insert_one(notification.model_dump())
        
        return {
            "review": review,
            "needs_admin_review": needs_admin,
            "partner_id": request.partner_id,
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"Script review error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ROUTES - STEFANIA COPY FACTORY (Master Input, Drafting Engine, Admin Review)
# =============================================================================

@api_router.get("/stefania/success-cases")
async def get_success_cases():
    """Get Evolution PRO Success Cases - Master Input database"""
    cases = await db.success_cases.find({}, {"_id": 0}).to_list(50)
    if not cases:
        # Return seed data if empty
        return EVOLUTION_PRO_SUCCESS_CASES
    return cases

@api_router.post("/stefania/success-cases")
async def add_success_case(
    partner_name: str = Form(...),
    niche: str = Form(...),
    result: str = Form(...),
    hook_example: str = Form(None),
    grande_promessa_example: str = Form(None),
    metodo_name: str = Form(None),
    testimonial_quote: str = Form(None)
):
    """Add a new success case to the Master Input database"""
    case = SuccessCase(
        partner_name=partner_name,
        niche=niche,
        result=result,
        hook_example=hook_example,
        grande_promessa_example=grande_promessa_example,
        metodo_name=metodo_name,
        testimonial_quote=testimonial_quote
    )
    await db.success_cases.insert_one(case.model_dump())
    return {"success": True, "case_id": case.id}

@api_router.get("/stefania/golden-rules")
async def get_golden_rules():
    """Get the 10 Golden Rules of Copy Core"""
    return {
        "rules": GOLDEN_RULES_COPY_CORE,
        "principles": COPY_CORE_PRINCIPLES
    }

@api_router.post("/stefania/generate-draft")
async def generate_script_draft(request: DraftGenerationRequest):
    """STEFANIA Drafting Engine - Generate a complete script draft based on Golden Rules"""
    try:
        # Get success cases for reference
        success_cases = await db.success_cases.find({}, {"_id": 0}).to_list(10)
        if not success_cases:
            success_cases = EVOLUTION_PRO_SUCCESS_CASES
        
        # Find similar niche cases for inspiration
        similar_cases = [c for c in success_cases if c.get("niche", "").lower() in request.partner_niche.lower() 
                        or request.partner_niche.lower() in c.get("niche", "").lower()]
        if not similar_cases:
            similar_cases = success_cases[:2]  # Use first 2 as fallback
        
        # Build comprehensive prompt with Golden Rules
        rules_text = "\n".join([f"REGOLA {r['num']}: {r['title']} - {r['description']}" for r in GOLDEN_RULES_COPY_CORE])
        
        examples_text = "\n\n".join([
            f"CASO SUCCESSO: {c['partner_name']} ({c['niche']})\n"
            f"- Risultato: {c['result']}\n"
            f"- Hook: {c.get('hook_example', 'N/A')}\n"
            f"- Grande Promessa: {c.get('grande_promessa_example', 'N/A')}\n"
            f"- Nome Metodo: {c.get('metodo_name', 'N/A')}"
            for c in similar_cases
        ])
        
        positioning = ""
        if request.positioning_data:
            positioning = f"""
DATI POSIZIONAMENTO DEL PARTNER:
- Problema principale: {request.positioning_data.get('problema', 'Non specificato')}
- Target ideale: {request.positioning_data.get('target', 'Non specificato')}
- Trasformazione promessa: {request.positioning_data.get('trasformazione', 'Non specificato')}
- Differenziazione: {request.positioning_data.get('differenziazione', 'Non specificato')}
"""
        
        draft_prompt = f"""Sei STEFANIA, la Copy Strategist di Evolution PRO. Devi generare una bozza completa della Masterclass per {request.partner_name}, esperto in {request.partner_niche}.

{positioning}

🎯 LE 10 REGOLE D'ORO CHE DEVI APPLICARE:
{rules_text}

📚 CASI DI SUCCESSO DA CUI PRENDERE ISPIRAZIONE:
{examples_text}

🧠 I 3 PRINCIPI CARDINE:
1. SCHWARTZ (Ossessione per il Problema): Descrivi il dolore del lead meglio di quanto lui sappia fare
2. TODD BROWN (Meccanismo Unico): Crea un nome proprietario per il metodo che lo renda unico
3. HALBERT (Ritmo del Desiderio): Paragrafi brevi, domande retoriche, linguaggio parlato

📝 GENERA UNA BOZZA COMPLETA PER OGNI BLOCCO:

BLOCCO 1 - HOOK:
Distruggi lo status quo. Qual è la più grande bugia del mercato di {request.partner_niche}?

BLOCCO 2 - GRANDE PROMESSA:
Risultato specifico con numeri. Usa la Regola 7 (Iper-Specificità).

BLOCCO 3 - IL METODO:
Crea un nome proprietario (Regola 10). 3 pilastri. Mostra la mappa, non il tesoro.

BLOCCO 4 - CASE HISTORY:
Storie con numeri reali. Nome, situazione iniziale, risultato, tempo.

BLOCCO 5 - OFFERTA:
Stack di valore 10X. Bonus che valgono più del corso. Affare stupido da rifiutare.

BLOCCO 6 - CTA:
Imperativo, mai condizionale. Urgenza genuina.

Rispondi in formato JSON con questa struttura:
{{"hook": "testo...", "grande_promessa": "testo...", "metodo": "testo...", "case_history": "testo...", "offerta": "testo...", "cta": "testo..."}}
"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"draft_{request.partner_id}_{datetime.now().timestamp()}",
            system_message="Sei STEFANIA, Copy Strategist di Evolution PRO. Genera copy persuasivo seguendo le 10 Regole d'Oro."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=draft_prompt))
        
        # Try to parse JSON from response
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        draft_blocks = {}
        
        if json_match:
            try:
                draft_blocks = json.loads(json_match.group())
            except json.JSONDecodeError:
                # If JSON parsing fails, return the raw text with structure hints
                draft_blocks = {
                    "hook": response,
                    "grande_promessa": "",
                    "metodo": "",
                    "case_history": "",
                    "offerta": "",
                    "cta": ""
                }
        else:
            draft_blocks = {
                "hook": response,
                "grande_promessa": "",
                "metodo": "",
                "case_history": "",
                "offerta": "",
                "cta": ""
            }
        
        # Save as draft
        existing = await db.masterclass_scripts.find_one({"partner_id": request.partner_id})
        if existing:
            await db.masterclass_scripts.update_one(
                {"partner_id": request.partner_id},
                {"$set": {
                    "blocks": draft_blocks,
                    "status": "ai_draft",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            script = MasterclassScript(
                partner_id=request.partner_id,
                partner_name=request.partner_name,
                status="ai_draft",
                blocks=draft_blocks
            )
            await db.masterclass_scripts.insert_one(script.model_dump())
        
        return {
            "success": True,
            "draft_blocks": draft_blocks,
            "status": "ai_draft",
            "message": "Bozza generata da STEFANIA. Ora puoi modificarla o inviarla per Admin Review."
        }
        
    except Exception as e:
        logging.error(f"Draft generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ADMIN REVIEW MODE - Script editing workflow
# =============================================================================

@api_router.get("/stefania/admin-review/pending")
async def get_pending_admin_reviews():
    """Get all scripts pending Admin review (status: in_review or ai_draft)"""
    scripts = await db.masterclass_scripts.find(
        {"status": {"$in": ["in_review", "ai_draft", "needs_revision"]}},
        {"_id": 0}
    ).to_list(50)
    
    # Enrich with partner info
    enriched = []
    for script in scripts:
        partner = await db.partners.find_one({"id": script["partner_id"]}, {"_id": 0})
        script["partner_info"] = partner
        enriched.append(script)
    
    return enriched

@api_router.post("/masterclass/script/{partner_id}/send-to-admin")
async def send_script_to_admin_review(partner_id: str):
    """Partner sends script to Admin (Claudio/Antonella) for final editing"""
    script = await db.masterclass_scripts.find_one({"partner_id": partner_id}, {"_id": 0})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    await db.masterclass_scripts.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "status": "in_review",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification for admins
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    notification = Notification(
        type="script_review",
        icon="📝",
        title="Script Pronto per Revisione Admin",
        body=f"{partner['name']} ha inviato la Masterclass per editing finale",
        time=datetime.now().strftime("%H:%M"),
        partner=partner["name"],
        action="admin_review"
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return {"success": True, "status": "in_review", "message": "Script inviato a Claudio/Antonella per editing finale"}

@api_router.post("/masterclass/script/{partner_id}/admin-edit")
async def admin_edit_script(partner_id: str, edit: AdminEditRequest):
    """Admin (Claudio/Antonella) edits the script before sending to partner for approval"""
    script = await db.masterclass_scripts.find_one({"partner_id": partner_id}, {"_id": 0})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Save admin edit record
    admin_edit = AdminScriptEdit(
        script_id=script.get("id", partner_id),
        partner_id=partner_id,
        admin_user=edit.admin_user,
        original_blocks=script.get("blocks", {}),
        edited_blocks=edit.blocks,
        admin_notes=edit.admin_notes
    )
    await db.admin_script_edits.insert_one(admin_edit.model_dump())
    
    # Update script with admin edits
    await db.masterclass_scripts.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "blocks": edit.blocks,
            "status": "pending_partner_approval",
            "admin_edited_by": edit.admin_user,
            "admin_notes": edit.admin_notes,
            "admin_edited_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification for partner
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    notification = Notification(
        type="script_review",
        icon="✏️",
        title="Script Modificato - Richiede Approvazione",
        body=f"{edit.admin_user} ha completato l'editing della tua Masterclass",
        time=datetime.now().strftime("%H:%M"),
        partner=partner["name"],
        action="partner_approval"
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return {
        "success": True,
        "status": "pending_partner_approval",
        "admin_user": edit.admin_user,
        "message": f"Script modificato da {edit.admin_user}. In attesa di approvazione dal partner."
    }

@api_router.post("/masterclass/script/{partner_id}/partner-approve")
async def partner_approve_admin_edit(partner_id: str, approved: bool = True, feedback: str = None):
    """Partner approves or requests revision of Admin edits"""
    script = await db.masterclass_scripts.find_one({"partner_id": partner_id}, {"_id": 0})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    if approved:
        new_status = "approved"
        message = "Script approvato! Pronto per la produzione video."
        
        # Update admin edit record
        await db.admin_script_edits.update_one(
            {"partner_id": partner_id, "status": "pending_partner_approval"},
            {"$set": {
                "status": "approved_by_partner",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        new_status = "revision_requested"
        message = "Richiesta di revisione inviata all'Admin."
        
        # Update admin edit record
        await db.admin_script_edits.update_one(
            {"partner_id": partner_id, "status": "pending_partner_approval"},
            {"$set": {
                "status": "revision_requested",
                "partner_feedback": feedback,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Notify admin
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        notification = Notification(
            type="script_review",
            icon="🔄",
            title="Revisione Richiesta",
            body=f"{partner['name']} ha richiesto modifiche allo script: {feedback[:50] if feedback else 'Nessun dettaglio'}",
            time=datetime.now().strftime("%H:%M"),
            partner=partner["name"],
            action="admin_review"
        )
        await db.notifications.insert_one(notification.model_dump())
    
    await db.masterclass_scripts.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "status": new_status,
            "partner_feedback": feedback,
            "partner_approved_at": datetime.now(timezone.utc).isoformat() if approved else None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "status": new_status, "message": message}

@api_router.get("/masterclass/script/{partner_id}/edit-history")
async def get_script_edit_history(partner_id: str):
    """Get edit history for a script"""
    edits = await db.admin_script_edits.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return edits

# =============================================================================
# STEFANIA WAR MODE - ADS & TRAFFIC ROUTES
# =============================================================================

@api_router.post("/stefania/war-mode/generate-hooks")
async def generate_ad_hooks(request: AdHookRequest):
    """Ads Script Generator - Extract 5 powerful hooks from Copy Core for Meta/Google ads"""
    try:
        # Get the partner's script
        script = await db.masterclass_scripts.find_one({"partner_id": request.partner_id}, {"_id": 0})
        
        # Get success cases for inspiration
        success_cases = await db.success_cases.find({}, {"_id": 0}).to_list(5)
        if not success_cases:
            success_cases = EVOLUTION_PRO_SUCCESS_CASES[:3]
        
        # Build Copy Core context
        copy_core = ""
        if script and script.get("blocks"):
            copy_core = f"""
COPY CORE DEL PARTNER:
- Hook originale: {script['blocks'].get('hook', '')}
- Grande Promessa: {script['blocks'].get('grande_promessa', '')}
- Metodo: {script['blocks'].get('metodo', '')}
"""
        
        # Platform-specific guidelines
        platform_guidelines = {
            "meta": "Facebook/Instagram: Max 125 caratteri per l'hook principale. Usa emoji strategicamente. Focus su scroll-stopping opener.",
            "google": "Google Ads: Max 30 caratteri per headline. Focus su keyword intent. Usa numeri e benefici concreti.",
            "tiktok": "TikTok: Linguaggio casual e diretto. Pattern interrupt nei primi 3 secondi. Usa domande provocatorie."
        }
        
        hook_prompt = f"""Sei STEFANIA in War Mode - Ads Specialist. Devi generare 5 HOOK PUBBLICITARI potenti per {request.partner_name} ({request.partner_niche}).

{copy_core}

PIATTAFORMA: {request.platform.upper()}
LINEE GUIDA: {platform_guidelines.get(request.platform, platform_guidelines['meta'])}

🎯 REGOLE PER GLI HOOK ADS:
1. Pattern Interrupt: Inizia con qualcosa che FERMA lo scroll
2. Curiosity Gap: Crea un vuoto informativo che spinge a cliccare
3. Specificity: Usa numeri precisi (4.7kg, €2.347, 22 giorni)
4. Enemy Frame: Identifica un nemico comune (i guru, il sistema, le bugie)
5. Identity Trigger: Parla direttamente al target ideale

📚 ESEMPI DA SUCCESSI EVOLUTION PRO:
{chr(10).join([f"- {c['partner_name']}: {c.get('hook_example', 'N/A')}" for c in success_cases])}

Genera 5 hook diversi, ognuno con un angolo unico:
1. HOOK CURIOSITÀ: Pattern interrupt + mistero
2. HOOK PROVOCAZIONE: Sfida lo status quo
3. HOOK RISULTATO: Numero specifico + timeframe
4. HOOK STORIA: Mini-narrative hook
5. HOOK DOMANDA: Domanda provocatoria

Rispondi in formato JSON:
{{"hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"], "platform_tips": "suggerimenti specifici"}}
"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"hooks_{request.partner_id}_{datetime.now().timestamp()}",
            system_message="Sei STEFANIA War Mode - Ads Specialist di Evolution PRO. Genera copy per ads ad alta conversione."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=hook_prompt))
        
        # Parse JSON response
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        hooks_data = {"hooks": [], "platform_tips": ""}
        
        if json_match:
            try:
                hooks_data = json.loads(json_match.group())
            except json.JSONDecodeError:
                hooks_data["hooks"] = [response]
        
        # Save to campaign if exists, or create new
        existing_campaign = await db.ads_campaigns.find_one({"partner_id": request.partner_id, "platform": request.platform})
        
        if existing_campaign:
            await db.ads_campaigns.update_one(
                {"partner_id": request.partner_id, "platform": request.platform},
                {"$set": {
                    "hooks": hooks_data.get("hooks", []),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            campaign = AdsCampaign(
                partner_id=request.partner_id,
                partner_name=request.partner_name,
                platform=request.platform,
                campaign_name=f"{request.partner_name} - {request.platform.upper()} Campaign",
                hooks=hooks_data.get("hooks", [])
            )
            await db.ads_campaigns.insert_one(campaign.model_dump())
        
        return {
            "success": True,
            "hooks": hooks_data.get("hooks", []),
            "platform": request.platform,
            "platform_tips": hooks_data.get("platform_tips", ""),
            "partner_id": request.partner_id
        }
        
    except Exception as e:
        logging.error(f"Hook generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stefania/war-mode/campaigns")
async def get_all_campaigns():
    """Get all ad campaigns for Admin dashboard"""
    campaigns = await db.ads_campaigns.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return campaigns

@api_router.get("/stefania/war-mode/campaigns/{partner_id}")
async def get_partner_campaigns(partner_id: str):
    """Get campaigns for a specific partner"""
    campaigns = await db.ads_campaigns.find({"partner_id": partner_id}, {"_id": 0}).to_list(20)
    return campaigns

@api_router.post("/stefania/war-mode/campaigns/{campaign_id}/update-metrics")
async def update_campaign_metrics(
    campaign_id: str,
    spend: float = 0,
    leads: int = 0,
    conversions: int = 0,
    revenue: float = 0
):
    """Performance Bridge - Update campaign metrics (simulating MARTA API connection)"""
    campaign = await db.ads_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Calculate metrics
    cpl = spend / leads if leads > 0 else 0
    roas = revenue / spend if spend > 0 else 0
    
    # Update campaign
    await db.ads_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "spend_total": campaign.get("spend_total", 0) + spend,
            "leads": campaign.get("leads", 0) + leads,
            "cpl": cpl,
            "roas": roas,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Auto-Optimization Logic: Check CPL threshold
    cpl_threshold = campaign.get("cpl_max_threshold", 15.0)
    alerts = []
    
    if cpl > cpl_threshold and leads > 0:
        # Create Low Performance Alert
        alert = PerformanceAlert(
            partner_id=campaign["partner_id"],
            campaign_id=campaign_id,
            alert_type="cpl_exceeded",
            severity="critical" if cpl > cpl_threshold * 1.5 else "warning",
            current_value=cpl,
            threshold_value=cpl_threshold,
            message=f"CPL di €{cpl:.2f} supera la soglia di €{cpl_threshold:.2f}",
            suggested_action="Considerare cambio creatività. Testa un nuovo hook dalla lista generata o rivedi il targeting."
        )
        await db.performance_alerts.insert_one(alert.model_dump())
        alerts.append(alert.model_dump())
        
        # Create notification for Claudio
        notification = Notification(
            type="escalation",
            icon="📉",
            title="LOW PERFORMANCE - STEFANIA Alert",
            body=f"CPL {campaign['partner_name']} ({campaign['platform']}) a €{cpl:.2f} - Superata soglia €{cpl_threshold:.2f}",
            time=datetime.now().strftime("%H:%M"),
            partner=campaign["partner_name"],
            action="war_mode"
        )
        await db.notifications.insert_one(notification.model_dump())
    
    # Low ROAS alert
    if roas < 1.0 and revenue > 0:
        alert = PerformanceAlert(
            partner_id=campaign["partner_id"],
            campaign_id=campaign_id,
            alert_type="low_roas",
            severity="warning",
            current_value=roas,
            threshold_value=1.0,
            message=f"ROAS di {roas:.2f}x è sotto break-even",
            suggested_action="Ottimizza la landing page o rivedi l'offerta. Considera aumentare il prezzo del corso."
        )
        await db.performance_alerts.insert_one(alert.model_dump())
        alerts.append(alert.model_dump())
    
    return {
        "success": True,
        "campaign_id": campaign_id,
        "metrics": {"spend": spend, "leads": leads, "cpl": cpl, "roas": roas},
        "alerts_triggered": len(alerts),
        "alerts": alerts
    }

@api_router.get("/stefania/war-mode/performance/{partner_id}")
async def get_partner_performance(partner_id: str):
    """Performance Bridge - Get performance metrics aggregated (MARTA connection)"""
    campaigns = await db.ads_campaigns.find({"partner_id": partner_id}, {"_id": 0}).to_list(10)
    alerts = await db.performance_alerts.find({"partner_id": partner_id, "resolved": False}, {"_id": 0}).to_list(20)
    
    # Aggregate metrics
    total_spend = sum(c.get("spend_total", 0) for c in campaigns)
    total_leads = sum(c.get("leads", 0) for c in campaigns)
    avg_cpl = total_spend / total_leads if total_leads > 0 else 0
    
    return {
        "partner_id": partner_id,
        "campaigns_count": len(campaigns),
        "campaigns": campaigns,
        "aggregated": {
            "total_spend": total_spend,
            "total_leads": total_leads,
            "avg_cpl": avg_cpl
        },
        "active_alerts": alerts
    }

@api_router.get("/stefania/war-mode/alerts")
async def get_performance_alerts(resolved: bool = False):
    """Get all performance alerts for Admin dashboard"""
    alerts = await db.performance_alerts.find({"resolved": resolved}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return alerts

@api_router.post("/stefania/war-mode/alerts/{alert_id}/resolve")
async def resolve_performance_alert(alert_id: str):
    """Resolve a performance alert"""
    await db.performance_alerts.update_one(
        {"id": alert_id},
        {"$set": {"resolved": True}}
    )
    return {"success": True, "alert_id": alert_id}

@api_router.post("/stefania/war-mode/generate-utm")
async def generate_utm_link(request: UTMGeneratorRequest):
    """Tracking Automatizzato - Generate UTM tracked links"""
    # Sanitize values for URL
    def sanitize(value: str) -> str:
        return value.lower().replace(" ", "_").replace("-", "_")
    
    # Build UTM parameters
    utm_params = {
        "utm_source": sanitize(request.source),
        "utm_medium": sanitize(request.medium),
        "utm_campaign": sanitize(request.campaign_name),
        "utm_content": sanitize(request.content) if request.content else f"hook_{datetime.now().strftime('%Y%m%d')}",
        "utm_term": sanitize(request.partner_name)
    }
    
    # Add Evolution PRO tracking ID
    utm_params["evo_partner_id"] = request.partner_id
    utm_params["evo_timestamp"] = datetime.now().strftime("%Y%m%d%H%M")
    
    # Build full URL
    from urllib.parse import urlencode, urlparse, parse_qs
    
    base_url = request.destination_url
    if "?" in base_url:
        full_url = f"{base_url}&{urlencode(utm_params)}"
    else:
        full_url = f"{base_url}?{urlencode(utm_params)}"
    
    # Save to campaign
    await db.ads_campaigns.update_one(
        {"partner_id": request.partner_id, "platform": request.source},
        {"$set": {
            "utm_params": utm_params,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "tracked_url": full_url,
        "utm_params": utm_params,
        "short_preview": full_url[:80] + "..." if len(full_url) > 80 else full_url
    }

@api_router.post("/stefania/war-mode/campaigns/{campaign_id}/set-threshold")
async def set_cpl_threshold(campaign_id: str, cpl_max: float):
    """Set CPL max threshold for auto-optimization alerts"""
    await db.ads_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "cpl_max_threshold": cpl_max,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "campaign_id": campaign_id, "new_threshold": cpl_max}

@api_router.get("/stefania/war-mode/dashboard")
async def get_war_mode_dashboard():
    """Complete War Mode dashboard data for Admin"""
    campaigns = await db.ads_campaigns.find({}, {"_id": 0}).to_list(100)
    alerts = await db.performance_alerts.find({"resolved": False}, {"_id": 0}).to_list(50)
    
    # Aggregate by platform
    by_platform = {}
    for c in campaigns:
        platform = c.get("platform", "other")
        if platform not in by_platform:
            by_platform[platform] = {"campaigns": 0, "spend": 0, "leads": 0, "qualified_leads": 0, "ltv_total": 0, "revenue": 0}
        by_platform[platform]["campaigns"] += 1
        by_platform[platform]["spend"] += c.get("spend_total", 0)
        by_platform[platform]["leads"] += c.get("leads", 0)
        by_platform[platform]["qualified_leads"] += c.get("qualified_leads", 0)
        by_platform[platform]["ltv_total"] += c.get("ltv_avg", 0) * c.get("conversions", 0)
        by_platform[platform]["revenue"] += c.get("revenue", 0)
    
    # Calculate platform comparison
    meta_data = by_platform.get("meta", {"spend": 0, "leads": 0, "qualified_leads": 0, "revenue": 0})
    linkedin_data = by_platform.get("linkedin", {"spend": 0, "leads": 0, "qualified_leads": 0, "revenue": 0})
    
    # Calculate averages
    total_spend = sum(c.get("spend_total", 0) for c in campaigns)
    total_leads = sum(c.get("leads", 0) for c in campaigns)
    
    return {
        "overview": {
            "total_campaigns": len(campaigns),
            "total_spend": total_spend,
            "total_leads": total_leads,
            "avg_cpl": total_spend / total_leads if total_leads > 0 else 0,
            "active_alerts": len(alerts)
        },
        "by_platform": by_platform,
        "platform_comparison": {
            "meta": {
                "cpl": meta_data["spend"] / meta_data["leads"] if meta_data["leads"] > 0 else 0,
                "roas": meta_data["revenue"] / meta_data["spend"] if meta_data["spend"] > 0 else 0,
                "lead_quality": meta_data["qualified_leads"] / meta_data["leads"] if meta_data["leads"] > 0 else 0
            },
            "linkedin": {
                "cpl": linkedin_data["spend"] / linkedin_data["leads"] if linkedin_data["leads"] > 0 else 0,
                "roas": linkedin_data["revenue"] / linkedin_data["spend"] if linkedin_data["spend"] > 0 else 0,
                "lead_quality": linkedin_data["qualified_leads"] / linkedin_data["leads"] if linkedin_data["leads"] > 0 else 0
            }
        },
        "campaigns": campaigns[:10],  # Latest 10
        "critical_alerts": [a for a in alerts if a.get("severity") == "critical"][:5]
    }

# =============================================================================
# STEFANIA WAR MODE - MULTI-CHANNEL (META & LINKEDIN)
# =============================================================================

@api_router.post("/stefania/war-mode/hook-gallery")
async def generate_hook_gallery(request: HookGalleryRequest):
    """Generate 3-variant Hook Gallery for Meta (Pain, Secret, Result angles)"""
    try:
        # Get Copy Core for context
        script = await db.masterclass_scripts.find_one({"partner_id": request.partner_id}, {"_id": 0})
        copy_context = ""
        if script and script.get("blocks"):
            copy_context = f"""
COPY CORE DISPONIBILE:
- Hook: {script['blocks'].get('hook', 'N/A')[:200]}
- Grande Promessa: {script['blocks'].get('grande_promessa', 'N/A')[:200]}
- Case History: {script['blocks'].get('case_history', 'N/A')[:200]}
"""

        prompt = f"""Sei STEFANIA in War Mode per META ADS. Genera 3 HOOK VIDEO per {request.partner_name} ({request.partner_niche}).

{copy_context}

🎯 STRATEGIA: Hook Gallery (primi 5 secondi del video)
Il targeting è BROAD - il copy deve FILTRARE i curiosi dai potenziali clienti.

GENERA 3 HOOK DIVERSI:

1️⃣ ANGOLO DEL DOLORE (Emotional Trigger)
Pattern: "Sei stanco di [frustrazione comune]?"
Obiettivo: Colpire chi sta vivendo il problema ORA

2️⃣ ANGOLO DEL SEGRETO (Curiosity Gap)  
Pattern: "Ecco come [nemico comune] ti sta nascondendo [verità scomoda]"
Obiettivo: Creare suspense e pattern interrupt

3️⃣ ANGOLO DEL RISULTATO (Social Proof)
Pattern: "Il sistema esatto che ha generato [numero specifico] per [nome/tipo cliente]"
Obiettivo: Proof + Specificity

REGOLE:
- Max 50 parole per hook (primi 5 sec video)
- Linguaggio diretto, parlato
- Numeri specifici quando possibile
- NO gergo tecnico

Rispondi in JSON:
{{"pain": "hook dolore...", "secret": "hook segreto...", "result": "hook risultato...", "targeting_note": "suggerimento targeting broad"}}
"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"hookgallery_{request.partner_id}_{datetime.now().timestamp()}",
            system_message="Sei STEFANIA War Mode - Meta Ads Specialist. Genera hook video che fermano lo scroll."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        hook_gallery = {"pain": "", "secret": "", "result": "", "targeting_note": ""}
        
        if json_match:
            try:
                hook_gallery = json.loads(json_match.group())
            except json.JSONDecodeError:
                hook_gallery["pain"] = response
        
        # Save to campaign
        existing = await db.ads_campaigns.find_one({"partner_id": request.partner_id, "platform": "meta"})
        if existing:
            await db.ads_campaigns.update_one(
                {"partner_id": request.partner_id, "platform": "meta"},
                {"$set": {
                    "hook_gallery": hook_gallery,
                    "targeting_type": "broad",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            campaign = AdsCampaign(
                partner_id=request.partner_id,
                partner_name=request.partner_name,
                platform="meta",
                campaign_name=f"{request.partner_name} - Meta Hook Gallery",
                hook_gallery=hook_gallery,
                targeting_type="broad"
            )
            await db.ads_campaigns.insert_one(campaign.model_dump())
        
        return {
            "success": True,
            "hook_gallery": hook_gallery,
            "platform": "meta",
            "partner_id": request.partner_id
        }
        
    except Exception as e:
        logging.error(f"Hook gallery error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stefania/war-mode/linkedin-content")
async def generate_linkedin_content(request: LinkedInContentRequest):
    """Generate LinkedIn-specific content (Thought Leadership, ABM, Lead Gen Forms)"""
    try:
        # Get Copy Core
        script = await db.masterclass_scripts.find_one({"partner_id": request.partner_id}, {"_id": 0})
        copy_context = ""
        if script and script.get("blocks"):
            copy_context = f"""
COPY CORE (trasforma in tono LinkedIn):
- Metodo: {script['blocks'].get('metodo', 'N/A')[:300]}
- Grande Promessa: {script['blocks'].get('grande_promessa', 'N/A')[:200]}
"""

        content_prompts = {
            "thought_leadership": f"""Sei STEFANIA per LINKEDIN ADS. Trasforma il Copy Core di {request.partner_name} ({request.partner_niche}) in un POST THOUGHT LEADERSHIP.

{copy_context}

🎯 OBIETTIVO: Sembrare un'analisi di mercato, NON pubblicità

STRUTTURA THOUGHT LEADERSHIP:
1. Osservazione di mercato provocatoria (pattern industry)
2. Dati o insight esclusivo (anche senza numeri reali, usa logica)
3. Framework/metodologia come soluzione
4. CTA soft ("Commenta se anche tu...")

TONO: Professionale ma accessibile. Come un post di un CEO rispettato.
LUNGHEZZA: 150-200 parole max

Rispondi in JSON:
{{"post_text": "testo post...", "headline": "headline per l'ad", "cta_type": "engagement/lead_form"}}
""",
            "abm_ad": f"""Sei STEFANIA per LINKEDIN ABM (Account-Based Marketing). Crea un AD per {request.partner_name} ({request.partner_niche}).

TARGET SPECIFICO: {request.target_segment or "Titolari di agenzie o consulenti senior"}

{copy_context}

🎯 OBIETTIVO: Colpire decision-maker di alto livello

STRUTTURA ABM AD:
1. Problema specifico del segmento target
2. Credenziale/autorità di {request.partner_name}
3. Offerta esclusiva per il segmento
4. CTA per download risorsa o call

TONO: Diretto, executive-level, no fluff.

Rispondi in JSON:
{{"ad_copy": "testo ad...", "headline": "headline", "target_criteria": "criteri targeting linkedin"}}
""",
            "lead_gen_form": f"""Sei STEFANIA per LINKEDIN LEAD GEN FORMS. Crea il copy per un form nativo LinkedIn per {request.partner_name} ({request.partner_niche}).

{copy_context}

🎯 OBIETTIVO: Massimizzare conversioni con form pre-compilato

STRUTTURA LEAD GEN FORM:
1. Headline che promette valore immediato
2. Descrizione breve del "lead magnet" (es. guida, checklist, case study)
3. 3 bullet points del valore
4. Privacy-friendly CTA

VANTAGGI FORM NATIVO: Email aziendale reale, dati pre-compilati, zero attrito.

Rispondi in JSON:
{{"form_headline": "headline form", "form_description": "descrizione", "bullet_points": ["punto1", "punto2", "punto3"], "lead_magnet_name": "nome risorsa"}}
"""
        }
        
        prompt = content_prompts.get(request.content_type, content_prompts["thought_leadership"])
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"linkedin_{request.partner_id}_{datetime.now().timestamp()}",
            system_message="Sei STEFANIA War Mode - LinkedIn B2B Specialist. Crea contenuti che costruiscono autorità."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        linkedin_content = {}
        
        if json_match:
            try:
                linkedin_content = json.loads(json_match.group())
            except json.JSONDecodeError:
                linkedin_content = {"content": response}
        
        # Save to campaign
        existing = await db.ads_campaigns.find_one({"partner_id": request.partner_id, "platform": "linkedin"})
        if existing:
            current_content = existing.get("linkedin_content", {})
            current_content[request.content_type] = linkedin_content
            await db.ads_campaigns.update_one(
                {"partner_id": request.partner_id, "platform": "linkedin"},
                {"$set": {
                    "linkedin_content": current_content,
                    "targeting_type": "abm" if request.content_type == "abm_ad" else existing.get("targeting_type", "professional"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            campaign = AdsCampaign(
                partner_id=request.partner_id,
                partner_name=request.partner_name,
                platform="linkedin",
                campaign_name=f"{request.partner_name} - LinkedIn {request.content_type}",
                linkedin_content={request.content_type: linkedin_content},
                targeting_type="abm" if request.content_type == "abm_ad" else "professional"
            )
            await db.ads_campaigns.insert_one(campaign.model_dump())
        
        return {
            "success": True,
            "content_type": request.content_type,
            "linkedin_content": linkedin_content,
            "platform": "linkedin",
            "partner_id": request.partner_id
        }
        
    except Exception as e:
        logging.error(f"LinkedIn content error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stefania/war-mode/cross-platform-analysis")
async def analyze_cross_platform(partner_id: str):
    """Auto-Pivot Analysis: Compare Meta vs LinkedIn and suggest budget shifts"""
    try:
        meta_campaign = await db.ads_campaigns.find_one({"partner_id": partner_id, "platform": "meta"}, {"_id": 0})
        linkedin_campaign = await db.ads_campaigns.find_one({"partner_id": partner_id, "platform": "linkedin"}, {"_id": 0})
        
        analysis = {
            "partner_id": partner_id,
            "meta": None,
            "linkedin": None,
            "recommended_platform": "meta",
            "pivot_suggestion": None,
            "budget_recommendation": None
        }
        
        if meta_campaign:
            meta_cpl = meta_campaign.get("cpl", 0)
            meta_roas = meta_campaign.get("roas", 0)
            meta_ltv = meta_campaign.get("ltv_avg", 0)
            meta_threshold = meta_campaign.get("cpl_max_threshold", 15)
            
            analysis["meta"] = {
                "cpl": meta_cpl,
                "roas": meta_roas,
                "ltv_avg": meta_ltv,
                "leads": meta_campaign.get("leads", 0),
                "qualified_leads": meta_campaign.get("qualified_leads", 0),
                "cpl_exceeded": meta_cpl > meta_threshold if meta_cpl > 0 else False,
                "hook_gallery": meta_campaign.get("hook_gallery")
            }
        
        if linkedin_campaign:
            linkedin_cpl = linkedin_campaign.get("cpl", 0)
            linkedin_roas = linkedin_campaign.get("roas", 0)
            linkedin_ltv = linkedin_campaign.get("ltv_avg", 0)
            linkedin_qual_rate = linkedin_campaign.get("qualified_leads", 0) / linkedin_campaign.get("leads", 1) if linkedin_campaign.get("leads", 0) > 0 else 0
            
            analysis["linkedin"] = {
                "cpl": linkedin_cpl,
                "roas": linkedin_roas,
                "ltv_avg": linkedin_ltv,
                "leads": linkedin_campaign.get("leads", 0),
                "qualified_leads": linkedin_campaign.get("qualified_leads", 0),
                "qualification_rate": linkedin_qual_rate,
                "content_types": list(linkedin_campaign.get("linkedin_content", {}).keys()) if linkedin_campaign.get("linkedin_content") else []
            }
        
        # Auto-Pivot Logic
        if analysis["meta"] and analysis["linkedin"]:
            meta_cpl_exceeded = analysis["meta"]["cpl_exceeded"]
            linkedin_better_ltv = (analysis["linkedin"]["ltv_avg"] > analysis["meta"]["ltv_avg"]) if analysis["linkedin"]["ltv_avg"] > 0 else False
            linkedin_better_quality = (analysis["linkedin"]["qualified_leads"] / max(analysis["linkedin"]["leads"], 1)) > (analysis["meta"]["qualified_leads"] / max(analysis["meta"]["leads"], 1)) if analysis["meta"].get("leads", 0) > 0 else False
            
            if meta_cpl_exceeded and (linkedin_better_ltv or linkedin_better_quality):
                analysis["recommended_platform"] = "linkedin"
                analysis["pivot_suggestion"] = f"""⚠️ AUTO-PIVOT SUGGERITO: CPL Meta (€{analysis['meta']['cpl']:.2f}) ha superato la soglia.

LinkedIn mostra:
- LTV medio più alto: €{analysis['linkedin']['ltv_avg']:.0f} vs €{analysis['meta']['ltv_avg']:.0f}
- Tasso qualificazione lead: {analysis['linkedin'].get('qualification_rate', 0)*100:.0f}%

RACCOMANDAZIONE: Sposta 30-50% del budget da Meta a LinkedIn per ottimizzare il ROAS complessivo."""
                
                analysis["budget_recommendation"] = {
                    "action": "shift_to_linkedin",
                    "percentage": 40,
                    "reason": "higher_ltv_and_lead_quality"
                }
                
                # Create alert
                alert = PerformanceAlert(
                    partner_id=partner_id,
                    campaign_id=meta_campaign.get("id", ""),
                    alert_type="auto_pivot_suggested",
                    severity="warning",
                    current_value=analysis["meta"]["cpl"],
                    threshold_value=meta_campaign.get("cpl_max_threshold", 15),
                    message=f"Auto-Pivot: Considera shift budget a LinkedIn (LTV {analysis['linkedin']['ltv_avg']:.0f}€ vs Meta {analysis['meta']['ltv_avg']:.0f}€)",
                    suggested_action="Sposta 40% budget da Meta a LinkedIn per lead di qualità superiore"
                )
                await db.performance_alerts.insert_one(alert.model_dump())
            
            elif meta_cpl_exceeded:
                analysis["pivot_suggestion"] = f"⚠️ CPL Meta alto (€{analysis['meta']['cpl']:.2f}). LinkedIn non ha ancora dati sufficienti per un pivot. Considera di lanciare test su LinkedIn."
        
        return analysis
        
    except Exception as e:
        logging.error(f"Cross-platform analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stefania/war-mode/multi-channel/{partner_id}")
async def get_multi_channel_data(partner_id: str):
    """Get all multi-channel data for a partner (Meta + LinkedIn)"""
    meta = await db.ads_campaigns.find_one({"partner_id": partner_id, "platform": "meta"}, {"_id": 0})
    linkedin = await db.ads_campaigns.find_one({"partner_id": partner_id, "platform": "linkedin"}, {"_id": 0})
    
    return {
        "partner_id": partner_id,
        "meta": meta,
        "linkedin": linkedin,
        "has_meta": meta is not None,
        "has_linkedin": linkedin is not None
    }

@api_router.post("/stefania/war-mode/campaigns/{campaign_id}/update-ltv")
async def update_campaign_ltv(campaign_id: str, ltv_avg: float, qualified_leads: int = None):
    """Update LTV and qualified lead data for a campaign (for comparison analysis)"""
    update_data = {
        "ltv_avg": ltv_avg,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if qualified_leads is not None:
        update_data["qualified_leads"] = qualified_leads
    
    await db.ads_campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    return {"success": True, "campaign_id": campaign_id, "ltv_avg": ltv_avg}

# =============================================================================
# STEFANIA REAL-TIME API INTEGRATION (Meta + LinkedIn)
# =============================================================================

# Import the ads integration module
try:
    from ads_api_integration import UnifiedAdsService, MartaCRMBridge
    ads_service_available = True
except ImportError:
    ads_service_available = False
    logging.warning("ads_api_integration module not available")

@api_router.post("/stefania/api/store-credentials")
async def store_partner_api_credentials(
    partner_id: str = Form(...),
    meta_access_token: str = Form(None),
    meta_ad_account_id: str = Form(None),
    linkedin_access_token: str = Form(None),
    linkedin_ad_account_urn: str = Form(None)
):
    """
    Store Meta/LinkedIn API credentials for a partner
    Required for real-time metrics fetching
    """
    if not ads_service_available:
        raise HTTPException(status_code=503, detail="Ads integration service not available")
    
    service = UnifiedAdsService(db)
    result = await service.store_partner_api_credentials(
        partner_id,
        meta_access_token,
        meta_ad_account_id,
        linkedin_access_token,
        linkedin_ad_account_urn
    )
    return result

@api_router.get("/stefania/api/credentials/{partner_id}")
async def get_partner_credentials_status(partner_id: str):
    """Check which API credentials are configured for a partner"""
    creds = await db.partner_api_credentials.find_one({"partner_id": partner_id}, {"_id": 0})
    
    if not creds:
        return {
            "partner_id": partner_id,
            "meta_configured": False,
            "linkedin_configured": False
        }
    
    return {
        "partner_id": partner_id,
        "meta_configured": bool(creds.get("meta_access_token") and creds.get("meta_ad_account_id")),
        "linkedin_configured": bool(creds.get("linkedin_access_token") and creds.get("linkedin_ad_account_urn")),
        "updated_at": creds.get("updated_at")
    }

@api_router.post("/stefania/api/sync-metrics/{partner_id}")
async def sync_partner_metrics_realtime(
    partner_id: str,
    cpl_threshold_meta: float = 15.0,
    cpl_threshold_linkedin: float = 25.0
):
    """
    Sync real-time metrics from Meta/LinkedIn APIs
    Triggers Smart-Optimization alerts if CPL exceeds threshold
    """
    if not ads_service_available:
        raise HTTPException(status_code=503, detail="Ads integration service not available")
    
    service = UnifiedAdsService(db)
    result = await service.sync_and_check_alerts(
        partner_id,
        cpl_threshold_meta,
        cpl_threshold_linkedin
    )
    
    # If alerts were triggered, create notifications
    if result["alerts_triggered"] > 0:
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        for alert in result["alerts"]:
            notification = Notification(
                type="escalation",
                icon="⚠️",
                title=f"SMART-OPTIMIZATION Alert - {alert['platform'].upper()}",
                body=alert["message"],
                time=datetime.now().strftime("%H:%M"),
                partner=partner["name"] if partner else partner_id,
                action="war_mode"
            )
            await db.notifications.insert_one(notification.model_dump())
    
    return result

@api_router.get("/stefania/api/roi/{partner_id}")
async def get_partner_roi_realtime(partner_id: str, days: int = 30):
    """
    Calculate real ROI using CRM data from MARTA
    Shows actual revenue vs ad spend
    """
    if not ads_service_available:
        raise HTTPException(status_code=503, detail="Ads integration service not available")
    
    service = UnifiedAdsService(db)
    roi_data = await service.calculate_partner_roi(partner_id, days)
    return roi_data

@api_router.post("/stefania/api/crm/sale")
async def record_crm_sale(
    partner_id: str = Form(...),
    amount: float = Form(...),
    utm_source: str = Form(None),
    utm_campaign: str = Form(None),
    customer_email: str = Form(None)
):
    """
    Record a sale in MARTA CRM for ROI attribution
    Links ad spend to actual revenue
    """
    marta = MartaCRMBridge(db) if ads_service_available else None
    if not marta:
        # Fallback direct insert
        sale_id = f"sale_{datetime.now().timestamp()}"
        sale_doc = {
            "id": sale_id,
            "partner_id": partner_id,
            "amount": amount,
            "utm_source": utm_source,
            "utm_campaign": utm_campaign,
            "customer_email": customer_email,
            "sale_date": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.crm_sales.insert_one(sale_doc)
        # Return without _id
        return {
            "id": sale_id,
            "partner_id": partner_id,
            "amount": amount,
            "utm_source": utm_source,
            "created_at": sale_doc["created_at"]
        }
    
    return await marta.record_sale(partner_id, amount, utm_source, utm_campaign, customer_email)

@api_router.get("/stefania/api/crm/sales/{partner_id}")
async def get_partner_crm_sales(partner_id: str, days: int = 30):
    """Get CRM sales data for a partner"""
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    sales = await db.crm_sales.find({
        "partner_id": partner_id,
        "sale_date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(500)
    
    total_revenue = sum(s.get("amount", 0) for s in sales)
    
    # Group by UTM source
    by_source = {}
    for sale in sales:
        source = sale.get("utm_source", "direct")
        if source not in by_source:
            by_source[source] = {"revenue": 0, "count": 0}
        by_source[source]["revenue"] += sale.get("amount", 0)
        by_source[source]["count"] += 1
    
    return {
        "partner_id": partner_id,
        "total_sales": len(sales),
        "total_revenue": total_revenue,
        "by_source": by_source,
        "sales": sales[:50]  # Return latest 50
    }

@api_router.post("/stefania/api/smart-optimization/check")
async def run_smart_optimization_check(
    partner_id: str = Form(...),
    cpl_meta: float = Form(0),
    cpl_linkedin: float = Form(0),
    threshold_meta: float = Form(15.0),
    threshold_linkedin: float = Form(25.0)
):
    """
    Manual Smart-Optimization check
    Compare current CPL against Business Plan thresholds
    """
    alerts = []
    
    # Check Meta CPL
    if cpl_meta > 0 and cpl_meta > threshold_meta:
        severity = "critical" if cpl_meta > threshold_meta * 1.5 else "warning"
        alert = {
            "id": f"alert_meta_{datetime.now().timestamp()}",
            "partner_id": partner_id,
            "platform": "meta",
            "alert_type": "cpl_exceeded",
            "severity": severity,
            "current_value": cpl_meta,
            "threshold_value": threshold_meta,
            "message": f"CPL Meta di €{cpl_meta:.2f} supera la soglia Business Plan di €{threshold_meta:.2f}",
            "suggested_action": "Pausa campagne con performance bassa. Testa nuovi hook dalla Hook Gallery. Considera shift budget a LinkedIn se la qualità lead è superiore.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.performance_alerts.insert_one(alert)
        alerts.append(alert)
    
    # Check LinkedIn CPL
    if cpl_linkedin > 0 and cpl_linkedin > threshold_linkedin:
        severity = "critical" if cpl_linkedin > threshold_linkedin * 1.5 else "warning"
        alert = {
            "id": f"alert_linkedin_{datetime.now().timestamp()}",
            "partner_id": partner_id,
            "platform": "linkedin",
            "alert_type": "cpl_exceeded",
            "severity": severity,
            "current_value": cpl_linkedin,
            "threshold_value": threshold_linkedin,
            "message": f"CPL LinkedIn di €{cpl_linkedin:.2f} supera la soglia Business Plan di €{threshold_linkedin:.2f}",
            "suggested_action": "Verifica targeting ABM. Analizza qualità dei lead. Considera ottimizzazione lead form o cambio creatività.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.performance_alerts.insert_one(alert)
        alerts.append(alert)
    
    # Create notification if alerts triggered
    if alerts:
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        notification = Notification(
            type="escalation",
            icon="📉",
            title="STEFANIA Smart-Optimization Alert",
            body=f"{len(alerts)} alert CPL per {partner['name'] if partner else partner_id}",
            time=datetime.now().strftime("%H:%M"),
            partner=partner["name"] if partner else partner_id,
            action="war_mode"
        )
        await db.notifications.insert_one(notification.model_dump())
    
    return {
        "partner_id": partner_id,
        "alerts_triggered": len(alerts),
        "alerts": alerts,
        "status": "critical" if any(a["severity"] == "critical" for a in alerts) else "warning" if alerts else "ok"
    }

# =============================================================================
# ATLAS MODULE - POST-SALE & LTV ROUTES
# =============================================================================

# Gamification unlock conditions
UNLOCK_CONDITIONS = {
    "progress_50": {"type": "progress", "threshold": 50, "label": "Completa 50% del corso"},
    "progress_100": {"type": "progress", "threshold": 100, "label": "Completa tutto il corso"},
    "referral_1": {"type": "referral", "threshold": 1, "label": "Porta 1 amico"},
    "referral_3": {"type": "referral", "threshold": 3, "label": "Porta 3 amici"},
    "streak_7": {"type": "streak", "threshold": 7, "label": "7 giorni consecutivi"},
    "streak_30": {"type": "streak", "threshold": 30, "label": "30 giorni consecutivi"},
    "quiz_perfect": {"type": "quiz", "threshold": 100, "label": "Quiz con punteggio perfetto"},
    "feedback_given": {"type": "feedback", "threshold": 1, "label": "Lascia un feedback"}
}

@api_router.get("/atlas/students/{partner_id}")
async def get_partner_students(partner_id: str, status: str = None):
    """Get all students for a partner's academy"""
    query = {"partner_id": partner_id}
    if status:
        query["status"] = status
    
    students = await db.academy_students.find(query, {"_id": 0}).to_list(500)
    
    # Calculate summary stats
    total = len(students)
    active = len([s for s in students if s.get("status") == "active"])
    completed = len([s for s in students if s.get("status") == "completed"])
    avg_progress = sum(s.get("progress_percent", 0) for s in students) / total if total > 0 else 0
    
    return {
        "partner_id": partner_id,
        "total_students": total,
        "active": active,
        "completed": completed,
        "avg_progress": avg_progress,
        "students": students
    }

@api_router.post("/atlas/students/enroll")
async def enroll_student(
    partner_id: str = Form(...),
    email: str = Form(...),
    name: str = Form(...),
    utm_source: str = Form(None),
    referral_code: str = Form(None)
):
    """Enroll a new student in the academy"""
    # Generate unique referral code for this student
    student_referral_code = f"{partner_id[:4]}_{name[:3]}_{str(uuid.uuid4())[:6]}".upper()
    
    student = AcademyStudent(
        partner_id=partner_id,
        email=email,
        name=name,
        utm_source=utm_source,
        referral_code=student_referral_code,
        referred_by=referral_code
    )
    
    await db.academy_students.insert_one(student.model_dump())
    
    # If referred, update referral record
    if referral_code:
        await db.referral_records.update_one(
            {"referral_code": referral_code, "status": "pending"},
            {"$set": {"status": "converted", "conversion_value": 497}}  # Default course value
        )
    
    return {
        "success": True,
        "student_id": student.id,
        "referral_code": student_referral_code
    }

@api_router.post("/atlas/students/{student_id}/progress")
async def update_student_progress(
    student_id: str,
    progress_percent: float = Form(...),
    completed_module: str = Form(None)
):
    """Update student progress and check for bonus unlocks"""
    student = await db.academy_students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    update_data = {
        "progress_percent": progress_percent,
        "last_activity": datetime.now(timezone.utc).isoformat()
    }
    
    # Track completed modules
    completed_modules = student.get("completed_modules", [])
    if completed_module and completed_module not in completed_modules:
        completed_modules.append(completed_module)
        update_data["completed_modules"] = completed_modules
        update_data["gamification_points"] = student.get("gamification_points", 0) + 50
    
    # Check status update
    if progress_percent >= 100:
        update_data["status"] = "completed"
    
    await db.academy_students.update_one({"id": student_id}, {"$set": update_data})
    
    # Check for bonus unlocks (Dynamic Content Unlock)
    unlocked_bonuses = await check_and_unlock_bonuses(student["partner_id"], student_id, progress_percent)
    
    return {
        "success": True,
        "progress": progress_percent,
        "points": update_data.get("gamification_points", student.get("gamification_points", 0)),
        "new_unlocks": unlocked_bonuses
    }

async def check_and_unlock_bonuses(partner_id: str, student_id: str, progress: float) -> List[Dict]:
    """Check if student qualifies for any bonus unlocks"""
    student = await db.academy_students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        return []
    
    already_unlocked = student.get("unlocked_bonuses", [])
    
    # Get available bonuses
    bonuses = await db.bonus_content.find(
        {"partner_id": partner_id, "is_active": True},
        {"_id": 0}
    ).to_list(50)
    
    newly_unlocked = []
    
    for bonus in bonuses:
        if bonus["id"] in already_unlocked:
            continue
        
        condition = bonus.get("unlock_condition", "")
        threshold = bonus.get("unlock_threshold", 0)
        
        unlocked = False
        
        if condition.startswith("progress_"):
            unlocked = progress >= threshold
        elif condition == "referral_1":
            referral_count = await db.referral_records.count_documents({
                "referrer_student_id": student_id,
                "status": "converted"
            })
            unlocked = referral_count >= 1
        elif condition == "referral_3":
            referral_count = await db.referral_records.count_documents({
                "referrer_student_id": student_id,
                "status": "converted"
            })
            unlocked = referral_count >= 3
        elif condition == "feedback_given":
            feedback_count = await db.student_feedback.count_documents({"student_id": student_id})
            unlocked = feedback_count >= 1
        
        if unlocked:
            already_unlocked.append(bonus["id"])
            newly_unlocked.append({
                "bonus_id": bonus["id"],
                "title": bonus["title"],
                "points": bonus.get("points_value", 100)
            })
    
    if newly_unlocked:
        new_points = sum(b["points"] for b in newly_unlocked)
        await db.academy_students.update_one(
            {"id": student_id},
            {
                "$set": {"unlocked_bonuses": already_unlocked},
                "$inc": {"gamification_points": new_points}
            }
        )
    
    return newly_unlocked

@api_router.get("/atlas/bonuses/{partner_id}")
async def get_partner_bonuses(partner_id: str):
    """Get all bonus content for a partner"""
    bonuses = await db.bonus_content.find({"partner_id": partner_id}, {"_id": 0}).to_list(50)
    return bonuses

@api_router.post("/atlas/bonuses")
async def create_bonus_content(
    partner_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    content_type: str = Form("video"),
    unlock_condition: str = Form("progress_50"),
    unlock_threshold: int = Form(50),
    points_value: int = Form(100)
):
    """Create a new bonus content"""
    bonus = BonusContent(
        partner_id=partner_id,
        title=title,
        description=description,
        content_type=content_type,
        unlock_condition=unlock_condition,
        unlock_threshold=unlock_threshold,
        points_value=points_value
    )
    
    await db.bonus_content.insert_one(bonus.model_dump())
    return {"success": True, "bonus_id": bonus.id}

# =============================================================================
# ATLAS - FEEDBACK-TO-COPY BRIDGE (STEFANIA)
# =============================================================================

@api_router.post("/atlas/feedback")
async def submit_student_feedback(
    partner_id: str = Form(...),
    student_id: str = Form(...),
    content: str = Form(...),
    feedback_type: str = Form("comment"),
    module_id: str = Form(None)
):
    """Submit student feedback for analysis"""
    feedback = StudentFeedback(
        partner_id=partner_id,
        student_id=student_id,
        content=content,
        feedback_type=feedback_type,
        module_id=module_id
    )
    
    await db.student_feedback.insert_one(feedback.model_dump())
    
    # Check for bonus unlock
    await check_and_unlock_bonuses(partner_id, student_id, 0)
    
    return {"success": True, "feedback_id": feedback.id}

@api_router.get("/atlas/feedback/{partner_id}")
async def get_partner_feedback(partner_id: str, analyzed: bool = None):
    """Get all feedback for a partner"""
    query = {"partner_id": partner_id}
    if analyzed is not None:
        query["analyzed"] = analyzed
    
    feedback = await db.student_feedback.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return feedback

@api_router.post("/atlas/feedback/analyze/{partner_id}")
async def analyze_feedback_for_copy(partner_id: str):
    """
    STEFANIA analyzes student feedback to extract copy angles
    Runs Feedback-to-Copy Bridge analysis
    """
    # Get unanalyzed feedback
    feedback_list = await db.student_feedback.find(
        {"partner_id": partner_id, "analyzed": False},
        {"_id": 0}
    ).to_list(100)
    
    if not feedback_list:
        return {"message": "No new feedback to analyze", "angles": []}
    
    # Get partner info
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    partner_name = partner["name"] if partner else "Partner"
    partner_niche = partner.get("niche", "coaching")
    
    # Build analysis prompt for STEFANIA
    feedback_texts = "\n".join([
        f"[{f['feedback_type'].upper()}] {f['content']}" 
        for f in feedback_list[:30]  # Limit to 30 for API
    ])
    
    analysis_prompt = f"""Sei STEFANIA, Copy Strategist di Evolution PRO. Analizza i feedback degli studenti di {partner_name} ({partner_niche}) per estrarre nuovi angoli di copy per il marketing.

FEEDBACK DEGLI STUDENTI:
{feedback_texts}

🎯 OBIETTIVO: Identifica pattern ricorrenti che possono diventare:
1. PAIN POINTS: Frustrazioni o problemi che i potenziali clienti hanno
2. SUCCESS STORIES: Trasformazioni o risultati che gli studenti hanno ottenuto
3. OBIEZIONI: Dubbi o resistenze che possiamo anticipare nel copy
4. DESIDERI: Aspirazioni o obiettivi che motivano all'acquisto

Per ogni angolo trovato, genera:
- Un headline per un hook pubblicitario
- Una breve descrizione dell'angolo
- Il tipo (pain_point, success_story, objection, desire)
- Score di rilevanza (0.0-1.0) basato su quanti feedback lo supportano

Rispondi in JSON:
{{"angles": [
    {{"type": "pain_point", "headline": "...", "description": "...", "relevance_score": 0.8}},
    ...
]}}
"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"atlas_analysis_{partner_id}_{datetime.now().timestamp()}",
            system_message="Sei STEFANIA, Copy Strategist. Estrai insight di marketing dai feedback degli studenti."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=analysis_prompt))
        
        # Parse JSON response
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        angles_data = {"angles": []}
        
        if json_match:
            try:
                angles_data = json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        # Save angles to database
        saved_angles = []
        feedback_ids = [f["id"] for f in feedback_list]
        
        for angle in angles_data.get("angles", []):
            suggestion = CopyAngleSuggestion(
                partner_id=partner_id,
                angle_type=angle.get("type", "pain_point"),
                headline=angle.get("headline", ""),
                description=angle.get("description", ""),
                relevance_score=angle.get("relevance_score", 0.5),
                source_feedbacks=feedback_ids[:10]
            )
            await db.copy_angle_suggestions.insert_one(suggestion.model_dump())
            saved_angles.append({
                "id": suggestion.id,
                "type": suggestion.angle_type,
                "headline": suggestion.headline,
                "relevance_score": suggestion.relevance_score
            })
        
        # Mark feedback as analyzed
        await db.student_feedback.update_many(
            {"id": {"$in": feedback_ids}},
            {"$set": {"analyzed": True}}
        )
        
        # Create notification
        if saved_angles:
            notification = Notification(
                type="insight",
                icon="💡",
                title="ATLAS: Nuovi Angoli di Copy",
                body=f"STEFANIA ha estratto {len(saved_angles)} nuovi angoli dai feedback di {partner_name}",
                time=datetime.now().strftime("%H:%M"),
                partner=partner_name,
                action="atlas"
            )
            await db.notifications.insert_one(notification.model_dump())
        
        return {
            "success": True,
            "feedback_analyzed": len(feedback_list),
            "angles_extracted": len(saved_angles),
            "angles": saved_angles
        }
        
    except Exception as e:
        logging.error(f"Feedback analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/atlas/copy-angles/{partner_id}")
async def get_copy_angle_suggestions(partner_id: str, unused_only: bool = False):
    """Get STEFANIA's copy angle suggestions"""
    query = {"partner_id": partner_id}
    if unused_only:
        query["used_in_campaign"] = False
    
    angles = await db.copy_angle_suggestions.find(
        query, {"_id": 0}
    ).sort("relevance_score", -1).to_list(50)
    
    return angles

@api_router.post("/atlas/copy-angles/{angle_id}/use")
async def mark_angle_as_used(angle_id: str):
    """Mark a copy angle as used in a campaign"""
    await db.copy_angle_suggestions.update_one(
        {"id": angle_id},
        {"$set": {"used_in_campaign": True}}
    )
    return {"success": True}

# =============================================================================
# ATLAS - LTV DASHBOARD
# =============================================================================

@api_router.get("/atlas/ltv-dashboard/{partner_id}")
async def get_ltv_dashboard(partner_id: str):
    """
    LTV Dashboard: Shows complete asset value for a partner
    - Active students
    - Completion rate
    - Referral value
    - Total LTV
    """
    # Get students
    students = await db.academy_students.find({"partner_id": partner_id}, {"_id": 0}).to_list(1000)
    
    total_students = len(students)
    active_students = len([s for s in students if s.get("status") == "active"])
    completed_students = len([s for s in students if s.get("status") == "completed"])
    churned_students = len([s for s in students if s.get("status") in ["inactive", "churned"]])
    
    # Calculate completion rate
    completion_rate = (completed_students / total_students * 100) if total_students > 0 else 0
    
    # Average progress
    avg_progress = sum(s.get("progress_percent", 0) for s in students) / total_students if total_students > 0 else 0
    
    # Get referral data
    referrals = await db.referral_records.find({"partner_id": partner_id}, {"_id": 0}).to_list(500)
    total_referrals = len(referrals)
    converted_referrals = len([r for r in referrals if r.get("status") == "converted"])
    referral_revenue = sum(r.get("conversion_value", 0) for r in referrals if r.get("status") == "converted")
    
    # Get sales data
    sales = await db.crm_sales.find({"partner_id": partner_id}, {"_id": 0}).to_list(500)
    direct_revenue = sum(s.get("amount", 0) for s in sales)
    
    # Calculate LTV metrics
    base_course_value = 497  # Default course price
    total_asset_value = (total_students * base_course_value) + referral_revenue
    
    avg_ltv = total_asset_value / total_students if total_students > 0 else 0
    
    # Gamification stats
    total_points = sum(s.get("gamification_points", 0) for s in students)
    top_students = sorted(students, key=lambda x: x.get("gamification_points", 0), reverse=True)[:5]
    
    # Bonus unlocks
    total_unlocks = sum(len(s.get("unlocked_bonuses", [])) for s in students)
    
    return {
        "partner_id": partner_id,
        "students": {
            "total": total_students,
            "active": active_students,
            "completed": completed_students,
            "churned": churned_students,
            "completion_rate": completion_rate,
            "avg_progress": avg_progress
        },
        "referrals": {
            "total": total_referrals,
            "converted": converted_referrals,
            "conversion_rate": (converted_referrals / total_referrals * 100) if total_referrals > 0 else 0,
            "revenue": referral_revenue
        },
        "revenue": {
            "direct": direct_revenue,
            "referral": referral_revenue,
            "total": direct_revenue + referral_revenue
        },
        "ltv": {
            "total_asset_value": total_asset_value,
            "avg_ltv_per_student": avg_ltv,
            "base_course_value": base_course_value
        },
        "gamification": {
            "total_points_earned": total_points,
            "total_bonuses_unlocked": total_unlocks,
            "top_students": [{
                "name": s.get("name"),
                "points": s.get("gamification_points", 0),
                "progress": s.get("progress_percent", 0)
            } for s in top_students]
        }
    }

@api_router.post("/atlas/referral/create")
async def create_referral(
    partner_id: str = Form(...),
    referrer_student_id: str = Form(...),
    referred_email: str = Form(...)
):
    """Create a new referral record"""
    student = await db.academy_students.find_one({"id": referrer_student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    referral_code = student.get("referral_code", f"REF_{referrer_student_id[:8]}")
    
    referral = ReferralRecord(
        partner_id=partner_id,
        referrer_student_id=referrer_student_id,
        referred_email=referred_email,
        referral_code=referral_code
    )
    
    await db.referral_records.insert_one(referral.model_dump())
    
    return {
        "success": True,
        "referral_id": referral.id,
        "referral_code": referral_code,
        "share_link": f"https://systeme.io/{partner_id}?ref={referral_code}"
    }

@api_router.get("/atlas/referrals/{partner_id}")
async def get_partner_referrals(partner_id: str):
    """Get all referrals for a partner"""
    referrals = await db.referral_records.find({"partner_id": partner_id}, {"_id": 0}).to_list(500)
    return referrals

# =============================================================================
# ROUTES - ANDREA (Video Production Support)
# =============================================================================

def build_andrea_system_prompt(partner_name: str, partner_niche: str, current_block: str = None, recording_status: str = None):
    """Build the system prompt for ANDREA - Video Production tutor"""
    
    block_tips = {
        "hook": "Il GANCIO deve essere registrato con energia ALTA. Guarda dritto in camera, voce forte e sicura. Questo è il momento di 'svegliare' il pubblico.",
        "grande_promessa": "La GRANDE PROMESSA richiede convinzione assoluta. Rallenta leggermente, sottolinea i numeri con pause strategiche.",
        "metodo": "IL METODO va spiegato con chiarezza didattica ma NON monotona. Usa le mani per i 3 pilastri, crea movimento.",
        "case_history": "La CASE HISTORY è storytelling: abbassa leggermente il tono quando descrivi il 'prima', poi alzalo per il 'dopo'. Sorridi raccontando il successo.",
        "offerta": "L'OFFERTA deve essere presentata con entusiasmo genuino. Ogni bonus è un regalo - fai trasparire la generosità.",
        "cta": "La CTA finale: guarda fisso in camera, voce decisa, pausa prima del comando. 'Clicca. Ora.' - non 'se ti interessa clicca'."
    }
    
    status_context = ""
    if recording_status == "setup":
        status_context = """
🎬 FASE ATTUALE: PRE-FLIGHT CHECK
Stai guidando il partner attraverso la checklist di setup. Verifica:
- Sfondo ordinato e professionale
- Luce frontale (no controluce)
- Microfono a 15-20cm dalla bocca
- Inquadratura dal petto in su, occhi al terzo superiore
- Ambiente silenzioso
- Script pronto e leggibile
"""
    elif recording_status == "recording":
        status_context = """
🎬 FASE ATTUALE: REGISTRAZIONE IN CORSO
Fornisci coaching energetico:
- Ricorda di NON spiegare ma GUIDARE
- Voce alta, tono convinto
- Se sbaglia, non fermarsi - taglio chirurgico in post
- Un blocco alla volta, pause tra i blocchi
"""
    elif recording_status == "review":
        status_context = """
🎬 FASE ATTUALE: REVIEW VIDEO CARICATO
Analizza il video e fornisci feedback su:
- Qualità audio (rumore, volume, chiarezza)
- Qualità video (luce, inquadratura, sfondo)
- Energia e presenza scenica
- Suggerimenti specifici per migliorare
"""
    
    block_context = ""
    if current_block and current_block in block_tips:
        block_context = f"\n\n📍 BLOCCO ATTUALE: {current_block.upper()}\n{block_tips[current_block]}"
    
    return f"""Sei ANDREA, il tutor di produzione video di Evolution PRO.
Il tuo ruolo è guidare i partner nella registrazione professionale della loro Masterclass.

PARTNER ATTUALE:
- Nome: {partner_name}
- Nicchia: {partner_niche}
{status_context}
{block_context}

🎯 IL TUO OBIETTIVO:
Trasformare il partner in un presentatore sicuro e magnetico. Non deve sembrare un robot che legge, ma un esperto appassionato che GUIDA il pubblico.

💪 IL TUO STILE:
- Incoraggiante ma tecnico
- Pratico e orientato all'azione
- Dai feedback specifici e actionable
- Se qualcosa non va, dillo chiaramente ma con tatto

📋 CHECKLIST PRE-REGISTRAZIONE:
1. ✅ Sfondo ordinato e coerente con il brand
2. ✅ Luce frontale (ring light o finestra davanti)
3. ✅ Microfono esterno a 15-20cm (no audio integrato)
4. ✅ Inquadratura: dal petto in su, occhi al terzo superiore
5. ✅ Ambiente silenzioso (spegni notifiche, condizionatore)
6. ✅ Script suddiviso in blocchi, pronto sul teleprompter

🎬 WORKFLOW:
1. Test video 30 secondi (Blocco 1 - Gancio)
2. Verifica tecnica audio/video
3. Registrazione blocco per blocco
4. Upload immediato → Surgical Cut automatico
5. Review e approvazione
6. Assembly finale con Intro/Outro

⚠️ ERRORI COMUNI DA CORREGGERE:
- Voce troppo bassa o monotona → "Alza il volume del 20%, come se parlassi a qualcuno in fondo alla stanza"
- Sguardo che fugge → "Fissa l'obiettivo come se fosse il tuo miglior cliente"
- Lettura robotica → "Parla come se stessi raccontando a un amico, non leggendo"
- Energia calante → "Pausa, respiro profondo, ricorda PERCHÉ fai questo"

Rispondi in italiano, con tono incoraggiante ma professionale. Massimo 4-5 frasi per risposta."""

@api_router.post("/andrea/chat")
async def chat_with_andrea(request: AndreaChatRequest):
    """Chat with ANDREA - Video Production tutor"""
    try:
        session_id = f"andrea_{request.session_id}"
        
        # Get chat history
        history = await db.chat_messages.find(
            {"session_id": session_id}, 
            {"_id": 0}
        ).sort("timestamp", 1).to_list(50)
        
        # Build ANDREA chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=build_andrea_system_prompt(
                request.partner_name,
                request.partner_niche,
                request.current_block,
                request.recording_status
            )
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Add history
        for msg in history:
            if msg["role"] == "user":
                await chat.send_message(UserMessage(text=msg["content"]))
        
        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message
        )
        await db.chat_messages.insert_one(user_msg.model_dump())
        
        # Get response
        response = await chat.send_message(UserMessage(text=request.message))
        
        # Save assistant response
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=response
        )
        await db.chat_messages.insert_one(assistant_msg.model_dump())
        
        return {"response": response, "timestamp": assistant_msg.timestamp, "tutor": "ANDREA"}
        
    except Exception as e:
        logging.error(f"Andrea chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/andrea/preflight/{partner_id}")
async def get_preflight_check(partner_id: str):
    """Get pre-flight checklist for a partner"""
    preflight = await db.preflight_checks.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    if not preflight:
        return {
            "partner_id": partner_id,
            "checklist": {
                "sfondo_ordinato": False,
                "luce_frontale": False,
                "microfono_posizionato": False,
                "inquadratura_corretta": False,
                "silenzio_ambiente": False,
                "script_pronto": False
            },
            "test_video_uploaded": False,
            "test_video_approved": False
        }
    return preflight

@api_router.post("/andrea/preflight/{partner_id}")
async def update_preflight_check(partner_id: str, checklist: Dict[str, bool]):
    """Update pre-flight checklist"""
    existing = await db.preflight_checks.find_one({"partner_id": partner_id})
    
    if existing:
        await db.preflight_checks.update_one(
            {"partner_id": partner_id},
            {"$set": {
                "checklist": checklist,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        preflight = PreFlightCheck(partner_id=partner_id, checklist=checklist)
        await db.preflight_checks.insert_one(preflight.model_dump())
    
    return {"success": True}

@api_router.get("/andrea/blocks/{partner_id}")
async def get_video_blocks(partner_id: str):
    """Get all video blocks for a partner's production"""
    blocks = await db.video_blocks.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(10)
    
    if not blocks:
        # Initialize blocks from approved script
        script = await db.masterclass_scripts.find_one({"partner_id": partner_id}, {"_id": 0})
        if script and script.get("blocks"):
            block_labels = {
                "hook": "Il Gancio",
                "grande_promessa": "Grande Promessa", 
                "metodo": "Il Metodo",
                "case_history": "Case History",
                "offerta": "L'Offerta",
                "cta": "Call to Action"
            }
            blocks = []
            for block_type, label in block_labels.items():
                content = script["blocks"].get(block_type, "")
                if content.strip():
                    block = VideoBlock(
                        partner_id=partner_id,
                        block_type=block_type,
                        block_label=label,
                        script_content=content
                    )
                    await db.video_blocks.insert_one(block.model_dump())
                    blocks.append(block.model_dump())
    
    return blocks

@api_router.post("/andrea/blocks/{partner_id}/{block_type}/upload")
async def upload_block_video(
    partner_id: str,
    block_type: str,
    file: UploadFile = File(...)
):
    """Upload a video for a specific block and trigger Surgical Cut"""
    # Upload the file
    result = await file_storage.upload_file(file, partner_id, "video")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Upload failed")
    
    # Update block status
    await db.video_blocks.update_one(
        {"partner_id": partner_id, "block_type": block_type},
        {"$set": {
            "status": "uploaded",
            "video_file": result["stored_name"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Trigger Surgical Cut processing in background
    # Note: In production, this would be a background task
    
    return {
        "success": True,
        "block_type": block_type,
        "video_file": result["stored_name"],
        "message": "Video caricato! ANDREA sta applicando il Surgical Cut..."
    }

@api_router.post("/andrea/blocks/{partner_id}/{block_type}/approve")
async def approve_block_video(partner_id: str, block_type: str):
    """Approve a block video after review"""
    await db.video_blocks.update_one(
        {"partner_id": partner_id, "block_type": block_type},
        {"$set": {
            "status": "approved",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Check if all blocks are approved
    blocks = await db.video_blocks.find({"partner_id": partner_id}, {"_id": 0}).to_list(10)
    all_approved = all(b.get("status") == "approved" for b in blocks if b.get("script_content"))
    
    if all_approved:
        # Create notification for admin
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        notification = Notification(
            type="video",
            icon="🎬",
            title="Masterclass Pronta per Assembly",
            body=f"Tutti i blocchi video di {partner['name']} sono approvati. Pronto per assembly finale.",
            time=datetime.now().strftime("%H:%M"),
            partner=partner["name"],
            action="andrea"
        )
        await db.notifications.insert_one(notification.model_dump())
    
    return {"success": True, "all_approved": all_approved}

@api_router.post("/andrea/assembly/{partner_id}")
async def assemble_final_video(partner_id: str, request: VideoAssemblyRequest):
    """Assemble all approved blocks into final video with intro/outro"""
    blocks = await db.video_blocks.find(
        {"partner_id": partner_id, "status": "approved"},
        {"_id": 0}
    ).to_list(10)
    
    if not blocks:
        raise HTTPException(status_code=400, detail="No approved blocks to assemble")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    brandkit = await db.brand_kits.find_one({"partner_id": partner_id}, {"_id": 0})
    
    # In production, this would trigger FFmpeg concatenation
    # For now, we simulate the process
    
    assembly_result = {
        "partner_id": partner_id,
        "partner_name": partner["name"],
        "blocks_assembled": len(blocks),
        "include_intro": request.include_intro,
        "include_outro": request.include_outro,
        "status": "processing",
        "message": "Assembly in corso... ANDREA sta concatenando i blocchi con Intro/Outro brandizzate."
    }
    
    # Create notification
    notification = Notification(
        type="video",
        icon="🎬",
        title="Assembly Video Avviato",
        body=f"ANDREA sta assemblando la Masterclass di {partner['name']} ({len(blocks)} blocchi)",
        time=datetime.now().strftime("%H:%M"),
        partner=partner["name"],
        action="andrea"
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return assembly_result

# =============================================================================
# ROUTES - MASTERCLASS SCRIPTS
# =============================================================================

@api_router.get("/masterclass/script/{partner_id}")
async def get_masterclass_script(partner_id: str):
    """Get the masterclass script for a partner"""
    script = await db.masterclass_scripts.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    if not script:
        # Return empty template
        return {
            "partner_id": partner_id,
            "status": "new",
            "blocks": {
                "hook": "",
                "grande_promessa": "",
                "metodo": "",
                "case_history": "",
                "offerta": "",
                "cta": ""
            }
        }
    return script

@api_router.post("/masterclass/script/{partner_id}")
async def save_masterclass_script(partner_id: str, update: MasterclassScriptUpdate):
    """Save or update masterclass script"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    existing = await db.masterclass_scripts.find_one({"partner_id": partner_id})
    
    if existing:
        await db.masterclass_scripts.update_one(
            {"partner_id": partner_id},
            {"$set": {
                "blocks": update.blocks,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        script = MasterclassScript(
            partner_id=partner_id,
            partner_name=partner["name"],
            blocks=update.blocks
        )
        await db.masterclass_scripts.insert_one(script.model_dump())
    
    return {"success": True, "partner_id": partner_id}

@api_router.post("/masterclass/script/{partner_id}/submit")
async def submit_script_for_review(partner_id: str):
    """Submit script for STEFANIA review"""
    script = await db.masterclass_scripts.find_one({"partner_id": partner_id}, {"_id": 0})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Get review from STEFANIA
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    review_result = await stefania_review_script(ScriptReviewRequest(
        partner_id=partner_id,
        partner_name=partner["name"],
        script_blocks=script["blocks"]
    ))
    
    # Update script status
    new_status = "needs_revision" if review_result["needs_admin_review"] else "approved"
    await db.masterclass_scripts.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "status": new_status,
            "stefania_feedback": review_result["review"],
            "last_review_at": review_result["reviewed_at"]
        }}
    )
    
    return {
        "status": new_status,
        "feedback": review_result["review"],
        "needs_admin_review": review_result["needs_admin_review"]
    }

# =============================================================================
# ROUTES - BRAND KIT
# =============================================================================

@api_router.get("/brandkit/{partner_id}")
async def get_brand_kit(partner_id: str):
    """Get brand kit for a partner"""
    brandkit = await db.brand_kits.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    if not brandkit:
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        return {
            "partner_id": partner_id,
            "nome_partner": partner["name"],
            "brand_color": "#F5C518",
            "brand_color_secondary": "#1a2332",
            "logo_url": None,
            "tagline": None
        }
    return brandkit

@api_router.post("/brandkit/{partner_id}")
async def update_brand_kit(partner_id: str, update: PartnerBrandKitUpdate):
    """Update brand kit for a partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    existing = await db.brand_kits.find_one({"partner_id": partner_id})
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        await db.brand_kits.update_one(
            {"partner_id": partner_id},
            {"$set": update_data}
        )
    else:
        brandkit = PartnerBrandKit(
            partner_id=partner_id,
            nome_partner=partner["name"],
            **update_data
        )
        await db.brand_kits.insert_one(brandkit.model_dump())
    
    return {"success": True, "partner_id": partner_id}

# =============================================================================
# ROUTES - NOTIFICATIONS
# =============================================================================

@api_router.get("/notifications")
async def get_notifications(limit: int = 20):
    """Get recent notifications"""
    notifications = await db.notifications.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return notifications

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.post("/notifications/mark-all-read")
async def mark_all_notifications_read():
    """Mark all notifications as read"""
    await db.notifications.update_many({}, {"$set": {"read": True}})
    return {"success": True}

# =============================================================================
# ROUTES - FILE STORAGE (Native File Manager)
# =============================================================================

@api_router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    partner_id: str = Form(...),
    category: str = Form(default="document")
):
    """Upload a file (video or document) for a partner"""
    result = await file_storage.upload_file(file, partner_id, category)
    
    if result["success"]:
        # Save file metadata to database
        file_record = StoredFile(
            file_id=result["file_id"],
            original_name=result["original_name"],
            stored_name=result["stored_name"],
            file_type=result["file_type"],
            partner_id=partner_id,
            status=result["status"],
            internal_url=result["internal_url"],
            size=result["size"],
            uploaded_at=result["uploaded_at"]
        )
        await db.files.insert_one(file_record.model_dump())
        
        # Update agent status (ANDREA for videos, LUCA for documents)
        if result["file_type"] == "video":
            await db.agents.update_one({"id": "ANDREA"}, {"$set": {"status": "ACTIVE"}})
        else:
            await db.agents.update_one({"id": "LUCA"}, {"$set": {"status": "ACTIVE"}})
    
    return result

@api_router.get("/files")
async def list_files(
    category: str = "all",
    status: str = "all",
    partner_id: Optional[str] = None
):
    """List files in storage"""
    return file_storage.list_files(category, status, partner_id)

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    """Serve a file from storage"""
    file_path = file_storage.get_file_path(path)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@api_router.get("/storage/stats")
async def get_storage_stats():
    """Get storage usage statistics"""
    return file_storage.get_storage_stats()

@api_router.post("/files/documents/{filename}/verify")
async def verify_document(filename: str):
    """Mark a document as verified (LUCA compliance check)"""
    result = file_storage.verify_document(filename)
    if result["success"]:
        # Update database
        await db.files.update_one(
            {"stored_name": filename},
            {"$set": {
                "status": "verified",
                "verified_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    return result

@api_router.delete("/files/documents/{filename}/reject")
async def reject_document(filename: str, reason: str = ""):
    """Reject and delete a document"""
    result = file_storage.reject_document(filename, reason)
    if result["success"]:
        await db.files.delete_one({"stored_name": filename})
    return result

# =============================================================================
# ROUTES - VIDEO PROCESSING (ANDREA Pipeline)
# =============================================================================

@api_router.post("/videos/process")
async def start_video_processing(request: VideoProcessRequest, background_tasks: BackgroundTasks):
    """Start video processing job"""
    # Create job record
    job = VideoJob(
        partner_id=request.partner_id,
        partner_name=request.partner_name,
        input_file=request.input_file,
        status="queued"
    )
    
    await db.video_jobs.insert_one(job.model_dump())
    
    # Update ANDREA status
    await db.agents.update_one({"id": "ANDREA"}, {"$set": {"status": "ACTIVE"}})
    
    # Add processing to background tasks
    background_tasks.add_task(
        process_video_background,
        job.id,
        request.input_file,
        request.partner_name,
        request.auto_trim,
        request.remove_fillers,
        request.apply_speed,
        request.normalize,
        request.add_branding
    )
    
    return {"job_id": job.id, "status": "queued", "message": "Video processing started"}

async def process_video_background(
    job_id: str, input_file: str, partner_name: str,
    auto_trim: bool, remove_fillers: bool, apply_speed: bool,
    normalize: bool, add_branding: bool
):
    """Background task for video processing"""
    try:
        # Update status to processing
        await db.video_jobs.update_one(
            {"id": job_id},
            {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Process video
        result = await video_processor.process_video(
            job_id, input_file, partner_name,
            auto_trim, remove_fillers, apply_speed,
            normalize, add_branding
        )
        
        # Update job with result
        if result["success"]:
            await db.video_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": "completed",
                    "output_file": result["output_file"],
                    "processing_result": result,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            await db.video_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": "failed",
                    "processing_result": result,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Create alert for failed processing
            alert = Alert(
                agent="ANDREA",
                type="BLOCCO",
                msg=f"Video processing failed: {result.get('error', 'Unknown error')}",
                partner=partner_name,
                time="adesso"
            )
            await db.alerts.insert_one(alert.model_dump())
        
    except Exception as e:
        logging.exception(f"Video processing background task failed: {e}")
        await db.video_jobs.update_one(
            {"id": job_id},
            {"$set": {
                "status": "failed",
                "processing_result": {"error": str(e)},
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

@api_router.get("/videos/jobs")
async def list_video_jobs(status: Optional[str] = None, partner_id: Optional[str] = None):
    """List video processing jobs"""
    query = {}
    if status:
        query["status"] = status
    if partner_id:
        query["partner_id"] = partner_id
    
    jobs = await db.video_jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return jobs

@api_router.get("/videos/jobs/{job_id}")
async def get_video_job(job_id: str):
    """Get video job details"""
    job = await db.video_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@api_router.post("/videos/jobs/{job_id}/approve")
async def approve_video(job_id: str):
    """Approve a processed video"""
    job = await db.video_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Video must be in 'completed' status to approve")
    
    # Move to approved folder
    result = video_processor.approve_video(job_id)
    
    if result["success"]:
        # Generate YouTube-ready URL placeholder (actual upload requires YouTube API)
        youtube_placeholder = f"https://youtube.com/upload?title={job['partner_name']}_Evolution_PRO"
        
        await db.video_jobs.update_one(
            {"id": job_id},
            {"$set": {
                "status": "approved",
                "youtube_url": youtube_placeholder,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update ANDREA budget (increment for completed work)
        await db.agents.update_one(
            {"id": "ANDREA"},
            {"$inc": {"budget": 5}}
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "status": "approved",
            "internal_url": result["internal_url"],
            "youtube_ready": True,
            "message": "Video approved! Ready for YouTube upload to Evolution PRO channel."
        }
    
    return result

@api_router.delete("/videos/jobs/{job_id}")
async def delete_video_job(job_id: str):
    """Delete a video job and associated files"""
    job = await db.video_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete associated files
    if job.get("output_file"):
        try:
            processed_path = Path(f"/app/storage/videos/processed/{job['output_file']}")
            if processed_path.exists():
                processed_path.unlink()
        except:
            pass
    
    await db.video_jobs.delete_one({"id": job_id})
    return {"status": "deleted", "job_id": job_id}

# =============================================================================
# ROUTES - COMPLIANCE DASHBOARD (LUCA)
# =============================================================================

@api_router.get("/compliance/pending")
async def get_pending_documents():
    """Get documents pending verification for compliance dashboard"""
    docs = file_storage.list_files(category="document", status="pending")
    return {
        "count": len(docs),
        "documents": docs
    }

@api_router.get("/compliance/stats")
async def get_compliance_stats():
    """Get compliance statistics for LUCA dashboard"""
    all_docs = file_storage.list_files(category="document")
    pending = [d for d in all_docs if d["status"] == "pending"]
    verified = [d for d in all_docs if d["status"] == "verified"]
    
    return {
        "total_documents": len(all_docs),
        "pending_count": len(pending),
        "verified_count": len(verified),
        "verification_rate": round(len(verified) / max(len(all_docs), 1) * 100, 1)
    }

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
    
    # Video processing stats
    video_jobs = await db.video_jobs.find({}, {"_id": 0}).to_list(1000)
    videos_processing = sum(1 for j in video_jobs if j.get("status") == "processing")
    videos_pending_approval = sum(1 for j in video_jobs if j.get("status") == "completed")
    videos_approved = sum(1 for j in video_jobs if j.get("status") == "approved")
    videos_uploaded = sum(1 for j in video_jobs if j.get("status") == "uploaded")
    
    # Storage stats
    storage_stats = file_storage.get_storage_stats()
    
    # YouTube auth status
    youtube_auth = youtube_uploader.is_authenticated()
    
    return {
        "total_partners": total_partners,
        "active_partners": active_partners,
        "total_revenue": total_revenue,
        "alerts_count": alerts_count,
        "phase_distribution": phase_dist,
        "videos": {
            "processing": videos_processing,
            "pending_approval": videos_pending_approval,
            "approved": videos_approved,
            "uploaded": videos_uploaded
        },
        "storage": storage_stats,
        "youtube_authenticated": youtube_auth
    }

# =============================================================================
# ROUTES - YOUTUBE UPLOAD
# =============================================================================

@api_router.post("/youtube/config")
async def set_youtube_config(file: UploadFile = File(...)):
    """Upload YouTube OAuth client_secret.json"""
    try:
        content = await file.read()
        config = json.loads(content.decode())
        youtube_uploader.set_client_config(config)
        return {"success": True, "message": "YouTube config saved"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/youtube/auth-url")
async def get_youtube_auth_url():
    """Get OAuth authorization URL"""
    try:
        url = youtube_uploader.get_auth_url()
        return {"auth_url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/youtube/complete-auth")
async def complete_youtube_auth(auth_code: str):
    """Complete OAuth flow with authorization code"""
    success = youtube_uploader.complete_auth(auth_code)
    if success:
        return {"success": True, "message": "YouTube authentication completed"}
    raise HTTPException(status_code=400, detail="Authentication failed")

@api_router.get("/youtube/status")
async def get_youtube_status():
    """Check YouTube authentication status"""
    return {
        "authenticated": youtube_uploader.is_authenticated(),
        "config_exists": Path("/app/storage/client_secret.json").exists()
    }

@api_router.post("/youtube/upload/{job_id}")
async def upload_to_youtube(job_id: str, request: YouTubeUploadRequest, background_tasks: BackgroundTasks):
    """Upload approved video to YouTube"""
    if not youtube_uploader.is_authenticated():
        raise HTTPException(status_code=401, detail="YouTube not authenticated")
    
    job = await db.video_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] != "approved":
        raise HTTPException(status_code=400, detail="Video must be approved first")
    
    # Get partner info
    partner = await db.partners.find_one({"id": job["partner_id"]}, {"_id": 0})
    partner_niche = partner.get("niche", "Business") if partner else "Business"
    
    # Get transcription from processing result
    transcription = ""
    if job.get("processing_result"):
        for step in job["processing_result"].get("processing_steps", []):
            if step.get("step") == "filler_detection":
                transcription = step.get("transcription_text", "")
                break
    
    # Start upload in background
    background_tasks.add_task(
        youtube_upload_background,
        job_id,
        job["partner_name"],
        partner_niche,
        request.title,
        request.lesson_title,
        request.module_title,
        transcription,
        request.privacy_status
    )
    
    return {"success": True, "message": "YouTube upload started", "job_id": job_id}

async def youtube_upload_background(
    job_id: str, partner_name: str, partner_niche: str,
    title: str, lesson_title: str, module_title: str,
    transcription: str, privacy_status: str
):
    """Background task for YouTube upload"""
    try:
        video_path = f"/app/storage/videos/approved/approved_{job_id}.mp4"
        
        result = await youtube_uploader.upload_video(
            video_path=video_path,
            title=title,
            partner_name=partner_name,
            partner_niche=partner_niche,
            lesson_title=lesson_title,
            module_title=module_title,
            transcription_text=transcription,
            privacy_status=privacy_status
        )
        
        if result["success"]:
            await db.video_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": "uploaded",
                    "youtube_url": result["video_url"],
                    "youtube_video_id": result["video_id"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            await db.video_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "youtube_error": result.get("error"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    except Exception as e:
        logging.exception(f"YouTube upload failed: {e}")

@api_router.delete("/youtube/revoke")
async def revoke_youtube_auth():
    """Revoke YouTube authentication"""
    youtube_uploader.revoke_credentials()
    return {"success": True, "message": "YouTube credentials revoked"}

# =============================================================================
# ROUTES - GAIA FUNNEL DEPLOYER (Systeme.io Templates)
# =============================================================================

@api_router.get("/gaia/templates")
async def list_systeme_templates(category: Optional[str] = None):
    """List Systeme.io funnel templates"""
    query = {}
    if category:
        query["category"] = category
    templates = await db.systeme_templates.find(query, {"_id": 0}).to_list(100)
    return templates

@api_router.post("/gaia/templates")
async def create_systeme_template(
    name: str = Form(...),
    category: str = Form(...),
    share_link: str = Form(...),
    description: str = Form(default=""),
    brand_variables: str = Form(default="Nome_Partner,Colore_Brand")
):
    """Add a new Systeme.io template"""
    template = SystemeTemplate(
        name=name,
        category=category,
        share_link=share_link,
        description=description,
        brand_variables=brand_variables.split(",")
    )
    await db.systeme_templates.insert_one(template.model_dump())
    
    # Update GAIA status
    await db.agents.update_one({"id": "GAIA"}, {"$set": {"status": "ACTIVE"}})
    
    return template

@api_router.delete("/gaia/templates/{template_id}")
async def delete_systeme_template(template_id: str):
    """Delete a Systeme.io template"""
    result = await db.systeme_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True}

@api_router.get("/gaia/templates/categories")
async def get_template_categories():
    """Get available template categories"""
    return {
        "categories": [
            {"id": "lead_gen", "name": "Lead Generation", "icon": "📧"},
            {"id": "masterclass", "name": "Masterclass", "icon": "🎓"},
            {"id": "vendita", "name": "Vendita", "icon": "💰"},
            {"id": "webinar", "name": "Webinar", "icon": "🎥"},
            {"id": "altri", "name": "Altri", "icon": "📁"}
        ]
    }

# =============================================================================
# ROUTES - BRAND KIT
# =============================================================================

@api_router.get("/gaia/brandkit/{partner_id}")
async def get_brand_kit(partner_id: str):
    """Get partner's brand kit"""
    kit = await db.brand_kits.find_one({"partner_id": partner_id}, {"_id": 0})
    if not kit:
        # Return default
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        return BrandKit(
            partner_id=partner_id,
            nome_partner=partner.get("name", "") if partner else ""
        ).model_dump()
    return kit

@api_router.post("/gaia/brandkit")
async def save_brand_kit(kit: BrandKit):
    """Save or update partner's brand kit"""
    await db.brand_kits.update_one(
        {"partner_id": kit.partner_id},
        {"$set": kit.model_dump()},
        upsert=True
    )
    return {"success": True, "brand_kit": kit}

@api_router.get("/gaia/brandkit/{partner_id}/preview")
async def preview_template_with_brand(partner_id: str, template_id: str):
    """Preview template variables replaced with brand kit"""
    kit = await db.brand_kits.find_one({"partner_id": partner_id}, {"_id": 0})
    template = await db.systeme_templates.find_one({"id": template_id}, {"_id": 0})
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Build variable replacements
    replacements = {
        "Nome_Partner": kit.get("nome_partner", "") if kit else "",
        "Colore_Brand": kit.get("colore_brand", "#F5C518") if kit else "#F5C518",
        "Logo_URL": kit.get("logo_url", "") if kit else "",
        "Email_Partner": kit.get("email_partner", "") if kit else "",
        "Telefono": kit.get("telefono", "") if kit else "",
        "Sito_Web": kit.get("sito_web", "") if kit else "",
    }
    
    return {
        "template": template,
        "replacements": replacements,
        "share_link": template["share_link"]
    }

# =============================================================================
# ROUTES - TTS (Intro/Outro Voice Generation)
# =============================================================================

@api_router.post("/tts/generate")
async def generate_tts(request: TTSRequest):
    """Generate TTS audio for intro/outro"""
    if request.type == "intro":
        result = await tts_generator.generate_intro(
            partner_name=request.partner_name,
            custom_text=request.text if request.text else None,
            voice=request.voice
        )
    else:
        result = await tts_generator.generate_outro(
            partner_name=request.partner_name,
            custom_text=request.text if request.text else None,
            voice=request.voice
        )
    
    return result

@api_router.get("/tts/voices")
async def list_tts_voices():
    """List available TTS voices"""
    return {"voices": tts_generator.list_available_voices()}

# =============================================================================
# COURSE BUILDER AI - STEFANIA
# =============================================================================

class CourseBuilderPreferences(BaseModel):
    duration: str  # 4-week, 8-week, self-paced
    level: str  # beginner, intermediate, advanced
    format: str  # video-only, video-pdf, video-workbook

class CourseBuilderRequest(BaseModel):
    partner_id: str
    positioning_data: Optional[Dict] = None
    preferences: CourseBuilderPreferences

class CourseBuilderChatRequest(BaseModel):
    message: str
    outline: Optional[Dict] = None
    selected_module: Optional[int] = None
    positioning_data: Optional[Dict] = None

class CourseOutlineSaveRequest(BaseModel):
    partner_id: str
    outline: Dict

@api_router.post("/stefania/course-builder/generate")
async def generate_course_structure(request: CourseBuilderRequest):
    """Generate course structure using STEFANIA AI"""
    
    # Build prompt for STEFANIA
    positioning_info = ""
    if request.positioning_data:
        positioning_info = f"""
POSIZIONAMENTO PARTNER:
- Trasformazione: {request.positioning_data.get('trasformazione', 'N/A')}
- Target: {request.positioning_data.get('target', 'N/A')}
- Problema principale: {request.positioning_data.get('problema', 'N/A')}
- Soluzione unica: {request.positioning_data.get('soluzione', 'N/A')}
"""
    
    duration_map = {
        "4-week": "4 settimane (corso intensivo, 5-6 moduli)",
        "8-week": "8 settimane (corso approfondito, 7-8 moduli)",
        "self-paced": "Self-paced (6-8 moduli, nessuna deadline)"
    }
    
    level_map = {
        "beginner": "Principiante (linguaggio semplice, step by step)",
        "intermediate": "Intermedio (ha basi, vuole approfondire)",
        "advanced": "Avanzato (esperto, cerca ottimizzazioni)"
    }
    
    format_map = {
        "video-only": "Solo video con slide integrate",
        "video-pdf": "Video + dispense PDF per modulo",
        "video-workbook": "Video + workbook interattivo con esercizi"
    }
    
    prompt = f"""Sei STEFANIA, esperta di Instructional Design per Evolution PRO.
    
{positioning_info}

PREFERENZE CORSO:
- Durata: {duration_map.get(request.preferences.duration, request.preferences.duration)}
- Livello: {level_map.get(request.preferences.level, request.preferences.level)}
- Formato: {format_map.get(request.preferences.format, request.preferences.format)}

Genera una struttura corso completa in formato JSON con questo schema esatto:
{{
    "corsoTitolo": "Titolo del corso",
    "durataStimata": "es. 4 settimane",
    "moduli": [
        {{
            "numero": 1,
            "titolo": "Titolo Modulo",
            "obiettivo": "Obiettivo del modulo",
            "lezioni": [
                {{
                    "numero": "1.1",
                    "titolo": "Titolo Lezione",
                    "durata": "10 min",
                    "contenuto": ["Punto 1", "Punto 2", "Punto 3"]
                }}
            ]
        }}
    ]
}}

Crea una struttura che:
1. Segua la logica della trasformazione, non dell'insegnamento
2. Ogni modulo costruisca verso il risultato finale
3. Le lezioni siano brevi e focalizzate (8-15 min max)
4. Includa momenti di pratica e riflessione

Rispondi SOLO con il JSON, senza testo aggiuntivo."""

    try:
        if not EMERGENT_LLM_KEY:
            # Return mock data if no API key
            return {
                "outline": {
                    "corsoTitolo": "Il Tuo Corso Trasformativo",
                    "durataStimata": duration_map.get(request.preferences.duration, "4 settimane"),
                    "moduli": [
                        {
                            "numero": 1,
                            "titolo": "Fondamenta: Il Mindset del Successo",
                            "obiettivo": "Creare le basi mentali per la trasformazione",
                            "lezioni": [
                                {"numero": "1.1", "titolo": "Benvenuto nel Percorso", "durata": "8 min", "contenuto": ["Presentazione", "Obiettivi", "Come seguire il corso"]},
                                {"numero": "1.2", "titolo": "Il Tuo Punto A", "durata": "12 min", "contenuto": ["Analisi situazione attuale", "Identificare i blocchi", "Esercizio pratico"]},
                            ]
                        },
                        {
                            "numero": 2,
                            "titolo": "Il Metodo: I 3 Pilastri",
                            "obiettivo": "Comprendere il framework di trasformazione",
                            "lezioni": [
                                {"numero": "2.1", "titolo": "Pilastro 1: La Visione", "durata": "10 min", "contenuto": ["Definire il Punto B", "Visualizzazione", "Action plan"]},
                                {"numero": "2.2", "titolo": "Pilastro 2: La Strategia", "durata": "12 min", "contenuto": ["Framework operativo", "Strumenti", "Template"]},
                                {"numero": "2.3", "titolo": "Pilastro 3: L'Azione", "durata": "10 min", "contenuto": ["Piano d'azione", "Quick wins", "Routine quotidiana"]},
                            ]
                        },
                        {
                            "numero": 3,
                            "titolo": "Implementazione: Dalla Teoria alla Pratica",
                            "obiettivo": "Applicare il metodo alla propria situazione",
                            "lezioni": [
                                {"numero": "3.1", "titolo": "Setup del Sistema", "durata": "15 min", "contenuto": ["Configurazione", "Strumenti necessari", "Checklist"]},
                                {"numero": "3.2", "titolo": "La Prima Settimana", "durata": "12 min", "contenuto": ["Piano 7 giorni", "Metriche", "Aggiustamenti"]},
                            ]
                        },
                        {
                            "numero": 4,
                            "titolo": "Ottimizzazione e Scaling",
                            "obiettivo": "Migliorare e scalare i risultati",
                            "lezioni": [
                                {"numero": "4.1", "titolo": "Analisi dei Risultati", "durata": "10 min", "contenuto": ["KPI da monitorare", "Interpretazione dati", "Decisioni data-driven"]},
                                {"numero": "4.2", "titolo": "Next Level", "durata": "12 min", "contenuto": ["Scalare il successo", "Automatizzare", "Prossimi passi"]},
                            ]
                        },
                    ]
                }
            }
        
        # Generate unique session_id for this request
        course_session_id = f"course-builder-{request.partner_id}-{uuid.uuid4().hex[:8]}"
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=course_session_id,
            system_message="Sei STEFANIA, esperta di Instructional Design per Evolution PRO. Genera strutture di corsi professionali in formato JSON."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON from response
        import re
        json_match = re.search(r'\{[\s\S]*\}', response.text)
        if json_match:
            outline = json.loads(json_match.group())
            
            # Save to database
            await db.course_outlines.update_one(
                {"partner_id": request.partner_id},
                {"$set": {
                    "partner_id": request.partner_id,
                    "outline": outline,
                    "preferences": request.preferences.model_dump(),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            
            return {"outline": outline}
        else:
            raise HTTPException(status_code=500, detail="Failed to parse AI response")
            
    except Exception as e:
        logger.error(f"Error generating course structure: {e}")
        # Return mock data on LLM failure
        duration_map = {
            "4-week": "4 settimane (corso intensivo, 5-6 moduli)",
            "8-week": "8 settimane (corso approfondito, 7-8 moduli)",
            "self-paced": "Self-paced (6-8 moduli, nessuna deadline)"
        }
        return {
            "outline": {
                "corsoTitolo": "Il Tuo Corso Trasformativo",
                "durataStimata": duration_map.get(request.preferences.duration, "4 settimane"),
                "moduli": [
                    {
                        "numero": 1,
                        "titolo": "Fondamenta: Il Mindset del Successo",
                        "obiettivo": "Creare le basi mentali per la trasformazione",
                        "lezioni": [
                            {"numero": "1.1", "titolo": "Benvenuto nel Percorso", "durata": "8 min", "contenuto": ["Presentazione", "Obiettivi", "Come seguire il corso"]},
                            {"numero": "1.2", "titolo": "Il Tuo Punto A", "durata": "12 min", "contenuto": ["Analisi situazione attuale", "Identificare i blocchi", "Esercizio pratico"]},
                        ]
                    },
                    {
                        "numero": 2,
                        "titolo": "Il Metodo: I 3 Pilastri",
                        "obiettivo": "Comprendere il framework di trasformazione",
                        "lezioni": [
                            {"numero": "2.1", "titolo": "Pilastro 1: La Visione", "durata": "10 min", "contenuto": ["Definire il Punto B", "Visualizzazione", "Action plan"]},
                            {"numero": "2.2", "titolo": "Pilastro 2: La Strategia", "durata": "12 min", "contenuto": ["Framework operativo", "Strumenti", "Template"]},
                        ]
                    },
                    {
                        "numero": 3,
                        "titolo": "Implementazione Pratica",
                        "obiettivo": "Applicare il metodo alla propria situazione",
                        "lezioni": [
                            {"numero": "3.1", "titolo": "Setup del Sistema", "durata": "15 min", "contenuto": ["Configurazione", "Strumenti necessari", "Checklist"]},
                            {"numero": "3.2", "titolo": "La Prima Settimana", "durata": "12 min", "contenuto": ["Piano 7 giorni", "Metriche", "Aggiustamenti"]},
                        ]
                    },
                    {
                        "numero": 4,
                        "titolo": "Ottimizzazione e Scaling",
                        "obiettivo": "Migliorare e scalare i risultati",
                        "lezioni": [
                            {"numero": "4.1", "titolo": "Analisi dei Risultati", "durata": "10 min", "contenuto": ["KPI da monitorare", "Interpretazione dati"]},
                            {"numero": "4.2", "titolo": "Next Level", "durata": "12 min", "contenuto": ["Scalare il successo", "Automatizzare", "Prossimi passi"]},
                        ]
                    },
                ]
            },
            "note": "Struttura generata con template (LLM non disponibile)"
        }

@api_router.post("/stefania/course-builder/chat")
async def course_builder_chat(request: CourseBuilderChatRequest):
    """Chat with STEFANIA about course structure"""
    
    context = ""
    if request.outline:
        context = f"Struttura corso attuale: {json.dumps(request.outline, ensure_ascii=False)}\n"
    if request.selected_module is not None and request.outline:
        mod = request.outline.get("moduli", [])[request.selected_module] if request.selected_module < len(request.outline.get("moduli", [])) else None
        if mod:
            context += f"Modulo selezionato: {json.dumps(mod, ensure_ascii=False)}\n"
    
    prompt = f"""Sei STEFANIA, esperta di Instructional Design per Evolution PRO.
Stai aiutando a perfezionare la struttura di un corso.

{context}

DOMANDA PARTNER: {request.message}

Rispondi in modo conciso e pratico. Se suggerisci modifiche alla struttura, spiega brevemente il perché.
Massimo 3-4 frasi, linguaggio diretto e amichevole."""

    try:
        if not EMERGENT_LLM_KEY:
            return {
                "response": "Ottimo suggerimento! Per questo modulo ti consiglio di aggiungere un esercizio pratico alla fine di ogni lezione. Questo aumenta il tasso di completamento del 40%. Vuoi che ti aiuti a definirlo?"
            }
        
        chat_session_id = f"course-chat-{uuid.uuid4().hex[:8]}"
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=chat_session_id,
            system_message="Sei STEFANIA, consulente di Instructional Design. Rispondi in modo conciso e pratico."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {"response": response.text}
        
    except Exception as e:
        logger.error(f"Error in course builder chat: {e}")
        return {"response": "Mi dispiace, non sono riuscita a elaborare la richiesta. Riprova."}

@api_router.post("/stefania/course-builder/save")
async def save_course_outline(request: CourseOutlineSaveRequest):
    """Save the final course outline"""
    
    await db.course_outlines.update_one(
        {"partner_id": request.partner_id},
        {"$set": {
            "partner_id": request.partner_id,
            "outline": request.outline,
            "status": "saved",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Struttura corso salvata con successo"}

@api_router.get("/stefania/course-builder/{partner_id}")
async def get_course_outline(partner_id: str):
    """Get saved course outline for partner"""
    
    doc = await db.course_outlines.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    
    if not doc:
        return {"outline": None}
    
    return {"outline": doc.get("outline"), "status": doc.get("status", "draft")}

@api_router.get("/tts/files")
async def list_tts_files():
    """List generated intro/outro files"""
    intros = list(Path("/app/storage/intros").glob("*.mp3"))
    outros = list(Path("/app/storage/outros").glob("*.mp3"))
    
    return {
        "intros": [{"name": f.name, "url": f"/api/files/intros/{f.name}"} for f in intros],
        "outros": [{"name": f.name, "url": f"/api/files/outros/{f.name}"} for f in outros]
    }

# =============================================================================
# SYSTEME.IO LIVE DATA INTEGRATION
# =============================================================================

class SystemeIOCredentials(BaseModel):
    """Systeme.io API credentials"""
    model_config = ConfigDict(extra="ignore")
    partner_id: str
    api_key: str
    connected_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_sync: Optional[str] = None
    is_active: bool = True

class SystemeIOContact(BaseModel):
    """Systeme.io contact synced data"""
    model_config = ConfigDict(extra="ignore")
    id: str
    partner_id: str
    systeme_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    synced_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SystemeIOStats(BaseModel):
    """Aggregated stats from Systeme.io data"""
    model_config = ConfigDict(extra="ignore")
    partner_id: str
    total_contacts: int = 0
    new_contacts_today: int = 0
    new_contacts_week: int = 0
    new_contacts_month: int = 0
    contacts_by_tag: Dict[str, int] = Field(default_factory=dict)
    conversion_rate: float = 0.0  # Calculated from tags
    funnel_stats: Dict[str, int] = Field(default_factory=dict)
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SystemeIOCredentialsRequest(BaseModel):
    partner_id: str
    api_key: str

class SystemeIOSyncRequest(BaseModel):
    partner_id: str
    force_full_sync: bool = False

# Systeme.io API Helper
async def systeme_api_request(api_key: str, endpoint: str, method: str = "GET", data: dict = None) -> dict:
    """Make a request to Systeme.io API"""
    base_url = "https://api.systeme.io/api"
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{base_url}{endpoint}"
        logging.info(f"Systeme.io API request: {method} {url}")
        
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            response = await client.post(url, headers=headers, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        logging.info(f"Systeme.io API response: {response.status_code}")
        
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Systeme.io API key non valida")
        elif response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit Systeme.io raggiunto. Riprova tra qualche minuto.")
        elif response.status_code >= 400:
            logging.error(f"Systeme.io API error: {response.text[:500]}")
            raise HTTPException(status_code=response.status_code, detail=f"Errore Systeme.io API: {response.status_code}")
        
        return response.json()

@api_router.post("/systeme/credentials")
async def store_systeme_credentials(request: SystemeIOCredentialsRequest):
    """Store Systeme.io API credentials for a partner"""
    try:
        # Validate API key by making a test request
        try:
            await systeme_api_request(request.api_key, "/contacts?limit=10")
            logging.info(f"Systeme.io API validation successful for partner {request.partner_id}")
        except HTTPException as e:
            if e.status_code == 401:
                raise HTTPException(status_code=401, detail="API Key Systeme.io non valida. Verifica le credenziali.")
            raise e
        
        # Store credentials
        credentials = SystemeIOCredentials(
            partner_id=request.partner_id,
            api_key=request.api_key
        )
        
        await db.systeme_credentials.update_one(
            {"partner_id": request.partner_id},
            {"$set": credentials.model_dump()},
            upsert=True
        )
        
        return {
            "success": True,
            "partner_id": request.partner_id,
            "connected_at": credentials.connected_at,
            "message": "Connessione Systeme.io stabilita con successo!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error storing Systeme.io credentials: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/systeme/status/{partner_id}")
async def get_systeme_connection_status(partner_id: str):
    """Get Systeme.io connection status for a partner"""
    # Prima cerca credenziali specifiche del partner, poi globali
    credentials = await db.systeme_credentials.find_one(
        {"partner_id": partner_id},
        {"_id": 0, "api_key": 0}
    )
    
    if not credentials:
        # Cerca credenziali globali
        credentials = await db.systeme_credentials.find_one(
            {"partner_id": "global"},
            {"_id": 0, "api_key": 0}
        )
    
    if not credentials:
        return {
            "connected": False,
            "partner_id": partner_id,
            "message": "Systeme.io non connesso. Aggiungi le credenziali API."
        }
    
    return {
        "connected": credentials.get("is_active", False),
        "partner_id": partner_id,
        "connected_at": credentials.get("connected_at"),
        "last_sync": credentials.get("last_sync"),
        "message": "Systeme.io connesso e attivo" if credentials.get("is_active") else "Connessione inattiva"
    }

@api_router.post("/systeme/sync")
async def sync_systeme_contacts(request: SystemeIOSyncRequest):
    """Sync contacts from Systeme.io API"""
    try:
        # Get credentials
        credentials = await db.systeme_credentials.find_one({"partner_id": request.partner_id})
        if not credentials:
            raise HTTPException(status_code=404, detail="Credenziali Systeme.io non trovate")
        
        api_key = credentials["api_key"]
        
        # Fetch contacts from Systeme.io (paginated)
        all_contacts = []
        page = 1
        has_more = True
        
        while has_more and page <= 10:  # Max 10 pages to prevent infinite loops
            try:
                response = await systeme_api_request(api_key, f"/contacts?page={page}&limit=100")
                
                contacts_data = response.get("data", response.get("items", []))
                if isinstance(contacts_data, list) and len(contacts_data) > 0:
                    all_contacts.extend(contacts_data)
                    page += 1
                else:
                    has_more = False
                    
            except HTTPException as e:
                if e.status_code == 429:
                    # Rate limited, stop and use what we have
                    logging.warning("Systeme.io rate limited during sync")
                    has_more = False
                else:
                    raise e
        
        # Process and store contacts
        synced_count = 0
        for contact_data in all_contacts:
            contact_id = contact_data.get("id", str(uuid.uuid4()))
            
            contact = {
                "id": str(uuid.uuid4()),
                "partner_id": request.partner_id,
                "systeme_id": str(contact_id),
                "email": contact_data.get("email", ""),
                "first_name": contact_data.get("firstName", contact_data.get("first_name")),
                "last_name": contact_data.get("lastName", contact_data.get("last_name")),
                "tags": contact_data.get("tags", []),
                "created_at": contact_data.get("createdAt", contact_data.get("created_at", datetime.now(timezone.utc).isoformat())),
                "synced_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Upsert by systeme_id
            await db.systeme_contacts.update_one(
                {"partner_id": request.partner_id, "systeme_id": contact["systeme_id"]},
                {"$set": contact},
                upsert=True
            )
            synced_count += 1
        
        # Update last sync time
        await db.systeme_credentials.update_one(
            {"partner_id": request.partner_id},
            {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Calculate and cache stats
        await calculate_systeme_stats(request.partner_id)
        
        return {
            "success": True,
            "partner_id": request.partner_id,
            "contacts_synced": synced_count,
            "pages_fetched": page - 1,
            "synced_at": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error syncing Systeme.io contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def calculate_systeme_stats(partner_id: str) -> dict:
    """Calculate aggregated stats from synced contacts"""
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Get all contacts for this partner
    contacts = await db.systeme_contacts.find({"partner_id": partner_id}, {"_id": 0}).to_list(10000)
    
    total_contacts = len(contacts)
    new_today = 0
    new_week = 0
    new_month = 0
    tags_count = {}
    
    for contact in contacts:
        created_at_str = contact.get("created_at", "")
        try:
            if created_at_str:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                if created_at >= today_start:
                    new_today += 1
                if created_at >= week_start:
                    new_week += 1
                if created_at >= month_start:
                    new_month += 1
        except (ValueError, TypeError):
            pass
        
        # Count tags
        for tag in contact.get("tags", []):
            tag_name = tag if isinstance(tag, str) else tag.get("name", str(tag))
            tags_count[tag_name] = tags_count.get(tag_name, 0) + 1
    
    # Calculate conversion rate (contacts with "buyer" or "customer" tags)
    buyer_tags = ["buyer", "customer", "purchased", "cliente", "acquirente", "acquisto"]
    buyers = sum(tags_count.get(tag, 0) for tag in buyer_tags)
    conversion_rate = (buyers / total_contacts * 100) if total_contacts > 0 else 0
    
    # Funnel stats (estimate based on tags)
    funnel_stats = {
        "leads": total_contacts,
        "engaged": sum(tags_count.get(tag, 0) for tag in ["engaged", "hot", "warm", "interessato", "webinar"]),
        "qualified": sum(tags_count.get(tag, 0) for tag in ["qualified", "qualificato", "mql", "sql"]),
        "customers": buyers
    }
    
    stats = {
        "partner_id": partner_id,
        "total_contacts": total_contacts,
        "new_contacts_today": new_today,
        "new_contacts_week": new_week,
        "new_contacts_month": new_month,
        "contacts_by_tag": tags_count,
        "conversion_rate": round(conversion_rate, 2),
        "funnel_stats": funnel_stats,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    # Cache stats
    await db.systeme_stats.update_one(
        {"partner_id": partner_id},
        {"$set": stats},
        upsert=True
    )
    
    return stats

@api_router.get("/systeme/stats/{partner_id}")
async def get_systeme_stats(partner_id: str, refresh: bool = False):
    """Get aggregated Systeme.io stats for a partner"""
    # Check if connected - prima partner specifico, poi globale
    credentials = await db.systeme_credentials.find_one({"partner_id": partner_id})
    if not credentials:
        credentials = await db.systeme_credentials.find_one({"partner_id": "global"})
    
    if not credentials:
        # Return mock data for demo/unconnected state
        return {
            "connected": False,
            "partner_id": partner_id,
            "demo_mode": True,
            "total_contacts": 247,
            "new_contacts_today": 12,
            "new_contacts_week": 56,
            "new_contacts_month": 189,
            "conversion_rate": 4.8,
            "funnel_stats": {
                "leads": 247,
                "engaged": 142,
                "qualified": 67,
                "customers": 12
            },
            "contacts_by_tag": {
                "lead_magnet": 180,
                "webinar": 95,
                "hot": 45,
                "customer": 12
            },
            "message": "Dati demo - Connetti Systeme.io per dati reali"
        }
    
    # Usa sempre "global" per le stats se non esistono stats per partner
    stats_partner_id = partner_id if await db.systeme_stats.find_one({"partner_id": partner_id}) else "global"
    
    # Refresh stats if requested
    if refresh:
        stats = await calculate_systeme_stats(stats_partner_id)
    else:
        # Get cached stats
        stats = await db.systeme_stats.find_one({"partner_id": stats_partner_id}, {"_id": 0})
        if not stats:
            stats = await calculate_systeme_stats(stats_partner_id)
    
    stats["connected"] = True
    stats["demo_mode"] = False
    return stats

@api_router.get("/systeme/contacts/{partner_id}")
async def get_systeme_contacts(partner_id: str, limit: int = 50, skip: int = 0, tag: Optional[str] = None):
    """Get synced Systeme.io contacts for a partner"""
    query = {"partner_id": partner_id}
    if tag:
        query["tags"] = {"$in": [tag]}
    
    contacts = await db.systeme_contacts.find(
        query,
        {"_id": 0}
    ).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    total = await db.systeme_contacts.count_documents(query)
    
    return {
        "contacts": contacts,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.delete("/systeme/disconnect/{partner_id}")
async def disconnect_systeme(partner_id: str):
    """Disconnect Systeme.io integration for a partner"""
    await db.systeme_credentials.delete_one({"partner_id": partner_id})
    await db.systeme_contacts.delete_many({"partner_id": partner_id})
    await db.systeme_stats.delete_one({"partner_id": partner_id})
    
    return {
        "success": True,
        "partner_id": partner_id,
        "message": "Connessione Systeme.io rimossa"
    }

@api_router.get("/systeme/dashboard/{partner_id}")
async def get_systeme_dashboard(partner_id: str):
    """Get complete Systeme.io dashboard data for a partner"""
    # Get connection status
    status = await get_systeme_connection_status(partner_id)
    
    # Get stats
    stats = await get_systeme_stats(partner_id)
    
    # Get recent contacts
    recent_contacts = await db.systeme_contacts.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "connection": status,
        "stats": stats,
        "recent_contacts": recent_contacts,
        "partner_id": partner_id
    }

# =============================================================================
# SYSTEME.IO MCP - AGENT ACTIONS
# =============================================================================

from systeme_mcp import agent_systeme_action, get_systeme_client, AGENT_PERMISSIONS

class AgentSystemeRequest(BaseModel):
    agent_name: str
    action: str
    params: Dict[str, Any] = Field(default_factory=dict)

@api_router.post("/systeme/agent/action")
async def execute_agent_systeme_action(request: AgentSystemeRequest):
    """Esegue un'azione Systeme.io per conto di un agente AI"""
    result = await agent_systeme_action(
        agent_name=request.agent_name,
        action=request.action,
        **request.params
    )
    return result

@api_router.get("/systeme/agent/permissions")
async def get_agent_permissions():
    """Restituisce i permessi Systeme.io per ogni agente"""
    return {
        "permissions": AGENT_PERMISSIONS,
        "message": "Permessi Systeme.io per agenti AI"
    }

@api_router.get("/systeme/agent/{agent_name}/actions")
async def get_agent_available_actions(agent_name: str):
    """Restituisce le azioni disponibili per un agente specifico"""
    actions = AGENT_PERMISSIONS.get(agent_name.upper(), [])
    return {
        "agent": agent_name.upper(),
        "available_actions": actions,
        "count": len(actions)
    }

# Endpoint diretti per gli agenti più usati

@api_router.get("/systeme/gaia/funnels")
async def gaia_get_funnels():
    """GAIA: Recupera tutti i funnel da Systeme.io"""
    client = get_systeme_client()
    return await client.get_funnels()

@api_router.get("/systeme/stefania/campaigns")
async def stefania_get_campaigns():
    """STEFANIA: Recupera tutte le campagne email"""
    client = get_systeme_client()
    return await client.get_campaigns()

@api_router.get("/systeme/stefania/tags")
async def stefania_get_tags():
    """STEFANIA: Recupera tutti i tag"""
    client = get_systeme_client()
    return await client.get_tags()

@api_router.post("/systeme/stefania/tag")
async def stefania_create_tag(name: str):
    """STEFANIA: Crea un nuovo tag"""
    client = get_systeme_client()
    return await client.create_tag(name)

@api_router.get("/systeme/marta/contacts")
async def marta_get_contacts(limit: int = 100, page: int = 1):
    """MARTA: Recupera contatti CRM"""
    client = get_systeme_client()
    return await client.get_contacts(limit=limit, page=page)

@api_router.post("/systeme/marta/contact")
async def marta_create_contact(email: str, first_name: str = None, last_name: str = None):
    """MARTA: Crea nuovo contatto"""
    client = get_systeme_client()
    return await client.create_contact(email=email, first_name=first_name, last_name=last_name)

@api_router.get("/systeme/marta/orders")
async def marta_get_orders(limit: int = 100):
    """MARTA: Recupera ordini"""
    client = get_systeme_client()
    return await client.get_orders(limit=limit)

@api_router.get("/systeme/andrea/courses")
async def andrea_get_courses():
    """ANDREA: Recupera corsi"""
    client = get_systeme_client()
    return await client.get_courses()

@api_router.get("/systeme/andrea/course/{course_id}/students")
async def andrea_get_course_students(course_id: str):
    """ANDREA: Recupera studenti di un corso"""
    client = get_systeme_client()
    return await client.get_course_students(course_id)

@api_router.get("/systeme/orion/products")
async def orion_get_products():
    """ORION: Recupera prodotti"""
    client = get_systeme_client()
    return await client.get_products()

@api_router.get("/systeme/atlas/courses")
async def atlas_get_courses():
    """ATLAS: Recupera corsi per LTV analysis"""
    client = get_systeme_client()
    return await client.get_courses()

# =============================================================================
# SYSTEME.IO WRITE ACTIONS (Nuovi endpoint per azioni di scrittura)
# =============================================================================

class MoveToPhaseRequest(BaseModel):
    contact_id: str
    phase: str  # F0-F10

class SendNotificationRequest(BaseModel):
    contact_id: str
    notification_type: str  # welcome, phase_complete, reminder, deadline, feedback_request, course_access, payment_reminder

class CreateContactWithPhaseRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    phase: str = "F1"

class BulkTagRequest(BaseModel):
    contact_ids: List[str]
    tag_id: str

class TriggerAutomationRequest(BaseModel):
    contact_id: str
    tag_name: str

class EnrollStudentRequest(BaseModel):
    course_id: str
    contact_id: str

# --- VALENTINA: Gestione fasi partner ---

@api_router.post("/systeme/valentina/move-phase")
async def valentina_move_contact_phase(request: MoveToPhaseRequest):
    """VALENTINA: Sposta un partner a una nuova fase"""
    client = get_systeme_client()
    return await client.move_contact_to_phase(request.contact_id, request.phase)

@api_router.get("/systeme/valentina/contacts-by-phase/{phase}")
async def valentina_get_contacts_by_phase(phase: str, limit: int = 100):
    """VALENTINA: Recupera tutti i contatti in una fase specifica"""
    client = get_systeme_client()
    return await client.get_contacts_by_phase(phase, limit)

@api_router.post("/systeme/valentina/notify")
async def valentina_send_notification(request: SendNotificationRequest):
    """VALENTINA: Invia notifica email a un partner"""
    client = get_systeme_client()
    return await client.send_notification_email(request.contact_id, request.notification_type)

# --- STEFANIA: Marketing e campagne ---

@api_router.post("/systeme/stefania/trigger-automation")
async def stefania_trigger_automation(request: TriggerAutomationRequest):
    """STEFANIA: Triggera un'automazione via tag"""
    client = get_systeme_client()
    return await client.trigger_automation(request.contact_id, request.tag_name)

@api_router.post("/systeme/stefania/bulk-tag")
async def stefania_bulk_add_tag(request: BulkTagRequest):
    """STEFANIA: Aggiunge tag a multipli contatti"""
    client = get_systeme_client()
    return await client.bulk_add_tag(request.contact_ids, request.tag_id)

@api_router.post("/systeme/stefania/subscribe-campaign")
async def stefania_subscribe_to_campaign(campaign_id: str, contact_id: str):
    """STEFANIA: Iscrive contatto a campagna email"""
    client = get_systeme_client()
    return await client.subscribe_to_campaign(campaign_id, contact_id)

# --- GAIA: Creazione contatti e funnel ---

@api_router.post("/systeme/gaia/create-partner")
async def gaia_create_contact_with_phase(request: CreateContactWithPhaseRequest):
    """GAIA: Crea nuovo partner e lo assegna a una fase"""
    client = get_systeme_client()
    return await client.create_contact_with_phase(
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        phase=request.phase
    )

# --- MARTA: CRM completo ---

@api_router.post("/systeme/marta/move-phase")
async def marta_move_contact_phase(request: MoveToPhaseRequest):
    """MARTA: Sposta contatto a nuova fase (CRM)"""
    client = get_systeme_client()
    return await client.move_contact_to_phase(request.contact_id, request.phase)

@api_router.post("/systeme/marta/create-partner")
async def marta_create_partner(request: CreateContactWithPhaseRequest):
    """MARTA: Crea nuovo partner con fase"""
    client = get_systeme_client()
    return await client.create_contact_with_phase(
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        phase=request.phase
    )

@api_router.post("/systeme/marta/bulk-tag")
async def marta_bulk_tag(request: BulkTagRequest):
    """MARTA: Aggiunge tag a multipli contatti"""
    client = get_systeme_client()
    return await client.bulk_add_tag(request.contact_ids, request.tag_id)

# --- ANDREA: Gestione corsi ---

@api_router.post("/systeme/andrea/enroll")
async def andrea_enroll_student(request: EnrollStudentRequest):
    """ANDREA: Iscrive studente a un corso"""
    client = get_systeme_client()
    return await client.enroll_student(request.course_id, request.contact_id)

@api_router.post("/systeme/andrea/notify-access")
async def andrea_notify_course_access(contact_id: str):
    """ANDREA: Notifica accesso corso a uno studente"""
    client = get_systeme_client()
    return await client.send_notification_email(contact_id, "course_access")

# --- ATLAS: LTV e studenti ---

@api_router.post("/systeme/atlas/enroll")
async def atlas_enroll_student(request: EnrollStudentRequest):
    """ATLAS: Iscrive studente per tracking LTV"""
    client = get_systeme_client()
    return await client.enroll_student(request.course_id, request.contact_id)

# --- ORION: Sales triggers ---

@api_router.post("/systeme/orion/trigger-sales")
async def orion_trigger_sales_automation(request: TriggerAutomationRequest):
    """ORION: Triggera automazione sales"""
    client = get_systeme_client()
    return await client.trigger_automation(request.contact_id, request.tag_name)

# =============================================================================
# TELEGRAM NOTIFICATIONS
# =============================================================================

from valentina_ai import telegram_notifier, telegram_notify

class TelegramAdminSetup(BaseModel):
    chat_id: str

class TelegramNotifyRequest(BaseModel):
    notification_type: str  # new_partner, phase_complete, alert
    partner_name: Optional[str] = None
    partner_email: Optional[str] = None
    old_phase: Optional[str] = None
    new_phase: Optional[str] = None
    alert_type: Optional[str] = None
    message: Optional[str] = None

@api_router.post("/telegram/setup-admin")
async def setup_telegram_admin(request: TelegramAdminSetup):
    """Register admin chat ID for notifications"""
    # Save to database
    await db.telegram_admins.update_one(
        {"chat_id": request.chat_id},
        {"$set": {"chat_id": request.chat_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    # Add to notifier
    if request.chat_id not in telegram_notifier.admin_chat_ids:
        telegram_notifier.admin_chat_ids.append(request.chat_id)
    
    # Send confirmation
    result = await telegram_notifier.send_message(
        request.chat_id,
        "✅ <b>Evolution PRO OS</b>\n\nNotifiche Telegram attivate! Riceverai alert per:\n• Nuovi partner\n• Fasi completate\n• Alert di sistema"
    )
    
    return {"success": True, "chat_id": request.chat_id, "telegram_result": result}

@api_router.get("/telegram/admins")
async def get_telegram_admins():
    """Get list of registered admin chat IDs"""
    admins = await db.telegram_admins.find({}, {"_id": 0}).to_list(100)
    return {"admins": admins, "count": len(admins)}

@api_router.post("/telegram/notify")
async def send_telegram_notification(request: TelegramNotifyRequest):
    """Send a notification via Telegram"""
    result = await telegram_notify(
        notification_type=request.notification_type,
        partner_name=request.partner_name,
        partner_email=request.partner_email,
        old_phase=request.old_phase,
        new_phase=request.new_phase,
        alert_type=request.alert_type,
        message=request.message
    )
    return {"success": True, "result": result}

@api_router.get("/telegram/updates")
async def get_telegram_updates():
    """Get recent Telegram updates (for discovering chat IDs)"""
    result = await telegram_notifier.get_updates()
    
    # Extract chat IDs from updates
    chat_ids = []
    if result.get("ok") and result.get("result"):
        for update in result["result"]:
            if "message" in update and "chat" in update["message"]:
                chat_id = str(update["message"]["chat"]["id"])
                if chat_id not in chat_ids:
                    chat_ids.append(chat_id)
    
    return {"updates": result, "discovered_chat_ids": chat_ids}

@api_router.post("/telegram/test")
async def test_telegram_notification(chat_id: str):
    """Send a test notification to verify Telegram setup"""
    result = await telegram_notifier.send_message(
        chat_id,
        "🧪 <b>Test Notification</b>\n\nSe vedi questo messaggio, le notifiche Telegram funzionano correttamente!\n\n— Evolution PRO OS"
    )
    return {"success": result.get("ok", False), "result": result}

# Load admin chat IDs from database on startup
async def load_telegram_admins():
    """Load admin chat IDs from database"""
    admins = await db.telegram_admins.find({}, {"_id": 0}).to_list(100)
    for admin in admins:
        if admin.get("chat_id") and admin["chat_id"] not in telegram_notifier.admin_chat_ids:
            telegram_notifier.admin_chat_ids.append(admin["chat_id"])
    logging.info(f"Loaded {len(telegram_notifier.admin_chat_ids)} Telegram admin(s)")

# =============================================================================
# ROOT & CONTROL
# =============================================================================

@api_router.get("/")
async def root():
    return {"message": "Evolution PRO OS API v3.0", "status": "online"}

@api_router.get("/control")
async def control_dashboard():
    """Dashboard control endpoint - returns system status"""
    agents = await db.agents.find({}, {"_id": 0}).to_list(100)
    stats = await get_stats()
    
    return {
        "system": "Evolution PRO OS",
        "version": "3.0",
        "status": "operational",
        "agents": agents,
        "stats": stats,
        "youtube_authenticated": youtube_uploader.is_authenticated(),
        "endpoints": {
            "dashboard": "/",
            "agents": "/api/agents",
            "partners": "/api/partners",
            "alerts": "/api/alerts",
            "videos": "/api/videos/jobs",
            "youtube": "/api/youtube/status",
            "files": "/api/files",
            "compliance": "/api/compliance/pending",
            "gaia_templates": "/api/gaia/templates",
            "tts": "/api/tts/voices",
            "chat": "/api/chat"
        }
    }

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
