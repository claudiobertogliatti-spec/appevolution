import os
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_publish as cp

pytestmark = pytest.mark.unit


def test_edited_gcs_subpath():
    assert cp.edited_gcs_subpath("23", "m1_l2", 3) == "edited_videos/23/m1_l2/v3.mp4"


def test_ciak_lesson_url_default_base():
    assert cp.ciak_lesson_url("23", "m1_l2") == "https://www.ciak.io/api/lesson-video/23/m1_l2"


def test_ciak_lesson_url_custom_base_strips_slash():
    assert cp.ciak_lesson_url("23", "m1_l2", base="https://www.ciak.io/") == "https://www.ciak.io/api/lesson-video/23/m1_l2"


def test_embed_snippet():
    s = cp.embed_snippet("https://www.ciak.io/api/lesson-video/23/m1_l2")
    assert s.startswith("<video") and 'src="https://www.ciak.io/api/lesson-video/23/m1_l2"' in s and "controls" in s


def test_partner_file_doc():
    doc = cp.partner_file_doc("23", "m1_l2", "Il corpo non mente",
                              "https://www.ciak.io/api/lesson-video/23/m1_l2", now="2026-07-11T10:00:00Z")
    assert doc["partner_id"] == "23"
    assert doc["category"] == "lezione_video"
    assert doc["internal_url"] == "https://www.ciak.io/api/lesson-video/23/m1_l2"
    assert doc["original_name"] == "Il corpo non mente"
    assert doc["lesson_id"] == "m1_l2"
    assert isinstance(doc["file_id"], str) and len(doc["file_id"]) >= 8
    assert doc["created_at"] == "2026-07-11T10:00:00Z"
