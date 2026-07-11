"""
Ciak Cut Engine v2 — proposta tagli "stile Descript" per i video-lezione.

Helper PURI + un'unica orchestrazione (propose_cuts) che chiama l'LLM (iniettabile
per i test). Nessun I/O DB. Output = lista di cut_segment nello STESSO schema usato
da pipeline + review UI:
  {id:int, start:float, end:float, type:"filler"|"smart"|"silence", reason:str, word:str, enabled:True}
"""
from __future__ import annotations

import json
import re
from typing import Callable, Optional

# Intercalari italiani più comuni (euristica di fallback).
FILLER_WORDS = {
    "ehm", "eh", "mmm", "cioè", "cioe", "tipo", "insomma", "diciamo",
    "praticamente", "appunto", "niente", "comunque", "boh", "allora", "ecco",
}


def parse_llm_cuts(raw: str) -> list:
    """Estrae la lista di tagli dal testo LLM. Tollera prosa e code fence ```json```."""
    if not raw:
        return []
    txt = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", txt, re.DOTALL)
    if fence:
        txt = fence.group(1).strip()
    a, b = txt.find("["), txt.rfind("]")
    if a == -1 or b == -1 or b < a:
        return []
    try:
        data = json.loads(txt[a:b + 1])
    except Exception:
        return []
    out = []
    for it in data if isinstance(data, list) else []:
        try:
            s, e = float(it["start"]), float(it["end"])
        except Exception:
            continue
        if e <= s:
            continue
        out.append({
            "start": round(s, 3),
            "end": round(e, 3),
            "reason": str(it.get("reason", "")).strip(),
            "word": str(it.get("word", "")).strip(),
            "type": "smart",
        })
    return out


def detect_filler_from_words(words: list) -> list:
    """Tagli euristici per intercalari isolati, dai words con timings (in secondi)."""
    out = []
    for w in words or []:
        tok = (w.get("text") or w.get("word") or "").strip().lower().strip(".,!?;:")
        if tok not in FILLER_WORDS:
            continue
        try:
            s, e = float(w["start"]), float(w["end"])
        except Exception:
            continue
        if e > s:
            out.append({"start": round(s, 3), "end": round(e, 3),
                        "reason": "intercalare", "word": tok, "type": "filler"})
    return out


def merge_cut_segments(*lists) -> list:
    """Unisce N liste di tagli: ordina per start, fonde gli overlap, riassegna id
    progressivi, imposta enabled=True. Mantiene type/reason/word del primo del gruppo."""
    segs = []
    for lst in lists:
        for s in lst or []:
            try:
                st, en = float(s["start"]), float(s["end"])
            except Exception:
                continue
            if en <= st:
                continue
            segs.append({
                "start": round(st, 3), "end": round(en, 3),
                "type": s.get("type", "smart"),
                "reason": s.get("reason", ""),
                "word": s.get("word", ""),
            })
    segs.sort(key=lambda x: x["start"])
    merged = []
    for s in segs:
        if merged and s["start"] <= merged[-1]["end"]:
            merged[-1]["end"] = max(merged[-1]["end"], s["end"])
        else:
            merged.append(dict(s))
    for i, s in enumerate(merged):
        s["id"] = i
        s["enabled"] = True
    return merged


PROMPT_TEMPLATE = """Sei un montatore che pulisce lezioni video parlate in italiano.
Ti do la trascrizione con i tempi (secondi) parola per parola. Proponi SOLO tagli di
PULIZIA: intercalari (ehm, cioè, tipo...), ripetizioni immediate, false partenze,
riformulazioni ridondanti. NON tagliare contenuto valido, NON riscrivere.
Rispondi SOLO con un array JSON: [{{"start": float, "end": float, "reason": "..."}}].
Usa i tempi delle parole coinvolte. Se non ci sono tagli, rispondi [].

Parole (testo | start-end):
{timed}
"""


def build_prompt(words: list, limit: int = 1200) -> str:
    """Prompt LLM con la trascrizione a tempi (secondi), parola per parola."""
    rows = []
    for w in (words or [])[:limit]:
        tok = (w.get("text") or w.get("word") or "").strip()
        try:
            s, e = float(w["start"]), float(w["end"])
        except Exception:
            continue
        rows.append(f"{tok} | {s:.2f}-{e:.2f}")
    return PROMPT_TEMPLATE.format(timed="\n".join(rows))


def assemble_cuts(llm_raw: Optional[str], words: list, silence_segments: list = None) -> dict:
    """Assembla i cut_segments dalla risposta LLM (o fallback euristico se None/vuota).
    Puro: nessuna rete. Ritorna {"cut_segments": [...], "ai_used": bool}."""
    silence_segments = silence_segments or []
    if llm_raw:
        cuts = parse_llm_cuts(llm_raw)
        return {"cut_segments": merge_cut_segments(cuts, silence_segments), "ai_used": True}
    return {"cut_segments": merge_cut_segments(detect_filler_from_words(words), silence_segments),
            "ai_used": False}


def propose_cuts(words: list, silence_segments: list = None,
                 *, llm: Callable[[str], str]) -> dict:
    """Comodità sync: chiama `llm(prompt)` (iniettabile), poi assembla. Su eccezione → fallback."""
    raw = None
    try:
        raw = llm(build_prompt(words))
    except Exception:
        raw = None
    return assemble_cuts(raw, words, silence_segments)
