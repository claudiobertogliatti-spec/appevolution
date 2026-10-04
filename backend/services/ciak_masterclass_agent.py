"""Agente di montaggio masterclass (ciak-masterclass-v1): dal girato + parole al video montato.

Orchestra i pezzi di `ciak_masterclass_standard`: misura i silenzi, trova le pratiche guidate, propone
i tagli (regole + AI per la struttura), fa scrivere le schede all'AI, valida tutto, esegue il montaggio.
Nessun accesso al DB: la pipeline fornisce parole, partner, hub, step brand kit e la funzione `llm`.

L'AI propone, le regole decidono: ogni taglio o scheda proposti passano da validatori deterministici
(mai sopra una pratica, limiti di durata e di quota, niente parole vietate). Se l'AI non risponde
si monta comunque con le sole regole e il rapporto lo dice.
"""
from __future__ import annotations

import asyncio
import logging
import shutil
from pathlib import Path
from typing import Awaitable, Callable, Optional

from services import ciak_masterclass_standard as mc
from services.ciak_lesson_standard import _duration

logger = logging.getLogger(__name__)

LlmFn = Callable[[str], Awaitable[Optional[str]]]


def masterclass_brand(partner: Optional[dict], hub: Optional[dict], step: Optional[dict]) -> dict:
    """Brand del PARTNER per schede e sigle. Mai i colori Ciak: senza colori resta il neutro scuro."""
    partner, hub, step = partner or {}, hub or {}, step or {}
    data = step.get("data", step) if isinstance(step, dict) else {}
    colors = []
    for c in [hub.get("primaryColor"), hub.get("bgColor"), *(data.get("colori") or [])]:
        if isinstance(c, str) and c.strip().startswith("#") and c.strip() not in colors:
            colors.append(c.strip())
    banned = [str(b).strip() for b in (data.get("parole_vietate") or []) if str(b).strip()]
    return {
        "name": hub.get("projectName") or data.get("nome_progetto") or partner.get("name") or "",
        "colors": colors,
        "logo_url": hub.get("logo") or data.get("logo_url") or None,
        "banned": banned,
    }


async def run_masterclass_agent(*, source: str, output: str, tmp_dir: Path, words: list, brand: dict,
                                llm: Optional[LlmFn] = None, height: int = 720, preset: str = "veryfast",
                                crf: int = 23) -> dict:
    """Esegue l'intero standard. Solleva se il montaggio non riesce (la pipeline NON deve pubblicare il grezzo)."""
    loop = asyncio.get_running_loop()
    duration = await loop.run_in_executor(None, _duration, source)
    words = mc.normalize_words(words, duration)
    if not words:
        raise RuntimeError("masterclass: trascrizione con tempi assente")

    # Il volume finale abbassa il girato: la soglia dei silenzi sul girato si alza dello stesso guadagno.
    measured = await loop.run_in_executor(None, mc.measure_loudnorm, source, [(0.0, duration)])
    gain = mc.TARGET_LUFS - float(measured["input_i"])
    threshold = round(-35.0 - gain, 1)
    sil_practice = await loop.run_in_executor(None, mc.silence_list, source)
    sil = await loop.run_in_executor(None, mc.silence_list, source, threshold)

    practice = mc.practice_ranges(words, sil_practice, duration)
    pause = mc.silence_cuts(sil, practice)
    fill = mc.filler_cuts(words, practice)
    rep = mc.repeat_cuts(words, practice)
    pause += mc.adjacent_pause_cuts(sil, fill + rep, practice)

    ai_used = {"structure": False, "cards": False}
    ai_cuts = {"accepted": [], "rejected": [], "total_s": 0}
    cards = {"accepted": [], "rejected": []}
    if llm:
        try:
            raw = await llm(mc.build_structure_prompt(words, practice))
            cands = mc.parse_cards(raw or "")      # estrae un array JSON da testo/fence
            ai_cuts = mc.validate_ai_cuts(cands, words, practice, duration)
            ai_used["structure"] = bool(cands)
        except Exception as exc:
            logger.warning(f"[MASTERCLASS-AGENT] tagli di struttura AI non disponibili: {exc}")
    plan = mc.assemble_plan(pause, fill, rep, ai_cuts["accepted"], duration_s=duration)

    if llm:
        try:
            # Le schede si scrivono sul testo DOPO i tagli? No: i tempi sono del girato, la mappa li porta sul montato.
            raw = await llm(mc.build_cards_prompt(words, practice, brand.get("banned") or []))
            proposed = mc.parse_cards(raw or "")
            cards = mc.validate_cards(proposed, practice, duration, brand.get("banned") or [])
            ai_used["cards"] = bool(proposed)
        except Exception as exc:
            logger.warning(f"[MASTERCLASS-AGENT] schede AI non disponibili: {exc}")

    logo = None
    if brand.get("logo_url"):
        from services.ciak_lesson_standard import load_logo
        logo = await loop.run_in_executor(None, load_logo, brand["logo_url"])

    work = Path(tmp_dir) / "mc"
    try:
        report = await loop.run_in_executor(None, lambda: mc.render_masterclass(
            source=source, output=output, tmp_dir=work, plan=plan, cards=cards["accepted"],
            brand=brand, logo_image=logo, height=height, with_sigla=True, practice=practice,
            preset=preset, crf=crf))
    finally:
        shutil.rmtree(work, ignore_errors=True)    # /tmp è in memoria sul worker: niente pezzi intermedi
    report.update({
        "ai_used": ai_used,
        "ai_cuts_rejected": len(ai_cuts["rejected"]),
        "cards_rejected": len(cards["rejected"]),
        "silence_threshold_db": threshold,
        "logo_loaded": logo is not None,
        "needs_partner_rerecord": ["gancio 0-12 s", "esempio", "invito finale (CTA)"],
    })
    return report
