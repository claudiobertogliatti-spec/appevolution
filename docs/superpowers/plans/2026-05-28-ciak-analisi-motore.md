# Ciak Analisi — Motore di Generazione (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire il servizio backend che, data una `diagnostic_session` (8 Domande Ciak), genera i 3 artefatti — analisi definitiva (6 capitoli), bozza (bullet teaser), script di call — usando Anthropic + web search, e li persiste nella collection `ciak_analisi`.

**Architecture:** Nuovo servizio `backend/services/ciak_analisi.py`, gemello di `ciak_matteo.py`: stesso client Anthropic (`ANTHROPIC_API_KEY` già in prod), gestione errori `CiakAnalisiError`. Pipeline a 4 step (research brief con web search → definitiva → bozza derivata → script call). Un orchestratore `genera_e_salva(session_token)` scrive su MongoDB `ciak_analisi`. Endpoint admin di test per generare on-demand e validare isolatamente prima dell'integrazione col funnel (Plan B).

**Tech Stack:** Python 3, FastAPI, motor (async MongoDB), anthropic SDK (web search tool `web_search_20250305`), pytest + pytest-asyncio.

**Scope (Plan A):** solo generazione + persistenza + endpoint test. FUORI scope (Plan B): webhook €67, PDF, email, pagina `/analisi/:token`, admin UI di validazione, prompt-store versionato.

---

## File Structure

- **Create** `backend/services/ciak_analisi.py` — servizio generazione (4 funzioni + orchestratore + system prompts costanti)
- **Create** `backend/routers/ciak_analisi_admin.py` — endpoint admin test: `POST /api/admin/ciak/analisi/genera/{session_token}`, `GET /api/admin/ciak/analisi/{session_token}`
- **Modify** `backend/server.py` — registra il nuovo router (pattern `set_db` + `include_router`)
- **Create** `backend/tests/test_ciak_analisi.py` — test unitari (parsing, struttura output, error handling) con client Anthropic mockato
- **Storage** collection MongoDB `ciak_analisi` (creata implicitamente al primo insert)

Riferimenti da seguire: `backend/services/ciak_matteo.py` (pattern client/errori/parsing), `backend/routers/diagnostic.py` (pattern router + set_db + lettura `diagnostic_sessions`).

---

## Task 1: Scaffold servizio + modello output + costanti prompt

**Files:**
- Create: `backend/services/ciak_analisi.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_analisi.py
import pytest
from services import ciak_analisi


def test_module_exposes_api():
    assert hasattr(ciak_analisi, "CiakAnalisiError")
    assert hasattr(ciak_analisi, "genera_e_salva")
    assert hasattr(ciak_analisi, "set_db")
    # System prompts non vuoti
    assert len(ciak_analisi._PROMPT_RESEARCH) > 200
    assert len(ciak_analisi._PROMPT_DEFINITIVA) > 200
    assert len(ciak_analisi._PROMPT_BOZZA) > 100
    assert len(ciak_analisi._PROMPT_SCRIPT_CALL) > 100
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_module_exposes_api -v`
Expected: FAIL con `ModuleNotFoundError` o `AttributeError`.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/ciak_analisi.py
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


async def genera_e_salva(session_token: str) -> dict:
    raise NotImplementedError  # implementato in Task 6
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_module_exposes_api -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_analisi.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): scaffold servizio ciak_analisi + system prompts"
```

---

## Task 2: Helper estrazione testo + JSON da risposta Anthropic (con web search multi-block)

**Files:**
- Modify: `backend/services/ciak_analisi.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
def test_extract_text_from_blocks():
    from services.ciak_analisi import _last_text_block, _extract_json

    class Block:
        def __init__(self, type_, text=None):
            self.type = type_
            self.text = text

    # web search produce blocchi misti: l'ultimo text è la risposta
    blocks = [Block("text", "sto cercando"), Block("server_tool_use"), Block("web_search_tool_result"), Block("text", '{"a": 1}')]
    assert _last_text_block(blocks) == '{"a": 1}'

    # JSON dentro code fence
    assert _extract_json('ecco:\n```json\n{"x": 2}\n```') == '{"x": 2}'
    # JSON nudo
    assert _extract_json('prefix {"y": 3} suffix') == '{"y": 3}'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_extract_text_from_blocks -v`
Expected: FAIL con `ImportError` (`_last_text_block` non esiste).

- [ ] **Step 3: Write minimal implementation**

Aggiungi a `backend/services/ciak_analisi.py`:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_extract_text_from_blocks -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_analisi.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): helper estrazione text/JSON da response Anthropic"
```

