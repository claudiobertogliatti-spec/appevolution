"""Piano dei tagli di una VIDEOLEZIONE: ripetizioni, balbettii, pause e filo del discorso.

Prima i tagli delle lezioni erano solo intercalari e pause: `enforce_lesson_policy` scartava qualunque taglio
oltre 2,5 s, quindi riprese ripetute e tagli di struttura non passavano mai (e senza chiave OpenAI sul worker non
ne arrivavano nemmeno). Su una lezione di 7 minuti restavano ~23 balbettii ("di di", "se se", "a a a") e frasi
ripetute due volte ("vorrei migliorare questo, vorrei migliorare questo").

Qui si riusano i rilevatori del montaggio masterclass (riprese, balbettii, intercalari, pause su silenzi reali,
pause vicine a un taglio) con la stessa cautela sugli esercizi guidati (zone protette = nessun taglio), e si
aggiunge un passaggio AI sul FILO DEL DISCORSO (la stessa idea detta due volte, false partenze, digressioni).
L'AI propone, le regole decidono: ogni proposta passa dai validatori (mai sopra un esercizio, taglio singolo
<= 60 s, in totale <= 15% del girato).

Funzioni pure: nessun accesso a rete/DB/ffmpeg. La pipeline fornisce parole, silenzi e (se disponibile) le
proposte dell'AI.
"""
from __future__ import annotations

from typing import Iterable, Optional

from services import ciak_masterclass_standard as mc
from services.ciak_lesson_standard import STANDARD_VERSION, normalize_words, protected_exercise_ranges

CUT_PLAN_VERSION = "lesson-cuts-v2"
LESSON_PAUSE_MAX_S = 1.0         # nessuna pausa oltre 1 s fuori dagli esercizi (era 1,3 s)
LESSON_AI_CUT_MAX_S = 60.0       # un taglio AI di una lezione non supera 1 minuto
MIN_GAP_AS_SILENCE_S = 0.25      # senza audio, si considera "pausa" un vuoto fra due parole di almeno 0,25 s

LESSON_AI_PROMPT = """Sei il montatore di una VIDEOLEZIONE di un videocorso, in italiano.
Ti do la trascrizione a tempi (secondi). Proponi SOLO tagli che migliorano il FILO DEL DISCORSO, di TRE tipi,
e scrivi nel campo "reason" la parola chiave del tipo:
1. RIPETIZIONE LETTERALE: la stessa frase detta due volte quasi con le stesse parole, una dopo l'altra: togli la prima copia.
2. TENTATIVI MULTIPLI: il relatore prova tre o piu volte a formulare la stessa frase ("dobbiamo considerare / dobbiamo
   scoprire / dobbiamo rendere / dobbiamo diventare coscienti...") e poi la dice in modo pulito: UN solo taglio che toglie tutto
   il passaggio confuso, purche la frase pulita successiva regga da sola.
3. DIGRESSIONE: un passaggio fuori tema che interrompe il filo.
NON proporre MAI: riformulazioni brevi nel parlato naturale (es. "che effettivamente... che effettivamente"), piccole false
partenze, esitazioni isolate di una o due parole, frasi riflessive o di chiusura: l'autore le vuole tenere perche il tono resti
naturale.
NON tagliare nemmeno: esempi che chiariscono, definizioni, numeri, passaggi che introducono un esercizio, il saluto iniziale e
la chiusura, MAI gli esercizi guidati (respiro, pratiche, "facciamo insieme").
Ogni taglio deve iniziare e finire a un confine di frase, durare al massimo 1 minuto, usare i tempi esatti delle parole.
Rispondi SOLO con un array JSON: [{{"start": float, "end": float, "reason": "..."}}]. Se non c'e nulla da togliere, [].

Esercizi guidati (NON toccare): {protected}

Parole (testo | start-end):
{timed}
"""


def build_lesson_ai_prompt(words: list, protected: list[dict], limit: int = 6000) -> str:
    rows = [f"{(w.get('text') or w.get('word') or '').strip()} | {float(w['start']):.2f}-{float(w['end']):.2f}"
            for w in (words or [])[:limit]]
    prot = "; ".join(f"{r['start']:.0f}-{r['end']:.0f}s" for r in protected) or "nessuno"
    return LESSON_AI_PROMPT.format(protected=prot, timed="\n".join(rows))


def silences_from_words(words: list) -> list[dict]:
    """Pause ricavate dai vuoti fra parole (ripiego quando non c'e l'analisi dell'audio)."""
    out = []
    for left, right in zip(words, words[1:]):
        a, b = float(left["end"]), float(right["start"])
        if b - a >= MIN_GAP_AS_SILENCE_S:
            out.append({"start": a, "end": b, "duration": b - a})
    return out


REPHRASE_MARKERS = ("riformula", "falsa partenza", "ridondante", "esitazion")
KEEP_MARKERS = ("letterale", "tentativi", "digressione")


