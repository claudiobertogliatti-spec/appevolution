from __future__ import annotations

from datetime import date

import pytest

from services.editorial_calendar import _deterministic
from services.launch_calendar import (
    calendar_checksum,
    evaluate_launch_calendar,
    normalize_launch_calendar,
)

pytestmark = pytest.mark.unit


def _raw_days(destination_url: str | None = "https://example.test/masterclass") -> dict:
    primary_days = {1, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 21, 22, 24, 26, 28}

    def phase_for_day(day: int) -> str:
        if day <= 7:
            return "recognition"
        if day <= 14:
            return "authority"
        if day <= 21:
            return "invitation"
        if day <= 26:
            return "conversion"
        if day == 27:
            return "gate"
        if day == 28:
            return "live"
        return "follow_up"

    def cta_for_day(day: int) -> str:
        if day <= 7:
            return "commenta o scrivimi in DM"
        if day <= 14:
            return "richiedi la masterclass in DM"
        if day <= 27:
            return "iscriviti alla live"
        if day == 28:
            return "entra nella live"
        return "vai al checkout"

    return {
        "days": [
            {
                "day": day,
                "channel": "instagram",
                "format": "reel" if day in primary_days else "stories",
                "theme": f"Tema {day}",
                "how_to": "Parla a camera per 30 secondi",
                "cta": cta_for_day(day),
                "destination_url": destination_url,
                "owner": "partner",
                "phase": phase_for_day(day),
                "dm_action": (
                    "Proponi una call di recupero solo a chi non ha visto la live."
                    if day == 30
                    else "Rispondi ai commenti e avvia 10 conversazioni utili."
                ),
                "main_content": day in primary_days,
                "recovery_reason": "live_absent" if day == 30 else None,
            }
            for day in range(1, 31)
        ]
    }


def _ready_calendar() -> dict:
    calendar = normalize_launch_calendar(
        _raw_days(), date(2026, 9, 1), date(2026, 9, 28)
    )
    calendar.update(
        {
            "organic_routine": {
                "daily_minutes": 30,
                "interactions_target": 10,
                "outreach_target": 10,
                "dm_follow_up_target": 10,
                "actions": {
                    "interactions": "Rispondi ai commenti utili.",
                    "outreach": "Avvia nuove conversazioni mirate.",
                    "dm_follow_up": "Segui in DM chi ha interagito.",
                },
            },
            "commercial_terms": {
                "version": "launch-terms-v1",
                "price": {
                    "price_id": "price-authoritative-v1",
                    "amount_cent": 2700,
                    "currency": "EUR",
                },
                "bonus": {
                    "name": "Sessione di orientamento",
                    "expires_at": "2026-09-30T23:59:59+02:00",
                },
            },
            "version": "calendar-v1",
        }
    )
    main_days = (1, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 21, 22, 24, 26, 28)
    calendar["main_contents"] = [calendar["days"][day - 1] for day in main_days]
    calendar["stories"] = [
        {**calendar["days"][day - 1], "format": "stories", "main_content": False}
        for day in range(1, 31)
        if day not in (28, 30)
    ]
    _refresh_attestations(calendar)
    return calendar


def _refresh_attestations(calendar: dict) -> None:
    checksum = calendar_checksum(
        {
            key: value
            for key, value in calendar.items()
            if key not in {"admin_approval", "partner_confirmation"}
        }
    )
    calendar["partner_confirmation"] = {
        "partner_id": "partner-123",
        "confirmed_at": "2026-08-30T10:00:00+02:00",
        "calendar_version": calendar["version"],
        "calendar_checksum": checksum,
    }
    calendar["admin_approval"] = {
        "admin_id": "admin-123",
        "approved_at": "2026-08-30T11:00:00+02:00",
        "calendar_version": calendar["version"],
        "calendar_checksum": checksum,
    }


