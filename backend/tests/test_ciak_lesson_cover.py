"""Copertina e volumi delle videolezioni (fix del pilota del 1/10/2026).

Il primo montato reale aveva: titolo tagliato a destra, nome ripetuto due volte, ".mp4" nel
titolo, nessuna etichetta Modulo/Lezione, nessun logo e voce narrante 10 dB sotto il girato.
"""
import asyncio
import os
import shutil
import subprocess
import sys
import types
from pathlib import Path

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_lesson_standard as ls

pytestmark = pytest.mark.unit

HAS_FFMPEG = bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))
LONG_TITLE = "Benvenuti nel Crogiolo della Trasformazione: il mondo interiore"
BRAND = {"name": "Andrea Fredi", "partner_name": "Andrea Fredi", "logo": None,
         "primary": "#E48917", "background": "#F2EFE8", "text": "#20201E", "brand_source": "partner"}


@pytest.mark.parametrize("raw,expected", [
    ("Benvenuti nel Crogiolo della Trasformazione.mp4", "Benvenuti nel Crogiolo della Trasformazione"),
    ("Modulo 1 lezione 1.mp4", ""),
    ("Modulo 2 Lezione 3 - La Matrice della Percezione.MOV", "La Matrice della Percezione"),
    ("Il_Punto_Nave.mp4", "Il Punto Nave"),
    ("Capitolo 4 Lezione 2: Vis e Wei Wu Wei", "Vis e Wei Wu Wei"),
    ("", ""),
])
def test_clean_title_drops_extension_label_and_underscores(raw, expected):
    assert ls.clean_title(raw) == expected


@pytest.mark.parametrize("raw,expected", [
    ("Modulo 1 lezione 1.mp4", "Modulo 1 · Lezione 1"),
    ("Modulo 2 Lezione 3 - La Matrice.mp4", "Modulo 2 · Lezione 3"),
    ("Capitolo 6 lezione 2.mp4", "Capitolo 6 · Lezione 2"),
    ("Benvenuti nel Crogiolo.mp4", ""),          # mai inventato
    ("VID20260614181223.mp4", ""),
])
def test_lesson_label_only_when_the_filename_says_it(raw, expected):
    assert ls.lesson_label(raw) == expected


def test_cover_names_never_repeat_the_same_name():
    assert ls.cover_names({"name": "Andrea Fredi", "partner_name": "andrea fredi"}) == "ANDREA FREDI"
    assert ls.cover_names({"name": "TAI", "partner_name": "Andrea Fredi"}) == "TAI  •  ANDREA FREDI"
    assert ls.cover_names({"name": "", "partner_name": ""}) == ""


class _FakeFont:
    def __init__(self, size):
        self.size = size

    def getlength(self, text):
        return len(text) * self.size * 0.6


def test_wrap_text_breaks_on_words_and_keeps_a_too_wide_word_alone():
    assert ls.wrap_text("uno due tre quattro cinque", lambda s: len(s) * 10, 120) == ["uno due tre", "quattro", "cinque"]
    assert ls.wrap_text("supercalifragilistichespiralidoso", lambda s: len(s) * 10, 100) == ["supercalifragilistichespiralidoso"]


def test_fit_title_wraps_a_real_long_title_into_lines_that_fit():
    font, _size, lines = ls.fit_title(LONG_TITLE.upper(), _FakeFont, 1668)
    assert 1 < len(lines) <= 3
    assert all(font.getlength(line) <= 1668 for line in lines)


def test_fit_title_shrinks_the_font_when_the_biggest_size_needs_four_lines():
    text = " ".join(["ABCDEFGHI"] * 12)          # 4 righe a 76 px, 3 righe a 68 px (font finto: 0,6 px per carattere e punto)
    font, size, lines = ls.fit_title(text, _FakeFont, 1668)
    assert size < 76 and len(lines) <= 3
    assert all(font.getlength(line) <= 1668 for line in lines)


def test_fit_title_keeps_the_biggest_size_for_a_short_title():
    _font, size, lines = ls.fit_title("IL PUNTO NAVE", _FakeFont, 1668)
    assert size == 76 and lines == ["IL PUNTO NAVE"]


def test_fit_title_truncates_with_ellipsis_only_as_a_last_resort():
    _font, _size, lines = ls.fit_title("PAROLA " * 80, _FakeFont, 1668)
    assert len(lines) == 3 and lines[-1].endswith("…")


def test_voice_gain_matches_the_voice_to_the_footage_with_a_fixed_gain():
    assert ls.voice_gain_db(-20.1, -10.1) == 10.0          # il caso del pilota: voce 10 dB sotto
    assert ls.voice_gain_db(-16.0, -18.5) == -2.5
    assert ls.voice_gain_db(None, -10) == 0.0 and ls.voice_gain_db(-20, None) == 0.0
    assert ls.voice_gain_db(-60, -10) == ls.VOICE_GAIN_MAX_DB
    assert ls.voice_gain_db(-10, -60) == ls.VOICE_GAIN_MIN_DB


