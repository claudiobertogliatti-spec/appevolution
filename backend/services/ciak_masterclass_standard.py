"""Standard approvato per il montaggio automatico delle MASTERCLASS dei partner (ciak-masterclass-v1).

Applica la regola `docs/video/recipe-masterclass-cut.md` (v2, misurata sulla masterclass Evolution):
tagli mirati con protezione delle pratiche guidate, riprese ripetute eliminate, volume allineato,
sigla di apertura e di chiusura col logo del partner, schede a schermo intero nel brand del partner,
misure di controllo. Niente speed-up, niente musica, niente sottotitoli impressi.

Funzioni pure per piano/policy (testabili senza ffmpeg) + composizione ffmpeg. Nessun accesso al DB:
la pipeline fornisce trascrizione (parole con tempi in secondi), silenzi, brand e percorsi locali.
"""
from __future__ import annotations

import json
import logging
import math
import re
import subprocess
from pathlib import Path
from typing import Callable, Iterable, Optional

from services.ciak_lesson_standard import (
    _cover_font_path, _duration, _run, _token, load_logo, normalize_words, overlaps,
    protected_exercise_ranges,
)

logger = logging.getLogger(__name__)

STANDARD_VERSION = "ciak-masterclass-v1"

# ── soglie della regola (§2 della ricetta, misurate sulla masterclass Evolution) ─────────
PAUSE_MAX_S = 1.3                # nessuna pausa oltre, fuori dalle pratiche guidate
BREATH_PER_SIDE_S = 0.35         # respiro lasciato ai lati di un taglio di pausa
TARGET_LUFS = -17.5              # ±1
TARGET_LRA = 3.5
TARGET_TP = -1.5
# compressione lieve prima di loudnorm: il girato ha LRA ~5,8 e loudnorm lineare da solo non scende sotto ~3,8
PRE_COMPRESS = "acompressor=threshold=-26dB:ratio=2:attack=40:release=400"
DURATION_RANGE_MIN = (24.0, 30.0)
SIGLA_S = 6.0                    # sigla di apertura e di chiusura (≤8–10 s da regola)
CARD_MIN_S, CARD_MAX_S = 3.0, 45.0
CARD_MAX_LINES = 3
CARD_KINDS = ("checklist", "quote", "number", "step", "recap", "cta")
CARDS_MAX = 40
AI_CUT_MAX_S = 120.0             # un taglio AI di struttura (bio lunga, ripetizioni) non supera 2 minuti
AI_CUT_MAX_SHARE = 0.15          # …e in totale non supera il 15% del girato
RETAKE_SHINGLE = 5               # parole uguali che segnalano una ripresa ripetuta
RETAKE_WINDOW_WORDS = 45
RETAKE_MAX_S = 45.0
FILLER_TOKENS = {"ehm", "eh", "mmm", "mh", "uhm", "ehh"}
FILLER_MAX_S = 0.8

# Pratica guidata: cue che la rendono probabile + pause lunghe ravvicinate che la confermano.
BREATH_TOKENS = {"respiro", "respira", "inspiro", "inspiri", "inspira", "espiri", "espira",
                 "inspirazione", "espirazione", "dantian", "dantien", "rilassa", "rilassati"}
PRACTICE_PHRASES = ("lo facciamo insieme", "facciamo assieme", "facciamo insieme", "ti guido passo",
                    "pronuncia la frase", "porta l attenzione", "porta l'attenzione", "occhi chiusi",
                    "chiudi gli occhi", "mani sul", "mani sotto")
LONG_PAUSE_S = 1.5
CLUSTER_GAP_S = 90.0
CLUSTER_MIN_PAUSES = 4
CLUSTER_PAD_BEFORE_S = 20.0
CLUSTER_PAD_AFTER_S = 25.0
CUE_LOOKBACK_S = 60.0
MAX_CLOSED_RANGE_S = 600.0


# ───────────────────────────── pratiche guidate ─────────────────────────────

def _merge_ranges(ranges: list[dict], gap: float = 0.0) -> list[dict]:
    out: list[dict] = []
    for r in sorted(ranges, key=lambda x: x["start"]):
        if out and r["start"] <= out[-1]["end"] + gap:
            out[-1]["end"] = max(out[-1]["end"], r["end"])
        else:
            out.append({"start": float(r["start"]), "end": float(r["end"])})
    return out


def _cue_times(words: list) -> list[float]:
    """Istanti delle parole/frasi che annunciano una pratica guidata."""
    times = [float(w["start"]) for w in words if _token(w) in BREATH_TOKENS]
    toks = [_token(w) for w in words]
    for i in range(len(toks)):
        window = " ".join(toks[i:i + 4])
        if any(window.startswith(p) for p in PRACTICE_PHRASES):
            times.append(float(words[i]["start"]))
    return sorted(times)