---

## Task 3: `genera_research_brief` (web search)

**Files:**
- Modify: `backend/services/ciak_analisi.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_genera_research_brief_parsa_json(monkeypatch):
    from services import ciak_analisi

    class FakeBlock:
        type = "text"
        text = '{"settore":"shiatsu","competitor":[],"fascia_prezzo_mercato":"€500-€1200","spazi_non_presidiati":[],"fonti":[],"dimensione_trend":"x","note_data_gap":""}'

    class FakeResp:
        content = [FakeBlock()]

    class FakeClient:
        def __init__(self): self.messages = self
        def create(self, **kw):
            # verifica che il web search tool sia passato
            assert any(t.get("type") == "web_search_20250305" for t in kw.get("tools", []))
            return FakeResp()

    monkeypatch.setattr(ciak_analisi, "_get_client", lambda: FakeClient())
    brief = await ciak_analisi.genera_research_brief({"q1_competenza": "shiatsu", "q6_problema": "dolore cronico", "q5_target": "No"})
    assert brief["settore"] == "shiatsu"
    assert brief["fascia_prezzo_mercato"] == "€500-€1200"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_genera_research_brief_parsa_json -v`
Expected: FAIL (`genera_research_brief` non esiste).

- [ ] **Step 3: Write minimal implementation**

Aggiungi a `backend/services/ciak_analisi.py`:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_genera_research_brief_parsa_json -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_analisi.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): genera_research_brief con web search tool"
```

---

## Task 4: `genera_analisi_definitiva`

**Files:**
- Modify: `backend/services/ciak_analisi.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_genera_definitiva_struttura(monkeypatch):
    from services import ciak_analisi
    fake = {
        "titolo": "Analisi — Mario",
        "capitoli": {"punto_di_partenza": "a", "dove_sei_adesso": "b", "il_tuo_mercato": "c",
                     "la_tua_accademia": "d", "la_roadmap": "e", "prossimo_passo": "f"},
        "accademia": {"nome_percorso": "X", "promessa": "Y", "moduli": [], "pricing_suggerito": "€997"},
        "roadmap": [{"fase": "F1", "durata": "2sett", "attivita": "z"}],
    }
    monkeypatch.setattr(ciak_analisi, "_call_claude", lambda *a, **k: fake)
    res = await ciak_analisi.genera_analisi_definitiva({"q1_competenza": "shiatsu"}, {"settore": "shiatsu"})
    assert set(res["capitoli"].keys()) == {"punto_di_partenza", "dove_sei_adesso", "il_tuo_mercato", "la_tua_accademia", "la_roadmap", "prossimo_passo"}
    assert res["accademia"]["pricing_suggerito"] == "€997"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_genera_definitiva_struttura -v`
Expected: FAIL (`genera_analisi_definitiva` non esiste).

- [ ] **Step 3: Write minimal implementation**

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_genera_definitiva_struttura -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_analisi.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): genera_analisi_definitiva 6 capitoli"
```

---

## Task 5: `genera_bozza` + `genera_script_call`

**Files:**
- Modify: `backend/services/ciak_analisi.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_bozza_e_script(monkeypatch):
    from services import ciak_analisi
    monkeypatch.setattr(ciak_analisi, "_call_claude", lambda *a, **k: {"ok": True})
    definitiva = {"capitoli": {}, "accademia": {}, "roadmap": []}
    bozza = await ciak_analisi.genera_bozza(definitiva)
    script = await ciak_analisi.genera_script_call({"q1_competenza": "x"}, definitiva, stato=3)
    assert bozza == {"ok": True}
    assert script == {"ok": True}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_bozza_e_script -v`
Expected: FAIL (`genera_bozza` non esiste).

- [ ] **Step 3: Write minimal implementation**

