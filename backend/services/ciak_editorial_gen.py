"""Generazione AI del piano editoriale mensile (caroselli/post/reel) per un brand.

Riusa il pattern Anthropic tool-use (come services/editorial_calendar.py, agente
Andrea) con fallback deterministico: la generazione non blocca mai.
Produce contenuti divisi per OBIETTIVO, ognuno con caption + slide, pronti per
l'approvazione mensile e la pubblicazione su IG/FB/LinkedIn. Multi-brand.
"""
from __future__ import annotations

import asyncio
import calendar
import logging
import os
from datetime import date
from typing import Any, Optional

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("EDITORIAL_CALENDAR_MODEL", "claude-sonnet-4-6")

DEFAULT_OBJECTIVES = ["Autorità", "Prova sociale", "Conversione — analisi gratuita"]
FORMATI = ["carosello", "post", "reel"]

_SYSTEM = (
    "Sei Andrea, il produttore di contenuti. Costruisci il PIANO EDITORIALE SOCIAL di "
    "UN MESE per il brand indicato, diviso per OBIETTIVI.\n"
    "Per ogni contenuto restituisci: objective, format (carosello|post|reel), channels "
    "(ig, fb, linkedin), topic (l'hook breve), caption (pronta da pubblicare), cta, e per i "
    "caroselli slides (4-8 slide, ognuna {title, body} con testo grande e breve).\n"
    "REGOLE (brand voice, non negoziabili): italiano semplice e diretto, zero fuffa; niente "
    "superlativi assoluti; NIENTE dati/percentuali/testimonianze inventati; caption reale e "
    "pubblicabile; i caroselli hanno 4-8 slide; distribuisci i contenuti sugli obiettivi dati."
)

_SCHEMA = {
    "type": "object",
    "properties": {
        "contents": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "objective": {"type": "string"},
                    "format": {"type": "string", "enum": FORMATI},
                    "channels": {"type": "array", "items": {"type": "string", "enum": ["ig", "fb", "linkedin"]}},
                    "topic": {"type": "string"},
                    "caption": {"type": "string"},
                    "cta": {"type": "string"},
                    "slides": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {"title": {"type": "string"}, "body": {"type": "string"}},
                            "required": ["title"],
                        },
                    },
                },
                "required": ["objective", "format", "topic", "caption"],
            },
        }
    },
    "required": ["contents"],
}


def _brand_context(brand: dict) -> str:
    parts = [f"Brand: {brand.get('name', '')}"]
    if brand.get("description"):
        parts.append(f"Descrizione: {brand['description']}")
    if brand.get("tagline"):
        parts.append(f"Tagline: {brand['tagline']}")
    if brand.get("style_notes"):
        parts.append(f"Note di stile: {brand['style_notes']}")
    kf = brand.get("knowledge_files") or []
    if kf:
        parts.append("Knowledge base: " + ", ".join(f.get("name", "") for f in kf))
    return "\n".join(parts)


def _call_claude(brand: dict, objectives: list[str], n: int) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    from .agent_deliverable import system_blocks

    user = (
        f"{_brand_context(brand)}\n\nLingua: {brand.get('language', 'it')}.\n"
        f"OBIETTIVI del mese: {', '.join(objectives)}.\n"
        f"Genera {n} contenuti totali, distribuiti sugli obiettivi, pronti da pubblicare."
    )
    client = anthropic.Anthropic(api_key=api_key)
    tool = {"name": "month_plan", "description": "Piano editoriale mensile strutturato.", "input_schema": _SCHEMA}
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=6000,
        system=system_blocks("ANDREA", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "month_plan"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _deterministic(objectives: list[str], n: int) -> dict:
    """Scheletro senza AI: bozze vuote per obiettivo, da compilare a mano."""
    contents = []
    i = 0
    while len(contents) < n:
        obj = objectives[i % len(objectives)]
        contents.append({
            "objective": obj,
            "format": "carosello",
            "channels": ["ig", "fb"],
            "topic": f"{obj} — bozza da compilare",
            "caption": "",
            "cta": "",
            "slides": [],
        })
        i += 1
    return {"contents": contents}


def _mwf_dates(year: int, month: int) -> list[date]:
    """Date lun/mer/ven del mese (coerenti col publisher che spedisce lun/mer/ven)."""
    days = calendar.monthrange(year, month)[1]
    return [
        date(year, month, d)
        for d in range(1, days + 1)
        if date(year, month, d).weekday() in (0, 2, 4)
    ]


async def generate_month(
    brand: dict,
    year: int,
    month: int,
    objectives: Optional[list[str]] = None,
    n: int = 8,
) -> list[dict]:
    """Genera i contenuti del mese (AI con fallback deterministico) e assegna le date MWF.
    Ritorna content dict PARZIALI (senza id/persistenza — li salva il chiamante)."""
    objectives = objectives or DEFAULT_OBJECTIVES
    try:
        out: Any = await asyncio.to_thread(_call_claude, brand, objectives, n)
        contents = out.get("contents") if isinstance(out, dict) else None
        if not isinstance(contents, list) or not contents:
            raise RuntimeError("output vuoto")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[EDITORIALE] generazione AI fallita ({e}) — scheletro deterministico")
        contents = _deterministic(objectives, n)["contents"]

    dates = _mwf_dates(year, month)
    result = []
    for idx, c in enumerate(contents):
        if not isinstance(c, dict):
            continue
        sched = dates[idx % len(dates)].isoformat() if dates else None
        result.append({
            "objective": (c.get("objective") or objectives[0]),
            "format": (c.get("format") or "carosello"),
            "channels": c.get("channels") or ["ig"],
            "topic": (c.get("topic") or "").strip(),
            "caption": (c.get("caption") or "").strip(),
            "cta": (c.get("cta") or "").strip(),
            "slides": c.get("slides") or [],
            "scheduled_date": sched,
        })
    return result
