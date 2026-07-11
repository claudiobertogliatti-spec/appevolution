import os
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from routers import lesson_video as lv

pytestmark = pytest.mark.unit


def test_resolve_lesson_url_from_doc():
    vc = {"lessons": {"m1_l2": {"output_gcs_url": "https://storage.googleapis.com/b/edited_videos/23/m1_l2/v1.mp4"}}}
    assert lv._resolve_output_url(vc, "m1_l2") == "https://storage.googleapis.com/b/edited_videos/23/m1_l2/v1.mp4"


def test_resolve_lesson_url_missing():
    assert lv._resolve_output_url({"lessons": {}}, "m1_l2") is None
    assert lv._resolve_output_url(None, "m1_l2") is None
