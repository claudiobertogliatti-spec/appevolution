"""T05 — presa in carico atomica, lease e ripresa controllata.

Due livelli di prova, dichiarati:

* Test ``unit`` (girano in CI): esercitano la LOGICA del filtro di claim, del
  lease/token, del recupero dei lease scaduti e della policy di retry su una
  ``FakeCollection`` a thread singolo. Provano che le query e le transizioni sono
  corrette, NON l'atomicità sotto contesa (un mock single-thread non può).
* Test di atomicità (``test_two_concurrent_workers...``): NON marcato ``unit``,
  quindi la CI lo salta; gira solo contro un MongoDB reale (env ``OPS_TEST_MONGO_URL``,
  default ``mongodb://localhost:27017``) e fa ``skip`` se il server non risponde.
  È l'unico che dimostra "un solo worker vince il documento".
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone

import pytest

from services.operational_tasks import runner
from services.operational_tasks.runner import (
    apply_retry,
    claim_specific,
    claim_task,
    complete_with_lease,
    plan_retry,
    renew_lease,
)

T0 = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)
_MISSING = object()


# ─────────────────────────── FakeCollection (single thread) ───────────────────────────

def _get(doc, dotted):
    cur = doc
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return _MISSING
        cur = cur[part]
    return cur


def _match_field(doc, field, cond):
    value = _get(doc, field)
    if isinstance(cond, dict) and cond and all(k.startswith("$") for k in cond):
        for op, arg in cond.items():
            if op == "$in":
                if value is _MISSING or value not in arg:
                    return False
            elif op == "$exists":
                if (value is not _MISSING) != bool(arg):
                    return False
            elif op == "$lte":
                if value is _MISSING or not (value <= arg):
                    return False
            else:  # pragma: no cover - operatore non previsto dai test
                raise NotImplementedError(op)
        return True
    if cond is None:
        return value is _MISSING or value is None
    return value is not _MISSING and value == cond


def _matches(doc, query):
    for key, val in query.items():
        if key == "$and":
            if not all(_matches(doc, sub) for sub in val):
                return False
        elif key == "$or":
            if not any(_matches(doc, sub) for sub in val):
                return False
        elif not _match_field(doc, key, val):
            return False
    return True


def _apply_update(doc, update):
    for key, value in update.get("$set", {}).items():
        target, parts = doc, key.split(".")
        for part in parts[:-1]:
            target = target.setdefault(part, {})
        target[parts[-1]] = value
    for key in update.get("$unset", {}):
        target, parts = doc, key.split(".")
        ok = True
        for part in parts[:-1]:
            if not isinstance(target, dict) or part not in target:
                ok = False
                break
            target = target[part]
        if ok and isinstance(target, dict):
            target.pop(parts[-1], None)
    for key, amount in update.get("$inc", {}).items():
        doc[key] = doc.get(key, 0) + amount


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = {d["id"]: dict(d) for d in (documents or [])}

    async def find_one_and_update(self, filt, update, sort=None, return_document=None, **_kw):
        docs = list(self.documents.values())
        if sort:
            for field, direction in reversed(sort):
                docs.sort(key=lambda d: _get(d, field), reverse=direction < 0)
        for doc in docs:
            if _matches(doc, filt):
                _apply_update(doc, update)
                return dict(doc)
        return None

    def read(self, task_id):
        return self.documents.get(task_id)


def _task(task_id="t1", status="pending", created_at="2026-09-08T00:00:00+00:00", **extra):
    doc = {
        "id": task_id,
        "agent": "carlo",
        "task_type": "delivery.generate_positioning",
        "status": status,
        "created_at": created_at,
    }
    doc.update(extra)
    return doc


# ─────────────────────────────── claim & recupero ───────────────────────────────

@pytest.mark.unit
async def test_claim_marks_in_progress_with_lease_and_counts_attempt():
    coll = FakeCollection([_task()])
    claimed = await claim_task(coll, "w1", lease_seconds=120, now=T0)
    assert claimed is not None
    assert claimed["status"] == "in_progress"
    assert claimed["lease"]["owner"] == "w1"
    assert claimed["lease"]["token"]
    assert claimed["lease"]["expires_at"] == T0 + timedelta(seconds=120)
    assert claimed["attempt_count"] == 1


@pytest.mark.unit
async def test_active_lease_blocks_reclaim_before_expiry():
    coll = FakeCollection([_task()])
    await claim_task(coll, "w1", lease_seconds=60, now=T0)
    again = await claim_task(coll, "w2", lease_seconds=60, now=T0 + timedelta(seconds=59))
    assert again is None


@pytest.mark.unit
async def test_expired_lease_is_reclaimable_and_attempt_increments():
    # Worker morto dopo il claim: alla scadenza il task non sparisce, si riprende.
    coll = FakeCollection([_task()])
    first = await claim_task(coll, "w1", lease_seconds=60, now=T0)
    second = await claim_task(coll, "w2", lease_seconds=60, now=T0 + timedelta(seconds=61))
    assert second is not None
    assert second["lease"]["owner"] == "w2"
    assert second["lease"]["token"] != first["lease"]["token"]
    assert second["attempt_count"] == 2


@pytest.mark.unit
async def test_nothing_to_claim_returns_none():
    coll = FakeCollection([_task(status="completed")])
    assert await claim_task(coll, "w1", lease_seconds=60, now=T0) is None


@pytest.mark.unit
async def test_claim_validates_arguments():
    coll = FakeCollection([_task()])
    with pytest.raises(ValueError):
        await claim_task(coll, "", lease_seconds=60, now=T0)
    with pytest.raises(ValueError):
        await claim_task(coll, "w1", lease_seconds=0, now=T0)
    with pytest.raises(ValueError):
        await claim_task(coll, "w1", lease_seconds=True, now=T0)


# ─────────────────────────── claim per-id (gate del worker) ───────────────────────────

@pytest.mark.unit
async def test_claim_specific_gates_by_id():
    coll = FakeCollection([_task("t1"), _task("t2", status="completed")])
    got = await claim_specific(coll, "t1", "w1", lease_seconds=60, now=T0)
    assert got["status"] == "in_progress"
    assert got["lease"]["owner"] == "w1"
    assert got["attempt_count"] == 1
    # stesso id, lease ancora attivo → nessun secondo esecutore
    assert await claim_specific(coll, "t1", "w2", lease_seconds=60, now=T0) is None
    # task non prendibile (completed) → None
    assert await claim_specific(coll, "t2", "w1", lease_seconds=60, now=T0) is None
    # id inesistente → None
    assert await claim_specific(coll, "tX", "w1", lease_seconds=60, now=T0) is None


@pytest.mark.unit
async def test_claim_specific_validates_args():
    coll = FakeCollection([_task()])
    with pytest.raises(ValueError):
        await claim_specific(coll, "", "w1", lease_seconds=60)
    with pytest.raises(ValueError):
        await claim_specific(coll, "t1", "", lease_seconds=60)


# ─────────────────────────────── lease & token ───────────────────────────────

@pytest.mark.unit
async def test_renew_lease_only_with_matching_token():
    coll = FakeCollection([_task()])
    claimed = await claim_task(coll, "w1", lease_seconds=60, now=T0)
    token = claimed["lease"]["token"]
    renewed = await renew_lease(coll, "t1", token, lease_seconds=120, now=T0 + timedelta(seconds=30))
    assert renewed["lease"]["expires_at"] == T0 + timedelta(seconds=150)
    assert await renew_lease(coll, "t1", "wrong-token", lease_seconds=120, now=T0) is None


@pytest.mark.unit
async def test_complete_requires_matching_token():
    coll = FakeCollection([_task()])
    claimed = await claim_task(coll, "w1", lease_seconds=60, now=T0)
    token = claimed["lease"]["token"]
    assert await complete_with_lease(coll, "t1", "wrong", {"ok": True}) is None
    assert coll.read("t1")["status"] == "in_progress"
    done = await complete_with_lease(coll, "t1", token, {"artifact": "x"}, now=T0)
    assert done["status"] == "completed"
    assert done["completed_at"] == T0.isoformat()
    assert "lease" not in done


@pytest.mark.unit
async def test_late_worker_cannot_complete_task_taken_over():
    # w1 prende, muore; w2 riprende alla scadenza; w1 finisce tardi → non chiude.
    coll = FakeCollection([_task()])
    first = await claim_task(coll, "w1", lease_seconds=60, now=T0)
    second = await claim_task(coll, "w2", lease_seconds=60, now=T0 + timedelta(seconds=61))
    assert await complete_with_lease(coll, "t1", first["lease"]["token"], {"stale": True}) is None
    assert coll.read("t1")["status"] == "in_progress"
    done = await complete_with_lease(coll, "t1", second["lease"]["token"], {"artifact": "x"})
    assert done["status"] == "completed"


# ─────────────────────────────── policy di retry ───────────────────────────────

@pytest.mark.unit
async def test_plan_retry_transient_uses_backoff_then_blocks():
    d1 = plan_retry(1, retryable=True, error_code="timeout", reason="rete", now=T0)
    assert d1.action == "retry" and d1.status == "pending"
    assert d1.retry_at == T0 + timedelta(seconds=60)
    d2 = plan_retry(2, retryable=True, error_code="timeout", reason="rete", now=T0)
    assert d2.action == "retry" and d2.retry_at == T0 + timedelta(seconds=300)
    d3 = plan_retry(3, retryable=True, error_code="timeout", reason="rete", now=T0)
    assert d3.action == "blocked" and d3.error_code == "attempts_exhausted"


@pytest.mark.unit
async def test_plan_retry_permanent_error_blocks_immediately():
    d = plan_retry(1, retryable=False, error_code="permission_denied", reason="no perm", now=T0)
    assert d.action == "blocked" and d.status == "blocked"
    assert d.error_code == "permission_denied"


@pytest.mark.unit
async def test_plan_retry_rejects_bad_attempt_count():
    with pytest.raises(ValueError):
        plan_retry(0, retryable=True, error_code="x", reason="y")


@pytest.mark.unit
async def test_apply_retry_reschedules_and_releases_lease():
    coll = FakeCollection([_task()])
    claimed = await claim_task(coll, "w1", lease_seconds=60, now=T0)
    token = claimed["lease"]["token"]
    decision = plan_retry(1, retryable=True, error_code="timeout", reason="rete", now=T0)
    updated = await apply_retry(coll, "t1", token, decision, owner_id="carlo")
    assert updated["status"] == "pending"
    assert updated["retry_at"] == T0 + timedelta(seconds=60)
    assert "lease" not in updated  # lease rilasciato → ri-prendibile alla scadenza
    assert updated["next_action"]["owner_id"] == "carlo"
    # token non più valido dopo il rilascio
    assert await apply_retry(coll, "t1", token, decision, owner_id="carlo") is None


@pytest.mark.unit
async def test_apply_retry_blocked_clears_lease_and_retry():
    coll = FakeCollection([_task(attempt_count=2)])
    claimed = await claim_task(coll, "w1", lease_seconds=60, now=T0)
    token = claimed["lease"]["token"]  # attempt_count ora 3
    decision = plan_retry(claimed["attempt_count"], retryable=True, error_code="timeout", reason="rete", now=T0)
    blocked = await apply_retry(coll, "t1", token, decision, owner_id="carlo")
    assert blocked["status"] == "blocked"
    assert blocked["error_code"] == "attempts_exhausted"
    assert "lease" not in blocked and "retry_at" not in blocked


@pytest.mark.unit
async def test_retry_at_in_future_blocks_claim_until_due():
    coll = FakeCollection([_task(retry_at=T0 + timedelta(seconds=300))])
    assert await claim_task(coll, "w1", lease_seconds=60, now=T0) is None
    due = await claim_task(coll, "w1", lease_seconds=60, now=T0 + timedelta(seconds=301))
    assert due is not None and due["status"] == "in_progress"


# ─────────────────────── atomicità: SOLO Mongo reale (non-unit) ───────────────────────

async def _connect_real_mongo():
    """Ritorna (client, db) su Mongo reale o fa skip se non raggiungibile."""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from pymongo.errors import PyMongoError
    except Exception as exc:  # pragma: no cover
        pytest.skip(f"driver mongo assente: {exc}")
    url = os.environ.get("OPS_TEST_MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=800)
    try:
        await client.admin.command("ping")
    except PyMongoError as exc:
        client.close()
        pytest.skip(f"MongoDB reale non raggiungibile ({url}): {exc}")
    return client, client["ops_t05_atomicity_test"]


async def test_two_concurrent_workers_exactly_one_wins():
    """Prova d'atomicità sotto contesa: N claim concorrenti su UN task, un solo
    vincitore. Richiede Mongo reale — un mock a thread singolo non lo dimostra."""
    client, db = await _connect_real_mongo()
    try:
        for round_no in range(5):
            await db.agent_tasks.delete_many({})
            await db.agent_tasks.insert_one(_task())
            now = datetime.now(timezone.utc)
            results = await asyncio.gather(
                *(claim_task(db.agent_tasks, f"w{i}", lease_seconds=60, now=now) for i in range(24))
            )
            winners = [r for r in results if r is not None]
            assert len(winners) == 1, f"round {round_no}: un solo worker deve vincere, non {len(winners)}"
            assert winners[0]["attempt_count"] == 1
            assert winners[0]["lease"]["owner"].startswith("w")
    finally:
        await db.agent_tasks.delete_many({})
        client.close()


async def test_claim_specific_is_atomic_under_contention():
    """Il gate per-id usato dal worker vivo è atomico: N worker sul medesimo id,
    un solo esecutore. Richiede Mongo reale."""
    client, db = await _connect_real_mongo()
    try:
        for round_no in range(5):
            await db.agent_tasks.delete_many({})
            await db.agent_tasks.insert_one(_task("solo"))
            now = datetime.now(timezone.utc)
            results = await asyncio.gather(
                *(claim_specific(db.agent_tasks, "solo", f"w{i}", lease_seconds=60, now=now) for i in range(24))
            )
            winners = [r for r in results if r is not None]
            assert len(winners) == 1, f"round {round_no}: un solo worker deve eseguire, non {len(winners)}"
            assert winners[0]["attempt_count"] == 1
    finally:
        await db.agent_tasks.delete_many({})
        client.close()
