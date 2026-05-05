"""
Ciak — State machine helper.

Gestisce le transizioni di stato della diagnostic session ed emette automaticamente
i tag CRM corrispondenti.

Logica fondamentale:
  - SOLO UNO stato attivo principale per volta (current_state).
  - state_history conserva la cronologia con timestamp.
  - I tag sono additivi: una volta aggiunti, restano nell'array crm_tags.
  - events conserva una traccia di ogni evento (transizioni + eventi puri).

Stati ordinati nel funnel:
  lead_created → ciak_started → ciak_completed → report_generated
    → clicked_67 → purchased_67 → call_booked → call_done
    → partner_approved → partner_active

Riferimento: memory/ciak_technical_spec.md sezione 3.
"""
from datetime import datetime, timezone
from typing import Optional


# Stati principali della state machine (10)
STATE_LEAD_CREATED = "lead_created"
STATE_CIAK_STARTED = "ciak_started"
STATE_CIAK_COMPLETED = "ciak_completed"
STATE_REPORT_GENERATED = "report_generated"
STATE_CLICKED_67 = "clicked_67"
STATE_PURCHASED_67 = "purchased_67"
STATE_CALL_BOOKED = "call_booked"
STATE_CALL_DONE = "call_done"
STATE_PARTNER_APPROVED = "partner_approved"
STATE_PARTNER_ACTIVE = "partner_active"

ALL_STATES = {
    STATE_LEAD_CREATED, STATE_CIAK_STARTED, STATE_CIAK_COMPLETED,
    STATE_REPORT_GENERATED, STATE_CLICKED_67, STATE_PURCHASED_67,
    STATE_CALL_BOOKED, STATE_CALL_DONE, STATE_PARTNER_APPROVED,
    STATE_PARTNER_ACTIVE,
}


# Tag CRM auto-generati per ogni transizione
_STATE_TAGS = {
    STATE_LEAD_CREATED: [],
    STATE_CIAK_STARTED: ["ciak_started"],
    STATE_CIAK_COMPLETED: ["ciak_completed"],
    STATE_REPORT_GENERATED: [],  # tag stato_X aggiunti separatamente da extra_tags
    STATE_CLICKED_67: ["ciak_clicked_67"],
    STATE_PURCHASED_67: ["ciak_bought_67"],
    STATE_CALL_BOOKED: ["ciak_call_booked"],
    STATE_CALL_DONE: ["ciak_call_done"],
    STATE_PARTNER_APPROVED: ["ciak_partner_approved"],
    STATE_PARTNER_ACTIVE: ["ciak_partner_active"],
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def transition_to(
    session: dict,
    new_state: str,
    extra_tags: Optional[list[str]] = None,
    event_metadata: Optional[dict] = None,
) -> dict:
    """
    Applica una transizione di stato a un session dict (formato Mongo).

    Mutazione in-place del dict + ritorno per fluency.
    Da chiamare PRIMA del replace_one/update_one Mongo.
    """
    if new_state not in ALL_STATES:
        raise ValueError(f"Stato non valido: {new_state}")

    now = _utc_now_iso()

    session["current_state"] = new_state

    history = session.setdefault("state_history", [])
    history.append({"state": new_state, "timestamp": now})

    # Tag auto + extra
    new_tags = list(_STATE_TAGS.get(new_state, []))
    if extra_tags:
        new_tags.extend(extra_tags)

    crm_tags = session.setdefault("crm_tags", [])
    for tag in new_tags:
        if tag not in crm_tags:
            crm_tags.append(tag)

    events = session.setdefault("events", [])
    events.append({
        "event": f"state_{new_state}",
        "timestamp": now,
        "metadata": event_metadata or {},
    })

    return session


def add_event(
    session: dict,
    event_name: str,
    metadata: Optional[dict] = None,
) -> None:
    """
    Aggiunge un evento puro (senza transizione di stato).
    Esempi: report_viewed, report_email_sent, email_opened.
    """
    events = session.setdefault("events", [])
    events.append({
        "event": event_name,
        "timestamp": _utc_now_iso(),
        "metadata": metadata or {},
    })


def has_event(session: dict, event_name: str) -> bool:
    """True se un evento con quel nome è già stato registrato."""
    return any(e.get("event") == event_name for e in session.get("events", []))
