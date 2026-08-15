"""Contratti admin HTTP e CLI per la migrazione canonica Fase 2."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "phase2-migration-api-test-secret")
os.environ.setdefault("MONGO_URL", "mongodb://phase2-migration-api-test.invalid:27017")

from routers import phase2_migration
from scripts import migrate_phase2_partner
from services.phase2_migration import MigrationConflict


pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = deepcopy(documents or [])

    async def find_one(self, query, projection=None):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                result = deepcopy(document)
                if projection and projection.get("_id") == 0:
                    result.pop("_id", None)
                return result
        return None


class FakeDb:
    def __init__(self, *, partners=None, reports=None):
        self.partners = FakeCollection(partners)
        self.partner_phase2_migration_reports = FakeCollection(reports)


@pytest.fixture
def admin_auth(monkeypatch):
    import auth

    identities = {
        "admin-token": SimpleNamespace(user_id="admin-1", role="admin"),
        "superadmin-token": SimpleNamespace(user_id="superadmin-1", role="superadmin"),
        "partner-token": SimpleNamespace(user_id="partner-user", role="partner"),
    }
    monkeypatch.setattr(auth, "decode_token", identities.get)
    return {
        "admin": {"Authorization": "Bearer admin-token"},
        "superadmin": {"Authorization": "Bearer superadmin-token"},
        "partner": {"Authorization": "Bearer partner-token"},
    }


@pytest.fixture
def fake_db(monkeypatch):
    report = {
        "report_id": "report-1",
        "partner_id": "23",
        "actor_id": "admin-original",
        "status": "review_required",
        "source_checksum": "a" * 64,
        "actions": [
            {
                "action_id": "action-1",
                "kind": "reopen_step",
                "step_id": "05-script-masterclass",
                "reason": "output_not_current",
                "before": {"material_body": "PRIVATE RAW SCRIPT"},
                "after": {"status": "in_progress"},
            }
        ],
        "expected_steps": {"05-script-masterclass": {"status": "done"}},
        "snapshot": {"masterclass_factory": [{"raw": "PRIVATE RAW VIDEO"}]},
        "created_at": datetime(2026, 8, 15, 9, 30, tzinfo=timezone.utc),
    }
    database = FakeDb(partners=[{"id": "23"}], reports=[report])
    phase2_migration.set_db(database)
    return database


@pytest.fixture
def client(fake_db):
    app = FastAPI()
    app.include_router(phase2_migration.router)
    with TestClient(app) as test_client:
        yield test_client


def test_anonymous_dry_run_is_401(client):
    response = client.post("/api/admin/phase2-migrations/23/dry-run")

    assert response.status_code == 401


def test_partner_cannot_create_or_apply_migration(client, admin_auth):
    dry_run = client.post(
        "/api/admin/phase2-migrations/23/dry-run",
        headers=admin_auth["partner"],
    )
    apply = client.post(
        "/api/admin/phase2-migrations/reports/report-1/apply",
        headers=admin_auth["partner"],
    )

    assert dry_run.status_code == 403
    assert apply.status_code == 403


def test_apply_requires_existing_report(client, admin_auth):
    response = client.post(
        "/api/admin/phase2-migrations/reports/missing/apply",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "phase2_migration_report_not_found"


def test_dry_run_requires_existing_partner(client, admin_auth):
    response = client.post(
        "/api/admin/phase2-migrations/missing/dry-run",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "phase2_migration_partner_not_found"


def test_admin_dry_run_returns_only_sanitized_report_summary(
    client, admin_auth, monkeypatch
):
    async def create_report(_db, partner_id, actor_id):
        assert partner_id == "23"
        assert actor_id == "admin-1"
        return SimpleNamespace(
            to_dict=lambda: {
                "report_id": "new-report",
                "partner_id": "23",
                "actor_id": actor_id,
                "status": "review_required",
                "source_checksum": "b" * 64,
                "actions": [
                    {
                        "action_id": "action-2",
                        "kind": "archive_legacy",
                        "step_id": "05-script-masterclass",
                        "reason": "historical_output_requires_current_approval",
                        "before": {"material_body": "PRIVATE RAW SCRIPT"},
                    }
                ],
                "expected_steps": {"05-script-masterclass": {"raw": "PRIVATE"}},
                "created_at": "2026-08-15T09:30:00Z",
                "snapshot": {"raw": "PRIVATE RAW VIDEO"},
            }
        )

    monkeypatch.setattr(phase2_migration, "create_phase2_dry_run", create_report)

    response = client.post(
        "/api/admin/phase2-migrations/23/dry-run",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 201
    assert response.json() == {
        "report_id": "new-report",
        "partner_id": "23",
        "status": "review_required",
        "source_checksum": "b" * 64,
        "action_count": 1,
        "actions": [
            {
                "action_id": "action-2",
                "kind": "archive_legacy",
                "step_id": "05-script-masterclass",
                "reason": "historical_output_requires_current_approval",
            }
        ],
        "created_at": "2026-08-15T09:30:00Z",
    }
    assert "PRIVATE" not in response.text


def test_superadmin_can_read_report_without_snapshot_or_raw_fields(
    client, admin_auth
):
    response = client.get(
        "/api/admin/phase2-migrations/reports/report-1",
        headers=admin_auth["superadmin"],
    )

    assert response.status_code == 200
    assert response.json()["action_count"] == 1
    assert response.json()["actions"][0] == {
        "action_id": "action-1",
        "kind": "reopen_step",
        "step_id": "05-script-masterclass",
        "reason": "output_not_current",
    }
    assert "PRIVATE" not in response.text
    assert "snapshot" not in response.json()
    assert "expected_steps" not in response.json()


def test_apply_accepts_existing_review_report_and_sanitizes_result(
    client, admin_auth, monkeypatch
):
    async def apply_report(_db, report_id, actor_id):
        assert report_id == "report-1"
        assert actor_id == "admin-1"
        return SimpleNamespace(
            to_dict=lambda: {
                "report_id": report_id,
                "partner_id": "23",
                "snapshot_id": "private-snapshot-id",
                "audit_id": "audit-1",
                "applied_at": "2026-08-15T10:00:00Z",
                "raw": "PRIVATE RAW VIDEO",
            }
        )

    monkeypatch.setattr(phase2_migration, "apply_phase2_migration", apply_report)

    response = client.post(
        "/api/admin/phase2-migrations/reports/report-1/apply",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 200
    assert response.json() == {
        "report_id": "report-1",
        "partner_id": "23",
        "status": "applied",
        "action_count": 1,
        "audit_id": "audit-1",
        "applied_at": "2026-08-15T10:00:00Z",
    }
    assert "snapshot" not in response.text
    assert "PRIVATE" not in response.text


def test_non_reviewable_report_fails_closed(client, admin_auth):
    phase2_migration.db.partner_phase2_migration_reports.documents[0]["status"] = "draft"

    response = client.post(
        "/api/admin/phase2-migrations/reports/report-1/apply",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "phase2_migration_report_not_reviewable"
    }


def test_migration_conflict_maps_to_stable_409_code(
    client, admin_auth, monkeypatch
):
    async def conflict(*_args, **_kwargs):
        raise MigrationConflict("mongodb.internal:27017 raw detail")

    monkeypatch.setattr(phase2_migration, "apply_phase2_migration", conflict)

    response = client.post(
        "/api/admin/phase2-migrations/reports/report-1/apply",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 409
    assert response.json()["detail"] == {"code": "phase2_migration_conflict"}
    assert "mongodb.internal" not in response.text


def test_cli_parser_defaults_to_single_partner_dry_run():
    args = migrate_phase2_partner.parse_args(["--partner-id", "23"])

    assert args.partner_id == "23"
    assert args.apply is False
    assert args.report_id is None


@pytest.mark.parametrize(
    "argv",
    [
        [],
        ["--apply", "--report-id", "report-1"],
        ["--partner-id", "23", "--apply"],
        ["--partner-id", "23", "--report-id", "report-1"],
        ["--partner-id", "23", "--all"],
    ],
)
def test_cli_parser_rejects_ambiguous_or_bulk_invocations(argv):
    with pytest.raises(SystemExit) as exc:
        migrate_phase2_partner.parse_args(argv)

    assert exc.value.code == 2


@pytest.mark.asyncio
async def test_cli_json_result_contains_counts_but_no_raw_or_credentials(monkeypatch):
    report = {
        "report_id": "report-1",
        "partner_id": "23",
        "status": "review_required",
        "actions": [{"action_id": "action-1", "before": {"raw": "PRIVATE"}}],
        "mongo_url": "configured-only-through-environment",
    }
    database = FakeDb(partners=[{"id": "23"}], reports=[report])

    async def create_report(_db, partner_id, actor_id):
        return SimpleNamespace(
            report_id="report-1",
            partner_id=partner_id,
            status="review_required",
            actions=report["actions"],
        )

    monkeypatch.setattr(migrate_phase2_partner, "create_phase2_dry_run", create_report)
    args = migrate_phase2_partner.parse_args(["--partner-id", "23"])

    result = await migrate_phase2_partner.execute(database, args, actor_id="cli-admin")
    encoded = json.dumps(result)

    assert result == {
        "mode": "dry-run",
        "partner_id": "23",
        "report_id": "report-1",
        "status": "review_required",
        "action_count": 1,
    }
    assert "PRIVATE" not in encoded
    assert "password" not in encoded


@pytest.mark.asyncio
async def test_cli_apply_requires_report_for_same_partner(monkeypatch):
    database = FakeDb(
        partners=[{"id": "23"}],
        reports=[
            {
                "report_id": "report-other",
                "partner_id": "99",
                "status": "review_required",
                "actions": [],
            }
        ],
    )
    called = False

    async def apply_report(*_args, **_kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr(migrate_phase2_partner, "apply_phase2_migration", apply_report)
    args = migrate_phase2_partner.parse_args(
        ["--partner-id", "23", "--apply", "--report-id", "report-other"]
    )

    with pytest.raises(migrate_phase2_partner.CliError) as exc:
        await migrate_phase2_partner.execute(database, args, actor_id="cli-admin")

    assert exc.value.code == "phase2_migration_report_partner_mismatch"
    assert called is False


@pytest.mark.asyncio
async def test_cli_connection_error_never_echoes_mongo_credentials(
    monkeypatch, capsys
):
    secret_uri = (
        "mongodb://" + "private-user:private-password" + "@private-host/database"
    )
    monkeypatch.setenv("MONGO_URL", secret_uri)

    def fail_connection(uri):
        raise ValueError(f"cannot connect to {uri}")

    monkeypatch.setattr(
        migrate_phase2_partner, "AsyncIOMotorClient", fail_connection
    )

    exit_code = await migrate_phase2_partner._run(["--partner-id", "23"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert json.loads(captured.err) == {
        "ok": False,
        "code": "mongo_connection_failed",
    }
    assert "private-user" not in captured.err
    assert "private-password" not in captured.err
