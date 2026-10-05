import asyncio
import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services.ciak_manual_cut_job import ManualCutError, create_manual_cut_job
from tests._fake_mongo import FakeDb

pytestmark = pytest.mark.unit

PID = "p1"


def _db(lesson=None):
    base = {"output_version": 4, "output_gcs_url": "https://storage.googleapis.com/b/edited_videos/p1/lez-1/v4.mp4",
            "pipeline_status": "ready_for_review", "video_final_duration_s": 221}
    return FakeDb(partner_videocorso=[{"partner_id": PID, "lessons": {"lez-1": {**base, **(lesson or {})}}}],
                  lesson_manual_cuts=[])


def run(db, ranges=None, dispatch=None, lesson_id="lez-1", video_type="videocorso"):
    sent = []
    result = asyncio.run(create_manual_cut_job(
        db, partner_id=PID, lesson_id=lesson_id, video_type=video_type,
        ranges=ranges if ranges is not None else [{"start_s": 57, "end_s": 74}], actor_id="admin-1",
        dispatch=dispatch or (lambda cid: sent.append(cid))))
    return result, sent


def test_creates_a_job_books_the_lesson_and_queues_the_worker():
    db = _db()
    res, sent = run(db)
    assert res["target_output_version"] == 5 and sent == [res["cut_id"]]
    job = asyncio.run(db.lesson_manual_cuts.find_one({"cut_id": res["cut_id"]}))
    assert job["status"] == "queued" and job["source_output_version"] == 4
    assert job["ranges"] == [{"start_s": 57.0, "end_s": 74.0}]
    doc = asyncio.run(db.partner_videocorso.find_one({"partner_id": PID}))
    assert doc["lessons"]["lez-1"]["active_manual_cut_id"] == res["cut_id"]


def test_second_cut_while_one_is_active_is_refused():
    db = _db()
    run(db)
    with pytest.raises(ManualCutError) as e:
        run(db)
    assert e.value.status == 409


@pytest.mark.parametrize("lesson,status", [
    ({"pipeline_status": "approved"}, 400),            # non in attesa di approvazione
    ({"output_gcs_url": None}, 400),                    # niente video montato
    ({"output_version": 0}, 400),
])
def test_lessons_that_cannot_be_cut_are_refused(lesson, status):
    with pytest.raises(ManualCutError) as e:
        run(_db(lesson))
    assert e.value.status == status


def test_bad_ranges_and_non_lessons_are_refused_without_booking():
    db = _db()
    for bad in ([{"start_s": 80, "end_s": 70}], [{"start_s": 0, "end_s": 200}], []):
        with pytest.raises(ManualCutError) as e:
            run(db, ranges=bad)
        assert e.value.status == 400
    with pytest.raises(ManualCutError):
        run(db, video_type="masterclass")
    with pytest.raises(ManualCutError):
        run(db, lesson_id=None)
    doc = asyncio.run(db.partner_videocorso.find_one({"partner_id": PID}))
    assert not doc["lessons"]["lez-1"].get("active_manual_cut_id")      # nessuna prenotazione rimasta


def test_if_the_worker_cannot_be_reached_the_booking_is_released():
    db = _db()

    def broken(_):
        raise RuntimeError("redis giù")
    with pytest.raises(ManualCutError) as e:
        run(db, dispatch=broken)
    assert e.value.status == 503
    doc = asyncio.run(db.partner_videocorso.find_one({"partner_id": PID}))
    assert not doc["lessons"]["lez-1"].get("active_manual_cut_id")
    run(db)                                                              # ora si può riprovare
