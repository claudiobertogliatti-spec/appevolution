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


# Raggruppamento in 5 macro-fasi per ridurre l'ansia da "13 step".
# Il partner vede "Sei in FONDAMENTA, 2 di 2" invece di "Step 4/13".
MACRO_PHASES_DEFINITION: list[dict[str, Any]] = [
    {"id": "attivazione",     "label": "Attivazione",     "tagline": "Mettiamo le carte a posto",          "icon": "📋", "step_ids": ["01-contratto", "02-discovery-video"]},
    {"id": "fondamenta",      "label": "Fondamenta",      "tagline": "Definiamo chi sei e a chi parli",    "icon": "🧱", "step_ids": ["03-brand-kit", "04-posizionamento"]},
    {"id": "contenuti",       "label": "Contenuti",       "tagline": "Costruiamo masterclass e corso",     "icon": "🎬", "step_ids": ["05-script-masterclass", "06-outline-lezioni", "07-registra-masterclass", "08-registra-lezioni"]},
    {"id": "sistema-vendita", "label": "Sistema vendita", "tagline": "Mettiamo in piedi il funnel",        "icon": "🛒", "step_ids": ["09-funnel-asset", "10-funnel-team-work"]},
    {"id": "lancio",          "label": "Lancio",          "tagline": "Andiamo live e portiamo clienti",    "icon": "🚀", "step_ids": ["11-calendario-30gg", "12-prezzo-webinar", "13-lancio"]},
]

# Mapping reverse step_id -> macro_phase_id
_MACRO_BY_STEP = {sid: mp["id"] for mp in MACRO_PHASES_DEFINITION for sid in mp["step_ids"]}


# Definizione canonica dei 13 step. Usata da seed_partner_journey e dalle UI.
JOURNEY_STEPS_DEFINITION: list[dict[str, Any]] = [
    {"step_id": "01-contratto",           "step_number": 1,  "fase_legacy": "F1", "macro_phase": "attivazione",     "label": "Contratto + distinta"},
    {"step_id": "02-discovery-video",     "step_number": 2,  "fase_legacy": "F1", "macro_phase": "attivazione",     "label": "Discovery video"},
    {"step_id": "03-brand-kit",           "step_number": 3,  "fase_legacy": "F2", "macro_phase": "fondamenta",      "label": "Brand kit"},
    {"step_id": "04-posizionamento",      "step_number": 4,  "fase_legacy": "F2", "macro_phase": "fondamenta",      "label": "Posizionamento"},
    {"step_id": "05-script-masterclass",  "step_number": 5,  "fase_legacy": "F3", "macro_phase": "contenuti",       "label": "Script masterclass"},
    {"step_id": "06-outline-lezioni",     "step_number": 6,  "fase_legacy": "F3", "macro_phase": "contenuti",       "label": "Outline lezioni"},
    {"step_id": "07-registra-masterclass","step_number": 7,  "fase_legacy": "F4", "macro_phase": "contenuti",       "label": "Registra masterclass"},
    {"step_id": "08-registra-lezioni",    "step_number": 8,  "fase_legacy": "F4", "macro_phase": "contenuti",       "label": "Registra lezioni"},
    {"step_id": "09-funnel-asset",        "step_number": 9,  "fase_legacy": "F5", "macro_phase": "sistema-vendita", "label": "Funnel asset"},
    {"step_id": "10-funnel-team-work",    "step_number": 10, "fase_legacy": "F5", "macro_phase": "sistema-vendita", "label": "Team costruisce funnel"},
    {"step_id": "11-calendario-30gg",     "step_number": 11, "fase_legacy": "F6", "macro_phase": "lancio",          "label": "Calendario 30gg"},
    {"step_id": "12-prezzo-webinar",      "step_number": 12, "fase_legacy": "F6", "macro_phase": "lancio",          "label": "Prezzo + webinar"},
    {"step_id": "13-lancio",              "step_number": 13, "fase_legacy": "F7", "macro_phase": "lancio",          "label": "Lancio"},
]
