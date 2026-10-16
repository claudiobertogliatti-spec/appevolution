"""T08 — registro eventi, escalation persistente e guardie di recupero.

Tutti ``unit``. Logica di ``events`` su collection finte + asserzioni AST sul router
(ogni endpoint richiede admin).
"""

from __future__ import annotations

import ast
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from services.operational_tasks.events import (
    append_event,
    can_admin_retry,
    escalate,
    incident_key,
    record_escalation_delivery,
    resolve_escalation,
    timeline,
)

pytestmark = pytest.mark.unit

T0 = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)


# ─────────────────────────── fake mongo (flat equality) ───────────────────────────

class _Cursor:
    def __init__(self, items):
        self.items = items

    def sort(self, field, direction=1):
        self.items = sorted(self.items, key=lambda d: d.get(field), reverse=direction < 0)
        return self

    def limit(self, n):
        self.items = self.items[:n]
        return self

    async def to_list(self, n=None):
        return self.items[: (n if n is not None else len(self.items))]


class _Result:
    def __init__(self, matched):
        self.matched_count = matched
        self.modified_count = matched


class FakeCollection:
    def __init__(self):
        self.docs = []

    @staticmethod
    def _match(doc, query):
        return all(doc.get(k) == v for k, v in query.items())

    @staticmethod
    def _strip(doc):
        return {k: v for k, v in doc.items() if k != "_id"}

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return _Result(1)

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if self._match(d, query):
                return self._strip(d)
        return None

    def find(self, query, projection=None):
        return _Cursor([self._strip(d) for d in self.docs if self._match(d, query)])

    async def update_one(self, query, update):
        for d in self.docs:
            if self._match(d, query):
                for key, value in update.get("$set", {}).items():
                    tgt, parts = d, key.split(".")
                    for p in parts[:-1]:
                        tgt = tgt.setdefault(p, {})
                    tgt[parts[-1]] = value
                for key in update.get("$unset", {}):
                    tgt, parts = d, key.split(".")
                    ok = True
                    for p in parts[:-1]:
                        if p not in tgt:
                            ok = False
                            break
                        tgt = tgt[p]
                    if ok:
                        tgt.pop(parts[-1], None)
                return _Result(1)
        return _Result(0)


# ─────────────────────────── timeline ───────────────────────────

async def test_append_event_and_timeline_is_ordered():
    events = FakeCollection()
    await append_event(events, "t1", "retry", actor="claudio@x.it", now=T0 + timedelta(seconds=1))
    await append_event(events, "t1", "assign", actor="claudio@x.it", now=T0)
    await append_event(events, "other", "retry", now=T0)
    tl = await timeline(events, "t1")
    assert [e["kind"] for e in tl] == ["assign", "retry"]  # ordinati per `at`
    assert all(e["task_id"] == "t1" for e in tl)


# ─────────────────────────── escalation persistente + dedup ───────────────────────────

async def test_escalate_dedups_same_incident():
    esc = FakeCollection()
    first = await escalate(esc, "t1", "provider_down", owner_id="ops", reason="giù", now=T0)
    second = await escalate(esc, "t1", "provider_down", owner_id="ops", reason="ancora", now=T0)
    assert first["_deduped"] is False and second["_deduped"] is True
    assert len(esc.docs) == 1  # un solo incidente aperto


async def test_escalate_distinct_error_codes_are_separate():
    esc = FakeCollection()
    await escalate(esc, "t1", "provider_down", owner_id="ops", reason="a", now=T0)
    await escalate(esc, "t1", "quota_exceeded", owner_id="ops", reason="b", now=T0)
    assert len(esc.docs) == 2


async def test_failed_notification_does_not_close_the_problem():
    esc = FakeCollection()
    e = await escalate(esc, "t1", "provider_down", owner_id="ops", reason="giù", now=T0)
    await record_escalation_delivery(esc, e["incident_key"], delivered=False, detail="smtp timeout")
    open_esc = await esc.find_one({"task_id": "t1", "resolved": False})
    assert open_esc is not None  # nessuna perdita: resta aperto
    assert open_esc["delivery"] == "failed"
    assert open_esc["resolved"] is False  # una notifica fallita NON risolve


async def test_resolve_then_reescalate_opens_fresh_incident():
    esc = FakeCollection()
    e = await escalate(esc, "t1", "provider_down", owner_id="ops", reason="giù", now=T0)
    await resolve_escalation(esc, e["incident_key"], resolved_by="claudio@x.it")
    again = await escalate(esc, "t1", "provider_down", owner_id="ops", reason="ricomparso", now=T0)
    assert again["_deduped"] is False  # l'incidente risolto non deduplica il nuovo
    assert len(esc.docs) == 2


def test_incident_key_stable():
    assert incident_key("t1", "x") == incident_key("t1", "x")
    assert incident_key("t1", "x") != incident_key("t1", "y")


# ─────────────────────────── guardia di retry ───────────────────────────

def test_can_admin_retry_allows_clean_blocked_or_failed():
    assert can_admin_retry({"status": "blocked"})[0] is True
    assert can_admin_retry({"status": "failed"})[0] is True


def test_can_admin_retry_blocks_non_recoverable_status():
    assert can_admin_retry({"status": "in_progress"})[0] is False
    assert can_admin_retry({"status": "completed"})[0] is False


def test_can_admin_retry_forbids_uncertain_effects():
    assert can_admin_retry({"status": "blocked", "reconciliation_required": True})[0] is False
    assert can_admin_retry({"status": "blocked", "error_code": "execution_uncertain"})[0] is False
    assert can_admin_retry({"status": "blocked", "error_code": "verification_uncertain"})[0] is False


# ─────────────────────────── AST: il router richiede admin ───────────────────────────

ROUTER = Path(__file__).resolve().parent.parent / "routers" / "operational_tasks.py"

ENDPOINTS = [
    "list_operational_tasks",
    "operational_task_detail",
    "retry_operational_task",
    "reconcile_operational_task",
    "assign_operational_task",
    "cancel_operational_task",
]


def _handler(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    raise AssertionError(f"handler {name} non trovato nel router")


def _requires_admin(fn):
    for default in fn.args.defaults + fn.args.kw_defaults:
        if isinstance(default, ast.Call) and isinstance(default.func, ast.Name) and default.func.id == "Depends":
            if default.args and isinstance(default.args[0], ast.Name) and default.args[0].id == "require_admin":
                return True
    return False


def test_every_operational_task_route_requires_admin():
    tree = ast.parse(ROUTER.read_text(encoding="utf-8"))
    for name in ENDPOINTS:
        assert _requires_admin(_handler(tree, name)), f"{name} deve richiedere require_admin"
