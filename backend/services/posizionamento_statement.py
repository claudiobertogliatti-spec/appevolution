"""Sintesi del Brand Positioning Statement (metodo De Veglia) dalle risposte del wizard.

Formula a 5 slot:
  <nome> è <categoria/mercato> che <idea differenziante>.
  A differenza dei concorrenti che <cosa fanno>, noi <cosa facciamo di diverso>,
  e questo per il cliente significa <vantaggi>.

Sintesi AI (Anthropic tool-use) con fallback deterministico: il PDF non si rompe mai.
Filtrato dalla brand voice Ciak: niente superlativi, frasi brevi, italiano semplice.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("POSIZIONAMENTO_STATEMENT_MODEL", "claude-sonnet-4-6")

SLOT_LABELS = {
    "brand": "Brand / nome",
    "categoria": "Categoria",
    "idea_differenziante": "Idea differenziante",
    "a_differenza_di": "A differenza di",
    "vantaggio_cliente": "Vantaggio cliente",
}

_SYSTEM = (
    "Sei uno stratega di posizionamento. Sintetizzi il Brand Positioning Statement "
    "di un partner secondo il metodo De Veglia, partendo dalle sue risposte.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- Frasi brevi, massimo 25 parole per frase.\n"
    "- Usa 'percorso' invece di 'funnel', 'ambito specifico' invece di 'nicchia'.\n"
    "- L'idea differenziante deve essere una specializzazione concreta, non una qualità generica.\n"
    "Compila i 5 slot in modo che la frase finale sia: "
    "'<brand> è <categoria> che <idea_differenziante>. A differenza dei concorrenti che "
    "<a_differenza_di>, noi <idea_differenziante riformulata in azione>, e questo per il "
    "cliente significa <vantaggio_cliente>.' "
    "Ogni slot è una frase corta, senza ripetere le etichette."
)

_SCHEMA = {
    "type": "object",
    "properties": {
        "brand": {"type": "string", "description": "Nome del brand/metodo del partner."},
        "categoria": {"type": "string", "description": "Categoria/mercato in cui gioca (a chi parla)."},
        "idea_differenziante": {"type": "string", "description": "La specializzazione che lo rende lo specialista."},
        "a_differenza_di": {"type": "string", "description": "Cosa fanno i concorrenti / promessa affollata del settore."},
        "vantaggio_cliente": {"type": "string", "description": "Cosa cambia concretamente per il cliente."},
        "frase": {"type": "string", "description": "La frase a 5 slot assemblata, pronta da stampare."},
    },
    "required": ["brand", "categoria", "idea_differenziante", "a_differenza_di", "vantaggio_cliente", "frase"],
}


def _t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _clip(s: str, n: int) -> str:
    s = " ".join(s.split())
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


def _deterministic(answers: dict) -> dict:
    """Fallback senza AI: assembla gli slot dalle risposte grezze. Non si rompe mai."""
    brand = _t(answers, "metodo_nome", "Il tuo metodo")
    categoria = _clip(_t(answers, "nicchia", "il tuo mercato"), 90)
    idea = _clip(_t(answers, "spazio_specialista") or _t(answers, "differenza_riconoscibile", "ha una specializzazione precisa"), 110)
    altri = _clip(_t(answers, "mercato_affollato") or _t(answers, "concorrenti_principali", "promettono tutti la stessa cosa"), 110)
    vantaggio = _clip(_t(answers, "trasformazione_90gg", "un risultato concreto e misurabile"), 110)

    frase = (
        f"{brand} è {categoria} che {idea}. "
        f"A differenza dei concorrenti che {altri}, noi {idea}, "
        f"e questo per il cliente significa {vantaggio}."
    )
    return {
        "brand": brand,
        "categoria": categoria,
        "idea_differenziante": idea,
        "a_differenza_di": altri,
        "vantaggio_cliente": vantaggio,
        "frase": frase,
    }


def _call_claude(answers: dict) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva eccezione in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    keys = [
        "metodo_nome", "nicchia", "spazio_specialista", "differenza_riconoscibile",
        "concorrenti_principali", "mercato_affollato", "trasformazione_90gg",
        "contrarian_view", "promessa",
    ]
    payload = "\n".join(f"- {k}: {(answers.get(k) or '').strip()}" for k in keys if (answers.get(k) or "").strip())
    user = f"Risposte del partner:\n{payload}\n\nCompila i 5 slot e la frase finale."

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "brand_positioning_statement",
        "description": "Restituisci il Brand Positioning Statement strutturato.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=700,
        system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "brand_positioning_statement"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    return all((out.get(k) or "").strip() for k in _SCHEMA["required"])


async def build_brand_positioning_statement(answers: dict) -> dict:
    """Ritorna {brand, categoria, idea_differenziante, a_differenza_di, vantaggio_cliente, frase}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade
    sul fallback deterministico. Non solleva mai: il PDF deve sempre potersi generare.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers)
        if _valid(out):
            return {k: " ".join(str(out.get(k, "")).split()) for k in
                    ["brand", "categoria", "idea_differenziante", "a_differenza_di", "vantaggio_cliente", "frase"]}
        logger.warning("[POSIZIONAMENTO] Statement AI incompleto — uso fallback deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[POSIZIONAMENTO] Statement AI fallito ({e}) — uso fallback deterministico")
    return _deterministic(answers)
