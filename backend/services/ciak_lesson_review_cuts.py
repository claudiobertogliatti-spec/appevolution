"""Revisione dei tagli di una videolezione (stile Descript): proposte, decisioni dell'admin, tagli da applicare.

Flusso: la pipeline propone i tagli (piano `ciak_lesson_cut_plan`) e si FERMA a "da_revisionare"; l'admin legge la
trascrizione, toglie le proposte che non condivide e puo aggiungere tagli selezionando un passaggio del testo; solo
dopo l'approvazione parte il montaggio. Le decisioni dell'admin sono AUTORITATIVE: non passano dai limiti pensati
per le proposte automatiche (2,5 s, pause ricalcolate).

Funzioni pure: nessun accesso a rete, DB o ffmpeg.
"""
from __future__ import annotations

import os
from typing import Iterable, Optional

PADDING_S = 0.30                 # margine che le proposte "non esatte" del trascrittore avevano nel taglio
LONG_RETAKE_REVIEW_S = 6.0       # una "ripresa ripetuta" piu lunga di cosi si propone SPENTA: l'admin decide
MAX_MANUAL_CUTS = 100
MIN_MANUAL_S = 0.1
MAX_MANUAL_SHARE = 0.5           # i tagli manuali non tolgono piu della meta del video
EDGE_TOLERANCE_S = 0.5


def lesson_review_enabled_for(partner_id: str, env: Optional[dict] = None) -> bool:
    """`LESSON_REVIEW_ENABLED=true` = tutti i partner; `LESSON_REVIEW_PARTNERS=id1,id2` = solo quelli (collaudo)."""
    env = os.environ if env is None else env
    if str(env.get("LESSON_REVIEW_ENABLED", "")).strip().lower() == "true":
        return True
    allowed = {p.strip() for p in str(env.get("LESSON_REVIEW_PARTNERS", "")).split(",") if p.strip()}
    return bool(partner_id) and partner_id in allowed


def proposals_for_review(cuts: Iterable[dict]) -> list[dict]:
    """Tagli proposti nel formato della pagina di revisione. Le proposte non esatte (intercalari del trascrittore)
    si restringono del solito margine e diventano esatte: cosi cio che l'admin vede e cio che viene tagliato."""
    out = []
    for c in cuts or []:
        start, end = float(c["start"]), float(c["end"])
        if not c.get("exact", True):
            start, end = start + PADDING_S, end - PADDING_S
        if end - start <= 0.02:
            continue
        reason = c.get("reason", "")
        enabled = True
        # Le riprese ripetute lunghe trovate dalle regole sbagliano spesso (un riepilogo legittimo preso per una ripresa:
        # 31 s in una lezione): si mostrano ma spente, con l'avviso, e le accende l'admin se sono davvero da togliere.
        if reason.startswith("ripresa") and end - start > LONG_RETAKE_REVIEW_S:
            enabled = False
            reason = f"da controllare ({end - start:.0f} s): {reason}"
        out.append({"id": len(out), "start": round(start, 3), "end": round(end, 3), "type": c.get("type", "smart"),
                    "reason": reason, "word": c.get("word", ""), "enabled": enabled, "exact": True})
    return out


def apply_review_decisions(segs: Iterable[dict], disabled_ids: Iterable, custom_cuts: Iterable[dict],
                           duration_s: float) -> list[dict]:
    """Applica le decisioni dell'admin: proposte disattivate + tagli manuali. Solleva ValueError se i tagli manuali
    non sono validi (messaggio per l'admin)."""
    disabled = {str(i) for i in (disabled_ids or [])}
    out = []
    for s in segs or []:
        item = dict(s)
        item["enabled"] = str(item.get("id")) not in disabled
        out.append(item)

    manual = list(custom_cuts or [])
    if len(manual) > MAX_MANUAL_CUTS:
        raise ValueError(f"Massimo {MAX_MANUAL_CUTS} tagli manuali per volta")
    duration = float(duration_s or 0)
    total = 0.0
    for n, c in enumerate(manual):
        try:
            a, b = float(c["start_s"]), float(c["end_s"])
        except (KeyError, TypeError, ValueError):
            raise ValueError("Ogni taglio manuale ha bisogno di 'start_s' e 'end_s'")
        if a < 0 or b - a < MIN_MANUAL_S:
            raise ValueError("Ogni taglio manuale deve durare almeno 0,1 secondi e partire da zero o dopo")
        if duration and b > duration + EDGE_TOLERANCE_S:
            raise ValueError(f"Un taglio manuale finisce oltre la durata del video ({duration:.0f} s)")
        total += b - a
        out.append({"id": f"m{n + 1}", "start": round(a, 3), "end": round(min(b, duration) if duration else b, 3),
                    "type": "manual", "reason": "taglio manuale", "word": "", "enabled": True, "exact": True})
    if duration and total > duration * MAX_MANUAL_SHARE:
        raise ValueError("Con i tagli manuali togli piu della meta del video: controlla la selezione")
    return out


def cuts_for_render(segs: Iterable[dict], protected: Iterable[dict] = ()) -> dict:
    """Tagli da eseguire dopo l'approvazione: solo gli attivi, ordinati e fusi se si sovrappongono, tutti esatti.

    Le zone protette (esercizi guidati) NON bloccano: la decisione e dell'admin. Si segnalano nel rapporto i tagli
    che le toccano, cosi la scelta resta visibile."""
    active = sorted((s for s in segs or [] if s.get("enabled", True)), key=lambda s: float(s["start"]))
    merged: list[dict] = []
    for s in active:
        a, b = float(s["start"]), float(s["end"])
        if b <= a:
            continue
        if merged and a <= merged[-1]["end"]:
            merged[-1]["end"] = max(merged[-1]["end"], b)
        else:
            merged.append({"start": a, "end": b, "type": s.get("type", "smart"), "reason": s.get("reason", ""),
                           "word": s.get("word", ""), "exact": True})
    touching = sum(1 for m in merged if any(m["start"] < float(p["end"]) and m["end"] > float(p["start"])
                                              for p in protected or []))
    return {"cuts": merged, "cut_s": round(sum(m["end"] - m["start"] for m in merged), 2),
            "touching_protected": touching}
