import os
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_lesson_standard as ls

pytestmark = pytest.mark.unit


def _words(items):
    return [{"text": text, "start": start, "end": end} for text, start, end in items]


def test_silence_cut_keeps_seven_tenths_of_breath():
    words = _words([("prima", 0.0, 1.0), ("dopo", 4.0, 5.0)])
    cuts = ls.lesson_silence_cuts(words, 5)
    assert cuts == [{"start": 1.35, "end": 3.65, "type": "silence",
                     "reason": "pausa morta oltre 1,3s", "word": "", "exact": True}]


def test_short_natural_pause_is_preserved():
    words = _words([("prima", 0.0, 1.0), ("dopo", 2.2, 3.0)])
    assert ls.lesson_silence_cuts(words, 3) == []


def test_guided_exercise_is_protected_including_long_silence():
    words = _words([
        ("chiudi", 0.0, 0.3), ("gli", 0.3, 0.4), ("occhi", 0.4, 0.8),
        ("respira", 5.0, 5.5), ("riapri", 10.0, 10.4), ("gli", 10.4, 10.5),
        ("occhi", 10.5, 10.9), ("ora", 12.8, 13.0),
    ])
    ranges = ls.protected_exercise_ranges(words)
    assert ranges and ranges[0]["start"] == 0.0
    cuts = ls.lesson_silence_cuts(words, 13)
    assert all(not ls.overlaps(c, ranges) for c in cuts)


def test_policy_rejects_generic_silence_and_long_ai_cut():
    words = _words([("ciao", 0.0, 0.4), ("mondo", 4.0, 4.4)])
    result = ls.enforce_lesson_policy([
        {"start": 0.4, "end": 4.0, "type": "silence"},
        {"start": 0.0, "end": 3.0, "type": "smart", "reason": "riformulazione"},
    ], words, 4.4)
    assert len(result["rejected"]) == 2
    assert result["cuts"][0]["start"] == 0.75
    assert result["standard_version"] == "ciak-lesson-v1"


def test_rhetorical_filler_is_never_removed_automatically():
    words = _words([("Ecco", 0.0, 0.4), ("il", 0.5, 0.6), ("punto", 0.7, 1.0)])
    result = ls.enforce_lesson_policy([
        {"start": 0.0, "end": 0.4, "type": "filler", "word": "ecco"},
    ], words, 1.0)
    assert result["cuts"] == []
    assert len(result["rejected"]) == 1


def test_brand_profile_never_falls_back_to_ciak_yellow():
    profile = ls.brand_profile({"name": "Cosimo"}, {}, {})
    assert profile["brand_source"] == "neutral-fallback"
    assert profile["primary"] == "#B7793C"
    assert profile["primary"] != "#FACC15"


def test_partner_brand_has_priority():
    profile = ls.brand_profile(
        {"name": "Partner"},
        {"projectName": "Accademia", "primaryColor": "#123456", "textColor": "#101010"},
        {"data": {"colori": ["#FFFFFF"]}},
    )
    assert profile["name"] == "Accademia"
    assert profile["primary"] == "#123456"
    assert profile["brand_source"] == "partner"


def test_intro_fallback_is_short_and_italian():
    text = ls.intro_fallback("l'arte dell'ascolto")
    assert text.startswith("In questa lezione")
    assert "l'arte dell'ascolto" in text
