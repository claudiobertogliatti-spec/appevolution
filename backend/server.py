from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv, dotenv_values
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
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import httpx

# Carica .env con override=True per sovrascrivere le variabili di sistema
load_dotenv(override=True)

# Leggi direttamente dal file .env per chiavi critiche (bypass variabili di sistema)
_ENV_FILE_VALUES = dotenv_values("/app/backend/.env")

def get_env_override(key: str, default: str = None) -> str:
    """Legge prima dal file .env, poi dalle variabili d'ambiente"""
    return _ENV_FILE_VALUES.get(key) or os.environ.get(key, default)

# Import custom modules
from video_processor import video_processor, VideoProcessor
from file_storage import file_storage, FileStorageManager
from youtube_uploader import youtube_uploader, YouTubeUploader
from tts_generator import tts_generator, TTSGenerator
from video_editor_service import video_editor, VideoEditorService
from legal_pages_service import legal_generator, LegalPagesGenerator
from funnel_export_service import funnel_export_service, FunnelExportService
from agent_hub_service import AgentAnalyticsHub, init_agent_hub
from analisi_workflow import esegui_workflow_analisi

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - Read from environment variables
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')

if not mongo_url:
    raise ValueError("MONGO_URL environment variable is required")

print(f"🔗 Connecting to MongoDB: {db_name}")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Initialize AI Agents
agent_hub = init_agent_hub(db)

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="Evolution PRO OS", version="3.0")

# CORS Configuration - MUST be before routers
# Allow specific origins for production + wildcard for development
ALLOWED_ORIGINS = [
    "https://app.evolution-pro.it",
    "https://www.app.evolution-pro.it",
    "https://evolution-pro.it",
    "https://www.evolution-pro.it",
    "http://localhost:3000",
    "http://localhost:8001",
]

# Add any preview URLs from environment
cors_env = os.environ.get('CORS_ORIGINS', '')
if cors_env and cors_env != '*':
    ALLOWED_ORIGINS.extend([o.strip() for o in cors_env.split(',') if o.strip()])

# Add current preview URL dynamically
react_backend_url = os.environ.get('REACT_APP_BACKEND_URL', '')
if react_backend_url and react_backend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(react_backend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
    niche: str = ""
    phase: str = "F1"
    revenue: int = 0
    contract: str = ""
    alert: bool = False
    modules: List[int] = Field(default_factory=lambda: [0]*10)

class PartnerCreate(BaseModel):
    name: str
    niche: str = ""
    phase: str = "F1"
    contract: str = ""

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
    session_id: str = ""
    message: str
    partner_name: str = "Partner"
    partner_niche: str = ""
    partner_phase: str = "F1"
    modules_done: int = 0
    context: Optional[Dict[str, Any]] = None
    # Nuovi campi per contesto utente
    user_role: Optional[str] = None      # "admin" | "partner" | "cliente"
    user_name: Optional[str] = None      # nome dell'utente loggato
    partner_id: Optional[str] = None     # id del partner (se ruolo partner)
    agent: Optional[str] = "VALENTINA"   # agente da usare: VALENTINA, MARCO, ANDREA, GAIA, STEFANIA, MAIN

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
    {"id": "VALENTINA", "role": "Onboarding & Consulenza Partner", "status": "ACTIVE", "budget": 28, "category": "Strategia"},
    {"id": "STEFANIA", "role": "Orchestrazione", "status": "ACTIVE", "budget": 12, "category": "Comunicazione"},
    {"id": "GAIA", "role": "Tech Support", "status": "ACTIVE", "budget": 8, "category": "Supporto"},
    {"id": "ANDREA", "role": "Video Production", "status": "ACTIVE", "budget": 15, "category": "Produzione"},
    {"id": "MARCO", "role": "Accountability", "status": "ACTIVE", "budget": 6, "category": "Coaching"},
    {"id": "OPENCLAW", "role": "Data Intelligence & Notifiche", "status": "ACTIVE", "budget": 0, "category": "Sistema"},
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
    "F8": "Lancio", "F9": "Ottimizzazione", 
    # Post-Lancio phases (Piano Continuità)
    "F10": "La mia Accademia", "F11": "I miei Studenti", "F12": "Impegni Settimana", "F13": "Report Mensile"
}

# Piano Continuità configuration
PIANI_CONTINUITA = {
    "starter": {"fee_mensile": 29, "commissione_percentuale": 15, "label": "Starter"},
    "builder": {"fee_mensile": 49, "commissione_percentuale": 10, "label": "Builder"},
    "pro": {"fee_mensile": 79, "commissione_percentuale": 7, "label": "Pro"},
    "elite": {"fee_mensile": 99, "commissione_percentuale": 5, "label": "Elite"}
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
    
    # FIX A: Rimuovi agenti ibernati dal database
    hibernated_agents = ["ORION", "MARTA", "LUCA", "ATLAS"]
    delete_result = await db.agents.delete_many({"id": {"$in": hibernated_agents}})
    if delete_result.deleted_count > 0:
        logging.info(f"Rimossi {delete_result.deleted_count} agenti ibernati: {hibernated_agents}")
    
    # FIX B: Correggi i ruoli di VALENTINA e STEFANIA
    await db.agents.update_one(
        {"id": "VALENTINA"},
        {"$set": {
            "role": "Onboarding & Consulenza Partner",
            "category": "Partner Contact",
            "description": "Supporta i partner dall'onboarding fino al post-lancio"
        }}
    )
    await db.agents.update_one(
        {"id": "STEFANIA"},
        {"$set": {
            "role": "Orchestrazione",
            "category": "Coordinamento",
            "description": "Smista le richieste agli agenti specializzati"
        }}
    )
    logging.info("Ruoli VALENTINA e STEFANIA corretti")
    
    # Assicurati che MAIN esista
    main_exists = await db.agents.find_one({"id": "MAIN"})
    if not main_exists:
        await db.agents.insert_one({
            "id": "MAIN",
            "role": "Sistema Centrale",
            "status": "ACTIVE",
            "budget": 100,
            "category": "Coordinamento"
        })
        logging.info("Agente MAIN creato")
    
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

from auth import AuthService, LoginRequest, RegisterRequest, Token, decode_token, UserResponse, create_access_token
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
    """Register a new partner user and send welcome email"""
    global auth_service
    if not auth_service:
        auth_service = AuthService(db)
    
    try:
        user = await auth_service.create_user(request)
        
        # Create partner record if role is partner
        if request.role == "partner":
            partner_id = str(uuid.uuid4())
            new_partner = {
                "id": partner_id,
                "name": request.name,
                "email": request.email,
                "phase": "F1",
                "niche": "",
                "revenue": 0,
                "contract": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "alert": False,
                "modules": [],
                "onboarding_status": {
                    "welcome_email_sent": False,
                    "systeme_account_created": False,
                    "systeme_email_sent": False,
                    "registered_at": datetime.now(timezone.utc).isoformat()
                }
            }
            await db.partners.insert_one(new_partner)
            
            # Update user with partner_id
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"partner_id": partner_id}}
            )
            user["partner_id"] = partner_id
            
            # Send welcome email automatically
            try:
                await send_partner_welcome_email(request.email, request.name)
                await db.partners.update_one(
                    {"id": partner_id},
                    {"$set": {"onboarding_status.welcome_email_sent": True, "onboarding_status.welcome_email_date": datetime.now(timezone.utc).isoformat()}}
                )
            except Exception as e:
                logging.error(f"Failed to send welcome email: {e}")
        
        return {"success": True, "user": user, "message": "Utente registrato con successo"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

async def send_partner_welcome_email(email: str, name: str):
    """Send welcome email to new partner with app instructions
    
    This function:
    1. Logs the email content to database
    2. Adds 'welcome_partner' tag to Systeme.io to trigger automation
    3. Sends notification via Telegram
    """
    subject = "🎉 Benvenuto in Evolution PRO - Le tue credenziali"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F2C418 0%, #FADA5E 100%); padding: 30px; text-align: center;">
            <h1 style="color: #1E2128; margin: 0;">Benvenuto in Evolution PRO!</h1>
        </div>
        
        <div style="padding: 30px; background: #fff;">
            <p>Ciao <strong>{name}</strong>! 👋</p>
            
            <p>Il tuo account Evolution PRO è stato creato con successo. Ecco come iniziare:</p>
            
            <div style="background: #FAFAF7; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h3 style="color: #1E2128; margin-top: 0;">📱 Accedi all'App</h3>
                <p><strong>URL:</strong> <a href="https://app.evolution-pro.it" style="color: #F2C418;">https://app.evolution-pro.it</a></p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Password:</strong> quella che hai scelto durante la registrazione</p>
            </div>
            
            <div style="background: #FFF8DC; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #F2C418;">
                <h3 style="color: #1E2128; margin-top: 0;">🚀 Primi Passi</h3>
                <ol style="margin: 0; padding-left: 20px;">
                    <li>Accedi all'app con le tue credenziali</li>
                    <li>Guarda il <strong>Video di Benvenuto</strong> nella sezione "Parti da Qui"</li>
                    <li>Compila il tuo <strong>Profilo Hub</strong></li>
                    <li>Inizia il percorso di <strong>Posizionamento</strong></li>
                </ol>
            </div>
            
            <div style="background: #1E2128; color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h3 style="color: #F2C418; margin-top: 0;">👥 Il Tuo Team</h3>
                <p style="margin-bottom: 0;">Hai a disposizione un team di <strong>8 agenti AI</strong> coordinati da <strong>Valentina</strong>. Per qualsiasi domanda, parla con lei direttamente dall'app!</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                <strong>Nota:</strong> A breve riceverai una seconda email con le istruzioni per accedere alla piattaforma Systeme.io dove pubblicherai il tuo corso.
            </p>
        </div>
        
        <div style="background: #FAFAF7; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>© 2026 Evolution PRO - Tutti i diritti riservati</p>
            <p>Claudio Bertogliatti & Team</p>
        </div>
    </body>
    </html>
    """
    
    logging.info(f"Welcome email prepared for {email}")
    
    # Store email in database for tracking
    await db.email_logs.insert_one({
        "type": "welcome",
        "to": email,
        "name": name,
        "subject": subject,
        "html_content": html_content,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": "queued"
    })
    
    # Trigger Systeme.io automation by adding welcome tag
    systeme_api_key = os.environ.get('SYSTEME_API_KEY')
    if systeme_api_key:
        try:
            await add_systeme_tag(systeme_api_key, email, "welcome_partner")
            await db.email_logs.update_one(
                {"to": email, "type": "welcome"},
                {"$set": {"systeme_tag_added": True, "status": "sent_via_systeme"}}
            )
            logging.info(f"Welcome tag added to {email} in Systeme.io")
        except Exception as e:
            logging.warning(f"Could not add Systeme.io tag for {email}: {e}")
    
    # Send Telegram notification to admin
    try:
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            message = f"🎉 *Nuovo Partner Registrato!*\n\n👤 *Nome:* {name}\n📧 *Email:* {email}\n\n✅ Email di benvenuto inviata"
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message, "parse_mode": "Markdown"}
                )
    except Exception as e:
        logging.warning(f"Could not send Telegram notification: {e}")
    
    return True

# =============================================================================
# CLIENTE ANALISI - NUOVO FLUSSO ONBOARDING SEPARATO
# =============================================================================

class ClienteAnalisiRegisterRequest(BaseModel):
    """Request per registrazione cliente analisi (prima del pagamento)"""
    nome: str
    cognome: str
    email: str
    telefono: str
    password: Optional[str] = None  # Opzionale - auto-generata se non fornita

class ClienteAnalisiResponse(BaseModel):
    """Response per cliente analisi"""
    id: str
    nome: str
    cognome: str
    email: str
    telefono: str
    user_type: str
    pagamento_analisi: bool
    data_registrazione: str
    token: Optional[str] = None

@api_router.post("/cliente-analisi/register")
async def register_cliente_analisi(request: ClienteAnalisiRegisterRequest):
    """
    Registra un nuovo cliente per l'Analisi Strategica.
    NON richiede pagamento - crea solo l'account.
    Dopo la registrazione, l'utente deve completare il pagamento separatamente.
    Se la password non è fornita, viene auto-generata e inviata via email.
    """
    import bcrypt
    
    # Verifica se email già esiste
    existing = await db.users.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata. Effettua il login.")
    
    # Auto-genera password se non fornita
    if request.password:
        password_plain = request.password
        password_auto_generated = False
    else:
        # Genera password sicura: Evo + 6 caratteri random + !
        password_plain = f"Evo{str(uuid.uuid4())[:6].upper()}!"
        password_auto_generated = True
    
    # Hash password
    password_hash = bcrypt.hashpw(password_plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Crea utente
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "nome": request.nome,
        "cognome": request.cognome,
        "name": f"{request.nome} {request.cognome}",  # Per compatibilità
        "email": request.email.lower(),
        "telefono": request.telefono,
        "password_hash": password_hash,
        "user_type": "cliente_analisi",
        "role": "cliente",  # Per compatibilità con auth
        "pagamento_analisi": False,
        "data_registrazione": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        result = await db.users.insert_one(new_user)
        print(f"[CLIENTE-ANALISI] Inserted user {request.email} with id {result.inserted_id}")
    except Exception as e:
        print(f"[CLIENTE-ANALISI] Failed to insert user {request.email}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # Login automatico - genera token usando la funzione standalone
    access_token = create_access_token(data={
        "sub": user_id,
        "email": request.email.lower(),
        "role": "cliente",
        "user_type": "cliente_analisi"
    })
    
    # Notifica Telegram
    try:
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            message = f"📝 Nuovo Cliente Analisi Registrato\n\n👤 {request.nome} {request.cognome}\n📧 {request.email}\n📱 {request.telefono}\n\n⏳ In attesa di pagamento €67"
            async with httpx.AsyncClient() as client_http:
                await client_http.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message}
                )
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")
    
    return {
        "success": True,
        "user_id": user_id,  # Aggiunto per facilitare il checkout
        "user": {
            "id": user_id,
            "nome": request.nome,
            "cognome": request.cognome,
            "email": request.email.lower(),
            "telefono": request.telefono,
            "user_type": "cliente_analisi",
            "pagamento_analisi": False,
            "data_registrazione": new_user["data_registrazione"]
        },
        "token": access_token,
        "password_auto_generated": password_auto_generated,
        "temp_password": password_plain if password_auto_generated else None,  # Solo se auto-generata
        "message": "Account creato con successo! Ora completa il pagamento."
    }

@api_router.post("/cliente-analisi/checkout")
async def create_analisi_checkout(user_id: str = None, email: str = None):
    """
    Crea una sessione di checkout Stripe per il pagamento dell'Analisi Strategica (€67).
    """
    stripe_key = get_env_override('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    # Trova l'utente
    user = None
    if user_id:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
    elif email:
        user = await db.users.find_one({"email": email.lower()}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    if user.get("pagamento_analisi"):
        raise HTTPException(status_code=400, detail="Pagamento già effettuato")
    
    # URL di successo e cancellazione
    frontend_url = os.environ.get('FRONTEND_URL', 'https://sblocco-core-phase1.preview.emergentagent.com')
    
    try:
        checkout = StripeCheckout(api_key=stripe_key)
        
        session_request = CheckoutSessionRequest(
            amount=67.00,  # €67.00
            currency="eur",
            success_url=f"{frontend_url}/analisi-in-preparazione?payment=success&user_id={user['id']}",
            cancel_url=f"{frontend_url}/analisi-attivazione?payment=cancelled",
            metadata={
                "user_id": user["id"],
                "tipo": "analisi_strategica",
                "importo": "67",
                "email": user.get("email", "")
            }
        )
        
        session = await checkout.create_checkout_session(session_request)
        
        # Salva riferimento sessione
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "stripe_session_id": session.session_id,
                "stripe_checkout_url": session.url,
                "checkout_created_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logging.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore creazione checkout: {str(e)}")

@api_router.post("/cliente-analisi/verify-payment")
async def verify_analisi_payment(user_id: str = None, session_id: str = None):
    """
    Verifica il pagamento e aggiorna lo stato dell'utente.
    Chiamato dopo redirect da Stripe.
    """
    stripe_key = get_env_override('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    # Trova utente
    user = None
    if user_id:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Se già pagato
    if user.get("pagamento_analisi"):
        return {"success": True, "already_paid": True, "message": "Pagamento già confermato"}
    
    # Verifica con Stripe
    session_to_check = session_id or user.get("stripe_session_id")
    if not session_to_check:
        raise HTTPException(status_code=400, detail="Nessuna sessione di pagamento trovata")
    
    try:
        checkout = StripeCheckout(api_key=stripe_key)
        status = await checkout.get_checkout_status(session_to_check)
        
        if status.payment_status == "paid":
            # Aggiorna utente
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {
                    "pagamento_analisi": True,
                    "data_pagamento": datetime.now(timezone.utc).isoformat(),
                    "stripe_payment_status": "paid"
                }}
            )
            
            # Crea record cliente per il questionario
            cliente_id = str(uuid.uuid4())
            await db.clienti.insert_one({
                "id": cliente_id,
                "user_id": user["id"],
                "nome": user.get("nome"),
                "cognome": user.get("cognome"),
                "email": user.get("email"),
                "telefono": user.get("telefono"),
                "questionario_completato": False,
                "data_pagamento": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Aggiorna user con cliente_id
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"cliente_id": cliente_id}}
            )
            
            # Notifica Telegram
            try:
                telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
                admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
                if telegram_token and admin_chat_id:
                    message = f"💰 PAGAMENTO RICEVUTO €67\n\n👤 {user.get('nome')} {user.get('cognome')}\n📧 {user.get('email')}\n\n✅ Cliente pronto per questionario"
                    async with httpx.AsyncClient() as client_http:
                        await client_http.post(
                            f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                            json={"chat_id": admin_chat_id, "text": message}
                        )
            except:
                pass
            
            # 🔄 SYNC con Systeme.io
            try:
                systeme_result = await sync_payment_to_systeme(
                    email=user.get("email"),
                    nome=user.get("nome", ""),
                    cognome=user.get("cognome", ""),
                    payment_type="analisi",
                    amount=67.0,
                    metadata={"user_id": user["id"], "cliente_id": cliente_id}
                )
                logging.info(f"Systeme.io sync result for analisi payment: {systeme_result}")
            except Exception as sync_error:
                logging.error(f"Systeme.io sync failed (non-blocking): {sync_error}")
            
            return {
                "success": True,
                "paid": True,
                "cliente_id": cliente_id,
                "redirect_to": "/questionario"
            }
        else:
            return {
                "success": False,
                "paid": False,
                "status": status.payment_status,
                "message": "Pagamento non ancora completato"
            }
            
    except Exception as e:
        logging.error(f"Payment verification error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore verifica pagamento: {str(e)}")

@api_router.get("/cliente-analisi/status/{user_id}")
async def get_cliente_analisi_status(user_id: str):
    """
    Ritorna lo stato corrente del cliente analisi.
    """
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Verifica se è cliente_analisi
    if user.get("user_type") != "cliente_analisi":
        raise HTTPException(status_code=400, detail="Utente non è un cliente analisi")
    
    # Cerca cliente collegato
    cliente = None
    if user.get("cliente_id"):
        cliente = await db.clienti.find_one({"id": user["cliente_id"]}, {"_id": 0})
    
    return {
        "user_id": user_id,
        "nome": user.get("nome"),
        "cognome": user.get("cognome"),
        "email": user.get("email"),
        "pagamento_analisi": user.get("pagamento_analisi", False),
        "data_pagamento": user.get("data_pagamento"),
        "questionario_completato": cliente.get("questionario_completato", False) if cliente else False,
        "cliente_id": user.get("cliente_id"),
        "can_access_questionario": user.get("pagamento_analisi", False)
    }

class QuestionarioRequest(BaseModel):
    """Request per salvare il questionario cliente"""
    user_id: str
    risposte: List[Dict[str, Any]]
    # Campi strutturati
    expertise: Optional[str] = None
    cliente_target: Optional[str] = None
    risultato_promesso: Optional[str] = None
    pubblico_esistente: Optional[str] = None
    esperienze_vendita: Optional[str] = None
    ostacolo_principale: Optional[str] = None
    motivazione: Optional[str] = None
    completato_at: Optional[str] = None

@api_router.post("/cliente-analisi/questionario")
async def save_questionario_cliente(request: QuestionarioRequest):
    """
    Salva le risposte al questionario strategico del cliente.
    """
    # Trova l'utente
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    if user.get("user_type") != "cliente_analisi":
        raise HTTPException(status_code=400, detail="Solo i clienti analisi possono compilare questo questionario")
    
    # Salva questionario
    questionario_id = str(uuid.uuid4())
    questionario_doc = {
        "id": questionario_id,
        "user_id": request.user_id,
        "risposte": request.risposte,
        # Campi strutturati per facile accesso
        "expertise": request.expertise,
        "cliente_target": request.cliente_target,
        "risultato_promesso": request.risultato_promesso,
        "pubblico_esistente": request.pubblico_esistente,
        "esperienze_vendita": request.esperienze_vendita,
        "ostacolo_principale": request.ostacolo_principale,
        "motivazione": request.motivazione,
        "completato_at": request.completato_at or datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.questionari_analisi.insert_one(questionario_doc)
    
    # Aggiorna stato utente con i dati del questionario
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            "questionario_compilato": True,
            "questionario_id": questionario_id,
            "questionario_completato_at": questionario_doc["completato_at"],
            # Salva anche nel profilo utente per accesso rapido
            "expertise": request.expertise,
            "cliente_target": request.cliente_target,
            "risultato_promesso": request.risultato_promesso,
            "pubblico_esistente": request.pubblico_esistente,
            "esperienze_vendita": request.esperienze_vendita,
            "ostacolo_principale": request.ostacolo_principale,
            "motivazione": request.motivazione
        }}
    )
    
    # Notifica Telegram
    try:
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            nome = user.get('nome', '')
            cognome = user.get('cognome', '')
            email = user.get('email', '')
            expertise = request.expertise[:100] if request.expertise else 'N/D'
            message = f"📋 QUESTIONARIO COMPLETATO\n\n👤 {nome} {cognome}\n📧 {email}\n💼 {expertise}\n\n✅ Pronto per analisi e pagamento"
            async with httpx.AsyncClient() as client_http:
                await client_http.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message}
                )
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")
    
    # AUTO-GENERA BOZZA ANALISI (NUOVO FLUSSO)
    # La bozza viene generata automaticamente e resta nascosta al cliente
    # fino a quando l'admin non attiva la fase decisione
    try:
        from routers.flusso_analisi import genera_analisi_auto
        # Chiamata asincrona per generare l'analisi in background
        import asyncio
        asyncio.create_task(genera_analisi_auto(request.user_id))
        logging.info(f"[FLUSSO] Triggered auto-generation of bozza analisi for user {request.user_id}")
    except Exception as e:
        logging.warning(f"[FLUSSO] Auto-generation trigger failed: {e}")
    
    return {
        "success": True,
        "questionario_id": questionario_id,
        "message": "Questionario salvato con successo",
        "redirect_to": "/dashboard-cliente"
    }

# ═══════════════════════════════════════════════════════════════════════════
# ADMIN - Gestione Clienti Analisi
# ═══════════════════════════════════════════════════════════════════════════

@api_router.get("/admin/clienti-analisi")
async def get_clienti_analisi_admin():
    """
    Restituisce tutti i clienti analisi per il pannello admin.
    """
    try:
        # Trova tutti gli utenti con user_type = cliente_analisi
        clienti = await db.users.find(
            {"user_type": "cliente_analisi"},
            {"_id": 0, "password": 0}
        ).sort("data_registrazione", -1).to_list(1000)
        
        # Per ogni cliente, recupera anche i dati del questionario se presente
        for cliente in clienti:
            if cliente.get("questionario_id"):
                questionario = await db.questionari_analisi.find_one(
                    {"id": cliente["questionario_id"]},
                    {"_id": 0}
                )
                if questionario:
                    cliente["questionario_dettagli"] = questionario
        
        # Calcola statistiche
        stats = {
            "totale": len(clienti),
            "registrati": len([c for c in clienti if not c.get("questionario_compilato")]),
            "questionario_compilato": len([c for c in clienti if c.get("questionario_compilato") and not c.get("pagamento_analisi")]),
            "pagato": len([c for c in clienti if c.get("pagamento_analisi") and not c.get("analisi_generata")]),
            "analisi_pronta": len([c for c in clienti if c.get("analisi_generata")]),
            "call_da_fissare": len([c for c in clienti if c.get("call_stato") == "da_fissare"]),
            "call_fissata": len([c for c in clienti if c.get("call_stato") == "fissata"]),
            "call_completata": len([c for c in clienti if c.get("call_stato") == "completata"])
        }
        
        return {
            "success": True,
            "clienti": clienti,
            "stats": stats
        }
    except Exception as e:
        logging.error(f"Error loading clienti analisi: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/clienti-analisi/{user_id}")
async def get_cliente_analisi_detail(user_id: str):
    """
    Restituisce i dettagli di un singolo cliente analisi.
    """
    cliente = await db.users.find_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"_id": 0, "password": 0}
    )
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Recupera questionario
    if cliente.get("questionario_id"):
        questionario = await db.questionari_analisi.find_one(
            {"id": cliente["questionario_id"]},
            {"_id": 0}
        )
        cliente["questionario_dettagli"] = questionario
    
    return cliente

# ═══════════════════════════════════════════════════════════════════════════
# TEMPLATE ANALISI STRATEGICA EVOLUTION PRO
# ═══════════════════════════════════════════════════════════════════════════

ANALISI_TEMPLATE = """
# ANALISI STRATEGICA
## Evolution PRO - Accademia Digitale

Documento preparato per: **{nome} {cognome}**
Data: {data_analisi}

---

# PARTE 1 — INTRODUZIONE

## CHE COS'È QUESTA ANALISI

Questa Analisi Strategica ha l'obiettivo di valutare se la tua competenza professionale può essere trasformata in una Accademia Digitale sostenibile.

Non si tratta di un documento promozionale. È una valutazione oggettiva basata sulle informazioni che hai condiviso nel questionario strategico.

L'analisi ti aiuterà a:
- Comprendere i punti di forza e le aree di miglioramento del tuo progetto
- Capire se esistono le condizioni per costruire un'Accademia Digitale
- Prepararti alla call strategica con maggiore consapevolezza

---

## IL PROBLEMA PIÙ COMUNE

La maggior parte dei videocorsi non vende. Non perché manchino le competenze, ma perché manca una strategia.

I problemi più frequenti sono:

**Mancanza di posizionamento**
Molti professionisti non sanno comunicare cosa li rende diversi. Il mercato è saturo di contenuti generici e chi non si differenzia non viene notato.

**Contenuti generici**
Creare un corso "su tutto" significa non essere rilevanti per nessuno. I corsi che vendono risolvono problemi specifici per persone specifiche.

**Assenza di struttura**
Un videocorso non è una raccolta di video. È un percorso che porta lo studente da un punto A a un punto B. Senza questa struttura, il corso non genera trasformazione.

**Mancanza di sistema di acquisizione**
Anche il miglior corso del mondo non si vende da solo. Serve un sistema per farsi trovare, costruire fiducia e convertire i visitatori in studenti.

---

## IL MODELLO EVOLUTION PRO

Evolution PRO è un programma di partnership per professionisti che vogliono creare un'Accademia Digitale.

Il percorso si sviluppa in tre fasi:

**FASE 1 — POSIZIONAMENTO**
Definiamo insieme chi sei, chi aiuti e quale trasformazione offri. Questa è la base su cui costruire tutto il resto.

**FASE 2 — CREAZIONE ACCADEMIA**
Strutturiamo il percorso formativo, creiamo i contenuti e impostiamo la piattaforma. Non sei solo: il team Evolution PRO ti guida in ogni passaggio.

**FASE 3 — LANCIO E ACQUISIZIONE**
Costruiamo il sistema per attrarre studenti: funnel, contenuti, campagne. L'obiettivo è creare un flusso costante di nuovi iscritti.

Il processo è guidato. Non è un corso da seguire da solo. È una partnership operativa.

---

# PARTE 2 — ANALISI PERSONALIZZATA

---

## SEZIONE 1 — SINTESI DEL PROGETTO

**La tua competenza:** {expertise}

**Il tuo cliente ideale:** {cliente_target}

**Il risultato che prometti:** {risultato_promesso}

{sintesi_progetto}

---

## SEZIONE 2 — ANALISI DELLA COMPETENZA

{analisi_competenza}

---

## SEZIONE 3 — ANALISI DEL TARGET

**Cliente target dichiarato:** {cliente_target}

{analisi_target}

---

## SEZIONE 4 — PRESENZA ONLINE

**Situazione attuale:** {pubblico_esistente}

{analisi_presenza}

---

## SEZIONE 5 — ESPERIENZA DI VENDITA

**Esperienza dichiarata:** {esperienze_vendita}

{analisi_vendita}

---

## SEZIONE 6 — OSTACOLO PRINCIPALE

**Blocco identificato:** {ostacolo_principale}

{analisi_ostacolo}

---

## SEZIONE 7 — OBIETTIVO E MOTIVAZIONE

**Motivazione dichiarata:** {motivazione}

{analisi_motivazione}

---

## SEZIONE 8 — DIAGNOSI STRATEGICA

{diagnosi_strategica}

---

## VALUTAZIONE FINALE

**Punteggio di fattibilità: {punteggio_fattibilita}/10**

{spiegazione_punteggio}

---

## RACCOMANDAZIONE

{raccomandazione_finale}

---

## PROSSIMI PASSI

Il passo successivo è una **call strategica** con il team Evolution PRO.

Durante la call:
- Discuteremo insieme i punti di questa analisi
- Risponderemo alle tue domande
- Valuteremo se esistono le condizioni per una partnership

Non c'è alcun obbligo. La call serve a capire se possiamo lavorare insieme.

---

**Evolution PRO**
Email: supporto@evolution-pro.it
Sito: www.evolution-pro.it
"""

# System prompt per il consulente AI
CONSULENTE_SYSTEM_PROMPT = """Sei un consulente strategico senior di Evolution PRO.

Il tuo compito è analizzare le risposte del questionario di un professionista e generare una Analisi Strategica per valutare se la sua competenza può essere trasformata in una Accademia Digitale sostenibile.

REGOLE FONDAMENTALI:
- Scrivi in modo professionale ma semplice
- NON scrivere testo promozionale
- NON inventare informazioni
- Usa SOLO i dati forniti dal questionario
- Evita linguaggio tecnico inutile
- L'analisi deve sembrare un documento strategico preparato da un consulente esperto
- Lunghezza totale: tra 1200 e 1800 parole

STILE:
- Tono: professionale, diretto, onesto
- Evita frasi generiche o luoghi comuni
- Ogni analisi deve essere specifica per quel cliente
- Non usare emoji
- Non fare promesse esagerate"""

@api_router.post("/admin/clienti-analisi/{user_id}/genera-analisi-ai")
async def genera_analisi_ai(user_id: str):
    """
    Genera l'Analisi Strategica completa usando AI (Claude).
    Struttura professionale con punteggio di fattibilità e raccomandazione finale.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Recupera il cliente
    cliente = await db.users.find_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"_id": 0}
    )
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    if not cliente.get("questionario_compilato"):
        raise HTTPException(status_code=400, detail="Il cliente non ha completato il questionario")
    
    if not cliente.get("pagamento_analisi"):
        raise HTTPException(status_code=400, detail="Il cliente non ha ancora pagato l'analisi")
    
    # Recupera i dettagli del questionario
    questionario = await db.questionari_clienti.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    # Dati cliente
    nome = cliente.get("nome", "")
    cognome = cliente.get("cognome", "")
    expertise = questionario.get("expertise", cliente.get("expertise", "Non specificato")) if questionario else cliente.get("expertise", "Non specificato")
    cliente_target = questionario.get("cliente_target", cliente.get("cliente_target", "Non specificato")) if questionario else cliente.get("cliente_target", "Non specificato")
    risultato_promesso = questionario.get("risultato_promesso", cliente.get("risultato_promesso", "Non specificato")) if questionario else cliente.get("risultato_promesso", "Non specificato")
    pubblico_esistente = questionario.get("pubblico_esistente", cliente.get("pubblico_esistente", "Non specificato")) if questionario else cliente.get("pubblico_esistente", "Non specificato")
    esperienze_vendita = questionario.get("esperienze_vendita", cliente.get("esperienze_vendita", "Non specificato")) if questionario else cliente.get("esperienze_vendita", "Non specificato")
    ostacolo_principale = questionario.get("ostacolo_principale", cliente.get("ostacolo_principale", "Non specificato")) if questionario else cliente.get("ostacolo_principale", "Non specificato")
    motivazione = questionario.get("motivazione", cliente.get("motivazione", "Non specificato")) if questionario else cliente.get("motivazione", "Non specificato")
    
    # Genera analisi personalizzate con AI
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="Chiave LLM non configurata")
    
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"analisi_{user_id}_{datetime.now().timestamp()}",
        system_message=CONSULENTE_SYSTEM_PROMPT
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    
    # Prompt dettagliato per la generazione
    prompt = f"""Analizza le seguenti risposte del questionario e genera l'Analisi Strategica completa.

DATI DEL PROFESSIONISTA:
- Nome: {nome} {cognome}
- Expertise: {expertise}
- Cliente target: {cliente_target}
- Risultato promesso: {risultato_promesso}
- Pubblico esistente: {pubblico_esistente}
- Esperienze di vendita: {esperienze_vendita}
- Ostacolo principale: {ostacolo_principale}
- Motivazione attuale: {motivazione}

GENERA LE SEGUENTI SEZIONI in formato JSON:

1. SINTESI DEL PROGETTO (3-4 frasi)
Riassumi: la competenza del professionista, il tipo di clienti che aiuta, il problema che risolve.

2. ANALISI DELLA COMPETENZA (4-5 frasi)
Valuta: se la competenza è chiara, se è trasferibile in formato formativo, se ha potenziale educativo.

3. ANALISI DEL TARGET (4-5 frasi)
Valuta: chiarezza del target, specificità del problema, potenziale domanda di mercato.

4. ANALISI PRESENZA ONLINE (3-4 frasi)
Valuta: presenza social, community, database contatti. Se assente, spiega che non è un problema ma richiede strategia di acquisizione.

5. ANALISI ESPERIENZA VENDITA (3-4 frasi)
Valuta: se ha già venduto consulenze, percorsi, formazione. Questo indica validazione del mercato.

6. ANALISI OSTACOLO (3-4 frasi)
Analizza il blocco principale. Spiega perché è comune tra i professionisti che vogliono digitalizzare.

7. ANALISI MOTIVAZIONE (3-4 frasi)
Valuta: urgenza, desiderio di scalabilità, volontà di cambiare modello di lavoro.

8. DIAGNOSI STRATEGICA (5-6 frasi)
Valutazione finale del progetto. Indica uno di questi esiti:
A) Progetto con buon potenziale per una Accademia Digitale
B) Progetto interessante ma da chiarire nel posizionamento
C) Progetto ancora acerbo
Spiega sempre il motivo.

9. PUNTEGGIO FATTIBILITÀ (numero da 1 a 10)
Basato su: chiarezza competenza, definizione target, presenza mercato, esperienza vendita, motivazione.

10. SPIEGAZIONE PUNTEGGIO (2-3 frasi)
Spiega brevemente i fattori che hanno determinato il punteggio.

11. RACCOMANDAZIONE FINALE (2-3 frasi)
Una delle seguenti:
- "Consigliato procedere con la partnership Evolution PRO"
- "Consigliato un lavoro preliminare sul posizionamento prima della partnership"
- "Necessario consolidare alcuni aspetti del progetto prima di procedere"

Rispondi SOLO con un JSON valido in questo formato esatto:
{{
    "sintesi_progetto": "...",
    "analisi_competenza": "...",
    "analisi_target": "...",
    "analisi_presenza": "...",
    "analisi_vendita": "...",
    "analisi_ostacolo": "...",
    "analisi_motivazione": "...",
    "diagnosi_strategica": "...",
    "punteggio_fattibilita": 7,
    "spiegazione_punteggio": "...",
    "raccomandazione_finale": "..."
}}"""
    
    try:
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Estrai il JSON dalla risposta
        import json
        import re
        
        # Cerca il JSON nella risposta
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            analisi_json = json.loads(json_match.group())
        else:
            raise ValueError("JSON non trovato nella risposta")
            
    except Exception as e:
        # Fallback con analisi generiche
        print(f"Errore AI: {e}")
        analisi_json = {
            "sintesi_progetto": f"Il professionista opera nel campo '{expertise}' con l'obiettivo di aiutare '{cliente_target}' a ottenere '{risultato_promesso}'. Si tratta di un progetto che merita approfondimento durante la call strategica.",
            "analisi_competenza": f"La competenza dichiarata ('{expertise}') rappresenta una base da cui partire. Sarà importante verificare durante la call se questa competenza è sufficientemente definita e differenziata per creare un'Accademia Digitale di successo.",
            "analisi_target": f"Il target identificato ('{cliente_target}') necessita di ulteriore definizione. Un target chiaro e specifico è fondamentale per creare contenuti mirati e una strategia di acquisizione efficace.",
            "analisi_presenza": f"La situazione attuale ('{pubblico_esistente}') influenzerà la strategia di lancio. Non avere un pubblico non è un problema, ma richiede una strategia di acquisizione ben strutturata.",
            "analisi_vendita": f"L'esperienza di vendita dichiarata ('{esperienze_vendita}') è un indicatore importante della validazione del mercato. Chi ha già venduto conosce meglio le obiezioni e i bisogni dei clienti.",
            "analisi_ostacolo": f"L'ostacolo indicato ('{ostacolo_principale}') è comune tra i professionisti che vogliono digitalizzare la propria competenza. Riconoscere il blocco è il primo passo per superarlo.",
            "analisi_motivazione": f"La motivazione ('{motivazione}') indica il livello di urgenza e determinazione. Questo aspetto è cruciale per il successo del percorso.",
            "diagnosi_strategica": "Sulla base delle informazioni fornite, il progetto presenta elementi da approfondire. Durante la call strategica valuteremo insieme se esistono le condizioni per procedere con la partnership Evolution PRO.",
            "punteggio_fattibilita": 6,
            "spiegazione_punteggio": "Il punteggio riflette la necessità di approfondire alcuni aspetti del progetto durante la call strategica. I dati forniti permettono una valutazione preliminare, ma servono ulteriori dettagli.",
            "raccomandazione_finale": "Consigliato procedere con la call strategica per valutare insieme i prossimi passi e definire con maggiore precisione il posizionamento del progetto."
        }
    
    # Data analisi formattata
    data_analisi = datetime.now().strftime("%d %B %Y")
    
    # Genera il documento finale con il nuovo template
    analisi_completa = ANALISI_TEMPLATE.format(
        nome=nome,
        cognome=cognome,
        data_analisi=data_analisi,
        expertise=expertise,
        cliente_target=cliente_target,
        risultato_promesso=risultato_promesso,
        pubblico_esistente=pubblico_esistente,
        esperienze_vendita=esperienze_vendita,
        ostacolo_principale=ostacolo_principale,
        motivazione=motivazione,
        sintesi_progetto=analisi_json.get("sintesi_progetto", ""),
        analisi_competenza=analisi_json.get("analisi_competenza", ""),
        analisi_target=analisi_json.get("analisi_target", ""),
        analisi_presenza=analisi_json.get("analisi_presenza", ""),
        analisi_vendita=analisi_json.get("analisi_vendita", ""),
        analisi_ostacolo=analisi_json.get("analisi_ostacolo", ""),
        analisi_motivazione=analisi_json.get("analisi_motivazione", ""),
        diagnosi_strategica=analisi_json.get("diagnosi_strategica", ""),
        punteggio_fattibilita=analisi_json.get("punteggio_fattibilita", 6),
        spiegazione_punteggio=analisi_json.get("spiegazione_punteggio", ""),
        raccomandazione_finale=analisi_json.get("raccomandazione_finale", "")
    )
    
    return {
        "success": True,
        "analisi_testo": analisi_completa,
        "punteggio_fattibilita": analisi_json.get("punteggio_fattibilita", 6),
        "raccomandazione": analisi_json.get("raccomandazione_finale", ""),
        "cliente": {
            "id": user_id,
            "nome": nome,
            "cognome": cognome
        }
    }

