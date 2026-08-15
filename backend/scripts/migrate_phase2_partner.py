"""CLI fail-closed per una singola migrazione canonica Fase 2."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from services.phase2_migration import (
    MigrationConflict,
    apply_phase2_migration,
    create_phase2_dry_run,
)


_APPLICABLE_STATUSES = {"review_required", "applying", "applied"}


class CliError(RuntimeError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Crea o applica un report Fase 2 per un solo partner."
    )
    parser.add_argument("--partner-id", required=True)
    parser.add_argument(
        "--apply", action="store_true", help="applica un report esistente"
    )
    parser.add_argument("--report-id")
    args = parser.parse_args(argv)
    if args.apply and not args.report_id:
        parser.error("--apply richiede --report-id")
    if args.report_id and not args.apply:
        parser.error("--report-id e valido solo con --apply")
    return args


async def execute(db, args, *, actor_id: str) -> dict:
    partner_id = str(args.partner_id)
    if not args.apply:
        partner = await db.partners.find_one(
            {"id": partner_id}, {"_id": 0, "id": 1}
        )
        if not partner:
            raise CliError("phase2_migration_partner_not_found")
        try:
            report = await create_phase2_dry_run(db, partner_id, str(actor_id))
        except MigrationConflict:
            raise CliError("phase2_migration_conflict") from None
        return {
            "mode": "dry-run",
            "partner_id": report.partner_id,
            "report_id": report.report_id,
            "status": report.status,
            "action_count": len(report.actions),
        }

    report = await db.partner_phase2_migration_reports.find_one(
        {"report_id": str(args.report_id)},
        {"_id": 0, "report_id": 1, "partner_id": 1, "status": 1, "actions": 1},
    )
    if not report:
        raise CliError("phase2_migration_report_not_found")
    if str(report.get("partner_id")) != partner_id:
        raise CliError("phase2_migration_report_partner_mismatch")
    if report.get("status") not in _APPLICABLE_STATUSES:
        raise CliError("phase2_migration_report_not_reviewable")
    try:
        result = await apply_phase2_migration(
            db, str(args.report_id), str(actor_id)
        )
    except MigrationConflict:
        raise CliError("phase2_migration_conflict") from None
    return {
        "mode": "apply",
        "partner_id": result.partner_id,
        "report_id": result.report_id,
        "status": "applied",
        "action_count": len(report.get("actions") or []),
    }


async def _run(argv=None) -> int:
    args = parse_args(argv)
    mongo_url = (
        os.environ.get("MONGO_URL")
        or os.environ.get("MONGODB_URL")
        or os.environ.get("MONGO_ATLAS_URL")
    )
    if not mongo_url:
        print(
            json.dumps({"ok": False, "code": "mongo_url_not_configured"}),
            file=sys.stderr,
        )
        return 2

    try:
        client = AsyncIOMotorClient(mongo_url)
    except Exception:
        print(
            json.dumps({"ok": False, "code": "mongo_connection_failed"}),
            file=sys.stderr,
        )
        return 1
    try:
        database = client[os.environ.get("DB_NAME", "evolution_pro")]
        actor_id = os.environ.get(
            "PHASE2_MIGRATION_ACTOR_ID", "phase2-migration-cli"
        )
        try:
            output = await execute(database, args, actor_id=actor_id)
        except CliError as exc:
            print(json.dumps({"ok": False, "code": exc.code}), file=sys.stderr)
            return 1
        except Exception:
            print(
                json.dumps({"ok": False, "code": "phase2_migration_failed"}),
                file=sys.stderr,
            )
            return 1
        print(json.dumps({"ok": True, **output}, sort_keys=True))
        return 0
    finally:
        client.close()


def main(argv=None) -> int:
    return asyncio.run(_run(argv))


if __name__ == "__main__":
    raise SystemExit(main())
