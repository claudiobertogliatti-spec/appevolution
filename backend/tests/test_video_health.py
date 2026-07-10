"""Unit test per services/video_health.py (helper puri, nessun I/O)."""
import os
from datetime import datetime, timezone, timedelta

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import video_health as vh

pytestmark = pytest.mark.unit

NOW = datetime(2026, 7, 10, 12, 0, 0, tzinfo=timezone.utc)


def _iso(delta_s):
    return (NOW - timedelta(seconds=delta_s)).isoformat()


# ── classify ─────────────────────────────────────────────────────────────────

def test_classify_error_states_have_priority_and_are_not_stuck():
    assert vh.classify("error", None, _iso(99999), NOW) == ("error", False)
    assert vh.classify("error_youtube", None, None, NOW) == ("error_youtube", False)


def test_classify_da_revisionare_and_montaggio_when_fresh():
    assert vh.classify("da_revisionare", _iso(10), _iso(10), NOW) == ("da_revisionare", False)
    assert vh.classify("montaggio", _iso(10), _iso(10), NOW) == ("montaggio", False)


def test_classify_in_progress_fresh_vs_stuck():
    # heartbeat recente → in lavorazione
    assert vh.classify("transcribing", _iso(30), None, NOW) == ("in_progress", False)
    # heartbeat vecchio → bloccato
    assert vh.classify("transcribing", _iso(9999), None, NOW) == ("stuck", True)


def test_classify_montaggio_stuck_when_heartbeat_old():
    cat, stuck = vh.classify("montaggio", _iso(9999), None, NOW)
    assert cat == "stuck" and stuck is True


def test_classify_missing_timestamp_in_progress_is_stuck():
    assert vh.classify("downloading", None, None, NOW) == ("stuck", True)


def test_classify_ready_and_approved_and_idle():
    assert vh.classify("ready_for_review", None, _iso(5), NOW) == ("ready", False)
    assert vh.classify("approved", None, _iso(5), NOW) == ("approved", False)
    assert vh.classify("", None, None, NOW) == ("idle", False)


# ── extraction da documenti ──────────────────────────────────────────────────

def test_item_from_masterclass_skips_empty_and_approved():
    assert vh.item_from_masterclass({"partner_id": "1", "video_pipeline_status": ""}, now=NOW) is None
    assert vh.item_from_masterclass({"partner_id": "1", "video_pipeline_status": "approved"}, now=NOW) is None


def test_item_from_masterclass_builds_row_with_partner_name_lookup():
    item = vh.item_from_masterclass(
        {"partner_id": "23", "video_pipeline_status": "error_youtube",
         "video_pipeline_error": "quota", "video_raw_url": "gs://x", "updated_at": _iso(5)},
        partner_names={"23": "Daniele"}, now=NOW,
    )
    assert item["partner_name"] == "Daniele"
    assert item["category"] == "error_youtube"
    assert item["label"] == "Upload YouTube fallito"
    assert item["has_raw_url"] is True
    assert item["needs_attention"] is True


def test_items_from_videocorso_iterates_lessons_and_uses_root_heartbeat():
    doc = {
        "partner_id": "23", "partner_name": "Daniele",
        "pipeline_heartbeat_at": _iso(9999),
        "lessons": {
            "1-1": {"pipeline_status": "transcribing", "video_raw_url": "gs://a"},
            "1-2": {"pipeline_status": "approved"},
            "1-3": {"pipeline_status": "da_revisionare",
                    "pipeline_heartbeat_at": _iso(10), "video_raw_url": "gs://c"},
        },
    }
    items = vh.items_from_videocorso(doc, now=NOW)
    by_lesson = {i["lesson_id"]: i for i in items}
    assert "1-2" not in by_lesson  # approved skippata
    assert by_lesson["1-1"]["category"] == "stuck"       # heartbeat root vecchio
    assert by_lesson["1-3"]["category"] == "da_revisionare"  # heartbeat lezione fresco


# ── summary ──────────────────────────────────────────────────────────────────