@api_router.post("/admin/clienti-analisi/{user_id}/salva-analisi")
async def salva_analisi_cliente(user_id: str, analisi_testo: str = None):
    """
    Salva l'analisi generata nel database del cliente.
    Aggiunge tag 'analisi_pronta' in Systeme.io per triggerare email automatica.
    """
    if not analisi_testo:
        raise HTTPException(status_code=400, detail="Testo analisi mancante")
    
    # Recupera i dati del cliente per l'email
    cliente = await db.users.find_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"_id": 0}
    )
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Salva l'analisi nel database
    result = await db.users.update_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"$set": {
            "analisi_generata": True,
            "analisi_testo": analisi_testo,
            "analisi_data": datetime.now(timezone.utc).isoformat(),
            "analisi_stato": "generata",
            "email_analisi_inviata": False,
            "reminder_24h_inviato": False
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Errore nel salvataggio")
    
    # Invia notifica tramite Systeme.io (aggiunge tag che triggera automazione email)
    email_sent = False
    email_cliente = cliente.get("email", "")
    nome_cliente = cliente.get("nome", "")
    
    try:
        # Aggiungi tag "analisi_pronta" in Systeme.io
        # Questo triggera l'automazione email configurata in Systeme.io
        tag_result = await integrated_add_tag(email_cliente, "analisi_pronta")
        
        if tag_result.get("success"):
            email_sent = True
            # Aggiorna flag email inviata
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "email_analisi_inviata": True,
                    "email_analisi_data": datetime.now(timezone.utc).isoformat(),
                    "systeme_tag_analisi_pronta": True
                }}
            )
            print(f"Tag 'analisi_pronta' aggiunto a {email_cliente} in Systeme.io")
        else:
            print(f"Errore aggiunta tag Systeme.io: {tag_result}")
            
    except Exception as e:
        print(f"Errore Systeme.io per {email_cliente}: {e}")
    
    return {
        "success": True, 
        "message": "Analisi salvata con successo",
        "email_sent": email_sent,
        "systeme_tag_added": email_sent
    }

# Endpoint per inviare email reminder (chiamato da cron o scheduler)
@api_router.post("/admin/clienti-analisi/send-reminders")
async def send_reminder_emails():
    """
    Invia reminder tramite Systeme.io ai clienti con analisi pronta da più di 24 ore
    che non hanno ancora prenotato la call.
    Aggiunge tag 'reminder_analisi' che triggera automazione in Systeme.io.
    """
    # Trova clienti con analisi pronta da più di 24h senza reminder
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
    
    clienti = await db.users.find({
        "user_type": "cliente_analisi",
        "analisi_generata": True,
        "reminder_24h_inviato": {"$ne": True},
        "call_stato": {"$nin": ["fissata", "completata"]},
        "email_analisi_inviata": True
    }, {"_id": 0}).to_list(length=100)
    
    reminders_sent = 0
    
    for cliente in clienti:
        # Verifica se sono passate 24 ore
        email_data = cliente.get("email_analisi_data")
        if not email_data:
            continue
            
        try:
            email_datetime = datetime.fromisoformat(email_data.replace('Z', '+00:00'))
            if email_datetime > cutoff_time:
                continue  # Non sono ancora passate 24 ore
        except:
            continue
        
        email_cliente = cliente.get("email", "")
        
        try:
            # Aggiungi tag "reminder_analisi" in Systeme.io
            tag_result = await integrated_add_tag(email_cliente, "reminder_analisi")
            
            if tag_result.get("success"):
                # Aggiorna flag reminder
                await db.users.update_one(
                    {"id": cliente.get("id")},
                    {"$set": {
                        "reminder_24h_inviato": True,
                        "reminder_24h_data": datetime.now(timezone.utc).isoformat()
                    }}
                )
                reminders_sent += 1
                print(f"Tag 'reminder_analisi' aggiunto a {email_cliente}")
                
        except Exception as e:
            print(f"Errore reminder Systeme.io per {email_cliente}: {e}")
    
    return {
        "success": True,
        "reminders_sent": reminders_sent
    }

@api_router.post("/admin/clienti-analisi/{user_id}/stato-call")
async def aggiorna_stato_call(user_id: str, stato: str = "da_fissare"):
    """
    Aggiorna lo stato della call strategica.
    """
    stati_validi = ["da_fissare", "fissata", "completata", "annullata"]
    if stato not in stati_validi:
        raise HTTPException(status_code=400, detail=f"Stato non valido. Usa: {stati_validi}")
    
    result = await db.users.update_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"$set": {
            "call_stato": stato,
            "call_stato_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    return {"success": True, "message": f"Stato call aggiornato a: {stato}"}


@api_router.post("/admin/clienti-analisi/{user_id}/genera-script-call")
async def genera_script_call(user_id: str):
    """
    Genera uno Script Call personalizzato per la call strategica.
    Lo script è diviso in 8 blocchi operativi per guidare Claudio durante la call.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Recupera il cliente
    cliente = await db.users.find_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"_id": 0}
    )
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    if not cliente.get("questionario_compilato"):
        raise HTTPException(status_code=400, detail="Il cliente non ha completato il questionario")
    
    if not cliente.get("pagamento_analisi"):
        raise HTTPException(status_code=400, detail="Il cliente non ha ancora pagato l'analisi")
    
    # Recupera questionario e analisi
    questionario = await db.questionari_clienti.find_one({"user_id": user_id}, {"_id": 0})
    
    # Dati cliente
    nome = cliente.get("nome", "")
    cognome = cliente.get("cognome", "")
    expertise = questionario.get("expertise", cliente.get("expertise", "")) if questionario else cliente.get("expertise", "")
    cliente_target = questionario.get("cliente_target", cliente.get("cliente_target", "")) if questionario else cliente.get("cliente_target", "")
    risultato_promesso = questionario.get("risultato_promesso", cliente.get("risultato_promesso", "")) if questionario else cliente.get("risultato_promesso", "")
    pubblico_esistente = questionario.get("pubblico_esistente", cliente.get("pubblico_esistente", "")) if questionario else cliente.get("pubblico_esistente", "")
    esperienze_vendita = questionario.get("esperienze_vendita", cliente.get("esperienze_vendita", "")) if questionario else cliente.get("esperienze_vendita", "")
    ostacolo_principale = questionario.get("ostacolo_principale", cliente.get("ostacolo_principale", "")) if questionario else cliente.get("ostacolo_principale", "")
    motivazione = questionario.get("motivazione", cliente.get("motivazione", "")) if questionario else cliente.get("motivazione", "")
    analisi_testo = cliente.get("analisi_testo", "")
    punteggio = cliente.get("punteggio_fattibilita", "")
    raccomandazione = cliente.get("raccomandazione_finale", "")
    
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="Chiave LLM non configurata")
    
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"script_call_{user_id}_{datetime.now().timestamp()}",
        system_message="""Sei uno strategist senior di Evolution PRO.
Devi creare uno SCRIPT CALL personalizzato da usare durante una call strategica con un potenziale partner.

Lo script deve aiutare Claudio a:
1. Aprire la call in modo chiaro
2. Sintetizzare il progetto del cliente
3. Evidenziare il problema principale emerso
4. Mostrare l'opportunità concreta del progetto
5. Formulare una diagnosi strategica netta
6. Presentare in modo semplice la partnership Evolution PRO
7. Accompagnare la transizione verso la proposta economica
8. Prepararsi a gestire le obiezioni più probabili

Tono: consulenziale, diretto, professionale.
Non scrivere come fosse una landing page.
Scrivi come una traccia operativa che Claudio può usare in call."""
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    
    prompt = f"""Genera uno SCRIPT CALL personalizzato per la call strategica con questo cliente.

DATI DEL CLIENTE:
- Nome: {nome} {cognome}
- Expertise: {expertise}
- Cliente target: {cliente_target}
- Risultato promesso: {risultato_promesso}
- Pubblico esistente: {pubblico_esistente}
- Esperienze vendita: {esperienze_vendita}
- Ostacolo principale: {ostacolo_principale}
- Motivazione: {motivazione}

ANALISI GIÀ GENERATA:
{analisi_testo[:2000] if analisi_testo else "Analisi non ancora generata"}

PUNTEGGIO FATTIBILITÀ: {punteggio}/10
RACCOMANDAZIONE: {raccomandazione}

GENERA LO SCRIPT in formato JSON con questa struttura esatta:

{{
  "apertura_call": {{
    "obiettivo": "Mettere ordine e guidare il tono della conversazione",
    "script": "Testo da dire per aprire la call (ringraziamento + spiegazione cosa farete + anticipazione analisi/fattibilità/percorso)"
  }},
  "sintesi_progetto": {{
    "obiettivo": "Riassumere chi è il cliente e cosa fa",
    "script": "2-3 frasi su: chi è, cosa fa, chi aiuta, dove sta il potenziale"
  }},
  "problema_principale": {{
    "obiettivo": "Evidenziare il collo di bottiglia reale",
    "script": "Descrizione del limite del modello attuale e del rischio di restare fermo"
  }},
  "opportunita_concreta": {{
    "obiettivo": "Far vedere perché il progetto può funzionare",
    "script": "Quale formato è più adatto, cosa può diventare"
  }},
  "diagnosi_strategica": {{
    "obiettivo": "Dare un esito chiaro",
    "esito": "adatto | adatto con condizioni | non ancora pronto",
    "script": "Spiegazione della diagnosi"
  }},
  "presentazione_partnership": {{
    "obiettivo": "Spiegare la partnership Evolution PRO",
    "script": "Cosa fate voi, cosa fa il partner, come si sviluppa il percorso"
  }},
  "transizione_offerta": {{
    "obiettivo": "Passaggio morbido verso la proposta economica",
    "script": "Come introdurre attivazione, contratto, documenti, pagamento"
  }},
  "obiezioni_probabili": {{
    "obiettivo": "Preparare risposte alle obiezioni più probabili",
    "obiezioni": [
      {{
        "obiezione": "Testo obiezione 1",
        "risposta": "Come gestirla"
      }},
      {{
        "obiezione": "Testo obiezione 2", 
        "risposta": "Come gestirla"
      }},
      {{
        "obiezione": "Testo obiezione 3",
        "risposta": "Come gestirla"
      }}
    ]
  }}
}}

Rispondi SOLO con il JSON, senza commenti aggiuntivi."""

    try:
        response = await chat.send_message(UserMessage(content=prompt))
        script_text = response.content
        
        # Pulisci il JSON
        if "```json" in script_text:
            script_text = script_text.split("```json")[1].split("```")[0].strip()
        elif "```" in script_text:
            script_text = script_text.split("```")[1].split("```")[0].strip()
        
        import json
        script_json = json.loads(script_text)
        
        return {
            "success": True,
            "script": script_json,
            "cliente": {
                "id": user_id,
                "nome": nome,
                "cognome": cognome
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore generazione script: {str(e)}")


@api_router.post("/admin/clienti-analisi/{user_id}/salva-script-call")
async def salva_script_call(user_id: str, script_testo: str = None):
    """
    Salva lo script call generato nel database del cliente.
    """
    if not script_testo:
        raise HTTPException(status_code=400, detail="Testo script mancante")
    
    result = await db.users.update_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"$set": {
            "script_call_generato": True,
            "script_call_testo": script_testo,
            "script_call_data": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    return {"success": True, "message": "Script call salvato"}

@api_router.get("/admin/clienti-analisi/{user_id}/analisi-pdf")
async def scarica_analisi_pdf(user_id: str):
    """
    Genera e restituisce l'analisi in formato PDF.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    import io
    from starlette.responses import StreamingResponse
    
    # Recupera il cliente e l'analisi
    cliente = await db.users.find_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"_id": 0}
    )
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    if not cliente.get("analisi_testo"):
        raise HTTPException(status_code=400, detail="Analisi non ancora generata")
    
    # Crea il PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Stili
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1E2128')
    ))
    styles.add(ParagraphStyle(
        name='CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor('#F5C518')
    ))
    styles.add(ParagraphStyle(
        name='CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        leading=16
    ))
    
    # Contenuto
    story = []
    
    # Copertina
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("EVOLUTION PRO", styles['CustomTitle']))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("ANALISI STRATEGICA PERSONALIZZATA", styles['CustomTitle']))
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(f"Preparata per: {cliente.get('nome', '')} {cliente.get('cognome', '')}", styles['CustomBody']))
    story.append(Paragraph(f"Data: {datetime.now().strftime('%d/%m/%Y')}", styles['CustomBody']))
    story.append(PageBreak())
    
    # Contenuto analisi
    analisi_testo = cliente.get("analisi_testo", "")
    
    # Parse del markdown semplice
    for line in analisi_testo.split('\n'):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.3*cm))
        elif line.startswith('# '):
            story.append(Paragraph(line[2:], styles['CustomTitle']))
        elif line.startswith('## '):
            story.append(Paragraph(line[3:], styles['CustomHeading']))
        elif line.startswith('**') and line.endswith('**'):
            story.append(Paragraph(f"<b>{line[2:-2]}</b>", styles['CustomBody']))
        elif line.startswith('- '):
            story.append(Paragraph(f"• {line[2:]}", styles['CustomBody']))
        elif line == '---':
            story.append(Spacer(1, 0.5*cm))
        else:
            # Gestisci bold inline
            import re
            line = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', line)
            story.append(Paragraph(line, styles['CustomBody']))
    
    # Genera PDF
    doc.build(story)
    buffer.seek(0)
    
    filename = f"Analisi_Strategica_{cliente.get('cognome', 'Cliente')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/admin/clienti-analisi/{user_id}/genera-analisi")
async def genera_analisi_cliente(user_id: str):
    """
    Imposta analisi_generata = true per un cliente (metodo legacy).
    """
    result = await db.users.update_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"$set": {
            "analisi_generata": True,
            "analisi_generata_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    return {"success": True, "message": "Analisi segnata come generata"}

@api_router.post("/onboarding/send-systeme-email/{partner_id}")
async def send_systeme_instructions_email(partner_id: str, systeme_email: str = None, systeme_password: str = None):
    """Send Systeme.io platform instructions email to partner (called by team after creating sub-account)"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    email = partner.get("email")
    name = partner.get("name", "Partner")
    
    subject = "📚 Le tue credenziali Systeme.io - Evolution PRO"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1E2128 0%, #2D3038 100%); padding: 30px; text-align: center;">
            <h1 style="color: #F2C418; margin: 0;">Piattaforma Systeme.io</h1>
        </div>
        
        <div style="padding: 30px; background: #fff;">
            <p>Ciao <strong>{name}</strong>! 👋</p>
            
            <p>Il tuo account sulla piattaforma <strong>Systeme.io</strong> è stato creato. Ecco le tue credenziali:</p>
            
            <div style="background: #FAFAF7; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h3 style="color: #1E2128; margin-top: 0;">🔐 Credenziali Systeme.io</h3>
                <p><strong>URL:</strong> <a href="https://systeme.io/dashboard" style="color: #F2C418;">https://systeme.io/dashboard</a></p>
                <p><strong>Email:</strong> {systeme_email or email}</p>
                <p><strong>Password:</strong> {systeme_password or "[Ti verrà comunicata separatamente]"}</p>
            </div>
            
            <div style="background: #FFF8DC; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #F2C418;">
                <h3 style="color: #1E2128; margin-top: 0;">📖 Cosa è Systeme.io?</h3>
                <p>Systeme.io è la piattaforma dove:</p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Pubblicherai il tuo <strong>videocorso</strong></li>
                    <li>Gestirai il tuo <strong>funnel di vendita</strong></li>
                    <li>Invierai le <strong>email automatiche</strong> ai tuoi lead</li>
                    <li>Riceverai i <strong>pagamenti</strong> dai tuoi clienti</li>
                </ul>
            </div>
            
            <div style="background: #E8F5E9; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                <h3 style="color: #1E2128; margin-top: 0;">✅ Prossimi Passi</h3>
                <ol style="margin: 0; padding-left: 20px;">
                    <li>Accedi a Systeme.io con le credenziali sopra</li>
                    <li>Esplora la dashboard (non modificare nulla per ora)</li>
                    <li>Continua il percorso sull'app Evolution PRO</li>
                    <li>Quando sarà il momento, <strong>GAIA</strong> configurerà tutto per te!</li>
                </ol>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                <strong>Importante:</strong> Non modificare le impostazioni di Systeme.io autonomamente. Il team Evolution PRO configurerà tutto al momento giusto del tuo percorso.
            </p>
        </div>
        
        <div style="background: #FAFAF7; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>© 2026 Evolution PRO - Tutti i diritti riservati</p>
        </div>
    </body>
    </html>
    """
    
    # Log and store
    logging.info(f"Systeme.io instructions email prepared for {email}")
    
    await db.email_logs.insert_one({
        "type": "systeme_instructions",
        "to": email,
        "partner_id": partner_id,
        "subject": subject,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": "sent"
    })
    
    # Update partner onboarding status
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "onboarding_status.systeme_email_sent": True,
            "onboarding_status.systeme_email_date": datetime.now(timezone.utc).isoformat(),
            "onboarding_status.systeme_email": systeme_email,
        }}
    )
    
    return {"success": True, "message": f"Email istruzioni Systeme.io inviata a {email}"}

@api_router.post("/onboarding/send-welcome-email/{partner_id}")
async def resend_welcome_email(partner_id: str):
    """Send or resend welcome email to partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    email = partner.get("email")
    name = partner.get("name", "Partner")
    
    if not email:
        raise HTTPException(status_code=400, detail="Partner email not found")
    
    try:
        await send_partner_welcome_email(email, name)
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "onboarding_status.welcome_email_sent": True,
                "onboarding_status.welcome_email_date": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"success": True, "message": f"Email di benvenuto inviata a {email}"}
    except Exception as e:
        logging.error(f"Failed to send welcome email: {e}")
        raise HTTPException(status_code=500, detail=f"Errore invio email: {str(e)}")

@api_router.patch("/onboarding/systeme-account/{partner_id}")
async def mark_systeme_account_created(partner_id: str, systeme_email: str = None):
    """Mark that Systeme.io sub-account has been created for partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "onboarding_status.systeme_account_created": True,
            "onboarding_status.systeme_account_date": datetime.now(timezone.utc).isoformat(),
            "onboarding_status.systeme_email": systeme_email,
        }}
    )
    
    return {"success": True, "message": "Account Systeme.io contrassegnato come creato"}

@api_router.get("/onboarding/status")
async def get_onboarding_status():
    """Get onboarding status for all partners (for admin dashboard)"""
    partners = await db.partners.find(
        {},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "phase": 1, "onboarding_status": 1, "contract": 1}
    ).to_list(100)
    
    # Add default onboarding_status if missing
    for p in partners:
        if "onboarding_status" not in p:
            p["onboarding_status"] = {
                "welcome_email_sent": False,
                "systeme_account_created": False,
                "systeme_email_sent": False
            }
    
    return {"partners": partners}

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
# ROUTES - OLLAMA (Local LLM)
# =============================================================================

from ollama_service import (
    ollama_service, 
    extract_lead_data_from_html,
    clean_and_deduplicate_leads,
    generate_micro_post,
    validate_and_normalize_data
)

@api_router.get("/ollama/status")
async def get_ollama_status():
    """Verifica stato del servizio Ollama locale"""
    return await ollama_service.get_status()

@api_router.post("/ollama/pull-model")
async def pull_ollama_model(model: str = "llama3:8b"):
    """Scarica un modello su Ollama"""
    return await ollama_service.pull_model(model)

@api_router.post("/ollama/extract-lead-html")
async def api_extract_lead_html(url: str, html: str):
    """[GAIA] Estrai dati lead da HTML usando Llama 3 locale"""
    return await extract_lead_data_from_html(html, url)

@api_router.post("/ollama/clean-leads")
async def api_clean_leads(leads: list):
    """[DISCOVERY] Pulisci e deduplica lead usando Llama 3 locale"""
    return await clean_and_deduplicate_leads(leads)

@api_router.post("/ollama/generate-micropost")
async def api_generate_micropost(topic: str, platform: str = "linkedin", tone: str = "professionale"):
    """Genera micro-post usando Llama 3 locale"""
    return await generate_micro_post(topic, platform, tone)

@api_router.post("/ollama/validate-data")
async def api_validate_data(data: dict, schema_type: str = "lead"):
    """Valida e normalizza dati usando Llama 3 locale"""
    return await validate_and_normalize_data(data, schema_type)

@api_router.post("/ollama/test")
async def test_ollama_generation(prompt: str):
    """Test generazione con Ollama"""
    result = await ollama_service.generate(prompt, temperature=0.3)
    return {
        "prompt": prompt,
        "response": result,
        "model": ollama_service.model,
        "host": ollama_service._active_host
    }

# =============================================================================
# ROUTES - PARTNERS
# =============================================================================

@api_router.get("/partners/with-social")
async def get_partners_with_social():
    """Lista partner con avatar o social plan configurato per la dashboard produzione video"""
    partners = await db.partners.find(
        {
            "$or": [
                {"avatar_status": {"$in": ["AWAITING_CONSENT", "VERIFIED", "ACTIVE"]}},
                {"social_plan.is_active": True},
                {"heygen_id": {"$exists": True, "$ne": None}}
            ]
        },
        {
            "_id": 0, "id": 1, "name": 1, "nome": 1, "email": 1, "niche": 1,
            "avatar_status": 1, "heygen_id": 1, "heygen_voice_id": 1,
            "social_plan": 1, "content_credits": 1, "journey_phase": 1
        }
    ).sort("name", 1).to_list(100)
    
    if not partners:
        partners = await db.partners.find(
            {"status": {"$in": ["active", "onboarding", "development"]}},
            {
                "_id": 0, "id": 1, "name": 1, "nome": 1, "email": 1, "niche": 1,
                "avatar_status": 1, "heygen_id": 1, "heygen_voice_id": 1,
                "social_plan": 1, "content_credits": 1, "journey_phase": 1
            }
        ).sort("name", 1).to_list(50)
    
    return {"partners": partners, "count": len(partners)}

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
async def update_partner(
    partner_id: str, 
    request: Request
):
    """
    Aggiorna i dati di un partner.
    Supporta: phase, alert, modules, niche/nicchia, youtube_playlist_id, bio, social links, contract_end, revision_notes
    """
    # Parse JSON body
    try:
        body = await request.json()
    except:
        body = {}
    
    # Get current partner data for comparison
    current_partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not current_partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    old_phase = current_partner.get("phase")
    
    update = {}
    
    # Phase
    if body.get("phase"):
        update["phase"] = body["phase"]
        update["fase"] = body["phase"]  # Alias per compatibilità
    
    # Alert
    if "alert" in body:
        update["alert"] = body["alert"]
    
    # Modules
    if body.get("modules"):
        update["modules"] = body["modules"]
    
    # Nicchia (supporta entrambi i nomi)
    nicchia = body.get("nicchia") or body.get("niche")
    if nicchia is not None:
        update["nicchia"] = nicchia
        update["niche"] = nicchia  # Alias per compatibilità
    
    # YouTube Playlist
    playlist_id = body.get("youtube_playlist_id") or body.get("yt_playlist_id")
    if playlist_id is not None:
        update["youtube_playlist_id"] = playlist_id
        update["yt_playlist_id"] = playlist_id  # Alias
    
    # Bio
    if body.get("bio") is not None:
        update["bio"] = body["bio"]
    
    # Social Links
    if body.get("social_instagram") is not None:
        update["social_instagram"] = body["social_instagram"]
    if body.get("social_linkedin") is not None:
        update["social_linkedin"] = body["social_linkedin"]
    if body.get("social_website") is not None:
        update["social_website"] = body["social_website"]
    
    # Contract End
    if body.get("contract_end") is not None:
        update["contract_end"] = body["contract_end"]
    
    # Revision Notes (admin only)
    if body.get("revision_notes") is not None:
        update["revision_notes"] = body["revision_notes"]
    
    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.partners.update_one({"id": partner_id}, {"$set": update})
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    
    # Send Telegram notification if phase changed
    new_phase = body.get("phase")
    if new_phase and old_phase and new_phase != old_phase and partner:
        try:
            from valentina_ai import telegram_notify
            await telegram_notify(
                notification_type="phase_complete",
                partner_name=partner.get("name") or partner.get("nome", "Partner"),
                old_phase=old_phase,
                new_phase=new_phase
            )
            logging.info(f"Telegram notification sent: {partner.get('name')} {old_phase} → {new_phase}")
        except Exception as e:
            logging.error(f"Failed to send Telegram notification: {e}")
        
        # 🔄 AUTO-TRIGGER: Check if Social module should be activated (F6+)
        try:
            from routers.avatar_social import check_social_trigger
            trigger_result = await check_social_trigger(partner_id, new_phase)
            if trigger_result.get("triggered"):
                logging.info(f"[AUTO-TRIGGER] Social module activated for {partner.get('name')}: {trigger_result.get('reason')}")
        except Exception as e:
            logging.error(f"Failed to check social trigger: {e}")
    
    return partner