def practice_ranges(words: list, silences: list, duration_s: float = 0) -> list[dict]:
    """Zone di pratica guidata: i loro silenzi sono voluti e non si toccano mai.

    Unione di (a) i blocchi apri/chiudi già usati per le lezioni e (b) gruppi di pause lunghe
    ravvicinate che hanno parole di pratica (respiro, "facciamo insieme"…) subito prima o dentro.
    Un gruppo di pause lunghe SENZA parole di pratica (es. un'interruzione fuori campo) non conta.
    """
    words = normalize_words(words, duration_s)
    last_end = max((float(w["end"]) for w in words), default=0.0)
    # Dal rilevatore delle lezioni teniamo SOLO i blocchi chiusi e ragionevoli: un "apri" senza
    # "chiudi" arriva a fine video (nelle lezioni va bene, in una masterclass proteggerebbe tutto).
    ranges = [dict(r) for r in protected_exercise_ranges(words)
              if r["end"] < last_end - 1.0 and (r["end"] - r["start"]) <= MAX_CLOSED_RANGE_S]
    cues = _cue_times(words)
    longs = sorted((float(s["start"]), float(s["end"])) for s in (silences or [])
                   if float(s["end"]) - float(s["start"]) >= LONG_PAUSE_S)
    clusters: list[list[tuple[float, float]]] = []
    for a, b in longs:
        if clusters and a - clusters[-1][-1][1] <= CLUSTER_GAP_S:
            clusters[-1].append((a, b))
        else:
            clusters.append([(a, b)])
    for cl in clusters:
        first, last = cl[0][0], cl[-1][1]
        if len(cl) < CLUSTER_MIN_PAUSES:
            continue
        near = [t for t in cues if first - CUE_LOOKBACK_S <= t <= last + CLUSTER_PAD_AFTER_S]
        if not near:
            continue
        start = min(first - CLUSTER_PAD_BEFORE_S, min(near))
        ranges.append({"start": max(0.0, start), "end": last + CLUSTER_PAD_AFTER_S})
    merged = _merge_ranges(ranges, gap=2.0)
    cap = duration_s or (max((float(w["end"]) for w in words), default=0))
    return [{"start": round(r["start"], 3), "end": round(min(r["end"], cap) if cap else r["end"], 3)} for r in merged]


# ───────────────────────────── tagli ─────────────────────────────

def silence_cuts(silences: list, protected: Iterable[dict]) -> list[dict]:
    """Pause oltre 1,3 s FUORI dalle pratiche: si tiene un respiro di 0,35 s per lato."""
    cuts = []
    for s in silences or []:
        a, b = float(s["start"]), float(s["end"])
        if b - a <= PAUSE_MAX_S:
            continue
        seg = {"start": round(a + BREATH_PER_SIDE_S, 3), "end": round(b - BREATH_PER_SIDE_S, 3),
               "type": "silence", "reason": "pausa oltre 1,3 s fuori dalla pratica", "word": ""}
        if seg["end"] - seg["start"] > 0.05 and not overlaps(seg, protected):
            cuts.append(seg)
    return cuts


def adjacent_pause_cuts(silences: list, cuts: list, protected: Iterable[dict], tol: float = 0.15) -> list[dict]:
    """Togliendo un intercalare o una ripresa tra due pause, le pause si sommano: se la somma supera 1,3 s
    si accorciano entrambe (resta un respiro di 0,35 s per lato)."""
    out = []
    for c in cuts:
        if c.get("type") == "silence":
            continue
        before = next((s for s in silences if abs(float(s["end"]) - c["start"]) <= tol), None)
        after = next((s for s in silences if abs(float(s["start"]) - c["end"]) <= tol), None)
        if not before or not after:
            continue
        lb, la = float(before["end"]) - float(before["start"]), float(after["end"]) - float(after["start"])
        if lb + la <= PAUSE_MAX_S:
            continue
        for seg in ({"start": round(float(before["start"]) + BREATH_PER_SIDE_S, 3), "end": round(float(before["end"]), 3)},
                    {"start": round(float(after["start"]), 3), "end": round(float(after["end"]) - BREATH_PER_SIDE_S, 3)}):
            seg.update({"type": "silence", "reason": "pause vicine a un taglio: somma oltre 1,3 s", "word": ""})
            if seg["end"] - seg["start"] > 0.05 and not overlaps(seg, protected):
                out.append(seg)
    return out


def filler_cuts(words: list, protected: Iterable[dict]) -> list[dict]:
    cuts = []
    for w in words:
        if _token(w) not in FILLER_TOKENS:
            continue
        s, e = float(w["start"]), float(w["end"])
        seg = {"start": round(s, 3), "end": round(e, 3), "type": "filler",
               "reason": "intercalare", "word": _token(w)}
        if 0.05 < e - s <= FILLER_MAX_S and not overlaps(seg, protected):
            cuts.append(seg)
    return cuts


