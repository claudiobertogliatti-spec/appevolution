"""Tratti di quasi-silenzio ("aria morta") misurati a finestre di 0,1 s, per le pause delle videolezioni.

`silencedetect` di ffmpeg considera silenzio solo cio che resta SOTTO la soglia senza interruzioni: un tratto di
3,5 secondi con qualche rumorino (un click, un respiro a -18 dB) non viene mai visto come pausa, e finisce nel video
finale come buco. Qui si misura il livello RMS a finestre di 0,1 s e si chiama "quasi-silenzio" un tratto continuo di
finestre sotto soglia; i rumori brevi isolati (fino a `bridge_s`) non lo interrompono.

Pure: `stretches_from_levels`, `merge_silences`. `quiet_stretches` decodifica l'audio con ffmpeg (16 kHz mono).
"""
from __future__ import annotations

import subprocess
from typing import Iterable

WINDOW_S = 0.1
THRESHOLD_DB = -38.0          # sotto questo livello RMS una finestra e "quasi silenzio" (parlato ~ -25/-15 dB)
MIN_STRETCH_S = 0.7
BRIDGE_S = 0.2                # un rumore isolato piu breve di cosi non interrompe il tratto


def stretches_from_levels(levels_db: list[float], window_s: float = WINDOW_S, threshold_db: float = THRESHOLD_DB,
                          min_s: float = MIN_STRETCH_S, bridge_s: float = BRIDGE_S) -> list[dict]:
    """[{start, end, duration}] dei tratti continui di finestre sotto soglia, lunghi almeno `min_s`."""
    quiet = [lv < threshold_db for lv in levels_db]
    bridge = max(int(round(bridge_s / window_s)), 0)
    # chiude i buchi brevi (rumori isolati) fra due tratti silenziosi
    i, n = 0, len(quiet)
    while i < n:
        if not quiet[i]:
            j = i
            while j < n and not quiet[j]:
                j += 1
            if 0 < i and j < n and (j - i) <= bridge:
                for k in range(i, j):
                    quiet[k] = True
            i = j
        else:
            i += 1
    out, i = [], 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            dur = (j - i) * window_s
            if dur >= min_s:
                out.append({"start": round(i * window_s, 3), "end": round(j * window_s, 3), "duration": round(dur, 3)})
            i = j
        else:
            i += 1
    return out


def merge_silences(*lists: Iterable[dict]) -> list[dict]:
    """Unione ordinata di liste di silenzi {start, end}: i tratti sovrapposti si fondono (vince l'estensione maggiore)."""
    segs = sorted((dict(s) for lst in lists for s in (lst or [])), key=lambda s: float(s["start"]))
    out: list[dict] = []
    for s in segs:
        a, b = float(s["start"]), float(s["end"])
        if out and a <= out[-1]["end"]:
            out[-1]["end"] = max(out[-1]["end"], b)
        else:
            out.append({"start": a, "end": b})
    for s in out:
        s["duration"] = round(s["end"] - s["start"], 3)
    return out


def levels_db(path: str, window_s: float = WINDOW_S, sample_rate: int = 16000, timeout: int = 900) -> list[float]:
    """Livello RMS (dBFS) di ogni finestra, dall'audio del file."""
    import numpy as np

    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(sample_rate),
                        "-f", "s16le", "-"], capture_output=True, timeout=timeout)
    if r.returncode:
        raise RuntimeError((r.stderr or b"")[-400:].decode("utf-8", "replace"))
    data = np.frombuffer(r.stdout, dtype=np.int16).astype(np.float64) / 32768.0
    step = int(sample_rate * window_s)
    n = len(data) // step
    if n == 0:
        return []
    frames = data[: n * step].reshape(n, step)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    return [float(20 * np.log10(x)) if x > 1e-9 else -99.0 for x in rms]


def quiet_stretches(path: str, **kw) -> list[dict]:
    return stretches_from_levels(levels_db(path), **kw)
