"""API admin sottile per i report di migrazione canonica Fase 2."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services.phase2_migration import (
    MigrationConflict,
    apply_phase2_migration,
    create_phase2_dry_run,
)


router = APIRouter(
    prefix="/api/admin/phase2-migrations",
    tags=["phase2-migration"],
)
security = HTTPBearer(auto_error=False)
db = None

_REPORT_FIELDS = (
    "report_id",
    "partner_id",
    "status",
    "source_checksum",
    "created_at",
    "updated_at",
    "applied_at",
)
_ACTION_FIELDS = ("action_id", "kind", "step_id", "reason")
_APPLICABLE_STATUSES = {"review_required", "applying", "applied"}


def set_db(database) -> None:
    global db
    db = database


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Accetta esclusivamente JWT admin/superadmin secondo il pattern Ciak."""
    from auth import decode_token

    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    identity = decode_token(credentials.credentials)
    if not identity or identity.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return identity


def _not_found(code: str) -> HTTPException:
    return HTTPException(status_code=404, detail={"code": code})


def _conflict(code: str = "phase2_migration_conflict") -> HTTPException:
    return HTTPException(status_code=409, detail={"code": code})


def _action_summary(action: dict[str, Any]) -> dict[str, Any]:
    return {
        field: action[field]
        for field in _ACTION_FIELDS
        if field in action
    }


def _report_summary(report: dict[str, Any]) -> dict[str, Any]:
    actions = report.get("actions") or []
    summary = {
        field: report[field]
        for field in _REPORT_FIELDS
        if field in report
    }
    summary["action_count"] = len(actions)
    summary["actions"] = [_action_summary(action) for action in actions]
    return summary


def _actor_id(identity) -> str:
    return str(identity.user_id)


@router.post("/{partner_id}/dry-run", status_code=201)
async def dry_run(
    partner_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    admin = await require_admin(credentials)
    partner = await db.partners.find_one(
        {"id": str(partner_id)}, {"_id": 0, "id": 1}
    )
    if not partner:
        raise _not_found("phase2_migration_partner_not_found")
    try:
        report = await create_phase2_dry_run(
            db, str(partner_id), _actor_id(admin)
        )
    except MigrationConflict:
        raise _conflict() from None
    return _report_summary(report.to_dict())


@router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    await require_admin(credentials)
    report = await db.partner_phase2_migration_reports.find_one(
        {"report_id": str(report_id)},
        {
            "_id": 0,
            "report_id": 1,
            "partner_id": 1,
            "status": 1,
            "source_checksum": 1,
            "actions": 1,
            "created_at": 1,
            "updated_at": 1,
            "applied_at": 1,
        },
    )
    if not report:
        raise _not_found("phase2_migration_report_not_found")
    return _report_summary(report)


@router.post("/reports/{report_id}/apply")
async def apply_report(
    report_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    admin = await require_admin(credentials)
    report = await db.partner_phase2_migration_reports.find_one(
        {"report_id": str(report_id)},
        {"_id": 0, "report_id": 1, "partner_id": 1, "status": 1, "actions": 1},
    )
    if not report:
        raise _not_found("phase2_migration_report_not_found")
    if report.get("status") not in _APPLICABLE_STATUSES:
        raise _conflict("phase2_migration_report_not_reviewable")
    try:
        result = await apply_phase2_migration(
            db, str(report_id), _actor_id(admin)
        )
    except MigrationConflict:
        raise _conflict() from None
    applied = result.to_dict()
    return {
        "report_id": applied["report_id"],
        "partner_id": applied["partner_id"],
        "status": "applied",
        "action_count": len(report.get("actions") or []),
        "audit_id": applied["audit_id"],
        "applied_at": applied["applied_at"],
    }