def repeat_cuts(words: list, protected: Iterable[dict]) -> list[dict]:
    """Elimina le riprese abbandonate: si tiene l'ULTIMA ripresa di una frase.

    (1) balbettii immediati (stessa parola o gruppo ripetuto subito: "sul sul pulsante");
    (2) riprese: la stessa sequenza di 5 parole torna entro 45 parole → si taglia dalla prima
        occorrenza fino all'inizio della seconda (max 25 s), come un "rifacciamo, da qua".
    """
    toks = [_token(w) for w in words]
    cuts: list[dict] = []
    n = len(words)
    skip_until = -1
    # (2) riprese ripetute
    i = 0
    while i < n - RETAKE_SHINGLE:
        sh = toks[i:i + RETAKE_SHINGLE]
        if i <= skip_until or not all(sh):
            i += 1
            continue
        found = None
        for j in range(i + 1, min(n - RETAKE_SHINGLE, i + RETAKE_WINDOW_WORDS) + 1):
            if toks[j:j + RETAKE_SHINGLE] == sh:
                found = j
                break
        if found is not None:
            seg = {"start": round(float(words[i]["start"]), 3), "end": round(float(words[found]["start"]), 3),
                   "type": "smart", "reason": "ripresa ripetuta: si tiene l'ultima", "word": ""}
            if 0 < seg["end"] - seg["start"] <= RETAKE_MAX_S and not overlaps(seg, protected):
                cuts.append(seg)
                skip_until = found
                i = found
                continue
        i += 1
    # (1) balbettii immediati
    for size in (3, 2, 1):
        for i in range(0, n - 2 * size + 1):
            a, b = toks[i:i + size], toks[i + size:i + 2 * size]
            if a == b and all(a) and not any(t.isdigit() for t in a):
                seg = {"start": round(float(words[i]["start"]), 3),
                       "end": round(float(words[i + size]["start"]), 3),
                       "type": "smart", "reason": "balbettio", "word": " ".join(a)}
                if 0 < seg["end"] - seg["start"] <= 2.5 and not overlaps(seg, protected):
                    cuts.append(seg)
    return cuts


def validate_ai_cuts(candidates: list, words: list, protected: Iterable[dict], duration_s: float) -> dict:
    """Tagli di struttura proposti dall'AI (bio lunga, ripetizioni di contenuto, interruzioni).

    Ammessi solo se: dentro il girato, ≤2 minuti ciascuno, fuori dalle pratiche, e in totale ≤15%.
    """
    acc, rej = [], []
    total = 0.0
    for c in candidates or []:
        try:
            s, e = float(c["start"]), float(c["end"])
        except Exception:
            continue
        item = {"start": round(s, 3), "end": round(e, 3), "type": "smart",
                "reason": str(c.get("reason", "taglio di struttura"))[:200], "word": ""}
        bad = (e <= s or s < 0 or (duration_s and e > duration_s + 0.5) or (e - s) > AI_CUT_MAX_S
               or overlaps(item, protected))
        if not bad and duration_s and total + (e - s) > AI_CUT_MAX_SHARE * duration_s:
            bad = True
        (rej if bad else acc).append(item)
        if not bad:
            total += e - s
    return {"accepted": acc, "rejected": rej, "total_s": round(total, 2)}


STRUCTURE_PROMPT = """Sei il montatore di una MASTERCLASS di vendita/divulgazione in italiano.
Ti do la trascrizione a tempi (secondi). Proponi SOLO tagli di struttura, secondo questa regola:
- presentazioni troppo lunghe all'inizio: tieni nome + una riga di credibilità + la promessa;
- riepiloghi che ripetono ciò che è appena stato detto; rimandi ridondanti;
- interruzioni fuori campo (rumori, animali, "scusa un attimo") e riprese abbandonate;
- presentazione del prodotto prima del valore.
NON tagliare numeri, esempi che provano, definizioni del problema, e MAI le pratiche guidate
(respiro, esercizi, "facciamo insieme"). Usa i tempi esatti delle parole. Ogni taglio ≤ 2 minuti.
Rispondi SOLO con un array JSON: [{{"start": float, "end": float, "reason": "..."}}]. Se nulla, [].

Pratiche guidate (NON toccare): {protected}

Parole (testo | start-end):
{timed}
"""


def build_structure_prompt(words: list, protected: list[dict], limit: int = 6000) -> str:
    rows = [f"{(w.get('text') or w.get('word') or '').strip()} | {float(w['start']):.2f}-{float(w['end']):.2f}"
            for w in (words or [])[:limit]]
    prot = "; ".join(f"{r['start']:.0f}-{r['end']:.0f}s" for r in protected) or "nessuna"
    return STRUCTURE_PROMPT.format(protected=prot, timed="\n".join(rows))


