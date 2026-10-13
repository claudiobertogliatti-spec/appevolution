"""Massimo tre video in lavorazione: il posto si libera quando Antonella verifica."""
import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

from services import limite_video as lv
from services.coda_antonella import chiave_lezione

pytestmark = pytest.mark.unit


def lez(v=1, **kw):
    return {"output_version": v, "video_raw_url": "gs://x", "pipeline_status": "ready_for_review", **kw}


def test_three_uploads_fill_the_queue_and_the_fourth_is_refused():
    lessons = {"l1": lez(), "l2": lez(), "l3": lez()}
    s = lv.stato_upload(lessons)
    assert s["in_lavorazione"] == 3 and s["puo_caricare"] is False
    assert "massimo" in s["messaggio"] and "avvisiamo" in s["messaggio"]


def test_a_verified_lesson_frees_its_place():
    lessons = {"l1": lez(), "l2": lez(), "l3": lez()}
    esiti = {chiave_lezione("p1", "l2", 1): {"esito": "verificata"}}
    s = lv.stato_upload(lessons, esiti, chiave_lezione, "p1")
    assert s["in_lavorazione"] == 2 and s["puo_caricare"] is True
    assert s["lezioni_in_lavorazione"] == ["l1", "l3"]
    assert s["messaggio"] == "Puoi caricare ancora un video."


def test_a_lesson_sent_back_for_correction_keeps_its_place():
    """«Da correggere» significa che il lavoro non è finito: il posto resta occupato."""
    lessons = {"l1": lez(), "l2": lez(), "l3": lez()}
    esiti = {chiave_lezione("p1", "l2", 1): {"esito": "da_correggere"}}
    assert lv.stato_upload(lessons, esiti, chiave_lezione, "p1")["puo_caricare"] is False


def test_a_new_version_of_a_verified_lesson_occupies_a_place_again():
    """Rimontata (versione 2): l'esito sulla versione 1 non vale più."""
    esiti = {chiave_lezione("p1", "l1", 1): {"esito": "verificata"}}
    assert lv.stato_upload({"l1": lez(v=2)}, esiti, chiave_lezione, "p1")["in_lavorazione"] == 1


def test_an_empty_or_planned_course_does_not_block_anything():
    for lessons in (None, {}, {"l1": {"title": "Lezione 1"}}, {"l1": "non un dizionario"}):
        s = lv.stato_upload(lessons)
        assert s["puo_caricare"] is True and s["in_lavorazione"] == 0
    assert lv.stato_upload({"l1": {"title": "x"}})["messaggio"] == "Puoi caricare ancora 3 video."