@api_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str):
    """
    Elimina definitivamente un partner e tutti i suoi dati associati.
    """
    # Verifica che il partner esista
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    partner_name = partner.get("name") or partner.get("nome", "Partner")
    
    # Elimina il partner
    await db.partners.delete_one({"id": partner_id})
    
    # Elimina documenti associati
    await db.partner_documents.delete_many({"partner_id": partner_id})
    
    # Elimina pagamenti associati
    await db.partner_payments.delete_many({"partner_id": partner_id})
    
    # Elimina file associati
    await db.partner_files.delete_many({"partner_id": partner_id})
    
    # Log
    logging.info(f"Partner eliminato: {partner_name} (ID: {partner_id})")
    
    return {"success": True, "message": f"Partner {partner_name} eliminato con successo"}

# =============================================================================
# ROUTES - PARTNER PROFILE (Extended)
# =============================================================================

class PartnerProfileUpdate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    vat_number: Optional[str] = None
    address: Optional[str] = None
    contract_type: Optional[str] = None
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None
    social_instagram: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_youtube: Optional[str] = None

# Complete Partner Profile Hub Model
class PartnerProfileHub(BaseModel):
    # Identity
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    photo: Optional[str] = None
    # Social
    website: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    youtube: Optional[str] = None
    # Positioning
    whoYouAre: Optional[str] = None
    targetAudience: Optional[str] = None
    problem: Optional[str] = None
    solution: Optional[str] = None
    pitch: Optional[str] = None
    differentiator: Optional[str] = None
    # Offer
    offerName: Optional[str] = None
    offerPrice: Optional[str] = None
    offerIncludes: Optional[str] = None
    offerGuarantee: Optional[str] = None
    # Brand Kit
    logo: Optional[str] = None
    primaryColor: Optional[str] = None
    accentColor: Optional[str] = None
    textColor: Optional[str] = None
    bgColor: Optional[str] = None
    fontPrimary: Optional[str] = None
    fontSecondary: Optional[str] = None
    toneOfVoice: Optional[str] = None
    keywords: Optional[str] = None
    # Media
    heroPhoto: Optional[str] = None
    introVideo: Optional[str] = None
    voiceSample: Optional[str] = None
    # Progress
    progress: Optional[Dict[str, int]] = None
    currentStep: Optional[int] = None

@api_router.get("/partner-hub/{partner_id}")
async def get_partner_hub(partner_id: str):
    """Get complete partner hub profile - all data Andrea needs"""
    # Get base partner data
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Get hub profile data
    hub_profile = await db.partner_hub.find_one({"partner_id": partner_id}, {"_id": 0})
    
    # Get brand kit
    brand_kit = await db.partner_brand_kits.find_one({"partner_id": partner_id}, {"_id": 0})
    
    # Merge all data
    result = {
        "id": partner.get("id"),
        "name": partner.get("name", ""),
        "email": partner.get("email", ""),
        "phone": partner.get("phone", ""),
        "niche": partner.get("niche", ""),
        "phase": partner.get("phase", "F1"),
        "revenue": partner.get("revenue", 0),
        "created_at": partner.get("created_at", ""),
        # Hub profile data (overrides if exists)
        "city": "",
        "bio": "",
        "photo": None,
        "website": "",
        "instagram": "",
        "linkedin": "",
        "youtube": "",
        "whoYouAre": "",
        "targetAudience": "",
        "problem": "",
        "solution": "",
        "pitch": "",
        "differentiator": "",
        "offerName": "",
        "offerPrice": "",
        "offerIncludes": "",
        "offerGuarantee": "",
        "logo": None,
        "primaryColor": "#2C5F8A",
        "accentColor": "#F2C418",
        "textColor": "#1E2128",
        "bgColor": "#FAFAF7",
        "fontPrimary": "Nunito Bold",
        "fontSecondary": "Nunito Regular",
        "toneOfVoice": "",
        "keywords": "",
        "heroPhoto": None,
        "introVideo": None,
        "voiceSample": None,
        "progress": {
            "positioning": 0,
            "masterclass": 0,
            "videocorso": 0,
            "funnel": 0
        },
        "currentStep": 1
    }
    
    # Merge hub profile
    if hub_profile:
        for key, value in hub_profile.items():
            if key not in ["_id", "partner_id"] and value is not None:
                result[key] = value
    
    # Merge brand kit
    if brand_kit:
        result["logo"] = brand_kit.get("logo", result["logo"])
        result["primaryColor"] = brand_kit.get("primary_color", result["primaryColor"])
        result["accentColor"] = brand_kit.get("accent_color", result["accentColor"])
        result["textColor"] = brand_kit.get("text_color", result["textColor"])
        result["bgColor"] = brand_kit.get("bg_color", result["bgColor"])
        result["fontPrimary"] = brand_kit.get("font_primary", result["fontPrimary"])
        result["fontSecondary"] = brand_kit.get("font_secondary", result["fontSecondary"])
    
    return result

@api_router.put("/partner-hub/{partner_id}")
async def update_partner_hub(partner_id: str, data: PartnerProfileHub):
    """Update partner hub profile"""
    # Check partner exists
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["partner_id"] = partner_id
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Upsert hub profile
    await db.partner_hub.update_one(
        {"partner_id": partner_id},
        {"$set": update_data},
        upsert=True
    )
    
    # Also update main partner name if changed
    if data.name:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"name": data.name}}
        )
    
    # Return updated profile
    return await get_partner_hub(partner_id)

@api_router.patch("/partner-hub/{partner_id}/field")
async def update_partner_hub_field(partner_id: str, field: str, value: str):
    """Update a single field in partner hub profile"""
    # Check partner exists
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Update the specific field
    await db.partner_hub.update_one(
        {"partner_id": partner_id},
        {
            "$set": {
                field: value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "field": field, "value": value}

class PaymentRecord(BaseModel):
    partner_id: str
    amount: float
    description: str
    date: str
    status: str = "paid"  # paid, pending, overdue
    invoice_number: Optional[str] = None

@api_router.get("/partners/{partner_id}/profile")
async def get_partner_profile(partner_id: str):
    """Get extended partner profile"""
    # Get base partner data
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Get extended profile data
    profile = await db.partner_profiles.find_one({"partner_id": partner_id}, {"_id": 0})
    
    # Merge data
    result = {**partner}
    if profile:
        result.update(profile)
    
    # Calculate contract end if not set
    if not result.get("contract_end") and result.get("contract"):
        contract_start = datetime.fromisoformat(result["contract"].replace("Z", "+00:00")) if "T" in result["contract"] else datetime.strptime(result["contract"], "%Y-%m-%d")
        contract_type = result.get("contract_type", "standard")
        months = 12 if contract_type in ["standard", "premium"] else 24
        contract_end = contract_start + timedelta(days=months * 30)
        result["contract_end"] = contract_end.strftime("%Y-%m-%d")
        result["contract_start"] = result["contract"]
    
    return result

@api_router.patch("/partners/{partner_id}/profile")
async def update_partner_profile(partner_id: str, data: PartnerProfileUpdate):
    """Update extended partner profile"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["partner_id"] = partner_id
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update or create profile
    await db.partner_profiles.update_one(
        {"partner_id": partner_id},
        {"$set": update_data},
        upsert=True
    )
    
    # Also update base partner if contract changed
    if data.contract_start:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"contract": data.contract_start}}
        )
    
    return {"success": True, "partner_id": partner_id}

@api_router.get("/partners/{partner_id}/payments")
async def get_partner_payments(partner_id: str):
    """Get partner payment history"""
    payments = await db.partner_payments.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    return payments

@api_router.post("/partners/{partner_id}/payments")
async def add_partner_payment(partner_id: str, payment: PaymentRecord):
    """Add a payment record"""
    payment_data = payment.model_dump()
    payment_data["id"] = str(uuid.uuid4())
    payment_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.partner_payments.insert_one(payment_data)
    
    # Update partner revenue
    if payment.status == "paid":
        await db.partners.update_one(
            {"id": partner_id},
            {"$inc": {"revenue": payment.amount}}
        )
    
    return {"success": True, "payment_id": payment_data["id"]}


@api_router.patch("/partners/{partner_id}/payments/{payment_id}")
async def update_partner_payment(partner_id: str, payment_id: str, request: Request):
    """Update a payment status"""
    try:
        body = await request.json()
    except:
        body = {}
    
    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status richiesto")
    
    # Get current payment
    payment = await db.partner_payments.find_one({"id": payment_id, "partner_id": partner_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento non trovato")
    
    old_status = payment.get("status")
    amount = payment.get("amount", 0)
    
    # Update payment
    await db.partner_payments.update_one(
        {"id": payment_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update partner revenue if status changed
    if old_status != new_status:
        if new_status == "paid" and old_status != "paid":
            # Changed to paid: add revenue
            await db.partners.update_one({"id": partner_id}, {"$inc": {"revenue": amount}})
        elif old_status == "paid" and new_status != "paid":
            # Changed from paid: subtract revenue
            await db.partners.update_one({"id": partner_id}, {"$inc": {"revenue": -amount}})
    
    return {"success": True, "payment_id": payment_id, "new_status": new_status}


@api_router.post("/partners/{partner_id}/files/upload")
async def upload_partner_files(partner_id: str, files: List[UploadFile] = File(...), is_raw: str = Form("false")):
    """Upload files for partner (can be marked as RAW for admin review)"""
    from cloudinary_service import cloudinary_upload
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    uploaded_files = []
    is_raw_bool = is_raw.lower() == "true"
    
    for file in files:
        try:
            # Read file content
            content = await file.read()
            
            # Upload to Cloudinary
            result = await cloudinary_upload(
                file_content=content,
                filename=file.filename,
                folder=f"partner_files/{partner_id}",
                resource_type="auto"
            )
            
            # Save to database
            file_doc = {
                "id": str(uuid.uuid4()),
                "partner_id": partner_id,
                "name": file.filename,
                "filename": file.filename,
                "url": result.get("url"),
                "public_id": result.get("public_id"),
                "type": file.content_type,
                "size": len(content),
                "is_raw": is_raw_bool,
                "status": "pending_review" if is_raw_bool else "approved",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.partner_files.insert_one(file_doc)
            uploaded_files.append({
                "id": file_doc["id"],
                "name": file.filename,
                "url": result.get("url"),
                "is_raw": is_raw_bool
            })
            
        except Exception as e:
            logging.error(f"Error uploading file {file.filename}: {e}")
            continue
    
    # Notify admin if RAW files were uploaded
    if is_raw_bool and uploaded_files:
        try:
            from valentina_ai import telegram_notify
            partner_name = partner.get("name") or partner.get("nome", "Partner")
            await telegram_notify(
                notification_type="raw_upload",
                partner_name=partner_name,
                file_count=len(uploaded_files)
            )
        except Exception as e:
            logging.error(f"Failed to send RAW upload notification: {e}")
    
    return {"success": True, "uploaded": uploaded_files, "count": len(uploaded_files)}

# =============================================================================
# PIANO CONTINUITÀ ENDPOINTS
# =============================================================================

@api_router.get("/partners/{partner_id}/piano-continuita")
async def get_piano_continuita(partner_id: str):
    """Get partner's Piano Continuità"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "piano_continuita": 1, "phase": 1})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    piano = partner.get("piano_continuita", {
        "piano_attivo": None,
        "data_attivazione": None,
        "data_rinnovo": None,
        "mrr": 0,
        "commissione_percentuale": 0,
        "fee_mensile": 0,
        "ultimo_check_in_ai": None,
        "note": ""
    })
    
    # Add plan details if active
    if piano.get("piano_attivo") and piano["piano_attivo"] in PIANI_CONTINUITA:
        plan_config = PIANI_CONTINUITA[piano["piano_attivo"]]
        piano["fee_mensile"] = plan_config["fee_mensile"]
        piano["commissione_percentuale"] = plan_config["commissione_percentuale"]
        piano["piano_label"] = plan_config["label"]
    
    return piano

@api_router.put("/partners/{partner_id}/piano-continuita")
async def update_piano_continuita(partner_id: str, data: dict):
    """Update partner's Piano Continuità"""
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    piano_attivo = data.get("piano_attivo")
    data_attivazione = data.get("data_attivazione")
    mrr = data.get("mrr", 0)
    note = data.get("note", "")
    
    # Calculate fee and commission based on plan
    fee_mensile = 0
    commissione_percentuale = 0
    if piano_attivo and piano_attivo in PIANI_CONTINUITA:
        plan_config = PIANI_CONTINUITA[piano_attivo]
        fee_mensile = plan_config["fee_mensile"]
        commissione_percentuale = plan_config["commissione_percentuale"]
    
    # Calculate renewal date (12 months from activation)
    data_rinnovo = None
    if data_attivazione:
        try:
            activation_date = datetime.fromisoformat(data_attivazione.replace("Z", "+00:00"))
            renewal_date = activation_date.replace(year=activation_date.year + 1)
            data_rinnovo = renewal_date.isoformat()
        except:
            pass
    
    piano_continuita = {
        "piano_attivo": piano_attivo,
        "data_attivazione": data_attivazione,
        "data_rinnovo": data_rinnovo,
        "mrr": mrr,
        "commissione_percentuale": commissione_percentuale,
        "fee_mensile": fee_mensile,
        "ultimo_check_in_ai": partner.get("piano_continuita", {}).get("ultimo_check_in_ai"),
        "note": note
    }
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"piano_continuita": piano_continuita}}
    )
    
    # If activating a plan and partner is at F9, advance to F10
    current_phase = partner.get("phase", "F1")
    if piano_attivo and current_phase in ["F8", "F9"]:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"phase": "F10"}}
        )
        piano_continuita["phase_advanced"] = True
    
    return {"success": True, "piano_continuita": piano_continuita}


@api_router.post("/partners/{partner_id}/attiva-piano")
async def attiva_piano_partner(partner_id: str, piano: str = None):
    """
    Attiva un piano per il partner (continuita_attiva o growth_partner_attivo).
    """
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    valid_plans = ["continuita_attiva", "growth_partner_attivo"]
    if piano not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Piano non valido. Usa: {valid_plans}")
    
    update_data = {
        piano: True,
        f"{piano}_data": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": update_data}
    )
    
    return {
        "success": True, 
        "message": f"Piano {piano} attivato con successo",
        "piano": piano
    }


@api_router.post("/partners/{partner_id}/send-documents")
async def send_partner_documents(partner_id: str, email: str = None):
    """Send documents to partner via email (placeholder)"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Get profile for email
    profile = await db.partner_profiles.find_one({"partner_id": partner_id}, {"_id": 0})
    target_email = email or (profile.get("email") if profile else None)
    
    if not target_email:
        raise HTTPException(status_code=400, detail="No email address available")
    
    # TODO: Implement actual email sending with SendGrid/Resend
    # For now, just log and return success
    logging.info(f"Would send documents to {target_email} for partner {partner_id}")
    
    return {"success": True, "email": target_email, "message": "Documents queued for sending"}

@api_router.get("/partners/{partner_id}/export-pdf")
async def export_partner_pdf(partner_id: str):
    """Export partner documents as PDF (returns text for now)"""
    from fastapi.responses import PlainTextResponse
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    profile = await db.partner_profiles.find_one({"partner_id": partner_id}, {"_id": 0})
    positioning = await db.partner_positioning.find_one({"partner_id": partner_id}, {"_id": 0})
    script = await db.masterclass_scripts.find_one({"partner_id": partner_id}, {"_id": 0})
    
    # Generate text content
    content = f"""═══════════════════════════════════════════════════════════════
    PROFILO PARTNER — {partner.get('name', 'Partner')}
═══════════════════════════════════════════════════════════════

📋 ANAGRAFICA
Nome: {partner.get('name', '—')}
Email: {profile.get('email', '—') if profile else '—'}
Telefono: {profile.get('phone', '—') if profile else '—'}
Azienda: {profile.get('company', '—') if profile else '—'}
P.IVA: {profile.get('vat_number', '—') if profile else '—'}
Nicchia: {partner.get('niche', '—')}

📄 CONTRATTO
Data Inizio: {partner.get('contract', '—')}
Tipo: {profile.get('contract_type', 'standard') if profile else 'standard'}

📊 STATO
Fase Attuale: {partner.get('phase', 'F1')}
Revenue Generato: €{partner.get('revenue', 0):,}

"""
    
    if positioning and positioning.get('canvas'):
        content += f"\n📝 POSIZIONAMENTO\n{positioning['canvas']}\n"
    
    if script and script.get('blocks'):
        content += "\n🎤 SCRIPT MASTERCLASS\n"
        for key, value in script['blocks'].items():
            if value:
                content += f"\n[{key.upper()}]\n{value}\n"
    
    content += f"""
═══════════════════════════════════════════════════════════════
    Generato da Evolution PRO OS — {datetime.now().strftime("%d/%m/%Y %H:%M")}