def assemble_plan(*cut_lists: list, duration_s: float, min_keep_s: float = 0.25) -> dict:
    """Unisce i tagli (ordine, fusione degli overlap) e calcola gli intervalli da tenere."""
    segs = []
    for lst in cut_lists:
        for c in lst or []:
            s, e = max(0.0, float(c["start"])), min(float(duration_s), float(c["end"]))
            if e > s:
                segs.append({"start": s, "end": e, "type": c.get("type", "smart"),
                             "reason": c.get("reason", ""), "word": c.get("word", "")})
    segs.sort(key=lambda x: x["start"])
    merged: list[dict] = []
    for c in segs:
        if merged and c["start"] <= merged[-1]["end"]:
            merged[-1]["end"] = max(merged[-1]["end"], c["end"])
            if c["type"] == "smart":
                merged[-1]["type"] = "smart"
        else:
            merged.append(dict(c))
    for i, c in enumerate(merged):
        c["id"], c["enabled"] = i, True
        c["start"], c["end"] = round(c["start"], 3), round(c["end"], 3)
    keep, pos = [], 0.0
    for c in merged:
        if c["start"] - pos >= min_keep_s:
            keep.append((round(pos, 3), c["start"]))
        pos = max(pos, c["end"])
    if duration_s - pos >= min_keep_s:
        keep.append((round(pos, 3), round(float(duration_s), 3)))
    kept = sum(b - a for a, b in keep)
    return {"cuts": merged, "keep": keep, "kept_s": round(kept, 2),
            "cut_s": round(float(duration_s) - kept, 2)}


def map_time(t: float, keep: list[tuple[float, float]]) -> Optional[float]:
    """Tempo del girato → tempo del video montato; None se cade in un taglio."""
    acc = 0.0
    for a, b in keep:
        if a <= t <= b:
            return round(acc + (t - a), 3)
        acc += b - a
    return None


def map_range(start: float, end: float, keep: list[tuple[float, float]]) -> Optional[tuple[float, float]]:
    """Intervallo del girato → montato (si restringe a ciò che resta). None se sparisce."""
    acc, lo, hi = 0.0, None, None
    for a, b in keep:
        s, e = max(a, start), min(b, end)
        if e > s:
            lo = acc + (s - a) if lo is None else lo
            hi = acc + (e - a)
        acc += b - a
    return (round(lo, 3), round(hi, 3)) if lo is not None and hi is not None and hi - lo > 0.2 else None


# ───────────────────────────── schede a schermo ─────────────────────────────

CARDS_PROMPT = """Sei il regista delle SCHEDE A SCHERMO INTERO di una masterclass (testo grande su fondo scuro,
come "SE TI RICONOSCI: ✓ clienti ✓ competenza", "ERRORE 4 DI 5", "LIVELLO 4 DI 4", "COSA FARE ADESSO").
Dalla trascrizione a tempi proponi 14-26 schede che mostrano i punti chiave mentre vengono detti.
Regole: una scheda ogni 25-45 s di volto; durata 3-45 s; MAX 3 righe brevi (≤ 6 parole l'una);
tipi: checklist | quote | number | step | recap | cta; kicker breve in maiuscolo (≤ 28 caratteri);
la prima entro i primi 5 s; l'ultima è la CTA finale "COSA FARE ADESSO" (max 3 azioni).
NON mettere schede sopra le pratiche guidate (respiro, esercizi): {protected}.
Testi scritti dal SENSO, non copiati dalla trascrizione automatica (può avere errori).
Parole vietate dal partner: {banned}.
Rispondi SOLO con un array JSON:
[{{"start": float, "end": float, "kind": "...", "kicker": "...", "lines": ["...", "..."]}}].

Trascrizione a blocchi:
{blocks}
"""


