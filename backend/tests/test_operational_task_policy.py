"""T06 — autorizzazioni applicate dal server e vincolo delle approvazioni.

Tutti ``unit`` (girano in CI): logica pura di ``policy``, comportamento di
``approval_workflow`` su un db finto, e asserzioni AST su ``server.py`` per
garantire che le rotte agent-task abbiano l'auth admin e che ``completed`` non sia
impostabile via API.
"""

from __future__ import annotations

import ast
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from approval_workflow import approve_task, reject_task
from services.operational_tasks.policy import (
    MAX_REVISIONS,
    approval_authorizes_output,
    authorize_admin,
    canonical_checksum,
)

pytestmark = pytest.mark.unit

T0 = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)


# ─────────────────────────────── policy pura ───────────────────────────────

def test_authorize_admin_rejects_anonymous_and_partner():
    assert authorize_admin(None).allowed is False
    assert authorize_admin({}).allowed is False
    assert authorize_admin({"role": "partner", "email": "p@x.it"}).allowed is False


def test_authorize_admin_accepts_admin_and_returns_real_identity():
    d = authorize_admin({"role": "admin", "email": "claudio@x.it", "user_id": "u1"})
    assert d.allowed is True and d.actor_id == "claudio@x.it"
    d2 = authorize_admin({"role": "superadmin", "user_id": "u9"})
    assert d2.allowed is True and d2.actor_id == "u9"


def test_authorize_admin_requires_identity_even_with_role():
    assert authorize_admin({"role": "admin"}).allowed is False


def test_approval_binds_to_the_approved_version():
    output = {"body": "bozza A"}
    approval = {
        "status": "approved",
        "reviewer": "claudio@x.it",
        "approved_checksum": canonical_checksum(output),
        "expires_at": (T0 + timedelta(days=1)).isoformat(),
    }
    assert approval_authorizes_output(approval, canonical_checksum(output), now=T0).valid is True
    # output cambiato dopo l'approvazione → non autorizza
    changed = approval_authorizes_output(approval, canonical_checksum({"body": "bozza B"}), now=T0)
    assert changed.valid is False and "cambiato" in changed.reason


def test_approval_rejected_when_missing_or_expired_or_unsigned():
    chk = canonical_checksum("x")
    assert approval_authorizes_output(None, chk, now=T0).valid is False
    assert approval_authorizes_output({"status": "pending"}, chk, now=T0).valid is False
    assert approval_authorizes_output(
        {"status": "approved", "approved_checksum": chk}, chk, now=T0
    ).valid is False  # senza reviewer identificato
    expired = {
        "status": "approved", "reviewer": "a@x.it", "approved_checksum": chk,
        "expires_at": (T0 - timedelta(seconds=1)).isoformat(),
    }
    assert approval_authorizes_output(expired, chk, now=T0).valid is False


# ─────────────────────── approval_workflow (db finto) ───────────────────────

class FakeCollection:
    def __init__(self, docs):
        self.docs = {d["id"]: dict(d) for d in docs}

    async def find_one(self, query, projection=None):
        doc = self.docs.get(query.get("id"))
        return dict(doc) if doc else None

    async def update_one(self, query, update, **_kw):
        doc = self.docs.setdefault(query["id"], {"id": query["id"]})
        for key, value in update.get("$set", {}).items():
            target, parts = doc, key.split(".")
            for part in parts[:-1]:
                target = target.setdefault(part, {})
            target[parts[-1]] = value
        for key, value in update.get("$push", {}).items():
            doc.setdefault(key, []).append(value)


class FakeDB:
    def __init__(self, docs):
        self.agent_tasks = FakeCollection(docs)


async def test_approve_binds_output_checksum_and_expiry():
    db = FakeDB([{
        "id": "t1", "status": "awaiting_approval",
        "approval": {"status": "pending", "revision_count": 0},
        "result": {"output": "bozza approvata"},
    }])
    task = await approve_task(db, "t1", "claudio@x.it")
    assert task["status"] == "approved"
    assert task["approval"]["reviewer"] == "claudio@x.it"
    assert task["approval"]["approved_checksum"] == canonical_checksum("bozza approvata")
    assert task["approval"]["expires_at"]


async def test_reject_below_limit_stays_rejected_for_regeneration():
    db = FakeDB([{
        "id": "t1", "status": "awaiting_approval",
        "approval": {"status": "pending", "revision_count": 0},
        "result": {"output": "v1"},
    }])
    task = await reject_task(db, "t1", "claudio@x.it", "rifai il titolo")
    assert task["status"] == "rejected"
    assert task["approval"]["revision_count"] == 1


async def test_reject_at_limit_blocks_instead_of_abandoning():
    # già 2 revisioni: il terzo rifiuto porta a blocked, non a rejected orfano
    db = FakeDB([{
        "id": "t1", "status": "awaiting_approval",
        "approval": {"status": "pending", "revision_count": MAX_REVISIONS - 1},
        "result": {"output": "v3"},
    }])
    task = await reject_task(db, "t1", "claudio@x.it", "ancora no")
    assert task["status"] == "blocked"
    assert task["error_code"] == "max_revisions_exceeded"
    assert task["next_action"]["owner_id"] == "claudio@x.it"
    assert task["approval"]["revision_count"] == MAX_REVISIONS


async def test_reject_requires_feedback():
    db = FakeDB([{"id": "t1", "status": "awaiting_approval",
                  "approval": {"status": "pending", "revision_count": 0}}])
    with pytest.raises(ValueError):
        await reject_task(db, "t1", "claudio@x.it", "   ")


# ─────────────────────── AST: auth applicata dal server ───────────────────────

SERVER = Path(__file__).resolve().parent.parent / "server.py"


def _handler(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    raise AssertionError(f"handler {name} non trovato in server.py")


def _has_admin_guard(fn):
    for default in fn.args.defaults + fn.args.kw_defaults:
        if isinstance(default, ast.Call) and isinstance(default.func, ast.Name) and default.func.id == "Depends":
            if default.args and isinstance(default.args[0], ast.Name) and default.args[0].id == "require_admin_role":
                return True
    return False


PROTECTED = [
    "list_pending_approvals",
    "get_approval_statistics",
    "api_approve_agent_task",
    "api_reject_agent_task",
    "api_dismiss_agent_task",
    "update_task_status",
]


def test_agent_task_mutation_routes_require_admin():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    for name in PROTECTED:
        assert _has_admin_guard(_handler(tree, name)), f"{name} deve richiedere require_admin_role"


def test_status_route_cannot_force_completed():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    src = ast.get_source_segment(SERVER.read_text(encoding="utf-8"), _handler(tree, "update_task_status"))
    # la lista degli stati impostabili a mano non deve includere completed/failed
    assert '"completed"' not in src and "'completed'" not in src


def test_reviewer_comes_from_authenticated_actor_not_body():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    text = SERVER.read_text(encoding="utf-8")
    for name in ("api_approve_agent_task", "api_reject_agent_task", "api_dismiss_agent_task"):
        src = ast.get_source_segment(text, _handler(tree, name))
        assert "_admin.email" in src, f"{name} deve derivare il reviewer dal token"
        assert "request.reviewer" not in src, f"{name} non deve usare request.reviewer"
