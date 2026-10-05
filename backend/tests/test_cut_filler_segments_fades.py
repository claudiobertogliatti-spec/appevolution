import os
import shutil
import subprocess

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

pytestmark = [pytest.mark.unit,
              pytest.mark.skipif(not (shutil.which("ffmpeg") and shutil.which("ffprobe")), reason="ffmpeg non disponibile")]


def _dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def test_cut_with_exact_segments_removes_exactly_those_seconds_and_keeps_audio(tmp_path):
    import video_pipeline_task as vp
    src, out = tmp_path / "in.mp4", tmp_path / "out.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=25",
                    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100", "-t", "20",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(src)], check=True)
    ok = vp.cut_filler_segments(str(src), str(out),
                                [{"start": 5.0, "end": 8.0, "exact": True}, {"start": 12.0, "end": 13.5, "exact": True}], 20.0)
    assert ok and out.exists()
    assert _dur(out) == pytest.approx(20 - 4.5, abs=0.4)
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name",
                        "-of", "csv=p=0", str(out)], capture_output=True, text=True)
    assert r.stdout.strip()
