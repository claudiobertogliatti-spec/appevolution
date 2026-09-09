"""T25 — prospetti compensi/provvigioni/bonus: calcolo deterministico.

Tutti ``unit``. Usano l'artefatto REALE di T23 (`collaboration.validate_rules`) come input.
Scenari del piano: eventi ripetuti, attribuzione doppia/per nome, pagamento parziale, storno,
nuova versione contrattuale (rettifica), bonus discrezionale senza approvazione, regola assente.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.collaboration_compensation import (
    APPROVATO,
    MATURATO,
    NON_CALCOLABILE,
    PAGATO,
    STIMATO,
    close_period,
    compute_prospetto,
    rectify,
)
from services.operational_tasks.collaborations import (
    validate_collaboration_rules,
    validate_rules_input,
)

pytestmark = pytest.mark.unit

DOC = {"storage_ref": "drive://x", "sha256": "h", "version": "v1", "source": "drive"}
HOURLY = {"kind": "hourly", "clause_ref": "art.2", "valid_from": "2026-09-01", "basis": {"hourly_rate": 25}}
COMMISSION = {"kind": "commission", "clause_ref": "art.4", "valid_from": "2026-09-01",
              "basis": {"on": "sale", "percent": 10}, "maturation": "on_payment"}
BONUS = {"kind": "bonus", "clause_ref": "art.5", "valid_from": "2026-09-01",
         "basis": {"amount": 200}, "condition": "obiettivo trimestrale"}
PERIOD = {"start": "2026-09-01", "end": "2026-09-30"}
CID = "mariangela"


def _artifact(rules):
    return validate_collaboration_rules(validate_rules_input(
        {"collaborator_id": CID, "document_ref": dict(DOC), "rules": rules}))


def _line(prospetto, kind, event_ref=None):
    for ln in prospetto["lines"]:
        if ln["kind"] == kind and ln.get("event_ref") == event_ref:
            return ln
    return None


# ─────────────────────────── orario / fisso ───────────────────────────

def test_hourly_amount_is_deterministic_and_explainable():
    p = compute_prospetto(CID, _artifact([HOURLY]), {"approved_minutes": 120}, PERIOD)
    ln = _line(p, "hourly")
    assert ln["amount"] == 50.0 and ln["status"] == MATURATO
    assert ln["formula"] == "approved_minutes/60 * hourly_rate" and ln["clause_ref"] == "art.2"


def test_hourly_rounding_half_up():
    p = compute_prospetto(CID, _artifact([HOURLY]), {"approved_minutes": 100}, PERIOD)
    assert _line(p, "hourly")["amount"] == 41.67  # 100/60*25 = 41.666..


# ─────────────────────────── provvigioni: attribuzione per evento ───────────────────────────

def test_commission_only_for_verified_event_attribution():
    events = [
        {"event_id": "e1", "attributed_collaborator_id": CID, "attribution_verified": True, "base_amount": 1000, "reconciled": True},
        {"event_id": "e2", "attributed_collaborator_id": CID, "attribution_verified": False, "base_amount": 1000, "reconciled": True},  # non verificata
        {"event_id": "e3", "base_amount": 1000, "reconciled": True, "seller_name": "mariangela"},  # attribuzione per NOME → ignorata
    ]
    p = compute_prospetto(CID, _artifact([COMMISSION]), {"sale_events": events}, PERIOD)
    comm = [ln for ln in p["lines"] if ln["kind"] == "commission"]
    assert len(comm) == 1 and comm[0]["event_ref"] == "e1" and comm[0]["amount"] == 100.0


def test_repeated_event_counts_once():
    events = [
        {"event_id": "e1", "attributed_collaborator_id": CID, "attribution_verified": True, "base_amount": 1000, "reconciled": True},
        {"event_id": "e1", "attributed_collaborator_id": CID, "attribution_verified": True, "base_amount": 1000, "reconciled": True},
    ]
    p = compute_prospetto(CID, _artifact([COMMISSION]), {"sale_events": events}, PERIOD)
    assert len([ln for ln in p["lines"] if ln["kind"] == "commission"]) == 1


def test_unreconciled_commission_is_only_estimated():
    events = [{"event_id": "e1", "attributed_collaborator_id": CID, "attribution_verified": True, "base_amount": 1000, "reconciled": False}]
    p = compute_prospetto(CID, _artifact([COMMISSION]), {"sale_events": events}, PERIOD)
    assert _line(p, "commission", "e1")["status"] == STIMATO


def test_refund_event_produces_a_reversal():
    events = [{"event_id": "e1", "attributed_collaborator_id": CID, "attribution_verified": True, "base_amount": 1000, "refunded": True}]
    p = compute_prospetto(CID, _artifact([COMMISSION]), {"sale_events": events}, PERIOD)
    assert _line(p, "commission", "e1")["amount"] == -100.0


# ─────────────────────────── approvazione / pagamento ───────────────────────────

def test_period_approval_and_partial_payment():
    p = compute_prospetto(CID, _artifact([HOURLY]), {"approved_minutes": 120}, PERIOD, period_approved=True,
                          payments=[{"kind": "hourly", "event_ref": None, "authorized": True, "evidence_ref": "bonifico-1"}])
    ln = _line(p, "hourly")
    assert ln["status"] == PAGATO and ln["proof_ref"] == "bonifico-1"


def test_payment_without_evidence_does_not_mark_paid():
    p = compute_prospetto(CID, _artifact([HOURLY]), {"approved_minutes": 120}, PERIOD, period_approved=True,
                          payments=[{"kind": "hourly", "authorized": True}])  # niente evidence_ref
    assert _line(p, "hourly")["status"] == APPROVATO


# ─────────────────────────── bonus discrezionale ───────────────────────────

def test_discretionary_bonus_needs_approval():
    met = compute_prospetto(CID, _artifact([BONUS]), {"bonus": {"condition_met": True, "approved": False}}, PERIOD)
    assert _line(met, "bonus")["status"] == STIMATO  # senza approvazione resta stimato
    ok = compute_prospetto(CID, _artifact([BONUS]), {"bonus": {"condition_met": True, "approved": True}}, PERIOD)
    assert _line(ok, "bonus")["status"] == APPROVATO


# ─────────────────────────── regola assente / non calcolabile ───────────────────────────

def test_missing_rule_is_non_calcolabile_not_zero_in_totals():
    bad = {"kind": "commission", "clause_ref": "art.4", "valid_from": "2026-09-01", "basis": {"percent": 10}}  # manca `on`+maturation
    p = compute_prospetto(CID, _artifact([HOURLY, bad]), {"approved_minutes": 60}, PERIOD)
    nc = [ln for ln in p["lines"] if ln["status"] == NON_CALCOLABILE]
    assert nc and nc[0]["kind"] == "commission"
    assert "commission" in p["non_calcolabile"]
    # il totale non contiene la provvigione non calcolabile (non è uno zero silenzioso)
    assert p["totals"][MATURATO] == 25.0  # solo l'orario


# ─────────────────────────── chiusura + rettifica ───────────────────────────

def test_close_period_is_immutable_and_rectification_is_explicit():
    p = compute_prospetto(CID, _artifact([HOURLY]), {"approved_minutes": 120}, PERIOD, period_approved=True)
    snap = close_period(p, approver="claudio@x.it", version="2026-09")
    assert snap["closed"] is True and snap["hash"]
    rect = rectify(snap, delta_amount=-10.0, kind="hourly", actor="claudio@x.it", reason="storno tardivo")
    assert rect["type"] == "rectification" and rect["rectifies_version"] == "2026-09"
    assert rect["rectifies_hash"] == snap["hash"] and rect["delta_amount"] == -10.0
    # lo snapshot chiuso non è cambiato
    assert snap["totals"][APPROVATO] == 50.0


def test_rectify_requires_closed_and_reason():
    p = compute_prospetto(CID, _artifact([HOURLY]), {"approved_minutes": 60}, PERIOD)
    with pytest.raises(ValueError):
        rectify(p, delta_amount=1.0, kind="hourly", actor="x", reason="r")  # non chiuso
    snap = close_period(p, approver="x", version="v1")
    with pytest.raises(ValueError):
        rectify(snap, delta_amount=1.0, kind="hourly", actor="x", reason="  ")  # motivo vuoto
