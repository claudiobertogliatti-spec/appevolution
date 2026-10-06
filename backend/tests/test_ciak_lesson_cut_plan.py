import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_lesson_cut_plan as cp

pytestmark = pytest.mark.unit


def seq(tokens, t0=0.0, step=0.4):
    return [{"text": t, "start": round(t0 + i * step, 3), "end": round(t0 + i * step + 0.3, 3)} for i, t in enumerate(tokens)]


def cuts_of(plan, kind=None):
    return [c for c in plan["cuts"] if kind is None or c["type"] == kind]


def test_stutters_and_restarted_phrases_are_cut_keeping_the_last_copy():
    words = seq("oggi vedremo come di di determinare dove ti trovi vorrei migliorare questo vorrei migliorare questo adesso".split())
    plan = cp.plan_lesson_cuts(words, 20)
    removed = {w["text"]: 0 for w in words}
    kept = [w for w in words if not any(c["start"] <= w["start"] < c["end"] for c in plan["cuts"])]
    text = " ".join(w["text"] for w in kept)
    assert "di di" not in text and text.count("vorrei migliorare questo") == 1
    assert plan["stats"]["ripetizioni"] >= 2 and all(c["exact"] for c in plan["cuts"])


def test_a_pause_over_one_second_is_trimmed_but_the_breath_stays():
    words = seq(["prima"], 0) + seq(["dopo"], 2.4)          # vuoto di ~2,1 s
    plan = cp.plan_lesson_cuts(words, 6)
    c = cuts_of(plan, "silence")
    assert len(c) == 1 and c[0]["start"] == pytest.approx(0.65) and c[0]["end"] == pytest.approx(2.05)
    # una pausa di 1,2 s NON si taglia con la vecchia soglia (1,3 s) ma si taglia con quella nuova (1,0 s)
    words = seq(["prima"], 0) + seq(["dopo"], 1.5)           # vuoto di 1,2 s
    assert cuts_of(cp.plan_lesson_cuts(words, 4, pause_max_s=1.3), "silence") == []
    assert len(cuts_of(cp.plan_lesson_cuts(words, 4), "silence")) == 1


def test_guided_exercise_is_never_touched():
    words = seq("chiudi gli occhi respira respira piano piano".split(), 10) + seq(["riapri", "gli", "occhi"], 40)
    sil = [{"start": 14.0, "end": 19.0}]                    # lunga pausa dentro l'esercizio
    plan = cp.plan_lesson_cuts(words, 50, silences=sil)
    assert plan["protected_ranges"]
    assert not any(c["start"] < 20 and c["end"] > 10 for c in plan["cuts"])


def test_ai_cuts_are_validated_over_exercises_over_one_minute_and_by_share():
    words = seq("introduzione lunga che ripete tutto " .split() * 20, 0)           # ~140 parole, ~56 s
    ai = [
        {"start": 5, "end": 15, "reason": "stessa idea detta due volte"},          # ok
        {"start": 0, "end": 200, "reason": "troppo lungo"},                         # oltre 60 s
        "non-un-dizionario",                                                         # sporco
        {"start": "x", "end": 3, "reason": "illeggibile"},
    ]
    plan = cp.plan_lesson_cuts(words, 600, ai_candidates=ai)
    assert [(c["start"], c["end"]) for c in plan["ai_cuts"]] == [(5.0, 15.0)]
    assert plan["stats"]["ai_proposed"] == 3 and any("oltre 60 s" in r["reason"] for r in plan["rejected"])


def test_transcriber_fillers_are_kept_with_a_margin_but_never_overlap_a_decided_cut():
    words = seq(["uno", "due", "tre", "quattro", "cinque"], 0, 1.0)
    extra = [{"start": 1.0, "end": 2.4, "type": "filler", "word": "ehm"},           # libero
             {"start": 10.0, "end": 12.0, "type": "filler", "word": "ehm"}]
    sil = [{"start": 3.3, "end": 5.0}]
    plan = cp.plan_lesson_cuts(words, 20, silences=sil, extra_cuts=extra)
    fillers = [c for c in plan["cuts"] if c["type"] == "filler"]
    assert len(fillers) == 2 and all(c["exact"] is False for c in fillers)
    again = cp.plan_lesson_cuts(words, 20, silences=sil, extra_cuts=[{"start": 3.5, "end": 4.5, "type": "filler"}])
    assert not any(c["type"] == "filler" for c in again["cuts"])                    # cade dentro una pausa gia tagliata
    ids = [c["id"] for c in plan["cuts"]]
    assert ids == sorted(ids) == list(range(len(ids)))


def test_prompt_lists_protected_ranges_and_forbids_touching_them():
    p = cp.build_lesson_ai_prompt(seq(["ciao", "mondo"]), [{"start": 100, "end": 200}])
    assert "100-200s" in p and "MAI gli esercizi guidati" in p and "ciao | 0.00-0.30" in p


def test_overlapping_repeat_cuts_keep_only_the_first_so_the_last_copy_survives():
    cuts = [{"start": 11.9, "end": 16.0, "type": "smart"}, {"start": 13.4, "end": 19.0, "type": "smart"},
            {"start": 30.0, "end": 31.0, "type": "smart"}, {"start": 16.0, "end": 17.0, "type": "smart"}]
    out = cp.drop_overlapping_repeats(cuts)
    assert [(c["start"], c["end"]) for c in out] == [(11.9, 16.0), (16.0, 17.0), (30.0, 31.0)]   # il secondo e dentro il primo: scartato
    assert cp.drop_overlapping_repeats([]) == []


def test_rephrase_proposals_from_the_ai_are_kept_but_literal_repeats_and_multiple_attempts_pass():
    words = seq(["parola"] * 60, 0, 1.0)
    ai = [
        {"start": 10, "end": 14, "reason": "Ripetizione di 'per questi vari' - falsa partenza e riformulazione"},
        {"start": 20, "end": 23, "reason": "Ripetizione di 'che effettivamente' - riformulazione ridondante della stessa idea"},
        {"start": 30, "end": 31, "reason": "Falsa partenza 'hai' seguita da pausa"},
        {"start": 40, "end": 44, "reason": "RIPETIZIONE LETTERALE di 'per poter tracciare una rotta' gia detta"},
        {"start": 50, "end": 57, "reason": "TENTATIVI MULTIPLI: quattro formulazioni della stessa frase"},
    ]
    plan = cp.plan_lesson_cuts(words, 100, ai_candidates=ai)
    assert [(c["start"], c["end"]) for c in plan["ai_cuts"]] == [(40.0, 44.0), (50.0, 57.0)]
    assert sum("riformulazione nel parlato naturale" in r["reason"] for r in plan["rejected"]) == 3
    assert not cp.is_rephrase_proposal("RIPETIZIONE LETTERALE ... gia detta immediatamente")
    assert not cp.is_rephrase_proposal("DIGRESSIONE fuori tema")
    assert cp.is_rephrase_proposal("falsa partenza e riformulazione")


def test_prompt_asks_for_whole_confused_passages_and_keeps_natural_rephrasing():
    p = cp.build_lesson_ai_prompt(seq(["ciao"]), [])
    assert "TENTATIVI MULTIPLI" in p and "RIPETIZIONE LETTERALE" in p and "NON proporre MAI: riformulazioni brevi" in p
