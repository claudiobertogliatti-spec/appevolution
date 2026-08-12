import pytest
from services.ciak_lesson_review import build_partner_review_update, build_revision_package, classify_revision_items, is_partner_approved

pytestmark = pytest.mark.unit

def lesson(**kw):
    return {"output_version": 2, "pipeline_status": "ready_for_review", "output_gcs_url": "x", "video_final_duration_s": 600, **kw}

def test_exact_version_approval_and_new_version_invalidates_it():
    update = build_partner_review_update(lesson(), decision="approve", output_version=2, actor_id="u", now_iso="now")
    assert is_partner_approved({**lesson(), **update["fields"]})
    assert not is_partner_approved({**lesson(output_version=3), **update["fields"]})

def test_stale_version_rejected():
    with pytest.raises(ValueError, match="aggiornato"):
        build_partner_review_update(lesson(), decision="approve", output_version=1, actor_id="u")

def test_general_and_timestamp_items_are_normalized():
    result = classify_revision_items([
        {"action": "normalize_volume", "scope": "global"},
        {"action": "restore_ending", "scope": "timestamp", "timestamp_s": 590},
    ], 600, 1)
    assert result["risk"] == "red"
    assert result["items"][1]["timestamp_s"] == 590

def test_intensity_changes_risk_and_third_cycle_forces_team():
    assert classify_revision_items([{"action": "increase_pace", "intensity": "light"}], 10, 1)["risk"] == "green"
    assert classify_revision_items([{"action": "increase_pace", "intensity": "medium"}], 10, 1)["risk"] == "yellow"
    assert classify_revision_items([{"action": "normalize_volume"}], 10, 3)["requires_team_review"]

def test_conflicts_and_bad_timestamp_are_rejected():
    with pytest.raises(ValueError, match="incompatibili"):
        classify_revision_items([{"action": "reduce_pauses", "intensity": "light"}, {"action": "more_breathing_room"}], 10, 1)
    with pytest.raises(ValueError, match="Timestamp"):
        classify_revision_items([{"action": "restore_cut", "scope": "timestamp", "timestamp_s": 11}], 10, 1)

def test_package_is_versioned_and_single_risk():
    pkg = build_revision_package(lesson(), partner_id="p", lesson_id="l", output_version=2,
                                 items=[{"action": "normalize_volume"}], actor_id="u", now_iso="now")
    assert pkg["source_output_version"] == 2 and pkg["target_output_version"] == 3
    assert pkg["status"] == "queued" and pkg["cycle"] == 1

def test_legacy_approval_remains_compatible():
    assert is_partner_approved({"video_approved": True, "pipeline_status": "approved"})
