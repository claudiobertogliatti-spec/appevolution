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
    "destination_kind",
    "owner",
    "phase",
    "dm_action",
    "action_kind",
    "audience_condition",
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
        **_derived_content_views(normalized),
        "start_date": start_date.isoformat(),
        "live_date": live_date.isoformat(),
    }


def _derived_content_views(days: list[dict]) -> dict:
    """Rigenera le viste ridondanti solo dai giorni canonici normalizzati."""
    return {
        "main_contents": [day for day in days if day.get("main_content") is True],
        "stories": [
            {**day, "format": "stories", "main_content": False}
            for day in days
            if day["day"] not in (28, 30)
        ],
    }


def _is_https_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    if any(character.isspace() or ord(character) < 32 for character in value):
        return False
    try:
        parsed = urlparse(value)
        hostname = parsed.hostname
        _ = parsed.port
    except (TypeError, ValueError):
        return False
    return parsed.scheme == "https" and bool(hostname)


def _is_consecutive_dates(days: list[Any]) -> bool:
    if len(days) != 30 or any(not isinstance(item, dict) for item in days):
        return False
    try:
        parsed = [date.fromisoformat(item["date"]) for item in days]
    except (KeyError, TypeError, ValueError):
        return False
    return all(current == parsed[0] + timedelta(days=index) for index, current in enumerate(parsed))


def _has_day_fields(days: list[Any]) -> bool:
    required_text_fields = tuple(
        field for field in _REQUIRED_DAY_FIELDS if field not in ("day", "destination_url")
    )
    return all(
        isinstance(item, dict)
        and isinstance(item.get("day"), int)
        and all(
            isinstance(item.get(field), str) and item[field].strip()
            for field in required_text_fields
        )
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
        and approval["calendar_checksum"] == calendar_checksum(calendar)
    )


def _has_partner_confirmation(calendar: dict) -> bool:
    confirmation = calendar.get("partner_confirmation")
    if not isinstance(confirmation, dict):
        return False
    required = ("partner_id", "confirmed_at", "calendar_version", "calendar_checksum")
    if not all(isinstance(confirmation.get(field), str) and confirmation[field].strip() for field in required):
        return False
    return (
        _parse_datetime(confirmation["confirmed_at"]) is not None
        and confirmation["calendar_version"] == calendar.get("version")
        and confirmation["calendar_checksum"] == calendar_checksum(calendar)
    )


def _expected_destination_kind(day: Any) -> str:
    if not isinstance(day, int) or isinstance(day, bool):
        return ""
    if day <= 14:
        return "masterclass"
    if day <= 28:
        return "live"
    return "checkout"


def _verified_destination_urls(days: list[Any], resources: dict) -> bool:
    registry = resources.get("verified_destinations")
    if not isinstance(registry, dict) or not days:
        return False
    for item in days:
        if not isinstance(item, dict):
            return False
        url = item.get("destination_url")
        if not _is_https_url(url):
            return False
        expected_kind = _expected_destination_kind(item.get("day"))
        if item.get("destination_kind") != expected_kind:
            return False
        evidence = registry.get(url)
        if not (
            isinstance(evidence, dict)
            and evidence.get("verified") is True
            and _parse_datetime(evidence.get("verified_at")) is not None
            and evidence.get("destination_kind") == expected_kind
        ):
            return False
    return True


def _has_valid_commercial_terms(calendar: dict, resources: dict) -> bool:
    terms = calendar.get("commercial_terms")
    resource_terms = resources.get("commercial_terms")
    if not _has_intrinsic_commercial_terms(calendar) or terms != resource_terms:
        return False
    evaluated_at = _parse_datetime(resources.get("evaluated_at"))
    expires = _parse_datetime((terms.get("bonus") or {}).get("expires_at"))
    return evaluated_at is not None and expires is not None and expires > evaluated_at


