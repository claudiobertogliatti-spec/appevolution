import os
import shutil
import subprocess

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_quiet_stretches as q
from services.ciak_lesson_standard import reusable_intro

pytestmark = pytest.mark.unit


def test_quiet_stretch_with_isolated_noise_bursts_is_still_one_stretch():
    # caso reale (lezione 4): 3,5 s di aria morta con qualche rumorino a -18 dB che silencedetect non vede come pausa
    speech, quiet = [-20.0] * 10, [-45.0] * 12
    levels = speech + quiet[:5] + [-18.0] + quiet[5:] + speech            # un rumorino da 0,1 s nel mezzo
    out = q.stretches_from_levels(levels)
    assert len(out) == 1 and out[0]["start"] == pytest.approx(1.0) and out[0]["duration"] == pytest.approx(1.3)


def test_a_longer_noise_splits_the_stretch_and_short_quiet_runs_are_ignored():
    levels = [-20.0] * 5 + [-45.0] * 10 + [-20.0] * 5 + [-45.0] * 10 + [-20.0] * 5        # 1,0 s, parlato 0,5 s, 1,0 s
    assert [round(s["duration"], 1) for s in q.stretches_from_levels(levels)] == [1.0, 1.0]
    assert q.stretches_from_levels([-20.0] * 5 + [-45.0] * 5 + [-20.0] * 5) == []         # 0,5 s: pausa normale, non si tocca
    assert q.stretches_from_levels([]) == []


def test_normal_speech_is_never_quiet():
    assert q.stretches_from_levels([-24.0, -19.0, -31.0, -36.0, -22.0] * 40) == []


def test_merge_silences_unites_overlaps_and_keeps_order():
    a = [{"start": 10.0, "end": 11.0}, {"start": 40.0, "end": 41.0}]
    b = [{"start": 10.5, "end": 14.0}, {"start": 20.0, "end": 20.8}]
    out = q.merge_silences(a, b)
    assert [(s["start"], s["end"]) for s in out] == [(10.0, 14.0), (20.0, 20.8), (40.0, 41.0)]
    assert out[0]["duration"] == pytest.approx(4.0) and q.merge_silences(None, []) == []


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg non disponibile")
def test_real_audio_dead_air_with_clicks_is_found(tmp_path):
    wav = tmp_path / "t.wav"
    # 2 s di tono, 3 s di rumore molto basso con un click, 2 s di tono
    subprocess.run(["ffmpeg", "-y", "-v", "error",
                    "-f", "lavfi", "-i", "sine=frequency=300:sample_rate=16000:duration=2",
                    "-f", "lavfi", "-i", "anoisesrc=color=white:amplitude=0.003:sample_rate=16000:duration=3",
                    "-f", "lavfi", "-i", "sine=frequency=300:sample_rate=16000:duration=2",
                    "-filter_complex", "[1:a]volume=1[n];[0:a][n][2:a]concat=n=3:v=0:a=1[o]", "-map", "[o]", str(wav)], check=True)
    found = q.quiet_stretches(str(wav))
    assert len(found) == 1 and found[0]["duration"] == pytest.approx(3.0, abs=0.35) and found[0]["start"] == pytest.approx(2.0, abs=0.2)


def test_intro_is_reused_only_for_the_same_title():
    text = "In questa lezione scopri come individuare dove ti trovi e dove vuoi arrivare nel tuo percorso di crescita personale."
    t = "Modulo 1 Lezione 2 - Il Punto Nave"
    assert reusable_intro({"intro_text": text, "intro_title": t}, t) == text                          # salvata sulla lezione
    assert reusable_intro({"lesson_standard_report": {"intro_text": text, "title": t}}, t) == text     # o dall'ultimo rapporto
    assert reusable_intro({"intro_text": text, "intro_title": "Altro titolo"}, t) is None              # titolo cambiato: se ne scrive una nuova
    assert reusable_intro({"intro_text": "troppo corta", "intro_title": t}, t) is None
    assert reusable_intro({}, t) is None and reusable_intro(None, t) is None