def build_cards_prompt(words: list, protected: list[dict], banned: Iterable[str] = (), block_s: float = 30.0) -> str:
    blocks: dict[int, list[str]] = {}
    for w in words:
        blocks.setdefault(int(float(w["start"]) // block_s), []).append((w.get("text") or w.get("word") or "").strip())
    text = "\n".join(f"[{k * block_s:.0f}s] " + " ".join(v) for k, v in sorted(blocks.items()))
    prot = "; ".join(f"{r['start']:.0f}-{r['end']:.0f}s" for r in protected) or "nessuna"
    return CARDS_PROMPT.format(protected=prot, banned=", ".join(banned) or "nessuna", blocks=text)


def parse_cards(raw: str) -> list[dict]:
    if not raw:
        return []
    txt = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", txt, re.DOTALL)
    if fence:
        txt = fence.group(1).strip()
    a, b = txt.find("["), txt.rfind("]")
    if a == -1 or b < a:
        return []
    try:
        data = json.loads(txt[a:b + 1])
    except Exception:
        return []
    return data if isinstance(data, list) else []


def validate_cards(cards: list, protected: Iterable[dict], duration_s: float,
                   banned: Iterable[str] = ()) -> dict:
    """Schede ammesse: tipo noto, 3-45 s, ≤3 righe, fuori dalle pratiche, senza parole vietate, senza sovrapposizioni."""
    banned_re = [re.compile(r"\b" + re.escape(b.lower()) + r"\b") for b in banned if b]
    acc, rej = [], []
    for c in cards or []:
        try:
            s, e = float(c["start"]), float(c["end"])
            lines = [str(x).strip() for x in (c.get("lines") or []) if str(x).strip()]
        except Exception:
            continue
        item = {"start": round(s, 3), "end": round(e, 3), "kind": str(c.get("kind", "recap")),
                "kicker": str(c.get("kicker", "")).strip().upper()[:28], "lines": lines[:CARD_MAX_LINES]}
        text = " ".join([item["kicker"]] + lines).lower()
        reason = None
        if item["kind"] not in CARD_KINDS:
            reason = "tipo non ammesso"
        elif not (CARD_MIN_S <= e - s <= CARD_MAX_S):
            reason = "durata fuori da 3-45 s"
        elif len(lines) > CARD_MAX_LINES or not lines:
            reason = "righe non valide"
        elif e > duration_s + 0.5 or s < 0:
            reason = "fuori dal girato"
        elif overlaps(item, protected):
            reason = "sopra una pratica guidata"
        elif any(r.search(text) for r in banned_re):
            reason = "parola vietata"
        elif acc and s < acc[-1]["end"]:
            reason = "sovrapposta alla precedente"
        elif len(acc) >= CARDS_MAX:
            reason = "troppe schede"
        if reason:
            rej.append({**item, "rejected_because": reason})
        else:
            acc.append(item)
    acc.sort(key=lambda x: x["start"])
    return {"accepted": acc, "rejected": rej}


# ───────────────────────────── grafica ─────────────────────────────

def _lum(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def _is_hex(v) -> bool:
    return bool(re.fullmatch(r"#[0-9a-fA-F]{6}", str(v or "").strip()))


def card_palette(colors: Iterable[str]) -> dict:
    """Palette delle schede dal brand kit DEL PARTNER (mai quella di Ciak/Evolution).

    Fondo = il colore più scuro; testo = bianco o quasi nero (il più leggibile); accento = il colore
    più vivace tra gli altri. Con colori insufficienti: fondo scuro neutro + accento unico.
    """
    cols = [c.strip() for c in (colors or []) if _is_hex(c)]
    if not cols:
        return {"background": "#14181F", "text": "#FFFFFF", "accent": "#9AA5B1", "accent2": "#9AA5B1", "source": "neutral-fallback"}
    dark = min(cols, key=_lum)
    if _lum(dark) > 0.35:                      # nessun colore abbastanza scuro: fondo grigio notte
        dark = "#14181F"
    others = [c for c in cols if c.lower() != dark.lower()] or [cols[0]]

    def sat(c):
        h = c.lstrip("#")
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        return max(r, g, b) - min(r, g, b)

    ranked = sorted(others, key=sat, reverse=True)
    accent = ranked[0]
    accent2 = ranked[1] if len(ranked) > 1 else accent
    return {"background": dark, "text": "#FFFFFF", "accent": accent, "accent2": accent2, "source": "partner"}


def _wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if cur and draw.textlength(t, font=font) > max_w:
            lines.append(cur)
            cur = w
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines


def draw_card(card: dict, palette: dict, size=(1920, 1080), logo=None, label: str = ""):
    """Scheda a schermo intero: fondo del brand, kicker, righe grandi, accento. Testi dal SENSO, pochi."""
    from PIL import Image, ImageDraw, ImageFont
    fp = _cover_font_path()
    if not fp:
        raise RuntimeError("Font di sistema non disponibile per le schede")
    w, h = size
    s = h / 1080.0
    img = Image.new("RGB", size, palette["background"])
    d = ImageDraw.Draw(img)
    mx = int(150 * s)
    f_kick = ImageFont.truetype(fp, int(34 * s))
    y = int(h * 0.30)
    if card.get("kicker"):
        d.text((mx, y), card["kicker"], font=f_kick, fill=palette["accent"])
        y += int(70 * s)
    kind = card.get("kind", "recap")
    big = {"number": 150, "quote": 84, "cta": 78}.get(kind, 92)
    for i, line in enumerate(card.get("lines") or []):
        size_px = int((big if i == 0 else big * 0.72) * s)
        font = ImageFont.truetype(fp, size_px)
        for part in _wrap(d, line if kind != "checklist" else line, font, w - 2 * mx - (int(80 * s) if kind == "checklist" else 0)):
            x = mx
            if kind == "checklist":
                r = int(22 * s)
                cy = y + int(size_px * 0.52)
                d.ellipse((x, cy - r, x + 2 * r, cy + r), outline=palette["accent"], width=max(3, int(5 * s)))
                d.line((x + r * 0.45, cy, x + r * 0.85, cy + r * 0.45, x + r * 1.55, cy - r * 0.5), fill=palette["accent"], width=max(3, int(5 * s)))
                x += int(80 * s)
            color = palette["accent"] if (i == 0 and kind in ("number", "quote")) else palette["text"]
            d.text((x, y), part, font=font, fill=color)
            y += int(size_px * 1.22)
        y += int(18 * s)
    d.rectangle((mx, int(h * 0.30) - int(36 * s), mx + int(110 * s), int(h * 0.30) - int(30 * s)), fill=palette["accent"])
    if logo is not None:
        ratio = min(280 * s / logo.width, 90 * s / logo.height)
        lg = logo.resize((max(1, int(logo.width * ratio)), max(1, int(logo.height * ratio))))
        img.paste(lg, (w - mx - lg.width, h - int(90 * s) - lg.height), lg)
    return img


def draw_sigla(palette: dict, size=(1920, 1080), logo=None, name: str = ""):
    """Frame della sigla: fondo del brand, logo del partner al centro, nome sotto. Nessuna musica."""
    from PIL import Image, ImageDraw, ImageFont
    fp = _cover_font_path()
    w, h = size
    s = h / 1080.0
    img = Image.new("RGB", size, palette["background"])
    d = ImageDraw.Draw(img)
    y = h // 2
    if logo is not None:
        ratio = min(520 * s / logo.width, 520 * s / logo.height)
        lg = logo.resize((max(1, int(logo.width * ratio)), max(1, int(logo.height * ratio))))
        img.paste(lg, ((w - lg.width) // 2, int(h * 0.50) - lg.height // 2 - int(40 * s)), lg)
        y = int(h * 0.50) + lg.height // 2 + int(10 * s)
    if name and fp:
        f = ImageFont.truetype(fp, int(54 * s))
        tw = d.textlength(name.upper(), font=f)
        d.text(((w - tw) / 2, y + int(20 * s)), name.upper(), font=f, fill=palette["text"])
        d.rectangle(((w - 140 * s) / 2, y + int(100 * s), (w + 140 * s) / 2, y + int(106 * s)), fill=palette["accent"])
    return img


# ───────────────────────────── ffmpeg ─────────────────────────────

def video_enc(preset: str = "veryfast", crf: int = 20) -> list[str]:
    return ["-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart"]


VIDEO_ENC = video_enc()
AUDIO_ENC = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
FADE_S = 0.008


def edited_pieces(keep: list[tuple[float, float]], cards_edited: list[dict]) -> list[dict]:
    """Sequenza video sul tempo del montato: pezzi di volto (con l'intervallo del girato) o di scheda.

    Le schede SOSTITUISCONO il volto per la loro durata (nessuna sovrapposizione): è molto più leggero
    da codificare e il volto non viene nemmeno ridimensionato mentre una scheda è a schermo.
    """
    offs, acc = [], 0.0
    for a, b in keep:
        offs.append(acc)
        acc += b - a
    total = acc
    pts = {0.0, round(total, 3)}
    pts.update(round(o, 3) for o in offs)
    for c in cards_edited:
        pts.add(round(max(0.0, min(total, c["start"])), 3))
        pts.add(round(max(0.0, min(total, c["end"])), 3))
    bounds = sorted(pts)
    pieces = []
    for t0, t1 in zip(bounds, bounds[1:]):
        if t1 - t0 < 0.001:
            continue
        mid = (t0 + t1) / 2
        card = next((k for k, c in enumerate(cards_edited) if c["start"] <= mid < c["end"]), None)
        if card is not None:
            if pieces and pieces[-1].get("card") == card:      # una scheda a cavallo di un taglio resta un pezzo solo
                pieces[-1]["dur"] = round(pieces[-1]["dur"] + (t1 - t0), 3)
            else:
                pieces.append({"card": card, "dur": round(t1 - t0, 3)})
            continue
        i = max(j for j, o in enumerate(offs) if o <= mid + 1e-9)
        pieces.append({"src": (round(keep[i][0] + (t0 - offs[i]), 3), round(keep[i][0] + (t1 - offs[i]), 3)),
                       "dur": round(t1 - t0, 3)})
    return pieces


def build_filter_script(keep: list[tuple[float, float]], cards_edited: list[dict],
                        size: tuple[int, int], fps: float, loudnorm: Optional[str] = None) -> str:
    """filter_complex: video = pezzi di volto/scheda in sequenza; audio = tagli concatenati con micro-dissolvenze."""
    pieces = edited_pieces(keep, cards_edited)
    parts = []
    faces = [p for p in pieces if "src" in p]
    if faces:
        parts.append(f"[0:v]split={len(faces)}" + "".join(f"[s{i}]" for i in range(len(faces))))
    uses: dict[int, int] = {}
    for p in pieces:
        if "card" in p:
            uses[p["card"]] = uses.get(p["card"], 0) + 1
    for k, n in uses.items():
        parts.append(f"[{k + 1}:v]split={n}" + "".join(f"[c{k}_{j}]" for j in range(n)) if n > 1 else f"[{k + 1}:v]null[c{k}_0]")
    fi, used = 0, {k: 0 for k in uses}
    for idx, p in enumerate(pieces):
        if "src" in p:
            a, b = p["src"]
            parts.append(f"[s{fi}]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS,fps={fps:g},"
                         f"scale={size[0]}:{size[1]},setsar=1,format=yuv420p[p{idx}]")
            fi += 1
        else:
            k = p["card"]
            parts.append(f"[c{k}_{used[k]}]trim=duration={p['dur']:.3f},setpts=PTS-STARTPTS,fps={fps:g},"
                         f"scale={size[0]}:{size[1]},setsar=1,format=yuv420p[p{idx}]")
            used[k] += 1
    parts.append("".join(f"[p{i}]" for i in range(len(pieces))) + f"concat=n={len(pieces)}:v=1:a=0[vout]")
    for i, (a, b) in enumerate(keep):
        d = b - a
        fade = min(FADE_S, d / 4)
        parts.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:d={fade:.3f},afade=t=out:st={max(0.0, d - fade):.3f}:d={fade:.3f}[a{i}]")
    n = len(keep)
    parts.append("".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1[ac0]")
    parts.append(f"[ac0]{loudnorm}[aout]" if loudnorm else "[ac0]anull[aout]")
    return ";\n".join(parts)


def measure_loudnorm(video_in: str, keep: list[tuple[float, float]], target: float = TARGET_LUFS) -> dict:
    """Prima passata di loudnorm sull'audio già tagliato: misure da riusare nella seconda passata."""
    parts = [f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS[a{i}]" for i, (a, b) in enumerate(keep)]
    parts.append("".join(f"[a{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=0:a=1,{PRE_COMPRESS},"
                 f"loudnorm=I={target}:LRA={TARGET_LRA}:TP={TARGET_TP}:print_format=json[o]")
    script = Path(video_in).with_suffix(".ln1.txt")
    script.write_text(";\n".join(parts), encoding="utf-8")
    r = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", video_in, "-filter_complex_script", str(script),
                        "-map", "[o]", "-f", "null", "-"], capture_output=True, text=True, timeout=3600)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr or "", re.DOTALL)
    if not m:
        raise RuntimeError("loudnorm: misura non riuscita")
    return json.loads(m.group(0))


def loudnorm_filter(measured: dict, target: float = TARGET_LUFS) -> str:
    return (f"{PRE_COMPRESS},loudnorm=I={target}:LRA={TARGET_LRA}:TP={TARGET_TP}:measured_I={measured['input_i']}:"
            f"measured_LRA={measured['input_lra']}:measured_TP={measured['input_tp']}:"
            f"measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:linear=true")


def video_info(path: str) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,r_frame_rate", "-of", "json", path],
                       capture_output=True, text=True, timeout=60)
    st = json.loads(r.stdout)["streams"][0]
    num, den = st["r_frame_rate"].split("/")
    return {"width": int(st["width"]), "height": int(st["height"]), "fps": round(float(num) / float(den or 1), 3)}


def render_sigla_clip(png: Path, out: Path, size: tuple[int, int], fps: float, seconds: float = SIGLA_S,
                      enc: Optional[list[str]] = None) -> None:
    """Sigla: fermo immagine con dissolvenza in/out, audio silenzioso (nessuna musica)."""
    fade = 0.8
    _run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-framerate", f"{fps:g}", "-t", f"{seconds}", "-i", str(png),
          "-f", "lavfi", "-t", f"{seconds}", "-i", "anullsrc=r=48000:cl=stereo",
          "-vf", f"scale={size[0]}:{size[1]},fade=t=in:st=0:d={fade},fade=t=out:st={seconds - fade}:d={fade},fps={fps:g}",
          *(enc or VIDEO_ENC), *AUDIO_ENC, "-shortest", str(out)])


def silence_list(path: str, noise_db: float = -35.0) -> list[dict]:
    """Silenzi del file. Sul girato la soglia va alzata del guadagno che il volume finale applicherà
    (es. girato a -11,8 LUFS portato a -17,5: soglia -35 sul montato = -29,3 sul girato), altrimenti il
    rumore tra le parole risulta "pausa" solo dopo la normalizzazione."""
    r = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-vn", "-af", f"silencedetect=noise={noise_db:g}dB:d=0.25",
                        "-f", "null", "-"], capture_output=True, text=True, timeout=3600)
    return [{"start": float(e) - float(d), "end": float(e), "duration": float(d)}
            for e, d in re.findall(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", r.stderr or "")]


def qc_report(path: str, practice_edited: Iterable[dict] = ()) -> dict:
    """Misure del montato confrontate con la regola; le pause dentro le pratiche non contano."""
    dur = _duration(path)
    r = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", path, "-vn", "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True, timeout=3600)
    tail = (r.stderr or "").split("Summary:")[-1]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", tail)
    lra = re.search(r"LRA:\s+([\d.]+) LU", tail)
    pk = re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)
    sil = silence_list(path)
    outside = [s for s in sil if not any(a <= s["start"] <= b for a, b in [(p["start"], p["end"]) for p in practice_edited])]
    longest = max((s["duration"] for s in outside), default=0.0)
    over = [s for s in outside if s["duration"] > PAUSE_MAX_S]
    lufs = float(i.group(1)) if i else None
    lra_v = float(lra.group(1)) if lra else None
    mins = dur / 60.0
    checks = {
        "durata": DURATION_RANGE_MIN[0] <= mins <= DURATION_RANGE_MIN[1],
        "volume": lufs is not None and TARGET_LUFS - 1 <= lufs <= TARGET_LUFS + 1,
        "dinamica": lra_v is not None and lra_v <= TARGET_LRA + 0.5,
        "pause": not over,
    }
    return {"standard": STANDARD_VERSION, "duration_s": round(dur, 1), "lufs": lufs, "lra": lra_v,
            "true_peak_db": float(pk.group(1)) if pk else None,
            "longest_pause_outside_practice_s": round(longest, 2), "pauses_over_limit": len(over),
            "checks": checks, "all_ok": all(checks.values())}


