# Ciak Cut Engine (Fase 1A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire l'euristica di taglio della pipeline video con un motore AI ("stile Descript") che propone tagli di pulizia (intercalari, ripetizioni, false partenze, pause) di qualità nettamente superiore, mantenendo lo stesso schema `cut_segment` così la UI di revisione esistente funziona senza modifiche.

**Architecture:** Un nuovo modulo `backend/services/ciak_cut_engine.py` con helper PURI (parsing risposta LLM, euristica intercalari, merge/normalizzazione tagli) + un'unica funzione di orchestrazione `propose_cuts()` che chiama l'LLM (iniettabile per i test) e degrada su euristiche se l'LLM fallisce. Poi si integra al checkpoint `da_revisionare` di `video_pipeline_task.py` (dove oggi si costruiscono i `cut_segments`).

**Tech Stack:** Python 3.11, `services/ciak_llm` (AsyncAnthropic, già esistente), pytest (marker `unit`), pattern helper-puri come `services/video_health.py`.

**Riferimenti spec:** `docs/specs/2026-07-11-ciak-editing-studio-design.md` → componente `services/ciak_cut_engine.py` (Stadio 2).

**Schema `cut_segment` (invariato, usato da pipeline + review UI):**
```
{id:int, start:float, end:float, type:"filler"|"smart"|"silence", reason:str, word:str, enabled:True}
```

---

### Task 1: `parse_llm_cuts` — parsing robusto della risposta LLM

