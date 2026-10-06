import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_lesson_review_cuts as rc

pytestmark = pytest.mark.unit


def test_flag_all_none_or_only_listed_partners():
    assert rc.lesson_review_enabled_for("p1", {}) is False
    assert rc.lesson_review_enabled_for("p1", {"LESSON_REVIEW_ENABLED": "true"}) is True
    only = {"LESSON_REVIEW_PARTNERS": " p1 , p2 "}
    assert rc.lesson_review_enabled_for("p2", only) and not rc.lesson_review_enabled_for("p3", only)
    assert not rc.lesson_review_enabled_for("", {"LESSON_REVIEW_PARTNERS": ","})


def test_proposals_shrink_non_exact_cuts_and_become_exact():
    out = rc.proposals_for_review([
        {"start": 10.0, "end": 12.0, "type": "filler", "word": "ehm", "exact": False},   # margine 0,3 per lato
        {"start": 20.0, "end": 20.5, "type": "filler", "exact": False},                  # troppo corto: sparisce
        {"start": 30.0, "end": 35.0, "type": "smart", "reason": "balbettio", "exact": True},
    ])
    assert [(c["start"], c["end"]) for c in out] == [(10.3, 11.7), (30.0, 35.0)]
    assert all(c["exact"] and c["enabled"] for c in out) and [c["id"] for c in out] == [0, 1]


def test_decisions_disable_proposals_and_add_manual_cuts():
    segs = [{"id": 0, "start": 1, "end": 2, "type": "silence"}, {"id": 1, "start": 5, "end": 6, "type": "smart"}]
    out = rc.apply_review_decisions(segs, [1], [{"start_s": 57, "end_s": 74}], 300)
    assert [(c["id"], c["enabled"]) for c in out] == [(0, True), (1, False), ("m1", True)]
    assert out[-1]["type"] == "manual" and (out[-1]["start"], out[-1]["end"]) == (57.0, 74.0)


@pytest.mark.parametrize("bad", [
    [{"start_s": 80, "end_s": 70}], [{"start_s": -1, "end_s": 5}], [{"start_s": 100, "end_s": 900}],
    [{"start_s": "x", "end_s": 5}], [{"start_s": 0, "end_s": 200}],                  # oltre la meta
])
def test_invalid_manual_cuts_are_refused_with_a_message(bad):
    with pytest.raises(ValueError):
        rc.apply_review_decisions([], [], bad, 300)


def test_render_cuts_are_authoritative_long_and_merged_and_report_protected_touches():
    segs = [{"start": 10, "end": 40, "enabled": True, "type": "smart", "reason": "ripresa"},        # 30 s: oltre il vecchio limite 2,5
            {"start": 35, "end": 50, "enabled": True, "type": "manual"},                           # si fonde col precedente
            {"start": 70, "end": 71, "enabled": False, "type": "silence"},                         # disattivato
            {"start": 100, "end": 110, "enabled": True, "type": "silence"}]
    r = rc.cuts_for_render(segs, [{"start": 105, "end": 120}])
    assert [(c["start"], c["end"]) for c in r["cuts"]] == [(10.0, 50.0), (100.0, 110.0)]
    assert all(c["exact"] for c in r["cuts"]) and r["cut_s"] == 50.0 and r["touching_protected"] == 1
    assert rc.cuts_for_render([], [])["cuts"] == []


def test_long_retakes_from_the_rules_are_proposed_switched_off_with_a_warning():
    out = rc.proposals_for_review([
        {"start": 221.8, "end": 253.5, "type": "smart", "reason": "ripresa ripetuta: si tiene l'ultima"},      # 31,7 s: falso positivo reale
        {"start": 490.4, "end": 494.0, "type": "smart", "reason": "ripresa ripetuta: si tiene l'ultima"},      # 3,6 s: tenuto da Claudio
        {"start": 14.6, "end": 16.8, "type": "smart", "reason": "TENTATIVI MULTIPLI"},
        {"start": 400.0, "end": 430.0, "type": "smart", "reason": "TENTATIVI MULTIPLI: passaggio confuso"},   # l'AI e un'altra cosa: resta acceso
    ])
    assert [c["enabled"] for c in out] == [False, True, True, True]
    assert out[0]["reason"].startswith("da controllare (32 s): ripresa ripetuta")