def render_masterclass(*, source: str, output: str, tmp_dir: Path, plan: dict, cards: list[dict], brand: dict,
                       logo_url: Optional[str] = None, logo_image=None, height: Optional[int] = None,
                       with_sigla: bool = True, practice: Optional[list[dict]] = None,
                       preset: str = "veryfast", crf: int = 20) -> dict:
    """Esegue il piano: tagli → schede → loudness → sigle → controllo. Sincrono (ffmpeg/Pillow)."""
    tmp_dir.mkdir(parents=True, exist_ok=True)
    info = video_info(source)
    h = height or info["height"]
    w = int(round(info["width"] * h / info["height"] / 2)) * 2
    size, fps = (w, h), info["fps"]
    keep = [tuple(k) for k in plan["keep"]]
    palette = card_palette(brand.get("colors") or [])
    logo = logo_image if logo_image is not None else load_logo(logo_url)

    cards_edited = []
    for c in cards:
        mr = map_range(c["start"], c["end"], keep)
        if mr:
            cards_edited.append({**c, "start": mr[0], "end": mr[1]})
    png_paths = []
    for k, c in enumerate(cards_edited):
        p = tmp_dir / f"card-{k:02d}.png"
        draw_card(c, palette, size=size, logo=logo).save(p)
        png_paths.append(p)

    measured = measure_loudnorm(source, keep)
    ln = loudnorm_filter(measured)
    script = tmp_dir / "body.filter.txt"
    script.write_text(build_filter_script(keep, cards_edited, size, fps, ln), encoding="utf-8")
    body = tmp_dir / "body.mp4"
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", source]
    for p in png_paths:
        cmd += ["-loop", "1", "-framerate", f"{fps:g}", "-i", str(p)]
    enc = video_enc(preset, crf)
    cmd += ["-filter_complex_script", str(script), "-map", "[vout]", "-map", "[aout]", *enc, *AUDIO_ENC,
            "-progress", str(tmp_dir / "progress.txt"), "-nostats", "-shortest", str(body)]
    _run(cmd, timeout=7200)

    final_parts = [body]
    if with_sigla:
        sig_png, sig = tmp_dir / "sigla.png", tmp_dir / "sigla.mp4"
        draw_sigla(palette, size=size, logo=logo, name=brand.get("name", "")).save(sig_png)
        render_sigla_clip(sig_png, sig, size, fps, enc=enc)
        final_parts = [sig, body, sig]
    lst = tmp_dir / "concat.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in final_parts), encoding="utf-8")
    _run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
          "-movflags", "+faststart", output], timeout=3600)
    offset = SIGLA_S if with_sigla else 0.0
    prac_edit = []
    for p in practice or []:
        mr = map_range(p["start"], p["end"], keep)
        if mr:
            prac_edit.append({"start": mr[0] + offset, "end": mr[1] + offset})
    report = qc_report(output, prac_edit)
    report.update({"source_duration_s": round(_duration(source), 1), "cuts": len(plan["cuts"]),
                   "cut_s": plan["cut_s"], "cards": len(cards_edited), "practice_ranges": practice or [],
                   "palette": palette, "loudnorm_input_i": measured.get("input_i"), "with_sigla": with_sigla})
    return report
