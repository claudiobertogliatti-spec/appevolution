import os
import shutil
import subprocess

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_manual_cut as mcut

pytestmark = pytest.mark.unit


def R(a, b):
    return {"start_s": a, "end_s": b}


def test_ranges_are_validated_sorted_and_merged():
    out = mcut.normalize_ranges([R(60, 70), R(10, 20), R(18, 25)], 200)
    assert out == [R(10, 25), R(60, 70)]


@pytest.mark.parametrize("bad", [
    [],                                  # nessun intervallo
    [R(20, 10)],                         # a prima di da
    [R(10, 10.1)],                       # troppo corto
    [R(-1, 5)],                          # negativo
    [R(100, 300)],                       # oltre la durata
    [R(0, 150)],                         # più della metà
    [{"start_s": "x", "end_s": 3}],      # non numerico
])
def test_invalid_ranges_are_rejected_with_a_message(bad):
    with pytest.raises(ValueError):
        mcut.normalize_ranges(bad, 200)


def test_too_many_ranges_are_rejected():
    with pytest.raises(ValueError):
        mcut.normalize_ranges([R(i * 5, i * 5 + 1) for i in range(mcut.MAX_RANGES + 1)], 1000)


def test_end_slightly_past_the_duration_is_clamped_to_the_end():
    assert mcut.normalize_ranges([R(190, 200.4)], 200) == [R(190, 200)]


def test_keep_intervals_are_the_complement():
    assert mcut.keep_intervals([R(57, 74)], 221.0) == [(0.0, 57.0), (74.0, 221.0)]
    assert mcut.keep_intervals([R(0, 10)], 100.0) == [(10.0, 100.0)]
    assert mcut.keep_intervals([R(90, 100)], 100.0) == [(0.0, 90.0)]
    with pytest.raises(ValueError):
        mcut.keep_intervals([R(0, 100)], 100.0)


def test_filter_script_cuts_both_streams_and_fades_only_the_joins():
    s = mcut.build_filter_script([(0.0, 57.0), (74.0, 221.0)])
    assert "concat=n=2:v=1:a=0[vout]" in s and "concat=n=2:v=0:a=1[aout]" in s
    assert s.count("afade=t=out") == 1 and s.count("afade=t=in") == 1     # una giunzione sola
    assert "[0:a]" not in mcut.build_filter_script([(0.0, 5.0)], has_audio=False)


def test_public_storage_url_maps_to_gs():
    assert mcut.gs_url_from_public("https://storage.googleapis.com/b/edited_videos/p/l/v4.mp4?x=1") == "gs://b/edited_videos/p/l/v4.mp4"
    assert mcut.gs_url_from_public("https://example.com/v.mp4") is None
    assert mcut.gs_url_from_public("") is None


@pytest.mark.skipif(not (shutil.which("ffmpeg") and shutil.which("ffprobe")), reason="ffmpeg non disponibile")
def test_real_cut_removes_exactly_the_requested_seconds(tmp_path):
    src, out = tmp_path / "in.mp4", tmp_path / "out.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=25",
                    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "30",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(src)], check=True)
    info = mcut.cut_video(str(src), str(out), [R(10, 14), R(20, 22.5)], preset="ultrafast")
    assert info["removed_s"] == pytest.approx(6.5)
    assert info["duration_after_s"] == pytest.approx(30 - 6.5, abs=0.4)
    assert mcut.has_audio_stream(str(out))
