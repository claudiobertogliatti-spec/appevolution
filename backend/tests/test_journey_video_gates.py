import pytest

from services.journey_completion import (
    all_required_lessons_approved,
    masterclass_current_version_approved,
    required_lesson_ids_from_outline,
)


pytestmark = pytest.mark.unit


def video(**overrides):
    return {
        "output_version": 2,
        "output_gcs_url": "gs://edited/video.mp4",
        "pipeline_status": "approved",
        "partner_approved": True,
        "partner_review_status": "approved",
        "partner_review_version": 2,
        **overrides,
    }


def test_masterclass_requires_current_partner_approval_and_no_open_revision():
    assert masterclass_current_version_approved(video()) is True
    assert masterclass_current_version_approved(video(partner_review_version=1)) is False
    assert masterclass_current_version_approved(video(active_revision_id="rev-1")) is False
    assert masterclass_current_version_approved(video(output_gcs_url="", video_embed_url="")) is False


def test_required_lesson_ids_are_stable_for_historical_outline():
    outline = {"moduli": [{"titolo": "Base", "lezioni": [{"titolo": "Uno"}, {"id": "lesson-two", "titolo": "Due"}]}]}
    assert required_lesson_ids_from_outline(outline) == ["m01-l01", "lesson-two"]


def test_every_planned_lesson_must_be_approved_extra_lessons_do_not_hurt():
    outline = {"moduli": [{"lezioni": [{"id": "a"}, {"id": "b"}]}]}
    assert all_required_lessons_approved(outline, {"a": video(), "b": video(), "extra": video()}) is True
    assert all_required_lessons_approved(outline, {"a": video(), "b": video(partner_review_version=1)}) is False
    assert all_required_lessons_approved(outline, {"a": video()}) is False