def test_cover_title_never_overflows_the_right_margin():
    if not ls._cover_font_path():
        pytest.skip("nessun font di sistema per la copertina")
    img = ls.draw_cover(BRAND, LONG_TITLE, "Modulo 1 · Lezione 1")
    assert img.size == (1920, 1080)
    bg = img.getpixel((1900, 500))
    band = img.crop((1920 - ls.COVER_MARGIN_X + 4, 280, 1920, 700))         # margine destro, zona titolo
    assert not any(px != bg for px in band.getdata()), "testo oltre il margine destro"
    assert any(px != bg for px in img.crop((ls.COVER_MARGIN_X, 300, 900, 700)).getdata())    # il titolo c'è


def test_cover_draws_the_logo_when_given_and_skips_untrusted_hosts():
    if not ls._cover_font_path():
        pytest.skip("nessun font di sistema per la copertina")
    from PIL import Image
    logo = Image.new("RGBA", (400, 100), (200, 0, 0, 255))
    with_logo = ls.draw_cover(BRAND, "Titolo", "", logo)
    without = ls.draw_cover(BRAND, "Titolo", "", None)
    assert with_logo.getpixel((1700, 200)) != without.getpixel((1700, 200))
    assert ls.load_logo("https://evil.example/logo.png") is None
    assert ls.load_logo(None) is None


def _tone(path, seconds, db, freq=440, video=False):
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"sine=frequency={freq}:duration={seconds}"]
    if video:
        cmd += ["-f", "lavfi", "-i", f"color=c=gray:s=640x360:d={seconds}:r=25", "-c:v", "libx264", "-pix_fmt", "yuv420p"]
    cmd += ["-af", f"volume={db}dB", "-ar", "44100", "-ac", "1", str(path)]
    subprocess.run(cmd, check=True)


def _cut(src, start, length, dst):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(start), "-t", str(length), "-i", str(src), "-vn", str(dst)],
                   check=True)
    return str(dst)


@pytest.mark.skipif(not HAS_FFMPEG, reason="serve ffmpeg")
def test_measure_lufs_reflects_a_ten_db_difference(tmp_path):
    quiet, loud = tmp_path / "q.wav", tmp_path / "l.wav"
    _tone(quiet, 4, -30)
    _tone(loud, 4, -20)
    q, loud_lufs = ls.measure_lufs(str(quiet)), ls.measure_lufs(str(loud))
    assert q is not None and loud_lufs is not None
    assert loud_lufs - q == pytest.approx(10.0, abs=0.6)
    assert ls.measure_lufs(str(tmp_path / "missing.wav")) is None


@pytest.mark.skipif(not HAS_FFMPEG or not ls._cover_font_path(), reason="serve ffmpeg e un font")
def test_render_evens_out_the_narrator_and_the_footage_and_keeps_the_label(tmp_path, monkeypatch):
    """Percorso vero: voce simulata a -26 dB, girato a -12 dB → la copertina deve avere il volume del girato."""

    class FakeCommunicate:
        def __init__(self, text, voice, rate=None):
            self.text = text

        async def save(self, path):
            wav = Path(path).with_suffix(".wav")
            _tone(wav, 5, -26, freq=300)
            shutil.move(str(wav), path)      # contenuto wav nel file .mp3: ffmpeg lo legge uguale

    monkeypatch.setitem(sys.modules, "edge_tts", types.SimpleNamespace(Communicate=FakeCommunicate))
    body = tmp_path / "body.mp4"
    _tone(body, 8, -12, freq=600, video=True)
    out = tmp_path / "out.mp4"

    report = asyncio.run(ls.render_standard_lesson(
        body_path=str(body), output_path=str(out), tmp_dir=tmp_path / "work",
        title="Modulo 1 lezione 1 - Benvenuti nel Crogiolo della Trasformazione.mp4",
        intro_text="In questa lezione scoprirai il crogiolo.", brand=BRAND))

    assert report["label"] == "Modulo 1 · Lezione 1"
    assert report["voice_gain_db"] == pytest.approx(report["body_lufs"] - report["voice_lufs"], abs=0.1)
    assert report["voice_gain_db"] > 10          # voce molto più bassa del girato → guadagno alto
    total = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(out)],
        capture_output=True, text=True).stdout)
    cover = report["intro_duration_s"]
    assert total == pytest.approx(cover + 8, abs=0.6)
    cover_lufs = ls.measure_lufs(_cut(out, 0, cover - 1.0, tmp_path / "c.wav"))
    body_lufs = ls.measure_lufs(_cut(out, cover + 0.5, 7, tmp_path / "b.wav"))
    assert abs(cover_lufs - body_lufs) <= 4.0, (cover_lufs, body_lufs)    # prima: ~14 dB di differenza
