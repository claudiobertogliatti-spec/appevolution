import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services.approved_video_material import build_approved_video_record
from services.partner_step_materials import normalize_file_material, partner_materiali_listing

pytestmark = pytest.mark.unit

NOW = "2026-10-05T10:00:00+00:00"
CIAK = "https://www.ciak.io/api/lesson-video/p1/lez-1"


def rec(video_type="videocorso", lesson_id="lez-1", **doc):
    return build_approved_video_record(partner_id="p1", partner_name="Andrea", video_type=video_type,
                                       lesson_id=lesson_id, video_doc=doc, now=NOW)


def test_lesson_hosted_on_ciak_is_listed_and_openable_for_the_partner():
    r = rec(video_embed_url=CIAK, pipeline_status="approved", title="Benvenuti nel Crogiolo")
    assert r["public_url"] == CIAK and r["file_id"] == "approved-video-p1-lez-1"
    assert r["original_name"] == "Videocorso - Benvenuti nel Crogiolo.mp4"
    listed = partner_materiali_listing([r])                       # vista del PARTNER, non admin
    assert [f["file_id"] for f in listed] == ["approved-video-p1-lez-1"]
    item = normalize_file_material(listed[0])
    assert item["public_url"] == CIAK and item["download_url"] is None and item["type"] == "video"


def test_masterclass_on_youtube_is_listed_too():
    r = rec("masterclass", None, video_youtube_url="https://www.youtube.com/watch?v=abc", video_pipeline_status="approved")
    assert r["file_id"] == "approved-video-p1-masterclass"
    assert r["public_url"].startswith("https://www.youtube.com/")
    assert len(partner_materiali_listing([r])) == 1


def test_a_link_on_a_blocked_host_is_not_exposed_as_public():
    r = rec(video_review_url="https://drive.google.com/file/d/abc/view", pipeline_status="approved")
    assert r["public_url"] is None                                 # mai un link Drive/GCS non fidato al partner


def test_video_without_any_link_creates_no_record():
    assert rec() is None


def test_review_status_prefers_the_review_copy_when_youtube_failed():
    r = rec(video_youtube_url="https://www.youtube.com/watch?v=old", video_review_url=CIAK, pipeline_status="ready_for_review_gcs")
    assert r["internal_url"] == CIAK
