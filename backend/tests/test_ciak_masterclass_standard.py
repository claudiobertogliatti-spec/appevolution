import pytest

from services import ciak_masterclass_standard as mc

pytestmark = pytest.mark.unit


def W(text, start, end=None):
    return {"text": text, "start": start, "end": end if end is not None else start + 0.3}


def seq(tokens, t0=0.0, step=0.4):
    """Parole consecutive: ogni parola dura 0,3 s, passo 0,4 s."""
    return [W(t, round(t0 + i * step, 3)) for i, t in enumerate(tokens)]


# ── pratiche guidate ──────────────────────────────────────────────────────────────

def _practice_scenario(with_cues=True):
    words = seq("questa è la spiegazione prima della pratica".split(), 0)
    words += seq((["porta", "il", "respiro", "sotto", "ombelico", "dantian", "calma"] if with_cues
                  else ["parliamo", "un", "momento", "di", "altro", "adesso", "calma"]), 200, 5)
    silences = [{"start": 210 + i * 10, "end": 212.2 + i * 10} for i in range(5)]   # 5 pause da 2,2 s tra 210 e 252
    return words, silences


def test_practice_range_needs_cues_and_dense_long_pauses():
    words, silences = _practice_scenario(True)
    rng = mc.practice_ranges(words, silences, 400)
    assert len(rng) == 1
    assert rng[0]["start"] <= 210 and rng[0]["end"] >= 252


def test_long_pauses_without_practice_words_are_not_a_practice():
    words, silences = _practice_scenario(False)
    assert mc.practice_ranges(words, silences, 400) == []   # es. interruzione fuori campo, non un esercizio


def test_few_long_pauses_are_not_a_practice():
    words, silences = _practice_scenario(True)
    assert mc.practice_ranges(words, silences[:2], 400) == []


# ── pause ─────────────────────────────────────────────────────────────────────────

def test_silence_cuts_only_over_1_3s_and_leave_breath():
    cuts = mc.silence_cuts([{"start": 10, "end": 11.2}, {"start": 20, "end": 23}], [])
    assert len(cuts) == 1
    assert cuts[0]["start"] == pytest.approx(20.35) and cuts[0]["end"] == pytest.approx(22.65)


def test_silence_cuts_never_touch_a_practice():
    cuts = mc.silence_cuts([{"start": 100, "end": 106.8}, {"start": 300, "end": 303}], [{"start": 90, "end": 120}])
    assert [c["start"] for c in cuts] == [pytest.approx(300.35)]


# ── riprese ripetute e balbettii ──────────────────────────────────────────────────

def test_retake_keeps_the_last_take():
    first = "oggi ti mostrerò come funziona davvero".split()
    words = seq(first + ["ok", "rifacciamo", "da", "qua"] + first + "e ti darò tre strumenti".split(), 0)
    cuts = mc.repeat_cuts(words, [])
    smart = [c for c in cuts if c["reason"].startswith("ripresa")]
    assert len(smart) == 1
    assert smart[0]["start"] == words[0]["start"]
    assert smart[0]["end"] == words[len(first) + 4]["start"]          # fino all'inizio dell'ultima ripresa


def test_stutter_removes_the_first_copy():
    words = seq("clicca sul sul pulsante qui sotto".split(), 0)
    cuts = [c for c in mc.repeat_cuts(words, []) if c["reason"] == "balbettio"]
    assert len(cuts) == 1 and cuts[0]["word"] == "sul"
    assert cuts[0]["start"] == words[1]["start"] and cuts[0]["end"] == words[2]["start"]


def test_repeats_inside_a_practice_are_kept():
    words = seq("respira respira respira piano piano piano".split(), 100)
    assert mc.repeat_cuts(words, [{"start": 90, "end": 200}]) == []


def test_fillers_are_cut_only_when_short_and_unprotected():
    words = [W("allora", 1, 1.3), W("ehm", 2, 2.4), W("ehm", 50, 50.3)]
    cuts = mc.filler_cuts(words, [{"start": 45, "end": 60}])
    assert [c["word"] for c in cuts] == ["ehm"] and cuts[0]["start"] == 2


# ── tagli AI, piano e mappatura dei tempi ─────────────────────────────────────────

def test_ai_cuts_are_bounded():
    prot = [{"start": 500, "end": 700}]
    out = mc.validate_ai_cuts([
        {"start": 10, "end": 150, "reason": "bio"},           # 140 s > 120
        {"start": 20, "end": 60, "reason": "bio lunga"},       # ok
        {"start": 480, "end": 520, "reason": "esercizio"},     # tocca la pratica
        {"start": 100, "end": 90, "reason": "invalido"},
    ], [], prot, 1800)
    assert [c["start"] for c in out["accepted"]] == [20.0]
    assert len(out["rejected"]) == 3


def test_ai_cuts_total_share_is_capped_at_15_percent():
    cands = [{"start": i * 200, "end": i * 200 + 100, "reason": "x"} for i in range(5)]   # 5×100 s su 1800 s
    out = mc.validate_ai_cuts(cands, [], [], 1800)
    assert out["total_s"] <= 0.15 * 1800


def test_assemble_plan_merges_overlaps_and_builds_keep():
    plan = mc.assemble_plan([{"start": 10, "end": 20}], [{"start": 15, "end": 30, "type": "smart"}],
                            duration_s=100)
    assert len(plan["cuts"]) == 1 and plan["cuts"][0]["end"] == 30 and plan["cuts"][0]["type"] == "smart"
    assert plan["keep"] == [(0.0, 10.0), (30.0, 100.0)]
    assert plan["kept_s"] == 80.0 and plan["cut_s"] == 20.0


