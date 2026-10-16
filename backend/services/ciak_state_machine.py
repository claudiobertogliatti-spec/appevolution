"""
Ciak — State machine helper.

Gestisce le transizioni di stato della diagnostic session ed emette automaticamente
i tag CRM corrispondenti.

Logica fondamentale:
  - SOLO UNO stato attivo principale per volta (current_state).
  - state_history conserva la cronologia con timestamp.
  - I tag sono additivi: una volta aggiunti, restano nell'array crm_tags.
  - events conserva una traccia di ogni evento (transizioni + eventi puri).

Funnel gratuito (unico processo vivo, 29/9/2026):
  lead_created → ciak_started → ciak_completed → report_generated
    → call_booked → call_done

Gli stati del vecchio funnel a pagamento (clicked_67, purchased_67) e i mai usati
partner_approved/partner_active non si possono più scrivere. Restano solo sui
documenti storici: normalize_state() li legge come il gradino equivalente del
funnel gratuito, così nessuna vista deve conoscerli.
"""
from datetime import datetime, timezone
from typing import Optional


STATE_LEAD_CREATED = "lead_created"
STATE_CIAK_STARTED = "ciak_started"
STATE_CIAK_COMPLETED = "ciak_completed"
STATE_REPORT_GENERATED = "report_generated"
STATE_CALL_BOOKED = "call_booked"
STATE_CALL_DONE = "call_done"

ALL_STATES = {
    STATE_LEAD_CREATED, STATE_CIAK_STARTED, STATE_CIAK_COMPLETED,
    STATE_REPORT_GENERATED, STATE_CALL_BOOKED, STATE_CALL_DONE,
}

# Ordine del funnel: serve a non far mai retrocedere un lead.
STATE_RANK = {
    STATE_LEAD_CREATED: 0,
    STATE_CIAK_STARTED: 1,
    STATE_CIAK_COMPLETED: 2,
    STATE_REPORT_GENERATED: 3,
    STATE_CALL_BOOKED: 4,
    STATE_CALL_DONE: 5,
}

# Stati storici → gradino equivalente del funnel gratuito.
# clicked_67/purchased_67: chi era arrivato al vecchio checkout €27 aveva già
# l'analisi pronta. partner_*: mai scritti dal codice, trattati come call fatta.
LEGACY_STATE_MAP = {
    "clicked_67": STATE_REPORT_GENERATED,
    "purchased_67": STATE_REPORT_GENERATED,
    "partner_approved": STATE_CALL_DONE,
    "partner_active": STATE_CALL_DONE,
}


def normalize_state(state: Optional[str]) -> Optional[str]:
    """Stato corrente espresso nel funnel gratuito (mappa gli stati storici)."""
    return LEGACY_STATE_MAP.get(state, state)


# Tag CRM auto-generati per ogni transizione
_STATE_TAGS = {
    STATE_LEAD_CREATED: [],
    STATE_CIAK_STARTED: ["ciak_started"],
    STATE_CIAK_COMPLETED: ["ciak_completed"],
    STATE_REPORT_GENERATED: [],  # tag stato_X aggiunti separatamente da extra_tags
    STATE_CALL_BOOKED: ["ciak_call_booked"],
    STATE_CALL_DONE: ["ciak_call_done"],
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
