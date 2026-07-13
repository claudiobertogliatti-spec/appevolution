from types import SimpleNamespace

import pytest

from services.collaborator_settlements import (
    build_settlement,
    calculate_difference,
    can_manage_collaborator_billing,
    validate_transition,
)

pytestmark = pytest.mark.unit


def test_build_settlement_snapshots_approved_work():
    tasks = [
        {"task_id": "a", "approved_minutes": 60, "approved_amount": 20.0, "hourly_rate": 20.0},
        {"task_id": "b", "approved_minutes": 90, "approved_amount": 30.0, "hourly_rate": 20.0},
    ]
    doc = build_settlement("antonella", "2026-07-06", "2026-07-12", tasks, "claudio")
    assert doc["task_ids"] == ["a", "b"]
    assert doc["approved_minutes"] == 150
    assert doc["calculated_amount"] == 50.0
    assert doc["hourly_rate_snapshot"] == 20.0
    assert doc["status"] == "draft"


def test_build_settlement_rejects_empty_or_mixed_rates():
    with pytest.raises(ValueError, match="Nessuna"):
        build_settlement("antonella", "2026-07-06", "2026-07-12", [], "claudio")
    with pytest.raises(ValueError, match="tariffe diverse"):
        build_settlement("antonella", "2026-07-06", "2026-07-12", [
            {"task_id": "a", "approved_minutes": 60, "approved_amount": 20, "hourly_rate": 20},
            {"task_id": "b", "approved_minutes": 60, "approved_amount": 30, "hourly_rate": 30},
        ], "claudio")


def test_invoice_difference_requires_note_before_to_pay():
    settlement = {"status": "to_verify", "calculated_amount": 100, "invoice": {"amount": 110}}
    with pytest.raises(ValueError, match="nota"):
        validate_transition(settlement, "to_pay", {"difference_note": ""})
    validate_transition(settlement, "to_pay", {"difference_note": "Rimborso spese"})


def test_payment_difference_requires_note():
    settlement = {"status": "to_pay", "invoice": {"amount": 110}}
    with pytest.raises(ValueError, match="nota"):
        validate_transition(settlement, "paid", {"amount": 100, "note": ""})
    validate_transition(settlement, "paid", {"amount": 100, "note": "Acconto concordato"})


def test_invalid_transition_is_rejected():
    with pytest.raises(ValueError, match="Passaggio non consentito"):
        validate_transition({"status": "draft"}, "paid", {})


def test_money_difference_is_decimal_safe():
    assert calculate_difference(0.3, 0.1 + 0.2) == 0


def test_antonella_cannot_manage_billing():
    assert not can_manage_collaborator_billing(SimpleNamespace(role="admin", admin_type="antonella"))
    assert can_manage_collaborator_billing(SimpleNamespace(role="admin", admin_type="claudio"))
    assert can_manage_collaborator_billing(SimpleNamespace(role="superadmin", admin_type=None))
