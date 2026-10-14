import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import video_health as vh
from services.ciak_video_intake import BUCKET, IntakeError, intake_fields, raw_prefix, resolve_items

pytestmark = pytest.mark.unit

PID = "p1"


def path(lesson="lez-34", name="x.mp4"):
    return raw_prefix(PID, lesson) + name


def req(lesson="lez-34", title="Alchimia interiore sulle percezioni", gcs=None):
    return {"lesson_id": lesson, "title": title, "gcs_path": gcs if gcs is not None else path(lesson)}


def test_valid_items_become_lessons_to_register():
    out = resolve_items(PID, {"lessons": {}}, [req("lez-34"), req("lez-35", "Solve et Coagula", path("lez-35", "y.mov"))])
    assert [i["lesson_id"] for i in out] == ["lez-34", "lez-35"] and out[0]["gcs_path"] == path("lez-34")


@pytest.mark.parametrize("bad,status", [
    ([], 400),                                                            # niente da caricare
    ([req("lezione-34")], 400),                                           # id non valido
    ([req(title="ab")], 400),                                             # titolo troppo corto
    ([req(gcs=f"gs://{BUCKET}/raw_videos/ALTRO/videocorso/lez-34/x.mp4")], 400),   # altro partner
    ([req(gcs=f"gs://{BUCKET}/raw_videos/{PID}/videocorso/lez-35/x.mp4")], 400),   # cartella di un'altra lezione
    ([req(gcs=path("lez-34") + "/../x.mp4")], 400),                      # percorso con ..
    ([req(gcs=path("lez-34", "x.avi"))], 400),                            # estensione non video
    ([req("lez-34"), req("lez-34")], 400),                                # doppio
])
def test_invalid_requests_are_refused(bad, status):
    with pytest.raises(IntakeError) as e:
        resolve_items(PID, {"lessons": {}}, bad)
    assert e.value.status == status


def test_a_lesson_that_already_has_a_video_is_never_overwritten():
    vc = {"lessons": {"lez-34": {"video_raw_url": "gs://x/y.mp4"}, "lez-35": {"video_youtube_id": "abc"}}}
    for lesson in ("lez-34", "lez-35"):
        with pytest.raises(IntakeError) as e:
            resolve_items(PID, vc, [req(lesson)])
        assert e.value.status == 409
    # una lezione bonus ferma senza video si puo' registrare
    assert resolve_items(PID, {"lessons": {"lez-31": {"status": "processing"}}}, [req("lez-31")])


def test_registration_writes_a_parked_status_that_starts_nothing_and_is_not_flagged_stuck():
    f = intake_fields({"lesson_id": "lez-34", "title": "T", "gcs_path": path()}, "2026-10-14T18:00:00+00:00", "admin")
    assert f["lessons.lez-34.status"] == "caricato" and f["lessons.lez-34.pipeline_status"] == "caricato"
    assert f["lessons.lez-34.video_raw_url"] == path()
    # "caricato" non e' uno stato di lavorazione: niente "bloccato" e niente errore nel monitor
    assert "caricato" not in vh.IN_PROGRESS_STATES
    assert vh.classify("caricato", None, "2020-01-01T00:00:00+00:00", vh.parse_iso("2026-10-14T18:00:00+00:00"))[1] is False
    assert vh.partner_facing_video_status("caricato")["partner_status"] == "ricevuto"
