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


def test_brand_profile_reads_colors_saved_by_the_brand_kit_step():
    step = {"data": {"colors": ["#000041", "#35B3CB"], "logo_url": "https://res.cloudinary.com/x/l.png"}}
    b = ls.brand_profile({"name": "Andrea Fredi"}, {}, step)
    assert b["primary"].lower() == "#000041" and b["brand_source"] == "partner"


OUTLINE = (
    "MODULO 1 — Le Fondamenta\nObiettivo: capire.\n"
    "1.1 Benvenuti nel Crogiolo della Trasformazione: il mondo interiore — TAI come sistema di miglioramento\n"
    "1.2 Il Punto Nave — dove sei e dove vuoi andare\n"
    "1.3 Senza trattino\n"
    "\nMODULO 2 — Scienza di Confine\n2.1 Le Tecniche Energetiche — le metodiche più efficaci\n"
)


def test_outline_titles_split_title_and_subtitle_on_the_long_dash():
    t = ls.outline_lesson_titles(OUTLINE)
    assert t[(1, 2)] == {"title": "Il Punto Nave", "subtitle": "Dove sei e dove vuoi andare"}
    assert t[(1, 3)] == {"title": "Senza trattino", "subtitle": ""}
    assert t[(1, 1)]["title"].startswith("Benvenuti nel Crogiolo") and t[(2, 1)]["title"] == "Le Tecniche Energetiche"
    assert (1, 4) not in t and ls.outline_lesson_titles("") == {} and ls.outline_lesson_titles(None) == {}


def test_real_title_replaces_the_bare_label_name_and_keeps_the_label():
    name, sub = ls.real_lesson_title("Modulo 1 Lezione 2.mp4", OUTLINE)
    assert (name, sub) == ("Modulo 1 Lezione 2 - Il Punto Nave", "Dove sei e dove vuoi andare")
    assert ls.lesson_label(name) == "Modulo 1 · Lezione 2" and ls.clean_title(name) == "Il Punto Nave"   # niente etichetta doppia


def test_real_title_never_invents_one():
    assert ls.real_lesson_title("Modulo 9 Lezione 9.mp4", OUTLINE) == ("Modulo 9 Lezione 9.mp4", "")      # voce assente
    assert ls.real_lesson_title("VID20260614181223.mp4", OUTLINE) == ("VID20260614181223.mp4", "")        # nome senza modulo/lezione
    assert ls.real_lesson_title("Modulo 1 Lezione 2.mp4", "") == ("Modulo 1 Lezione 2.mp4", "")           # nessuna scaletta


@pytest.mark.skipif(not ls._cover_font_path(), reason="font di sistema non disponibile")
def test_cover_uses_the_subtitle_and_never_overflows():
    brand = {"name": "TAI", "partner_name": "Andrea Fredi", "primary": "#000041", "background": "#F2EFE8", "text": "#20201E"}
    long_sub = "una frase lunghissima " * 12
    img = ls.draw_cover(brand, "Il Punto Nave", "Modulo 1 · Lezione 2", None, long_sub)
    assert img.size == ls.COVER_SIZE
    ls.draw_cover(brand, "Il Punto Nave", "Modulo 1 · Lezione 2", None)        # senza sottotitolo: il solito testo
