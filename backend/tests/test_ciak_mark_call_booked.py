"""
Unit test: conferma manuale della call fissata (POST /lead/mark-call-booked).

Serve al canale Mariangela: lei fissa la call a voce nel gruppo WhatsApp, non
tramite il popup Cal.com self-service (disattivato per quel canale). Senza
questa conferma manuale, i suoi lead restavano bloccati per sempre a
"report_generated" — mai raggiungevano call_booked/call_done nella pipeline.

Mongo e Systeme sono mockati: gira in CI senza rete.
"""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import routers.ciak_admin as admin_router
from routers.ciak_admin import MarkCallBookedRequest, ciak_mark_call_booked

pytestmark = pytest.mark.unit

_FAKE_ADMIN = SimpleNamespace(email="admin@evolution-pro.it", user_id="admin-1")


class _FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *_args, **_kwargs):
        return self

    async def to_list(self, _n):
        return list(self._docs)


class _FakeSessions:
    def __init__(self, doc):
        # doc singolo, lista (dalla più recente) oppure None
        self._docs = doc if isinstance(doc, list) else ([doc] if doc else [])
        self.saved = None

    def find(self, _query):
        return _FakeCursor(self._docs)

    async def replace_one(self, _query, doc):
        self.saved = doc
        return MagicMock(modified_count=1)


class _FakeDB:
    def __init__(self, doc):
        self.diagnostic_sessions = _FakeSessions(doc)


def _diag(state="report_generated"):
    return {
        "_id": "oid-1",
        "session_token": "tok-test",
        "user_email": "lead@example.com",
        "current_state": state,
        "state_history": [],
        "crm_tags": [],
        "events": [],
    }


@pytest.mark.asyncio
async def test_conferma_call_transizione_a_call_booked(monkeypatch):
    fake_db = _FakeDB(_diag("report_generated"))
    monkeypatch.setattr(admin_router, "db", fake_db)

    emitted = {}

    async def _fake_emit(**kwargs):
        emitted.update(kwargs)

    with patch("services.ciak_systeme.ciak_emit_event", _fake_emit):
        res = await ciak_mark_call_booked(
            MarkCallBookedRequest(email="lead@example.com", starts_at="2026-10-01T10:00:00Z"),
            admin=_FAKE_ADMIN,
        )
        await asyncio.sleep(0)  # lascia girare il fire-and-forget

    assert res["ok"] is True
    assert res["current_state"] == "call_booked"
    assert res["already_booked"] is False
    saved = fake_db.diagnostic_sessions.saved
    assert saved is not None
    assert saved["current_state"] == "call_booked"
    assert saved["state_history"][-1]["state"] == "call_booked"
    assert "ciak_call_booked" in saved["crm_tags"]
    assert emitted.get("event_name") == "ciak_call_booked"


@pytest.mark.asyncio
async def test_conferma_call_idempotente_se_gia_fissata(monkeypatch):
    """Se lo stato è già call_booked (o oltre), non fa nulla — niente doppio evento."""
    fake_db = _FakeDB(_diag("call_booked"))
    monkeypatch.setattr(admin_router, "db", fake_db)

    res = await ciak_mark_call_booked(
        MarkCallBookedRequest(email="lead@example.com"), admin=_FAKE_ADMIN
    )

    assert res["already_booked"] is True
    assert fake_db.diagnostic_sessions.saved is None  # nessuna scrittura


@pytest.mark.asyncio
async def test_conferma_call_non_retrocede_uno_stato_piu_avanzato(monkeypatch):
    """call_done è più avanti di call_booked: la conferma manuale non deve regredirlo."""
    fake_db = _FakeDB(_diag("call_done"))
    monkeypatch.setattr(admin_router, "db", fake_db)

    res = await ciak_mark_call_booked(
        MarkCallBookedRequest(email="lead@example.com"), admin=_FAKE_ADMIN
    )

    assert res["already_booked"] is True
    assert res["current_state"] == "call_done"
    assert fake_db.diagnostic_sessions.saved is None


@pytest.mark.asyncio
async def test_conferma_call_404_se_lead_inesistente(monkeypatch):
    fake_db = _FakeDB(None)
    monkeypatch.setattr(admin_router, "db", fake_db)

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await ciak_mark_call_booked(
            MarkCallBookedRequest(email="nessuno@example.com"), admin=_FAKE_ADMIN
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_conferma_call_sceglie_la_sessione_piu_avanzata(monkeypatch):
    """Questionario rifatto: la sessione più recente è solo iniziata, l'analisi
    sta in una precedente. La conferma agisce su quella con l'analisi (prima: 409)."""
    nuova = _diag("ciak_started")
    nuova["_id"] = "oid-nuova"
    vecchia = _diag("report_generated")
    vecchia["_id"] = "oid-vecchia"
    fake_db = _FakeDB([nuova, vecchia])
    monkeypatch.setattr(admin_router, "db", fake_db)

    async def _fake_emit(**kwargs):
        pass

    with patch("services.ciak_systeme.ciak_emit_event", _fake_emit):
        res = await ciak_mark_call_booked(
            MarkCallBookedRequest(email="lead@example.com"), admin=_FAKE_ADMIN
        )
        await asyncio.sleep(0)

    assert res["current_state"] == "call_booked"
    assert fake_db.diagnostic_sessions.saved["_id"] == "oid-vecchia"


@pytest.mark.asyncio
async def test_conferma_call_409_se_nessuna_sessione_ha_l_analisi(monkeypatch):
    from fastapi import HTTPException

    fake_db = _FakeDB([_diag("ciak_started"), _diag("ciak_started")])
    monkeypatch.setattr(admin_router, "db", fake_db)

    with pytest.raises(HTTPException) as exc_info:
        await ciak_mark_call_booked(
            MarkCallBookedRequest(email="lead@example.com"), admin=_FAKE_ADMIN
        )
    assert exc_info.value.status_code == 409