def test_build_summary_buckets_and_attention():
    items = [
        vh.build_item(partner_id="1", partner_name="A", video_type="masterclass", lesson_id=None,
                      status="da_revisionare", error=None, updated_at=_iso(5), heartbeat_at=_iso(5),
                      has_raw_url=True, now=NOW),
        vh.build_item(partner_id="2", partner_name="B", video_type="masterclass", lesson_id=None,
                      status="error_youtube", error="quota", updated_at=_iso(5), heartbeat_at=None,
                      has_raw_url=True, now=NOW),
        vh.build_item(partner_id="3", partner_name="C", video_type="videocorso", lesson_id="1-1",
                      status="downloading", error=None, updated_at=_iso(9999), heartbeat_at=_iso(9999),
                      has_raw_url=True, now=NOW),
    ]
    s = vh.build_summary(items, now=NOW)
    assert s["counts"]["da_revisionare"] == 1
    assert s["counts"]["errori_youtube"] == 1
    assert s["counts"]["bloccati"] == 1
    assert s["total_attention"] == 2   # error_youtube + bloccato
    assert s["attention"] is True


# ── decide_retry_action ──────────────────────────────────────────────────────

def test_retry_fase_b_for_montaggio_with_approved_cuts():
    d = vh.decide_retry_action(status="montaggio", has_raw_url=True, has_approved_cuts=True)
    assert d["action"] == "fase_b"


def test_retry_fase_b_for_error_youtube_with_final_video():
    d = vh.decide_retry_action(status="error_youtube", has_raw_url=True,
                               has_approved_cuts=False, has_final_video=True)
    assert d["action"] == "fase_b"


def test_retry_falls_back_to_fase_a_from_raw():
    d = vh.decide_retry_action(status="error", has_raw_url=True, has_approved_cuts=False)
    assert d["action"] == "fase_a"


def test_retry_none_without_raw():
    d = vh.decide_retry_action(status="error", has_raw_url=False, has_approved_cuts=False)
    assert d["action"] == "none"


def test_retry_force_phase_b_requires_cuts():
    assert vh.decide_retry_action(status="error", has_raw_url=True, has_approved_cuts=False,
                                  force_phase="b")["action"] == "none"
    assert vh.decide_retry_action(status="error", has_raw_url=True, has_approved_cuts=True,
                                  force_phase="b")["action"] == "fase_b"


def test_retry_force_phase_a_requires_raw():
    assert vh.decide_retry_action(status="montaggio", has_raw_url=False, has_approved_cuts=True,
                                  force_phase="a")["action"] == "none"
    assert vh.decide_retry_action(status="montaggio", has_raw_url=True, has_approved_cuts=True,
                                  force_phase="a")["action"] == "fase_a"


# ── system health ────────────────────────────────────────────────────────────

def test_aggregate_system_status_worst_wins():
    assert vh.aggregate_system_status(["ok", "ok", "ok"]) == "ok"
    assert vh.aggregate_system_status(["ok", "attention", "ok"]) == "attention"
    assert vh.aggregate_system_status(["ok", "attention", "critical"]) == "critical"
    assert vh.aggregate_system_status([None, None]) == "ok"


# ── partner-facing mapping ───────────────────────────────────────────────────

def test_partner_status_hides_technical_states():
    assert vh.partner_facing_video_status("transcribing")["partner_message"] == "Il team sta lavorando al tuo video"
    assert vh.partner_facing_video_status("error")["partner_message"] == "Il team sta sistemando il tuo video"
    assert vh.partner_facing_video_status("error_youtube")["partner_status"] == "lavorazione"


def test_partner_status_named_phases():
    assert vh.partner_facing_video_status("queued")["partner_message"] == "Video ricevuto"
    assert vh.partner_facing_video_status("da_revisionare")["partner_message"] == "Il team sta revisionando"
    assert vh.partner_facing_video_status("montaggio")["partner_message"] == "Montaggio in corso"
    assert vh.partner_facing_video_status("ready_for_review")["partner_message"] == "Pronto da approvare"


def test_partner_status_needs_reupload():
    r = vh.partner_facing_video_status("queued", needs_reupload=True)
    assert r == {"partner_status": "nuovo_file", "partner_message": "Serve un nuovo file"}
