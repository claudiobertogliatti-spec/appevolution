"""T09 — salute runtime, arresto controllato dei claim, proprietario unico dei periodici.

Tutti ``unit``. Coprono gli scenari del piano: worker assente, Redis indisponibile,
heartbeat vecchio, API sana con worker separato sano.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from services.operational_tasks.runtime import (
    ClaimGate,
    RuntimeHealth,
    claim_periodic_window,
    classify_runtime_health,
    is_claim_suspended,
    periodic_window_key,
)

pytestmark = pytest.mark.unit

T0 = datetime(2026, 9, 9, 12, 0, 0, tzinfo=timezone.utc)


# ─────────────────────────────── salute runtime ───────────────────────────────

def test_redis_down_is_down():
    assert classify_runtime_health(
        is_worker_service=True, redis_ok=False, local_worker_alive=True, heartbeat_age_seconds=1
    ) is RuntimeHealth.DOWN


def test_worker_service_alive_and_fresh_is_healthy():
    assert classify_runtime_health(
        is_worker_service=True, redis_ok=True, local_worker_alive=True, heartbeat_age_seconds=10
    ) is RuntimeHealth.HEALTHY


def test_worker_service_process_absent_is_down():
    assert classify_runtime_health(
        is_worker_service=True, redis_ok=True, local_worker_alive=False, heartbeat_age_seconds=None
    ) is RuntimeHealth.DOWN


def test_stale_heartbeat_is_degraded():
    assert classify_runtime_health(
        is_worker_service=True, redis_ok=True, local_worker_alive=True,
        heartbeat_age_seconds=999, heartbeat_max_age_seconds=180,
    ) is RuntimeHealth.DEGRADED


def test_api_instance_never_declares_separate_worker_down():
    # L'istanza API non vede il processo worker: senza heartbeat è UNKNOWN, non DOWN.
    assert classify_runtime_health(
        is_worker_service=False, redis_ok=True, local_worker_alive=None, heartbeat_age_seconds=None
    ) is RuntimeHealth.UNKNOWN_SEPARATE


def test_api_instance_healthy_when_shared_heartbeat_is_fresh():
    assert classify_runtime_health(
        is_worker_service=False, redis_ok=True, local_worker_alive=None, heartbeat_age_seconds=30
    ) is RuntimeHealth.HEALTHY


def test_api_instance_degraded_when_shared_heartbeat_is_stale():
    assert classify_runtime_health(
        is_worker_service=False, redis_ok=True, local_worker_alive=None,
        heartbeat_age_seconds=600, heartbeat_max_age_seconds=180,
    ) is RuntimeHealth.DEGRADED


# ─────────────────────────── arresto controllato dei claim ───────────────────────────

def test_no_suspension_allows_claim():
    assert is_claim_suspended([], "delivery").allowed is True


def test_department_suspension_blocks_that_department_only():
    susp = [{"department_id": "delivery", "reason": "manutenzione"}]
    assert is_claim_suspended(susp, "delivery").allowed is False
    assert is_claim_suspended(susp, "vendite").allowed is True


def test_global_suspension_blocks_all_departments():
    susp = [{"department_id": None, "reason": "stop totale"}]
    assert is_claim_suspended(susp, "delivery").allowed is False
    assert is_claim_suspended(susp, "acquisizione").allowed is False


def test_capability_scoped_suspension():
    susp = [{"department_id": "delivery", "capability": "delivery.generate_positioning"}]
    assert is_claim_suspended(susp, "delivery", "delivery.generate_positioning").allowed is False
    assert is_claim_suspended(susp, "delivery", "delivery.case_study_evidence_check").allowed is True


def test_resolved_suspension_is_ignored():
    susp = [{"department_id": "delivery", "resolved": True}]
    assert is_claim_suspended(susp, "delivery").allowed is True


# ─────────────────────────── proprietario unico dei periodici ───────────────────────────

def test_periodic_window_key_stable_within_window_and_changes_across():
    from datetime import timedelta
    a = periodic_window_key("briefing", T0, 300)
    b = periodic_window_key("briefing", T0 + timedelta(seconds=299), 300)
    c = periodic_window_key("briefing", T0 + timedelta(seconds=300), 300)
    assert a == b and a != c


class _UpsertResult:
    def __init__(self, upserted_id):
        self.upserted_id = upserted_id


class FakeWindowCollection:
    def __init__(self):
        self.keys = set()

    async def update_one(self, query, update, upsert=False):
        key = query["_id"]
        if key in self.keys:
            return _UpsertResult(None)
        self.keys.add(key)
        return _UpsertResult(key)


async def test_only_one_owner_per_window():
    coll = FakeWindowCollection()
    key = periodic_window_key("briefing", T0, 300)
    first = await claim_periodic_window(coll, "briefing", key)
    second = await claim_periodic_window(coll, "briefing", key)
    assert first is True and second is False
    # finestra successiva: di nuovo un proprietario
    from datetime import timedelta
    key2 = periodic_window_key("briefing", T0 + timedelta(seconds=300), 300)
    assert await claim_periodic_window(coll, "briefing", key2) is True


def test_periodic_window_key_rejects_bad_window():
    with pytest.raises(ValueError):
        periodic_window_key("x", T0, 0)
