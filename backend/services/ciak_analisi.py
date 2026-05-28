"""
Ciak — Servizio Analisi + Roadmap.

Genera 3 artefatti dalle 8 Domande Ciak (diagnostic_session):
  1. analisi definitiva (6 capitoli, web) — stato da_validare
  2. bozza (bullet teaser, per PDF) — derivata dalla definitiva
  3. script di call (interno, conversione partner €2.790)

Motore: Anthropic API + web search tool (web_search_20250305).
Riferimento spec: docs/superpowers/specs/2026-05-28-ciak-analisi-roadmap-design.md
"""
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("CIAK_ANALISI_MODEL", "claude-sonnet-4-6")
_MAX_TOKENS = int(os.environ.get("CIAK_ANALISI_MAX_TOKENS", "4096"))

db = None


def set_db(database) -> None:
    global db
    db = database


class CiakAnalisiError(Exception):
    """Errore generico generazione analisi (API down, JSON malformato, output invalido)."""


# Vincoli stile condivisi da tutti i prompt (anti-fuffa)
_VINCOLI_STILE = """VINCOLI DI STILE NON NEGOZIABILI:
- Italiano professionale-consulenziale. Frasi asciutte, max 25 parole.
- VERITÀ BRUTALE: se il modello è debole o il target generico, dillo. Niente adulazione.
- NO dati inventati: usa solo numeri/competitor dalla ricerca web reale fornita. Se un dato manca, dichiaralo ("non ho elementi sufficienti per...").
- NO coach-speak: ROI→il guadagno che porti | funnel→percorso | target→chi vuoi raggiungere | nicchia→ambito specifico | scalare→che funziona anche senza di te. Vietati: "potente", "incredibile", "trasforma la tua vita", "rivoluziona", "10x".
- Personalizza: cita la competenza e il problema specifici del cliente."""

_PROMPT_RESEARCH = """Sei un analista di mercato. Devi produrre un RESEARCH BRIEF per un professionista che vuole creare un'accademia digitale nel suo settore.

Usa il web search per trovare DATI REALI su:
1. Dimensione e trend del settore/ambito del professionista
2. Competitor reali (chi vende già formazione/percorsi simili) — nomi concreti
3. Fascia prezzo dei percorsi/corsi simili sul mercato
4. Spazi di posizionamento non presidiati

""" + _VINCOLI_STILE + """

OUTPUT: SOLO JSON valido con questa struttura:
{
  "settore": "string",
  "dimensione_trend": "string (2-3 frasi, con dati reali se trovati)",
  "competitor": [{"nome": "string", "posizionamento": "string", "prezzo_stimato": "string"}],
  "fascia_prezzo_mercato": "string (es. €497-€1500)",
  "spazi_non_presidiati": ["string", "string"],
  "fonti": ["url", "url"],
  "note_data_gap": "string (cosa non è stato possibile trovare)"
}"""

_PROMPT_DEFINITIVA = """Sei il Senior Strategic Advisor di Evolution PRO. Genera l'ANALISI STRATEGICA DEFINITIVA per un professionista, basata sulle sue 8 risposte e sul research brief di mercato.

L'analisi segue un ARCO NARRATIVO in 6 capitoli che culmina nel desiderio della partnership:
1. "Il tuo punto di partenza" — sintesi del profilo dalle 8 domande (60-100 parole)
2. "Dove sei adesso" — stato reale + limite strutturale del modello attuale (tempo=denaro) + costo di restare fermo (120-180 parole)
3. "Il tuo mercato" — settore, domanda, competitor REALI e prezzi REALI dal research brief, spazio non presidiato (150-220 parole)
4. "La tua Accademia Digitale" — visione concreta: nome percorso possibile, promessa di trasformazione, 4 moduli, pricing realistico tarato sul mercato trovato (180-250 parole)
5. "La roadmap" — fasi/tempi/priorità concrete per costruire l'accademia (5 fasi con durata)
6. "Il prossimo passo" — la partnership Evolution PRO come veicolo che realizza la roadmap (80-120 parole)

""" + _VINCOLI_STILE + """

OUTPUT: SOLO JSON valido:
{
  "titolo": "Analisi Strategica — <nome>",
  "capitoli": {
    "punto_di_partenza": "markdown",
    "dove_sei_adesso": "markdown",
    "il_tuo_mercato": "markdown",
    "la_tua_accademia": "markdown",
    "la_roadmap": "markdown",
    "prossimo_passo": "markdown"
  },
  "accademia": {"nome_percorso": "string", "promessa": "string", "moduli": [{"nome":"string","descrizione":"string"}], "pricing_suggerito": "string"},
  "roadmap": [{"fase": "string", "durata": "string", "attivita": "string"}]
}"""

