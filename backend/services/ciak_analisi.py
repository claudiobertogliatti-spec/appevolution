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


_PROMPT_FALLBACK = {
    "research": _PROMPT_RESEARCH,
    "definitiva": _PROMPT_DEFINITIVA,
    "bozza": _PROMPT_BOZZA,
    "script_call": _PROMPT_SCRIPT_CALL,
}


async def _resolve_prompt(key: str) -> str:
    """Prompt attivo dallo store admin; fallback hardcoded se assente/non disponibile."""
    try:
        from services import ciak_analisi_prompt_store
        content = await ciak_analisi_prompt_store.get_active_content(key)
        if content:
            return content
    except Exception as e:
        logger.warning("[CIAK_ANALISI] prompt store ko per %s, fallback hardcoded: %s", key, e)
    return _PROMPT_FALLBACK[key]


def _get_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise CiakAnalisiError("ANTHROPIC_API_KEY non configurata")
    return anthropic.Anthropic(api_key=api_key)


_WEB_SEARCH_TOOL = {"type": "web_search_20250305", "name": "web_search", "max_uses": 5}


def _call_claude_structured(system_prompt: str, user_message: str, schema: dict, tool_name: str, max_tokens: int = None) -> dict:
    """Output strutturato garantito via Anthropic tool use. Ritorna il dict (block.input)."""
    client = _get_client()
    tool = {"name": tool_name, "description": "Restituisci il risultato strutturato secondo lo schema.", "input_schema": schema}
    try:
        response = client.messages.create(
            model=_MODEL,
            max_tokens=max_tokens or _MAX_TOKENS,
            system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_message}],
            tools=[tool],
            tool_choice={"type": "tool", "name": tool_name},
        )
    except anthropic.APIError as e:
        raise CiakAnalisiError(f"Anthropic API error: {e}") from e
    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and getattr(block, "name", None) == tool_name:
            return block.input
    raise CiakAnalisiError(f"Nessun output strutturato (tool_use) per {tool_name}")


def _web_search_text(system_prompt: str, user_message: str, max_tokens: int = None) -> str:
    """Chiamata con web search → concatena TUTTO il testo dei blocchi (ricerca grezza)."""
    client = _get_client()
    try:
        response = client.messages.create(
            model=_MODEL,
            max_tokens=max_tokens or _MAX_TOKENS,
            system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_message}],
            tools=[_WEB_SEARCH_TOOL],
        )
    except anthropic.APIError as e:
        raise CiakAnalisiError(f"Anthropic API error (web search): {e}") from e
    texts = [b.text for b in response.content if getattr(b, "type", None) == "text" and getattr(b, "text", None)]
    if not texts:
        raise CiakAnalisiError("Nessun testo dalla ricerca web")
    return "\n".join(texts).strip()


# ── JSON schemas per structured output ──────────────────────────────
_CAP_KEYS = ["punto_di_partenza", "dove_sei_adesso", "il_tuo_mercato", "la_tua_accademia", "la_roadmap", "prossimo_passo"]

_SCHEMA_RESEARCH = {
    "type": "object",
    "properties": {
        "settore": {"type": "string"},
        "dimensione_trend": {"type": "string"},
        "competitor": {"type": "array", "items": {"type": "object", "properties": {
            "nome": {"type": "string"}, "posizionamento": {"type": "string"}, "prezzo_stimato": {"type": "string"}}}},
        "fascia_prezzo_mercato": {"type": "string"},
        "spazi_non_presidiati": {"type": "array", "items": {"type": "string"}},
        "fonti": {"type": "array", "items": {"type": "string"}},
        "note_data_gap": {"type": "string"},
    },
    "required": ["settore", "dimensione_trend", "fascia_prezzo_mercato"],
}

_SCHEMA_DEFINITIVA = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string"},
        "capitoli": {"type": "object", "properties": {k: {"type": "string"} for k in _CAP_KEYS}, "required": _CAP_KEYS},
        "accademia": {"type": "object", "properties": {
            "nome_percorso": {"type": "string"}, "promessa": {"type": "string"},
            "moduli": {"type": "array", "items": {"type": "object", "properties": {
                "nome": {"type": "string"}, "descrizione": {"type": "string"}}}},
            "pricing_suggerito": {"type": "string"}}},
        "roadmap": {"type": "array", "items": {"type": "object", "properties": {
            "fase": {"type": "string"}, "durata": {"type": "string"}, "attivita": {"type": "string"}}}},
    },
    "required": ["titolo", "capitoli", "accademia", "roadmap"],
}

_SCHEMA_BOZZA = {
    "type": "object",
    "properties": {
        "intro": {"type": "string"},
        "bullet_per_capitolo": {"type": "object", "properties": {k: {"type": "array", "items": {"type": "string"}} for k in _CAP_KEYS}},
        "chiusura": {"type": "string"},
    },
    "required": ["intro", "bullet_per_capitolo", "chiusura"],
}