def test_map_time_and_range():
    keep = [(0.0, 10.0), (30.0, 100.0)]
    assert mc.map_time(5, keep) == 5 and mc.map_time(35, keep) == 15 and mc.map_time(20, keep) is None
    assert mc.map_range(8, 40, keep) == (8.0, 20.0)          # si restringe a ciò che resta
    assert mc.map_range(12, 28, keep) is None                # sparisce


# ── schede ────────────────────────────────────────────────────────────────────────

def _card(s, e, **kw):
    return {"start": s, "end": e, "kind": "quote", "kicker": "tappa", "lines": ["una riga"], **kw}


def test_cards_never_cover_a_practice_and_respect_limits():
    prot = [{"start": 100, "end": 200}]
    out = mc.validate_cards([
        _card(5, 20), _card(110, 130), _card(25, 27),                      # ok / sopra pratica / troppo breve
        _card(30, 40, kind="gif"), _card(50, 60, lines=["a", "b", "c", "d"]),   # tipo / troppe righe
        _card(70, 80, lines=["parola terapia qui"]),
    ], prot, 600, banned=["terapia"])
    ok = [c["start"] for c in out["accepted"]]
    assert ok == [5.0]
    reasons = {c["start"]: c["rejected_because"] for c in out["rejected"]}
    assert reasons[110.0] == "sopra una pratica guidata"
    assert reasons[25.0] == "durata fuori da 3-45 s"
    assert reasons[30.0] == "tipo non ammesso"
    assert reasons[70.0] == "parola vietata"
    assert reasons[50.0] == "righe non valide"


def test_overlapping_cards_are_rejected():
    out = mc.validate_cards([_card(5, 20), _card(15, 30)], [], 600)
    assert len(out["accepted"]) == 1 and out["rejected"][0]["rejected_because"].startswith("sovrapposta")


def test_parse_cards_tolerates_prose_and_fences():
    raw = 'Ecco:\n```json\n[{"start":1,"end":5,"kind":"quote","kicker":"k","lines":["x"]}]\n```'
    assert len(mc.parse_cards(raw)) == 1 and mc.parse_cards("niente") == []


# ── palette del partner ───────────────────────────────────────────────────────────

def test_palette_comes_from_the_partner_brand_not_ciak():
    p = mc.card_palette(["#000041", "#35B3CB", "#F67563"])
    assert p["background"] == "#000041" and p["source"] == "partner"
    assert p["accent"] in ("#35B3CB", "#F67563") and p["text"] == "#FFFFFF"


def test_palette_with_only_light_colors_uses_a_dark_neutral_background():
    p = mc.card_palette(["#F2EFE8", "#FFE8A0"])
    assert p["background"] == "#14181F"


def test_palette_without_colors_is_neutral_and_never_ciak_yellow():
    p = mc.card_palette([])
    assert p["source"] == "neutral-fallback" and "#FACC15" not in p.values()


# ── ffmpeg: grafo dei filtri (senza eseguire ffmpeg) ──────────────────────────────

def test_pieces_replace_the_face_with_the_card_and_map_back_to_the_source():
    keep = [(0.0, 10.0), (30.0, 60.0)]                         # montato: 0-10 e 10-40
    cards = [{"start": 8.0, "end": 14.0}]                      # a cavallo del taglio
    pieces = mc.edited_pieces(keep, cards)
    assert [("card" in p) for p in pieces] == [False, True, False]
    assert pieces[0]["src"] == (0.0, 8.0)
    assert pieces[1]["dur"] == 6.0 and pieces[1]["card"] == 0
    assert pieces[2]["src"] == (34.0, 60.0)                    # 14 s del montato = 34 s del girato
    assert sum(p["dur"] for p in pieces) == 40.0


def test_filter_script_has_one_video_piece_per_interval_and_no_overlay():
    keep = [(0.0, 10.0), (30.0, 60.0)]
    cards = [{"start": 2.0, "end": 6.0}, {"start": 15.0, "end": 20.0}]
    s = mc.build_filter_script(keep, cards, (1280, 720), 25, "loudnorm=I=-17.5")
    assert "overlay" not in s
    assert "[0:v]split=4" in s                                  # 4 pezzi di volto (il taglio a 10 s ne divide uno)
    assert "concat=n=6:v=1:a=0[vout]" in s                      # 4 volti + 2 schede
    assert "[1:v]null[c0_0]" in s and "[2:v]null[c1_0]" in s
    assert "concat=n=2:v=0:a=1[ac0]" in s and "[ac0]loudnorm=I=-17.5[aout]" in s
    assert s.count("afade=t=in") == 2                           # micro-dissolvenze audio su ogni giunzione


def test_adjacent_pauses_around_a_cut_are_shortened_when_their_sum_exceeds_the_limit():
    sil = [{"start": 10.0, "end": 10.9}, {"start": 11.3, "end": 12.1}]            # 0,9 s + 0,8 s attorno a un "ehm"
    cut = [{"start": 10.9, "end": 11.3, "type": "filler"}]
    out = mc.adjacent_pause_cuts(sil, cut, [])
    assert len(out) == 2 and all(c["type"] == "silence" for c in out)
    assert mc.adjacent_pause_cuts([{"start": 10.0, "end": 10.5}, {"start": 11.3, "end": 11.8}], cut, []) == []
    assert mc.adjacent_pause_cuts(sil, cut, [{"start": 9, "end": 13}]) == []


def test_loudnorm_filter_compresses_before_normalizing():
    m = {"input_i": "-11.8", "input_lra": "5.8", "input_tp": "-1", "input_thresh": "-22", "target_offset": "0.1"}
    assert mc.loudnorm_filter(m).startswith("acompressor=")