def _has_intrinsic_commercial_terms(calendar: dict) -> bool:
    """Valida la proposta partner senza scambiarla per attestazione admin."""
    terms = calendar.get("commercial_terms")
    if not isinstance(terms, dict):
        return False
    bonus = terms.get("bonus")
    price = terms.get("price")
    expires_at = bonus.get("expires_at") if isinstance(bonus, dict) else None
    expires = _parse_datetime(expires_at)
    days = calendar.get("days")
    try:
        day_thirty_date = date.fromisoformat(days[29]["date"])
    except (IndexError, KeyError, TypeError, ValueError):
        return False
    return (
        isinstance(terms.get("version"), str)
        and bool(terms["version"].strip())
        and terms.get("contract_duration_months") == 12
        and terms.get("contract_start_anchor") == "payment_completed"
        and isinstance(price, dict)
        and isinstance(price.get("price_id"), str)
        and bool(price["price_id"].strip())
        and isinstance(price.get("amount_cent"), int)
        and not isinstance(price["amount_cent"], bool)
        and price["amount_cent"] > 0
        and isinstance(price.get("currency"), str)
        and len(price["currency"]) == 3
        and price["currency"].isalpha()
        and price["currency"] == price["currency"].upper()
        and isinstance(bonus, dict)
        and isinstance(bonus.get("bonus_id"), str)
        and bool(bonus["bonus_id"].strip())
        and isinstance(bonus.get("version"), str)
        and bool(bonus["version"].strip())
        and isinstance(bonus.get("name"), str)
        and bool(bonus["name"].strip())
        and expires is not None
        and expires.date() > day_thirty_date
    )


def _has_expected_cadence(calendar: dict) -> bool:
    days = calendar.get("days")
    main_contents = calendar.get("main_contents")
    stories = calendar.get("stories")
    if (
        not isinstance(days, list)
        or not isinstance(main_contents, list)
        or not isinstance(stories, list)
    ):
        return False
    weeks = ((1, 7), (8, 14), (15, 21), (22, 30))
    try:
        canonical_by_day = {int(item["day"]): item for item in days if isinstance(item, dict)}
        derived_main = [item for item in days if isinstance(item, dict) and item.get("main_content") is True]
        main_days = [int(item["day"]) for item in derived_main]
        story_days = [int(item["day"]) for item in stories]
    except (KeyError, TypeError, ValueError):
        return False
    return (
        len(main_days) == 16
        and len(set(main_days)) == 16
        and all(item.get("format") != "stories" for item in derived_main)
        and all(sum(start <= day <= end for day in main_days) == 4 for start, end in weeks)
        and main_contents == derived_main
        and len(set(story_days)) >= 28
        and all(1 <= day <= 30 for day in story_days)
        and all(
            isinstance(item, dict)
            and canonical_by_day.get(int(item["day"])) is not None
            and item
            == {
                **canonical_by_day[int(item["day"])],
                "format": "stories",
                "main_content": False,
            }
            for item in stories
        )
    )


def _has_funnel_sequence(days: list[Any]) -> bool:
    if len(days) != 30 or any(not isinstance(item, dict) for item in days):
        return False
    expected_phases = (
        *(["recognition"] * 7),
        *(["authority"] * 7),
        *(["invitation"] * 7),
        *(["conversion"] * 5),
        "gate",
        "live",
        "follow_up",
        "follow_up",
    )
    expected_actions = (
        *([("engage_dm", "engaged")] * 7),
        *([("send_masterclass", "masterclass_requested")] * 7),
        *([("invite_live", "masterclass_viewed")] * 13),
        ("live_entry", "live_registered"),
        ("checkout_follow_up", "live_attended"),
        ("recovery_call", "live_absent"),
    )
    for index, item in enumerate(days, start=1):
        cta = str(item.get("cta") or "").lower()
        expected_action, expected_audience = expected_actions[index - 1]
        if (
            item.get("phase") != expected_phases[index - 1]
            or item.get("action_kind") != expected_action
            or item.get("audience_condition") != expected_audience
        ):
            return False
        if index < 29 and "checkout" in cta:
            return False
        if index <= 7 and not ("dm" in cta or "comment" in cta):
            return False
        if 8 <= index <= 14 and "masterclass" not in cta:
            return False
        if 15 <= index <= 27 and ("live" not in cta or "checkout" in cta):
            return False
        if index == 28 and ("entra" not in cta or "live" not in cta):
            return False
        if index >= 29 and "checkout" not in cta:
            return False
        if index == 30 and item.get("recovery_reason") != "live_absent":
            return False
        if index != 30 and item.get("recovery_reason") not in (None, ""):
            return False
    return True


