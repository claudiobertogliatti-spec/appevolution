"""Contratti admin HTTP e CLI per la migrazione canonica Fase 2."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "phase2-migration-api-test-secret")
os.environ.setdefault("MONGO_URL", "mongodb://phase2-migration-api-test.invalid:27017")

from routers import phase2_migration
from scripts import migrate_phase2_partner
from services.phase2_migration import (
    MigrationConflict,
    MigrationRecoveryNotAllowed,
    sanitize_phase2_migration_action,
)


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
                "action_id": "a" * 24,
                "kind": "reopen_step",
                "step_id": "05-script-masterclass",
                "reason": "server_evidence_missing",
                "before": {
                    "status": "done",
                    "completed_at": "2026-08-01T08:00:00Z",
                    "material_body": "PRIVATE RAW SCRIPT",
                },
                "after": {
                    "status": "in_progress",
                    "completed_at": None,
                    "blocked_reason_code": None,
                },
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
    recovery = client.post(
        "/api/admin/phase2-migrations/reports/report-1/recover"
    )

    assert response.status_code == 401
    assert recovery.status_code == 401


def test_partner_cannot_create_or_apply_migration(client, admin_auth):
    dry_run = client.post(
        "/api/admin/phase2-migrations/23/dry-run",
        headers=admin_auth["partner"],
    )
    apply = client.post(
        "/api/admin/phase2-migrations/reports/report-1/apply",
        headers=admin_auth["partner"],
    )
    recover = client.post(
        "/api/admin/phase2-migrations/reports/report-1/recover",
        headers=admin_auth["partner"],
    )

    assert dry_run.status_code == 403
    assert apply.status_code == 403
    assert recover.status_code == 403


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
                        "action_id": "b" * 24,
                        "kind": "archive_legacy",
                        "step_id": "05-script-masterclass",
                        "reason": "historical_output_requires_current_approval",
                        "before": {
                            "source_field_checksum": "c" * 64,
                            "material_body": "PRIVATE RAW SCRIPT",
                            "url": "https://private.example.test/raw",
                            "token": "PRIVATE TOKEN",
                        },
                        "after": {
                            "target": "partner_phase2_output_versions",
                            "category": "script_masterclass",
                            "template_id": "legacy-reference-script_masterclass",
                            "template_version": "migration-v1",
                            "status": "legacy",
                        },
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
                "action_id": "b" * 24,
                "kind": "archive_legacy",
                "step_id": "05-script-masterclass",
                "reason": "historical_output_requires_current_approval",
                "target": "partner_phase2_output_versions",
                "before": {"source_field_checksum": "c" * 64},
                "after": {
                    "status": "legacy",
                    "category": "script_masterclass",
                    "template_id": "legacy-reference-script_masterclass",
                    "template_version": "migration-v1",
                },
            }
        ],
        "created_at": "2026-08-15T09:30:00Z",
    }
    assert "PRIVATE" not in response.text


def test_dry_run_redacts_noncanonical_step_id(
    client, admin_auth, monkeypatch
):
    private_step_id = "legacy/private-client@example.test/raw-title"

    async def create_report(_db, partner_id, actor_id):
        return SimpleNamespace(
            to_dict=lambda: {
                "report_id": "legacy-report",
                "partner_id": partner_id,
                "status": "review_required",
                "source_checksum": "c" * 64,
                "actions": [
                    {
                        "action_id": "d" * 24,
                        "kind": "preserve_source",
                        "step_id": private_step_id,
                        "reason": "legacy_journey_record_preserved",
                    }
                ],
                "created_at": "2026-08-15T09:30:00Z",
            }
        )

    monkeypatch.setattr(phase2_migration, "create_phase2_dry_run", create_report)

    response = client.post(
        "/api/admin/phase2-migrations/23/dry-run",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 201
    assert response.json()["actions"][0]["step_id"] == "legacy_record"
    assert private_step_id not in response.text


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
        "action_id": "a" * 24,
        "kind": "reopen_step",
        "step_id": "05-script-masterclass",
        "reason": "server_evidence_missing",
        "target": "partner_journey_steps",
        "before": {
            "status": "done",
            "completed_at_present": True,
        },
        "after": {
            "status": "in_progress",
            "completed_at_present": False,
            "blocked_reason_code": None,
        },
    }
    assert "PRIVATE" not in response.text
    assert "snapshot" not in response.json()
    assert "expected_steps" not in response.json()


def test_get_report_redacts_noncanonical_step_id(client, admin_auth):
    private_step_id = "legacy/private-client@example.test/raw-title"
    phase2_migration.db.partner_phase2_migration_reports.documents[0]["actions"].append(
        {
            "action_id": "e" * 24,
            "kind": "preserve_source",
            "step_id": private_step_id,
            "reason": "legacy_journey_record_preserved",
        }
    )

    response = client.get(
        "/api/admin/phase2-migrations/reports/report-1",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 200
    assert response.json()["actions"][1]["step_id"] == "legacy_record"
    assert private_step_id not in response.text


def test_get_report_allowlists_action_values_and_never_reflects_raw_fields(
    client, admin_auth
):
    private_marker = "private-token-and-url.example.test"
    phase2_migration.db.partner_phase2_migration_reports.documents[0]["actions"] = [{
        "action_id": {"raw": private_marker},
        "kind": {"raw": private_marker},
        "step_id": [private_marker],
        "reason": [private_marker],
        "before": {
            "status": {"raw": private_marker},
            "code": [private_marker],
            "fase_legacy": {"raw": private_marker},
            "macro_phase": [private_marker],
            "label": {"raw": private_marker},
            "owner": [private_marker],
            "completion_policy": {"raw": private_marker},
            "material_categories": [{"raw": private_marker}],
            "blocked_reason_code": {"raw": private_marker},
            "recovery_action_code": [private_marker],
            "next_action_step_id": {"raw": private_marker},
            "category": {"raw": private_marker},
            "template_id": [private_marker],
            "collection": {"raw": private_marker},
            "final_source_fields": [[private_marker]],
            "raw_source_fields": [{"raw": private_marker}],
            "evidence_key": {"raw": private_marker},
            "content": private_marker,
        },
        "after": {"target": {"raw": private_marker}, "url": private_marker},
    }]

    response = client.get(
        "/api/admin/phase2-migrations/reports/report-1",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 200
    assert response.json()["actions"] == [{
        "action_id": "invalid_action",
        "kind": "unsupported_action",
        "step_id": "legacy_record",
        "reason": "unrecognized_reason",
        "target": "unsupported_target",
        "before": {},
        "after": {},
    }]
    assert private_marker not in response.text


def test_get_report_exposes_exact_safe_normalization_and_preservation_actions(
    client, admin_auth, monkeypatch
):
    private_marker = "private-content-at-sensitive.example.test"
    actions = [
        {
            "action_id": "1" * 24,
            "kind": "normalize_metadata",
            "step_id": "05-script-masterclass",
            "reason": "canonical_phase2_definition",
            "before": {
                "step_number": 9,
                "code": "F-9",
                "fase_legacy": "F3",
                "macro_phase": "valida",
                "label": "Outline lezioni",
                "owner": "ANDREA",
                "completion_policy": "course_outline_approved",
                "material_categories": ["outline_corso"],
                "content": private_marker,
            },
            "after": {
                "step_number": 8,
                "code": "F-8",
                "fase_legacy": "F3",
                "macro_phase": "valida",
                "label": "Script masterclass",
                "owner": "ANDREA",
                "completion_policy": "masterclass_script_approved",
                "material_categories": ["script_masterclass"],
                "url": private_marker,
            },
        },
        {
            "action_id": "2" * 24,
            "kind": "preserve_source",
            "step_id": "09-registra-lezioni",
            "reason": "historical_lesson_records_preserved",
            "before": {
                "collection": "partner_videocorso",
                "lesson_count": 32,
                "raw_lesson_count": 2,
                "raw_source_fields": ["video_raw_url", "drive_file_id"],
                "raw_document": private_marker,
            },
            "after": {"change": "none"},
        },
        {
            "action_id": "3" * 24,
            "kind": "preserve_step",
            "step_id": "05-script-masterclass",
            "reason": "current_server_evidence_conformant",
            "before": {
                "status": "done",
                "evidence_key": "masterclass_script_approved",
                "updated_at": private_marker,
                "token": private_marker,
            },
            "after": {"change": "none"},
        },
    ]
    phase2_migration.db.partner_phase2_migration_reports.documents[0]["actions"] = (
        actions
    )

    response = client.get(
        "/api/admin/phase2-migrations/reports/report-1",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 200
    projected = response.json()["actions"]
    assert projected[0]["before"] == {
        "step_number": 9,
        "code": "F-9",
        "fase_legacy": "F3",
        "macro_phase": "valida",
        "label": "Outline lezioni",
        "owner": "ANDREA",
        "completion_policy": "course_outline_approved",
        "material_categories": ["outline_corso"],
    }
    assert projected[0]["after"] == {
        "step_number": 8,
        "code": "F-8",
        "fase_legacy": "F3",
        "macro_phase": "valida",
        "label": "Script masterclass",
        "owner": "ANDREA",
        "completion_policy": "masterclass_script_approved",
        "material_categories": ["script_masterclass"],
    }
    assert projected[1]["before"] == {
        "collection": "partner_videocorso",
        "lesson_count": 32,
        "raw_lesson_count": 2,
        "raw_source_fields": ["video_raw_url", "drive_file_id"],
    }
    assert projected[1]["after"] == {"change": "none"}
    assert projected[2]["before"] == {
        "status": "done",
        "evidence_key": "masterclass_script_approved",
    }
    assert projected[2]["after"] == {"change": "none"}
    assert private_marker not in response.text

    async def create_report(_db, partner_id, actor_id):
        return SimpleNamespace(to_dict=lambda: {
            "report_id": "dry-run-exact-actions",
            "partner_id": partner_id,
            "actor_id": actor_id,
            "status": "review_required",
            "source_checksum": "d" * 64,
            "actions": actions,
            "created_at": "2026-08-15T12:00:00Z",
        })

    monkeypatch.setattr(phase2_migration, "create_phase2_dry_run", create_report)
    dry_run = client.post(
        "/api/admin/phase2-migrations/23/dry-run",
        headers=admin_auth["admin"],
    )
    assert dry_run.status_code == 201
    assert dry_run.json()["actions"] == projected
    assert private_marker not in dry_run.text


def test_get_conflict_exposes_only_sanitized_error_and_recovery_action(
    client, admin_auth
):
    report = phase2_migration.db.partner_phase2_migration_reports.documents[0]
    report.update({
        "status": "conflict",
        "error_code": "source_checksum_mismatch",
        "conflict_reason": "private-host.invalid raw stale detail",
    })

    response = client.get(
        "/api/admin/phase2-migrations/reports/report-1",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 200
    assert response.json()["error_code"] == "source_checksum_mismatch"
    assert response.json()["recovery_action"] == "create_new_dry_run"
    assert "conflict_reason" not in response.json()
    assert "private-host.invalid" not in response.text


def test_admin_can_recover_one_report_with_sanitized_response(
    client, admin_auth, monkeypatch
):
    report = phase2_migration.db.partner_phase2_migration_reports.documents[0]
    report.update({
        "status": "conflict",
        "error_code": "snapshot_store_unavailable",
    })

    async def recover(_db, report_id, actor_id):
        assert report_id == "report-1"
        assert actor_id == "admin-1"
        return SimpleNamespace(to_dict=lambda: {
            "report_id": report_id,
            "partner_id": "23",
            "snapshot_id": "private-snapshot",
            "audit_id": "audit-1",
            "applied_at": "2026-08-15T10:00:00Z",
        })

    monkeypatch.setattr(phase2_migration, "recover_phase2_migration", recover)
    response = client.post(
        "/api/admin/phase2-migrations/reports/report-1/recover",
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
    assert "private-snapshot" not in response.text


@pytest.mark.parametrize(
    "error_code",
    ["source_checksum_mismatch", "snapshot_identity_conflict"],
)
def test_nonrecoverable_report_requires_new_dry_run(
    client, admin_auth, monkeypatch, error_code
):
    async def refuse(*_args, **_kwargs):
        raise MigrationRecoveryNotAllowed(error_code)

    monkeypatch.setattr(phase2_migration, "recover_phase2_migration", refuse)
    response = client.post(
        "/api/admin/phase2-migrations/reports/report-1/recover",
        headers=admin_auth["admin"],
    )

    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "phase2_migration_conflict_not_recoverable",
        "error_code": error_code,
        "recovery_action": "create_new_dry_run",
    }


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
    assert args.recover is False
    assert args.report_id is None


@pytest.mark.parametrize(
    "argv",
    [
        [],
        ["--apply", "--report-id", "report-1"],
        ["--partner-id", "23", "--apply"],
        ["--partner-id", "23", "--report-id", "report-1"],
        ["--partner-id", "23", "--recover"],
        [
            "--partner-id",
            "23",
            "--apply",
            "--recover",
            "--report-id",
            "report-1",
        ],
        ["--partner-id", "23", "--all"],
    ],
)
def test_cli_parser_rejects_ambiguous_or_bulk_invocations(argv):
    with pytest.raises(migrate_phase2_partner.CliArgumentError) as exc:
        migrate_phase2_partner.parse_args(argv)

    assert exc.value.code == "phase2_migration_invalid_arguments"


@pytest.mark.parametrize(
    "argv",
    [
        ["--all"],
        ["--partner-id", "23", "--apply"],
        ["--apply", "--report-id", "report-1"],
        ["--help", "--all"],
    ],
)
def test_cli_invalid_arguments_emit_only_stable_json(argv):
    completed = subprocess.run(
        [sys.executable, "-m", "scripts.migrate_phase2_partner", *argv],
        cwd=Path(__file__).resolve().parents[1],
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 2
    assert completed.stdout == ""
    assert json.loads(completed.stderr) == {
        "ok": False,
        "code": "phase2_migration_invalid_arguments",
    }
    assert "usage:" not in completed.stderr.lower()
    assert "--all" not in completed.stderr


def test_cli_invalid_arguments_do_not_echo_raw_uri():
    secret_uri = (
        "mongodb://" + "private-user:private-password" + "@private-host/database"
    )
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "scripts.migrate_phase2_partner",
            "--partner-id",
            "23",
            "--mongo-url",
            secret_uri,
        ],
        cwd=Path(__file__).resolve().parents[1],
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 2
    assert json.loads(completed.stderr) == {
        "ok": False,
        "code": "phase2_migration_invalid_arguments",
    }
    assert secret_uri not in completed.stderr


def test_cli_help_remains_normal_help():
    completed = subprocess.run(
        [sys.executable, "-m", "scripts.migrate_phase2_partner", "--help"],
        cwd=Path(__file__).resolve().parents[1],
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 0
    assert "--partner-id" in completed.stdout
    assert completed.stderr == ""


def _blocked_import_env(tmp_path, blocked_module):
    sitecustomize = tmp_path / "sitecustomize.py"
    sitecustomize.write_text(
        """
