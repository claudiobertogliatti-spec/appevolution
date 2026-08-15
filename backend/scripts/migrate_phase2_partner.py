"""CLI fail-closed per una singola migrazione canonica Fase 2."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

_APPLICABLE_STATUSES = {"review_required", "applying", "applied"}


class _UnloadedMigrationConflict(RuntimeError):
    pass


AsyncIOMotorClient = None
MigrationConflict = _UnloadedMigrationConflict
MigrationRecoveryNotAllowed = _UnloadedMigrationConflict
apply_phase2_migration = None
create_phase2_dry_run = None
recover_phase2_migration = None
sanitize_phase2_migration_action = None


def _load_dependencies() -> None:
    global AsyncIOMotorClient
    global MigrationConflict
    global MigrationRecoveryNotAllowed
    global apply_phase2_migration
    global create_phase2_dry_run
    global recover_phase2_migration
    global sanitize_phase2_migration_action

    if AsyncIOMotorClient is None:
        from motor.motor_asyncio import AsyncIOMotorClient as motor_client

        AsyncIOMotorClient = motor_client
    if (
        apply_phase2_migration is None
        or create_phase2_dry_run is None
        or recover_phase2_migration is None
        or sanitize_phase2_migration_action is None
        or MigrationConflict is _UnloadedMigrationConflict
        or MigrationRecoveryNotAllowed is _UnloadedMigrationConflict
    ):
        from services.phase2_migration import (
            MigrationConflict as migration_conflict,
            MigrationRecoveryNotAllowed as recovery_not_allowed,
            apply_phase2_migration as apply_migration,
            create_phase2_dry_run as create_dry_run,
            recover_phase2_migration as recover_migration,
            sanitize_phase2_migration_action as sanitize_action,
        )

        MigrationConflict = migration_conflict
        MigrationRecoveryNotAllowed = recovery_not_allowed
        apply_phase2_migration = apply_migration
        create_phase2_dry_run = create_dry_run
        recover_phase2_migration = recover_migration
        sanitize_phase2_migration_action = sanitize_action


class CliError(RuntimeError):
    def __init__(
        self,
        code: str,
        *,
        error_code: str | None = None,
        recovery_action: str | None = None,
    ):
        super().__init__(code)
        self.code = code
        self.error_code = error_code
        self.recovery_action = recovery_action

    def to_dict(self) -> dict[str, str | bool]:
        payload: dict[str, str | bool] = {"ok": False, "code": self.code}
        if self.error_code:
            payload["error_code"] = self.error_code
        if self.recovery_action:
            payload["recovery_action"] = self.recovery_action
        return payload


class CliArgumentError(RuntimeError):
    code = "phase2_migration_invalid_arguments"


class JsonBoundaryArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise CliArgumentError(self.prog) from None


def parse_args(argv=None):
    arguments = list(sys.argv[1:] if argv is None else argv)
    help_flags = [argument for argument in arguments if argument in ("-h", "--help")]
    if help_flags and len(arguments) != 1:
        raise CliArgumentError("help_must_be_standalone")
    parser = JsonBoundaryArgumentParser(
        description="Crea, applica o recupera un report Fase 2 per un solo partner."
    )
    parser.add_argument("--partner-id", required=True)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--apply", action="store_true", help="applica un report esistente"
    )
    mode.add_argument(
        "--recover",
        action="store_true",
        help="riprova esplicitamente un singolo report in conflitto recuperabile",
    )
    parser.add_argument("--report-id")
    args = parser.parse_args(arguments)
    if (args.apply or args.recover) and not args.report_id:
        parser.error("--apply/--recover richiede --report-id")
    if args.report_id and not (args.apply or args.recover):
        parser.error("--report-id e valido solo con --apply/--recover")
    return args


async def execute(db, args, *, actor_id: str) -> dict:
    partner_id = str(args.partner_id)
    if not args.apply and not args.recover:
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
            "actions": [
                sanitize_phase2_migration_action(action)
                for action in report.actions
            ],
        }

    report = await db.partner_phase2_migration_reports.find_one(
        {"report_id": str(args.report_id)},
        {"_id": 0, "report_id": 1, "partner_id": 1, "status": 1, "actions": 1},
    )
    if not report:
        raise CliError("phase2_migration_report_not_found")
    if str(report.get("partner_id")) != partner_id:
        raise CliError("phase2_migration_report_partner_mismatch")
    if not str(actor_id).strip():
        raise CliError("phase2_migration_actor_not_configured")
    if args.recover:
        try:
            result = await recover_phase2_migration(
                db, str(args.report_id), str(actor_id)
            )
        except MigrationRecoveryNotAllowed as exc:
            raise CliError(
                "phase2_migration_conflict_not_recoverable",
                error_code=exc.error_code,
                recovery_action=exc.recovery_action,
            ) from None
        except MigrationConflict:
            raise CliError("phase2_migration_conflict") from None
        mode_name = "recover"
    else:
        if report.get("status") not in _APPLICABLE_STATUSES:
            raise CliError("phase2_migration_report_not_reviewable")
        try:
            result = await apply_phase2_migration(
                db, str(args.report_id), str(actor_id)
            )
        except MigrationConflict:
            raise CliError("phase2_migration_conflict") from None
        mode_name = "apply"
    return {
        "mode": mode_name,
        "partner_id": result.partner_id,
        "report_id": result.report_id,
        "status": "applied",
        "action_count": len(report.get("actions") or []),
    }


async def _run(argv=None) -> int:
    try:
        args = parse_args(argv)
    except CliArgumentError as exc:
        print(
            json.dumps({"ok": False, "code": exc.code}),
            file=sys.stderr,
        )
        return 2
    try:
        _load_dependencies()
    except ImportError:
        print(
            json.dumps(
                {"ok": False, "code": "phase2_migration_dependency_unavailable"}
            ),
            file=sys.stderr,
        )
        return 1
    actor_id = (os.environ.get("PHASE2_MIGRATION_ACTOR_ID") or "").strip()
    if (args.apply or args.recover) and not actor_id:
        print(
            json.dumps({
                "ok": False,
                "code": "phase2_migration_actor_not_configured",
            }),
            file=sys.stderr,
        )
        return 2
    if not actor_id:
        actor_id = "phase2-migration-cli-dry-run"

    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URL")
    database_name = os.environ.get("DB_NAME", "evolution_pro")
    if not mongo_url or "customer-apps" in mongo_url:
        atlas_fallback = os.environ.get("MONGO_ATLAS_URL")
        if atlas_fallback:
            mongo_url = atlas_fallback
            database_name = "evolution_pro"
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
        database = client[database_name]
        try:
            output = await execute(database, args, actor_id=actor_id)
        except CliError as exc:
            print(json.dumps(exc.to_dict()), file=sys.stderr)
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
