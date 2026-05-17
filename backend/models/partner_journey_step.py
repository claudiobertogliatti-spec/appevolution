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


# Macro-fasi del brand Evolution PRO (le stesse di www.evolution-pro.it).
# Step 1-2 (contratto + discovery) sono "Avvio" silenzioso fuori dalla bar
# perché sono attivazione amministrativa, non parte del percorso strategico.
# La macro "ottimizzazione-servizio" è post-lancio (subentra a OperativoContinuo).
MACRO_PHASES_DEFINITION: list[dict[str, Any]] = [
    {"id": "posizionamento",         "label": "Posizionamento",         "tagline": "Definiamo chi sei e a chi parli",         "icon": "🎯", "step_ids": ["03-brand-kit", "04-posizionamento"]},
    {"id": "creazione-accademia",    "label": "Creazione accademia",    "tagline": "Costruiamo masterclass e corso",          "icon": "🎓", "step_ids": ["05-script-masterclass", "06-outline-lezioni", "07-registra-masterclass", "08-registra-lezioni"]},
    {"id": "costruzione-funnel",     "label": "Costruzione funnel",     "tagline": "Mettiamo in piedi il sistema di vendita", "icon": "🔧", "step_ids": ["09-funnel-asset", "10-funnel-team-work"]},
    {"id": "lancio",                 "label": "Lancio",                 "tagline": "Andiamo live",                            "icon": "🚀", "step_ids": ["11-calendario-30gg", "12-prezzo-webinar", "13-lancio"]},
    {"id": "ottimizzazione-servizio","label": "Ottimizzazione servizio","tagline": "Trasformiamo l'idea in vendite",          "icon": "📈", "step_ids": []},  # post-lancio, gestita da OperativoContinuo
]

# Step "Avvio" — attivazione amministrativa pre-percorso (non in macro-fasi strategiche).
AVVIO_STEP_IDS: list[str] = ["01-contratto", "02-discovery-video"]

# Mapping reverse step_id -> macro_phase_id
_MACRO_BY_STEP = {sid: mp["id"] for mp in MACRO_PHASES_DEFINITION for sid in mp["step_ids"]}


# Definizione canonica dei 13 step. Usata da seed_partner_journey e dalle UI.
# macro_phase = "avvio" per step 1-2 (pre-percorso amministrativo).
JOURNEY_STEPS_DEFINITION: list[dict[str, Any]] = [
    {"step_id": "01-contratto",           "step_number": 1,  "fase_legacy": "F1", "macro_phase": "avvio",                "label": "Contratto + distinta"},
    {"step_id": "02-discovery-video",     "step_number": 2,  "fase_legacy": "F1", "macro_phase": "avvio",                "label": "Discovery video"},
    {"step_id": "03-brand-kit",           "step_number": 3,  "fase_legacy": "F2", "macro_phase": "posizionamento",       "label": "Brand kit"},
    {"step_id": "04-posizionamento",      "step_number": 4,  "fase_legacy": "F2", "macro_phase": "posizionamento",       "label": "Posizionamento"},
    {"step_id": "05-script-masterclass",  "step_number": 5,  "fase_legacy": "F3", "macro_phase": "creazione-accademia",  "label": "Script masterclass"},
    {"step_id": "06-outline-lezioni",     "step_number": 6,  "fase_legacy": "F3", "macro_phase": "creazione-accademia",  "label": "Outline lezioni"},
    {"step_id": "07-registra-masterclass","step_number": 7,  "fase_legacy": "F4", "macro_phase": "creazione-accademia",  "label": "Registra masterclass"},
    {"step_id": "08-registra-lezioni",    "step_number": 8,  "fase_legacy": "F4", "macro_phase": "creazione-accademia",  "label": "Registra lezioni"},
    {"step_id": "09-funnel-asset",        "step_number": 9,  "fase_legacy": "F5", "macro_phase": "costruzione-funnel",   "label": "Funnel asset"},
    {"step_id": "10-funnel-team-work",    "step_number": 10, "fase_legacy": "F5", "macro_phase": "costruzione-funnel",   "label": "Team costruisce funnel"},
    {"step_id": "11-calendario-30gg",     "step_number": 11, "fase_legacy": "F6", "macro_phase": "lancio",               "label": "Calendario 30gg"},
    {"step_id": "12-prezzo-webinar",      "step_number": 12, "fase_legacy": "F6", "macro_phase": "lancio",               "label": "Prezzo + webinar"},
    {"step_id": "13-lancio",              "step_number": 13, "fase_legacy": "F7", "macro_phase": "lancio",               "label": "Lancio"},
]
