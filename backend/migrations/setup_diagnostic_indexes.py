"""
Migration: Setup indexes for `diagnostic_sessions` collection.
=============================================================
Crea gli indici Mongo per la collection diagnostic_sessions di Ciak.
Idempotente: createIndex su indici esistenti è no-op.

Indici creati:
  - lead_id (ricerca per identificatore lead persistente)
  - session_token (UNIQUE — primary lookup endpoint)
  - user_email (lookup per webhook Cal.com / Stripe orphan)
  - current_state (filtri admin per stato funnel)
  - scoring.stato_finale (filtri admin per qualità lead)
  - created_at -1 (ordinamento recente / dashboard)
  - crm_tags (multikey — ricerca per tag CRM, es. "stato_4")
  - tracking.utm_source + scoring.stato_finale (compound — analytics ROI per canale)
  - tracking.utm_campaign (analytics campaign)

Usage:
    python migrations/setup_diagnostic_indexes.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Aggiungi parent dir al path per import dependencies
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient


async def setup_indexes() -> None:
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "evolution_pro")

    if not mongo_url:
        raise RuntimeError("MONGO_URL non configurato")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    coll = db.diagnostic_sessions

    indexes = [
        # Single-field indexes
        ("lead_id", {}),
        ("session_token", {"unique": True}),
        ("user_email", {}),
        ("current_state", {}),
        ("scoring.stato_finale", {}),
        ("created_at", {}),  # sort -1 lo gestisce la query
        # Multikey index per ricerca tag
        ("crm_tags", {}),
        # Campaign analytics
        ("tracking.utm_campaign", {}),
    ]

    # Compound index: utm_source × stato finale (per ROI per canale)
    compound_indexes = [
        (
            [("tracking.utm_source", 1), ("scoring.stato_finale", 1)],
            {},
        ),
    ]

    print(f"Setup indexes su {db_name}.diagnostic_sessions ...")

    for field, opts in indexes:
        idx_name = await coll.create_index(field, **opts)
        unique_marker = " (unique)" if opts.get("unique") else ""
        print(f"  ✓ {idx_name}{unique_marker}")

    for fields, opts in compound_indexes:
        idx_name = await coll.create_index(fields, **opts)
        print(f"  ✓ {idx_name} (compound)")

    # Setup index su orphan purchases (email + created_at)
    orphan_coll = db.ciak_orphan_purchases
    orphan_idx = await orphan_coll.create_index("customer_email")
    print(f"  ✓ ciak_orphan_purchases: {orphan_idx}")

    print("\nDone. Indexes pronti.")
    client.close()


if __name__ == "__main__":
    asyncio.run(setup_indexes())