_SCHEMA_SCRIPT = {
    "type": "object",
    "properties": {
        "agganci": {"type": "array", "items": {"type": "string"}},
        "momenti_illuminanti": {"type": "array", "items": {"type": "string"}},
        "obiezioni": {"type": "array", "items": {"type": "object", "properties": {
            "obiezione": {"type": "string"}, "risposta": {"type": "string"}}}},
        "ponte_partnership": {"type": "string"},
        "domande_chiusura": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["agganci", "momenti_illuminanti", "ponte_partnership"],
}


_CAPITOLI_ATTESI = {"punto_di_partenza", "dove_sei_adesso", "il_tuo_mercato", "la_tua_accademia", "la_roadmap", "prossimo_passo"}


async def genera_research_brief(responses: dict) -> dict:
    """Step 1: ricerca web (testo grezzo) → strutturazione tool use."""
    prompt = await _resolve_prompt("research")
    search_user = (
        "Cerca sul web dati reali per questo professionista e riporta cosa trovi.\n"
        f"Competenza: {responses.get('q1_competenza')}\n"
        f"Problema che risolve: {responses.get('q6_problema')}\n"
        f"Target: {responses.get('q5_target')}"
    )
    raw = _web_search_text(prompt, search_user)
    struct_user = (
        "Struttura nel formato richiesto questi risultati di ricerca di mercato.\n\n" + raw
    )
    return _call_claude_structured(prompt, struct_user, _SCHEMA_RESEARCH, "research_brief")


async def genera_analisi_definitiva(responses: dict, research_brief: dict) -> dict:
    """Step 2: 6 capitoli arco narrativo, integra il research brief."""
    prompt = await _resolve_prompt("definitiva")
    user_message = (
        "Genera l'analisi definitiva.\n\n8 RISPOSTE:\n"
        f"{json.dumps(responses, ensure_ascii=False, indent=2)}\n\n"
        f"RESEARCH BRIEF:\n{json.dumps(research_brief, ensure_ascii=False, indent=2)}"
    )
    data = _call_claude_structured(prompt, user_message, _SCHEMA_DEFINITIVA, "analisi_definitiva", max_tokens=8000)
    if "capitoli" not in data or set(data["capitoli"].keys()) != _CAPITOLI_ATTESI:
        raise CiakAnalisiError(f"Capitoli mancanti/errati: {list(data.get('capitoli', {}).keys())}")
    return data


async def genera_bozza(analisi_definitiva: dict) -> dict:
    """Step 3: teaser bullet derivato dalla definitiva (coerenza garantita)."""
    prompt = await _resolve_prompt("bozza")
    user_message = (
        "Genera la bozza teaser da questa analisi definitiva.\n\n"
        f"{json.dumps(analisi_definitiva, ensure_ascii=False, indent=2)}"
    )
    return _call_claude_structured(prompt, user_message, _SCHEMA_BOZZA, "bozza_teaser")


async def genera_script_call(responses: dict, analisi_definitiva: dict, stato: int) -> dict:
    """Step 4: canovaccio vendita per Claudio."""
    prompt = await _resolve_prompt("script_call")
    user_message = (
        f"Stato cliente: {stato}\n\n8 RISPOSTE:\n{json.dumps(responses, ensure_ascii=False)}\n\n"
        f"ANALISI:\n{json.dumps(analisi_definitiva, ensure_ascii=False)}"
    )
    return _call_claude_structured(prompt, user_message, _SCHEMA_SCRIPT, "script_call")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def genera_e_salva(session_token: str, force: bool = False) -> dict:
    """
    Orchestratore: carica la diagnostic_session, esegue la pipeline a 4 step,
    salva in ciak_analisi. Idempotente (non rigenera se esiste, salvo force=True).
    Degrada se la ricerca web fallisce (analisi senza dati web).
    """
    if db is None:
        raise CiakAnalisiError("Database non configurato")

    existing = await db.ciak_analisi.find_one({"session_token": session_token})
    if existing and not force:
        return {"already_exists": True, "stato": existing.get("stato")}

    session = await db.diagnostic_sessions.find_one({"session_token": session_token})
    if not session:
        raise CiakAnalisiError(f"diagnostic_session non trovata: {session_token}")

    responses = session.get("responses", {})
    stato = (session.get("scoring") or {}).get("stato_finale", 2)

    # Step 1 — research brief (degrada se fallisce)
    try:
        research = await genera_research_brief(responses)
    except CiakAnalisiError as e:
        logger.warning("[CIAK_ANALISI] research fallita, degrado: %s", e)
        research = {"note_data_gap": "ricerca web non disponibile", "competitor": [], "settore": responses.get("q1_competenza", "")}

    # Step 2-4
    definitiva = await genera_analisi_definitiva(responses, research)
    bozza = await genera_bozza(definitiva)
    script = await genera_script_call(responses, definitiva, stato)

    doc = {
        "session_token": session_token,
        "email": session.get("user_email"),
        "stato": "da_validare",
        "research_data": research,
        "analisi_definitiva": definitiva,
        "bozza": bozza,
        "script_call": script,
        "stato_cliente": stato,
        "generated_at": _now_iso(),
        "errori": [],
    }
    await db.ciak_analisi.replace_one({"session_token": session_token}, doc, upsert=True)
    return {"already_exists": False, "stato": "da_validare", "session_token": session_token}
