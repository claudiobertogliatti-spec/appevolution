"""
Migration: Initialize guided sub-document for existing partners
===============================================================
Run once to seed partner.guided for partners that don't have it yet.

Maps from legacy partner.phase to the new guided state machine.
Safe to run multiple times (idempotent — skips partners that already have guided).

Output:
  - Console table (human-readable)
  - migrations/guided_migration_audit.json (machine-readable, for verification)

Flags set on partner documents:
  - partner.migration_review_required = True
      Set when partner.phase was missing or unrecognized.
      These MUST be reviewed manually before the frontend rollout.
  - partner.guided.migration_review_recommended = True
      Set for any partner at phase F3+, or if fallback was used.
      Advisory — helps manual spot-checking.

Usage:
    python migrations/migrate_guided_state.py [--dry-run]
"""

import asyncio
import json
import sys
import os
from datetime import datetime, timezone

# Allow running from repo root or migrations/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import motor.motor_asyncio
from services.stefania_engine import StefaniaEngine

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.environ.get("DB_NAME", "evolution_pro")

AUDIT_LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guided_migration_audit.json")


async def run(dry_run: bool = False):
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    partners_cursor = db.partners.find({}, {"_id": 0})
    partners = await partners_cursor.to_list(length=None)

    audit_records = []
    counts = {"migrated": 0, "skipped": 0, "errors": 0,
              "fallback": 0, "review_required": 0, "review_recommended": 0}

    print(f"\n{'─'*90}")
    print(f"  Evolution PRO — Guided Migration Audit  {'[DRY RUN]' if dry_run else '[LIVE]'}")
    print(f"  {datetime.now(timezone.utc).isoformat()}")
    print(f"{'─'*90}")
    print(f"  {'STATUS':<8} {'ID':<8} {'NAME':<22} {'PHASE':<6} {'→ STATE':<14} "
          f"{'AGENT':<12} {'PCT':>4}  {'FLAGS'}")
    print(f"{'─'*90}")

    for partner in partners:
        pid  = partner.get("id", "<no-id>")
        name = (partner.get("name") or "<no-name>")[:20]
        phase = partner.get("phase")   # may be None

        # Skip already-migrated partners
        if partner.get("guided"):
            counts["skipped"] += 1
            audit_records.append({
                "partner_id": pid, "name": name,
                "legacy_phase": phase,
                "status": "skipped",
                "reason": "guided already present",
            })
            print(f"  {'SKIP':<8} {str(pid):<8} {name:<22} {str(phase):<6}  already migrated")
            continue

        try:
            guided = StefaniaEngine.evaluate(partner, migration_source="bulk")

            fallback      = guided.get("migration_fallback_used", False)
            review_rec    = guided.get("migration_review_recommended", False)
            lossy         = guided.get("migration_lossy_fields", [])
            mapped_state  = guided.get("current_state", "?")
            current_step  = guided.get("current_step", "?")
            agent         = guided.get("assigned_agent", "?")
            pct           = guided.get("completion_percentage", 0)

            flags = []
            if fallback:
                flags.append("FALLBACK")
                counts["fallback"] += 1
            if review_rec:
                flags.append("REVIEW_RECOMMENDED")
                counts["review_recommended"] += 1

            update_doc: dict = {"guided": guided}
            if fallback:
                update_doc["migration_review_required"] = True
                flags.append("REVIEW_REQUIRED")
                counts["review_required"] += 1

            if not dry_run:
                await db.partners.update_one(
                    {"id": partner["id"]},
                    {"$set": update_doc}
                )

            counts["migrated"] += 1
            status = "DRY" if dry_run else "OK"

            print(
                f"  {status:<8} {str(pid):<8} {name:<22} {str(phase):<6} "
                f"→ {mapped_state:<14} {agent:<12} {pct:>3}%  {', '.join(flags) or '—'}"
            )
            if lossy:
                for lf in lossy:
                    print(f"           ⚠ LOSSY: {lf}")

            audit_records.append({
                "partner_id": pid,
                "name": name,
                "legacy_phase": phase,
                "status": "dry_run" if dry_run else "migrated",
                "migration_source": "bulk",
                "migration_at": guided.get("migration_at"),
                "mapped_state": mapped_state,
                "current_step": current_step,
                "assigned_agent": agent,
                "completion_percentage": pct,
                "migration_fallback_used": fallback,
                "migration_review_recommended": review_rec,
                "migration_review_required": fallback,
                "migration_lossy_fields": lossy,
            })

        except Exception as e:
            counts["errors"] += 1
            print(f"  {'ERROR':<8} {str(pid):<8} {name:<22} {str(phase):<6}  {e}")
            audit_records.append({
                "partner_id": pid, "name": name,
                "legacy_phase": phase, "status": "error", "error": str(e),
            })

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'─'*90}")
    print(f"  SUMMARY")
    print(f"  migrated={counts['migrated']}  skipped={counts['skipped']}  errors={counts['errors']}")
    print(f"  fallback_used={counts['fallback']}  "
          f"review_required={counts['review_required']}  "
          f"review_recommended={counts['review_recommended']}")
    if dry_run:
        print("\n  (DRY RUN — no writes performed)")
    if counts["review_required"] > 0:
        print(f"\n  ⚠  {counts['review_required']} partner(s) flagged migration_review_required.")
        print(f"     Review their legacy phase data before enabling the guided UI.")
    print(f"{'─'*90}\n")

    # ── Write audit log ───────────────────────────────────────────────────────
    if not dry_run:
        audit_output = {
            "run_at": datetime.now(timezone.utc).isoformat(),
            "dry_run": dry_run,
            "summary": counts,
            "records": audit_records,
        }
        with open(AUDIT_LOG_PATH, "w", encoding="utf-8") as f:
            json.dump(audit_output, f, indent=2, ensure_ascii=False)
        print(f"  Audit log written → {AUDIT_LOG_PATH}\n")

    client.close()


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry))
