"""Migrazione conservativa del journey partner al modello canonico F-1..F-20."""
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION


@dataclass(frozen=True)
class MigrationReport:
    partner_id: str
    dry_run: bool
    existing: int
    missing_step_ids: list[str]
    would_create: int
    created: int
    partner_phase: str | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


async def migrate_partner_to_f20(db, partner_id: str, *, dry_run: bool = True) -> MigrationReport:
    """Aggiunge solo i record mancanti; non aggiorna né cancella record storici."""
    existing_docs = await db.partner_journey_steps.find(
        {"partner_id": partner_id}, {"_id": 0, "step_id": 1}
    ).to_list(length=100)
    existing_ids = {doc.get("step_id") for doc in existing_docs}
    missing = [definition for definition in JOURNEY_STEPS_DEFINITION if definition["step_id"] not in existing_ids]
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "phase": 1})

    created = 0
    if not dry_run:
        now = datetime.now(timezone.utc)
        for definition in missing:
            document = {
                "partner_id": partner_id,
                "step_id": definition["step_id"],
                "step_number": definition["step_number"],
                "fase_legacy": definition["fase_legacy"],
                "code": definition["code"],
                "macro_phase": definition["macro_phase"],
                "owner": definition["owner"],
                "completion_policy": definition["completion_policy"],
                "material_categories": definition["material_categories"],
                "status": "pending",
                "started_at": None,
                "completed_at": None,
                "data": {},
                "stefania_briefing_shown": False,
                "stefania_proactive_sent_at": None,
                "updated_at": now,
            }
            result = await db.partner_journey_steps.update_one(
                {"partner_id": partner_id, "step_id": definition["step_id"]},
                {"$setOnInsert": document},
                upsert=True,
            )
            if result.upserted_id is not None:
                created += 1

    return MigrationReport(
        partner_id=partner_id,
        dry_run=dry_run,
        existing=len(existing_docs),
        missing_step_ids=[definition["step_id"] for definition in missing],
        would_create=len(missing),
        created=created,
        partner_phase=(partner or {}).get("phase"),
    )
