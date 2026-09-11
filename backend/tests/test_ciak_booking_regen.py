"""
Unit test per:
  1. booking._find_diagnostic_by_email → aggancia i lead del funnel GRATUITO
     (stato report_generated / ciak_completed), non solo purchased_67+.
  2. ciak_admin.regenerate_missing_reports → rigenera le sessioni degradate
     (report mancante / report_error) riusando /diagnostic/complete.

Mongo è mockato: gira in CI senza rete.
"""
from unittest.mock import AsyncMock, patch

import pytest

import routers.booking as bk
import routers.ciak_admin as adm

pytestmark = pytest.mark.unit


# ─── 1. Booking lookup ───────────────────────────────────────────────

class _FindCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    async def to_list(self, length=None):
        return self._docs


class _BookingSessions:
    def __init__(self, doc):
        self.doc = doc

    def find(self, query, *a, **k):
        states = query["current_state"]["$in"]
        match = self.doc.get("current_state") in states and self.doc.get("user_email") == query["user_email"]
        return _FindCursor([self.doc] if match else [])


class _BookingDB:
    def __init__(self, doc):
        self.diagnostic_sessions = _BookingSessions(doc)


@pytest.mark.parametrize("state", ["report_generated", "ciak_completed", "purchased_67"])
@pytest.mark.asyncio
async def test_booking_finds_lead_in_bookable_states(state, monkeypatch):
    doc = {"user_email": "lead@ciak.it", "current_state": state, "session_token": "t"}
    monkeypatch.setattr(bk, "db", _BookingDB(doc))
    found = await bk._find_diagnostic_by_email("lead@ciak.it")
    assert found is not None
    assert found["current_state"] == state


@pytest.mark.asyncio
async def test_booking_ignores_incomplete_state(monkeypatch):
    doc = {"user_email": "lead@ciak.it", "current_state": "ciak_started", "session_token": "t"}
    monkeypatch.setattr(bk, "db", _BookingDB(doc))
    found = await bk._find_diagnostic_by_email("lead@ciak.it")
    assert found is None


# ─── 2. Rigenerazione report ─────────────────────────────────────────

class _AsyncCursor:
    def __init__(self, docs):
        self._docs = docs

    def limit(self, *a, **k):
        return self

    def __aiter__(self):
        self._i = 0
        return self

    async def __anext__(self):
        if self._i >= len(self._docs):
            raise StopAsyncIteration
        d = self._docs[self._i]
        self._i += 1
        return d


class _RegenDB:
    def __init__(self, degraded, report_after):
        self._degraded = degraded
        self._report_after = report_after

    @property
    def diagnostic_sessions(self):
        return self

    def find(self, query, projection=None):
        self.last_query = query
        return _AsyncCursor(self._degraded)

    async def find_one(self, query, projection=None):
        return {"report": self._report_after}

    async def update_one(self, query, update):
        self.unset_calls = getattr(self, "unset_calls", 0) + 1
        return None


@pytest.mark.asyncio
async def test_regenerate_counts_success(monkeypatch):
    degraded = [{"session_token": "a"}, {"session_token": "b"}]
    fake = _RegenDB(degraded, report_after={"report_markdown": "ok"})
    monkeypatch.setattr(adm, "db", fake)
    # complete_diagnostic è importato lazy dentro la funzione → patch sul modulo sorgente
    with patch("routers.diagnostic.complete_diagnostic", AsyncMock(return_value=None)):
        out = await adm.regenerate_missing_reports(admin=object(), limit=10, dry_run=False)
    assert out["found"] == 2
    assert out["regenerated"] == 2
    assert out["still_failing"] == 0
    assert out["regenerated_tokens"] == ["a", "b"]
    # il flag storico report_error viene ripulito dopo ogni rigenerazione riuscita
    assert getattr(fake, "unset_calls", 0) == 2
    # il filtro NON deve ripescare per report_error (evita loop)
    assert "report_error" not in str(fake.last_query)


@pytest.mark.asyncio
async def test_regenerate_dry_run_counts_only(monkeypatch):
    degraded = [{"session_token": "a"}, {"session_token": "b"}]
    monkeypatch.setattr(adm, "db", _RegenDB(degraded, report_after={"report_markdown": "ok"}))
    called = AsyncMock(return_value=None)
    with patch("routers.diagnostic.complete_diagnostic", called):
        out = await adm.regenerate_missing_reports(admin=object(), limit=10, dry_run=True)
    assert out["found"] == 2
    assert out["regenerated"] == 0
    assert out["tokens"] == ["a", "b"]
    called.assert_not_awaited()  # dry_run: nessuna chiamata AI


@pytest.mark.asyncio
async def test_regenerate_reports_still_failing_when_no_report(monkeypatch):
    degraded = [{"session_token": "a"}]
    # dopo il complete il report resta assente → still_failing
    monkeypatch.setattr(adm, "db", _RegenDB(degraded, report_after=None))
    with patch("routers.diagnostic.complete_diagnostic", AsyncMock(return_value=None)):
        out = await adm.regenerate_missing_reports(admin=object(), limit=10, dry_run=False)
    assert out["found"] == 1
    assert out["regenerated"] == 0
    assert out["still_failing"] == 1


@pytest.mark.asyncio
async def test_regenerate_handles_exception(monkeypatch):
    degraded = [{"session_token": "boom"}]
    monkeypatch.setattr(adm, "db", _RegenDB(degraded, report_after=None))
    with patch("routers.diagnostic.complete_diagnostic", AsyncMock(side_effect=RuntimeError("x"))):
        out = await adm.regenerate_missing_reports(admin=object(), limit=10, dry_run=False)
    assert out["found"] == 1
    assert out["still_failing"] == 1
    assert out["errors"] and out["errors"][0]["session_token"] == "boom"