```python
async def genera_bozza(analisi_definitiva: dict) -> dict:
    """Step 3: teaser bullet derivato dalla definitiva (coerenza garantita)."""
    user_message = (
        "Genera la bozza teaser da questa analisi definitiva.\n\n"
        f"{json.dumps(analisi_definitiva, ensure_ascii=False, indent=2)}"
    )
    return _call_claude(_PROMPT_BOZZA, user_message)


async def genera_script_call(responses: dict, analisi_definitiva: dict, stato: int) -> dict:
    """Step 4: canovaccio vendita per Claudio."""
    user_message = (
        f"Stato cliente: {stato}\n\n8 RISPOSTE:\n{json.dumps(responses, ensure_ascii=False)}\n\n"
        f"ANALISI:\n{json.dumps(analisi_definitiva, ensure_ascii=False)}"
    )
    return _call_claude(_PROMPT_SCRIPT_CALL, user_message)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_bozza_e_script -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_analisi.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): genera_bozza + genera_script_call"
```

---

## Task 6: Orchestratore `genera_e_salva` + persistenza `ciak_analisi`

**Files:**
- Modify: `backend/services/ciak_analisi.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_genera_e_salva_idempotente(monkeypatch):
    from services import ciak_analisi

    store = {}

    class FakeColl:
        async def find_one(self, q): return store.get(q["session_token"])
        async def replace_one(self, q, doc, upsert=False): store[q["session_token"]] = doc

    class FakeDB:
        ciak_analisi = FakeColl()
        class diagnostic_sessions:
            @staticmethod
            async def find_one(q):
                return {"session_token": "tok1", "responses": {"q1_competenza": "shiatsu", "q5_target": "No", "q6_problema": "dolore"}, "scoring": {"stato_finale": 3}}
        diagnostic_sessions = diagnostic_sessions()

    ciak_analisi.set_db(FakeDB())
    monkeypatch.setattr(ciak_analisi, "genera_research_brief", lambda r: _async({"settore": "shiatsu"}))
    monkeypatch.setattr(ciak_analisi, "genera_analisi_definitiva", lambda r, b: _async({"capitoli": {}}))
    monkeypatch.setattr(ciak_analisi, "genera_bozza", lambda d: _async({"intro": "x"}))
    monkeypatch.setattr(ciak_analisi, "genera_script_call", lambda r, d, stato: _async({"agganci": []}))

    res1 = await ciak_analisi.genera_e_salva("tok1")
    assert res1["stato"] == "da_validare"
    assert store["tok1"]["analisi_definitiva"] == {"capitoli": {}}
    # idempotenza: seconda chiamata non rigenera
    res2 = await ciak_analisi.genera_e_salva("tok1")
    assert res2["already_exists"] is True


async def _async(v):
    return v
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_genera_e_salva_idempotente -v`
Expected: FAIL (`genera_e_salva` ancora `NotImplementedError`).

- [ ] **Step 3: Write minimal implementation**

Sostituisci lo stub `genera_e_salva` con:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py -v`
Expected: PASS (tutti)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_analisi.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): orchestratore genera_e_salva + persistenza ciak_analisi"
```

---

## Task 7: Router admin di test + registrazione in server.py

**Files:**
- Create: `backend/routers/ciak_analisi_admin.py`
- Modify: `backend/server.py` (registrazione router, accanto a `diagnostic_router` ~riga 16806)
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
def test_router_exists():
    from routers import ciak_analisi_admin
    assert hasattr(ciak_analisi_admin, "router")
    assert hasattr(ciak_analisi_admin, "set_db")
    paths = {r.path for r in ciak_analisi_admin.router.routes}
    assert "/api/admin/ciak/analisi/genera/{session_token}" in paths
    assert "/api/admin/ciak/analisi/{session_token}" in paths
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_router_exists -v`
Expected: FAIL (`ModuleNotFoundError routers.ciak_analisi_admin`).

- [ ] **Step 3: Write minimal implementation**

```python
# backend/routers/ciak_analisi_admin.py
"""
Ciak — Router admin per generazione/lettura analisi (Plan A: test isolato).
La UI di validazione/invio + il trigger webhook arrivano nel Plan B.
"""
import logging
from fastapi import APIRouter, HTTPException

from services import ciak_analisi

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ciak/analisi", tags=["ciak-analisi-admin"])

db = None


def set_db(database) -> None:
    global db
    db = database
    ciak_analisi.set_db(database)


