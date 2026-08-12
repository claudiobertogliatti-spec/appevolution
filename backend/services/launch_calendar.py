"""Regole pure per il calendario di lancio F-14.

Questo modulo non legge il database e non chiama servizi esterni: rende il
calendario verificabile prima che venga approvato o pubblicato.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
import hashlib
import json
from typing import Any
from urllib.parse import urlparse


_REQUIRED_DAY_FIELDS = (
    "day",
    "date",
    "channel",
    "format",
    "theme",
    "how_to",
    "cta",
    "destination_url",
    "owner",
    "phase",
    "dm_action",
)


@dataclass(frozen=True)
class LaunchCalendarReadiness:
    ready: bool
    checks: list[dict[str, Any]]

    @property
    def failed_codes(self) -> list[str]:
        return [check["code"] for check in self.checks if not check["ok"]]


def normalize_launch_calendar(raw: dict, start_date: date, live_date: date) -> dict:
    """Aggiunge date canoniche e rifiuta calendari diversi dai giorni 1-30."""
    if not isinstance(raw, dict):
        raise ValueError("Il calendario deve essere un oggetto")
    raw_days = raw.get("days") or []
    if not isinstance(raw_days, list):
        raise ValueError("Il calendario deve contenere esattamente i giorni 1-30")

    try:
        days = sorted(raw_days, key=lambda item: int(item["day"]))
        day_numbers = [int(item["day"]) for item in days]
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Il calendario deve contenere esattamente i giorni 1-30") from exc

    if day_numbers != list(range(1, 31)):
        raise ValueError("Il calendario deve contenere esattamente i giorni 1-30")

    normalized = [
        {
            **item,
            "day": day_number,
            "date": (start_date + timedelta(days=day_number - 1)).isoformat(),
        }
        for item, day_number in zip(days, day_numbers)
    ]
    if normalized[27]["date"] != live_date.isoformat():
        raise ValueError("La live deve coincidere con il giorno 28")

    return {
        **raw,
        "days": normalized,
        "start_date": start_date.isoformat(),
        "live_date": live_date.isoformat(),
    }


def _is_https_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    parsed = urlparse(value.strip())
    return parsed.scheme == "https" and bool(parsed.netloc)


def _is_consecutive_dates(days: list[Any]) -> bool:
    if len(days) != 30 or any(not isinstance(item, dict) for item in days):
        return False
    try:
        parsed = [date.fromisoformat(item["date"]) for item in days]
    except (KeyError, TypeError, ValueError):
        return False
    return all(current == parsed[0] + timedelta(days=index) for index, current in enumerate(parsed))


def _has_day_fields(days: list[Any]) -> bool:
    return all(
        isinstance(item, dict)
        and all(field in item and item[field] not in (None, "") for field in _REQUIRED_DAY_FIELDS if field != "destination_url")
        and "destination_url" in item
        for item in days
    )


def _parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else None


def _calendar_without_approval(calendar: dict) -> dict:
    return {
        key: value
        for key, value in calendar.items()
        if key != "admin_approval"
    }


def _has_admin_approval(calendar: dict) -> bool:
    approval = calendar.get("admin_approval")
    if not isinstance(approval, dict):
        return False
    required = ("admin_id", "approved_at", "calendar_version", "calendar_checksum")
    if not all(isinstance(approval.get(field), str) and approval[field].strip() for field in required):
        return False
    return (
        _parse_datetime(approval["approved_at"]) is not None
        and approval["calendar_version"] == calendar.get("version")
        and approval["calendar_checksum"] == calendar_checksum(_calendar_without_approval(calendar))
    )


def _verified_destination_urls(days: list[Any], resources: dict) -> bool:
    registry = resources.get("verified_destinations")
    if not isinstance(registry, dict) or not days:
        return False
    for item in days:
        if not isinstance(item, dict):
            return False
        url = item.get("destination_url")
        evidence = registry.get(url)
        if not (
            isinstance(evidence, dict)
            and evidence.get("verified") is True
            and _parse_datetime(evidence.get("verified_at")) is not None
        ):
            return False
    return True


def _has_valid_commercial_terms(calendar: dict, resources: dict) -> bool:
    terms = calendar.get("commercial_terms")
    resource_terms = resources.get("commercial_terms")
    if not isinstance(terms, dict) or terms != resource_terms:
        return False
    version = terms.get("version")
    bonus = terms.get("bonus")
    expires_at = bonus.get("expires_at") if isinstance(bonus, dict) else None
    evaluated_at = _parse_datetime(resources.get("evaluated_at"))
    expires = _parse_datetime(expires_at)
    return (
        isinstance(version, str)
        and bool(version.strip())
        and isinstance(bonus, dict)
        and isinstance(bonus.get("name"), str)
        and bool(bonus["name"].strip())
        and expires is not None
        and evaluated_at is not None
        and expires > evaluated_at
    )


def _has_expected_cadence(calendar: dict) -> bool:
    main_contents = calendar.get("main_contents")
    stories = calendar.get("stories")
    if not isinstance(main_contents, list) or not isinstance(stories, list):
        return False
    weeks = ((1, 7), (8, 14), (15, 21), (22, 30))
    try:
        main_days = [int(item["day"]) for item in main_contents]
        story_days = [int(item["day"]) for item in stories]
    except (KeyError, TypeError, ValueError):
        return False
    return (
        len(main_days) == 16
        and len(set(main_days)) == 16
        and all(sum(start <= day <= end for day in main_days) == 4 for start, end in weeks)
        and len(set(story_days)) >= 28
        and all(1 <= day <= 30 for day in story_days)
    )


def evaluate_launch_calendar(calendar: dict, resources: dict) -> LaunchCalendarReadiness:
    """Restituisce tutti i gate leggibili, senza eccezioni per dati incompleti.

    Le prove URL e i termini commerciali arrivano come snapshot server-side in
    ``resources``. Il dominio ne valuta l'attestazione, ma non fa rete.
    """
    calendar = calendar if isinstance(calendar, dict) else {}
    resources = resources if isinstance(resources, dict) else {}
    days = calendar.get("days") if isinstance(calendar.get("days"), list) else []
    day_numbers = [item.get("day") for item in days if isinstance(item, dict)]
    exactly_thirty_days = len(days) == 30 and day_numbers == list(range(1, 31))
    live_date = calendar.get("live_date")
    live_day_28 = (
        exactly_thirty_days
        and isinstance(live_date, str)
        and days[27].get("date") == live_date
    )
    routine = calendar.get("organic_routine") or resources.get("organic_routine")
    organic_routine = (
        isinstance(routine, dict)
        and isinstance(routine.get("daily_minutes"), int)
        and routine["daily_minutes"] > 0
        and isinstance(routine.get("outreach_target"), int)
        and routine["outreach_target"] > 0
    )
    checks = [
        {"code": "exactly_30_days", "ok": exactly_thirty_days},
        {"code": "consecutive_dates", "ok": _is_consecutive_dates(days)},
        {"code": "live_day_28", "ok": live_day_28},
        {"code": "day_fields", "ok": _has_day_fields(days)},
        {"code": "https_destination_urls", "ok": bool(days) and all(isinstance(item, dict) and _is_https_url(item.get("destination_url")) for item in days)},
        {"code": "verified_destination_urls", "ok": _verified_destination_urls(days, resources)},
        {"code": "organic_routine", "ok": organic_routine},
        {"code": "content_cadence", "ok": _has_expected_cadence(calendar)},
        {"code": "bonus_deadline", "ok": _has_valid_commercial_terms(calendar, resources)},
        {"code": "partner_confirmation", "ok": bool(calendar.get("partner_confirmed_at"))},
        {"code": "admin_approval", "ok": _has_admin_approval(calendar)},
    ]
    return LaunchCalendarReadiness(
        ready=all(check["ok"] for check in checks),
        checks=checks,
    )


def calendar_checksum(calendar: dict) -> str:
    """Checksum ripetibile per individuare modifiche dopo una conferma."""
    serialized = json.dumps(
        calendar,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