def is_rephrase_proposal(reason: str) -> bool:
    """True se la proposta dell'AI e una riformulazione/esitazione da TENERE (decisione dell'autore, 6/10/2026)."""
    r = str(reason or "").lower()
    return any(m in r for m in REPHRASE_MARKERS) and not any(m in r for m in KEEP_MARKERS)


def drop_overlapping_repeats(cuts: list) -> list:
    """Due tagli di ripresa che si sovrappongono si fonderebbero in uno solo e toglierebbero anche l'ULTIMA copia, che e
    quella da tenere ("il punto nave quando si naviga appunto | il punto nave e | quando si naviga"). Si tiene il primo."""
    out, last_end = [], -1.0
    for c in sorted(cuts, key=lambda x: float(x["start"])):
        if float(c["start"]) >= last_end - 1e-6:
            out.append(c)
            last_end = float(c["end"])
    return out


def plan_lesson_cuts(words: list, duration_s: float, *, silences: Optional[list] = None,
                     ai_candidates: Optional[Iterable[dict]] = None,
                     extra_cuts: Optional[Iterable[dict]] = None,
                     pause_max_s: float = LESSON_PAUSE_MAX_S) -> dict:
    """Piano completo dei tagli. Ritorna il formato che la pipeline gia usa (`cuts` con start/end/exact)."""
    words = normalize_words(words, duration_s)
    protected = protected_exercise_ranges(words)
    sil = silences if silences else silences_from_words(words)

    pause = mc.silence_cuts(sil, protected, max_s=pause_max_s)
    fill = mc.filler_cuts(words, protected)
    rep = drop_overlapping_repeats(mc.repeat_cuts(words, protected))
    pause += mc.adjacent_pause_cuts(sil, fill + rep, protected, max_s=pause_max_s)

    ai = {"accepted": [], "rejected": [], "total_s": 0.0}
    ai_candidates = [c for c in (ai_candidates or []) if isinstance(c, dict)]
    if ai_candidates:
        rephrases = [{"start": _num(c.get("start")), "end": _num(c.get("end")), "type": "smart", "word": "",
                      "reason": "riformulazione nel parlato naturale: tenuta"}
                     for c in ai_candidates if is_rephrase_proposal(c.get("reason"))]
        ai_candidates = [c for c in ai_candidates if not is_rephrase_proposal(c.get("reason"))]
        capped = [c for c in ai_candidates
                  if _num(c.get("end")) - _num(c.get("start")) <= LESSON_AI_CUT_MAX_S]
        too_long = [{"start": _num(c.get("start")), "end": _num(c.get("end")), "reason": "taglio AI oltre 60 s",
                     "type": "smart", "word": ""}
                    for c in ai_candidates if c not in capped] + rephrases
        ai = mc.validate_ai_cuts(capped, words, protected, duration_s)
        ai["rejected"] = list(ai["rejected"]) + too_long
    plan = mc.assemble_plan(pause, fill, rep, ai["accepted"], duration_s=duration_s)

    cuts = [{"id": i, "start": c["start"], "end": c["end"], "type": c["type"], "reason": c["reason"],
             "word": c.get("word", ""), "exact": True, "enabled": True}
            for i, c in enumerate(plan["cuts"])]
    # Intercalari gia riconosciuti dal trascrittore: si tengono con il loro margine di sicurezza (non "exact"),
    # ma solo se non cadono su un taglio gia deciso (i tagli sovrapposti confonderebbero il montaggio).
    for e in extra_cuts or []:
        item = {"start": _num(e.get("start")), "end": _num(e.get("end")), "type": e.get("type", "filler"),
                "reason": e.get("reason", "intercalare"), "word": e.get("word", ""), "exact": False, "enabled": True}
        if item["end"] > item["start"] and not mc.overlaps(item, cuts) and not mc.overlaps(item, protected):
            cuts.append(item)
    cuts.sort(key=lambda c: c["start"])
    for i, c in enumerate(cuts):
        c["id"] = i
    by_kind = {
        "pause": sum(1 for c in cuts if c["type"] == "silence"),
        "intercalari": sum(1 for c in cuts if c["type"] == "filler"),
        "ripetizioni": sum(1 for c in cuts if c["type"] == "smart" and c["reason"] in ("balbettio",)
                           or c["reason"].startswith("ripresa")),
        "filo_del_discorso_ai": len(ai["accepted"]),
    }
    return {
        "cuts": cuts, "rejected": ai["rejected"], "protected_ranges": protected,
        "standard_version": STANDARD_VERSION, "cut_plan_version": CUT_PLAN_VERSION,
        "stats": {**by_kind, "cut_s": plan["cut_s"], "kept_s": plan["kept_s"],
                  "pause_max_s": pause_max_s, "ai_proposed": len(ai_candidates)},
        "ai_cuts": ai["accepted"],
    }


def _num(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0