@router.post("/genera/{session_token}")
async def genera(session_token: str, force: bool = False):
    """Genera (o rigenera con force) i 3 artefatti per una diagnostic_session."""
    try:
        return await ciak_analisi.genera_e_salva(session_token, force=force)
    except ciak_analisi.CiakAnalisiError as e:
        raise HTTPException(503, f"Generazione fallita: {e}")


@router.get("/{session_token}")
async def get_analisi(session_token: str):
    """Recupera l'analisi salvata (per admin / debug)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    doc = await db.ciak_analisi.find_one({"session_token": session_token}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Analisi non trovata")
    return doc
```

In `backend/server.py`, dopo il blocco di registrazione di `diagnostic_router` (~riga 16808), aggiungi:

```python
from routers.ciak_analisi_admin import router as ciak_analisi_admin_router, set_db as set_ciak_analisi_admin_db
set_ciak_analisi_admin_db(db)
app.include_router(ciak_analisi_admin_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_router_exists -v`
Expected: PASS

Verifica che server.py importi senza errori:
Run: `cd backend && python -c "import ast; ast.parse(open('server.py').read()); print('server.py syntax OK')"`
Expected: `server.py syntax OK`

- [ ] **Step 5: Commit**

```bash
git add backend/routers/ciak_analisi_admin.py backend/server.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): router admin test analisi + registrazione server"
```

---

## Task 8: Test e2e contro produzione (manuale, documentato)

**Files:** nessuno (verifica post-deploy)

- [ ] **Step 1: Deploy backend**

```bash
cd C:/Users/berto/Desktop/appevolution
gcloud run deploy evolution-pro-backend --source ./backend --region europe-west1 --project gen-lang-client-0744698012 --allow-unauthenticated
```
Expected: `Service [evolution-pro-backend] revision ... deployed`

- [ ] **Step 2: Verifica web search disponibile + generazione e2e**

Crea uno script temporaneo `_test_analisi.py` sul Desktop (poi cancellalo) — usa una `diagnostic_session` reale. Prima crea la sessione via `/api/diagnostic/start` + `/answer` x8 + `/complete` (vedi pattern test Matteo), poi:

```python
import requests
B = "https://app.evolution-pro.it/api"
# ... crea session_token via diagnostic start/answer/complete (riusa pattern test Matteo) ...
r = requests.post(f"{B}/admin/ciak/analisi/genera/{session_token}")
print("GENERA:", r.status_code, r.json())
r = requests.get(f"{B}/admin/ciak/analisi/{session_token}")
d = r.json()
print("stato:", d["stato"])
print("capitoli:", list(d["analisi_definitiva"]["capitoli"].keys()))
print("research competitor:", d["research_data"].get("competitor"))
print("bozza intro:", d["bozza"].get("intro"))
print("script agganci:", d["script_call"].get("agganci"))
```

Expected:
- `GENERA: 200 {"already_exists": false, "stato": "da_validare", ...}`
- stato `da_validare`
- 6 capitoli presenti
- `research_data.competitor` popolato (web search ha funzionato) — se vuoto, controllare log per disponibilità web search tool
- bozza + script popolati

- [ ] **Step 3: Verifica caso degradato (opzionale)**

Se il web search tool NON è disponibile sull'account, la generazione deve comunque produrre l'analisi (degrado): `research_data.note_data_gap == "ricerca web non disponibile"` e i 6 capitoli presenti. Se invece l'intera generazione fallisce, aprire un follow-up sul modello/permessi web search.

- [ ] **Step 4: Cleanup**

```bash
rm C:/Users/berto/Desktop/_test_analisi.py
```
Cancella anche la diagnostic_session e l'analisi di test dal DB (o segnale a Claudio per pulizia admin).

---

## Note per l'esecuzione

- **Web search tool**: la disponibilità dipende da modello/account. Se `web_search_20250305` dà errore "tool not supported", verificare il nome-versione del tool aggiornato nella doc Anthropic e/o i permessi dell'account. La pipeline degrada comunque (Task 6 Step 3).
- **Modello**: default `claude-sonnet-4-6` (come Matteo). Override via env `CIAK_ANALISI_MODEL`.
- **Prompt versionati da admin**: NON in questo plan. I prompt sono costanti nel modulo (come il fallback di Matteo). Il prompt-store editabile arriva nel Plan B insieme alla UI admin.
- **Costo**: 4 chiamate/cliente (1 con web search). Accettabile per deliverable €67.