def _ready_resources(calendar: dict) -> dict:
    destination_urls = {day["destination_url"] for day in calendar["days"]}
    return {
        "verified_destinations": {
            url: {"verified": True, "verified_at": "2026-08-30T09:00:00+02:00"}
            for url in destination_urls
        },
        "commercial_terms": calendar["commercial_terms"],
        "evaluated_at": "2026-08-30T12:00:00+02:00",
    }


def test_normalize_requires_exactly_thirty_unique_days():
    out = normalize_launch_calendar(_raw_days(), date(2026, 9, 1), date(2026, 9, 28))

    assert [item["day"] for item in out["days"]] == list(range(1, 31))
    assert out["days"][27]["date"] == "2026-09-28"


def test_normalize_rejects_missing_or_duplicate_days():
    raw = _raw_days()
    raw["days"][29]["day"] = 29

    with pytest.raises(ValueError, match="giorni 1-30"):
        normalize_launch_calendar(raw, date(2026, 9, 1), date(2026, 9, 28))


def test_normalize_requires_live_on_day_twenty_eight():
    with pytest.raises(ValueError, match="giorno 28"):
        normalize_launch_calendar(_raw_days(), date(2026, 9, 1), date(2026, 9, 27))


def test_readiness_rejects_missing_destination_and_routine():
    result = evaluate_launch_calendar(
        {"days": [], "partner_confirmed_at": None, "admin_approval": None}, {}
    )

    assert result.ready is False
    assert "exactly_30_days" in result.failed_codes
    assert "https_destination_urls" in result.failed_codes
    assert "organic_routine" in result.failed_codes


def test_readiness_accepts_complete_calendar():
    calendar = _ready_calendar()
    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert result.ready is True
    assert result.failed_codes == []


def test_checksum_is_stable_for_equivalent_calendar_data():
    calendar = _ready_calendar()
    reordered = {key: calendar[key] for key in reversed(list(calendar))}

    assert calendar_checksum(calendar) == calendar_checksum(reordered)


def test_deterministic_editorial_calendar_has_all_launch_phases():
    calendar = _deterministic({}, None)

    assert len(calendar["days"]) == 30
    assert [item["day"] for item in calendar["days"]] == list(range(1, 31))
    assert calendar["days"][0]["phase"] == "recognition"
    assert calendar["days"][6]["phase"] == "recognition"
    assert calendar["days"][7]["phase"] == "authority"
    assert calendar["days"][14]["phase"] == "invitation"
    assert calendar["days"][21]["phase"] == "conversion"
    assert calendar["days"][26]["phase"] == "gate"
    assert calendar["days"][27]["phase"] == "live"
    assert calendar["days"][28]["phase"] == "follow_up"


def test_deterministic_calendar_models_main_content_and_stories_separately():
    calendar = _deterministic({}, None)
    main_by_week = [
        [item for item in calendar["main_contents"] if start <= item["day"] <= end]
        for start, end in ((1, 7), (8, 14), (15, 21), (22, 30))
    ]

    assert [len(items) for items in main_by_week] == [4, 4, 4, 4]
    assert len(calendar["stories"]) >= 28
    assert len({item["day"] for item in calendar["stories"]}) >= 28


def test_deterministic_calendar_follows_content_dm_masterclass_live_checkout_flow():
    calendar = _deterministic({}, None)
    days = calendar["days"]

    assert all("dm" in day["cta"] or "comment" in day["cta"] for day in days[:7])
    assert all("masterclass" in day["cta"] for day in days[7:14])
    assert all("live" in day["cta"] for day in days[14:27])
    assert days[27]["cta"] == "entra nella live"
    assert all("checkout" in day["cta"] for day in days[28:])
    assert all("call" not in day["cta"] for day in days)
    assert all("call" not in day["dm_action"].lower() for day in days[:29])
    assert "call" in days[29]["dm_action"].lower()
    assert days[29]["recovery_reason"] == "live_absent"


@pytest.mark.parametrize(
    "approval",
    [True, "approved", {"approved_at": "2026-08-30T11:00:00+02:00"}],
)
def test_readiness_rejects_unattested_or_client_side_admin_approval(approval):
    calendar = _ready_calendar()
    calendar["admin_approval"] = approval

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "admin_approval" in result.failed_codes


