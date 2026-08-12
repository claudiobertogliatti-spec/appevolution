"""Standard approvato per il montaggio automatico delle videolezioni Ciak.

Funzioni pure per policy/tagli e composizione deterministica della copertina.
Nessun accesso al DB: la pipeline fornisce trascrizione, brand e percorsi locali.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import shutil
import subprocess
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

STANDARD_VERSION = "ciak-lesson-v1"
SILENCE_THRESHOLD_S = 1.3
BREATH_PER_SIDE_S = 0.35
VOICE = "en-US-AndrewMultilingualNeural"
VOICE_RATE = "-2%"
AMBIGUOUS_FILLERS = {"ecco", "allora", "quindi", "cioè", "cioe", "insomma"}

OPEN_CUES = (
    "chiudi gli occhi", "porta l attenzione al respiro", "porta l'attenzione al respiro",
    "inspira", "espira", "rilassa", "ascolta il tuo corpo", "ascolta il respiro",
    "prenditi un momento", "segui il respiro",
)
CLOSE_CUES = ("riapri gli occhi", "torniamo", "quando sei pronto", "quando sei pronta")


def normalize_words(words: list, duration_s: float = 0) -> list:
    """Normalizza AssemblyAI in secondi senza mutare l'input."""
    maximum = max((float(w.get("end", 0)) for w in (words or [])), default=0)
    divisor = 1000.0 if duration_s and maximum > duration_s * 3 else 1.0
    return [
        {**w, "start": float(w.get("start", 0)) / divisor,
         "end": float(w.get("end", 0)) / divisor}
        for w in (words or [])
    ]


def _token(w: dict) -> str:
    return re.sub(r"[^a-zà-ù0-9']+", " ", str(w.get("text") or w.get("word") or "").lower()).strip()


def protected_exercise_ranges(words: list) -> list[dict]:
    """Individua blocchi di esercizio guidato: ogni loro pausa è intoccabile."""
    if not words:
        return []
    text = " ".join(_token(w) for w in words)
    # Mappa approssimata carattere -> indice parola, sufficiente per cue multi-parola.
    offsets, pos = [], 0
    for i, w in enumerate(words):
        tok = _token(w)
        offsets.append((pos, pos + len(tok), i))
        pos += len(tok) + 1

    events = []
    for kind, cues in (("open", OPEN_CUES), ("close", CLOSE_CUES)):
        for cue in cues:
            for match in re.finditer(re.escape(cue), text):
                idx = next((i for a, b, i in offsets if a <= match.start() <= b), None)
                if idx is not None:
                    events.append((idx, kind))
    events.sort()
    ranges, opened = [], None
    for idx, kind in events:
        if kind == "open" and opened is None:
            opened = max(0, idx - 1)
        elif kind == "close" and opened is not None and idx >= opened:
            ranges.append({"start": words[opened]["start"], "end": words[min(len(words)-1, idx + 1)]["end"]})
            opened = None
    if opened is not None:
        ranges.append({"start": words[opened]["start"], "end": words[-1]["end"]})
    return ranges


def overlaps(seg: dict, ranges: Iterable[dict]) -> bool:
    return any(float(seg["start"]) < float(r["end"]) and float(seg["end"]) > float(r["start"])
               for r in ranges)


def lesson_silence_cuts(words: list, duration_s: float = 0) -> list[dict]:
    """Taglia solo la parte eccedente delle pause >1,3s, lasciando 0,7s di respiro."""
    words = normalize_words(words, duration_s)
    protected = protected_exercise_ranges(words)
    cuts = []
    for left, right in zip(words, words[1:]):
        gap = float(right["start"]) - float(left["end"])
        if gap <= SILENCE_THRESHOLD_S:
            continue
        seg = {
            "start": round(float(left["end"]) + BREATH_PER_SIDE_S, 3),
            "end": round(float(right["start"]) - BREATH_PER_SIDE_S, 3),
            "type": "silence", "reason": "pausa morta oltre 1,3s", "word": "", "exact": True,
        }
        if seg["end"] > seg["start"] and not overlaps(seg, protected):
            cuts.append(seg)
    return cuts


def enforce_lesson_policy(candidate_cuts: list, words: list, duration_s: float = 0) -> dict:
    """Blocca tagli su esercizi e rifiuta tagli AI non ancorati a parole brevi.

    Le pause sono sempre ricalcolate deterministicamente. I tagli AI/filler sono
    ammessi solo se durano <=2,5s e non toccano una zona protetta.
    """
    normalized = normalize_words(words, duration_s)
    protected = protected_exercise_ranges(normalized)
    accepted, rejected = [], []
    for seg in candidate_cuts or []:
        try:
            item = {**seg, "start": float(seg["start"]), "end": float(seg["end"])}
        except Exception:
            continue
        reason = str(item.get("reason", "")).lower()
        typ = str(item.get("type", "smart"))
        word = str(item.get("word", "")).lower().strip(".,!?;: ")
        unsafe = overlaps(item, protected) or item["end"] <= item["start"]
        # Le pause generiche ricevute da monte non passano: vengono ricalcolate sotto.
        if typ == "silence" or "pausa" in reason:
            unsafe = True
        if (item["end"] - item["start"]) > 2.5:
            unsafe = True
        if word in AMBIGUOUS_FILLERS:
            unsafe = True
        (rejected if unsafe else accepted).append(item)
    accepted.extend(lesson_silence_cuts(normalized, duration_s))
    accepted.sort(key=lambda s: s["start"])
    for i, seg in enumerate(accepted):
        seg.update({"id": i, "enabled": True})
        seg["start"], seg["end"] = round(seg["start"], 3), round(seg["end"], 3)
    return {
        "cuts": accepted, "rejected": rejected, "protected_ranges": protected,
        "standard_version": STANDARD_VERSION,
    }


