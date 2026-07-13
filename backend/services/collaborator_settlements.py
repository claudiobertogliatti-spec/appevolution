"""Regole di dominio per le liquidazioni dei collaboratori Ciak."""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4


TRANSITIONS = {
    "draft": {"awaiting_invoice", "cancelled"},
    "awaiting_invoice": {"to_verify", "cancelled"},
    "to_verify": {"to_pay", "cancelled"},
    "to_pay": {"paid", "cancelled"},
    "paid": {"cancelled"},
    "cancelled": set(),
}


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_difference(left, right) -> Decimal:
    return _money(left) - _money(right)


def build_settlement(collaborator_id, period_start, period_end, tasks, actor):
    if not tasks:
        raise ValueError("Nessuna attivita' approvata nel periodo")
    rates = {_money(task.get("hourly_rate")) for task in tasks}
    if len(rates) != 1:
        raise ValueError("Il periodo contiene tariffe diverse")
    now = datetime.now(timezone.utc).isoformat()
    return {
        "settlement_id": f"set_{uuid4().hex[:16]}",
        "collaborator_id": collaborator_id,
        "period_start": str(period_start),
        "period_end": str(period_end),
        "task_ids": [task["task_id"] for task in tasks],
        "approved_minutes": sum(int(task.get("approved_minutes") or 0) for task in tasks),
        "hourly_rate_snapshot": float(next(iter(rates))),
        "calculated_amount": float(sum((_money(task.get("approved_amount")) for task in tasks), Decimal("0.00"))),
        "status": "draft",
        "invoice": None,
        "payment": None,
        "created_by": actor,
        "created_at": now,
        "updated_at": now,
        "audit_log": [{"action": "created", "actor": actor, "at": now}],
    }


def validate_transition(settlement, target_status, payload):
    current = settlement.get("status")
    if target_status not in TRANSITIONS.get(current, set()):
        raise ValueError(f"Passaggio non consentito: {current} -> {target_status}")
    if current == "to_verify" and target_status == "to_pay":
        invoice_amount = (settlement.get("invoice") or {}).get("amount")
        if calculate_difference(invoice_amount, settlement.get("calculated_amount")) != 0 and not str(payload.get("difference_note") or "").strip():
            raise ValueError("Inserisci una nota per spiegare la differenza")
    if current == "to_pay" and target_status == "paid":
        invoice_amount = (settlement.get("invoice") or {}).get("amount")
        if calculate_difference(payload.get("amount"), invoice_amount) != 0 and not str(payload.get("note") or "").strip():
            raise ValueError("Inserisci una nota per spiegare la differenza di pagamento")


def can_manage_collaborator_billing(admin):
    role = getattr(admin, "role", None)
    return role == "superadmin" or (role == "admin" and getattr(admin, "admin_type", None) != "antonella")
