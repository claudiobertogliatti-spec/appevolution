"""Unit test per services/video_retry_guard.py (helper puri, nessun I/O)."""
import os
from datetime import datetime, timezone, timedelta

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import video_retry_guard as g

pytestmark = pytest.mark.unit

NOW = datetime(2026, 9, 27, 12, 0, 0, tzinfo=timezone.utc)
URL = "gs://bucket/raw_videos/a.mp4"


def _ago(**kw):
    return (NOW - timedelta(**kw)).isoformat()


# ── next_attempt ─────────────────────────────────────────────────────────────

def test_first_attempt_without_history_starts_at_one():
    assert g.next_attempt(None, None, None, URL, NOW) == (1, NOW.isoformat())


def test_same_url_inside_window_increments_and_keeps_window_start():
    since = _ago(minutes=40)
    assert g.next_attempt(1, since, URL, URL, NOW) == (2, since)
    assert g.next_attempt(2, since, URL, URL, NOW) == (3, since)


def test_attempt_beyond_cap_is_reported_so_the_caller_can_refuse():
    since = _ago(minutes=40)
    n, _ = g.next_attempt(g.MAX_PIPELINE_ATTEMPTS, since, URL, URL, NOW)
    assert n == g.MAX_PIPELINE_ATTEMPTS + 1


def test_new_url_resets_counter():
    since = _ago(minutes=10)
    assert g.next_attempt(3, since, URL, "gs://bucket/raw_videos/b.mp4", NOW) == (1, NOW.isoformat())


def test_expired_window_resets_counter_so_manual_retry_is_possible():
    since = _ago(hours=7)
    assert g.next_attempt(3, since, URL, URL, NOW) == (1, NOW.isoformat())


def test_missing_or_garbage_window_start_resets():
    assert g.next_attempt(3, None, URL, URL, NOW) == (1, NOW.isoformat())
    assert g.next_attempt(3, "non-una-data", URL, URL, NOW) == (1, NOW.isoformat())


def test_garbage_count_is_treated_as_zero():
    since = _ago(minutes=5)
    assert g.next_attempt("boh", since, URL, URL, NOW) == (1, since)
    assert g.next_attempt(-4, since, URL, URL, NOW) == (1, since)


def test_naive_datetime_strings_are_treated_as_utc():
    since = (NOW - timedelta(minutes=5)).replace(tzinfo=None).isoformat()
    assert g.next_attempt(1, since, URL, URL, NOW) == (2, since)


def test_z_suffix_is_accepted():
    since = (NOW - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    assert g.next_attempt(1, since, URL, URL, NOW)[0] == 2


# ── attempts_exhausted ───────────────────────────────────────────────────────

def test_not_exhausted_below_cap():
    assert g.attempts_exhausted(g.MAX_PIPELINE_ATTEMPTS - 1, _ago(minutes=5), NOW) is False


def test_exhausted_at_cap_inside_window():
    assert g.attempts_exhausted(g.MAX_PIPELINE_ATTEMPTS, _ago(minutes=5), NOW) is True


def test_not_exhausted_when_window_expired_or_missing():
    assert g.attempts_exhausted(99, _ago(hours=7), NOW) is False
    assert g.attempts_exhausted(99, None, NOW) is False
    assert g.attempts_exhausted(None, _ago(minutes=5), NOW) is False