def intro_fallback(title: str) -> str:
    clean = (title or "questa lezione").strip().rstrip(".")
    return f"In questa lezione scoprirai {clean} e capirai perché è importante nel tuo percorso."


def _hex(value: str, fallback: str) -> str:
    value = str(value or "").strip()
    return value if re.fullmatch(r"#[0-9a-fA-F]{6}", value) else fallback


def brand_profile(partner: dict | None, hub: dict | None, step: dict | None) -> dict:
    """Risoluzione partner-first. Mai fallback ai colori Ciak."""
    partner, hub, step = partner or {}, hub or {}, step or {}
    data = step.get("data", step) if isinstance(step, dict) else {}
    colors = data.get("colori") or []
    return {
        "name": hub.get("projectName") or data.get("nome_progetto") or partner.get("name") or "Videocorso",
        "partner_name": partner.get("name") or hub.get("name") or "",
        "logo": hub.get("logo") or data.get("logo_url") or None,
        "primary": _hex(hub.get("primaryColor") or (colors[0] if colors else None), "#B7793C"),
        "background": _hex(hub.get("bgColor"), "#F2EFE8"),
        "text": _hex(hub.get("textColor"), "#20201E"),
        "font": hub.get("fontPrimary") or data.get("font_primary") or "DejaVu Sans",
        "brand_source": "partner" if (hub.get("primaryColor") or colors or hub.get("logo") or data.get("logo_url")) else "neutral-fallback",
    }


def _run(cmd: list[str], timeout: int = 1800) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout)[-1200:])


def _duration(path: str) -> float:
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                             "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, timeout=60)
    return float(result.stdout.strip())


async def render_standard_lesson(*, body_path: str, output_path: str, tmp_dir: Path,
                                 title: str, intro_text: str, brand: dict) -> dict:
    """Anteponi copertina Andrew e finalizza audio con picco -1,5 dB.

    Richiede ffmpeg, Pillow ed edge-tts. Il body non riceve musica, overlay o sottotitoli.
    """
    from PIL import Image, ImageDraw, ImageFont
    import edge_tts

    tmp_dir.mkdir(parents=True, exist_ok=True)
    cover_png, voice_mp3 = tmp_dir / "lesson-cover.png", tmp_dir / "lesson-intro.mp3"
    cover_mp4, joined = tmp_dir / "lesson-cover.mp4", tmp_dir / "lesson-joined.mp4"
    image = Image.new("RGB", (1920, 1080), brand["background"])
    draw = ImageDraw.Draw(image)
    font_path = next((p for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "C:/Windows/Fonts/arial.ttf") if Path(p).exists()), None)
    if not font_path:
        raise RuntimeError("Font di sistema non disponibile per la copertina")
    f_small, f_title, f_sub = ImageFont.truetype(font_path, 32), ImageFont.truetype(font_path, 76), ImageFont.truetype(font_path, 38)
    draw.rectangle((0, 0, 36, 1080), fill=brand["primary"])
    draw.rectangle((126, 184, 246, 192), fill=brand["primary"])
    draw.text((126, 225), f"{brand['name'].upper()}  •  {brand['partner_name'].upper()}".strip(" •"), font=f_small, fill=brand["text"])
    draw.text((126, 340), title.upper(), font=f_title, fill=brand["text"])
    draw.text((130, 480), "Una videolezione del tuo percorso", font=f_sub, fill=brand["text"])
    draw.line((126, 740, 1794, 740), fill=brand["primary"], width=2)
    image.save(cover_png)

    await edge_tts.Communicate(intro_text, VOICE, rate=VOICE_RATE).save(str(voice_mp3))
    cover_duration = max(10.0, min(20.0, _duration(str(voice_mp3)) + 1.3))
    _run(["ffmpeg", "-y", "-loop", "1", "-i", str(cover_png), "-i", str(voice_mp3),
          "-filter_complex", "[1:a]adelay=650|650,volume=0dB,apad[a]", "-map", "0:v", "-map", "[a]",
          "-t", f"{cover_duration:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
          "-pix_fmt", "yuv420p", "-r", "25", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
          "-movflags", "+faststart", str(cover_mp4)])
    # Un solo concat filtrato: normalizza anche upload con fps/risoluzione/canali diversi.
    filters = (
        "[0:v]fps=25,scale=1920:1080:force_original_aspect_ratio=decrease,"
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];"
        "[1:v]fps=25,scale=1920:1080:force_original_aspect_ratio=decrease,"
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];"
        "[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];"
        "[1:a]aresample=44100,aformat=channel_layouts=stereo[a1];"
        "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]"
    )
    _run(["ffmpeg", "-y", "-i", str(cover_mp4), "-i", body_path,
          "-filter_complex", filters, "-map", "[v]", "-map", "[a]",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "25",
          "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", "-movflags", "+faststart", str(joined)],
         timeout=max(1800, int(_duration(body_path) * 4)))
    _run(["ffmpeg", "-y", "-fflags", "+genpts", "-i", str(joined), "-map", "0:v:0", "-map", "0:a:0",
          "-c:v", "copy", "-af", "aresample=async=1:first_pts=0,alimiter=limit=0.841395",
          "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart", output_path])
    return {"standard_version": STANDARD_VERSION, "intro_duration_s": round(cover_duration, 2),
            "brand_source": brand.get("brand_source"), "voice": VOICE}