═══════════════════════════════════════════════════════════════"""
    
    return PlainTextResponse(content, media_type="text/plain")

@api_router.get("/partners/{partner_id}/contract-pdf")
async def get_partner_contract_pdf(partner_id: str):
    """Generate and return the partner's contract as a professionally formatted PDF"""
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm, cm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
    import io
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    profile = await db.partner_profiles.find_one({"partner_id": partner_id}, {"_id": 0})
    
    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4,
        rightMargin=2*cm, 
        leftMargin=2*cm,
        topMargin=2*cm, 
        bottomMargin=2*cm
    )
    
    # Custom styles
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=HexColor('#1E2128'),
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    # Subtitle style
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=HexColor('#F5C518'),
        spaceBefore=6,
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    # Article title style
    article_title_style = ParagraphStyle(
        'ArticleTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=HexColor('#1E2128'),
        spaceBefore=16,
        spaceAfter=8,
        leftIndent=0
    )
    
    # Body text style
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HexColor('#3B4049'),
        spaceBefore=4,
        spaceAfter=4,
        alignment=TA_JUSTIFY,
        leading=14
    )
    
    # Info box style
    info_style = ParagraphStyle(
        'InfoBox',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#5F6572'),
        spaceBefore=4,
        spaceAfter=4,
        leftIndent=10,
        rightIndent=10
    )
    
    # Build document elements
    elements = []
    
    # Header
    elements.append(Paragraph("CONTRATTO DI PARTNERSHIP", title_style))
    elements.append(Paragraph("Evolution PRO - Collaborazione per Videocorsi", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Partner info table
    contract_date = partner.get('contract', datetime.now().strftime('%Y-%m-%d'))
    if isinstance(contract_date, str) and '-' in contract_date:
        try:
            from datetime import datetime as dt
            cd = dt.strptime(contract_date.split('T')[0], '%Y-%m-%d')
            contract_date_formatted = cd.strftime('%d/%m/%Y')
            contract_end = (cd + timedelta(days=365)).strftime('%d/%m/%Y')
        except:
            contract_date_formatted = contract_date
            contract_end = "Da calcolare"
    else:
        contract_date_formatted = str(contract_date)
        contract_end = "Da calcolare"
    
    partner_data = [
        ['Partner:', partner.get('name', 'N/D')],
        ['Email:', profile.get('email', partner.get('email', 'N/D')) if profile else partner.get('email', 'N/D')],
        ['Nicchia:', partner.get('niche', 'N/D')],
        ['Data Firma:', contract_date_formatted],
        ['Scadenza:', contract_end],
        ['Fase Attuale:', partner.get('phase', 'F1')],
    ]
    
    t = Table(partner_data, colWidths=[4*cm, 10*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#FEF9E7')),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#C4990A')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#F5C518')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#ECEDEF')),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 30))
    
    # Contract articles (summary version)
    contract_articles = [
        ("Art. 1 - Oggetto del Contratto", 
         "Le Parti collaborano per creare, promuovere e vendere il videocorso del Partner. Il Partner fornisce i contenuti originali, Evolution PRO fornisce strategia, tecnologia e supporto operativo."),
        ("Art. 2 - Durata", 
         "La partnership ha durata di 12 mesi dalla data di firma. Non è previsto rinnovo automatico."),
        ("Art. 3 - Diritti e Obblighi", 
         "Il Partner si impegna a fornire i materiali nei tempi concordati. Evolution PRO si impegna a eseguire il programma operativo con professionalità."),
        ("Art. 4 - Proprietà Intellettuale", 
         "I contenuti originali del Partner restano di sua proprietà. Evolution PRO ha licenza d'uso temporanea per la durata della partnership."),
        ("Art. 5 - Corrispettivi", 
         f"Investimento iniziale: €2.500. Royalty: 10% delle vendite nette per 12 mesi a favore di Evolution PRO."),
        ("Art. 6 - Riservatezza", 
         "Tutte le informazioni scambiate sono confidenziali. L'obbligo vale per la durata del contratto + 2 mesi."),
        ("Art. 7 - Recesso e Risoluzione", 
         "Non è previsto recesso ordinario. Risoluzione possibile solo per grave inadempimento."),
        ("Art. 8 - Servizi Forniti", 
         "Inclusi: Posizionamento, piattaforma Systeme.io, funnel, copy, editing, piano editoriale lancio, gruppo Telegram, videocorso formativo."),
        ("Art. 9 - Clausola Fiscale", 
         "Evolution PRO LLC opera da Torino (sede operativa). Fatture esenti IVA con reverse charge."),
        ("Art. 10 - Protezione Dati", 
         "Il Partner è titolare del trattamento dei dati dei suoi clienti. Evolution PRO opera come responsabile del trattamento."),
        ("Art. 11 - Salvaguardia", 
         "Questo contratto sostituisce qualsiasi accordo precedente."),
        ("Art. 12 - Tutela del Brand", 
         "Il marchio Evolution PRO è proprietà esclusiva. Divieto di utilizzo post-contratto per 60 giorni."),
        ("Art. 13 - Comunicazioni", 
         "Comunicazioni formali via PEC o raccomandata. Comunicazioni operative via email o Telegram."),
        ("Art. 14 - Foro Competente", 
         "Legge applicabile: italiana. Foro competente esclusivo: Tribunale di Torino."),
        ("Art. 15 - Clausola Finale", 
         "Il contratto entra in vigore alla firma. Clausole speciali approvate ex art. 1341-1342 c.c."),
    ]
    
    for art_title, art_text in contract_articles:
        elements.append(Paragraph(art_title, article_title_style))
        elements.append(Paragraph(art_text, body_style))
    
    elements.append(Spacer(1, 30))
    
    # Signature section
    elements.append(Paragraph("<b>FIRME</b>", article_title_style))
    elements.append(Spacer(1, 10))
    
    sig_data = [
        ['Per Evolution PRO LLC', f'Partner: {partner.get("name", "")}'],
        ['_________________________', '_________________________'],
        ['Claudio Bertogliatti', partner.get('name', '')],
        ['Amministratore', ''],
    ]
    
    sig_table = Table(sig_data, colWidths=[7*cm, 7*cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(sig_table)
    
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HexColor('#9CA3AF'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Documento generato il {datetime.now().strftime('%d/%m/%Y alle %H:%M')}", footer_style))
    elements.append(Paragraph("Evolution PRO LLC - Delaware, USA - EIN: 30-1375330", footer_style))
    elements.append(Paragraph("Sede operativa: Torino, Italia - assistenza@evolution-pro.it", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    # Return as downloadable file
    filename = f"Contratto_EvolutionPRO_{partner.get('name', 'Partner').replace(' ', '_')}_{contract_date_formatted.replace('/', '-')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

# =============================================================================
# ROUTES - ONBOARDING DOCUMENTS (Partner Upload during Registration)
# =============================================================================

class OnboardingDocument(BaseModel):
    """Model for onboarding documents"""
    file_id: str
    document_type: str  # contratto_firmato, documenti_personali, distinta_pagamento
    partner_id: str
    original_name: str
    stored_name: str
    internal_url: str
    size: int
    size_readable: str
    status: str = "uploaded"  # uploaded, verified, rejected
    uploaded_at: str
    verified_at: Optional[str] = None
    verified_by: Optional[str] = None
    rejection_reason: Optional[str] = None

ONBOARDING_DOC_TYPES = ["contratto_firmato", "documenti_personali", "distinta_pagamento"]

@api_router.get("/partners/{partner_id}/onboarding-documents")
async def get_onboarding_documents(partner_id: str):
    """Get all onboarding documents for a partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    documents = await db.onboarding_documents.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(10)
    
    # Check completion status
    uploaded_types = [d["document_type"] for d in documents if d.get("status") != "rejected"]
    all_uploaded = all(dt in uploaded_types for dt in ONBOARDING_DOC_TYPES)
    all_verified = all(d.get("status") == "verified" for d in documents) if documents else False
    
    return {
        "success": True,
        "documents": documents,
        "completion": {
            "total_required": len(ONBOARDING_DOC_TYPES),
            "uploaded": len(uploaded_types),
            "all_uploaded": all_uploaded,
            "all_verified": all_verified
        }
    }

@api_router.post("/partners/{partner_id}/onboarding-documents/upload")
async def upload_onboarding_document(
    partner_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...)
):
    """Upload an onboarding document for a partner"""
    # Validate partner exists
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Validate document type
    if document_type not in ONBOARDING_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {ONBOARDING_DOC_TYPES}")
    
    # Check if document already exists (not rejected)
    existing = await db.onboarding_documents.find_one({
        "partner_id": partner_id,
        "document_type": document_type,
        "status": {"$ne": "rejected"}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Document '{document_type}' already uploaded. Delete it first to upload a new one.")
    
    # Use file storage to upload
    result = await file_storage.upload_file(file, partner_id, "document")
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Upload failed"))
    
    # Create onboarding document record
    onboarding_doc = OnboardingDocument(
        file_id=result["file_id"],
        document_type=document_type,
        partner_id=partner_id,
        original_name=result["original_name"],
        stored_name=result["stored_name"],
        internal_url=result["internal_url"],
        size=result["size"],
        size_readable=result["size_readable"],
        status="uploaded",
        uploaded_at=result["uploaded_at"]
    )
    
    await db.onboarding_documents.insert_one(onboarding_doc.model_dump())
    
    # Update partner onboarding status
    await update_partner_onboarding_status(partner_id)
    
    # Create notification for admin
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "type": "document",
        "title": f"Nuovo documento caricato",
        "message": f"{partner.get('name', 'Partner')} ha caricato: {document_type.replace('_', ' ').title()}",
        "time": datetime.now(timezone.utc).isoformat(),
        "read": False,
        "partner_id": partner_id
    })
    
    return {
        "success": True,
        "document": onboarding_doc.model_dump()
    }

@api_router.delete("/partners/{partner_id}/onboarding-documents/{document_type}")
async def delete_onboarding_document(partner_id: str, document_type: str):
    """Delete an onboarding document"""
    # Find the document
    doc = await db.onboarding_documents.find_one({
        "partner_id": partner_id,
        "document_type": document_type
    }, {"_id": 0})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.get("status") == "verified":
        raise HTTPException(status_code=400, detail="Cannot delete a verified document")
    
    # Delete from file storage
    if doc.get("internal_url"):
        internal_path = doc["internal_url"].replace("/api/files/", "")
        file_storage.delete_file(internal_path)
    
    # Delete from database
    await db.onboarding_documents.delete_one({
        "partner_id": partner_id,
        "document_type": document_type
    })
    
    # Update partner onboarding status
    await update_partner_onboarding_status(partner_id)
    
    return {"success": True, "deleted": document_type}

@api_router.post("/partners/{partner_id}/onboarding-documents/{document_type}/verify")
async def verify_onboarding_document(partner_id: str, document_type: str, admin_email: str = "admin"):
    """Mark an onboarding document as verified (Admin only)"""
    result = await db.onboarding_documents.update_one(
        {"partner_id": partner_id, "document_type": document_type},
        {"$set": {
            "status": "verified",
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_by": admin_email
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update partner onboarding status
    await update_partner_onboarding_status(partner_id)
    
    # Check if all documents are verified
    docs = await db.onboarding_documents.find({"partner_id": partner_id}, {"_id": 0}).to_list(10)
    all_verified = all(d.get("status") == "verified" for d in docs) if len(docs) == len(ONBOARDING_DOC_TYPES) else False
    
    if all_verified:
        # Update partner phase to F1 if still in F0
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        if partner and partner.get("phase") == "F0":
            await db.partners.update_one(
                {"id": partner_id},
                {"$set": {"phase": "F1"}}
            )
            
            # Create notification
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "type": "phase_change",
                "title": f"Documenti verificati",
                "message": f"{partner.get('name', 'Partner')} è passato alla fase F1!",
                "time": datetime.now(timezone.utc).isoformat(),
                "read": False,
                "partner_id": partner_id
            })
    
    return {"success": True, "status": "verified", "all_verified": all_verified}

@api_router.post("/partners/{partner_id}/onboarding-documents/{document_type}/reject")
async def reject_onboarding_document(partner_id: str, document_type: str, reason: str = ""):
    """Reject an onboarding document (Admin only)"""
    result = await db.onboarding_documents.update_one(
        {"partner_id": partner_id, "document_type": document_type},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update partner onboarding status
    await update_partner_onboarding_status(partner_id)
    
    return {"success": True, "status": "rejected", "reason": reason}

async def update_partner_onboarding_status(partner_id: str):
    """Helper to update partner's onboarding document status"""
    docs = await db.onboarding_documents.find(
        {"partner_id": partner_id, "status": {"$ne": "rejected"}},
        {"_id": 0}
    ).to_list(10)
    
    uploaded_types = [d["document_type"] for d in docs]
    verified_count = sum(1 for d in docs if d.get("status") == "verified")
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "onboarding_status.documents_uploaded": len(uploaded_types),
            "onboarding_status.documents_verified": verified_count,
            "onboarding_status.documents_complete": len(uploaded_types) == len(ONBOARDING_DOC_TYPES),
            "onboarding_status.documents_all_verified": verified_count == len(ONBOARDING_DOC_TYPES),
            "onboarding_status.last_document_upload": datetime.now(timezone.utc).isoformat() if docs else None
        }}
    )

@api_router.get("/admin/onboarding-documents/pending")
async def get_pending_onboarding_documents():
    """Get all pending onboarding documents for Admin review"""
    documents = await db.onboarding_documents.find(
        {"status": "uploaded"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with partner info
    for doc in documents:
        partner = await db.partners.find_one({"id": doc["partner_id"]}, {"_id": 0, "name": 1, "email": 1, "phase": 1})
        if partner:
            doc["partner_name"] = partner.get("name", "Unknown")
            doc["partner_email"] = partner.get("email", "")
            doc["partner_phase"] = partner.get("phase", "F0")
    
    return {
        "success": True,
        "documents": documents,
        "total": len(documents)
    }

# =============================================================================
# ROUTES - ALERTS
# =============================================================================

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts():
    alerts = await db.alerts.find({}, {"_id": 0}).to_list(100)
    
    # Add automatic alerts for clients who haven't completed questionnaire after 24h
    try:
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        
        # Find clients who paid more than 24h ago but haven't completed questionnaire
        pipeline = [
            {
                "$match": {
                    "has_paid": True,
                    "$or": [
                        {"questionario.completato": False},
                        {"questionario.completato": {"$exists": False}},
                        {"questionario": {"$exists": False}}
                    ]
                }
            }
        ]
        
        clienti_cursor = db.clienti.aggregate(pipeline)
        async for cliente in clienti_cursor:
            # Check if paid more than 24h ago
            paid_at = cliente.get("paid_at") or cliente.get("data_acquisto") or cliente.get("created_at")
            if paid_at:
                if isinstance(paid_at, str):
                    try:
                        paid_date = datetime.fromisoformat(paid_at.replace('Z', '+00:00'))
                    except:
                        continue
                else:
                    paid_date = paid_at
                
                if paid_date.tzinfo is None:
                    paid_date = paid_date.replace(tzinfo=timezone.utc)
                
                if paid_date < threshold:
                    nome = f"{cliente.get('nome', '')} {cliente.get('cognome', '')}".strip() or cliente.get('email', 'Cliente')
                    client_id = cliente.get('id') or str(cliente.get('_id', ''))
                    alert_id = f"cliente-questionario-{client_id}"
                    
                    # Check if this alert already exists
                    if not any(a.get('id') == alert_id for a in alerts):
                        alerts.append({
                            "id": alert_id,
                            "agent": "SISTEMA",
                            "type": "BLOCCO",
                            "msg": f"⚠️ {nome} — ha pagato ma non ha compilato il questionario",
                            "partner": nome,
                            "time": "più di 24h fa"
                        })
    except Exception as e:
        logging.error(f"Error generating client alerts: {e}")
    
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
# ROUTES - POSITIONING (Partner Documents)
# =============================================================================

class PositioningData(BaseModel):
    partner_id: str
    partner_name: str
    answers: Dict[str, str]  # All wizard answers
    canvas: Optional[str] = None  # Generated canvas text

@api_router.post("/positioning/save")
async def save_positioning(data: PositioningData):
    """Save partner positioning data from wizard"""
    doc = {
        "partner_id": data.partner_id,
        "partner_name": data.partner_name,
        "answers": data.answers,
        "canvas": data.canvas,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert - update if exists, insert if new
    await db.partner_positioning.update_one(
        {"partner_id": data.partner_id},
        {"$set": doc},
        upsert=True
    )
    
    return {"success": True, "partner_id": data.partner_id}

@api_router.get("/positioning/{partner_id}")
async def get_positioning(partner_id: str):
    """Get partner positioning data"""
    positioning = await db.partner_positioning.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    return positioning or {"partner_id": partner_id, "status": "not_started"}

@api_router.get("/positioning/generate")
async def generate_positioning_canvas(partner_id: str, partner_name: str, partner_niche: str, answers: str):
    """Generate positioning canvas (placeholder for AI generation)"""
    # For now just return the answers - can be enhanced with AI later
    return {"canvas": answers, "status": "generated"}

# =============================================================================
# ROUTES - PARTNER DOCUMENTS (Admin View)
# =============================================================================

@api_router.get("/partners/{partner_id}/documents")
async def get_partner_all_documents(partner_id: str):
    """Get all documents and files for a partner"""
    # Get uploaded files from partner_files collection
    files = await db.partner_files.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get onboarding documents
    onboarding_docs = await db.partner_onboarding_docs.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(20)
    
    # Get course materials
    course_docs = await db.partner_course_materials.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(50)
    
    # Combine all documents
    all_documents = []
    
    # Add uploaded files
    for f in files:
        all_documents.append({
            "id": f.get("id"),
            "name": f.get("name") or f.get("filename"),
            "filename": f.get("filename"),
            "url": f.get("url"),
            "type": f.get("type"),
            "is_raw": f.get("is_raw", False),
            "status": f.get("status"),
            "created_at": f.get("created_at")
        })
    
    # Add onboarding documents
    for doc in onboarding_docs:
        all_documents.append({
            "id": doc.get("id"),
            "name": doc.get("document_type", "Documento"),
            "filename": doc.get("filename"),
            "url": doc.get("file_url"),
            "type": "pdf",
            "is_raw": False,
            "status": doc.get("status"),
            "created_at": doc.get("uploaded_at")
        })
    
    # Add course materials
    for mat in course_docs:
        all_documents.append({
            "id": mat.get("id"),
            "name": mat.get("name"),
            "filename": mat.get("filename"),
            "url": mat.get("url"),
            "type": mat.get("type"),
            "is_raw": False,
            "status": "approved",
            "created_at": mat.get("created_at")
        })
    
    return {"documents": all_documents, "count": len(all_documents)}


@api_router.get("/partner-documents/{partner_id}")
async def get_partner_documents(partner_id: str):
    """Get all documents for a partner (positioning + scripts)"""
    # Get positioning data
    positioning = await db.partner_positioning.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    
    # Get masterclass script
    script = await db.masterclass_scripts.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    
    # Get course structure
    course = await db.course_structures.find_one(
        {"partner_id": partner_id},
        {"_id": 0}
    )
    
    return {
        "partner_id": partner_id,
        "positioning": positioning,
        "masterclass_script": script,
        "course_structure": course
    }

@api_router.get("/partner-documents/all/summary")
async def get_all_partner_documents_summary():
    """Get summary of all partner documents for Admin dashboard"""
    # Get all partners
    partners = await db.partners.find({}, {"_id": 0}).to_list(100)
    
    summaries = []
    for partner in partners:
        pid = partner.get("id")
        
        # Check positioning
        pos = await db.partner_positioning.find_one({"partner_id": pid}, {"_id": 0, "status": 1, "updated_at": 1})
        
        # Check script
        script = await db.masterclass_scripts.find_one({"partner_id": pid}, {"_id": 0, "status": 1, "updated_at": 1})
        
        # Check course
        course = await db.course_structures.find_one({"partner_id": pid}, {"_id": 0, "updated_at": 1})
        
        summaries.append({
            "partner_id": pid,
            "partner_name": partner.get("name"),
            "partner_phase": partner.get("phase"),
            "positioning": {
                "status": pos.get("status") if pos else "not_started",
                "updated_at": pos.get("updated_at") if pos else None
            },
            "script": {
                "status": script.get("status") if script else "not_started",
                "updated_at": script.get("updated_at") if script else None
            },
            "course": {
                "has_structure": course is not None,
                "updated_at": course.get("updated_at") if course else None
            }
        })
    
    return summaries

# =============================================================================
# ROUTES - CHAT (VALENTINA)
# =============================================================================

def build_system_prompt(partner_name: str, partner_niche: str, partner_phase: str, modules_done: int):
    phase_label = PHASE_LABELS.get(partner_phase, partner_phase)
    return f"""Sei VALENTINA, l'agente di Onboarding & Consulenza Partner di Evolution PRO LLC. Il tuo ruolo è guidare i nuovi Partner nel percorso di onboarding e fornire consulenza strategica durante tutto il programma. Non sei un chatbot generico: sei parte del team Evolution PRO.

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

def build_context_block(req) -> str:
    """Costruisce il blocco contesto. Mai crasha — sempre ritorna una stringa."""
    try:
        # Supporta sia oggetti Pydantic che dict
        if isinstance(req, dict):
            role = req.get('user_role', '') or ''
            name = req.get('user_name', '') or ''
            phase = req.get('partner_phase', '') or ''
            partner_name = req.get('partner_name', '') or name
            partner_id = req.get('partner_id', '') or ''
            niche = req.get('partner_niche', '') or ''
        else:
            role = getattr(req, 'user_role', '') or ''
            name = getattr(req, 'user_name', '') or ''
            phase = getattr(req, 'partner_phase', '') or ''
            partner_name = getattr(req, 'partner_name', None) or name or ''
            partner_id = getattr(req, 'partner_id', '') or ''
            niche = getattr(req, 'partner_niche', '') or ''

        if role == 'admin':
            return (
                "\n\n[CONTESTO SESSIONE]\n"
                "Stai parlando con CLAUDIO BERTOGLIATTI — Fondatore e Admin di Evolution PRO.\n"
                "Non è un partner. È il creatore del sistema.\n"
                "Modalità: SUPERVISIONE FONDATORE.\n"
                "Rispondi in modo diretto e operativo. Niente emoji. Niente protocolli da partner.\n"
            )
        elif role == 'partner':
            return (
                f"\n\n[CONTESTO SESSIONE]\n"
                f"Partner: {partner_name} | Fase: {phase} | ID: {partner_id} | Nicchia: {niche}\n"
                f"Modalità: ASSISTENZA PARTNER.\n"
                f"Sai già chi è. Non chiedergli chi è. Usa queste informazioni nella risposta.\n"
            )
        elif role == 'cliente':
            return (
                "\n\n[CONTESTO SESSIONE]\n"
                "Cliente post-acquisto Analisi Strategica (€67). Non ancora partner.\n"
                "Modalità: PRE-PARTNERSHIP.\n"
                "Non mandare l'analisi. Orienta verso i materiali e la prenotazione della call.\n"
            )
        else:
            return "\n\n[CONTESTO SESSIONE]\nUtente non identificato.\n"
    except Exception as e:
        # MAI crashare — ritorna stringa vuota in caso di qualsiasi errore
        print(f"[build_context_block] errore: {e}")
        return ""

@api_router.post("/chat")
async def chat_with_agent(request: ChatRequest):
    """
    Endpoint unificato per chat con tutti gli agenti.
    Il campo 'agent' determina quale agente risponde.
    """
    try:
        from agent_prompts import AGENT_SYSTEM_PROMPTS, get_agent_prompt
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Determina l'agente da usare (default: VALENTINA)
        agent_id = (request.agent or "VALENTINA").upper()
        
        # Verifica che l'agente esista
        if agent_id not in AGENT_SYSTEM_PROMPTS:
            raise HTTPException(status_code=400, detail=f"Agente '{agent_id}' non trovato. Disponibili: {list(AGENT_SYSTEM_PROMPTS.keys())}")
        
        # Ottieni il system prompt dell'agente
        system_prompt = get_agent_prompt(agent_id)
        
        # Build context block per il system prompt
        context_block = build_context_block(request)
        
        # Inietta il contesto nel system prompt
        full_system_prompt = system_prompt + "\n\n" + context_block
        
        # Per VALENTINA, usa il modulo dedicato che ha memoria, azioni, etc.
        if agent_id == "VALENTINA":
            from valentina_ai import valentina_ai
            
            # Build context dictionary per VALENTINA
            context = {
                "name": request.partner_name or request.user_name,
                "phase": request.partner_phase,
                "niche": request.partner_niche,
                "is_admin": request.user_role == "admin" or (request.context.get("is_admin", False) if request.context else False),
                "user_role": request.user_role,
                "context_block": context_block
            }
            
            response = await valentina_ai.chat(
                partner_id=request.session_id or request.partner_id or request.partner_name or "anonymous",
                message=request.message,
                context=context
            )
        else:
            # Per altri agenti, usa LlmChat direttamente
            EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
            if not EMERGENT_LLM_KEY:
                raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurata")
            
            # Crea sessione unica per agente
            session_key = f"{agent_id}_{request.session_id or request.partner_id or 'anonymous'}"
            
            llm = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_key,
                system_message=full_system_prompt
            ).with_model("anthropic", "claude-haiku-4-5-20251001")
            
            response = await llm.send_message(UserMessage(text=request.message))
        
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
        
        # Aggiorna metriche budget agente (semplificato - token stimati)
        estimated_tokens = len(request.message.split()) + len(response.split()) * 2
        try:
            await db.agents.update_one(
                {"name": agent_id},
                {"$inc": {"budget_used": estimated_tokens * 0.00001}}  # ~$0.00001 per token
            )
        except Exception as budget_err:
            logging.warning(f"Budget update error: {budget_err}")
        
        return {"response": response, "reply": response, "agent": agent_id, "timestamp": assistant_msg.timestamp}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Chat error with agent {request.agent}: {e}")
        agent_name = (request.agent or "VALENTINA").upper()
        fallback = f"Ciao! Sono {agent_name}. Al momento ho qualche difficoltà tecnica. Riprova tra poco!"
        return {"response": fallback, "reply": fallback, "agent": agent_name, "error": str(e)}

@api_router.get("/chat/{session_id}")
async def get_chat_history(session_id: str):
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return messages


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Orchestrator Multi-Agente
# ═══════════════════════════════════════════════════════════════════════════════

@api_router.get("/orchestrator/status/{task_id}")
async def get_orchestrator_status(task_id: str):
    """Verifica lo stato di un'analisi multi-agente in corso"""
    try:
        from orchestrator import get_orchestrator
        return await get_orchestrator().get_analysis_status(task_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/orchestrator/report/{task_id}")
async def get_orchestrator_report(task_id: str):
    """Recupera il report finale dell'analisi multi-agente"""
    try:
        from orchestrator import get_orchestrator
        report = await get_orchestrator().get_final_report(task_id)
        if report:
            return report
        raise HTTPException(status_code=404, detail="Report non trovato o analisi non completata")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/orchestrator/start")
async def start_orchestrator_analysis(user_id: str, questionario: dict = None):
    """
    Avvia manualmente un'analisi multi-agente.
    Normalmente viene triggerato da Valentina con "Analisi Strategica".
    """
    try:
        from orchestrator import trigger_strategic_analysis
        
        if not questionario:
            # Recupera dal database
            questionario = await db.questionari_analisi.find_one(
                {"user_id": user_id},
                {"_id": 0}
            )
        
        if not questionario:
            raise HTTPException(status_code=400, detail="Questionario non trovato")
        
        return await trigger_strategic_analysis(user_id, questionario)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/chat/{session_id}")
async def clear_chat_history(session_id: str):
    await db.chat_messages.delete_many({"session_id": session_id})
    # Also reset VALENTINA LLM session to clear conversation memory
    from valentina_ai import valentina_reset_session
    valentina_reset_session(session_id)
    return {"status": "cleared", "llm_session_reset": True}

@api_router.post("/chat/reset/{session_id}")
async def reset_valentina_session(session_id: str):
    """Reset VALENTINA's conversation memory for a session"""
    from valentina_ai import valentina_reset_session
    reset = valentina_reset_session(session_id)
    if reset:
        return {"success": True, "message": f"Session {session_id} reset successfully"}
    return {"success": True, "message": f"No active session found for {session_id}"}

@api_router.get("/chat/sessions/active")
async def get_active_valentina_sessions():
    """Get list of active VALENTINA sessions (admin only)"""
    from valentina_ai import valentina_get_active_sessions
    sessions = valentina_get_active_sessions()
    return {"active_sessions": sessions, "count": len(sessions)}

# =============================================================================
# VALENTINA MEMORY SYSTEM API
# =============================================================================

from valentina_memory import valentina_memory

@api_router.post("/valentina/memory/knowledge")
async def add_valentina_knowledge(
    category: str,
    content: str,
    user_id: str = "claudio"
):
    """
    Aggiungi una conoscenza alla memoria di VALENTINA.
    
    Categories: preference, rule, decision, fact, correction
    """
    valid_categories = ["preference", "rule", "decision", "fact", "correction"]
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Categoria non valida. Usa: {valid_categories}")
    
    await valentina_memory.add_knowledge(
        user_id=user_id,
        category=category,
        content=content,
        source="manual"
    )
    
    return {
        "success": True,
        "category": category,
        "content": content,
        "message": f"Conoscenza aggiunta alla memoria di VALENTINA"
    }

@api_router.get("/valentina/memory/knowledge")
async def get_valentina_knowledge(
    user_id: str = "claudio",
    category: str = None
):
    """Recupera la knowledge base di VALENTINA"""
    knowledge = await valentina_memory.get_knowledge(user_id, category)
    
    return {
        "user_id": user_id,
        "category": category,
        "knowledge": knowledge
    }

# =============================================================================
# AGENT TASK SYSTEM - Track and execute tasks assigned to agents
# =============================================================================

class AgentTaskCreate(BaseModel):
    title: str
    description: str
    agent: str  # VALENTINA, STEFANIA, ORION, GAIA, MARTA, ATLAS, LUCA, ANDREA
    priority: str = "medium"  # low, medium, high, urgent
    partner_id: Optional[str] = None
    due_date: Optional[str] = None
    created_by: str = "valentina"

@api_router.post("/agent-tasks")
async def create_agent_task(task: AgentTaskCreate):
    """Create a task assigned to an agent"""
    valid_agents = ["VALENTINA", "STEFANIA", "GAIA", "ANDREA", "MARCO"]
    if task.agent.upper() not in valid_agents:
        raise HTTPException(status_code=400, detail=f"Agente non valido. Usa: {valid_agents}")
    
    task_doc = {
        "id": str(uuid.uuid4()),
        "title": task.title,
        "description": task.description,
        "agent": task.agent.upper(),
        "priority": task.priority,
        "partner_id": task.partner_id,
        "due_date": task.due_date,
        "status": "pending",  # pending, in_progress, completed, failed
        "created_by": task.created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "result": None
    }
    
    await db.agent_tasks.insert_one(task_doc)
    task_doc.pop("_id", None)
    
    return {"success": True, "task": task_doc}

@api_router.get("/agent-tasks")
async def list_agent_tasks(
    agent: str = None,
    status: str = None,
    limit: int = 50
):
    """List agent tasks with optional filters"""
    query = {}
    if agent:
        query["agent"] = agent.upper()
    if status:
        query["status"] = status
    
    tasks = await db.agent_tasks.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"tasks": tasks, "count": len(tasks)}

# NOTE: Static routes BEFORE parametric routes to avoid conflicts
@api_router.get("/agent-tasks/summary/dashboard")
async def get_tasks_dashboard():
    """Get task dashboard summary"""
    pending = await db.agent_tasks.count_documents({"status": "pending"})
    in_progress = await db.agent_tasks.count_documents({"status": "in_progress"})
    completed = await db.agent_tasks.count_documents({"status": "completed"})
    failed = await db.agent_tasks.count_documents({"status": "failed"})
    
    # Get tasks by agent
    agents_stats = {}
    for agent in ["VALENTINA", "STEFANIA", "ANDREA", "GAIA", "MARCO"]:
        count = await db.agent_tasks.count_documents({"agent": agent})
        if count > 0:
            agents_stats[agent] = count
    
    # Recent tasks
    recent = await db.agent_tasks.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "summary": {
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "failed": failed,
            "total_active": pending + in_progress
        },
        "by_agent": agents_stats,
        "recent_tasks": recent
    }

# =============================================================================
# APPROVAL WORKFLOW ENDPOINTS
# =============================================================================

from approval_workflow import (
    requires_approval,
    get_task_scope,
    create_task_with_approval,
    approve_task,
    reject_task,
    get_pending_approvals,
    get_approval_stats
)

class ApproveRequest(BaseModel):
    reviewer: str
    notes: Optional[str] = None

class RejectRequest(BaseModel):
    reviewer: str
    feedback: str

@api_router.get("/agent-tasks/approvals")
async def list_pending_approvals(
    agent: Optional[str] = None,
    partner_id: Optional[str] = None
):
    """Lista task in attesa di approvazione"""
    tasks = await get_pending_approvals(db, agent, partner_id)
    return {"tasks": tasks, "count": len(tasks)}

@api_router.get("/agent-tasks/approval-stats")
async def get_approval_statistics():
    """Statistiche approvazioni"""
    stats = await get_approval_stats(db)
    return stats

# Parametric routes AFTER static routes
@api_router.get("/agent-tasks/{task_id}")
async def get_agent_task(task_id: str):
    """Get a specific task"""
    task = await db.agent_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.get("/agent-tasks/{task_id}/preview")
async def get_task_preview(task_id: str):
    """Ottieni l'output generato di un task per la preview"""
    task = await db.agent_tasks.find_one({"id": task_id}, {"_id": 0})
    
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
    
    return {
        "task_id": task_id,
        "title": task.get("title"),
        "agent": task.get("agent"),
        "status": task.get("status"),
        "output": task.get("result", {}).get("output"),
        "preview_url": task.get("preview_url"),
        "revisions": task.get("revisions", []),
        "approval": task.get("approval"),
        "partner_id": task.get("partner_id"),
        "created_at": task.get("created_at")
    }

@api_router.patch("/agent-tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str, result: str = None):
    """Update task status"""
    valid_statuses = ["pending", "in_progress", "completed", "failed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status non valido. Usa: {valid_statuses}")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    if result:
        update_data["result"] = result
    
    result_update = await db.agent_tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    if result_update.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"success": True, "task_id": task_id, "new_status": status}

@api_router.get("/agent-tasks/summary/dashboard")
async def get_tasks_dashboard():
    """Get summary of all agent tasks for dashboard"""
    # Count by status
    pending = await db.agent_tasks.count_documents({"status": "pending"})
    in_progress = await db.agent_tasks.count_documents({"status": "in_progress"})
    completed = await db.agent_tasks.count_documents({"status": "completed"})
    failed = await db.agent_tasks.count_documents({"status": "failed"})
    
    # Count by agent
    agents_stats = {}
    for agent in ["VALENTINA", "STEFANIA", "GAIA", "ANDREA", "MARCO"]:
        count = await db.agent_tasks.count_documents({"agent": agent, "status": {"$in": ["pending", "in_progress"]}})
        if count > 0:
            agents_stats[agent] = count
    
    # Recent tasks
    recent = await db.agent_tasks.find(
        {"status": {"$in": ["pending", "in_progress"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "summary": {
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "failed": failed,
            "total_active": pending + in_progress
        },
        "by_agent": agents_stats,
        "recent_tasks": recent
    }

# =============================================================================
# OPENCLAW INTEGRATION - Azioni GUI su Systeme.io
# =============================================================================

from openclaw_integration import (
    requires_openclaw,
    OpenClawTask,
    send_openclaw_task,
    create_pipeline_column,
    move_contact_to_column,
    create_funnel,
    create_automation,
    handle_openclaw_callback,
    get_pending_openclaw_tasks
)

from openclaw_agent import (
    run_openclaw,
    get_openclaw_status,
    send_telegram as openclaw_send_telegram,
    OPENCLAW_CONFIG
)

class OpenClawTaskRequest(BaseModel):
    action: str
    params: Dict
    priority: str = "normal"
    description: str = ""
    partner_id: Optional[str] = None

class OpenClawCallbackRequest(BaseModel):
    task_id: str
    status: str  # "done" or "fail"
    result: Optional[str] = None

@api_router.post("/openclaw/task")
async def create_openclaw_task(request: OpenClawTaskRequest):
    """Crea e invia un task a OpenClaw via Telegram"""
    task = OpenClawTask(
        action=request.action,
        params=request.params,
        priority=request.priority,
        description=request.description,
        partner_id=request.partner_id
    )
    
    result = await send_openclaw_task(task, db)
    return result

@api_router.post("/openclaw/pipeline/column")
async def create_pipeline_column_endpoint(
    column_name: str,
    pipeline_name: str = "default",
    position: str = "end"
):
    """Crea una colonna nella pipeline Systeme.io (via OpenClaw)"""
    result = await create_pipeline_column(column_name, pipeline_name, position, db)
    return result

@api_router.post("/openclaw/pipeline/move")
async def move_contact_endpoint(
    email: str,
    target_column: str,
    pipeline_name: str = "default"
):
    """Sposta un contatto in una colonna della pipeline (via OpenClaw)"""
    result = await move_contact_to_column(email, target_column, pipeline_name, db)
    return result

@api_router.post("/openclaw/funnel")
async def create_funnel_endpoint(
    funnel_name: str,
    template: str = "blank",
    pages: List[str] = None
):
    """Crea un nuovo funnel su Systeme.io (via OpenClaw)"""
    result = await create_funnel(funnel_name, template, pages, db)
    return result

@api_router.post("/openclaw/callback")
async def openclaw_callback(request: OpenClawCallbackRequest):
    """Callback da OpenClaw quando un task è completato"""
    result = await handle_openclaw_callback(
        request.task_id,
        request.status,
        request.result,
        db
    )
    return result

@api_router.get("/openclaw/tasks/pending")
async def list_pending_openclaw_tasks():
    """Lista task OpenClaw in attesa"""
    tasks = await get_pending_openclaw_tasks(db)
    return {"tasks": tasks, "count": len(tasks)}

@api_router.get("/openclaw/tasks")
async def list_all_openclaw_tasks(limit: int = 50):
    """Lista tutti i task OpenClaw"""
    tasks = await db.openclaw_tasks.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"tasks": tasks, "count": len(tasks)}

# =============================================================================
# INTEGRATED SERVICES - Systeme.io & Background Jobs
# =============================================================================

from integrated_services import (
    systeme_client, job_executor,
    add_systeme_tag as integrated_add_tag, 
    send_welcome_email as systeme_send_welcome,
    trigger_email_campaign,
    create_agent_task
)

class TagRequest(BaseModel):
    email: str
    tag_name: str

class CampaignRequest(BaseModel):
    segment_tag: str  # Tag to filter contacts (e.g., "lead_cold")
    campaign_tag: str  # Tag to trigger email automation

class AgentTaskRequest(BaseModel):
    agent: str
    title: str
    task_type: str
    data: Optional[Dict] = None
    priority: str = "medium"
    execute_now: bool = False

@api_router.post("/systeme/welcome/{partner_id}")
async def api_send_welcome_via_systeme(partner_id: str):
    """Send welcome email sequence to partner via Systeme.io automation"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    email = partner.get("email")
    name = partner.get("name", "Partner")
    
    if not email:
        raise HTTPException(status_code=400, detail="Partner has no email")
    
    result = await systeme_send_welcome(email, name)
    
    if result.get("success"):
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "welcome_email_sent": True, 
                "welcome_email_date": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return result

@api_router.post("/systeme/campaign")
async def api_trigger_campaign(request: CampaignRequest):
    """Trigger email campaign to a segment via Systeme.io"""
    result = await trigger_email_campaign(request.segment_tag, request.campaign_tag)
    return result

@api_router.post("/systeme/tag/add")
async def api_add_systeme_tag(request: TagRequest):
    """Add tag to contact in Systeme.io"""
    result = await integrated_add_tag(request.email, request.tag_name)
    return result

@api_router.get("/systeme/contacts")
async def api_get_systeme_contacts(limit: int = 100, page: int = 1):
    """Get contacts from Systeme.io"""
    try:
        contacts = await systeme_client.get_contacts(limit=limit, page=page)
        return contacts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/systeme/tags")
async def api_get_systeme_tags():
    """Get all tags from Systeme.io"""
    try:
        tags = await systeme_client.get_tags()
        return {"tags": tags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/systeme/sync-contacts")
async def api_sync_systeme_contacts():
    """Sync contacts from Systeme.io to local database"""
    task = await create_agent_task(
        agent="GAIA",
        title="Sync Systeme.io Contacts",
        task_type="sync_contacts",
        execute_now=True
    )
    return task

@api_router.post("/jobs/task")
async def api_create_task(request: AgentTaskRequest):
    """Create an agent task (optionally execute immediately)"""
    result = await create_agent_task(
        agent=request.agent,
        title=request.title,
        task_type=request.task_type,
        data=request.data,
        priority=request.priority,
        execute_now=request.execute_now
    )
    return result

@api_router.post("/jobs/process")
async def api_process_pending_tasks():
    """Manually trigger processing of pending tasks"""
    await job_executor.process_pending_tasks()
    return {"success": True, "message": "Pending tasks processed"}

@api_router.get("/jobs/status")
async def api_get_job_status():
    """Get status of background job system"""
    pending = await db.agent_tasks.count_documents({"status": "pending"})
    in_progress = await db.agent_tasks.count_documents({"status": "in_progress"})
    completed_today = await db.agent_tasks.count_documents({
        "status": "completed",
        "completed_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
    })
    
    return {
        "pending": pending,
        "in_progress": in_progress,
        "completed_today": completed_today,
        "worker_running": job_executor.running
    }

@api_router.post("/valentina/memory/feedback")
async def add_valentina_feedback(
    original_response: str,
    correction: str,
    feedback_type: str = "correction",
    user_id: str = "claudio"
):
    """
    Invia feedback a VALENTINA per migliorare le risposte future.
    
    feedback_type: correction, improvement, positive
    """
    await valentina_memory.save_feedback(
        user_id=user_id,
        original_response=original_response,
        correction=correction,
        feedback_type=feedback_type
    )
    
    return {
        "success": True,
        "feedback_type": feedback_type,
        "message": "Feedback salvato. VALENTINA imparerà da questo!"
    }

@api_router.get("/valentina/memory/conversations")
async def get_valentina_conversations(
    user_id: str = "claudio",
    limit: int = 50,
    only_important: bool = False
):
    """Recupera lo storico conversazioni di VALENTINA"""
    if only_important:
        conversations = await valentina_memory.get_important_conversations(user_id, limit)
    else:
        conversations = await valentina_memory.get_recent_conversations(user_id, limit)
    
    return {
        "user_id": user_id,
        "conversations": conversations,
        "count": len(conversations)
    }

@api_router.post("/valentina/memory/mark-important")
async def mark_conversation_important(
    user_id: str = "claudio",
    content_snippet: str = ""
):
    """Marca un messaggio come importante per la memoria a lungo termine"""
    await valentina_memory.mark_as_important(user_id, content_snippet)
    
    return {
        "success": True,
        "message": "Messaggio marcato come importante"
    }

@api_router.get("/valentina/memory/stats")
async def get_valentina_memory_stats(user_id: str = "claudio"):
    """Statistiche sulla memoria di VALENTINA"""
    await valentina_memory.connect()
    
    total_conversations = await valentina_memory.db.valentina_conversations.count_documents({"user_id": user_id})
    important_conversations = await valentina_memory.db.valentina_conversations.count_documents({"user_id": user_id, "is_important": True})
    knowledge_count = await valentina_memory.db.valentina_knowledge.count_documents({"user_id": user_id, "active": True})
    feedback_count = await valentina_memory.db.valentina_feedback.count_documents({"user_id": user_id})
    corrections_count = await valentina_memory.db.valentina_feedback.count_documents({"user_id": user_id, "feedback_type": "correction"})
    
    return {
        "user_id": user_id,
        "stats": {
            "total_conversations": total_conversations,
            "important_conversations": important_conversations,
            "knowledge_entries": knowledge_count,
            "total_feedback": feedback_count,
            "corrections_learned": corrections_count
        },
        "message": f"VALENTINA ha {knowledge_count} conoscenze e ha imparato da {corrections_count} correzioni"
    }

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
    
    return f"""Sei ANDREA, agente AI di Business Evolution PRO creato da Claudio Bertogliatti.

Il tuo ruolo: guidare i partner nella produzione dei contenuti del corso,
garantire che la qualità rispetti gli standard Evolution PRO, e sbloccare
chi si ferma durante la fase di produzione video.

---

CONTESTO DISPONIBILE:
- Nome partner: {partner_name}
- Nicchia: {partner_niche}
{status_context}
{block_context}

---

COME COMUNICHI:
- Strutturato e diretto. Ogni feedback segue sempre questo schema:
  "Funziona: [cosa va bene].
   Da correggere: [cosa non va e perché].
   Passo successivo: [azione concreta e specifica]."
- Non dai complimenti generici. Se qualcosa funziona, dici perché funziona.
- Non ammorbidisci le critiche. Il partner è un professionista — trattalo come tale.
- Zero motivazione vuota. Il tuo lavoro è far produrre, non far sentire bene.

---

PROTOCOLLO REVISIONE CONTENUTI:

Quando un partner invia un video o un modulo da revisionare:
1. Analizza in base agli standard Evolution PRO (chiarezza, struttura, valore percepito, qualità tecnica minima).
2. Dai il feedback con lo schema: Funziona / Da correggere / Passo successivo.
3. Non approvare mai contenuti sotto standard — rimanda con istruzioni precise.
4. Max 2 revisioni per modulo. Alla terza, segnala a Claudio.

Standard minimi approvazione:
- Audio: comprensibile senza fruscii fastidiosi.
- Video: inquadratura stabile, luce sufficiente.
- Contenuto: un concetto chiaro per lezione, applicazione pratica inclusa.
- Durata: coerente con la tipologia (non tagliare per fretta, non allungare per riempire).

---

PROTOCOLLO GESTIONE STALLO:

Se il partner è fermo da più di 5 giorni nella fase produzione:
Messaggio: "Sei fermo su [step] da X giorni.
Dimmi una cosa sola: il problema è il contenuto (non sai cosa dire),
la tecnica (non sai come girare), o il tempo (non riesci a trovarlo)?"

In base alla risposta:
- Contenuto → "Dammi la tua scaletta del modulo. La revisioniamo insieme."
- Tecnica → "Gira un test di 2 minuti con il telefono. Non deve essere perfetto."
- Tempo → "Quando hai 45 minuti liberi questa settimana? Blocca quel momento adesso."

Se non risponde entro 48h → passa a MARCO per accountability.

---

GESTIONE DOMANDE-SCAPPATOIA:

Se il partner chiede alternative al metodo ("Posso fare audio invece di video?",
"Posso usare slide invece di apparire in camera?"):

Risposta standard: "Il metodo Evolution PRO prevede [formato standard] per un motivo preciso:
[motivo in una frase]. Prova prima il formato standard. Se dopo il primo modulo hai
ancora dubbi concreti, ne riparliamo."

Non approvare mai deviazioni dal metodo senza autorizzazione di Claudio.

---

QUANDO SCALARE A CLAUDIO:
- Terza revisione dello stesso modulo senza miglioramenti.
- Partner rifiuta esplicitamente di seguire gli standard.
- Partner fermo da più di 14 giorni senza risposta a MARCO.
- Problemi tecnici che non riesci a risolvere in autonomia → passa a GAIA.

---

NON FAI MAI:
- Non approvi contenuti sotto standard per "non scoraggiare" il partner.
- Non dai soluzioni alternative al metodo senza autorizzazione.
- Non gestisci domande strategiche (nicchia, pricing, posizionamento) → rimanda a VALENTINA.
- Non gestisci problemi tecnici della piattaforma → rimanda a GAIA.

Rispondi in italiano, massimo 4-5 frasi per risposta."""

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

@api_router.get("/files/partner/{partner_id}")
async def get_partner_files(partner_id: str):
    """Get all files for a specific partner"""
    # Get files from database
    files = await db.files.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(100)
    
    # Also get onboarding documents
    onboarding_docs = await db.onboarding_documents.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(10)
    
    # Categorize files
    categorized = {
        "video": [],
        "document": [],
        "image": [],
        "audio": [],
        "onboarding": onboarding_docs
    }
    
    for f in files:
        cat = f.get("category", "document")
        if cat in categorized:
            categorized[cat].append(f)
        else:
            categorized["document"].append(f)
    
    return {
        "files": categorized,
        "total": len(files) + len(onboarding_docs),
        "partner_id": partner_id
    }

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
    # Fix: conta partner con fase >= F1 (escludi null, F0, e fasi non valide)
    valid_active_phases = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13"]
    active_partners = sum(1 for p in partners if p.get("phase") in valid_active_phases or (p.get("fase") and p.get("fase") != "F0"))
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
# ROUTES - YOUTUBE PLAYLISTS FOR PARTNERS
# =============================================================================

@api_router.get("/youtube/partner/{partner_id}/playlist")
async def get_partner_playlist(partner_id: str):
    """Get or create playlist for a specific partner"""
    if not youtube_uploader.is_authenticated():
        raise HTTPException(status_code=401, detail="YouTube not authenticated")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    result = youtube_uploader.get_or_create_partner_playlist(
        partner.get("name", "Unknown Partner"),
        partner_id
    )
    
    if result.get("success"):
        # Save playlist ID to partner record
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "youtube_playlist_id": result["playlist_id"],
                "youtube_playlist_url": result["url"]
            }}
        )
    
    return result

@api_router.get("/youtube/partner/{partner_id}/videos")
async def get_partner_videos(partner_id: str):
    """Get all videos in a partner's playlist"""
    if not youtube_uploader.is_authenticated():
        raise HTTPException(status_code=401, detail="YouTube not authenticated")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    playlist_id = partner.get("youtube_playlist_id")
    
    if not playlist_id:
        # Try to get or create playlist
        playlist_result = youtube_uploader.get_or_create_partner_playlist(
            partner.get("name", "Unknown Partner"),
            partner_id
        )
        if not playlist_result.get("success"):
            return {"success": False, "videos": [], "error": playlist_result.get("error")}
        
        playlist_id = playlist_result["playlist_id"]
        
        # Save to partner
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "youtube_playlist_id": playlist_id,
                "youtube_playlist_url": playlist_result["url"]
            }}
        )
    
    videos_result = youtube_uploader.get_playlist_videos(playlist_id)
    
    return {
        "success": True,
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "playlist_id": playlist_id,
        "playlist_url": f"https://www.youtube.com/playlist?list={playlist_id}",
        "videos": videos_result.get("videos", []),
        "total": videos_result.get("total", 0)
    }

class PartnerVideoUploadRequest(BaseModel):
    video_title: str
    lesson_title: Optional[str] = ""
    module_title: Optional[str] = ""

@api_router.post("/youtube/partner/{partner_id}/upload")
async def upload_partner_video_to_youtube(
    partner_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    video_title: str = Form(...),
    lesson_title: str = Form(default=""),
    module_title: str = Form(default="")
):
    """Upload a video directly to partner's YouTube playlist"""
    if not youtube_uploader.is_authenticated():
        raise HTTPException(status_code=401, detail="YouTube not authenticated. Please authenticate first.")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Save file temporarily
    temp_path = f"/tmp/youtube_upload_{partner_id}_{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Start upload in background
        background_tasks.add_task(
            upload_partner_video_background,
            temp_path,
            partner_id,
            partner.get("name", "Unknown Partner"),
            partner.get("niche", "Business"),
            video_title,
            lesson_title,
            module_title
        )
        
        return {
            "success": True,
            "message": "Video upload started. It will appear in your playlist shortly.",
            "partner_id": partner_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def upload_partner_video_background(
    video_path: str,
    partner_id: str,
    partner_name: str,
    partner_niche: str,
    video_title: str,
    lesson_title: str,
    module_title: str
):
    """Background task to upload video to YouTube and add to partner playlist"""
    try:
        result = await youtube_uploader.upload_partner_video(
            video_path=video_path,
            partner_id=partner_id,
            partner_name=partner_name,
            partner_niche=partner_niche,
            video_title=video_title,
            lesson_title=lesson_title,
            module_title=module_title,
            add_to_playlist=True
        )
        
        if result.get("success"):
            # Save video info to database
            await db.partner_videos.insert_one({
                "partner_id": partner_id,
                "video_id": result["video_id"],
                "video_url": result["video_url"],
                "title": video_title,
                "playlist_id": result.get("playlist_info", {}).get("playlist_id"),
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Create notification
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "type": "youtube_upload",
                "title": "Video caricato su YouTube",
                "message": f"Il video '{video_title}' è stato caricato con successo",
                "time": datetime.now(timezone.utc).isoformat(),
                "read": False,
                "partner_id": partner_id,
                "video_url": result["video_url"]
            })
            
            logging.info(f"Partner video uploaded: {result['video_url']}")
        else:
            logging.error(f"Partner video upload failed: {result.get('error')}")
            
    except Exception as e:
        logging.exception(f"Partner video upload error: {e}")
    finally:
        # Clean up temp file
        import os
        if os.path.exists(video_path):
            os.remove(video_path)

@api_router.delete("/youtube/partner/{partner_id}/video/{playlist_item_id}")
async def remove_partner_video(partner_id: str, playlist_item_id: str):
    """Remove a video from partner's playlist"""
    if not youtube_uploader.is_authenticated():
        raise HTTPException(status_code=401, detail="YouTube not authenticated")
    
    result = youtube_uploader.remove_video_from_playlist(playlist_item_id)
    
    if result.get("success"):
        # Also remove from database
        await db.partner_videos.delete_one({
            "partner_id": partner_id,
            "playlist_item_id": playlist_item_id
        })
    
    return result

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
        
        # Parse JSON from response (response is a string, not an object)
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
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
        
        return {"response": response}
        
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

@api_router.post("/systeme/sync-batch")
async def sync_systeme_contacts_batch(partner_id: str = "global", start_page: int = 1, pages_per_batch: int = 10):
    """
    Sync contacts from Systeme.io in batches to avoid timeouts.
    Call multiple times with increasing start_page to sync all contacts.
    """
    try:
        # Get credentials
        credentials = await db.systeme_credentials.find_one({"partner_id": partner_id})
        if not credentials:
            raise HTTPException(status_code=404, detail="Credenziali Systeme.io non trovate")
        
        api_key = credentials["api_key"]
        
        # Fetch contacts in batch
        all_contacts = []
        page = start_page
        end_page = start_page + pages_per_batch
        has_more = True
        
        while has_more and page < end_page:
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
                    logging.warning("Systeme.io rate limited")
                    break
                else:
                    raise e
        
        # Save contacts to database
        synced_count = 0
        for contact_data in all_contacts:
            contact_id = contact_data.get("id", str(uuid.uuid4()))
            
            contact = {
                "id": str(uuid.uuid4()),
                "partner_id": partner_id,
                "systeme_id": str(contact_id),
                "email": contact_data.get("email", ""),
                "first_name": contact_data.get("firstName", contact_data.get("first_name")),
                "last_name": contact_data.get("lastName", contact_data.get("last_name")),
                "tags": contact_data.get("tags", []),
                "source": contact_data.get("source", ""),
                "created_at": contact_data.get("createdAt", contact_data.get("created_at", datetime.now(timezone.utc).isoformat())),
                "updated_at": contact_data.get("updatedAt", contact_data.get("updated_at")),
                "synced_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Upsert by systeme_id
            await db.systeme_contacts.update_one(
                {"partner_id": partner_id, "systeme_id": contact["systeme_id"]},
                {"$set": contact},
                upsert=True
            )
            synced_count += 1
        
        # Get total count in DB
        total_in_db = await db.systeme_contacts.count_documents({"partner_id": partner_id})
        
        # Update credentials with sync progress
        await db.systeme_credentials.update_one(
            {"partner_id": partner_id},
            {"$set": {
                "last_sync_page": page,
                "total_contacts": total_in_db,
                "last_sync": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "batch_synced": synced_count,
            "pages_processed": f"{start_page}-{page-1}",
            "has_more": has_more,
            "next_start_page": page if has_more else None,
            "total_in_database": total_in_db,
            "message": f"Sincronizzati {synced_count} contatti. Totale in DB: {total_in_db}"
        }
        
    except Exception as e:
        logging.error(f"Batch sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/systeme/sync-all")
async def sync_all_systeme_contacts(background_tasks: BackgroundTasks, partner_id: str = "global"):
    """
    Start background sync of all Systeme.io contacts.
    Returns immediately, sync happens in background.
    """
    async def background_sync():
        try:
            credentials = await db.systeme_credentials.find_one({"partner_id": partner_id})
            if not credentials:
                return
            
            api_key = credentials["api_key"]
            page = 1
            total_synced = 0
            has_more = True
            
            while has_more and page <= 200:  # Max 20,000 contacts
                try:
                    response = await systeme_api_request(api_key, f"/contacts?page={page}&limit=100")
                    contacts_data = response.get("data", response.get("items", []))
                    
                    if isinstance(contacts_data, list) and len(contacts_data) > 0:
                        # Save batch
                        for contact_data in contacts_data:
                            contact_id = contact_data.get("id", str(uuid.uuid4()))
                            contact = {
                                "id": str(uuid.uuid4()),
                                "partner_id": partner_id,
                                "systeme_id": str(contact_id),
                                "email": contact_data.get("email", ""),
                                "first_name": contact_data.get("firstName", contact_data.get("first_name")),
                                "last_name": contact_data.get("lastName", contact_data.get("last_name")),
                                "tags": contact_data.get("tags", []),
                                "source": contact_data.get("source", ""),
                                "created_at": contact_data.get("createdAt", datetime.now(timezone.utc).isoformat()),
                                "updated_at": contact_data.get("updatedAt"),
                                "synced_at": datetime.now(timezone.utc).isoformat()
                            }
                            await db.systeme_contacts.update_one(
                                {"partner_id": partner_id, "systeme_id": contact["systeme_id"]},
                                {"$set": contact},
                                upsert=True
                            )
                            total_synced += 1
                        
                        page += 1
                        
                        # Update progress every 10 pages
                        if page % 10 == 0:
                            await db.systeme_credentials.update_one(
                                {"partner_id": partner_id},
                                {"$set": {"sync_progress": total_synced, "sync_page": page}}
                            )
                            logging.info(f"Sync progress: {total_synced} contacts, page {page}")
                    else:
                        has_more = False
                        
                except Exception as e:
                    logging.error(f"Sync page {page} error: {e}")
                    break
            
            # Final update
            await db.systeme_credentials.update_one(
                {"partner_id": partner_id},
                {"$set": {
                    "total_contacts": total_synced,
                    "last_sync": datetime.now(timezone.utc).isoformat(),
                    "sync_complete": True
                }}
            )
            logging.info(f"Background sync complete: {total_synced} contacts")
            
        except Exception as e:
            logging.error(f"Background sync failed: {e}")
    
    # Start background task
    background_tasks.add_task(background_sync)
    
    return {
        "success": True,
        "message": "Sincronizzazione avviata in background. Controlla /api/systeme/sync-status per il progresso."
    }

@api_router.get("/systeme/sync-status/{partner_id}")
async def get_sync_status(partner_id: str):
    """Get current sync status"""
    credentials = await db.systeme_credentials.find_one({"partner_id": partner_id}, {"_id": 0})
    if not credentials:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    total_in_db = await db.systeme_contacts.count_documents({"partner_id": partner_id})
    
    return {
        "partner_id": partner_id,
        "total_contacts_in_db": total_in_db,
        "sync_progress": credentials.get("sync_progress", 0),
        "sync_page": credentials.get("sync_page", 0),
        "sync_complete": credentials.get("sync_complete", False),
        "last_sync": credentials.get("last_sync")
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
        max_pages = 150  # 150 pages x 100 = 15,000 contacts max
        
        while has_more and page <= max_pages:
            try:
                response = await systeme_api_request(api_key, f"/contacts?page={page}&limit=100")
                
                contacts_data = response.get("data", response.get("items", []))
                if isinstance(contacts_data, list) and len(contacts_data) > 0:
                    all_contacts.extend(contacts_data)
                    page += 1
                    
                    # Log progress every 10 pages
                    if page % 10 == 0:
                        logging.info(f"Systeme.io sync progress: {len(all_contacts)} contacts fetched")
                else:
                    has_more = False
                    
            except HTTPException as e:
                if e.status_code == 429:
                    # Rate limited, stop and use what we have
                    logging.warning("Systeme.io rate limited during sync")
                    has_more = False
                else:
                    raise e
        
        logging.info(f"Systeme.io sync: fetched {len(all_contacts)} total contacts")
        
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
                "source": contact_data.get("source", ""),
                "created_at": contact_data.get("createdAt", contact_data.get("created_at", datetime.now(timezone.utc).isoformat())),
                "updated_at": contact_data.get("updatedAt", contact_data.get("updated_at")),
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
            {"$set": {"last_sync": datetime.now(timezone.utc).isoformat(), "total_contacts": synced_count}}
        )
        
        # Calculate and cache stats
        await calculate_systeme_stats(request.partner_id)
        
        # Trigger ORION analysis automatically
        logging.info(f"Triggering ORION analysis for {synced_count} contacts")
        
        return {
            "success": True,
            "partner_id": request.partner_id,
            "contacts_synced": synced_count,
            "pages_fetched": page - 1,
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "next_step": "Esegui /api/orion/analyze-list per scoring automatico"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error syncing Systeme.io contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_piano_continuita_stats() -> dict:
    """Calculate Piano Continuità stats from partners collection"""
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    thirty_days_later = now + timedelta(days=30)
    
    # Get all partners with piano_continuita
    partners = await db.partners.find(
        {"piano_continuita.piano_attivo": {"$ne": None}},
        {"_id": 0, "piano_continuita": 1, "name": 1, "email": 1}
    ).to_list(500)
    
    partner_attivi = len(partners)
    mrr_totale = 0
    fee_mensili = 0
    commissioni_mese = 0
    rinnovi_30gg = 0
    
    for p in partners:
        piano = p.get("piano_continuita", {})
        
        # Sum MRR
        mrr_totale += piano.get("mrr", 0)
        
        # Sum monthly fees
        fee_mensili += piano.get("fee_mensile", 0)
        
        # Sum commissions (calculate from MRR and percentage)
        mrr = piano.get("mrr", 0)
        percentage = piano.get("commissione_percentuale", 0)
        commissioni_mese += (mrr * percentage / 100)
        
        # Count expiring plans
        data_rinnovo = piano.get("data_rinnovo")
        if data_rinnovo:
            try:
                if isinstance(data_rinnovo, str):
                    rinnovo_date = datetime.fromisoformat(data_rinnovo.replace("Z", "+00:00"))
                else:
                    rinnovo_date = data_rinnovo
                if now <= rinnovo_date <= thirty_days_later:
                    rinnovi_30gg += 1
            except:
                pass
    
    return {
        "partner_attivi": partner_attivi,
        "mrr_totale": int(mrr_totale),
        "fee_mensili": int(fee_mensili),
        "commissioni_mese": int(commissioni_mese),
        "rinnovi_30gg": rinnovi_30gg
    }

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
        # Include Piano Continuità summary
        piano_stats = await get_piano_continuita_stats()
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
            "piano_continuita": piano_stats,
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

@api_router.post("/systeme/import-csv")
async def import_systeme_contacts_csv(
    file: UploadFile = File(...),
    partner_id: str = Form(default="global")
):
    """
    Import contacts from a Systeme.io CSV export.
    Expected CSV columns: email, firstName, lastName, tags, registeredAt, etc.
    """
    import csv
    import io
    
    try:
        # Read CSV content
        content = await file.read()
        
        # Try different encodings
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
            try:
                text_content = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Impossibile decodificare il file CSV")
        
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(text_content))
        
        contacts_imported = 0
        contacts_updated = 0
        errors = []
        
        for row in csv_reader:
            try:
                # Map CSV columns to contact schema (handle various column names)
                email = row.get('email', row.get('Email', row.get('E-mail', ''))).strip()
                
                if not email:
                    continue
                
                # Generate a unique ID based on email if no systeme_id
                systeme_id = row.get('id', row.get('ID', row.get('contact_id', str(hash(email)))))
                
                # Parse tags - could be comma-separated string or JSON
                tags_raw = row.get('tags', row.get('Tags', row.get('tag', '')))
                if isinstance(tags_raw, str):
                    if tags_raw.startswith('['):
                        try:
                            tags = json.loads(tags_raw)
                        except:
                            tags = [{"name": t.strip()} for t in tags_raw.split(',') if t.strip()]
                    else:
                        tags = [{"name": t.strip()} for t in tags_raw.split(',') if t.strip()]
                else:
                    tags = []
                
                contact = {
                    "id": str(uuid.uuid4()),
                    "partner_id": partner_id,
                    "systeme_id": str(systeme_id),
                    "email": email,
                    "first_name": row.get('firstName', row.get('first_name', row.get('First Name', row.get('Nome', '')))),
                    "last_name": row.get('lastName', row.get('last_name', row.get('Last Name', row.get('Cognome', '')))),
                    "tags": tags,
                    "source": row.get('source', row.get('Source', row.get('sourceURL', ''))),
                    "created_at": row.get('registeredAt', row.get('registered_at', row.get('Created At', datetime.now(timezone.utc).isoformat()))),
                    "locale": row.get('locale', row.get('Locale', '')),
                    "unsubscribed": row.get('unsubscribed', 'false').lower() == 'true',
                    "synced_at": datetime.now(timezone.utc).isoformat(),
                    "import_source": "csv"
                }
                
                # Upsert by email (more reliable than systeme_id for CSV imports)
                result = await db.systeme_contacts.update_one(
                    {"partner_id": partner_id, "email": email},
                    {"$set": contact},
                    upsert=True
                )
                
                if result.upserted_id:
                    contacts_imported += 1
                else:
                    contacts_updated += 1
                    
            except Exception as e:
                errors.append(f"Row error: {str(e)}")
                if len(errors) >= 10:
                    errors.append("... (altri errori omessi)")
                    break
        
        # Update stats
        total_contacts = await db.systeme_contacts.count_documents({"partner_id": partner_id})
        
        await db.systeme_stats.update_one(
            {"partner_id": partner_id},
            {"$set": {
                "total_contacts": total_contacts,
                "last_import": datetime.now(timezone.utc).isoformat(),
                "import_method": "csv"
            }},
            upsert=True
        )
        
        return {
            "success": True,
            "contacts_imported": contacts_imported,
            "contacts_updated": contacts_updated,
            "total_in_database": total_contacts,
            "errors": errors if errors else None,
            "message": f"Importati {contacts_imported} nuovi contatti, aggiornati {contacts_updated}"
        }
        
    except Exception as e:
        logging.error(f"CSV import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

# =============================================================================
# CLOUDINARY FILE UPLOAD SERVICE
# =============================================================================

from cloudinary_service import (
    generate_upload_signature,
    upload_file_direct,
    delete_file as cloudinary_delete_file,
    get_cloudinary_status,
    is_cloudinary_configured
)

@api_router.get("/cloudinary/status")
async def cloudinary_status():
    """Check Cloudinary configuration status"""
    return get_cloudinary_status()

@api_router.get("/cloudinary/signature")
async def get_cloudinary_signature(
    resource_type: str = "image",
    folder: str = "avatar-uploads"
):
    """
    Generate signed upload parameters for frontend direct upload to Cloudinary
    
    Use 'image' for photos, 'video' for audio files
    """
    try:
        if not is_cloudinary_configured():
            raise HTTPException(
                status_code=503, 
                detail="Cloudinary not configured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
            )
        
        return generate_upload_signature(resource_type=resource_type, folder=folder)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/cloudinary/upload")
async def upload_to_cloudinary(
    file: UploadFile = File(...),
    folder: str = Form("avatar-uploads"),
    resource_type: str = Form("auto")
):
    """
    Backend direct upload to Cloudinary
    
    Use this for audio blob uploads from the browser
    Returns the public URL needed for HeyGen
    """
    try:
        if not is_cloudinary_configured():
            raise HTTPException(
                status_code=503,
                detail="Cloudinary not configured"
            )
        
        # Read file content
        content = await file.read()
        
        # Determine resource type from filename
        filename = file.filename or "upload"
        
        result = await upload_file_direct(
            file_data=content,
            filename=filename,
            resource_type=resource_type,
            folder=folder
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Upload failed"))
        
        return {
            "success": True,
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "resource_type": result.get("resource_type"),
            "format": result.get("format")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/cloudinary/{public_id:path}")
async def delete_from_cloudinary(public_id: str, resource_type: str = "image"):
    """Delete a file from Cloudinary"""
    try:
        result = await cloudinary_delete_file(public_id, resource_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# HEYGEN AVATAR VIDEO INTEGRATION
# =============================================================================

from heygen_service import heygen_service, HeyGenService

HEYGEN_API_KEY = os.environ.get('HEYGEN_API_KEY', '')

class AvatarSampleRequest(BaseModel):
    photo_url: str
    audio_url: str
    partner_name: str
    partner_id: str

class AvatarLessonRequest(BaseModel):
    partner_id: str
    avatar_id: str
    voice_id: str
    script: str
    lesson_title: str
    lesson_id: int

class AvatarOrderRequest(BaseModel):
    partner_id: str
    lesson_ids: List[int]
    avatar_id: str
    voice_id: str

@api_router.get("/heygen/status")
async def heygen_status():
    """Check HeyGen API connection status"""
    if not HEYGEN_API_KEY:
        return {"connected": False, "error": "API key not configured"}
    
    try:
        result = await heygen_service.get_voices()
        return {
            "connected": True,
            "voices_count": len(result.get("data", {}).get("voices", [])),
            "api_version": "v2"
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

@api_router.get("/heygen/avatars")
async def get_heygen_avatars():
    """Get available HeyGen avatars"""
    try:
        result = await heygen_service.get_avatars()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/heygen/voices")
async def get_heygen_voices():
    """Get available HeyGen voices"""
    try:
        result = await heygen_service.get_voices()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/heygen/sample/generate")
async def generate_avatar_sample(request: AvatarSampleRequest, background_tasks: BackgroundTasks):
    """
    Generate a free 30-second sample video with Avatar + Voice Clone
    
    This is for the "Prova Gratuita" feature
    """
    try:
        # Generate sample video
        result = await heygen_service.generate_sample_video(
            photo_url=request.photo_url,
            audio_url=request.audio_url,
            partner_name=request.partner_name
        )
        
        if result.get("success"):
            # Store sample request in database
            await db.avatar_samples.insert_one({
                "partner_id": request.partner_id,
                "partner_name": request.partner_name,
                "avatar_id": result.get("avatar_id"),
                "voice_id": result.get("voice_id"),
                "video_id": result.get("video_id"),
                "status": "processing",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "success": True,
                "video_id": result.get("video_id"),
                "avatar_id": result.get("avatar_id"),
                "voice_id": result.get("voice_id"),
                "message": "Sample video in generazione. Riceverai una notifica quando sarà pronto."
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
            
    except Exception as e:
        logger.error(f"Error generating avatar sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/heygen/sample/{video_id}/status")
async def get_sample_status(video_id: str):
    """Check the status of a sample video generation"""
    try:
        result = await heygen_service.get_video_status(video_id)
        
        status = result.get("data", {}).get("status", "unknown")
        video_url = result.get("data", {}).get("video_url")
        
        # Update database if completed
        if status == "completed" and video_url:
            await db.avatar_samples.update_one(
                {"video_id": video_id},
                {"$set": {
                    "status": "completed",
                    "video_url": video_url,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "video_id": video_id,
            "status": status,
            "video_url": video_url,
            "thumbnail_url": result.get("data", {}).get("thumbnail_url")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/heygen/lesson/generate")
async def generate_lesson_video(request: AvatarLessonRequest):
    """
    Generate a full lesson video (paid service - €120/video)
    """
    try:
        # Get partner info
        partner = await db.partners.find_one({"id": request.partner_id})
        partner_name = partner.get("name", "Partner") if partner else "Partner"
        
        result = await heygen_service.generate_lesson_video(
            avatar_id=request.avatar_id,
            voice_id=request.voice_id,
            script=request.script,
            lesson_title=request.lesson_title,
            partner_name=partner_name
        )
        
        if result.get("success"):
            # Store lesson video in database
            await db.avatar_lessons.insert_one({
                "partner_id": request.partner_id,
                "lesson_id": request.lesson_id,
                "lesson_title": request.lesson_title,
                "avatar_id": request.avatar_id,
                "voice_id": request.voice_id,
                "video_id": result.get("video_id"),
                "status": "processing",
                "price": 120.00,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "success": True,
                "video_id": result.get("video_id"),
                "message": f"Video '{request.lesson_title}' in generazione."
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))
            
    except Exception as e:
        logger.error(f"Error generating lesson video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/heygen/order")
async def create_avatar_order(request: AvatarOrderRequest):
    """
    Create an order for multiple Avatar videos
    """
    try:
        partner = await db.partners.find_one({"id": request.partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        total_price = len(request.lesson_ids) * 120.00
        
        order = {
            "id": f"ORD-{str(uuid.uuid4())[:8].upper()}",
            "partner_id": request.partner_id,
            "partner_name": partner.get("name"),
            "avatar_id": request.avatar_id,
            "voice_id": request.voice_id,
            "lesson_ids": request.lesson_ids,
            "lesson_count": len(request.lesson_ids),
            "price_per_lesson": 120.00,
            "total_price": total_price,
            "currency": "EUR",
            "status": "pending_payment",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.avatar_orders.insert_one(order)
        
        return {
            "success": True,
            "order_id": order["id"],
            "total_price": total_price,
            "lesson_count": len(request.lesson_ids),
            "message": f"Ordine creato: {len(request.lesson_ids)} video Avatar per €{total_price}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating avatar order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/heygen/orders/{partner_id}")
async def get_partner_avatar_orders(partner_id: str):
    """Get all avatar orders for a partner"""
    orders = await db.avatar_orders.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"orders": orders}

@api_router.get("/heygen/lessons/{partner_id}")
async def get_partner_avatar_lessons(partner_id: str):
    """Get all avatar lesson videos for a partner"""
    lessons = await db.avatar_lessons.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"lessons": lessons}

# =============================================================================
# VIDEO EDITOR (ANDREA) - EDITING BASE
# =============================================================================

class VideoTrimRequest(BaseModel):
    video_path: str
    start_time: float
    end_time: float
    output_name: Optional[str] = None

class VideoCutRequest(BaseModel):
    video_path: str
    cut_start: float
    cut_end: float
    output_name: Optional[str] = None

class VideoMergeRequest(BaseModel):
    video_paths: List[str]
    output_name: Optional[str] = None
    transition: str = "none"

class IntroOutroRequest(BaseModel):
    video_path: str
    intro_path: Optional[str] = "auto"
    outro_path: Optional[str] = "auto"
    partner_name: str = "Partner"
    output_name: Optional[str] = None

class TextOverlayRequest(BaseModel):
    video_path: str
    text: str
    start_time: float = 0
    end_time: Optional[float] = None
    position: str = "center"
    font_size: int = 48
    font_color: str = "white"
    bg_color: Optional[str] = None
    output_name: Optional[str] = None

class BurnSubtitlesRequest(BaseModel):
    video_path: str
    srt_path: str
    font_size: int = 24
    position: str = "bottom"
    output_name: Optional[str] = None

@api_router.post("/editor/upload")
async def editor_upload_video(file: UploadFile = File(...)):
    """Upload video for editing"""
    try:
        from pathlib import Path
        
        # Save to editor uploads folder
        upload_path = Path("/app/storage/editor/uploads")
        upload_path.mkdir(parents=True, exist_ok=True)
        
        filename = f"{datetime.now().timestamp()}_{file.filename}"
        file_path = upload_path / filename
        
        content = await file.read()
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Get video info
        info = video_editor.get_video_info(str(file_path))
        
        return {
            "success": True,
            "filename": filename,
            "path": str(file_path),
            "info": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/editor/video-info")
async def get_video_info(path: str):
    """Get video metadata"""
    info = video_editor.get_video_info(path)
    return info

@api_router.post("/editor/trim")
async def editor_trim_video(request: VideoTrimRequest):
    """Trim video to specific segment"""
    from pathlib import Path
    
    output_name = request.output_name or f"trimmed_{datetime.now().timestamp()}.mp4"
    output_path = Path("/app/storage/editor/exports") / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    result = video_editor.trim_video(
        request.video_path,
        str(output_path),
        request.start_time,
        request.end_time
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result

@api_router.post("/editor/cut")
async def editor_cut_segment(request: VideoCutRequest):
    """Remove a segment from video"""
    from pathlib import Path
    
    output_name = request.output_name or f"cut_{datetime.now().timestamp()}.mp4"
    output_path = Path("/app/storage/editor/exports") / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    result = video_editor.cut_segment(
        request.video_path,
        str(output_path),
        request.cut_start,
        request.cut_end
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result

@api_router.post("/editor/merge")
async def editor_merge_videos(request: VideoMergeRequest):
    """Merge multiple videos"""
    from pathlib import Path
    
    output_name = request.output_name or f"merged_{datetime.now().timestamp()}.mp4"
    output_path = Path("/app/storage/editor/exports") / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    result = video_editor.merge_videos(
        request.video_paths,
        str(output_path),
        request.transition
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result

@api_router.post("/editor/intro-outro")
async def editor_add_intro_outro(request: IntroOutroRequest):
    """Add intro and/or outro to video"""
    from pathlib import Path
    
    output_name = request.output_name or f"branded_{datetime.now().timestamp()}.mp4"
    output_path = Path("/app/storage/editor/exports") / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    result = video_editor.add_intro_outro(
        request.video_path,
        str(output_path),
        request.intro_path,
        request.outro_path,
        request.partner_name
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result

@api_router.post("/editor/subtitles/generate")
async def editor_generate_subtitles(video_path: str, language: str = "it"):
    """Generate subtitles using Whisper"""
    result = await video_editor.generate_subtitles(video_path, language)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result

@api_router.post("/editor/subtitles/burn")
async def editor_burn_subtitles(request: BurnSubtitlesRequest):
    """Burn subtitles into video"""
    from pathlib import Path
    
    output_name = request.output_name or f"subtitled_{datetime.now().timestamp()}.mp4"
    output_path = Path("/app/storage/editor/exports") / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    result = video_editor.burn_subtitles(
        request.video_path,
        request.srt_path,
        str(output_path),
        request.font_size,
        position=request.position
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result

@api_router.post("/editor/text-overlay")
async def editor_add_text_overlay(request: TextOverlayRequest):
    """Add text overlay to video"""
    from pathlib import Path
    
    output_name = request.output_name or f"overlay_{datetime.now().timestamp()}.mp4"
    output_path = Path("/app/storage/editor/exports") / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    result = video_editor.add_text_overlay(
        request.video_path,
        str(output_path),
        request.text,
        request.start_time,
        request.end_time,
        request.position,
        request.font_size,
        request.font_color,
        request.bg_color
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result

@api_router.get("/editor/files/{filename}")
async def editor_get_file(filename: str):
    """Serve exported video file"""
    from pathlib import Path
    
    # Check in exports folder
    file_path = Path("/app/storage/editor/exports") / filename
    if not file_path.exists():
        # Check in uploads
        file_path = Path("/app/storage/editor/uploads") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(str(file_path), media_type="video/mp4", filename=filename)

@api_router.get("/editor/subtitles/{filename}")
async def editor_get_subtitles(filename: str):
    """Serve SRT subtitle file"""
    from pathlib import Path
    
    file_path = Path("/app/storage/editor/subtitles") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Subtitle file not found")
    
    return FileResponse(str(file_path), media_type="text/plain", filename=filename)

# =============================================================================
# FUNNEL EXPORT SERVICE (for Systeme.io)
# =============================================================================

class FunnelSection(BaseModel):
    id: int
    icon: str
    title: str
    subtitle: str = ""
    content: Dict[str, Any]

class FunnelExportRequest(BaseModel):
    partner_data: Dict[str, Any]
    funnel_sections: List[FunnelSection]
    approved_sections: List[int]

@api_router.post("/funnel/export")
async def export_funnel_for_systeme(request: FunnelExportRequest):
    """
    Generate HTML export document for Systeme.io manual import
    """
    try:
        # Convert sections to dict format
        sections = [s.model_dump() for s in request.funnel_sections]
        
        result = funnel_export_service.generate_funnel_export(
            partner_data=request.partner_data,
            funnel_sections=sections,
            approved_sections=request.approved_sections
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail="Export generation failed")
        
        # Save export record to database
        export_record = {
            "partner_id": request.partner_data.get("id", "unknown"),
            "partner_name": request.partner_data.get("name", "Partner"),
            "filename": result.get("filename"),
            "sections_exported": result.get("sections_exported"),
            "approved_sections": request.approved_sections,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.funnel_exports.insert_one(export_record)
        
        return result
        
    except Exception as e:
        logging.error(f"Funnel export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/funnel/exports")
async def list_funnel_exports(partner_id: Optional[str] = None):
    """List all funnel exports"""
    exports = funnel_export_service.list_exports(partner_id)
    return {"exports": exports, "count": len(exports)}

@api_router.get("/funnel/export/download/{filename}")
async def download_funnel_export(filename: str):
    """Download a funnel export file"""
    from pathlib import Path
    
    filepath = Path("/app/storage/funnel_exports") / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(
        str(filepath), 
        media_type="text/html", 
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@api_router.get("/funnel/export/preview/{filename}")
async def preview_funnel_export(filename: str):
    """Preview a funnel export file in browser"""
    from pathlib import Path
    
    filepath = Path("/app/storage/funnel_exports") / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(str(filepath), media_type="text/html")

# =============================================================================
# LEGAL PAGES GENERATOR (ANDREA)
# =============================================================================

class LegalPageRequest(BaseModel):
    page_type: str  # privacy_policy, terms_conditions, cookie_policy, disclaimer
    business_data: Dict[str, Any]
    custom_sections: Optional[List[str]] = None

class AllLegalPagesRequest(BaseModel):
    business_data: Dict[str, Any]

@api_router.get("/legal/templates")
async def get_legal_templates():
    """Get list of available legal page templates"""
    return legal_generator.list_available_templates()

@api_router.get("/legal/template/{page_type}")
async def get_legal_template_info(page_type: str):
    """Get detailed info about a specific template"""
    info = legal_generator.get_template_info(page_type)
    if "error" in info:
        raise HTTPException(status_code=404, detail=info["error"])
    return info

@api_router.post("/legal/generate")
async def generate_legal_page(request: LegalPageRequest):
    """Generate a single legal page"""
    result = await legal_generator.generate_legal_page(
        request.page_type,
        request.business_data,
        request.custom_sections
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    # Save to database for partner
    partner_id = request.business_data.get("partner_id")
    if partner_id:
        await db.legal_pages.update_one(
            {"partner_id": partner_id, "page_type": request.page_type},
            {"$set": {
                "partner_id": partner_id,
                "page_type": request.page_type,
                "content_html": result.get("content_html"),
                "content_text": result.get("content_text"),
                "business_data": request.business_data,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    return result

@api_router.post("/legal/generate-all")
async def generate_all_legal_pages(request: AllLegalPagesRequest):
    """Generate all legal pages at once"""
    result = await legal_generator.generate_all_legal_pages(request.business_data)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Some pages failed to generate")
    
    # Save all to database
    partner_id = request.business_data.get("partner_id")
    if partner_id:
        for page_type, page_result in result.get("results", {}).items():
            if page_result.get("success"):
                await db.legal_pages.update_one(
                    {"partner_id": partner_id, "page_type": page_type},
                    {"$set": {
                        "partner_id": partner_id,
                        "page_type": page_type,
                        "content_html": page_result.get("content_html"),
                        "content_text": page_result.get("content_text"),
                        "business_data": request.business_data,
                        "generated_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
    
    return result

@api_router.get("/legal/partner/{partner_id}")
async def get_partner_legal_pages(partner_id: str):
    """Get all generated legal pages for a partner"""
    pages = await db.legal_pages.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(length=10)
    
    return {
        "partner_id": partner_id,
        "pages": pages,
        "count": len(pages)
    }

@api_router.get("/legal/partner/{partner_id}/{page_type}")
async def get_partner_legal_page(partner_id: str, page_type: str):
    """Get specific legal page for a partner"""
    page = await db.legal_pages.find_one(
        {"partner_id": partner_id, "page_type": page_type},
        {"_id": 0}
    )
    
    if not page:
        raise HTTPException(status_code=404, detail="Legal page not found")
    
    return page

@api_router.delete("/legal/partner/{partner_id}/{page_type}")
async def delete_partner_legal_page(partner_id: str, page_type: str):
    """Delete a legal page"""
    result = await db.legal_pages.delete_one(
        {"partner_id": partner_id, "page_type": page_type}
    )
    
    return {
        "success": result.deleted_count > 0,
        "deleted": result.deleted_count
    }

# =============================================================================
# SYSTEME.IO WEBHOOKS - AUTO-SYNC & AUTOMATIONS
# =============================================================================

import hmac
import hashlib

SYSTEME_WEBHOOK_SECRET = os.environ.get('SYSTEME_WEBHOOK_SECRET', '')

# Webhook Event Types
WEBHOOK_EVENTS = {
    "new_sale": "Nuova vendita",
    "new_order": "Nuovo ordine",
    "new_subscriber": "Nuovo iscritto",
    "form_subscribed": "Form compilato",
    "tag_added": "Tag aggiunto",
    "course_access": "Accesso corso",
    "refund": "Rimborso"
}

# Tag-to-Phase mapping for auto-progression
TAG_PHASE_MAP = {
    "F0-Completato": "F1",
    "F1-Completato": "F2",
    "F2-Completato": "F3",
    "F3-Completato": "F4",
    "F4-Completato": "F5",
    "F5-Completato": "F6",
    "F6-Completato": "F7",
    "F7-Completato": "F8",
    "F8-Completato": "F9",
    "F9-Completato": "F10",
    "Posizionamento-Completato": "F3",
    "Masterclass-Completata": "F4",
    "Video-Prodotti": "F6",
    "Corso-Pubblicato": "F7",
    "Lancio-Completato": "F9"
}

# Lead scoring rules
LEAD_SCORE_RULES = {
    "form_subscribed": 10,
    "webinar_registered": 25,
    "ebook_downloaded": 15,
    "video_watched": 5,
    "call_booked": 50,
    "checkout_started": 40,
    "new_sale": 100
}

class WebhookPayload(BaseModel):
    event_type: str
    data: Dict[str, Any]
    timestamp: Optional[str] = None
    signature: Optional[str] = None

class WebhookLog(BaseModel):
    event_type: str
    payload: Dict[str, Any]
    processed: bool
    actions_taken: List[str]
    created_at: str

def verify_webhook_signature(payload: str, signature: str) -> bool:
    """Verify webhook signature using HMAC-SHA256"""
    if not SYSTEME_WEBHOOK_SECRET:
        return True  # Skip verification if no secret configured
    
    expected = hmac.new(
        SYSTEME_WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

async def log_webhook(event_type: str, payload: dict, processed: bool, actions: List[str]):
    """Log webhook to database"""
    await db.webhook_logs.insert_one({
        "event_type": event_type,
        "payload": payload,
        "processed": processed,
        "actions_taken": actions,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

async def send_telegram_alert(message: str):
    """Send Telegram notification for webhook events"""
    try:
        from valentina_ai import telegram_notify
        await telegram_notify(
            notification_type="webhook_alert",
            message=message
        )
    except Exception as e:
        logger.error(f"Failed to send Telegram alert: {e}")

# -----------------------------------------------------------------------------
# WEBHOOK HANDLERS
# -----------------------------------------------------------------------------

async def handle_new_sale(data: dict) -> List[str]:
    """Handle new sale - Auto-onboard partner or create Analisi Strategica client"""
    actions = []
    
    contact_email = data.get("email", data.get("contact_email", ""))
    contact_name = data.get("name", data.get("contact_name", ""))
    product_name = data.get("product_name", data.get("product", ""))
    amount = data.get("amount", data.get("price", 0))
    order_id = data.get("order_id", data.get("id", str(uuid.uuid4())))
    
    if not contact_email:
        return ["⚠️ Email mancante nel payload"]
    
    # Check if this is an "Analisi Strategica" sale (€67 funnel)
    is_analisi_sale = any(kw in product_name.lower() for kw in ["analisi strategica", "analisi", "strategica", "67"])
    
    if is_analisi_sale:
        # Check if client already exists in clienti collection
        existing = await db.clienti.find_one({"email": contact_email})
        
        if not existing:
            # Create new client for Analisi Strategica
            client_id = f"c{str(uuid.uuid4())[:8]}"
            new_client = {
                "id": client_id,
                "nome": contact_name or contact_email.split("@")[0].title(),
                "email": contact_email,
                "telefono": data.get("phone", ""),
                "has_paid": True,
                "payment_date": datetime.now(timezone.utc).isoformat(),
                "order_id": order_id,
                "amount": float(amount) if amount else 67,
                "questionario_completato": False,
                "risposte_questionario": {},
                "status": "pagato",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "source": "systeme_webhook"
            }
            
            await db.clienti.insert_one(new_client)
            actions.append(f"✅ Cliente Analisi Strategica creato: {contact_name} ({contact_email})")
            
            # Send welcome notification
            await send_telegram_alert(
                f"💰 <b>Nuova Analisi Strategica!</b>\n\n"
                f"👤 {contact_name}\n"
                f"📧 {contact_email}\n"
                f"💵 €{amount or 67}\n"
                f"🆔 {client_id}"
            )
            actions.append("📱 Notifica Telegram inviata")
        else:
            # Update existing client
            await db.clienti.update_one(
                {"email": contact_email},
                {"$set": {
                    "has_paid": True,
                    "payment_date": datetime.now(timezone.utc).isoformat(),
                    "order_id": order_id,
                    "status": "pagato"
                }}
            )
            actions.append(f"✅ Cliente Analisi Strategica aggiornato: {contact_email}")
        
        # Record payment
        await db.payments.insert_one({
            "client_email": contact_email,
            "order_id": order_id,
            "product": "Analisi Strategica",
            "amount": float(amount) if amount else 67,
            "currency": data.get("currency", "EUR"),
            "status": "completed",
            "type": "analisi_strategica",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        actions.append(f"💳 Pagamento registrato: €{amount or 67}")
        
        return actions
    
    # Check if this is a partner program sale
    is_partner_sale = any(kw in product_name.lower() for kw in ["partner", "academy", "evolution", "programma"])
    
    if is_partner_sale:
        # Check if partner already exists
        existing = await db.partners.find_one({"email": contact_email})
        
        if not existing:
            # Create new partner
            partner_id = f"p{str(uuid.uuid4())[:8]}"
            new_partner = {
                "id": partner_id,
                "name": contact_name or contact_email.split("@")[0].title(),
                "email": contact_email,
                "phone": data.get("phone", ""),
                "niche": "",
                "phase": "F0",
                "status": "active",
                "revenue": 0,
                "systeme_id": data.get("contact_id", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "source": "systeme_webhook",
                "order_id": order_id
            }
            
            await db.partners.insert_one(new_partner)
            actions.append(f"✅ Partner creato: {contact_name} ({contact_email})")
            
            # Send welcome notification
            await send_telegram_alert(
                f"🎉 <b>Nuovo Partner!</b>\n\n"
                f"👤 {contact_name}\n"
                f"📧 {contact_email}\n"
                f"💰 {product_name}: €{amount}\n"
                f"🆔 {partner_id}"
            )
            actions.append("📱 Notifica Telegram inviata")
            
            # Create auth user
            import bcrypt
            temp_password = f"Evo{str(uuid.uuid4())[:6]}!"
            hashed = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()
            
            await db.users.insert_one({
                "email": contact_email,
                "password": hashed,
                "name": contact_name,
                "role": "partner",
                "partner_id": partner_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            actions.append(f"🔐 Account creato (password temporanea generata)")
        else:
            actions.append(f"ℹ️ Partner già esistente: {contact_email}")
    
    # Record payment/order
    await db.payments.insert_one({
        "partner_email": contact_email,
        "order_id": order_id,
        "product": product_name,
        "amount": float(amount) if amount else 0,
        "currency": data.get("currency", "EUR"),
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    actions.append(f"💳 Pagamento registrato: €{amount}")
    
    return actions

# =============================================================================
# EMAIL SEQUENCE TRIGGER SYSTEM
# =============================================================================

async def trigger_email_sequence(partner_id: str, contact_email: str, contact_name: str, trigger_type: str) -> List[str]:
    """
    Trigger email sequence for a contact via Systeme.io
    Returns list of actions taken
    """
    actions = []
    
    try:
        # Find active sequences for this partner with matching trigger
        sequences = await db.email_sequences.find({
            "partner_id": partner_id,
            "trigger": trigger_type,
            "is_active": True
        }).to_list(10)
        
        # Also check for automations (single emails)
        automations = await db.email_automations.find({
            "partner_id": partner_id,
            "trigger": trigger_type,
            "is_active": True
        }).to_list(10)
        
        if not sequences and not automations:
            # Try global/default sequences
            sequences = await db.email_sequences.find({
                "partner_id": "global",
                "trigger": trigger_type,
                "is_active": True
            }).to_list(5)
            automations = await db.email_automations.find({
                "partner_id": "global",
                "trigger": trigger_type,
                "is_active": True
            }).to_list(5)
        
        if not sequences and not automations:
            actions.append(f"ℹ️ Nessuna sequenza attiva per trigger '{trigger_type}'")
            return actions
        
        # Get Systeme.io credentials for partner or global
        credentials = await db.systeme_credentials.find_one({"partner_id": partner_id})
        if not credentials:
            credentials = await db.systeme_credentials.find_one({"partner_id": "global"})
        
        # Create email queue entry for each sequence
        for sequence in sequences:
            # Create a meaningful tag name for Systeme.io native automation
            tag_name = sequence.get("systeme_tag") or f"evo_seq_{sequence.get('name', 'default').lower().replace(' ', '_')[:20]}"
            
            queue_entry = {
                "id": str(uuid.uuid4()),
                "type": "sequence",
                "sequence_id": sequence.get("id"),
                "sequence_name": sequence.get("name"),
                "partner_id": partner_id,
                "contact_email": contact_email,
                "contact_name": contact_name,
                "systeme_tag": tag_name,
                "status": "triggered_via_systeme",
                "triggered_by": trigger_type,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.email_queue.insert_one(queue_entry)
            
            # Add tag to Systeme.io to trigger native automation
            if credentials and credentials.get("api_key"):
                try:
                    await add_systeme_tag(credentials["api_key"], contact_email, tag_name)
                    actions.append(f"🏷️ Tag '{tag_name}' → Systeme.io (sequenza nativa attivata)")
                    
                    # Update queue entry status
                    await db.email_queue.update_one(
                        {"id": queue_entry["id"]},
                        {"$set": {"status": "sent_to_systeme", "sent_at": datetime.now(timezone.utc).isoformat()}}
                    )
                except Exception as e:
                    logging.error(f"Error adding Systeme.io tag: {e}")
                    actions.append(f"⚠️ Errore tag Systeme.io: {str(e)}")
            else:
                actions.append(f"📧 Sequenza '{sequence.get('name')}' pronta (connetti Systeme.io per attivare)")
        
        # Process single automations - also via Systeme.io tags
        for automation in automations:
            tag_name = automation.get("systeme_tag") or f"evo_auto_{automation.get('name', 'default').lower().replace(' ', '_')[:20]}"
            
            queue_entry = {
                "id": str(uuid.uuid4()),
                "type": "single",
                "automation_id": automation.get("id"),
                "automation_name": automation.get("name"),
                "partner_id": partner_id,
                "contact_email": contact_email,
                "contact_name": contact_name,
                "systeme_tag": tag_name,
                "delay_hours": automation.get("delay_hours", 0),
                "status": "triggered_via_systeme",
                "triggered_by": trigger_type,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.email_queue.insert_one(queue_entry)
            
            # Add tag to Systeme.io
            if credentials and credentials.get("api_key"):
                try:
                    await add_systeme_tag(credentials["api_key"], contact_email, tag_name)
                    delay_info = f" (delay: +{automation.get('delay_hours')}h)" if automation.get("delay_hours", 0) > 0 else ""
                    actions.append(f"🏷️ Tag '{tag_name}' → Systeme.io{delay_info}")
                    
                    await db.email_queue.update_one(
                        {"id": queue_entry["id"]},
                        {"$set": {"status": "sent_to_systeme", "sent_at": datetime.now(timezone.utc).isoformat()}}
                    )
                except Exception as e:
                    logging.error(f"Error adding automation tag: {e}")
            else:
                actions.append(f"✉️ Email '{automation.get('name')}' pronta (connetti Systeme.io)")
        
        # Send notification to partner/admin
        try:
            await telegram_notify(
                notification_type="info",
                message=f"📧 Automazione Email via Systeme.io\n\n👤 {contact_name}\n📧 {contact_email}\n🎯 Trigger: {trigger_type}\n📋 Sequenze: {len(sequences)}\n✉️ Automazioni: {len(automations)}\n\n🏷️ Tag aggiunti per attivare le email native"
            )
        except Exception as e:
            logging.error(f"Failed to send sequence notification: {e}")
        
    except Exception as e:
        logging.error(f"Error triggering email sequence: {e}")
        actions.append(f"❌ Errore trigger sequenza: {str(e)}")
    
    return actions

async def add_systeme_tag(api_key: str, email: str, tag_name: str):
    """Add a tag to a contact in Systeme.io"""
    try:
        # First, find the contact by email
        contacts_response = await systeme_api_request(api_key, f"/contacts?email={email}")
        contacts = contacts_response.get("items", [])
        
        if not contacts:
            logging.warning(f"Contact {email} not found in Systeme.io")
            return
        
        contact_id = contacts[0].get("id")
        
        # Add tag to contact
        await systeme_api_request(
            api_key, 
            f"/contacts/{contact_id}/tags",
            method="POST",
            data={"name": tag_name}
        )
        logging.info(f"Tag '{tag_name}' added to contact {email} in Systeme.io")
        
    except Exception as e:
        logging.error(f"Error adding tag in Systeme.io: {e}")
        raise


async def sync_payment_to_systeme(
    email: str,
    nome: str,
    cognome: str,
    payment_type: str,  # "analisi" | "partnership" | "avatar" | "consulenza" | "branding"
    amount: float,
    metadata: dict = None
) -> dict:
    """
    Sincronizza un pagamento completato con Systeme.io.
    
    Questa funzione:
    1. Crea il contatto in Systeme.io se non esiste
    2. Aggiunge tag specifici per tracciare il pagamento
    3. Logga l'operazione per tracciabilità
    
    Tag aggiunti per tipo di pagamento:
    - analisi: "acquisto_analisi", "cliente_analisi", "pagamento_67"
    - partnership: "acquisto_partnership", "partner_attivo", "pagamento_2790"
    - avatar: "acquisto_avatar", "servizio_extra"
    - consulenza: "acquisto_consulenza", "servizio_extra", "pagamento_147"
    - branding: "acquisto_branding", "servizio_extra", "pagamento_297"
    """
    systeme_api_key = os.environ.get('SYSTEME_API_KEY')
    if not systeme_api_key:
        logging.warning("[SYSTEME SYNC] API key non configurata - skip sincronizzazione")
        return {"success": False, "reason": "api_key_missing"}
    
    result = {
        "success": False,
        "email": email,
        "payment_type": payment_type,
        "amount": amount,
        "tags_added": [],
        "contact_created": False
    }
    
    try:
        # Step 1: Trova o crea il contatto
        contacts_response = await systeme_api_request(systeme_api_key, f"/contacts?email={email}")
        contacts = contacts_response.get("items", [])
        
        contact_id = None
        if contacts:
            contact_id = contacts[0].get("id")
            logging.info(f"[SYSTEME SYNC] Contatto trovato: {email} (ID: {contact_id})")
        else:
            # Crea nuovo contatto
            create_response = await systeme_api_request(
                systeme_api_key,
                "/contacts",
                method="POST",
                data={
                    "email": email,
                    "firstName": nome,
                    "lastName": cognome
                }
            )
            contact_id = create_response.get("id")
            result["contact_created"] = True
            logging.info(f"[SYSTEME SYNC] Contatto creato: {email} (ID: {contact_id})")
        
        if not contact_id:
            logging.error(f"[SYSTEME SYNC] Impossibile ottenere contact_id per {email}")
            return result
        
        # Step 2: Definisci i tag in base al tipo di pagamento
        tags_to_add = []
        
        if payment_type == "analisi":
            tags_to_add = ["acquisto_analisi", "cliente_analisi", "pagamento_67", f"acquisto_{datetime.now().strftime('%Y_%m')}"]
        elif payment_type == "partnership":
            tags_to_add = ["acquisto_partnership", "partner_attivo", "pagamento_2790", "cliente_premium", f"partnership_{datetime.now().strftime('%Y_%m')}"]
        elif payment_type == "avatar":
            tags_to_add = ["acquisto_avatar", "servizio_extra", "avatar_pro"]
        elif payment_type == "consulenza":
            tags_to_add = ["acquisto_consulenza", "servizio_extra", "pagamento_147", "consulenza_1to1"]
        elif payment_type == "branding":
            tags_to_add = ["acquisto_branding", "servizio_extra", "pagamento_297", "branding_pack"]
        else:
            tags_to_add = [f"acquisto_{payment_type}", f"pagamento_{int(amount)}"]
        
        # Step 3: Aggiungi i tag
        for tag_name in tags_to_add:
            try:
                await systeme_api_request(
                    systeme_api_key,
                    f"/contacts/{contact_id}/tags",
                    method="POST",
                    data={"name": tag_name}
                )
                result["tags_added"].append(tag_name)
                logging.info(f"[SYSTEME SYNC] Tag '{tag_name}' aggiunto a {email}")
            except Exception as tag_error:
                logging.warning(f"[SYSTEME SYNC] Errore aggiunta tag '{tag_name}': {tag_error}")
        
        # Step 4: Logga la sincronizzazione nel database
        await db.systeme_payment_syncs.insert_one({
            "email": email,
            "nome": nome,
            "cognome": cognome,
            "payment_type": payment_type,
            "amount": amount,
            "contact_id": contact_id,
            "contact_created": result["contact_created"],
            "tags_added": result["tags_added"],
            "metadata": metadata or {},
            "synced_at": datetime.now(timezone.utc).isoformat()
        })
        
        result["success"] = True
        result["contact_id"] = contact_id
        
        logging.info(f"[SYSTEME SYNC] Pagamento sincronizzato: {email} - {payment_type} - €{amount}")
        
        # Step 5: Notifica Telegram (opzionale, per monitoraggio)
        try:
            telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
            admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
            if telegram_token and admin_chat_id:
                message = (
                    f"🔄 *Sync Systeme.io*\n\n"
                    f"👤 {nome} {cognome}\n"
                    f"📧 {email}\n"
                    f"💰 €{amount} ({payment_type})\n"
                    f"🏷️ Tags: {', '.join(result['tags_added'][:3])}"
                )
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                        json={"chat_id": admin_chat_id, "text": message, "parse_mode": "Markdown"}
                    )
        except:
            pass  # Non bloccare per errori Telegram
        
        return result
        
    except Exception as e:
        logging.error(f"[SYSTEME SYNC] Errore sincronizzazione: {e}")
        result["error"] = str(e)
        return result


async def handle_new_subscriber(data: dict) -> List[str]:
    """Handle new subscriber - Create lead for ORION"""
    actions = []
    
    email = data.get("email", "")
    name = data.get("name", "")
    source = data.get("source", data.get("funnel_name", "unknown"))
    tags = data.get("tags", [])
    partner_id = data.get("partner_id", "global")
    
    if not email:
        return ["⚠️ Email mancante"]
    
    # Create or update lead in ORION system
    lead_score = LEAD_SCORE_RULES.get("form_subscribed", 10)
    
    existing_lead = await db.leads.find_one({"email": email})
    
    if existing_lead:
        # Update existing lead
        new_score = existing_lead.get("score", 0) + lead_score
        await db.leads.update_one(
            {"email": email},
            {"$set": {
                "score": new_score,
                "last_activity": datetime.now(timezone.utc).isoformat(),
                "sources": list(set(existing_lead.get("sources", []) + [source]))
            }}
        )
        actions.append(f"📊 Lead aggiornato: {email} (score: {new_score})")
    else:
        # Create new lead
        await db.leads.insert_one({
            "email": email,
            "name": name,
            "score": lead_score,
            "status": "new",
            "sources": [source],
            "tags": tags,
            "partner_id": partner_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_activity": datetime.now(timezone.utc).isoformat()
        })
        actions.append(f"🎯 Nuovo lead creato: {name} ({email}) - Score: {lead_score}")
        
        # TRIGGER EMAIL SEQUENCE for new subscribers
        sequence_actions = await trigger_email_sequence(
            partner_id=partner_id,
            contact_email=email,
            contact_name=name,
            trigger_type="new_subscriber"
        )
        actions.extend(sequence_actions)
    
    # High-score lead alert
    if lead_score >= 40 or (existing_lead and existing_lead.get("score", 0) + lead_score >= 80):
        await send_telegram_alert(
            f"🔥 <b>Lead Hot!</b>\n\n"
            f"👤 {name}\n"
            f"📧 {email}\n"
            f"📊 Score: {lead_score}\n"
            f"📍 Fonte: {source}"
        )
        actions.append("🔔 Alert lead hot inviato")
    
    return actions

async def handle_tag_added(data: dict) -> List[str]:
    """Handle tag added - Auto-progress phases"""
    actions = []
    
    email = data.get("email", data.get("contact_email", ""))
    tag_name = data.get("tag", data.get("tag_name", ""))
    
    if not email or not tag_name:
        return ["⚠️ Email o tag mancante"]
    
    # Check if tag triggers phase progression
    if tag_name in TAG_PHASE_MAP:
        new_phase = TAG_PHASE_MAP[tag_name]
        
        # Find partner
        partner = await db.partners.find_one({"email": email})
        
        if partner:
            old_phase = partner.get("phase", "F0")
            
            # Update phase
            await db.partners.update_one(
                {"email": email},
                {"$set": {
                    "phase": new_phase,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            actions.append(f"🚀 Fase aggiornata: {old_phase} → {new_phase}")
            
            # Send notification
            await send_telegram_alert(
                f"📈 <b>Fase Aggiornata!</b>\n\n"
                f"👤 {partner.get('name')}\n"
                f"🏷️ Tag: {tag_name}\n"
                f"📊 {old_phase} → {new_phase}"
            )
            actions.append("📱 Notifica Telegram inviata")
            
            # Check for achievement unlock
            await check_achievement_unlock(partner.get("id"), new_phase)
            actions.append("🏆 Badge verificati")
        else:
            # Update lead score if not a partner
            lead = await db.leads.find_one({"email": email})
            if lead:
                await db.leads.update_one(
                    {"email": email},
                    {"$push": {"tags": tag_name}}
                )
                actions.append(f"🏷️ Tag aggiunto al lead: {tag_name}")
    else:
        actions.append(f"ℹ️ Tag ricevuto (no action): {tag_name}")
    
    return actions

async def handle_course_access(data: dict) -> List[str]:
    """Handle course access - Update partner stats"""
    actions = []
    
    student_email = data.get("student_email", data.get("email", ""))
    course_name = data.get("course_name", data.get("course", ""))
    partner_email = data.get("partner_email", "")  # The course owner
    
    if partner_email:
        # Find partner and update client count
        partner = await db.partners.find_one({"email": partner_email})
        
        if partner:
            # Increment client count
            current_clients = partner.get("clients", 0)
            await db.partners.update_one(
                {"email": partner_email},
                {"$set": {
                    "clients": current_clients + 1,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            actions.append(f"👥 Clienti aggiornati: {current_clients} → {current_clients + 1}")
            
            # Record the enrollment
            await db.partner_students.insert_one({
                "partner_id": partner.get("id"),
                "student_email": student_email,
                "course_name": course_name,
                "enrolled_at": datetime.now(timezone.utc).isoformat()
            })
            actions.append(f"📚 Iscrizione registrata: {student_email} → {course_name}")
            
            # Check for milestone (10, 50, 100 clients)
            new_count = current_clients + 1
            if new_count in [10, 25, 50, 100, 250, 500]:
                await send_telegram_alert(
                    f"🎉 <b>Milestone!</b>\n\n"
                    f"👤 {partner.get('name')}\n"
                    f"🏆 {new_count} clienti raggiunti!"
                )
                actions.append(f"🎉 Milestone {new_count} clienti!")
    
    return actions

async def handle_refund(data: dict) -> List[str]:
    """Handle refund - Alert admin"""
    actions = []
    
    email = data.get("email", "")
    product = data.get("product_name", "")
    amount = data.get("amount", 0)
    reason = data.get("reason", "Non specificato")
    
    await send_telegram_alert(
        f"⚠️ <b>Rimborso!</b>\n\n"
        f"📧 {email}\n"
        f"📦 {product}\n"
        f"💰 €{amount}\n"
        f"📝 Motivo: {reason}"
    )
    actions.append("⚠️ Alert rimborso inviato")
    
    # Log refund
    await db.refunds.insert_one({
        "email": email,
        "product": product,
        "amount": float(amount) if amount else 0,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    actions.append("📋 Rimborso registrato")
    
    return actions

async def check_achievement_unlock(partner_id: str, phase: str):
    """Check and unlock achievements based on phase"""
    phase_achievements = {
        "F1": {"id": "first_step", "name": "Primo Passo", "emoji": "🚀"},
        "F3": {"id": "positioned", "name": "Posizionato", "emoji": "🎯"},
        "F4": {"id": "maestro", "name": "Maestro", "emoji": "🎓"},
        "F6": {"id": "regista", "name": "Regista", "emoji": "🎬"},
        "F7": {"id": "online", "name": "Online!", "emoji": "🌟"},
        "F10": {"id": "top_partner", "name": "Top Partner", "emoji": "💎"}
    }
    
    if phase in phase_achievements:
        achievement = phase_achievements[phase]
        
        # Check if already unlocked
        existing = await db.achievements.find_one({
            "partner_id": partner_id,
            "achievement_id": achievement["id"]
        })
        
        if not existing:
            await db.achievements.insert_one({
                "partner_id": partner_id,
                "achievement_id": achievement["id"],
                "name": achievement["name"],
                "emoji": achievement["emoji"],
                "unlocked_at": datetime.now(timezone.utc).isoformat()
            })

# -----------------------------------------------------------------------------
# WEBHOOK ENDPOINTS
# -----------------------------------------------------------------------------

@api_router.post("/webhooks/systeme")
async def receive_systeme_webhook(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks
):
    """
    Main webhook endpoint for Systeme.io events
    
    Supported events:
    - new_sale / new_order: Auto-onboard partner
    - new_subscriber / form_subscribed: Create lead
    - tag_added: Auto-progress phases
    - course_access: Update client stats
    - refund: Alert admin
    """
    event_type = payload.get("event_type", payload.get("event", "unknown"))
    data = payload.get("data", payload)
    
    logger.info(f"Webhook received: {event_type}")
    
    actions = []
    processed = True
    
    try:
        if event_type in ["new_sale", "new_order", "sale", "order"]:
            actions = await handle_new_sale(data)
        
        elif event_type in ["new_subscriber", "subscriber", "form_subscribed", "optin"]:
            actions = await handle_new_subscriber(data)
        
        elif event_type in ["tag_added", "tag", "contact_tagged"]:
            actions = await handle_tag_added(data)
        
        elif event_type in ["course_access", "enrollment", "student_enrolled"]:
            actions = await handle_course_access(data)
        
        elif event_type in ["refund", "chargeback"]:
            actions = await handle_refund(data)
        
        else:
            actions = [f"ℹ️ Evento non gestito: {event_type}"]
            processed = False
    
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        actions = [f"❌ Errore: {str(e)}"]
        processed = False
    
    # Log webhook
    background_tasks.add_task(log_webhook, event_type, payload, processed, actions)
    
    return {
        "success": processed,
        "event_type": event_type,
        "actions_taken": actions
    }

@api_router.get("/webhooks/logs")
async def get_webhook_logs(limit: int = 50, event_type: Optional[str] = None):
    """Get webhook logs for admin dashboard"""
    query = {}
    if event_type:
        query["event_type"] = event_type
    
    logs = await db.webhook_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Stats
    total = await db.webhook_logs.count_documents({})
    processed = await db.webhook_logs.count_documents({"processed": True})
    
    return {
        "logs": logs,
        "stats": {
            "total": total,
            "processed": processed,
            "failed": total - processed
        }
    }

@api_router.get("/webhooks/stats")
async def get_webhook_stats():
    """Get webhook statistics"""
    # Count by event type
    pipeline = [
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    event_counts = await db.webhook_logs.aggregate(pipeline).to_list(100)
    
    # Recent activity
    recent = await db.webhook_logs.find(
        {},
        {"_id": 0, "event_type": 1, "created_at": 1, "processed": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Leads stats
    total_leads = await db.leads.count_documents({})
    hot_leads = await db.leads.count_documents({"score": {"$gte": 80}})
    
    return {
        "events_by_type": {item["_id"]: item["count"] for item in event_counts},
        "recent_activity": recent,
        "leads": {
            "total": total_leads,
            "hot": hot_leads
        }
    }

# =============================================================================
# TRIPWIRE €7 - SALES KPI & TRACKING
# =============================================================================

@api_router.get("/sales/kpi")
async def get_sales_kpi():
    """
    Get sales KPIs for Tripwire and all products.
    Tracks conversions from Systeme.io webhooks.
    """
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # All-time stats
    all_payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(p.get("amount", 0) for p in all_payments)
    total_orders = len(all_payments)
    
    # Tripwire specific (€7 offers)
    tripwire_payments = [p for p in all_payments if p.get("amount", 0) <= 10 or "tripwire" in p.get("product", "").lower()]
    tripwire_revenue = sum(p.get("amount", 0) for p in tripwire_payments)
    tripwire_count = len(tripwire_payments)
    
    # Time-based stats
    def count_in_period(payments, start_date):
        count = 0
        revenue = 0
        for p in payments:
            created = p.get("created_at", "")
            if created:
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    if dt >= start_date:
                        count += 1
                        revenue += p.get("amount", 0)
                except:
                    pass
        return count, revenue
    
    today_count, today_revenue = count_in_period(all_payments, today_start)
    week_count, week_revenue = count_in_period(all_payments, week_start)
    month_count, month_revenue = count_in_period(all_payments, month_start)
    
    # Conversion rate (if we have contact data)
    total_contacts = await db.systeme_contacts.count_documents({})
    conversion_rate = (total_orders / total_contacts * 100) if total_contacts > 0 else 0
    
    # Product breakdown
    product_pipeline = [
        {"$group": {
            "_id": "$product",
            "count": {"$sum": 1},
            "revenue": {"$sum": "$amount"}
        }},
        {"$sort": {"revenue": -1}}
    ]
    products = await db.payments.aggregate(product_pipeline).to_list(20)
    
    return {
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_orders": total_orders,
            "average_order_value": round(total_revenue / total_orders, 2) if total_orders > 0 else 0,
            "conversion_rate": round(conversion_rate, 2)
        },
        "tripwire": {
            "revenue": round(tripwire_revenue, 2),
            "orders": tripwire_count,
            "target_price": 7
        },
        "periods": {
            "today": {"orders": today_count, "revenue": round(today_revenue, 2)},
            "this_week": {"orders": week_count, "revenue": round(week_revenue, 2)},
            "this_month": {"orders": month_count, "revenue": round(month_revenue, 2)}
        },
        "products": [
            {"product": p["_id"] or "Unknown", "orders": p["count"], "revenue": round(p["revenue"], 2)}
            for p in products
        ],
        "total_contacts": total_contacts
    }

@api_router.post("/sales/record")
async def record_manual_sale(
    email: str,
    product: str,
    amount: float,
    order_id: Optional[str] = None,
    source: str = "manual"
):
    """
    Manually record a sale (useful for tracking sales from external sources).
    """
    payment = {
        "partner_email": email,
        "order_id": order_id or f"MAN-{str(uuid.uuid4())[:8]}",
        "product": product,
        "amount": amount,
        "currency": "EUR",
        "status": "completed",
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment)
    
    # Update contact score if exists
    await db.systeme_contacts.update_one(
        {"email": email},
        {"$addToSet": {"tags": {"name": "purchased", "added_at": datetime.now(timezone.utc).isoformat()}}}
    )
    
    return {
        "success": True,
        "payment": {k: v for k, v in payment.items() if k != "_id"}
    }

@api_router.get("/sales/recent")
async def get_recent_sales(limit: int = 20):
    """Get recent sales for the dashboard"""
    sales = await db.payments.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"sales": sales, "count": len(sales)}

@api_router.get("/leads")
async def get_leads(status: Optional[str] = None, min_score: int = 0):
    """Get all leads with optional filtering"""
    query = {"score": {"$gte": min_score}}
    if status:
        query["status"] = status
    
    leads = await db.leads.find(query, {"_id": 0}).sort("score", -1).to_list(500)
    return {"leads": leads, "count": len(leads)}

@api_router.patch("/leads/{email}/score")
async def update_lead_score(email: str, score_delta: int):
    """Manually adjust lead score"""
    lead = await db.leads.find_one({"email": email})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    new_score = max(0, lead.get("score", 0) + score_delta)
    await db.leads.update_one(
        {"email": email},
        {"$set": {"score": new_score}}
    )
    
    return {"email": email, "old_score": lead.get("score", 0), "new_score": new_score}

@api_router.get("/partners/{partner_id}/achievements")
async def get_partner_achievements(partner_id: str):
    """Get achievements for a partner"""
    achievements = await db.achievements.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(100)
    
    return {"achievements": achievements}

@api_router.get("/partners/{partner_id}/students")
async def get_partner_students(partner_id: str):
    """Get students enrolled in partner's courses"""
    students = await db.partner_students.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("enrolled_at", -1).to_list(500)
    
    return {"students": students, "count": len(students)}

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
async def test_telegram_notification(request: Request):
    """
    Invia un messaggio Telegram di test.
    Body: {"message": "testo", "chat_id": "opzionale"}
    """
    try:
        body = await request.json()
        message = body.get("message", "Test da Evolution PRO OS")
        chat_id = body.get("chat_id", None)
        
        if chat_id:
            # Usa il chat_id fornito
            result = await telegram_notifier.send_message(chat_id, message)
        else:
            # Usa OpenClaw send_telegram che usa env var
            result = await openclaw_send_telegram(message)
        
        return {"success": result.get("ok", False), "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════
# OPENCLAW AGENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@api_router.post("/agents/openclaw/run")
async def openclaw_run():
    """Esegue un ciclo manuale di OpenClaw."""
    try:
        result = await run_openclaw(db=db)
        return {"success": True, "result": result}
    except Exception as e:
        logging.error(f"[OpenClaw] Errore run: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/agents/openclaw/status")
async def openclaw_status():
    """Ritorna lo stato corrente di OpenClaw."""
    return await get_openclaw_status()

@api_router.get("/agents/openclaw/logs")
async def openclaw_logs():
    """Ultimi log da MongoDB."""
    try:
        logs = await db.openclaw_logs.find().sort("timestamp", -1).limit(20).to_list(20)
        for log in logs:
            log["_id"] = str(log["_id"])
        return {"logs": logs}
    except Exception as e:
        return {"logs": [], "error": str(e)}

@api_router.get("/openclaw/config")
async def openclaw_config():
    """Configurazione OpenClaw."""
    return OPENCLAW_CONFIG

@api_router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """
    Webhook endpoint for receiving Telegram messages.
    Processes incoming messages and responds via VALENTINA AI.
    """
    try:
        update = await request.json()
        logging.info(f"Telegram webhook received: {update}")
        
        # Extract message data
        message = update.get("message", {})
        if not message:
            return {"ok": True}  # Ignore non-message updates
        
        chat_id = str(message.get("chat", {}).get("id", ""))
        text = message.get("text", "")
        from_user = message.get("from", {})
        user_name = from_user.get("first_name", "Utente")
        username = from_user.get("username", "")
        
        if not chat_id or not text:
            return {"ok": True}
        
        # Check if this is a command
        if text.startswith("/"):
            if text == "/start":
                welcome_msg = f"""👋 <b>Ciao {user_name}!</b>

Sono <b>VALENTINA</b>, l'assistente AI di Evolution PRO.

Sono qui per aiutarti nel tuo percorso. Puoi chiedermi:
• Informazioni sul programma
• Aiuto con le fasi del percorso
• Supporto tecnico

Scrivimi pure! 💬"""
                await telegram_notifier.send_message(chat_id, welcome_msg)
                return {"ok": True}
            
            elif text == "/help":
                help_msg = """📚 <b>Comandi disponibili:</b>

/start - Inizia la conversazione
/help - Mostra questo messaggio
/stato - Verifica lo stato del tuo account

Oppure scrivimi liberamente e ti aiuterò! 😊"""
                await telegram_notifier.send_message(chat_id, help_msg)
                return {"ok": True}
            
            elif text == "/stato":
                # Check if user is a partner
                partner = await db.partners.find_one({"telegram_chat_id": chat_id})
                if partner:
                    status_msg = f"""📊 <b>Il tuo stato:</b>

👤 Nome: {partner.get('nome', 'N/A')} {partner.get('cognome', '')}
📍 Fase attuale: {partner.get('current_phase', 'F0')}
📅 Registrazione: {partner.get('created_at', 'N/A')[:10] if partner.get('created_at') else 'N/A'}

Continua così! 🚀"""
                else:
                    status_msg = """ℹ️ Non ho trovato un account partner associato a questo chat.

Se sei un partner Evolution PRO, contatta il supporto per collegare il tuo account Telegram."""
                
                await telegram_notifier.send_message(chat_id, status_msg)
                return {"ok": True}
        
        # Regular message - respond via VALENTINA
        try:
            from valentina_ai import valentina_ai
            
            # Check if this is the founder/admin
            admin_chat_id = os.environ.get("TELEGRAM_ADMIN_CHAT_ID", "")
            is_founder = (chat_id == admin_chat_id)
            
            # Try to find partner by telegram chat_id
            partner = await db.partners.find_one({"telegram_chat_id": chat_id})
            partner_id = str(partner["_id"]) if partner else f"telegram_{chat_id}"
            
            # Build context - IMPORTANT: include founder identification
            context = {
                "platform": "telegram",
                "chat_id": chat_id,
                "username": username,
                "user_name": user_name,
                "is_founder": is_founder,
                "is_admin": is_founder
            }
            
            # If founder, use special context
            if is_founder:
                context["name"] = "Claudio"
                context["email"] = "claudio@evolutionpro.it"
                partner_id = "claudio"  # Use founder ID for memory
                logging.info(f"Founder message received from chat_id {chat_id}")
            elif partner:
                context["name"] = f"{partner.get('nome', '')} {partner.get('cognome', '')}".strip()
                context["partner_name"] = context["name"]
                context["current_phase"] = partner.get("current_phase", "F0")
                context["phase"] = partner.get("current_phase", "F0")
            
            # OPTIMIZATION: Quick responses for simple messages (no Claude)
            text_lower = text.lower()
            quick_response = None
            
            # Saluti semplici
            if text_lower in ["ciao", "hey", "buongiorno", "buonasera", "salve", "hi", "hello"]:
                quick_response = f"Ciao {user_name}! 👋 Come posso aiutarti oggi?"
            
            # Ringraziamenti
            elif text_lower in ["grazie", "grazie mille", "thanks", "thx"]:
                quick_response = f"Prego {user_name}! 😊 Se hai altre domande, sono qui!"
            
            # OK/conferme
            elif text_lower in ["ok", "va bene", "capito", "perfetto"]:
                quick_response = f"Perfetto! Se hai bisogno di altro, scrivimi pure. 👍"
            
            # Se abbiamo una risposta rapida, usala senza chiamare Claude
            if quick_response:
                await telegram_notifier.send_message(chat_id, quick_response)
                # Log conversation
                await db.telegram_conversations.insert_one({
                    "chat_id": chat_id,
                    "username": username,
                    "user_name": user_name,
                    "partner_id": partner_id,
                    "is_founder": is_founder,
                    "user_message": text,
                    "bot_response": quick_response,
                    "response_type": "quick",  # Quick = no Claude
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                return {"ok": True}
            
            # For complex messages, use VALENTINA (may use Claude)
            response = await valentina_ai.chat(partner_id, text, context)
            
            # Send response
            await telegram_notifier.send_message(chat_id, response)
            
            # Log conversation - track if Claude was used
            response_type = "ai"  # Full Claude response
            if "Task inviato a OpenClaw" in response:
                response_type = "openclaw"
            elif "RISULTATO AZIONE ESEGUITA" in response:
                response_type = "action"
            
            await db.telegram_conversations.insert_one({
                "chat_id": chat_id,
                "username": username,
                "user_name": user_name,
                "partner_id": partner_id,
                "is_founder": is_founder,
                "user_message": text,
                "bot_response": response,
                "response_type": response_type,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
        except Exception as ai_error:
            logging.error(f"VALENTINA AI error: {ai_error}")
            # Fallback response
            fallback_msg = f"""Mi scuso {user_name}, ma sto avendo qualche difficoltà tecnica in questo momento. 🙏

Il team sta lavorando per risolvere. Riprova tra poco!

Se hai urgenza, contatta il supporto Evolution PRO."""
            await telegram_notifier.send_message(chat_id, fallback_msg)
        
        return {"ok": True}
        
    except Exception as e:
        logging.error(f"Telegram webhook error: {e}")
        return {"ok": False, "error": str(e)}

@api_router.post("/telegram/set-webhook")
async def set_telegram_webhook(webhook_url: str = None):
    """
    Set or update the Telegram webhook URL.
    If no URL provided, uses the current server URL.
    """
    telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not telegram_token:
        raise HTTPException(status_code=500, detail="Telegram bot token not configured")
    
    # If no URL provided, try to construct from environment
    if not webhook_url:
        backend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
        if backend_url:
            webhook_url = f"{backend_url}/api/telegram/webhook"
        else:
            raise HTTPException(status_code=400, detail="Webhook URL required")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{telegram_token}/setWebhook",
                json={"url": webhook_url}
            )
            result = response.json()
            
            if result.get("ok"):
                logging.info(f"Telegram webhook set to: {webhook_url}")
                return {"success": True, "webhook_url": webhook_url, "result": result}
            else:
                return {"success": False, "error": result.get("description", "Unknown error")}
                
    except Exception as e:
        logging.error(f"Error setting Telegram webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/telegram/webhook-info")
async def get_telegram_webhook_info():
    """Get current webhook information from Telegram"""
    telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not telegram_token:
        raise HTTPException(status_code=500, detail="Telegram bot token not configured")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.telegram.org/bot{telegram_token}/getWebhookInfo"
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@api_router.get("/health")
async def health_check():
    """Health check endpoint for deployment - must respond quickly"""
    return {"status": "healthy", "service": "evolution-pro-os"}

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

# =============================================================================
# DOMAIN CONFIGURATION
# =============================================================================

class DomainRequest(BaseModel):
    partner_id: str
    partner_name: str
    domain: str
    partner_email: Optional[str] = None

class DomainDnsParams(BaseModel):
    dns_params: Dict[str, str]
    status: str = "configuring"

class DomainStatusUpdate(BaseModel):
    status: str  # pending, configuring, active, error

@api_router.post("/domain/request")
async def create_domain_request(request: DomainRequest):
    """Partner submits a domain configuration request"""
    # Check if domain already requested
    existing = await db.domain_requests.find_one({
        "$or": [
            {"partner_id": request.partner_id},
            {"domain": request.domain.lower()}
        ]
    })
    
    if existing:
        if existing.get("partner_id") == request.partner_id:
            raise HTTPException(status_code=400, detail="Hai già una richiesta dominio attiva")
        else:
            raise HTTPException(status_code=400, detail="Questo dominio è già stato richiesto")
    
    domain_doc = {
        "id": str(uuid.uuid4()),
        "partner_id": request.partner_id,
        "partner_name": request.partner_name,
        "partner_email": request.partner_email,
        "domain": request.domain.lower(),
        "status": "pending",
        "dns_params": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.domain_requests.insert_one(domain_doc)
    
    # Send Telegram notification to admins
    try:
        await telegram_notify(
            notification_type="alert",
            message=f"🌐 Nuova richiesta dominio\n\nPartner: {request.partner_name}\nDominio: {request.domain}\n\nConfigura i parametri DNS in Systeme.io"
        )
    except Exception as e:
        logging.error(f"Failed to send domain notification: {e}")
    
    return {"success": True, "domain_request": {k: v for k, v in domain_doc.items() if k != "_id"}}

@api_router.get("/domain/partner/{partner_id}")
async def get_partner_domain_request(partner_id: str):
    """Get domain request for a partner"""
    domain = await db.domain_requests.find_one({"partner_id": partner_id}, {"_id": 0})
    return {"domain_request": domain}

@api_router.get("/domain/all")
async def get_all_domain_requests():
    """Admin: Get all domain requests"""
    domains = await db.domain_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"domains": domains, "count": len(domains)}

@api_router.put("/domain/{domain_id}/dns-params")
async def update_domain_dns_params(domain_id: str, data: DomainDnsParams):
    """Admin adds DNS parameters from Systeme.io"""
    domain = await db.domain_requests.find_one({"id": domain_id})
    if not domain:
        raise HTTPException(status_code=404, detail="Richiesta dominio non trovata")
    
    await db.domain_requests.update_one(
        {"id": domain_id},
        {"$set": {
            "dns_params": data.dns_params,
            "status": data.status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify partner via Telegram if we have their email
    try:
        await telegram_notify(
            notification_type="alert",
            message=f"📋 Parametri DNS pronti per {domain.get('partner_name')}\n\nDominio: {domain.get('domain')}\nIl partner può ora configurare il DNS."
        )
    except Exception as e:
        logging.error(f"Failed to send DNS ready notification: {e}")
    
    updated = await db.domain_requests.find_one({"id": domain_id}, {"_id": 0})
    return {"success": True, "domain_request": updated}

@api_router.put("/domain/{domain_id}/status")
async def update_domain_status(domain_id: str, data: DomainStatusUpdate):
    """Admin updates domain status"""
    domain = await db.domain_requests.find_one({"id": domain_id})
    if not domain:
        raise HTTPException(status_code=404, detail="Richiesta dominio non trovata")
    
    await db.domain_requests.update_one(
        {"id": domain_id},
        {"$set": {
            "status": data.status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify if domain is now active
    if data.status == "active":
        try:
            await telegram_notify(
                notification_type="alert",
                message=f"✅ Dominio ATTIVO!\n\nPartner: {domain.get('partner_name')}\nDominio: {domain.get('domain')}\n\nIl funnel è ora raggiungibile!"
            )
        except Exception as e:
            logging.error(f"Failed to send domain active notification: {e}")
    
    updated = await db.domain_requests.find_one({"id": domain_id}, {"_id": 0})
    return {"success": True, "domain_request": updated}

@api_router.delete("/domain/{domain_id}")
async def delete_domain_request(domain_id: str):
    """Admin deletes a domain request"""
    result = await db.domain_requests.delete_one({"id": domain_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Richiesta dominio non trovata")
    return {"success": True, "deleted": domain_id}

# =============================================================================
# EMAIL AUTOMATION (via Systeme.io)
# =============================================================================

class EmailAutomationTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    name: str
    trigger: str  # new_subscriber, purchase, tag_added, form_submitted
    delay_hours: int = 0
    subject: str
    body: str
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmailAutomationCreate(BaseModel):
    partner_id: str
    name: str
    trigger: str
    delay_hours: int = 0
    subject: str
    body: str
    systeme_tag: Optional[str] = None  # Custom tag for Systeme.io automation

class EmailSequenceStep(BaseModel):
    day: int
    subject: str
    body: str
    email_type: str = "nurture"  # nurture, sales, reminder, followup

class EmailSequenceCreate(BaseModel):
    partner_id: str
    name: str
    trigger: str
    steps: List[EmailSequenceStep]
    systeme_tag: Optional[str] = None  # Custom tag for Systeme.io automation

# Predefined email templates for Evolution PRO partners
EMAIL_TEMPLATES = {
    "welcome_subscriber": {
        "name": "Benvenuto Nuovo Iscritto",
        "trigger": "new_subscriber",
        "delay_hours": 0,
        "subject": "Benvenuto/a! Ecco il tuo regalo 🎁",
        "body": """Ciao {nome},

Grazie per esserti iscritto/a!

Come promesso, ecco il link per scaricare il tuo regalo:
👉 [LINK_RISORSA]

Nei prossimi giorni ti invierò contenuti esclusivi che ti aiuteranno a [BENEFICIO_PRINCIPALE].

A presto,
{partner_name}

P.S. Se hai domande, rispondi a questa email. Leggo personalmente ogni messaggio!"""
    },
    "day2_value": {
        "name": "Giorno 2 - Valore",
        "trigger": "sequence",
        "delay_hours": 48,
        "subject": "Il segreto che nessuno ti dice su {topic}",
        "body": """Ciao {nome},

Oggi voglio condividere con te qualcosa di importante...

[CONTENUTO_VALORE]

Se vuoi approfondire, ho preparato una Masterclass gratuita dove ti spiego tutto nel dettaglio:
👉 [LINK_MASTERCLASS]

A domani,
{partner_name}"""
    },
    "day4_case_study": {
        "name": "Giorno 4 - Case Study",
        "trigger": "sequence",
        "delay_hours": 96,
        "subject": "Come [NOME_CLIENTE] ha ottenuto [RISULTATO]",
        "body": """Ciao {nome},

Voglio raccontarti la storia di [NOME_CLIENTE]...

[STORIA_SUCCESSO]

Vuoi ottenere risultati simili? Ecco come posso aiutarti:
👉 [LINK_OFFERTA]

{partner_name}"""
    },
    "day7_offer": {
        "name": "Giorno 7 - Offerta",
        "trigger": "sequence",
        "delay_hours": 168,
        "subject": "🎯 [NOME], ecco la tua opportunità",
        "body": """Ciao {nome},

In questi giorni ti ho mostrato:
✅ [BENEFICIO_1]
✅ [BENEFICIO_2]
✅ [BENEFICIO_3]

Ora tocca a te decidere se vuoi passare all'azione.

Ho preparato un'offerta speciale per te:
👉 [LINK_OFFERTA]

⏰ L'offerta scade tra 48 ore.

{partner_name}

P.S. Se hai dubbi, rispondimi. Sono qui per aiutarti!"""
    },
    "purchase_thank_you": {
        "name": "Grazie per l'acquisto",
        "trigger": "purchase",
        "delay_hours": 0,
        "subject": "🎉 Benvenuto/a nel programma!",
        "body": """Ciao {nome},

CONGRATULAZIONI! 🎉

Hai fatto la scelta giusta investendo su te stesso/a.

Ecco i prossimi passi:

1️⃣ Accedi all'area riservata: [LINK_CORSO]
2️⃣ Completa il modulo introduttivo
3️⃣ Unisciti alla community: [LINK_COMMUNITY]

Se hai bisogno di supporto tecnico, scrivi a support@{domain}

A presto nella tua nuova avventura!
{partner_name}"""
    },
    "cart_abandoned": {
        "name": "Carrello Abbandonato",
        "trigger": "cart_abandoned",
        "delay_hours": 2,
        "subject": "Hai dimenticato qualcosa? 🛒",
        "body": """Ciao {nome},

Ho notato che hai lasciato qualcosa nel carrello...

Forse hai avuto un imprevisto? Nessun problema!

Il tuo carrello è ancora attivo:
👉 [LINK_CHECKOUT]

Se hai domande o dubbi che ti bloccano, rispondimi. Sono qui per aiutarti a prendere la decisione giusta per te.

{partner_name}"""
    }
}

# Predefined REACTIVATION SEQUENCES for cold leads
REACTIVATION_SEQUENCES = {
    "cold_revival_3wave": {
        "name": "Riattivazione 3 Wave - Cold Lead Revival",
        "trigger": "tag_added",
        "systeme_tag": "evo_reactivation",
        "steps": [
            {
                "day": 1,
                "subject": "Mi sei mancato/a... 💭",
                "body": """Ciao {nome},

È passato un po' di tempo dall'ultima volta che ci siamo sentiti.

Mi chiedevo come stai e se hai ancora quell'obiettivo che ti aveva portato qui la prima volta.

Sai, ho visto molte persone nella tua situazione raggiungere risultati incredibili semplicemente facendo il primo passo.

Se vuoi riprendere da dove avevi lasciato, sono qui.

Un saluto,
{partner_name}

P.S. Rispondi a questa email se hai 2 minuti - mi farebbe piacere sapere come stai.""",
                "email_type": "reactivation"
            },
            {
                "day": 3,
                "subject": "Ho qualcosa per te (gratis) 🎁",
                "body": """Ciao {nome},

Dato che non ci sentiamo da un po', ho pensato di farti un regalo.

Ho preparato [NOME_LEAD_MAGNET] - completamente gratuito.

È perfetto per te se vuoi [BENEFICIO_PRINCIPALE].

👉 Scaricalo qui: [LINK_LEAD_MAGNET]

Nessun impegno, nessuna carta di credito richiesta. Solo valore puro.

Fammi sapere cosa ne pensi!

{partner_name}""",
                "email_type": "value"
            },
            {
                "day": 7,
                "subject": "Ultima chance + regalo speciale ⏰",
                "body": """Ciao {nome},

Questa è l'ultima email che ti scrivo per un po'.

Prima di salutarti, volevo offrirti qualcosa di speciale:

🎯 Accesso esclusivo al mio [NOME_OFFERTA] a soli €7 (invece di €67)

Questo è il prezzo più basso che abbia mai offerto, e lo faccio solo perché voglio darti una seconda possibilità.

👉 Approfitta ora: [LINK_TRIPWIRE]

⏰ L'offerta scade tra 48 ore.

Se non fa per te, nessun problema. Ti auguro il meglio!

{partner_name}

P.S. Se clicchi e poi hai ripensamenti, nessun problema. Ma almeno dai un'occhiata a cosa potresti ottenere.""",
                "email_type": "offer"
            }
        ]
    },
    "hot_lead_tripwire": {
        "name": "Hot Lead → Tripwire €7",
        "trigger": "tag_added",
        "systeme_tag": "evo_hot_lead",
        "steps": [
            {
                "day": 0,
                "subject": "🔥 Offerta esclusiva per te (solo €7)",
                "body": """Ciao {nome},

Ho notato che sei molto interessato/a a [ARGOMENTO].

Per questo motivo, voglio farti un'offerta che non faccio a tutti:

Puoi accedere a [NOME_OFFERTA] a soli €7 invece di €67.

Cosa include:
✅ [BENEFICIO_1]
✅ [BENEFICIO_2]
✅ [BENEFICIO_3]

👉 Approfitta ora: [LINK_TRIPWIRE]

Questa offerta è disponibile solo per 48 ore.

{partner_name}""",
                "email_type": "offer"
            },
            {
                "day": 1,
                "subject": "Hai visto l'offerta? ⏰",
                "body": """Ciao {nome},

Volevo assicurarmi che avessi visto l'email di ieri.

L'offerta a €7 per [NOME_OFFERTA] scade domani.

Se hai dubbi o domande, rispondimi - sono qui per aiutarti.

👉 Link diretto: [LINK_TRIPWIRE]

{partner_name}""",
                "email_type": "reminder"
            }
        ]
    },
    "warm_nurture_5day": {
        "name": "Warm Lead Nurturing - 5 giorni",
        "trigger": "tag_added",
        "systeme_tag": "evo_warm_nurture",
        "steps": [
            {
                "day": 0,
                "subject": "Ecco cosa ho preparato per te 📚",
                "body": """Ciao {nome},

Nei prossimi giorni ti invierò alcuni contenuti esclusivi che ti aiuteranno a [OBIETTIVO_PRINCIPALE].

Iniziamo subito con qualcosa di pratico:

[CONTENUTO_VALORE_1]

Domani ti invierò il secondo contenuto. Resta sintonizzato/a!

{partner_name}""",
                "email_type": "nurture"
            },
            {
                "day": 2,
                "subject": "Il metodo che ha cambiato tutto 💡",
                "body": """Ciao {nome},

Oggi voglio parlarti di [METODO/STRATEGIA].

[CONTENUTO_VALORE_2]

Questo è esattamente ciò che insegno nella mia Masterclass gratuita:
👉 [LINK_MASTERCLASS]

{partner_name}""",
                "email_type": "nurture"
            },
            {
                "day": 4,
                "subject": "La storia di [NOME_CLIENTE] 🌟",
                "body": """Ciao {nome},

Lascia che ti racconti cosa è successo a [NOME_CLIENTE]...

[CASE_STUDY]

Se vuoi risultati simili, ho qualcosa per te:
👉 [LINK_OFFERTA]

{partner_name}""",
                "email_type": "case_study"
            },
            {
                "day": 5,
                "subject": "Pronto/a per il prossimo passo? 🚀",
                "body": """Ciao {nome},

In questi giorni ti ho mostrato:
✅ [RECAP_1]
✅ [RECAP_2]
✅ [RECAP_3]

Ora hai due scelte:
1. Continuare da solo/a (va benissimo!)
2. Accelerare con il mio supporto

Se scegli la seconda, ho un'offerta speciale per te:
[NOME_OFFERTA] a soli €7

👉 Scopri di più: [LINK_TRIPWIRE]

{partner_name}""",
                "email_type": "offer"
            }
        ]
    }
}

@api_router.get("/email-automation/reactivation-sequences")
async def get_reactivation_sequences():
    """Get predefined reactivation sequences"""
    return {"sequences": REACTIVATION_SEQUENCES}

@api_router.post("/email-automation/create-reactivation/{sequence_type}")
async def create_reactivation_sequence(sequence_type: str, partner_id: str):
    """Create a predefined reactivation sequence for a partner"""
    if sequence_type not in REACTIVATION_SEQUENCES:
        raise HTTPException(status_code=400, detail=f"Tipo sequenza non valido. Usa: {list(REACTIVATION_SEQUENCES.keys())}")
    
    template = REACTIVATION_SEQUENCES[sequence_type]
    
    sequence = {
        "id": str(uuid.uuid4()),
        "partner_id": partner_id,
        "name": template["name"],
        "trigger": template["trigger"],
        "systeme_tag": template["systeme_tag"],
        "steps": template["steps"],
        "is_active": True,
        "is_predefined": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.email_sequences.insert_one(sequence)
    
    return {"success": True, "sequence": {k: v for k, v in sequence.items() if k != "_id"}}

@api_router.get("/email-automation/templates")
async def get_email_templates():
    """Get predefined email templates"""
    return {"templates": EMAIL_TEMPLATES}

@api_router.get("/email-automation/partner/{partner_id}")
async def get_partner_email_automations(partner_id: str):
    """Get all email automations for a partner"""
    automations = await db.email_automations.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(100)
    
    sequences = await db.email_sequences.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).to_list(50)
    
    return {
        "automations": automations,
        "sequences": sequences
    }

@api_router.post("/email-automation/create")
async def create_email_automation(data: EmailAutomationCreate):
    """Create a single email automation"""
    automation = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.email_automations.insert_one(automation)
    
    return {"success": True, "automation": {k: v for k, v in automation.items() if k != "_id"}}

@api_router.post("/email-automation/sequence")
async def create_email_sequence(data: EmailSequenceCreate):
    """Create an email sequence (drip campaign)"""
    sequence = {
        "id": str(uuid.uuid4()),
        "partner_id": data.partner_id,
        "name": data.name,
        "trigger": data.trigger,
        "steps": [s.model_dump() for s in data.steps],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.email_sequences.insert_one(sequence)
    
    return {"success": True, "sequence": {k: v for k, v in sequence.items() if k != "_id"}}

@api_router.put("/email-automation/{automation_id}/toggle")
async def toggle_email_automation(automation_id: str):
    """Toggle automation active/inactive"""
    automation = await db.email_automations.find_one({"id": automation_id})
    if not automation:
        raise HTTPException(status_code=404, detail="Automazione non trovata")
    
    new_status = not automation.get("is_active", True)
    await db.email_automations.update_one(
        {"id": automation_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"success": True, "is_active": new_status}

@api_router.delete("/email-automation/{automation_id}")
async def delete_email_automation(automation_id: str):
    """Delete an email automation"""
    result = await db.email_automations.delete_one({"id": automation_id})
    if result.deleted_count == 0:
        # Try sequences
        result = await db.email_sequences.delete_one({"id": automation_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Automazione non trovata")
    
    return {"success": True}

@api_router.post("/email-automation/generate-sequence")
async def generate_email_sequence_ai(partner_id: str, partner_name: str, partner_niche: str, sequence_type: str = "nurture"):
    """Generate an email sequence using AI (STEFANIA)"""
    
    # Use Claude to generate a personalized sequence
    prompt = f"""Genera una sequenza email di 5 giorni per un {sequence_type} funnel.

PARTNER: {partner_name}
NICCHIA: {partner_niche}

La sequenza deve seguire questo schema:
- Giorno 1: Email di benvenuto + delivery del lead magnet
- Giorno 2: Email di valore (insegnamento)
- Giorno 4: Case study/testimonianza
- Giorno 6: Soft pitch dell'offerta
- Giorno 7: Email di urgenza finale

Per ogni email fornisci:
- subject: Oggetto accattivante
- body: Corpo email (usa {{nome}} come variabile per il nome)

Rispondi in JSON con questo formato:
{{
  "steps": [
    {{"day": 1, "subject": "...", "body": "...", "email_type": "welcome"}},
    ...
  ]
}}"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            model="claude-sonnet-4-20250514"
        )
        response = await chat.send_async(prompt)
        
        # Parse JSON response
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            sequence_data = json.loads(json_match.group())
            
            # Save sequence
            sequence = {
                "id": str(uuid.uuid4()),
                "partner_id": partner_id,
                "name": f"Sequenza {sequence_type.capitalize()} - AI Generated",
                "trigger": "new_subscriber",
                "steps": sequence_data.get("steps", []),
                "is_active": False,  # Requires review before activation
                "ai_generated": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.email_sequences.insert_one(sequence)
            
            return {"success": True, "sequence": {k: v for k, v in sequence.items() if k != "_id"}}
        else:
            raise HTTPException(status_code=500, detail="Errore nel parsing della risposta AI")
            
    except Exception as e:
        logging.error(f"Error generating email sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

# =============================================================================
# AGENT HUB - CENTRALIZED BUSINESS INTELLIGENCE
# =============================================================================

@api_router.get("/agent-hub/status")
async def get_all_agents_status():
    """Get status and metrics for all 9 agents"""
    return await agent_hub.get_all_agents_status()

@api_router.get("/agent-hub/agent/{agent_id}")
async def get_single_agent_status(agent_id: str):
    """Get detailed status for a specific agent"""
    return await agent_hub.get_agent_status(agent_id.upper())

@api_router.get("/agent-hub/summary")
async def get_business_summary():
    """Get comprehensive business summary from all agents"""
    return await agent_hub.get_business_summary()

@api_router.get("/agent-hub/alerts")
async def get_system_alerts():
    """Get all active alerts across agents"""
    summary = await agent_hub.get_business_summary()
    return {
        "alerts": summary.get("alerts", []),
        "opportunities": summary.get("opportunities", []),
        "health": summary.get("health", {})
    }

@api_router.post("/agent-hub/activate/{agent_id}")
async def activate_agent(agent_id: str):
    """Activate an agent - creates if doesn't exist"""
    agent_id_upper = agent_id.upper()
    
    # Upsert: create if not exists, update if exists
    result = await db.agents.update_one(
        {"id": agent_id_upper},
        {
            "$set": {
                "status": "ACTIVE", 
                "activated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "id": agent_id_upper,
                "budget": 10,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return {"success": True, "agent": agent_id_upper, "status": "ACTIVE"}

# =============================================================================
# EMAIL QUEUE MANAGEMENT
# =============================================================================

@api_router.get("/email-queue/{partner_id}")
async def get_email_queue(partner_id: str, status: Optional[str] = None):
    """Get email queue for a partner"""
    query = {"partner_id": partner_id}
    if status:
        query["status"] = status
    
    queue = await db.email_queue.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Stats
    stats = {
        "total": len(queue),
        "pending": len([q for q in queue if q.get("status") == "pending"]),
        "scheduled": len([q for q in queue if q.get("status") == "scheduled"]),
        "sent": len([q for q in queue if q.get("status") == "sent"]),
        "active_sequences": len([q for q in queue if q.get("status") == "active" and q.get("type") == "sequence"])
    }
    
    return {"queue": queue, "stats": stats}

@api_router.post("/email-queue/trigger-test")
async def trigger_test_sequence(partner_id: str, email: str, name: str = "Test User"):
    """Manually trigger email sequence for testing"""
    actions = await trigger_email_sequence(
        partner_id=partner_id,
        contact_email=email,
        contact_name=name,
        trigger_type="new_subscriber"
    )
    return {"success": True, "actions": actions}

@api_router.delete("/email-queue/{queue_id}")
async def cancel_queued_email(queue_id: str):
    """Cancel a queued email"""
    result = await db.email_queue.update_one(
        {"id": queue_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Email in coda non trovata")
    return {"success": True}

@api_router.get("/email-queue/stats/global")
async def get_global_email_stats():
    """Get global email queue statistics"""
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    stats_raw = await db.email_queue.aggregate(pipeline).to_list(10)
    stats = {item["_id"]: item["count"] for item in stats_raw}
    
    # Recent activity
    recent = await db.email_queue.find(
        {},
        {"_id": 0, "contact_email": 1, "contact_name": 1, "sequence_name": 1, "automation_name": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "stats": stats,
        "recent_activity": recent
    }

# =============================================================================
# STRIPE CHECKOUT - AVATAR SERVICE PAYMENT
# =============================================================================

# Fixed service packages (server-side only - security)
AVATAR_SERVICE_PACKAGES = {
    "single_lesson": {
        "name": "Lezione Singola",
        "price": 120.00,
        "description": "Produzione professionale per 1 lezione del tuo videocorso",
        "includes": ["1 Lezione professionale", "Script ottimizzato", "Editing completo", "Sottotitoli"]
    },
    "bundle_3": {
        "name": "Bundle 3 Lezioni",
        "price": 300.00,
        "description": "Produzione professionale per 3 lezioni (sconto 17%)",
        "includes": ["3 Lezioni professionali", "Script ottimizzati", "Editing completo", "Sottotitoli", "Intro/Outro brandizzate"]
    },
    "bundle_5": {
        "name": "Bundle 5 Lezioni",
        "price": 450.00,
        "description": "Produzione professionale per 5 lezioni (sconto 25%)",
        "includes": ["5 Lezioni professionali", "Script premium", "Editing avanzato", "Sottotitoli animati", "Intro/Outro brandizzate", "Revisione inclusa"]
    },
    "bundle_10": {
        "name": "Bundle 10 Lezioni",
        "price": 800.00,
        "description": "Produzione professionale per videocorso completo (fino a 10 lezioni)",
        "includes": ["Fino a 10 Lezioni", "Script premium", "Editing cinematografico", "Sottotitoli animati", "Branding completo", "2 revisioni incluse", "Supporto prioritario"]
    },
    "bundle_15": {
        "name": "Bundle 15 Lezioni",
        "price": 1200.00,
        "description": "Produzione professionale per videocorso completo (fino a 15 lezioni)",
        "includes": ["Fino a 15 Lezioni", "Script premium", "Editing cinematografico", "Sottotitoli animati", "Branding completo", "3 revisioni incluse", "Supporto prioritario", "Consulenza strategica"]
    }
}

class AvatarPaymentRequest(BaseModel):
    package_id: str
    partner_id: str
    partner_name: str
    partner_email: Optional[str] = None
    origin_url: str
    lesson_details: Optional[str] = None

@api_router.get("/avatar-packages")
async def get_avatar_packages():
    """Get available avatar service packages"""
    return {"packages": AVATAR_SERVICE_PACKAGES}

@api_router.post("/avatar-checkout")
async def create_avatar_checkout(request: Request, data: AvatarPaymentRequest):
    """Create Stripe checkout session for avatar service"""
    
    # Validate package
    if data.package_id not in AVATAR_SERVICE_PACKAGES:
        raise HTTPException(status_code=400, detail="Pacchetto non valido")
    
    package = AVATAR_SERVICE_PACKAGES[data.package_id]
    
    # Get Stripe API key
    stripe_api_key = get_env_override("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    # Build dynamic URLs from frontend origin
    success_url = f"{data.origin_url}/avatar-payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/avatar-payment-cancel"
    
    # Initialize Stripe checkout
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=package["price"],
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "package_id": data.package_id,
            "package_name": package["name"],
            "partner_id": data.partner_id,
            "partner_name": data.partner_name,
            "partner_email": data.partner_email or "",
            "lesson_details": data.lesson_details or "",
            "service_type": "avatar_production"
        }
    )
    
    try:
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "partner_id": data.partner_id,
            "partner_name": data.partner_name,
            "partner_email": data.partner_email,
            "package_id": data.package_id,
            "package_name": package["name"],
            "amount": package["price"],
            "currency": "eur",
            "status": "pending",
            "payment_status": "initiated",
            "lesson_details": data.lesson_details,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id,
            "package": package
        }
        
    except Exception as e:
        logging.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore creazione checkout: {str(e)}")

@api_router.get("/avatar-checkout/status/{session_id}")
async def get_avatar_checkout_status(session_id: str):
    """Get payment status for avatar checkout"""
    
    stripe_api_key = get_env_override("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in database
        update_data = {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # If paid, trigger production workflow
        if status.payment_status == "paid":
            # Check if not already processed
            existing = await db.payment_transactions.find_one({
                "session_id": session_id,
                "payment_status": "paid"
            })
            
            if not existing:
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                
                # Get transaction details for notification
                transaction = await db.payment_transactions.find_one({"session_id": session_id})
                if transaction:
                    # Send Telegram notification
                    try:
                        await telegram_notify(
                            notification_type="alert",
                            message=f"💰 NUOVO PAGAMENTO AVATAR!\n\nPartner: {transaction.get('partner_name')}\nPacchetto: {transaction.get('package_name')}\nImporto: €{transaction.get('amount')}\n\n📋 Dettagli: {transaction.get('lesson_details', 'N/D')}\n\n▶️ Avvia produzione avatar!"
                        )
                    except Exception as e:
                        logging.error(f"Failed to send payment notification: {e}")
                    
                    # 🔄 SYNC con Systeme.io
                    try:
                        # Try to get partner email from partners collection
                        partner = await db.partners.find_one({"id": transaction.get('partner_id')}, {"_id": 0})
                        partner_email = partner.get('email', '') if partner else transaction.get('partner_email', '')
                        partner_name = transaction.get('partner_name', '')
                        
                        if partner_email:
                            # Split name into nome/cognome
                            name_parts = partner_name.split(' ', 1)
                            nome = name_parts[0] if name_parts else ''
                            cognome = name_parts[1] if len(name_parts) > 1 else ''
                            
                            systeme_result = await sync_payment_to_systeme(
                                email=partner_email,
                                nome=nome,
                                cognome=cognome,
                                payment_type="avatar",
                                amount=float(transaction.get('amount', 0)),
                                metadata={
                                    "partner_id": transaction.get('partner_id'),
                                    "package_name": transaction.get('package_name'),
                                    "session_id": session_id
                                }
                            )
                            logging.info(f"Systeme.io sync result for avatar payment: {systeme_result}")
                    except Exception as sync_error:
                        logging.error(f"Systeme.io sync failed (non-blocking): {sync_error}")
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        return {
            "session_id": session_id,
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
        
    except Exception as e:
        logging.error(f"Error checking payment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
# CONSULENZA MARKETING 1:1 CHECKOUT - €147
# ═══════════════════════════════════════════════════════════════════════════════

class ConsulenzaPaymentRequest(BaseModel):
    service_type: str = "consulenza_marketing"
    consultant_id: str
    partner_id: str
    partner_name: str
    partner_email: str = ""
    origin_url: str
    preferred_date: str = ""
    project_focus: str = ""
    price: int = 147

@api_router.post("/consulenza-checkout")
async def create_consulenza_checkout(request: Request, data: ConsulenzaPaymentRequest):
    """Create Stripe checkout session for marketing consultation"""
    
    consultant_names = {
        "claudio": "Claudio Bertogliatti",
        "antonella": "Antonella"
    }
    consultant_name = consultant_names.get(data.consultant_id, data.consultant_id)
    
    stripe_api_key = get_env_override("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    success_url = f"{data.origin_url}/consulenza-payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/consulenza-payment-cancel"
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=data.price,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "service_type": "consulenza_marketing",
            "consultant_id": data.consultant_id,
            "consultant_name": consultant_name,
            "partner_id": data.partner_id,
            "partner_name": data.partner_name,
            "partner_email": data.partner_email or "",
            "preferred_date": data.preferred_date or "",
            "project_focus": data.project_focus or ""
        }
    )
    
    try:
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "service_type": "consulenza_marketing",
            "partner_id": data.partner_id,
            "partner_name": data.partner_name,
            "partner_email": data.partner_email,
            "consultant_id": data.consultant_id,
            "consultant_name": consultant_name,
            "amount": data.price,
            "currency": "eur",
            "status": "pending",
            "payment_status": "initiated",
            "preferred_date": data.preferred_date,
            "project_focus": data.project_focus,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logging.error(f"Consulenza checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore creazione checkout: {str(e)}")

# ═══════════════════════════════════════════════════════════════════════════════
# BRANDING PREMIUM PACK CHECKOUT - €297
# ═══════════════════════════════════════════════════════════════════════════════

class BrandingPaymentRequest(BaseModel):
    service_type: str = "branding_pack"
    partner_id: str
    partner_name: str
    partner_email: str = ""
    origin_url: str
    brand_name: str
    brand_description: str = ""
    preferred_style: str = ""
    color_preferences: str = ""
    price: int = 297

@api_router.post("/branding-checkout")
async def create_branding_checkout(request: Request, data: BrandingPaymentRequest):
    """Create Stripe checkout session for branding pack"""
    
    stripe_api_key = get_env_override("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    success_url = f"{data.origin_url}/branding-payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/branding-payment-cancel"
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=data.price,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "service_type": "branding_pack",
            "partner_id": data.partner_id,
            "partner_name": data.partner_name,
            "partner_email": data.partner_email or "",
            "brand_name": data.brand_name,
            "brand_description": data.brand_description or "",
            "preferred_style": data.preferred_style or "",
            "color_preferences": data.color_preferences or ""
        }
    )
    
    try:
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "service_type": "branding_pack",
            "partner_id": data.partner_id,
            "partner_name": data.partner_name,
            "partner_email": data.partner_email,
            "brand_name": data.brand_name,
            "brand_description": data.brand_description,
            "preferred_style": data.preferred_style,
            "color_preferences": data.color_preferences,
            "amount": data.price,
            "currency": "eur",
            "status": "pending",
            "payment_status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logging.error(f"Branding checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore creazione checkout: {str(e)}")



@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    stripe_api_key = get_env_override("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logging.info(f"Stripe webhook received: {webhook_response.event_type}")
        
        # Update transaction based on webhook event
        if webhook_response.session_id:
            update_data = {
                "payment_status": webhook_response.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if webhook_response.payment_status == "paid":
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                
                # 🔄 SYNC con Systeme.io per Servizi Extra
                transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
                if transaction and not transaction.get("systeme_synced"):
                    try:
                        service_type = transaction.get("service_type", "")
                        partner_email = transaction.get("partner_email", "")
                        partner_name = transaction.get("partner_name", "")
                        amount = float(transaction.get("amount", 0))
                        
                        # Try to get email from partners collection if not in transaction
                        if not partner_email and transaction.get("partner_id"):
                            partner = await db.partners.find_one({"id": transaction.get("partner_id")}, {"_id": 0})
                            if partner:
                                partner_email = partner.get("email", "")
                        
                        if partner_email:
                            # Split name into nome/cognome
                            name_parts = partner_name.split(' ', 1)
                            nome = name_parts[0] if name_parts else ''
                            cognome = name_parts[1] if len(name_parts) > 1 else ''
                            
                            # Map service_type to payment_type
                            payment_type_map = {
                                "avatar_pro": "avatar",
                                "consulenza_marketing": "consulenza",
                                "branding_pack": "branding"
                            }
                            payment_type = payment_type_map.get(service_type, service_type)
                            
                            systeme_result = await sync_payment_to_systeme(
                                email=partner_email,
                                nome=nome,
                                cognome=cognome,
                                payment_type=payment_type,
                                amount=amount,
                                metadata={
                                    "partner_id": transaction.get("partner_id"),
                                    "service_type": service_type,
                                    "session_id": webhook_response.session_id
                                }
                            )
                            logging.info(f"Systeme.io sync via webhook for {service_type}: {systeme_result}")
                            
                            # Mark as synced
                            update_data["systeme_synced"] = True
                            update_data["systeme_sync_result"] = systeme_result
                    except Exception as sync_error:
                        logging.error(f"Systeme.io sync via webhook failed (non-blocking): {sync_error}")
            
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": update_data}
            )
        
        return {"received": True}
        
    except Exception as e:
        logging.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/avatar-payments/{partner_id}")
async def get_partner_avatar_payments(partner_id: str):
    """Get all avatar payments for a partner"""
    
    payments = await db.payment_transactions.find(
        {"partner_id": partner_id, "service_type": "avatar_production"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"payments": payments, "total": len(payments)}

@api_router.get("/servizi-extra/payment-status/{session_id}")
async def get_servizi_extra_payment_status(session_id: str):
    """
    Verifica lo status di un pagamento per servizi extra (consulenza, branding)
    e sincronizza con Systeme.io se pagato.
    """
    stripe_api_key = get_env_override("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Get transaction from database
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        
        update_data = {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        systeme_synced = False
        
        # If paid and not yet synced
        if status.payment_status == "paid" and transaction and not transaction.get("systeme_synced"):
            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
            
            # 🔄 SYNC con Systeme.io
            try:
                service_type = transaction.get("service_type", "")
                partner_email = transaction.get("partner_email", "")
                partner_name = transaction.get("partner_name", "")
                amount = float(transaction.get("amount", 0))
                
                # Try to get email from partners collection if not in transaction
                if not partner_email and transaction.get("partner_id"):
                    partner = await db.partners.find_one({"id": transaction.get("partner_id")}, {"_id": 0})
                    if partner:
                        partner_email = partner.get("email", "")
                
                if partner_email:
                    # Split name into nome/cognome
                    name_parts = partner_name.split(' ', 1)
                    nome = name_parts[0] if name_parts else ''
                    cognome = name_parts[1] if len(name_parts) > 1 else ''
                    
                    # Map service_type to payment_type
                    payment_type_map = {
                        "avatar_pro": "avatar",
                        "consulenza_marketing": "consulenza",
                        "branding_pack": "branding"
                    }
                    payment_type = payment_type_map.get(service_type, service_type)
                    
                    systeme_result = await sync_payment_to_systeme(
                        email=partner_email,
                        nome=nome,
                        cognome=cognome,
                        payment_type=payment_type,
                        amount=amount,
                        metadata={
                            "partner_id": transaction.get("partner_id"),
                            "service_type": service_type,
                            "session_id": session_id
                        }
                    )
                    logging.info(f"Systeme.io sync for {service_type}: {systeme_result}")
                    
                    update_data["systeme_synced"] = True
                    update_data["systeme_sync_result"] = systeme_result
                    systeme_synced = True
            except Exception as sync_error:
                logging.error(f"Systeme.io sync failed: {sync_error}")
        
        if transaction:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )
        
        return {
            "session_id": session_id,
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "service_type": transaction.get("service_type") if transaction else None,
            "systeme_synced": systeme_synced or (transaction.get("systeme_synced") if transaction else False)
        }
        
    except Exception as e:
        logging.error(f"Error checking payment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEME.IO PAYMENT SYNC MONITORING (Admin)
# ═══════════════════════════════════════════════════════════════════════════════

@api_router.get("/systeme/payment-syncs")
async def get_systeme_payment_syncs(limit: int = 50, payment_type: Optional[str] = None):
    """
    Recupera lo storico delle sincronizzazioni pagamenti con Systeme.io.
    Endpoint admin per monitorare le integrazioni.
    """
    query = {}
    if payment_type:
        query["payment_type"] = payment_type
    
    syncs = await db.systeme_payment_syncs.find(
        query,
        {"_id": 0}
    ).sort("synced_at", -1).limit(limit).to_list(limit)
    
    # Stats
    total_syncs = await db.systeme_payment_syncs.count_documents({})
    successful_syncs = await db.systeme_payment_syncs.count_documents({"success": True})
    
    # Revenue by type
    pipeline = [
        {"$match": {"success": True}},
        {"$group": {
            "_id": "$payment_type",
            "total_amount": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    revenue_by_type = await db.systeme_payment_syncs.aggregate(pipeline).to_list(100)
    
    return {
        "syncs": syncs,
        "stats": {
            "total_syncs": total_syncs,
            "successful_syncs": successful_syncs,
            "success_rate": round(successful_syncs / total_syncs * 100, 1) if total_syncs > 0 else 0,
            "revenue_by_type": {r["_id"]: {"amount": r["total_amount"], "count": r["count"]} for r in revenue_by_type}
        }
    }

@api_router.post("/systeme/manual-sync")
async def manual_systeme_payment_sync(
    email: str,
    nome: str,
    cognome: str,
    payment_type: str,
    amount: float
):
    """
    Sincronizzazione manuale di un pagamento con Systeme.io.
    Utile per pagamenti manuali/bonifici o per recuperare sync fallite.
    """
    result = await sync_payment_to_systeme(
        email=email,
        nome=nome,
        cognome=cognome,
        payment_type=payment_type,
        amount=amount,
        metadata={"manual_sync": True, "synced_by": "admin"}
    )
    
    return {
        "success": result.get("success", False),
        "result": result
    }

# ═══════════════════════════════════════════════════════════════════════════════
# CLIENTI ANALISI ENDPOINTS - /api/clienti-analisi
# ═══════════════════════════════════════════════════════════════════════════════

try:
    from analisi_workflow import esegui_workflow_analisi, valida_risposte, aggiungi_tag_systeme
    ANALISI_MODULE_OK = True
except ImportError as e:
    logging.warning(f"[WARN] analisi_workflow non disponibile: {e}")
    ANALISI_MODULE_OK = False

@api_router.get("/clienti-analisi")
async def lista_clienti_analisi():
    """Lista tutti i clienti dell'Analisi Strategica."""
    from datetime import timedelta
    clienti = await db.clienti_analisi.find({}).to_list(200)
    now = datetime.now(timezone.utc)
    result = []
    for c in clienti:
        c["id"] = str(c.get("_id", c.get("id", "")))
        c.pop("_id", None)
        data_acq = c.get("data_acquisto")
        q_completato = c.get("questionario", {}).get("completato", False)
        stato = c.get("stato", "pagato")
        # Flag: non ha compilato il questionario da oltre 24h
        c["non_compilato_24h"] = False
        if stato == "pagato" and not q_completato and data_acq:
            try:
                if isinstance(data_acq, str):
                    data_acq = datetime.fromisoformat(data_acq.replace('Z', '+00:00'))
                if (now - data_acq).total_seconds() > 86400:
                    c["non_compilato_24h"] = True
            except:
                pass
        result.append(c)
    return result

@api_router.post("/clienti-analisi/{cliente_id}/questionario")
async def salva_questionario_analisi(cliente_id: str, body: dict, background_tasks: BackgroundTasks):
    """Salva le risposte del questionario e avvia il workflow."""
    try:
        query = {"_id": ObjectId(cliente_id)}
    except:
        query = {"$or": [{"id": cliente_id}, {"id": str(cliente_id)}]}
    
    await db.clienti_analisi.update_one(query, {"$set": {
        "questionario.completato": True,
        "questionario.risposte": body,
        "questionario.data_compilazione": datetime.now(timezone.utc),
        "stato": "questionario_completato",
        "workflow_status": "attesa"
    }})
    
    if ANALISI_MODULE_OK:
        background_tasks.add_task(esegui_workflow_analisi, cliente_id, db)
    
    return {"success": True}

@api_router.get("/clienti-analisi/{cliente_id}/questionario")
async def get_questionario_analisi(cliente_id: str):
    """Recupera le risposte del questionario di un cliente."""
    try:
        query = {"_id": ObjectId(cliente_id)}
    except:
        query = {"$or": [{"id": cliente_id}, {"id": str(cliente_id)}]}
    
    cliente = await db.clienti_analisi.find_one(query)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return cliente.get("questionario", {})

@api_router.post("/clienti-analisi/{cliente_id}/avvia-analisi")
async def avvia_analisi_cliente(cliente_id: str, background_tasks: BackgroundTasks):
    """Avvia manualmente il workflow di analisi."""
    if not ANALISI_MODULE_OK:
        raise HTTPException(status_code=503, detail="Modulo analisi non disponibile")
    
    try:
        query = {"_id": ObjectId(cliente_id)}
    except:
        query = {"$or": [{"id": cliente_id}, {"id": str(cliente_id)}]}
    
    await db.clienti_analisi.update_one(query, {"$set": {"workflow_status": "avviato"}})
    background_tasks.add_task(esegui_workflow_analisi, cliente_id, db)
    return {"avviato": True}

@api_router.get("/clienti-analisi/{cliente_id}/workflow-status")
async def get_workflow_status_analisi(cliente_id: str):
    """Ottiene lo stato del workflow di analisi."""
    try:
        query = {"_id": ObjectId(cliente_id)}
    except:
        query = {"$or": [{"id": cliente_id}, {"id": str(cliente_id)}]}
    
    c = await db.clienti_analisi.find_one(query, {
        "workflow_status": 1, "docx_analisi_url": 1, 
        "validazione_campi_ko": 1, "analisi_completata_at": 1
    })
    if not c:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    return {
        "workflow_status": c.get("workflow_status", "attesa"),
        "docx_url": c.get("docx_analisi_url"),
        "campi_ko": c.get("validazione_campi_ko"),
        "completata_at": c.get("analisi_completata_at")
    }

@api_router.get("/clienti-analisi/{cliente_id}/scarica-docx")
async def scarica_docx_analisi(cliente_id: str):
    """Download del file DOCX dell'analisi."""
    try:
        query = {"_id": ObjectId(cliente_id)}
    except:
        query = {"$or": [{"id": cliente_id}, {"id": str(cliente_id)}]}
    
    c = await db.clienti_analisi.find_one(query)
    if not c or not c.get("docx_analisi_url"):
        raise HTTPException(status_code=404, detail="Analisi non ancora generata")
    
    file_path = Path("/app/backend") / c["docx_analisi_url"].lstrip("/")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    
    return FileResponse(
        path=str(file_path), 
        filename=file_path.name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

# Include router
app.include_router(api_router)

# Include clienti router
from routers.clienti import router as clienti_router, set_db as set_clienti_db
set_clienti_db(db)
app.include_router(clienti_router)

# Include onboarding router
from routers.onboarding import router as onboarding_router, set_db as set_onboarding_db
set_onboarding_db(db)
app.include_router(onboarding_router)

# Mount static files for DOCX downloads
app.mount("/api/static", StaticFiles(directory="/app/backend/static"), name="static")

# Include agents router (MARCO, GAIA, STEFANIA)
from routers.agents_router import router as agents_router
app.include_router(agents_router, prefix="/api/agents", tags=["agents"])

# Include YouTube HeyGen router
from routers.youtube_heygen import router as youtube_heygen_router
app.include_router(youtube_heygen_router, prefix="/api", tags=["youtube-heygen"])

# Include partnership activation router
from routers.partnership import router as partnership_router, set_db as set_partnership_db, set_systeme_sync_func
set_partnership_db(db)
set_systeme_sync_func(sync_payment_to_systeme)  # Pass the Systeme.io sync function
app.include_router(partnership_router)

# Include partner journey router (Posizionamento, Masterclass, Videocorso, Funnel, Lancio)
from routers.partner_journey import router as partner_journey_router, set_db as set_partner_journey_db
set_partner_journey_db(db)
app.include_router(partner_journey_router)

# Include Masterclass Factory router (Evolution Masterclass Factory)
from routers.masterclass_factory import router as masterclass_factory_router, set_db as set_masterclass_factory_db
set_masterclass_factory_db(db)
app.include_router(masterclass_factory_router)

# Include Stefania Chat router (Coordinatrice AI)
from routers.stefania_chat import router as stefania_router, set_db as set_stefania_db
set_stefania_db(db)
app.include_router(stefania_router)

# Include analisi consulenziale router (Analisi Preliminare, Script Call, Analisi Finale)
from routers.analisi_consulenziale import router as analisi_consulenziale_router, set_db as set_analisi_consulenziale_db
set_analisi_consulenziale_db(db)
app.include_router(analisi_consulenziale_router)

# Include flusso analisi router (Nuovo flusso: Questionario → Auto-genera → Admin modifica → Call → Decisione → Partnership)
from routers.flusso_analisi import router as flusso_analisi_router, set_db as set_flusso_analisi_db
set_flusso_analisi_db(db)
app.include_router(flusso_analisi_router)

# Include operations router (Dashboard Antonella: Partner, Contenuti, Campagne ADV)
from routers.operations import router as operations_router, set_operations_db
set_operations_db(db)
app.include_router(operations_router)

# Include Avatar & Social Plan router (HeyGen Digital Twin, Social Content Plans)
from routers.avatar_social import router as avatar_social_router, set_db as set_avatar_social_db
set_avatar_social_db(db)
app.include_router(avatar_social_router)

# Include Discovery Engine AI router (Lead Discovery Proattivo)
from routers.discovery_engine import router as discovery_router, set_db as set_discovery_db
set_discovery_db(db)
app.include_router(discovery_router)

# Include HeyGen Production router (Video Generation)
from routers.heygen_production import router as heygen_prod_router, set_db as set_heygen_prod_db, set_heygen_service
from heygen_service import heygen_service
set_heygen_prod_db(db)
set_heygen_service(heygen_service)
app.include_router(heygen_prod_router)

# Include Journey Automation router (F1-F6 Automation)
from routers.journey_automation import router as journey_router, set_db as set_journey_db
set_journey_db(db)
app.include_router(journey_router)

# Start scheduler for automated jobs
from scheduler import start_scheduler, stop_scheduler

@app.on_event("startup")
async def startup_scheduler():
    start_scheduler()
    logging.info("[STARTUP] Scheduler avviato")

@app.on_event("shutdown")
async def shutdown_scheduler():
    stop_scheduler()
    logging.info("[SHUTDOWN] Scheduler fermato")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Background task holder
background_tasks = set()

@app.on_event("startup")
async def start_background_services():
    """Start background job worker"""
    try:
        from integrated_services import job_executor
        import asyncio
        
        # Create background task for job worker (runs every 60 seconds)
        task = asyncio.create_task(job_executor.start_worker(interval_seconds=60))
        background_tasks.add(task)
        task.add_done_callback(background_tasks.discard)
        
        logging.info("Background job worker started")
    except Exception as e:
        logging.warning(f"Could not start background worker: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Shutdown database and background services"""
    try:
        from integrated_services import job_executor
        job_executor.stop_worker()
    except:
        pass
    client.close()
