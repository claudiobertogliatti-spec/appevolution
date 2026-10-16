"""T24 — aree personali collaboratori: identità unica, ore, accessi.

Tutti ``unit``. Scenari del piano: nessuna doppia registrazione fra reparti, sovrapposizioni,
ore duplicate, limiti superati (segnalati, non riscritti), accesso ai soli dati propri.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.collaboration_timesheet import (
    access_for,
    department_view,
    detect_duplicates,
    detect_overlaps,
    normalize_entry,
    personal_totals,
    redact_for,
    weekly_load,
)

pytestmark = pytest.mark.unit

# Mariangela opera in due reparti: UNA identità, due viste.
MARY_ACQ = {"task_id": "a1", "assigned_to": "mariangela", "department": "acquisizione",
            "week_start": "2026-09-07", "estimated_minutes": 60, "actual_minutes": 50, "approved_minutes": 50}
MARY_VEN = {"task_id": "a2", "assigned_to": "mariangela", "department": "vendite",
            "week_start": "2026-09-07", "estimated_minutes": 30, "actual_minutes": 40, "approved_minutes": 40}


def _entries(*tasks):
    return [normalize_entry(t) for t in tasks]


# ─────────────────────────── identità unica / niente doppio conteggio ───────────────────────────

def test_department_view_filters_without_duplicating():
    entries = _entries(MARY_ACQ, MARY_VEN)
    assert [e["activity_id"] for e in department_view(entries, "acquisizione")] == ["a1"]
    assert [e["activity_id"] for e in department_view(entries, "vendite")] == ["a2"]


def test_personal_totals_dedup_across_departments():
    entries = _entries(MARY_ACQ, MARY_VEN)
    totals = personal_totals(entries)
    assert totals["activities"] == 2
    assert totals["approved_minutes"] == 90  # 50 + 40, contati UNA volta ciascuno


def test_same_activity_in_two_departments_not_double_counted():
    # stessa attività a1 che comparisse in due viste → conta una volta sola
    dup = {**MARY_ACQ, "department": "vendite"}
    totals = personal_totals(_entries(MARY_ACQ, dup))
    assert totals["activities"] == 1 and totals["approved_minutes"] == 50


# ─────────────────────────── doppioni / sovrapposizioni ───────────────────────────

def test_detect_duplicates():
    dup = {**MARY_ACQ}
    assert detect_duplicates(_entries(MARY_ACQ, dup, MARY_VEN)) == ["a1"]


def test_detect_overlaps():
    t1 = {"task_id": "o1", "assigned_to": "mary", "started_at": "2026-09-07T09:00:00+00:00", "ended_at": "2026-09-07T10:00:00+00:00"}
    t2 = {"task_id": "o2", "assigned_to": "mary", "started_at": "2026-09-07T09:30:00+00:00", "ended_at": "2026-09-07T11:00:00+00:00"}
    t3 = {"task_id": "o3", "assigned_to": "mary", "started_at": "2026-09-07T11:00:00+00:00", "ended_at": "2026-09-07T12:00:00+00:00"}
    pairs = detect_overlaps(_entries(t1, t2, t3))
    assert ("o1", "o2") in pairs and ("o2", "o3") not in pairs


# ─────────────────────────── limite settimanale (segnalato, non riscritto) ───────────────────────────

def test_weekly_limit_flagged_not_rewritten():
    over = {**MARY_ACQ, "approved_minutes": 260}  # oltre 5h=300? no; costruiamo il superamento
    load = weekly_load(_entries(over, MARY_VEN), "2026-09-07", max_minutes=290)
    assert load["approved_minutes"] == 300 and load["over_limit"] is True
    ok = weekly_load(_entries(MARY_ACQ, MARY_VEN), "2026-09-07", max_minutes=300)
    assert ok["over_limit"] is False


def test_planning_actual_approved_are_distinct():
    e = normalize_entry(MARY_ACQ)
    assert e["estimated_minutes"] == 60 and e["actual_minutes"] == 50 and e["approved_minutes"] == 50


# ─────────────────────────── controllo accessi ───────────────────────────

DIRECTION = {"role": "superadmin", "email": "claudio@x.it"}
ADMIN_DIRECTION = {"role": "admin", "email": "luca@x.it", "admin_type": None}
MARY = {"role": "admin", "email": "mary@x.it", "admin_type": "mariangela"}
ANTO = {"role": "admin", "email": "anto@x.it", "admin_type": "antonella"}


def test_direction_sees_all_and_can_edit_economics():
    d = access_for(DIRECTION, "mariangela")
    assert d.can_view and d.can_edit_economics and d.fields == "full"
    assert access_for(ADMIN_DIRECTION, "mariangela").can_edit_economics is True


def test_collaborator_sees_own_but_cannot_edit_own_economics():
    d = access_for(MARY, "mariangela")
    assert d.can_view is True and d.can_edit_economics is False and d.fields == "full"


def test_collaborator_cannot_access_another_economics():
    d = access_for(ANTO, "mariangela")
    assert d.can_view is False and d.can_edit_economics is False and d.fields == "minimal"
    # i campi economici sono rimossi per l'altra collaboratrice
    redacted = redact_for(ANTO, "mariangela", {"approved_minutes": 50, "approved_amount": 20.83, "hourly_rate": 25})
    assert "approved_amount" not in redacted and "hourly_rate" not in redacted
    assert redacted["approved_minutes"] == 50


def test_anonymous_has_no_access():
    assert access_for(None, "mariangela").can_view is False