_PROMPT_BOZZA = """Sei il Senior Strategic Advisor di Evolution PRO. Dato il JSON dell'analisi definitiva, produci una BOZZA TEASER in bullet points: 1-2 bullet per ciascuno dei 6 capitoli. Deve dimostrare valore e creare attesa SENZA svelare la profondità (mercato dettagliato, accademia completa, roadmap restano per la definitiva).

""" + _VINCOLI_STILE + """

OUTPUT: SOLO JSON valido:
{
  "intro": "1 frase di apertura personalizzata",
  "bullet_per_capitolo": {
    "punto_di_partenza": ["bullet"],
    "dove_sei_adesso": ["bullet"],
    "il_tuo_mercato": ["bullet"],
    "la_tua_accademia": ["bullet"],
    "la_roadmap": ["bullet"],
    "prossimo_passo": ["bullet"]
  },
  "chiusura": "1 frase che rimanda alla call"
}"""

_PROMPT_SCRIPT_CALL = """Sei un sales coach. Genera lo SCRIPT DI CALL interno per Claudio (fondatore Evolution PRO), che userà durante la call per convertire un cliente €67 in partner €2.790. Basati sull'analisi definitiva e sullo stato del cliente.

""" + _VINCOLI_STILE + """

OUTPUT: SOLO JSON valido:
{
  "agganci": ["punti specifici del cliente da richiamare in apertura"],
  "momenti_illuminanti": ["i 3 momenti chiave da far emergere in call"],
  "obiezioni": [{"obiezione": "string", "risposta": "string"}],
  "ponte_partnership": "come presentare la partnership €2.790 partendo dalla roadmap",
  "domande_chiusura": ["domanda di chiusura"]
}"""


def _get_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise CiakAnalisiError("ANTHROPIC_API_KEY non configurata")
    return anthropic.Anthropic(api_key=api_key)


def _last_text_block(content) -> str:
    """Con web search la response ha blocchi misti (tool_use, tool_result, text).
    La risposta finale del modello è l'ULTIMO blocco di tipo 'text'."""
    texts = [b.text for b in content if getattr(b, "type", None) == "text" and getattr(b, "text", None)]
    if not texts:
        raise CiakAnalisiError("Nessun blocco text nella risposta Anthropic")
    return texts[-1].strip()


def _extract_json(text: str) -> str:
    """Estrai JSON da output (gestisce code fence e testo attorno)."""
    if "```json" in text:
        start = text.find("```json") + len("```json")
        end = text.find("```", start)
        if end != -1:
            return text[start:end].strip()
    if "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        if end != -1:
            return text[start:end].strip()
    start = text.find("{")
    if start == -1:
        return text
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    return text[start:]


_WEB_SEARCH_TOOL = {"type": "web_search_20250305", "name": "web_search", "max_uses": 5}


def _call_claude(system_prompt: str, user_message: str, use_web_search: bool = False, max_tokens: int = None) -> dict:
    """Chiamata sincrona ad Anthropic. Ritorna dict JSON parsato dall'output."""
    client = _get_client()
    kwargs = {
        "model": _MODEL,
        "max_tokens": max_tokens or _MAX_TOKENS,
        "system": [{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
        "messages": [{"role": "user", "content": user_message}],
    }
    if use_web_search:
        kwargs["tools"] = [_WEB_SEARCH_TOOL]
    try:
        response = client.messages.create(**kwargs)
    except anthropic.APIError as e:
        raise CiakAnalisiError(f"Anthropic API error: {e}") from e
    raw = _last_text_block(response.content)
    try:
        return json.loads(_extract_json(raw))
    except json.JSONDecodeError as e:
        logger.error("[CIAK_ANALISI] JSON malformato: %s\nRaw: %s", e, raw[:500])
        raise CiakAnalisiError(f"JSON malformato dall'output: {e}") from e


async def genera_research_brief(responses: dict) -> dict:
    """Step 1: ricerca web sul settore del cliente."""
    user_message = (
        "Produci il research brief per questo professionista.\n"
        f"Competenza: {responses.get('q1_competenza')}\n"
        f"Problema che risolve: {responses.get('q6_problema')}\n"
        f"Target: {responses.get('q5_target')}"
    )
    return _call_claude(_PROMPT_RESEARCH, user_message, use_web_search=True)


_CAPITOLI_ATTESI = {"punto_di_partenza", "dove_sei_adesso", "il_tuo_mercato", "la_tua_accademia", "la_roadmap", "prossimo_passo"}


async def genera_analisi_definitiva(responses: dict, research_brief: dict) -> dict:
    """Step 2: 6 capitoli arco narrativo, integra il research brief."""
    user_message = (
        "Genera l'analisi definitiva.\n\n8 RISPOSTE:\n"
        f"{json.dumps(responses, ensure_ascii=False, indent=2)}\n\n"
        f"RESEARCH BRIEF:\n{json.dumps(research_brief, ensure_ascii=False, indent=2)}"
    )
    data = _call_claude(_PROMPT_DEFINITIVA, user_message, max_tokens=6000)
    if "capitoli" not in data or set(data["capitoli"].keys()) != _CAPITOLI_ATTESI:
        raise CiakAnalisiError(f"Capitoli mancanti/errati: {list(data.get('capitoli', {}).keys())}")
    return data


async def genera_e_salva(session_token: str) -> dict:
    raise NotImplementedError  # implementato in Task 6
