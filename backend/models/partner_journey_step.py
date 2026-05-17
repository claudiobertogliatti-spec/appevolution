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


# Definizione canonica dei 13 step. Usata da seed_partner_journey e dalle UI.
JOURNEY_STEPS_DEFINITION: list[dict[str, Any]] = [
    {"step_id": "01-contratto",           "step_number": 1,  "fase_legacy": "F1", "label": "Contratto + distinta"},
    {"step_id": "02-discovery-video",     "step_number": 2,  "fase_legacy": "F1", "label": "Discovery video"},
    {"step_id": "03-brand-kit",           "step_number": 3,  "fase_legacy": "F2", "label": "Brand kit"},
    {"step_id": "04-posizionamento",      "step_number": 4,  "fase_legacy": "F2", "label": "Posizionamento"},
    {"step_id": "05-script-masterclass",  "step_number": 5,  "fase_legacy": "F3", "label": "Script masterclass"},
    {"step_id": "06-outline-lezioni",     "step_number": 6,  "fase_legacy": "F3", "label": "Outline lezioni"},
    {"step_id": "07-registra-masterclass","step_number": 7,  "fase_legacy": "F4", "label": "Registra masterclass"},
    {"step_id": "08-registra-lezioni",    "step_number": 8,  "fase_legacy": "F4", "label": "Registra lezioni"},
    {"step_id": "09-funnel-asset",        "step_number": 9,  "fase_legacy": "F5", "label": "Funnel asset"},
    {"step_id": "10-funnel-team-work",    "step_number": 10, "fase_legacy": "F5", "label": "Team costruisce funnel"},
    {"step_id": "11-calendario-30gg",     "step_number": 11, "fase_legacy": "F6", "label": "Calendario 30gg"},
    {"step_id": "12-prezzo-webinar",      "step_number": 12, "fase_legacy": "F6", "label": "Prezzo + webinar"},
    {"step_id": "13-lancio",              "step_number": 13, "fase_legacy": "F7", "label": "Lancio"},
]