def test_readiness_rejects_unverified_https_destination():
    calendar = _ready_calendar()
    resources = _ready_resources(calendar)
    resources["verified_destinations"] = {}

    result = evaluate_launch_calendar(calendar, resources)

    assert "verified_destination_urls" in result.failed_codes


def test_readiness_rejects_missing_content_cadence():
    calendar = _ready_calendar()
    calendar["stories"] = []
    _refresh_attestations(calendar)

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "content_cadence" in result.failed_codes


@pytest.mark.parametrize(
    "expires_at",
    ["not-a-date", "2026-08-29T23:59:59+02:00"],
)
def test_readiness_rejects_invalid_or_expired_commercial_deadline(expires_at):
    calendar = _ready_calendar()
    calendar["commercial_terms"]["bonus"]["expires_at"] = expires_at
    _refresh_attestations(calendar)

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "bonus_deadline" in result.failed_codes


def test_deterministic_calendar_does_not_invent_commercial_terms():
    calendar = _deterministic({}, None)

    assert "commercial_terms" not in calendar


def test_deterministic_calendar_carries_versioned_server_terms_into_checksum():
    terms = {
        "version": "launch-terms-v7",
        "bonus": {
            "name": "Materiale di preparazione",
            "expires_at": "2026-09-30T23:59:59+02:00",
        },
    }
    calendar = _deterministic({}, None, terms)
    changed_terms = {**terms, "version": "launch-terms-v8"}
    changed = _deterministic({}, None, changed_terms)

    assert calendar["commercial_terms"] == terms
    assert calendar_checksum(calendar) != calendar_checksum(changed)


@pytest.mark.parametrize(
    ("day", "field", "value"),
    [
        (1, "cta", "vai al checkout"),
        (15, "phase", "live"),
        (28, "phase", "conversion"),
        (29, "dm_action", "Proponi una call di recupero."),
        (30, "recovery_reason", None),
    ],
)
def test_readiness_rejects_tampered_funnel_sequence(day, field, value):
    calendar = _ready_calendar()
    calendar["days"][day - 1][field] = value
    _refresh_attestations(calendar)

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "funnel_sequence" in result.failed_codes


@pytest.mark.parametrize(
    "routine_patch",
    [
        {"daily_minutes": 20},
        {"actions": {"interactions": "", "outreach": "x", "dm_follow_up": "x"}},
    ],
)
def test_readiness_requires_exact_30_minute_routine_and_explicit_actions(routine_patch):
    calendar = _ready_calendar()
    calendar["organic_routine"].update(routine_patch)
    _refresh_attestations(calendar)

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "organic_routine" in result.failed_codes


def test_readiness_rejects_detached_or_incoherent_cadence_lists():
    calendar = _ready_calendar()
    calendar["main_contents"][0] = {**calendar["main_contents"][0], "format": "stories"}
    _refresh_attestations(calendar)

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "content_cadence" in result.failed_codes


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("price_id", ""),
        ("amount_cent", 0),
        ("currency", "euro"),
    ],
)
def test_readiness_rejects_incomplete_authoritative_price_snapshot(field, value):
    calendar = _ready_calendar()
    calendar["commercial_terms"]["price"][field] = value
    _refresh_attestations(calendar)

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "bonus_deadline" in result.failed_codes


@pytest.mark.parametrize(
    "confirmation",
    ["confirmed", {"confirmed_at": "2026-08-30T10:00:00+02:00"}],
)
def test_readiness_rejects_unattested_partner_confirmation(confirmation):
    calendar = _ready_calendar()
    calendar["partner_confirmation"] = confirmation

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "partner_confirmation" in result.failed_codes


def test_readiness_rejects_partner_confirmation_without_timezone_aware_timestamp():
    calendar = _ready_calendar()
    calendar["partner_confirmation"]["confirmed_at"] = "2026-08-30T10:00:00"

    result = evaluate_launch_calendar(calendar, _ready_resources(calendar))

    assert "partner_confirmation" in result.failed_codes