import builtins
import os

_real_import = builtins.__import__
_blocked = os.environ["PHASE2_TEST_BLOCKED_IMPORT"]

def _block_import(name, *args, **kwargs):
    if name == _blocked or name.startswith(_blocked + "."):
        raise ModuleNotFoundError("dependency intentionally unavailable")
    return _real_import(name, *args, **kwargs)

builtins.__import__ = _block_import
""".lstrip(),
        encoding="utf-8",
    )
    environment = os.environ.copy()
    environment["PYTHONPATH"] = str(tmp_path)
    environment["PHASE2_TEST_BLOCKED_IMPORT"] = blocked_module
    return environment


@pytest.mark.parametrize("blocked_module", ["motor", "services.phase2_migration"])
def test_cli_invalid_arguments_stay_json_when_dependency_is_missing(
    tmp_path, blocked_module
):
    completed = subprocess.run(
        [sys.executable, "-m", "scripts.migrate_phase2_partner", "--all"],
        cwd=Path(__file__).resolve().parents[1],
        env=_blocked_import_env(tmp_path, blocked_module),
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 2
    assert completed.stdout == ""
    assert json.loads(completed.stderr) == {
        "ok": False,
        "code": "phase2_migration_invalid_arguments",
    }
    assert "Traceback" not in completed.stderr
    assert blocked_module not in completed.stderr


@pytest.mark.parametrize("blocked_module", ["motor", "services.phase2_migration"])
def test_cli_valid_arguments_report_missing_dependency_as_stable_json(
    tmp_path, blocked_module
):
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "scripts.migrate_phase2_partner",
            "--partner-id",
            "23",
        ],
        cwd=Path(__file__).resolve().parents[1],
        env=_blocked_import_env(tmp_path, blocked_module),
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 1
    assert completed.stdout == ""
    assert json.loads(completed.stderr) == {
        "ok": False,
        "code": "phase2_migration_dependency_unavailable",
    }
    assert "Traceback" not in completed.stderr
    assert blocked_module not in completed.stderr


@pytest.mark.asyncio
async def test_cli_json_result_contains_counts_but_no_raw_or_credentials(monkeypatch):
    report = {
        "report_id": "report-1",
        "partner_id": "23",
        "status": "review_required",
        "actions": [{
            "action_id": "f" * 24,
            "kind": "reopen_step",
            "step_id": "05-script-masterclass",
            "reason": "server_evidence_missing",
            "before": {
                "status": "done",
                "completed_at": "2026-08-01T08:00:00Z",
                "raw": "PRIVATE",
            },
            "after": {"status": "in_progress", "completed_at": None},
        }],
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
    monkeypatch.setattr(
        migrate_phase2_partner,
        "sanitize_phase2_migration_action",
        sanitize_phase2_migration_action,
    )
    args = migrate_phase2_partner.parse_args(["--partner-id", "23"])

    result = await migrate_phase2_partner.execute(database, args, actor_id="cli-admin")
    encoded = json.dumps(result)

    assert result == {
        "mode": "dry-run",
        "partner_id": "23",
        "report_id": "report-1",
        "status": "review_required",
        "action_count": 1,
        "actions": [{
            "action_id": "f" * 24,
            "kind": "reopen_step",
            "step_id": "05-script-masterclass",
            "reason": "server_evidence_missing",
            "target": "partner_journey_steps",
            "before": {
                "status": "done",
                "completed_at_present": True,
            },
            "after": {
                "status": "in_progress",
                "completed_at_present": False,
            },
        }],
    }
    assert "PRIVATE" not in encoded
    assert "password" not in encoded


@pytest.mark.asyncio
async def test_cli_dry_run_uses_same_exact_safe_action_projection(monkeypatch):
    private_marker = "private-raw-document.example.test"
    actions = [
        {
            "action_id": "4" * 24,
            "kind": "normalize_metadata",
            "step_id": "05-script-masterclass",
            "reason": "canonical_phase2_definition",
            "before": {},
            "after": {
                "step_number": 8,
                "code": "F-8",
                "fase_legacy": "F3",
                "macro_phase": "valida",
                "label": "Script masterclass",
                "owner": "ANDREA",
                "completion_policy": "masterclass_script_approved",
                "material_categories": ["script_masterclass"],
                "content": private_marker,
            },
        },
        {
            "action_id": "5" * 24,
            "kind": "preserve_source",
            "step_id": "08-registra-masterclass",
            "reason": "historical_masterclass_media_preserved",
            "before": {
                "collection": "masterclass_factory",
                "final_source_fields": ["video_youtube_url"],
                "raw_source_fields": ["video_raw_url"],
                "url": private_marker,
            },
            "after": {"change": "none"},
        },
    ]
    database = FakeDb(partners=[{"id": "23"}])

    async def create_report(_db, partner_id, actor_id):
        return SimpleNamespace(
            report_id="report-exact-projection",
            partner_id=partner_id,
            status="review_required",
            actions=actions,
        )

    monkeypatch.setattr(migrate_phase2_partner, "create_phase2_dry_run", create_report)
    monkeypatch.setattr(
        migrate_phase2_partner,
        "sanitize_phase2_migration_action",
        sanitize_phase2_migration_action,
    )
    args = migrate_phase2_partner.parse_args(["--partner-id", "23"])

    result = await migrate_phase2_partner.execute(
        database, args, actor_id="cli-reviewer"
    )

    assert result["actions"] == [
        sanitize_phase2_migration_action(action) for action in actions
    ]
    assert result["actions"][0]["after"]["material_categories"] == [
        "script_masterclass"
    ]
    assert result["actions"][1]["before"] == {
        "collection": "masterclass_factory",
        "final_source_fields": ["video_youtube_url"],
        "raw_source_fields": ["video_raw_url"],
    }
    assert private_marker not in json.dumps(result)


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
async def test_cli_recovery_calls_same_single_report_service(monkeypatch):
    database = FakeDb(
        partners=[{"id": "23"}],
        reports=[{
            "report_id": "report-1",
            "partner_id": "23",
            "status": "conflict",
            "error_code": "snapshot_store_unavailable",
            "actions": [{"action_id": "a" * 24}],
        }],
    )

    async def recover(_db, report_id, actor_id):
        assert report_id == "report-1"
        assert actor_id == "cli-admin"
        return SimpleNamespace(
            partner_id="23",
            report_id=report_id,
        )

    monkeypatch.setattr(
        migrate_phase2_partner, "recover_phase2_migration", recover
    )
    args = migrate_phase2_partner.parse_args([
        "--partner-id",
        "23",
        "--recover",
        "--report-id",
        "report-1",
    ])

    result = await migrate_phase2_partner.execute(
        database, args, actor_id="cli-admin"
    )

    assert result == {
        "mode": "recover",
        "partner_id": "23",
        "report_id": "report-1",
        "status": "applied",
        "action_count": 1,
    }


@pytest.mark.asyncio
async def test_cli_stale_recovery_returns_sanitized_direction(monkeypatch):
    database = FakeDb(reports=[{
        "report_id": "report-1",
        "partner_id": "23",
        "status": "conflict",
        "error_code": "source_checksum_mismatch",
        "actions": [],
    }])

    async def refuse(*_args, **_kwargs):
        raise MigrationRecoveryNotAllowed("source_checksum_mismatch")

    monkeypatch.setattr(
        migrate_phase2_partner, "MigrationRecoveryNotAllowed",
        MigrationRecoveryNotAllowed,
    )
    monkeypatch.setattr(
        migrate_phase2_partner, "recover_phase2_migration", refuse
    )
    args = migrate_phase2_partner.parse_args([
        "--partner-id",
        "23",
        "--recover",
        "--report-id",
        "report-1",
    ])

    with pytest.raises(migrate_phase2_partner.CliError) as caught:
        await migrate_phase2_partner.execute(
            database, args, actor_id="cli-admin"
        )

    assert caught.value.to_dict() == {
        "ok": False,
        "code": "phase2_migration_conflict_not_recoverable",
        "error_code": "source_checksum_mismatch",
        "recovery_action": "create_new_dry_run",
    }


@pytest.mark.asyncio
async def test_cli_dead_cluster_uses_atlas_fallback_and_backend_db_name(
    monkeypatch, capsys
):
    captured = {}

    class Client:
        def __init__(self, uri):
            captured["uri"] = uri

        def __getitem__(self, database_name):
            captured["database_name"] = database_name
            return object()

        def close(self):
            captured["closed"] = True

    async def execute(_db, _args, *, actor_id):
        assert actor_id == "phase2-migration-cli-dry-run"
        return {"mode": "dry-run"}

    monkeypatch.setattr(migrate_phase2_partner, "_load_dependencies", lambda: None)
    monkeypatch.setattr(migrate_phase2_partner, "AsyncIOMotorClient", Client)
    monkeypatch.setattr(migrate_phase2_partner, "execute", execute)
    monkeypatch.setenv(
        "MONGO_URL", "mongodb://customer-apps.dead.invalid:27017/private"
    )
    monkeypatch.setenv("MONGO_ATLAS_URL", "mongodb://atlas.example.test/evolution")
    monkeypatch.setenv("DB_NAME", "wrong_database")
    monkeypatch.delenv("PHASE2_MIGRATION_ACTOR_ID", raising=False)

    exit_code = await migrate_phase2_partner._run(["--partner-id", "23"])
    captured_io = capsys.readouterr()

    assert exit_code == 0
    assert captured["uri"] == "mongodb://atlas.example.test/evolution"
    assert captured["database_name"] == "evolution_pro"
    assert captured["closed"] is True
    assert json.loads(captured_io.out) == {"ok": True, "mode": "dry-run"}


@pytest.mark.asyncio
async def test_cli_apply_requires_explicit_actor_before_connecting(
    monkeypatch, capsys
):
    connected = False

    def connect(_uri):
        nonlocal connected
        connected = True
        raise AssertionError("must not connect")

    monkeypatch.setattr(migrate_phase2_partner, "_load_dependencies", lambda: None)
    monkeypatch.setattr(migrate_phase2_partner, "AsyncIOMotorClient", connect)
    monkeypatch.setenv("MONGO_URL", "mongodb://configured.example.test/db")
    monkeypatch.delenv("PHASE2_MIGRATION_ACTOR_ID", raising=False)

    exit_code = await migrate_phase2_partner._run([
        "--partner-id",
        "23",
        "--apply",
        "--report-id",
        "report-1",
    ])
    captured_io = capsys.readouterr()

    assert exit_code == 2
    assert connected is False
    assert json.loads(captured_io.err) == {
        "ok": False,
        "code": "phase2_migration_actor_not_configured",
    }


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