**Files:**
- Create: `backend/services/ciak_cut_engine.py`
- Test: `backend/tests/test_ciak_cut_engine.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_cut_engine.py
import os
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_cut_engine as ce

pytestmark = pytest.mark.unit


def test_parse_llm_cuts_plain_array():
    raw = '[{"start": 1.0, "end": 1.4, "reason": "intercalare", "word": "ehm"}]'
    out = ce.parse_llm_cuts(raw)
    assert out == [{"start": 1.0, "end": 1.4, "reason": "intercalare", "word": "ehm", "type": "smart"}]


def test_parse_llm_cuts_with_code_fence_and_prose():
    raw = "Ecco i tagli:\n```json\n[{\"start\": 2, \"end\": 3.5, \"reason\": \"ripetizione\"}]\n```\nfine"
    out = ce.parse_llm_cuts(raw)
    assert len(out) == 1 and out[0]["start"] == 2.0 and out[0]["end"] == 3.5


def test_parse_llm_cuts_drops_invalid_and_garbage():
    assert ce.parse_llm_cuts("nessun json qui") == []
    # end <= start scartato
    assert ce.parse_llm_cuts('[{"start": 5, "end": 5}]') == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py -q`
Expected: FAIL con `ModuleNotFoundError: No module named 'services.ciak_cut_engine'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/ciak_cut_engine.py
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py -q`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_cut_engine.py backend/tests/test_ciak_cut_engine.py
git commit -m "feat(cut-engine): parse_llm_cuts robusto"
```

---

### Task 2: `detect_filler_from_words` — euristica intercalari (fallback)

**Files:**
- Modify: `backend/services/ciak_cut_engine.py`
- Test: `backend/tests/test_ciak_cut_engine.py`

- [ ] **Step 1: Write the failing test**

```python
def test_detect_filler_from_words():
    words = [
        {"text": "Ciao", "start": 0.0, "end": 0.3},
        {"text": "ehm", "start": 0.4, "end": 0.7},
        {"text": "benvenuto", "start": 0.8, "end": 1.2},
        {"text": "cioè,", "start": 1.3, "end": 1.6},   # punteggiatura ignorata
    ]
    out = ce.detect_filler_from_words(words)
    assert [w["word"] for w in out] == ["ehm", "cioè"]
    assert all(w["type"] == "filler" for w in out)
    assert out[0]["start"] == 0.4 and out[0]["end"] == 0.7
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py::test_detect_filler_from_words -q`
Expected: FAIL con `AttributeError: module 'services.ciak_cut_engine' has no attribute 'detect_filler_from_words'`

- [ ] **Step 3: Write minimal implementation**

Aggiungere a `backend/services/ciak_cut_engine.py`:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py -q`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_cut_engine.py backend/tests/test_ciak_cut_engine.py
git commit -m "feat(cut-engine): euristica intercalari da words"
```

---

### Task 3: `merge_cut_segments` — unione, ordinamento, merge overlap, id, enabled

**Files:**
- Modify: `backend/services/ciak_cut_engine.py`
- Test: `backend/tests/test_ciak_cut_engine.py`

- [ ] **Step 1: Write the failing test**

```python
def test_merge_cut_segments_sorts_ids_and_merges_overlaps():
    a = [{"start": 5.0, "end": 6.0, "type": "smart", "reason": "rip", "word": ""}]
    b = [
        {"start": 1.0, "end": 1.4, "type": "filler", "reason": "int", "word": "ehm"},
        {"start": 1.3, "end": 1.8, "type": "silence", "reason": "pausa", "word": ""},  # overlap con precedente
    ]
    out = ce.merge_cut_segments(a, b)
    assert [s["id"] for s in out] == [0, 1]           # id riassegnati progressivi
    assert out[0]["start"] == 1.0 and out[0]["end"] == 1.8  # overlap fuso
    assert out[1]["start"] == 5.0
    assert all(s["enabled"] is True for s in out)


def test_merge_cut_segments_empty():
    assert ce.merge_cut_segments([], []) == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py::test_merge_cut_segments_sorts_ids_and_merges_overlaps -q`
Expected: FAIL con `AttributeError: ... 'merge_cut_segments'`

- [ ] **Step 3: Write minimal implementation**

Aggiungere a `backend/services/ciak_cut_engine.py`:

```python
def merge_cut_segments(*lists) -> list:
    """Unisce N liste di tagli: ordina per start, fonde gli overlap (tolleranza 0),
    riassegna id progressivi, imposta enabled=True. Mantiene type/reason/word del
    primo segmento di ogni gruppo fuso."""
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py -q`
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_cut_engine.py backend/tests/test_ciak_cut_engine.py
git commit -m "feat(cut-engine): merge/normalizza cut_segments"
```

---

### Task 4: `build_prompt` + `assemble_cuts` (puri) + `propose_cuts` (thin)

Design: la chiamata LLM è **async** (`ciak_llm.LlmChat`) e verrà fatta dall'integrazione
(dove l'event loop è disponibile). Qui il modulo resta **puro/testabile**: costruisce il
prompt, e assembla i `cut_segments` a partire dalla **risposta LLM già ottenuta** (o `None`
per il fallback). `propose_cuts` è una comodità sync con `llm` iniettabile (usata nei test).

**Files:**
- Modify: `backend/services/ciak_cut_engine.py`
- Test: `backend/tests/test_ciak_cut_engine.py`

- [ ] **Step 1: Write the failing test**

```python
def _words_seconds():
    return [
        {"text": "Ciao", "start": 0.0, "end": 0.3},
        {"text": "ehm", "start": 0.4, "end": 0.7},
        {"text": "benvenuto", "start": 0.8, "end": 1.2},
    ]


def test_build_prompt_contains_timed_words():
    p = ce.build_prompt(_words_seconds())
    assert "ehm | 0.40-0.70" in p
    assert "JSON" in p  # istruzione formato


def test_assemble_cuts_with_llm_response_merges_silence():
    raw = '[{"start": 0.8, "end": 1.2, "reason": "ripetizione"}]'
    res = ce.assemble_cuts(raw, _words_seconds(), silence_segments=[{"start": 2.0, "end": 2.5}])
    assert res["ai_used"] is True
    starts = [s["start"] for s in res["cut_segments"]]
    assert 0.8 in starts and 2.0 in starts
    assert all("id" in s and s["enabled"] for s in res["cut_segments"])


def test_assemble_cuts_fallback_when_no_llm():
    res = ce.assemble_cuts(None, _words_seconds(), silence_segments=[{"start": 2.0, "end": 2.5}])
    assert res["ai_used"] is False
    assert "ehm" in [s["word"] for s in res["cut_segments"]]     # euristica intercalari
    assert 2.0 in [s["start"] for s in res["cut_segments"]]      # silenzi inclusi


def test_propose_cuts_uses_injected_llm():
    fake_llm = lambda prompt: '[{"start": 0.8, "end": 1.2, "reason": "rip"}]'
    res = ce.propose_cuts(_words_seconds(), silence_segments=[], llm=fake_llm)
    assert res["ai_used"] is True and 0.8 in [s["start"] for s in res["cut_segments"]]


def test_propose_cuts_fallback_when_llm_raises():
    def boom(prompt):
        raise RuntimeError("LLM giù")
    res = ce.propose_cuts(_words_seconds(), silence_segments=[], llm=boom)
    assert res["ai_used"] is False and "ehm" in [s["word"] for s in res["cut_segments"]]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py::test_assemble_cuts_with_llm_response_merges_silence -q`
Expected: FAIL con `AttributeError: ... 'assemble_cuts'`

- [ ] **Step 3: Write minimal implementation**

Aggiungere a `backend/services/ciak_cut_engine.py`:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py -q`
Expected: PASS (11 test)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_cut_engine.py backend/tests/test_ciak_cut_engine.py
git commit -m "feat(cut-engine): build_prompt + assemble_cuts (puri) + propose_cuts"
```

---

### Task 5: Integrare `propose_cuts` nel checkpoint `da_revisionare` della pipeline

**Files:**
- Modify: `backend/video_pipeline_task.py` (blocco checkpoint revisione, dove oggi si costruisce `_cut_rev` dai `all_segs`)

Contesto: nel checkpoint `if VIDEO_REVIEW_ENABLED and (video_type == "masterclass" or (video_type == "videocorso" and lesson_id)):` la pipeline oggi costruisce `_cut_rev` da `all_segs` (filler+silence+smart euristici). Sostituiamo la sorgente dei tagli con il motore AI, mantenendo lo stesso salvataggio.

- [ ] **Step 1: Trovare il punto d'inserimento**

Run: `cd backend && py -c "import re;s=open('video_pipeline_task.py',encoding='utf-8').read();print(s.count('_cut_rev = []'))"`
Expected: stampa `1` (una sola occorrenza, nel checkpoint principale)

- [ ] **Step 2: Sostituire la costruzione di `_cut_rev`**

Individuare nel checkpoint principale il blocco:

```python
                if VIDEO_REVIEW_ENABLED and (video_type == "masterclass" or (video_type == "videocorso" and lesson_id)):
                    _cut_rev = []
                    for _i, _s in enumerate(all_segs):
                        _typ = "filler" if _s.get("word") else ("smart" if _s.get("reason") else "silence")
                        _cut_rev.append({
                            "id": _i,
                            "start": round(float(_s["start"]), 3),
                            "end": round(float(_s["end"]), 3),
                            "type": _typ,
                            "reason": _s.get("reason", ""),
                            "word": _s.get("word", ""),
                            "enabled": True,
                        })
```

e sostituirlo con (la chiamata LLM è async via `LlmChat`; `silence_segs`, `words`, `raw_dur`,
`partner_id`, `lesson_id` sono già in scope nel checkpoint):

```python
                if VIDEO_REVIEW_ENABLED and (video_type == "masterclass" or (video_type == "videocorso" and lesson_id)):
                    try:
                        from services.ciak_cut_engine import build_prompt, assemble_cuts
                        # Normalizza words a secondi se AssemblyAI le dà in ms
                        _mx = max((float(w.get("end", 0)) for w in (words or [])), default=0)
                        _words_s = words
                        if raw_dur and _mx > raw_dur * 3:
                            _words_s = [{**w, "start": float(w.get("start", 0)) / 1000.0,
                                         "end": float(w.get("end", 0)) / 1000.0} for w in words]
                        _llm_raw = None
                        try:
                            from services.ciak_llm import LlmChat, UserMessage
                            _chat = LlmChat(session_id=f"cut-{partner_id}-{lesson_id or 'mc'}",
                                            system_message="Sei un montatore video professionale.")
                            _llm_raw = await _chat.send_message(UserMessage(text=build_prompt(_words_s)))
                        except Exception as _llm_err:
                            logger.warning(f"[VIDEO-PIPE] Cut LLM fallito, fallback euristiche: {_llm_err}")
                            _llm_raw = None
                        _cut_res = assemble_cuts(_llm_raw, _words_s, silence_segs)
                        _cut_rev = _cut_res["cut_segments"]
                        logger.info(f"[VIDEO-PIPE] Cut engine: {len(_cut_rev)} tagli (ai_used={_cut_res['ai_used']})")
                    except Exception as _ce_err:
                        logger.warning(f"[VIDEO-PIPE] Cut engine errore, uso all_segs: {_ce_err}")
                        _cut_rev = []
                        for _i, _s in enumerate(all_segs):
                            _typ = "filler" if _s.get("word") else ("smart" if _s.get("reason") else "silence")
                            _cut_rev.append({
                                "id": _i,
                                "start": round(float(_s["start"]), 3),
                                "end": round(float(_s["end"]), 3),
                                "type": _typ,
                                "reason": _s.get("reason", ""),
                                "word": _s.get("word", ""),
                                "enabled": True,
                            })
```

> NOTA: confermare la firma di `LlmChat` in `services/ciak_llm.py` (`LlmChat(session_id, system_message, ...)`;
> l'api_key viene letta da env se non passata) e che `send_message(UserMessage(text=...))` ritorni la
> **stringa** di risposta del modello. Adeguare i nomi se differiscono.

- [ ] **Step 3: Verificare che il file compili**

Run: `cd backend && py -m py_compile video_pipeline_task.py`
Expected: nessun errore

- [ ] **Step 4: Test di regressione della suite cut-engine**

Run: `cd backend && py -m pytest tests/test_ciak_cut_engine.py -q`
Expected: PASS (11 test)

- [ ] **Step 5: Commit**

```bash
git add backend/video_pipeline_task.py
git commit -m "feat(cut-engine): usa propose_cuts nel checkpoint da_revisionare (fallback euristiche)"
```

- [ ] **Step 6: Verifica E2E in produzione (dopo deploy backend+worker)**

Ripetere il test reale già collaudato su una lezione di Daniele (partner 23): re-submit di `m1_l1`
via `submit-video-link`, attendere `da_revisionare`, aprire `/admin/revisione-video/23/m1_l1` e
confermare che i tagli proposti sono **più puliti/sensati** di prima (intercalari + ripetizioni)
e che il log worker mostra `Cut engine AI: N tagli (ai_used=True)`.

---

## Note di deploy
- Modificando `backend/**`, il push su `main` triggera il deploy backend + worker (workflow esistente).
- Il motore gira nel **worker** (dove gira la pipeline): assicurarsi che `EMERGENT_LLM_KEY`/`ANTHROPIC_API_KEY` sia presente sul worker (già lo è per gli altri agenti).

## Prossimo piano (Fase 1B)
Montaggio v2 → GCS (no YouTube) + endpoint link servito da Ciak + salvataggio nei File del partner + snippet copia-incolla admin. Verrà scritto come piano separato una volta completata la Fase 1A.
