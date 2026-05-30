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
    step_number: int  # 1..13
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
    {"id": "esamina",   "label": "Esamina",   "tagline": "Chiariamo chi sei e a chi parli",      "icon": "🎯", "agent": "VALENTINA", "step_ids": ["01-contratto", "02-discovery-video", "burocrazia", "03-brand-kit", "04-posizionamento"]},
    {"id": "valida",    "label": "Valida",    "tagline": "Andiamo online e testiamo il mercato", "icon": "🚀", "agent": "ANDREA",    "step_ids": ["05-script-masterclass", "06-outline-lezioni", "07-registra-masterclass", "08-registra-lezioni", "09-funnel-asset", "10-funnel-team-work", "11-calendario-30gg", "12-prezzo-webinar", "13-lancio"]},
    {"id": "ottimizza", "label": "Ottimizza", "tagline": "Miglioriamo su dati reali",            "icon": "📈", "agent": "MARCO",     "step_ids": []},  # post-lancio, gestita da OperativoContinuo
]

# "Avvio" deprecato: contratto e discovery sono ora dentro la fase Esamina.
# Mantenuto vuoto per compatibilità con get_operativo_state (niente chip Avvio).
AVVIO_STEP_IDS: list[str] = []

# Mapping reverse step_id -> macro_phase_id
_MACRO_BY_STEP = {sid: mp["id"] for mp in MACRO_PHASES_DEFINITION for sid in mp["step_ids"]}


# Definizione canonica dei 14 step. Usata da seed_partner_journey e dalle UI.
# Gli slug mantengono il prefisso numerico storico (stabile per il registry frontend);
# l'ordine reale è dato da step_number. "burocrazia" è lo step nuovo inserito al n.3.
JOURNEY_STEPS_DEFINITION: list[dict[str, Any]] = [
    {"step_id": "01-contratto",           "step_number": 1,  "fase_legacy": "F1", "macro_phase": "esamina",   "label": "Contratto + distinta"},
    {"step_id": "02-discovery-video",     "step_number": 2,  "fase_legacy": "F1", "macro_phase": "esamina",   "label": "Benvenuto"},
    {"step_id": "burocrazia",             "step_number": 3,  "fase_legacy": "F1", "macro_phase": "esamina",   "label": "I tuoi dati"},
    {"step_id": "03-brand-kit",           "step_number": 4,  "fase_legacy": "F2", "macro_phase": "esamina",   "label": "Brand kit"},
    {"step_id": "04-posizionamento",      "step_number": 5,  "fase_legacy": "F2", "macro_phase": "esamina",   "label": "Posizionamento"},
    {"step_id": "05-script-masterclass",  "step_number": 6,  "fase_legacy": "F3", "macro_phase": "valida",    "label": "Script masterclass"},
    {"step_id": "06-outline-lezioni",     "step_number": 7,  "fase_legacy": "F3", "macro_phase": "valida",    "label": "Outline lezioni"},
    {"step_id": "07-registra-masterclass","step_number": 8,  "fase_legacy": "F4", "macro_phase": "valida",    "label": "Registra masterclass"},
    {"step_id": "08-registra-lezioni",    "step_number": 9,  "fase_legacy": "F4", "macro_phase": "valida",    "label": "Registra lezioni"},
    {"step_id": "09-funnel-asset",        "step_number": 10, "fase_legacy": "F5", "macro_phase": "valida",    "label": "Funnel asset"},
    {"step_id": "10-funnel-team-work",    "step_number": 11, "fase_legacy": "F5", "macro_phase": "valida",    "label": "Team costruisce funnel"},
    {"step_id": "11-calendario-30gg",     "step_number": 12, "fase_legacy": "F6", "macro_phase": "valida",    "label": "Calendario 30gg"},
    {"step_id": "12-prezzo-webinar",      "step_number": 13, "fase_legacy": "F6", "macro_phase": "valida",    "label": "Prezzo + webinar"},
    {"step_id": "13-lancio",              "step_number": 14, "fase_legacy": "F7", "macro_phase": "valida",    "label": "Lancio"},
]
