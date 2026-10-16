import asyncio
import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services.ciak_youtube_publish import (BUCKET, PublishError, create_publish_job, registration_fields,
                                           resolve_items)
from tests._fake_mongo import FakeDb

pytestmark = pytest.mark.unit

PID = "p1"
MC = f"gs://{BUCKET}/edited_videos/{PID}/masterclass/finale.mp4"


def _vc():
    return {"partner_id": PID, "lessons": {
        "lez-2": {"output_version": 4, "output_gcs_url": f"https://storage.googleapis.com/{BUCKET}/edited_videos/p1/lez-2/v4.mp4"},
        "lez-9": {"output_version": 0, "output_gcs_url": None}}}


def _db():
    return FakeDb(partners=[{"id": PID}], partner_videocorso=[_vc()], youtube_publish_jobs=[])


def run(db, requests, sent=None):
    sent = [] if sent is None else sent
    return asyncio.run(create_publish_job(db, partner_id=PID, requests=requests, actor_id="a1",
                                          dispatch=lambda jid: sent.append(jid))), sent


def test_lesson_and_masterclass_become_verified_items():
    items = resolve_items(PID, _vc(), [
        {"kind": "lesson", "lesson_id": "lez-2", "title": "Fredi · M01·L02 — Titolo"},
        {"kind": "masterclass", "gcs_path": MC, "title": "Fredi · MASTERCLASS"}])
    assert items[0]["gs_url"] == f"gs://{BUCKET}/edited_videos/p1/lez-2/v4.mp4" and items[0]["source_version"] == 4
    assert items[1]["gs_url"] == MC and [i["key"] for i in items] == ["lesson:lez-2", "masterclass"]


@pytest.mark.parametrize("requests", [
    [],                                                                                   # niente da pubblicare
    [{"kind": "lesson", "lesson_id": "lez-2", "title": ""}],                              # titolo mancante
    [{"kind": "lesson", "lesson_id": "lez-2", "title": "x" * 101}],                       # titolo troppo lungo
    [{"kind": "lesson", "lesson_id": "lez-9", "title": "t"}],                             # lezione senza montato
    [{"kind": "lesson", "lesson_id": "lez-77", "title": "t"}],                            # lezione inesistente
    [{"kind": "video", "title": "t"}],                                                    # tipo sconosciuto
    [{"kind": "masterclass", "gcs_path": f"gs://{BUCKET}/edited_videos/ALTRO/m.mp4", "title": "t"}],  # altro partner
    [{"kind": "masterclass", "gcs_path": f"gs://{BUCKET}/raw_videos/p1/m.mp4", "title": "t"}],        # fuori da edited_videos
    [{"kind": "masterclass", "gcs_path": f"gs://{BUCKET}/edited_videos/p1/../x/m.mp4", "title": "t"}],  # percorso con ..
    [{"kind": "masterclass", "gcs_path": f"gs://{BUCKET}/edited_videos/p1/m.mov", "title": "t"}],      # non mp4
    [{"kind": "lesson", "lesson_id": "lez-2", "title": "a"}, {"kind": "lesson", "lesson_id": "lez-2", "title": "b"}],  # doppio
])
def test_invalid_requests_are_refused(requests):
    with pytest.raises(PublishError) as e:
        resolve_items(PID, _vc(), requests)
    assert e.value.status == 400


def test_creates_a_job_and_queues_the_worker_once():
    db = _db()
    res, sent = run(db, [{"kind": "lesson", "lesson_id": "lez-2", "title": "T"}])
    assert sent == [res["job_id"]]
    job = asyncio.run(db.youtube_publish_jobs.find_one({"job_id": res["job_id"]}))
    assert job["status"] == "queued" and job["items"][0]["status"] == "queued"


def test_second_job_while_one_is_active_is_refused_and_unknown_partner_is_404():
    db = _db()
    run(db, [{"kind": "lesson", "lesson_id": "lez-2", "title": "T"}])
    with pytest.raises(PublishError) as e:
        run(db, [{"kind": "lesson", "lesson_id": "lez-2", "title": "T"}])
    assert e.value.status == 409
    with pytest.raises(PublishError) as e:
        asyncio.run(create_publish_job(_db(), partner_id="nessuno", requests=[{"kind": "lesson"}], actor_id="a",
                                       dispatch=lambda j: None))
    assert e.value.status == 404


def test_dispatch_failure_marks_the_job_failed_and_frees_the_partner():
    db = _db()

    def boom(_):
        raise RuntimeError("redis giu")
    with pytest.raises(PublishError) as e:
        asyncio.run(create_publish_job(db, partner_id=PID, actor_id="a", dispatch=boom,
                                       requests=[{"kind": "lesson", "lesson_id": "lez-2", "title": "T"}]))
    assert e.value.status == 503
    assert asyncio.run(db.youtube_publish_jobs.find_one({"status": "failed"}))
    run(db, [{"kind": "lesson", "lesson_id": "lez-2", "title": "T"}])  # di nuovo possibile


def test_registration_fields():
    lesson = registration_fields("lesson", "lez-2", "abc")
    assert lesson == {"lessons.lez-2.video_youtube_id": "abc",
                      "lessons.lez-2.video_youtube_url": "https://www.youtube.com/watch?v=abc"}  # il link di Ciak non si tocca
    mc = registration_fields("masterclass", None, "abc")
    assert mc["video_youtube_id"] == "abc" and "embed/abc" in mc["video_systeme_embed"]
