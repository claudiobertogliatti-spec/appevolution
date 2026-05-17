"""
Migrazione one-shot: seedare partner_journey_steps per i partner attivi
mappando da partners.phase (F1-F7+) al numero di step iniziale.

Idempotente: re-run safe (skip se già seedato).

Run:
    cd backend
    python -m scripts.seed_partner_journey_v1

Variabili ambiente richieste:
    MONGO_URL (o MONGODB_URI)
    DB_NAME (default: evolution_pro)
"""
import asyncio
import os
import sys
from pathlib import Path

# Permetti import dal parent dir quando lanciato come modulo
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from services.journey_seed import seed_partner_journey


# Mapping conservativo phase -> step number iniziale per partner non lanciati.
# I numeri sono conservativi: il partner può sempre riaprire step già done
# se vede che ha buchi.
PHASE_TO_START_STEP = {
    "F1": 2,   # ha pagato, in onboarding
    "F2": 4,   # posizionamento done
    "F3": 6,   # masterclass scriptata
    "F4": 8,   # registrazioni done
}


async def main():
    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
    db_name = os.environ.get("DB_NAME", "evolution_pro")
    if not mongo_url:
        print("ERROR: MONGO_URL or MONGODB_URI not set", file=sys.stderr)
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    partners = await db.partners.find({"active": True}).to_list(length=200)
    print(f"Found {len(partners)} active partners")

    seeded_count = 0
    skipped_count = 0
    for p in partners:
        partner_id = p.get("id")
        phase = p.get("phase", "F1")

        # F5+ = già lanciato -> tutti done. start_step = 14 (oltre l'ultimo).
        if phase and phase >= "F5":
            start_step = 14
        else:
            start_step = PHASE_TO_START_STEP.get(phase, 1)

        created = await seed_partner_journey(db, partner_id, start_step_number=start_step)
        if created > 0:
            seeded_count += 1
            print(f"  + {partner_id} ({p.get('name', 'no-name')}): {created} step seedati, "
                  f"start={start_step} (phase={phase})")
        else:
            skipped_count += 1

        # Per partner F5+ aggiorna anche journey_current_step a 'completato'
        if phase and phase >= "F5":
            await db.partners.update_one(
                {"id": partner_id},
                {"$set": {"journey_current_step": "completato"}},
            )

    print(f"\nDone. Seedati: {seeded_count}, skip (già esistenti): {skipped_count}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
