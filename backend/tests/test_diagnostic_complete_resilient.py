"""
Unit test: /diagnostic/complete degrada con grazia quando Matteo fallisce.

Il fallimento di Matteo (credito API, JSON malformato, timeout) NON deve bloccare
l'acquisizione: /complete deve rispondere 200 (CompleteResponse) così il frontend
mostra il popup Cal.com. L'analisi si rigenera dopo (sessioni con `report_error`).

Mongo / Anthropic (scoring + Matteo) / Systeme sono mockati: gira in CI senza rete.
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import routers.diagnostic as diag
from routers.diagnostic import CompleteRequest, CompleteResponse, complete_diagnostic
from services.ciak_matteo import MatteoServiceError

pytestmark = pytest.mark.unit


_RESPONSES = {
    "q1_competenza": "Public speaking e comunicazione efficace per professionisti.",
    "q2_esperienza": "La pratico da dieci anni, prima in azienda poi da libero.",
    "q3_clienti": "Ho seguito manager bloccati, uno ha parlato a una convention.",
    "q4_idea": "Un corso online di public speaking con esercizi e feedback.",
    "q5_target": "Manager 35-50 che devono parlare in pubblico e hanno paura.",
    "q6_problema": "La paura di parlare in pubblico e di bloccarsi davanti agli altri.",
    "q7_digitale": "Uso Instagram e LinkedIn, non ho mai venduto online.",
    "q8_obiettivo": "Lavorare da casa e avere piu tempo per la famiglia.",
}


class _FakeSessions:
    """Collezione Mongo fake: find_one/replace_one async, registra l'ultimo doc salvato."""

    def __init__(self, doc):
        self._doc = doc
        self.saved = None

    async def find_one(self, _query):
        return self._doc

    async def replace_one(self, _query, doc):
        self.saved = doc
        return MagicMock(modified_count=1)


class _FakeDB:
    def __init__(self, doc):
        self.diagnostic_sessions = _FakeSessions(doc)


def _fake_scoring():
    s = MagicMock()
    s.stato_finale = 2
    s.score_numerico = 40
    s.override_applicati = []
    s.to_dict.return_value = {"stato_finale": 2, "score_0_100": 40}
    return s


def _session_doc():
    return {
        "session_token": "tok-test",
        "user_email": "test@example.com",
        "user_name": "Test",
        "responses": dict(_RESPONSES),
        "report": None,
        "current_state": "ciak_started",
        "state_history": [],
        "crm_tags": [],
        "events": [],
    }


@pytest.mark.asyncio
async def test_complete_degrada_se_matteo_fallisce(monkeypatch):
    """Matteo solleva → /complete NON deve sollevare 503, ma ritornare 200 (popup)."""
    fake_db = _FakeDB(_session_doc())
    monkeypatch.setattr(diag, "db", fake_db)

    emitted = {}

    async def _fake_emit(**kwargs):
        emitted.update(kwargs)

    with patch.object(diag, "calculate_scoring_ai", AsyncMock(return_value=_fake_scoring())), \
            patch.object(diag, "generate_report",
                         AsyncMock(side_effect=MatteoServiceError("credit balance too low"))), \
            patch.object(diag, "ciak_emit_event", _fake_emit):
        res = await complete_diagnostic(CompleteRequest(session_token="tok-test"))
        # lascia girare il fire-and-forget di ciak_emit_event (asyncio.create_task)
        await asyncio.sleep(0)

    # 200: risposta valida → il frontend passa a phase "done" e mostra il popup
    assert isinstance(res, CompleteResponse)
    assert res.stato == 2
    assert res.session_token == "tok-test"
    # la sessione salvata è marcata per la rigenerazione, senza report
    saved = fake_db.diagnostic_sessions.saved
    assert saved is not None
    assert "report_error" in saved
    assert saved.get("report") is None
    # ciak_completed emesso comunque (→ mail di recupero), senza i tag Matteo
    assert emitted.get("event_name") == "ciak_completed"
    assert emitted["metadata"]["report_generated"] is False


@pytest.mark.asyncio
async def test_complete_ok_quando_matteo_funziona(monkeypatch):
    """Percorso felice: report generato → 200 + report salvato, nessun report_error."""
    fake_db = _FakeDB(_session_doc())
    monkeypatch.setattr(diag, "db", fake_db)

    report = {
        "report_markdown": "## Analisi\nTesto.",
        "tags": {
            "tag_segment": "segment_formatore",
            "tag_digital_level": "digital_level_base",
            "tag_obiettivo": "obiettivo_liberta",
        },
    }

    async def _fake_emit(**kwargs):
        pass

    with patch.object(diag, "calculate_scoring_ai", AsyncMock(return_value=_fake_scoring())), \
            patch.object(diag, "generate_report", AsyncMock(return_value=report)), \
            patch.object(diag, "ciak_emit_event", _fake_emit):
        res = await complete_diagnostic(CompleteRequest(session_token="tok-test"))
        await asyncio.sleep(0)

    assert isinstance(res, CompleteResponse)
    saved = fake_db.diagnostic_sessions.saved
    assert saved.get("report") == report
    assert "report_error" not in saved
