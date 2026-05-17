"""
Servizio per seedare i 13 step iniziali per un partner che entra
per la prima volta nell'Operativo Stefania.

Idempotente: re-run non duplica record (check su partner_id + step_id).
"""
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.partner_journey_step import (
    JOURNEY_STEPS_DEFINITION,
    JourneyStepStatus,
)


async def seed_partner_journey(
    db: AsyncIOMotorDatabase,
    partner_id: str,
    start_step_number: int = 1,
) -> int:
    """Seeda i 13 step per un partner. Marca come done gli step < start_step_number,
    in_progress lo step start_step_number, pending il resto.

    Ritorna il numero di step creati (0 se erano già tutti seedati).
    """
    existing = await db.partner_journey_steps.count_documents({"partner_id": partner_id})
    if existing >= len(JOURNEY_STEPS_DEFINITION):
        return 0

    now = datetime.utcnow()
    created = 0
    for definition in JOURNEY_STEPS_DEFINITION:
        already = await db.partner_journey_steps.find_one(
            {"partner_id": partner_id, "step_id": definition["step_id"]}
        )
        if already:
            continue

        if definition["step_number"] < start_step_number:
            status = JourneyStepStatus.DONE
            started_at = now
            completed_at = now
        elif definition["step_number"] == start_step_number:
            status = JourneyStepStatus.IN_PROGRESS
            started_at = now
            completed_at = None
        else:
            status = JourneyStepStatus.PENDING
            started_at = None
            completed_at = None

        await db.partner_journey_steps.insert_one({
            "partner_id": partner_id,
            "step_id": definition["step_id"],
            "step_number": definition["step_number"],
            "fase_legacy": definition["fase_legacy"],
            "status": status.value,
            "started_at": started_at,
            "completed_at": completed_at,
            "data": {},
            "stefania_briefing_shown": False,
            "stefania_proactive_sent_at": None,
            "updated_at": now,
        })
        created += 1

    # Aggiorna anche partners.journey_current_step per accesso rapido
    current_step_id = next(
        (d["step_id"] for d in JOURNEY_STEPS_DEFINITION if d["step_number"] == start_step_number),
        None,
    )
    if current_step_id:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"journey_current_step": current_step_id}},
        )

    return created
