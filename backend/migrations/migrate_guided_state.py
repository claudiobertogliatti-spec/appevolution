"""
Migration: Initialize guided sub-document for existing partners
===============================================================
Run once to seed partner.guided for partners that don't have it yet.

Maps from legacy partner.phase to the new guided state machine.
Safe to run multiple times (idempotent — skips partners that already have guided).

Usage:
    python migrations/migrate_guided_state.py [--dry-run]
"""

import asyncio
import sys
import os

# Allow running from repo root or migrations/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import motor.motor_asyncio
from services.stefania_engine import StefaniaEngine

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.environ.get("DB_NAME", "evolution_pro")


async def run(dry_run: bool = False):
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    partners_cursor = db.partners.find({}, {"_id": 0})
    partners = await partners_cursor.to_list(length=None)

    migrated = 0
    skipped  = 0
    errors   = 0

    for partner in partners:
        pid = partner.get("id", "<no-id>")
        name = partner.get("name", "<no-name>")

        if partner.get("guided"):
            skipped += 1
            print(f"  SKIP   {pid} ({name}) — guided already present")
            continue

        try:
            guided = StefaniaEngine.evaluate(partner)

            if not dry_run:
                await db.partners.update_one(
                    {"id": partner["id"]},
                    {"$set": {"guided": guided}}
                )

            migrated += 1
            print(
                f"  {'DRY'if dry_run else 'OK'}    {pid} ({name}) "
                f"→ state={guided['current_state']} step={guided['current_step']} "
                f"agent={guided['assigned_agent']} {guided['completion_percentage']:.0f}%"
            )

        except Exception as e:
            errors += 1
            print(f"  ERROR  {pid} ({name}) — {e}")

    print()
    print(f"Done. migrated={migrated}  skipped={skipped}  errors={errors}")
    if dry_run:
        print("(DRY RUN — no writes performed)")

    client.close()


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry))
