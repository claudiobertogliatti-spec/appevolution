"""T12 — flusso Delivery: posizionamento versionato + prove per i casi studio.

Tutti ``unit``. Coprono gli scenari del piano: revisione rifiutata, nuovo input durante
approvazione, file non disponibile, callback video duplicata, assenza di consenso,
ricavo senza prova del risultato.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.completion import execute_and_verify_registered
from services.operational_tasks.contracts import TaskInputError
from services.operational_tasks.delivery import (
    CASE_STUDY_EVIDENCE,
    GENERATE_POSITIONING,
    case_study_evidence_check,
    generate_positioning,
    register,
    validate_case_study_input,
    validate_positioning_input,
)
from services.operational_tasks.registry import TaskRegistry

pytestmark = pytest.mark.unit


def _registry():
    r = TaskRegistry()
    register(r)
    return r


def _task(task_type, payload):
    return {"id": "t-del-1", "task_type": task_type, "operational_contract": {"input_version": 1, "payload": payload}}


BASE = {"partner_id": "p1", "content_ref": "file-1", "prerequisites": {"required": ["brand"], "present": ["brand"]}}


def _pos(deliverable):
    return generate_positioning({"deliverable": deliverable})


# ─────────────────────────── posizionamento: prerequisiti e versione ───────────────────────────

def test_missing_prerequisites_requests_precise_input():
    art = _pos({"partner_id": "p1", "prerequisites": {"required": ["brand", "offerta"], "present": ["brand"]}})
    assert art["status"] == "blocked_missing_input"
    assert art["missing_input"] == ["offerta"]
    assert "offerta" in art["next_action"]["request"]


async def test_positioning_ready_for_review_completes_via_engine():
    outcome = await execute_and_verify_registered(_task(GENERATE_POSITIONING, {"deliverable": BASE}), _registry())
    assert outcome.completed is True
    art = outcome.result["artifact"]
    assert art["status"] == "ready_for_review" and art["availability"] == "pending_review"
    assert art["requires_review"] is True


def test_approved_same_version_becomes_available():
    v = _pos(BASE)["version"]
    art = _pos({**BASE, "review_state": "approved", "approved_version": v})
    assert art["status"] == "available" and art["availability"] == "available"
    assert art.get("availability_ref")


def test_new_input_during_approval_is_not_auto_reapproved():
    v = _pos(BASE)["version"]
    # contenuto cambiato ma approvazione riferita alla versione vecchia → niente riapprovazione
    art = _pos({**BASE, "content_ref": "file-2", "review_state": "approved", "approved_version": v})
    assert art["status"] == "ready_for_review"
    assert art["availability"] != "available"


def test_rejected_review_requests_changes_and_is_unavailable():
    art = _pos({**BASE, "review_state": "rejected"})
    assert art["status"] == "changes_requested" and art["availability"] == "unavailable"


def test_approved_but_file_missing_is_not_available():
    base_nofile = {"partner_id": "p1", "prerequisites": {"required": [], "present": []}}
    v = _pos(base_nofile)["version"]
    art = _pos({**base_nofile, "review_state": "approved", "approved_version": v})
    assert art["availability"] == "unavailable"
    assert any("file non disponibile" in r for r in art["reasons"])


# ─────────────────────────── video come attività figlia monitorata ───────────────────────────

def test_video_is_monitored_child_not_andrea_fallback():
    base_v = {"partner_id": "p1", "prerequisites": {"required": [], "present": []}, "includes_video": True, "video_ref": "vid-1"}
    art = _pos(base_v)
    child = art["child_activities"][0]
    assert child["type"] == "video" and child["task_type"] == "video.render" and child["monitored"] is True
    assert "andrea" not in repr(child).lower()


def test_duplicate_video_callback_is_idempotent():
    base_v = {"partner_id": "p1", "prerequisites": {"required": [], "present": []}, "includes_video": True, "video_ref": "vid-1"}
    a = _pos(base_v)["child_activities"][0]["idempotency_key"]
    b = _pos(dict(base_v))["child_activities"][0]["idempotency_key"]
    assert a == b


def test_positioning_requires_partner_id():
    with pytest.raises(TaskInputError):
        validate_positioning_input({"deliverable": {"content_ref": "x"}})


# ─────────────────────────── casi studio: consenso, prova, approvazione ───────────────────────────

def _cs(case_study):
    return case_study_evidence_check({"case_study": case_study})


RISULTATO = {"nome": "Mario", "prima": "zero", "dopo": "primi clienti", "prova": "+30% in 60 giorni"}


def test_no_consent_is_blocked_never_published():
    art = _cs({"partner_id": "p1", "risultato": RISULTATO, "consent": False, "approved": True})
    assert art["status"] == "blocked" and art["published"] is False
    assert any("consenso" in r for r in art["reasons"])


def test_result_without_measured_proof_is_blocked():
    art = _cs({"partner_id": "p1", "risultato": {**RISULTATO, "prova": ""}, "consent": True, "approved": True})
    assert art["status"] == "blocked"
    assert any("prova" in r for r in art["reasons"])


def test_consent_and_proof_without_approval_is_candidate():
    art = _cs({"partner_id": "p1", "risultato": RISULTATO, "consent": True, "approved": False})
    assert art["status"] == "candidate"


async def test_consent_proof_approval_is_verifiable_via_engine():
    payload = {"case_study": {"partner_id": "p1", "risultato": RISULTATO, "consent": True, "approved": True}}
    outcome = await execute_and_verify_registered(_task(CASE_STUDY_EVIDENCE, payload), _registry())
    assert outcome.completed is True
    art = outcome.result["artifact"]
    assert art["status"] == "verifiable" and art["published"] is False
    assert art["evidence_refs"]


def test_case_study_requires_partner_id():
    with pytest.raises(TaskInputError):
        validate_case_study_input({"case_study": {"consent": True}})


def test_case_study_never_reports_published_status():
    for consent in (True, False):
        for approved in (True, False):
            art = _cs({"partner_id": "p1", "risultato": RISULTATO, "consent": consent, "approved": approved})
            assert art["status"] in ("candidate", "verifiable", "blocked")
            assert art["published"] is False
