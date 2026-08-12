"""
Pydantic model per gli step del journey partner (sub-progetto A Operativo Stefania).
Vedi spec: docs/superpowers/specs/2026-05-17-operativo-stefania-design.md
"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class JourneyStepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


class PartnerJourneyStep(BaseModel):
    partner_id: str
    step_id: str  # slug stabile: "01-contratto", "02-discovery-video", ...
    step_number: float  # 1..15
    fase_legacy: str  # "F1".."F7"
    status: JourneyStepStatus = JourneyStepStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    data: dict[str, Any] = Field(default_factory=dict)
    stefania_briefing_shown: bool = False
    stefania_proactive_sent_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    # Approval bridge (solo per step in _DOC_APPROVAL_STEPS).
    # Default None = step non richiede approvazione admin.
    approval_status: Optional[str] = None  # None | "pending_review" | "approved" | "rejected"
    approval_file_id: Optional[str] = None
    approval_note: Optional[str] = None
    approval_resolved_at: Optional[datetime] = None


# Macro-fasi = le 3 fasi del Metodo EVO (Esamina — Valida — Ottimizza), le stesse
# che Claudio pubblicizza in trattativa. Tutti gli step concreti confluiscono in
# una delle 3 fasi. Ogni fase ha un AGENTE di riferimento (vedi agent_dispatcher).
# Stefania resta voce narrante trasversale (non assegnata a una singola fase).
# La fase "ottimizza" è post-lancio (subentra OperativoContinuo).
MACRO_PHASES_DEFINITION: list[dict[str, Any]] = [
    {"id": "esamina", "label": "Esamina", "tagline": "Chiariamo chi sei e a chi parli", "icon": "🎯", "agent": "VALENTINA", "step_ids": ["02-discovery-video", "01-contratto", "burocrazia", "03-brand-kit", "la-tua-storia", "obiettivo", "04-posizionamento"]},
    {"id": "valida", "label": "Valida", "tagline": "Costruiamo una prima versione vendibile e pubblicabile", "icon": "🚀", "agent": "ANDREA", "step_ids": ["05-script-masterclass", "06-outline-lezioni", "07-script-videolezioni", "08-registra-masterclass", "09-registra-lezioni", "10-sistema-vendita", "11-calendario-30gg", "12-prezzo-webinar", "16-readiness-lancio", "13-lancio", "18-certificato-valida", "19-workbook-finale"]},
    {"id": "ottimizza", "label": "Ottimizza", "tagline": "Miglioriamo su dati reali", "icon": "📈", "agent": "MARCO", "step_ids": ["20-ottimizzazione"]},
]

# OPZIONE A (Metodo EVO): Step bloccanti (obbligatori) e non bloccanti (opzionali/in corso) per ciascuna macro-fase.
#
# Per Esamina:
#   - Bloccanti: "02-discovery-video", "burocrazia", "03-brand-kit", "04-posizionamento"
#   - Non bloccanti:
#       * "la-tua-storia": Resta volutamente in_progress finché il partner non valida la sua storia narrativa;
#         non deve bloccare il sblocco del certificato/bonus di Esamina quando il posizionamento e il brand kit sono pronti.
#       * "obiettivo": Definizione obiettivi intermedi che non deve bloccare il rilascio.
#
# Per Valida:
#   - Bloccanti: "05-script-masterclass", "06-outline-lezioni", "07-script-videolezioni", "08-registra-masterclass",
#                "09-registra-lezioni", "10-sistema-vendita", "11-calendario-30gg", "12-prezzo-webinar"
#   - Non bloccanti:
#       * "13-lancio": Rimosso dal core di Valida per evitare il doppio sblocco sull'evento del go-live (Ottimizza ha già il proprio ramo dedicato al lancio).
REQUIRED_STEP_IDS_BY_PHASE: dict[str, list[str]] = {
    "esamina": ["02-discovery-video", "burocrazia", "03-brand-kit", "04-posizionamento"],
    "valida": [
        "05-script-masterclass",
        "06-outline-lezioni",
        "07-script-videolezioni",
        "08-registra-masterclass",
        "09-registra-lezioni",
        "10-sistema-vendita",
        "11-calendario-30gg",
        "12-prezzo-webinar",
        "16-readiness-lancio",
        "13-lancio",
        "18-certificato-valida",
        "19-workbook-finale",
    ],
    "ottimizza": ["20-ottimizzazione"],
}

# "Avvio" deprecato: contratto e discovery sono ora dentro la fase Esamina.
# Mantenuto vuoto per compatibilità con get_operativo_state (niente chip Avvio).
AVVIO_STEP_IDS: list[str] = []

# Mapping reverse step_id -> macro_phase_id
_MACRO_BY_STEP = {sid: mp["id"] for mp in MACRO_PHASES_DEFINITION for sid in mp["step_ids"]}


# Definizione canonica dei 20 step. Gli step_id storici restano invariati per
# non spezzare dati e registry frontend; `code` e `step_number` sono l'ordine EVO.
JOURNEY_STEPS_DEFINITION: list[dict[str, Any]] = [
    {"step_id": "02-discovery-video", "step_number": 1, "code": "F-1", "fase_legacy": "F1", "macro_phase": "esamina", "label": "Benvenuto", "owner": "STEFANIA", "completion_policy": "discovery_completed", "material_categories": ["briefing"]},
    {"step_id": "01-contratto", "step_number": 2, "code": "F-2", "fase_legacy": "F1", "macro_phase": "esamina", "label": "Contratto + distinta", "owner": "STEFANIA", "completion_policy": "contract_approved", "material_categories": ["contratto"]},
    {"step_id": "burocrazia", "step_number": 3, "code": "F-3", "fase_legacy": "F1", "macro_phase": "esamina", "label": "I tuoi dati", "owner": "STEFANIA", "completion_policy": "partner_data_completed", "material_categories": ["dati_partner"]},
    {"step_id": "03-brand-kit", "step_number": 4, "code": "F-4", "fase_legacy": "F2", "macro_phase": "esamina", "label": "Brand kit", "owner": "VALENTINA", "completion_policy": "brand_kit_approved", "material_categories": ["brand_kit"]},
    {"step_id": "la-tua-storia", "step_number": 5, "code": "F-5", "fase_legacy": "F2", "macro_phase": "esamina", "label": "La tua storia", "owner": "VALENTINA", "completion_policy": "story_approved", "material_categories": ["storia"]},
    {"step_id": "obiettivo", "step_number": 6, "code": "F-6", "fase_legacy": "F2", "macro_phase": "esamina", "label": "Il tuo obiettivo", "owner": "VALENTINA", "completion_policy": "objective_confirmed", "material_categories": ["obiettivi"]},
    {"step_id": "04-posizionamento", "step_number": 7, "code": "F-7", "fase_legacy": "F2", "macro_phase": "esamina", "label": "Posizionamento", "owner": "VALENTINA", "completion_policy": "positioning_approved", "material_categories": ["posizionamento"]},
    {"step_id": "05-script-masterclass", "step_number": 8, "code": "F-8", "fase_legacy": "F3", "macro_phase": "valida", "label": "Script masterclass", "owner": "ANDREA", "completion_policy": "masterclass_script_approved", "material_categories": ["script_masterclass"]},
    {"step_id": "06-outline-lezioni", "step_number": 9, "code": "F-9", "fase_legacy": "F3", "macro_phase": "valida", "label": "Outline lezioni", "owner": "ANDREA", "completion_policy": "course_outline_approved", "material_categories": ["outline_corso"]},
    {"step_id": "07-script-videolezioni", "step_number": 10, "code": "F-10", "fase_legacy": "F3", "macro_phase": "valida", "label": "Script videolezioni", "owner": "ANDREA", "completion_policy": "lesson_scripts_approved", "material_categories": ["script_videolezioni"]},
    {"step_id": "08-registra-masterclass", "step_number": 11, "code": "F-11", "fase_legacy": "F4", "macro_phase": "valida", "label": "Masterclass definitiva", "owner": "ANDREA", "completion_policy": "masterclass_current_version_approved", "material_categories": ["video_masterclass"]},
    {"step_id": "09-registra-lezioni", "step_number": 12, "code": "F-12", "fase_legacy": "F4", "macro_phase": "valida", "label": "Videolezioni definitive", "owner": "ANDREA", "completion_policy": "all_required_lessons_current_version_approved", "material_categories": ["video_lezioni"]},
    {"step_id": "10-sistema-vendita", "step_number": 13, "code": "F-13", "fase_legacy": "F5", "macro_phase": "valida", "label": "Subaccount, dominio, legal e funnel", "owner": "GAIA", "completion_policy": "sales_system_ready", "material_categories": ["funnel", "legal", "checkout"]},
    {"step_id": "11-calendario-30gg", "step_number": 14, "code": "F-14", "fase_legacy": "F6", "macro_phase": "valida", "label": "Calendario lancio 30gg", "owner": "MARCO", "completion_policy": "launch_calendar_approved", "material_categories": ["calendario_lancio"]},
    {"step_id": "12-prezzo-webinar", "step_number": 15, "code": "F-15", "fase_legacy": "F6", "macro_phase": "valida", "label": "Prezzo + webinar", "owner": "MARCO", "completion_policy": "price_webinar_approved", "material_categories": ["prezzo", "webinar"]},
    {"step_id": "16-readiness-lancio", "step_number": 16, "code": "F-16", "fase_legacy": "F6", "macro_phase": "valida", "label": "Verifica pre-lancio", "owner": "MARCO", "completion_policy": "launch_readiness_verified", "material_categories": ["readiness_lancio"]},
    {"step_id": "13-lancio", "step_number": 17, "code": "F-17", "fase_legacy": "F7", "macro_phase": "valida", "label": "Lancio", "owner": "MARCO", "completion_policy": "launch_verified", "material_categories": ["lancio"]},
    {"step_id": "18-certificato-valida", "step_number": 18, "code": "F-18", "fase_legacy": "F7", "macro_phase": "valida", "label": "Certificato Valida", "owner": "STEFANIA", "completion_policy": "valida_certificate_archived", "material_categories": ["certificato"]},
    {"step_id": "19-workbook-finale", "step_number": 19, "code": "F-19", "fase_legacy": "F7", "macro_phase": "valida", "label": "Workbook finale", "owner": "STEFANIA", "completion_policy": "final_workbook_archived", "material_categories": ["workbook"]},
    {"step_id": "20-ottimizzazione", "step_number": 20, "code": "F-20", "fase_legacy": "LIVE", "macro_phase": "ottimizza", "label": "Ottimizzazione continua", "owner": "MARCO", "completion_policy": "optimization_active", "material_categories": ["metriche", "ottimizzazioni"]},
]
