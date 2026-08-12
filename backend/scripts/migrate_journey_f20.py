"""CLI sicura per aggiungere gli step mancanti del journey F-1..F-20."""
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from services.journey_f20_migration import migrate_partner_to_f20


def parse_args():
    parser = argparse.ArgumentParser()
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--partner-id")
    target.add_argument("--all", action="store_true")
    parser.add_argument("--apply", action="store_true", help="esegue le scritture; default dry-run")
    parser.add_argument("--confirm-all", action="store_true", help="conferma esplicita richiesta con --all --apply")
    args = parser.parse_args()
    if args.all and args.apply and not args.confirm_all:
        parser.error("--all --apply richiede --confirm-all")
    return args


async def run():
    args = parse_args()
    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URL") or os.environ.get("MONGO_ATLAS_URL")
    if not mongo_url:
        raise SystemExit("MONGO_URL/MONGODB_URL/MONGO_ATLAS_URL non configurato")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get("DB_NAME", "evolution_pro")]
    try:
        if args.all:
            partners = await db.partners.find({}, {"_id": 0, "id": 1}).to_list(length=5000)
            partner_ids = [partner["id"] for partner in partners if partner.get("id")]
        else:
            partner_ids = [args.partner_id]
        reports = [
            (await migrate_partner_to_f20(db, partner_id, dry_run=not args.apply)).to_dict()
            for partner_id in partner_ids
        ]
        print(json.dumps({"mode": "apply" if args.apply else "dry-run", "reports": reports}, default=str, indent=2))
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(run())
