"""
Servizio per seedare gli step iniziali per un partner che entra
per la prima volta nell'Operativo Stefania.

Idempotente: re-run non duplica record (check su partner_id + step_id).

Consapevole del livello (`tier`): un cliente Ciak Start riceve la journey
ridotta, un partner i 20 step canonici F-1..F-20. Il check per
`partner_id + step_id` e' cio' che rende l'upgrade ADDITIVO: chi arriva da
Start riceve gli step che gli mancano e non perde quelli che ha gia' compilato.
"""
from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.partner_journey_step import JourneyStepStatus
from models.start_journey import journey_definition_for_tier


async def seed_partner_journey(
    db: AsyncIOMotorDatabase,
    partner_id: str,
    start_step_number: float = 1,
    tier: Optional[Any] = None,
) -> int:
    """Seeda gli step del livello per un partner. Marca come done gli step
    < start_step_number, in_progress lo step start_step_number, pending il resto.

    `tier=None` (default) = journey canonica: e' il comportamento storico e vale
    per i 26 partner in produzione, che il campo `tier` non ce l'hanno.

    Ritorna il numero di step creati (0 se erano già tutti seedati).
    """
    definitions = journey_definition_for_tier(tier)

    existing = await db.partner_journey_steps.count_documents({"partner_id": partner_id})
    if existing >= len(definitions):
        return 0

    now = datetime.utcnow()
    created = 0
    for definition in definitions:
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
            "code": definition["code"],
            "macro_phase": definition["macro_phase"],
            "owner": definition["owner"],
            "completion_policy": definition["completion_policy"],
            "material_categories": definition["material_categories"],
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
        (d["step_id"] for d in definitions if d["step_number"] == start_step_number),
        None,
    )
    if current_step_id:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"journey_current_step": current_step_id}},
        )

    return created
