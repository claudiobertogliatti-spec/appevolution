"""T13 — flusso Back office: scadenza riconciliata e attività di recupero.

Tutti ``unit``. Scenari del piano: rata priva di data, sospensione solleciti, rata incoerente,
evento ripetuto, pagamento non riconciliato, zero numerico diverso da dato mancante.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.back_office import (
    CHECK_DUE_ITEM,
    CHECK_DUE_ITEM_CAPABILITY,
    check_due_item,
    register,
    validate_due_item_input,
)
from services.operational_tasks.completion import execute_and_verify_registered
from services.operational_tasks.contracts import TaskInputError
from services.operational_tasks.registry import TaskRegistry

pytestmark = pytest.mark.unit


def _registry():
    r = TaskRegistry()
    register(r)
    return r


def _chk(item):
    return check_due_item({"due_item": item})


BASE = {
    "partner_id": "p1", "tipo": "rate_concordate",
    "rate_totali": 5, "rate_pagate": 2, "importo_rata": 240.0,
    "prossima_scadenza": "2026-09-15",
}


# ─────────────────────────── anomalie ───────────────────────────

def test_incoherent_plan_is_anomaly():
    art = _chk({**BASE, "rate_totali": 2, "rate_pagate": 9})
    assert art["status"] == "anomaly" and art["anomaly"] == "rate_incoerenti"
    assert art["activity"] is not None


def test_missing_amount_is_anomaly_but_zero_is_not():
    missing = _chk({**BASE, "importo_rata": None})
    assert missing["status"] == "anomaly" and missing["anomaly"] == "importo_mancante"
    zero = _chk({**BASE, "importo_rata": 0})
    assert zero["anomaly"] != "importo_mancante"  # zero è un valore reale, non un dato mancante


def test_due_item_without_date_is_anomaly():
    art = _chk({**BASE, "prossima_scadenza": None})
    assert art["status"] == "anomaly" and art["anomaly"] == "scadenza_mancante"


# ─────────────────────────── stati di riconciliazione ───────────────────────────

def test_no_proof_future_date_is_expected_no_reminder():
    art = _chk({**BASE, "as_of": "2026-09-10"})
    assert art["status"] == "atteso" and art["overdue"] is False
    assert art["reminder_draft"] is None


def test_overdue_without_proof_is_never_marked_paid():
    art = _chk({**BASE, "as_of": "2026-09-20"})
    assert art["status"] == "atteso" and art["overdue"] is True  # mai "incassato" per la data
    assert art["activity"] is not None
    assert art["reminder_draft"]["status"] == "draft"  # solo bozza


def test_suspended_reminders_prepare_no_draft():
    art = _chk({**BASE, "as_of": "2026-09-20", "reminders_suspended": True})
    assert art["status"] == "sospeso"
    assert art["reminder_draft"] is None


def test_reconciled_proof_matching_amount_is_verified():
    art = _chk({**BASE, "payment_proof": {"amount": 240.0, "reconciled": True}})
    assert art["status"] == "incassato_verificato"


def test_unreconciled_or_mismatch_is_to_confirm():
    mismatch = _chk({**BASE, "payment_proof": {"amount": 100.0, "reconciled": True}})
    assert mismatch["status"] == "esito_da_confermare"
    unrec = _chk({**BASE, "payment_proof": {"amount": 240.0, "reconciled": False}})
    assert unrec["status"] == "esito_da_confermare"


def test_all_rate_paid_is_completed():
    art = _chk({**BASE, "rate_pagate": 5})
    assert art["status"] == "completed"


# ─────────────────────────── idempotenza / motore / vincoli ───────────────────────────

def test_repeated_event_is_idempotent_and_never_counts_twice():
    a = _chk(BASE)
    b = _chk(dict(BASE))
    assert a["check_ref"] == b["check_ref"] and a["status"] == b["status"]
    # il modello non incrementa le rate: classifica soltanto
    assert "rate_pagate" not in a


async def test_completes_via_engine():
    outcome = await execute_and_verify_registered(
        {"id": "t", "task_type": CHECK_DUE_ITEM, "operational_contract": {"input_version": 1, "payload": {"due_item": BASE}}},
        _registry(),
    )
    assert outcome.completed is True
    assert outcome.result["artifact"]["explain"]["rata_corrente"] == 3


def test_no_economic_action_is_performed():
    assert CHECK_DUE_ITEM_CAPABILITY.policy.external_effects is False
    assert CHECK_DUE_ITEM_CAPABILITY.policy.requires_approval is False
    blob = repr(_chk({**BASE, "as_of": "2026-09-20"})).lower()
    assert "charged" not in blob and "refunded" not in blob and "paid_now" not in blob


def test_requires_partner_id():
    with pytest.raises(TaskInputError):
        validate_due_item_input({"due_item": {"rate_totali": 5}})
