import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from routers import partner_journey

pytestmark = pytest.mark.unit


def test_masterclass_review_response_includes_review_note_and_pipeline_error():
    response = partner_journey._build_masterclass_review_response({
        "video_pipeline_status": "da_revisionare",
        "review_transcript": "testo",
        "review_words": [{"text": "testo", "start": 0, "end": 1}],
        "review_cut_segments": [],
        "review_filler_report": {"fillers": 0},
        "review_note": "Trascrizione parziale: AssemblyAI credito insufficiente.",
        "video_pipeline_error": "balance negative",
        "script": "script",
        "video_raw_duration_s": 12,
        "review_created_at": "2026-07-10T10:00:00+00:00",
    })

    assert response["review_note"] == "Trascrizione parziale: AssemblyAI credito insufficiente."
    assert response["pipeline_error"] == "balance negative"
    assert response["transcript"] == "testo"
