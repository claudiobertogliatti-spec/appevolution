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
    return {
        "days": [
            {
                "day": day,
                "channel": "instagram",
                "format": "reel",
                "theme": f"Tema {day}",
                "how_to": "Parla a camera per 30 secondi",
                "cta": "masterclass",
                "destination_url": destination_url,
                "owner": "partner",
                "phase": "recognition",
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
            "organic_routine": {"daily_minutes": 30, "outreach_target": 10},
            "bonus": {
                "name": "Sessione di orientamento",
                "expires_at": "2026-09-30T23:59:59+02:00",
            },
            "partner_confirmed_at": "2026-08-30T10:00:00+02:00",
            "admin_approval": {"approved_at": "2026-08-30T11:00:00+02:00"},
        }
    )
    return calendar


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
    result = evaluate_launch_calendar(_ready_calendar(), {})

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