def _has_organic_routine(calendar: dict, resources: dict) -> bool:
    routine = calendar.get("organic_routine")
    resource_routine = resources.get("organic_routine")
    return isinstance(resource_routine, dict) and routine == resource_routine and _has_intrinsic_organic_routine(calendar)


def _has_intrinsic_organic_routine(calendar: dict) -> bool:
    routine = calendar.get("organic_routine")
    if not isinstance(routine, dict) or routine.get("daily_minutes") != 30:
        return False
    targets = ("interactions_target", "outreach_target", "dm_follow_up_target")
    if not all(type(routine.get(key)) is int and routine[key] > 0 for key in targets):
        return False
    actions = routine.get("actions")
    action_keys = ("interactions", "outreach", "dm_follow_up")
    return isinstance(actions, dict) and all(
        isinstance(actions.get(key), str) and bool(actions[key].strip())
        for key in action_keys
    )


def _has_canonical_enums(days: list[Any]) -> bool:
    allowed_formats = {"reel", "carousel", "post", "stories"}
    return all(
        isinstance(item, dict)
        and item.get("channel") == "instagram"
        and item.get("format") in allowed_formats
        and item.get("owner") == "partner"
        for item in days
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
    checks = [
        {"code": "exactly_30_days", "ok": exactly_thirty_days},
        {"code": "consecutive_dates", "ok": _is_consecutive_dates(days)},
        {"code": "live_day_28", "ok": live_day_28},
        {"code": "day_fields", "ok": _has_day_fields(days)},
        {"code": "canonical_enums", "ok": _has_canonical_enums(days)},
        {"code": "https_destination_urls", "ok": bool(days) and all(isinstance(item, dict) and _is_https_url(item.get("destination_url")) for item in days)},
        {"code": "verified_destination_urls", "ok": _verified_destination_urls(days, resources)},
        {"code": "organic_routine", "ok": _has_organic_routine(calendar, resources)},
        {"code": "content_cadence", "ok": _has_expected_cadence(calendar)},
        {"code": "funnel_sequence", "ok": _has_funnel_sequence(days)},
        {"code": "bonus_deadline", "ok": _has_valid_commercial_terms(calendar, resources)},
        {"code": "partner_confirmation", "ok": _has_partner_confirmation(calendar)},
        {"code": "admin_approval", "ok": _has_admin_approval(calendar)},
    ]
    return LaunchCalendarReadiness(
        ready=all(check["ok"] for check in checks),
        checks=checks,
    )


_PARTNER_SUBMISSION_CODES = (
    "exactly_30_days",
    "consecutive_dates",
    "live_day_28",
    "day_fields",
    "canonical_enums",
    "https_destination_urls",
    "content_cadence",
    "funnel_sequence",
    "organic_routine",
    "bonus_deadline",
)


def evaluate_partner_submission_calendar(calendar: dict) -> LaunchCalendarReadiness:
    """Gate puro della proposta partner, prima di pending review.

    Richiede tutto cio' che e' intrinseco al calendario, ma non prova URL esterni
    ne' inventa la successiva attestazione amministrativa.
    """
    calendar = calendar if isinstance(calendar, dict) else {}
    full_checks = {
        check["code"]: check["ok"]
        for check in evaluate_launch_calendar(calendar, {}).checks
    }
    full_checks["organic_routine"] = _has_intrinsic_organic_routine(calendar)
    full_checks["bonus_deadline"] = _has_intrinsic_commercial_terms(calendar)
    checks = [
        {"code": code, "ok": full_checks[code]}
        for code in _PARTNER_SUBMISSION_CODES
    ]
    return LaunchCalendarReadiness(
        ready=all(check["ok"] for check in checks),
        checks=checks,
    )


def calendar_checksum(calendar: dict) -> str:
    """Checksum canonico del contenuto, invariato dalle due attestazioni."""
    content = {
        key: value
        for key, value in calendar.items()
        if key not in {"admin_approval", "partner_confirmation"}
    }
    serialized = json.dumps(
        content,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
