"""Taglio manuale per intervalli su un video già montato (videolezioni Ciak).

Il sistema delle revisioni gestisce solo velocità/volume; i tagli di contenuto passavano al team a mano.
Qui l'admin indica uno o più intervalli [da, a] in secondi del video che sta guardando: il worker scarica la
versione corrente, toglie gli intervalli (micro-dissolvenze audio sulle giunzioni) e pubblica una NUOVA
versione. Le versioni precedenti restano nello storage, quindi si può tornare indietro.

Funzioni pure (validazione, intervalli da tenere, grafo ffmpeg) + `cut_video` che esegue ffmpeg.
"""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Iterable, Optional

MAX_RANGES = 20
MIN_RANGE_S = 0.3
MAX_CUT_SHARE = 0.5          # non si toglie più della metà del video con un singolo comando
EDGE_TOLERANCE_S = 0.5       # un "a" poco oltre la fine viene portato alla fine
FADE_S = 0.008


def normalize_ranges(ranges: Iterable[dict], duration_s: float) -> list[dict]:
    """Valida e fonde gli intervalli [start_s, end_s]. Solleva ValueError con un messaggio per l'admin."""
    duration = float(duration_s or 0)
    if duration <= 0:
        raise ValueError("Durata del video non disponibile")
    items = []
    for r in list(ranges or []):
        try:
            a, b = float(r["start_s"]), float(r["end_s"])
        except (KeyError, TypeError, ValueError):
            raise ValueError("Ogni intervallo ha bisogno di 'da' e 'a' in secondi")
        if a < 0 or b < 0:
            raise ValueError("I tempi non possono essere negativi")
        if b > duration + EDGE_TOLERANCE_S:
            raise ValueError(f"L'intervallo finisce oltre la durata del video ({duration:.0f} s)")
        b = min(b, duration)
        if b - a < MIN_RANGE_S:
            raise ValueError("Ogni intervallo deve durare almeno 0,3 secondi (e 'a' deve venire dopo 'da')")
        items.append((round(a, 3), round(b, 3)))
    if not items:
        raise ValueError("Indica almeno un intervallo da togliere")
    if len(items) > MAX_RANGES:
        raise ValueError(f"Massimo {MAX_RANGES} intervalli per volta")
    items.sort()
    merged: list[list[float]] = []
    for a, b in items:
        if merged and a <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    removed = sum(b - a for a, b in merged)
    if removed > duration * MAX_CUT_SHARE:
        raise ValueError("Con questo comando togli più della metà del video: controlla i tempi")
    return [{"start_s": a, "end_s": b} for a, b in merged]


def keep_intervals(ranges: list[dict], duration_s: float, min_keep_s: float = 0.05) -> list[tuple[float, float]]:
    """Intervalli da TENERE, complementari a quelli tolti."""
    keep, cursor = [], 0.0
    for r in ranges:
        if r["start_s"] - cursor >= min_keep_s:
            keep.append((round(cursor, 3), round(r["start_s"], 3)))
        cursor = r["end_s"]
    if float(duration_s) - cursor >= min_keep_s:
        keep.append((round(cursor, 3), round(float(duration_s), 3)))
    if not keep:
        raise ValueError("Il taglio toglierebbe tutto il video")
    return keep


def build_filter_script(keep: list[tuple[float, float]], has_audio: bool = True) -> str:
    """Grafo ffmpeg: trim+concat dei pezzi tenuti, micro-dissolvenze audio ai tagli."""
    n = len(keep)
    parts = []
    for i, (a, b) in enumerate(keep):
        parts.append(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS[v{i}]")
        if has_audio:
            dur = b - a
            fades = []
            if i > 0:
                fades.append(f"afade=t=in:st=0:d={FADE_S}")
            if i < n - 1:
                fades.append(f"afade=t=out:st={max(dur - FADE_S, 0):.3f}:d={FADE_S}")
            chain = ",".join([f"atrim=start={a:.3f}:end={b:.3f}", "asetpts=PTS-STARTPTS", *fades])
            parts.append(f"[0:a]{chain}[a{i}]")
    parts.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[vout]")
    if has_audio:
        parts.append("".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1[aout]")
    return ";\n".join(parts)


def _probe(path: str, entries: str) -> str:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", entries, "-of", "csv=p=0", path],
                       capture_output=True, text=True, timeout=120)
    return r.stdout.strip()


def has_audio_stream(path: str) -> bool:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                        "-of", "csv=p=0", path], capture_output=True, text=True, timeout=120)
    return bool(r.stdout.strip())


def video_duration(path: str) -> float:
    return float(_probe(path, "format=duration"))


def cut_video(input_path: str, output_path: str, ranges: list[dict], *, preset: str = "veryfast",
              crf: int = 20, timeout: int = 3600) -> dict:
    """Esegue il taglio. `ranges` già normalizzati. Ritorna durate prima/dopo."""
    duration = video_duration(input_path)
    ranges = normalize_ranges(ranges, duration)
    keep = keep_intervals(ranges, duration)
    audio = has_audio_stream(input_path)
    script = Path(output_path).with_suffix(".filter.txt")
    script.write_text(build_filter_script(keep, audio), encoding="utf-8")
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", input_path, "-filter_complex_script", str(script),
           "-map", "[vout]"]
    if audio:
        cmd += ["-map", "[aout]", "-c:a", "aac", "-b:a", "192k"]
    cmd += ["-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", output_path]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError((result.stderr or "")[-800:])
    after = video_duration(output_path)
    removed = sum(r["end_s"] - r["start_s"] for r in ranges)
    return {"duration_before_s": round(duration, 2), "duration_after_s": round(after, 2),
            "removed_s": round(removed, 2), "ranges": ranges}


def gs_url_from_public(url: str) -> Optional[str]:
    """https://storage.googleapis.com/<bucket>/<blob> -> gs://<bucket>/<blob> (None se non è uno storage URL)."""
    prefix = "https://storage.googleapis.com/"
    if not url or not url.startswith(prefix):
        return None
    rest = url[len(prefix):].split("?", 1)[0]
    return "gs://" + rest if "/" in rest else None
