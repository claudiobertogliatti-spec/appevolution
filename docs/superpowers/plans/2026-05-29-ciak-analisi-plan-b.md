# Ciak Analisi — Plan B: Delivery €67 (bozza automatica + definitiva web + admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collegare il motore analisi (Plan A, già in prod) al funnel €67: al pagamento genera in automatico la bozza PDF brandizzata e la invia via email; espone la definitiva su `/analisi/:token` sbloccata dopo validazione admin; rende i prompt editabili da admin senza deploy.

**Architecture:** Si riusa tutto Plan A (`backend/services/ciak_analisi.py`, collection `ciak_analisi`, router admin `ciak_analisi_admin.py`). Si aggiunge: (1) un prompt-store versionato keyed (gemello di `ciak_matteo_prompt_store`) con 4 chiavi; (2) un renderer PDF HTML→playwright in estetica Canva (navy/giallo, highlighter-pill, onde); (3) un modulo di delivery che orchestra render+upload Cloudinary+email; (4) il trigger nel webhook Stripe esistente (fire-and-forget, idempotente); (5) endpoint pubblico + pagina React `/analisi/:token` (gemello di `/report/:token`); (6) UI admin di validazione/invio + editor prompt (gemello del KB Matteo editor).

**Tech Stack:** Python 3 / FastAPI / motor (MongoDB async), anthropic SDK, **playwright** 1.58 (chromium → PDF, già in requirements), **cloudinary** 1.44 (upload raw), SMTP register.it (email transazionale con allegato), React (frontend Ciak), pytest + pytest-asyncio.

---

## Decisioni tecniche (lockate con Claudio 2026-05-29)

| Tema | Decisione | Motivo |
|---|---|---|
| **Engine PDF** | HTML/CSS → **playwright** (chromium) | Fedeltà all'estetica Canva; reportlab non regge quella resa |
| **Estetica** | Stile del Canva `DAHK9fYkUtg` (già brandizzato Evolution PRO): sfondo bianco, **titoli navy** `#0F172A`, **highlighter-pill gialla** `#FACC15` dietro parole-chiave, **pill** per label/date, **onde grigie** decorative, font **Poppins** | Combacia con brand kit Ciak; nessuna dipendenza Canva runtime |
| **Canva** | Solo riferimento visivo — **niente** Canva API/Enterprise/autofill, niente lavoro per-cliente | L'analisi è auto-generata, testo a lunghezza variabile (i box Canva traboccherebbero) |
| **Email bozza** | SMTP register.it con **PDF in allegato** + link Cloudinary nel corpo | Transazionale immediata, self-contained (Systeme non può allegare un PDF per-cliente) |
| **Email definitiva** | SMTP con **link** a `/analisi/:token`, inviata da "Valida e invia" (post-call) | Coerente con il gate di validazione |
| **CRM** | In aggiunta all'email, si emette evento Systeme (`ciak_analisi_bozza_inviata`, `ciak_analisi_pronta`) per automazioni/tag | Non per l'email, ma per pipeline/segmentazione |
| **Idempotenza** | webhook può arrivare più volte → bozza inviata una sola volta (`bozza_inviata_at`); generazione già idempotente (`genera_e_salva`) | Stripe re-invia i webhook |

---

## File Structure

**Backend — creare:**
- `backend/services/ciak_analisi_prompt_store.py` — store versionato keyed (research/definitiva/bozza/script_call). Una responsabilità: persistenza versioni prompt.
- `backend/services/ciak_pdf.py` — render HTML bozza (estetica Canva) + `html_to_pdf` (playwright). Una responsabilità: produrre bytes PDF.
- `backend/services/ciak_analisi_delivery.py` — orchestratore post-acquisto: genera → render PDF → upload Cloudinary → email; + helper SMTP con allegato. Una responsabilità: consegna.
- `backend/routers/ciak_analisi_public.py` — `GET /api/ciak/analisi/{token}` pubblico, gated su `stato == "inviata"`.

**Backend — modificare:**
- `backend/services/ciak_analisi.py` — risoluzione prompt dallo store (fallback hardcoded).
- `backend/routers/ciak_analisi_admin.py` — endpoint prompt (GET/POST/activate per key), `GET /coda`, `PUT /{token}`, `POST /{token}/valida-invia`.
- `backend/routers/checkout.py:299-368` — trigger delivery nel `_handle_checkout_completed`.
- `backend/server.py:~16810` — registra `ciak_analisi_public_router`.
- `backend/Dockerfile` — `playwright install --with-deps chromium`.

**Frontend — creare:**
- `frontend/src/ciak/pages/Analisi.jsx` — pagina pubblica definitiva (estetica Canva).
- `frontend/src/ciak/analisi/analisi.css` — design tokens + layout definitiva.
- `frontend/src/ciak/admin/pages/AnalisiDaValidare.jsx` — coda + editor 6 capitoli + valida/rigenera.
- `frontend/src/ciak/admin/pages/AnalisiPromptEditor.jsx` — editor prompt 4-chiavi (gemello KB Matteo).

**Frontend — modificare:**
- `frontend/src/ciak/CiakApp.jsx:~78` — rotta `/analisi/:token`.
- `frontend/src/ciak/admin/CiakAdminApp.jsx` — NAV + rotte admin nuove.

**Riferimenti pattern:** `backend/services/ciak_matteo_prompt_store.py` (store), `backend/services/ciak_matteo.py:132-144` (`_resolve_system_prompt`), `backend/routers/ciak_admin.py:845-907` (endpoint prompt), `frontend/src/ciak/admin/pages/MatteoKBEditor.jsx` (editor), `frontend/src/ciak/pages/Report.jsx` (pagina token), `C:\Users\berto\Desktop\ciak_analisi_demo\bozza.html` + `definitiva.html` (design sorgente).

---

# MILESTONE A — Bozza automatica post-€67

*Risultato testabile: cliente paga €67 → riceve email con bozza PDF brandizzata. Prompt editabili da admin.*

---

## Task A1: Prompt-store versionato keyed `ciak_analisi_prompt_store.py`

**Files:**
- Create: `backend/services/ciak_analisi_prompt_store.py`
- Test: `backend/tests/test_ciak_analisi_prompt_store.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_analisi_prompt_store.py
import pytest
from services import ciak_analisi_prompt_store as store


class FakeColl:
    def __init__(self):
        self.docs = []
    async def find_one(self, q):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                return d
        return None
    def find(self, q):
        items = [d for d in self.docs if all(d.get(k) == v for k, v in q.items())]
        class Cur:
            def sort(self, *a, **k): return self
            def limit(self, n): return self
            async def to_list(self, n): return items
        return Cur()
    async def update_many(self, q, upd):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                d.update(upd["$set"])
    async def insert_one(self, doc):
        self.docs.append(doc)
    async def update_one(self, q, upd):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                d.update(upd["$set"]); return


class FakeDB:
    def __init__(self):
        self.ciak_analisi_prompts = FakeColl()


@pytest.mark.asyncio
async def test_create_and_get_active_per_key():
    store.set_db(FakeDB())
    await store.create_version(key="bozza", content="P1", label="v1", author_email="a@b.it")
    assert await store.get_active_content("bozza") == "P1"
    # chiave diversa è isolata
    assert await store.get_active_content("definitiva") is None
    # nuova versione disattiva la precedente
    await store.create_version(key="bozza", content="P2", label="v2", author_email="a@b.it")
    assert await store.get_active_content("bozza") == "P2"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi_prompt_store.py -v`
Expected: FAIL con `ModuleNotFoundError`.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/ciak_analisi_prompt_store.py
"""
Prompt-store versionato per il motore analisi (Plan B).
Gemello di ciak_matteo_prompt_store, ma KEYED: 4 prompt indipendenti
(research | definitiva | bozza | script_call). Una sola versione attiva per chiave.

Doc collection `ciak_analisi_prompts`:
  {id, key, label, content, author_email, created_at, active, parent_id}
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

VALID_KEYS = ("research", "definitiva", "bozza", "script_call")

db = None


def set_db(database) -> None:
    global db
    db = database


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_active_prompt(key: str) -> Optional[dict]:
    if db is None:
        return None
    return await db.ciak_analisi_prompts.find_one({"key": key, "active": True})


async def get_active_content(key: str) -> Optional[str]:
    doc = await get_active_prompt(key)
    return doc.get("content") if doc else None


async def list_versions(key: str, limit: int = 50) -> list:
    if db is None:
        return []
    cur = db.ciak_analisi_prompts.find({"key": key}).sort("created_at", -1).limit(limit)
    return await cur.to_list(limit)


async def create_version(key: str, content: str, label: str, author_email: str,
                         parent_id: Optional[str] = None, activate: bool = True) -> dict:
    if key not in VALID_KEYS:
        raise ValueError(f"key non valida: {key}")
    if db is None:
        raise RuntimeError("Database non configurato")
    doc = {
        "id": str(uuid4()),
        "key": key,
        "label": label,
        "content": content,
        "author_email": author_email,
        "created_at": _now_iso(),
        "active": activate,
        "parent_id": parent_id,
    }
    if activate:
        await db.ciak_analisi_prompts.update_many(
            {"key": key, "active": True}, {"$set": {"active": False}}
        )
    await db.ciak_analisi_prompts.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def activate_version(version_id: str) -> Optional[dict]:
    if db is None:
        return None
    target = await db.ciak_analisi_prompts.find_one({"id": version_id})
    if not target:
        return None
    await db.ciak_analisi_prompts.update_many(
        {"key": target["key"], "active": True}, {"$set": {"active": False}}
    )
    await db.ciak_analisi_prompts.update_one(
        {"id": version_id}, {"$set": {"active": True}}
    )
    target["active"] = True
    target.pop("_id", None)
    return target
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi_prompt_store.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_analisi_prompt_store.py backend/tests/test_ciak_analisi_prompt_store.py
git commit -m "feat(ciak): prompt-store versionato keyed per il motore analisi"
```

---

## Task A2: Risoluzione prompt dallo store in `ciak_analisi.py` (fallback hardcoded)

**Files:**
- Modify: `backend/services/ciak_analisi.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
# Aggiungi in backend/tests/test_ciak_analisi.py
@pytest.mark.asyncio
async def test_resolve_prompt_store_then_fallback(monkeypatch):
    from services import ciak_analisi

    # store con override per "bozza", niente per "definitiva"
    async def fake_get_active_content(key):
        return "PROMPT_OVERRIDE" if key == "bozza" else None

    import services.ciak_analisi_prompt_store as store
    monkeypatch.setattr(store, "get_active_content", fake_get_active_content)

    assert await ciak_analisi._resolve_prompt("bozza") == "PROMPT_OVERRIDE"
    # fallback all'hardcoded
    assert await ciak_analisi._resolve_prompt("definitiva") == ciak_analisi._PROMPT_DEFINITIVA
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_resolve_prompt_store_then_fallback -v`
Expected: FAIL (`_resolve_prompt` non esiste).

- [ ] **Step 3: Write minimal implementation**

Aggiungi a `backend/services/ciak_analisi.py` (vicino agli altri helper):

```python
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
```

Poi nelle 4 funzioni di generazione, sostituisci la costante con il prompt risolto. Esempio in `genera_research_brief` (sostituisci `_PROMPT_RESEARCH` passato a `_web_search_text`/`_call_claude_structured` con `await _resolve_prompt("research")`); idem `genera_analisi_definitiva` → `await _resolve_prompt("definitiva")`, `genera_bozza` → `await _resolve_prompt("bozza")`, `genera_script_call` → `await _resolve_prompt("script_call")`.

> NOTA per l'esecutore: le 4 funzioni sono già `async`. Leggi le righe correnti di ciascuna e cambia SOLO la sorgente del system prompt (da costante a `await _resolve_prompt(<key>)`), lasciando invariata la logica di chiamata. Non cambiare le firme.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py -v`
Expected: PASS (tutti, inclusi i test Plan A esistenti)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_analisi.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): motore analisi usa prompt-store (fallback hardcoded)"
```

---

## Task A3: Endpoint admin prompt in `ciak_analisi_admin.py`

**Files:**
- Modify: `backend/routers/ciak_analisi_admin.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
def test_router_prompt_paths():
    from routers import ciak_analisi_admin
    paths = {r.path for r in ciak_analisi_admin.router.routes}
    assert "/api/admin/ciak/analisi/prompt/{key}" in paths
    assert "/api/admin/ciak/analisi/prompt/{key}/{version_id}/activate" in paths
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_router_prompt_paths -v`
Expected: FAIL (path non presenti).

- [ ] **Step 3: Write minimal implementation**

In `backend/routers/ciak_analisi_admin.py`, in cima aggiungi import + model, poi gli endpoint. Estendi anche `set_db` per iniettare lo store.

```python
from pydantic import BaseModel
from services import ciak_analisi_prompt_store

# ... dentro set_db(database): aggiungi
#     ciak_analisi_prompt_store.set_db(database)


class AnalisiPromptCreate(BaseModel):
    label: str
    content: str
    parent_id: str | None = None
    activate: bool = True


@router.get("/prompt/{key}")
async def get_prompt(key: str, admin=Depends(require_ciak_admin)):
    if key not in ciak_analisi_prompt_store.VALID_KEYS:
        raise HTTPException(400, f"key non valida: {key}")
    from services import ciak_analisi
    active = await ciak_analisi_prompt_store.get_active_prompt(key)
    versions = await ciak_analisi_prompt_store.list_versions(key)
    for v in versions:
        v.pop("_id", None)
    if active:
        active.pop("_id", None)
    return {
        "key": key,
        "active": active,
        "fallback_hardcoded": ciak_analisi._PROMPT_FALLBACK[key],
        "versions": versions,
    }


@router.post("/prompt/{key}")
async def create_prompt(key: str, body: AnalisiPromptCreate, admin=Depends(require_ciak_admin)):
    if key not in ciak_analisi_prompt_store.VALID_KEYS:
        raise HTTPException(400, f"key non valida: {key}")
    return await ciak_analisi_prompt_store.create_version(
        key=key, content=body.content, label=body.label,
        author_email=getattr(admin, "email", "admin"),
        parent_id=body.parent_id, activate=body.activate,
    )


@router.post("/prompt/{key}/{version_id}/activate")
async def activate_prompt(key: str, version_id: str, admin=Depends(require_ciak_admin)):
    res = await ciak_analisi_prompt_store.activate_version(version_id)
    if not res:
        raise HTTPException(404, "Versione non trovata")
    return res
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_router_prompt_paths -v`
Expected: PASS

Verifica import server: `cd backend && python -c "import ast; ast.parse(open('routers/ciak_analisi_admin.py').read()); print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/routers/ciak_analisi_admin.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): endpoint admin prompt-store analisi (GET/POST/activate per key)"
```

---

## Task A4: Renderer PDF bozza (estetica Canva) `ciak_pdf.py`

**Files:**
- Create: `backend/services/ciak_pdf.py`
- Test: `backend/tests/test_ciak_pdf.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_pdf.py
from services.ciak_pdf import render_bozza_html

BOZZA = {
    "intro": "Hai già clienti reali.",
    "bullet_per_capitolo": {
        "punto_di_partenza": ["Il mercato ti ha validato."],
        "dove_sei_adesso": ["Vendi ore, non prodotti."],
        "il_tuo_mercato": ["Spazio non presidiato."],
        "la_tua_accademia": ["Percorso possibile a 4 moduli."],
        "la_roadmap": ["Cinque fasi, output concreti."],
        "prossimo_passo": ["Una sessione strategica."],
    },
    "chiusura": "La versione completa la vediamo in call.",
}


def test_render_bozza_html_contiene_nome_titoli_bullet():
    html = render_bozza_html(BOZZA, "Marco Rossi")
    assert "Marco Rossi" in html
    # i 6 titoli fissi
    for t in ["Il tuo punto di partenza", "Dove sei adesso", "Il tuo mercato",
              "La tua Accademia Digitale", "La roadmap", "Il prossimo passo"]:
        assert t in html
    assert "Il mercato ti ha validato." in html
    assert "La versione completa la vediamo in call." in html
    # token estetica Canva
    assert "highlight-pill" in html
    assert "#FACC15" in html


def test_render_bozza_html_escapa_html():
    html = render_bozza_html(
        {"intro": "", "bullet_per_capitolo": {k: ["<script>x</script>"] for k in
          ["punto_di_partenza","dove_sei_adesso","il_tuo_mercato","la_tua_accademia","la_roadmap","prossimo_passo"]},
         "chiusura": ""},
        "A & B",
    )
    assert "<script>x</script>" not in html
    assert "&lt;script&gt;" in html
    assert "A &amp; B" in html
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_pdf.py -v`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/ciak_pdf.py
"""
Render PDF della BOZZA analisi (Plan B).
HTML brandizzato in estetica Canva (navy/giallo, highlighter-pill, onde) →
playwright/chromium → PDF bytes. Riferimento design: ciak_analisi_demo/bozza.html.
"""
import html as _html
import logging

logger = logging.getLogger(__name__)

# Mappa chiave capitolo → titolo umano (ordine = arco narrativo)
_TITOLI = [
    ("punto_di_partenza", "Il tuo punto di partenza"),
    ("dove_sei_adesso", "Dove sei adesso"),
    ("il_tuo_mercato", "Il tuo mercato"),
    ("la_tua_accademia", "La tua Accademia Digitale"),
    ("la_roadmap", "La roadmap"),
    ("prossimo_passo", "Il prossimo passo"),
]

_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
:root{--navy:#0F172A;--yellow:#FACC15;--slate-50:#F8FAFC;--slate-200:#E2E8F0;--slate-400:#94A3B8;--slate-600:#475569;}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Poppins',sans-serif;color:var(--navy);line-height:1.6;background:#fff;}
.container{max-width:900px;margin:0 auto;}
.cover{background:#fff;color:var(--navy);padding:90px 60px 70px;position:relative;overflow:hidden;text-align:center;}
.cover .logo{font-size:13px;font-weight:700;letter-spacing:2px;color:var(--slate-400);text-transform:uppercase;margin-bottom:40px;}
.cover h1{font-size:46px;font-weight:700;line-height:1.1;}
.highlight-pill{background:var(--yellow);padding:2px 16px;border-radius:30px;display:inline-block;}
.cover .sub{color:var(--navy);font-size:18px;font-weight:600;margin-top:22px;}
.date-pill{background:var(--yellow);color:var(--navy);font-weight:600;font-size:13px;padding:8px 20px;border-radius:30px;display:inline-block;margin-top:30px;}
.waves{position:absolute;left:0;right:0;bottom:0;width:100%;opacity:.5;}
.page{padding:30px 60px 60px;}
.tag-draft{display:inline-block;background:var(--yellow);color:var(--navy);padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:20px;}
.section{margin-bottom:28px;page-break-inside:avoid;}
.section-num{font-size:12px;font-weight:700;color:var(--yellow);letter-spacing:1px;display:block;margin-bottom:4px;}
h2{font-size:22px;font-weight:600;margin-bottom:12px;}
.bullets{list-style:none;}
.bullets li{padding:8px 0 8px 26px;position:relative;color:var(--slate-600);font-size:14px;}
.bullets li:before{content:"\\25B8";color:var(--yellow);position:absolute;left:0;font-weight:700;}
.cta-box{background:var(--navy);color:#fff;border-radius:16px;padding:34px;margin-top:24px;text-align:center;}
.cta-box h3{font-size:20px;margin-bottom:10px;}
.cta-box p{color:#cbd5e1;font-size:14px;}
.cta-box .arrow{color:var(--yellow);font-weight:700;font-size:15px;margin-top:10px;}
.footer{margin-top:40px;padding-top:24px;border-top:1px solid var(--slate-200);color:var(--slate-400);font-size:12px;text-align:center;}
"""

_WAVES_SVG = (
    '<svg class="waves" viewBox="0 0 900 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
    '<path d="M0,60 C150,110 300,10 450,60 C600,110 750,10 900,60 L900,120 L0,120 Z" '
    'fill="none" stroke="#E2E8F0" stroke-width="1.5"/>'
    '<path d="M0,80 C150,130 300,30 450,80 C600,130 750,30 900,80" '
    'fill="none" stroke="#E2E8F0" stroke-width="1"/></svg>'
)


def _esc(s) -> str:
    return _html.escape(str(s or ""))


def render_bozza_html(bozza: dict, nome: str) -> str:
    bullets_map = bozza.get("bullet_per_capitolo", {}) or {}
    sezioni = []
    for i, (key, titolo) in enumerate(_TITOLI, start=1):
        items = bullets_map.get(key, []) or []
        lis = "".join(f"<li>{_esc(b)}</li>" for b in items)
        sezioni.append(
            f'<section class="section"><span class="section-num">{i:02d}</span>'
            f'<h2>{_esc(titolo)}</h2><ul class="bullets">{lis}</ul></section>'
        )
    intro = _esc(bozza.get("intro", ""))
    chiusura = _esc(bozza.get("chiusura", "Nella call approfondiamo i punti critici con i dati in mano."))
    return f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><style>{_CSS}</style></head>
<body><div class="container">
<header class="cover">
  <div class="logo">Ciak Blueprint · powered by Evolution PRO</div>
  <h1>La tua <span class="highlight-pill">analisi</span> è pronta</h1>
  <div class="sub">Documento riservato · preparato per {_esc(nome)}</div>
  <div class="date-pill">Anteprima — sintesi preliminare</div>
  {_WAVES_SVG}
</header>
<div class="page">
  <span class="tag-draft">BOZZA · SINTESI PRELIMINARE</span>
  {('<p style="color:var(--slate-600);font-size:15px;margin-bottom:18px;">' + intro + '</p>') if intro else ''}
  {''.join(sezioni)}
  <div class="cta-box"><h3>La versione completa la vediamo insieme</h3>
    <p>{chiusura}</p><div class="arrow">Prenota la call →</div></div>
  <div class="footer">Ciak — powered by Evolution PRO · Delaware LLC · www.ciak.io</div>
</div></div></body></html>"""


async def html_to_pdf(html_str: str) -> bytes:
    """HTML → PDF via playwright/chromium. Richiede chromium installato (Dockerfile)."""
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            page = await browser.new_page()
            await page.set_content(html_str, wait_until="networkidle")
            return await page.pdf(
                format="A4", print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )
        finally:
            await browser.close()


async def genera_bozza_pdf(bozza: dict, nome: str) -> bytes:
    return await html_to_pdf(render_bozza_html(bozza, nome))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_pdf.py -v`
Expected: PASS (i test toccano solo `render_bozza_html`, niente chromium)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_pdf.py backend/tests/test_ciak_pdf.py
git commit -m "feat(ciak): renderer HTML bozza in estetica Canva + html_to_pdf playwright"
```

---

## Task A5: Dockerfile chromium + delivery `ciak_analisi_delivery.py`

**Files:**
- Modify: `backend/Dockerfile`
- Create: `backend/services/ciak_analisi_delivery.py`
- Test: `backend/tests/test_ciak_analisi_delivery.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_analisi_delivery.py
import pytest
from services import ciak_analisi_delivery as delivery


class FakeColl:
    def __init__(self, doc=None): self.doc = doc; self.updated = None
    async def find_one(self, q): return self.doc
    async def update_one(self, q, upd): self.updated = upd["$set"]


class FakeDB:
    def __init__(self, doc): self.ciak_analisi = FakeColl(doc)


@pytest.mark.asyncio
async def test_processa_acquisto_idempotente(monkeypatch):
    doc = {"session_token": "t1", "email": "c@x.it", "bozza": {"intro": "x", "bullet_per_capitolo": {}},
           "bozza_inviata_at": "2026-05-29T10:00:00Z"}
    delivery.set_db(FakeDB(doc))
    called = {"gen": 0, "pdf": 0, "mail": 0}
    monkeypatch.setattr(delivery.ciak_analisi, "genera_e_salva", lambda t, force=False: _a({"already_exists": True}))
    monkeypatch.setattr(delivery.ciak_pdf, "genera_bozza_pdf", lambda b, n: _a(b"PDF"))
    monkeypatch.setattr(delivery, "_send_email_attachment", lambda **k: (True, None))
    res = await delivery.processa_acquisto("t1", "c@x.it", "Cliente")
    assert res["skipped"] == "gia_inviata"


@pytest.mark.asyncio
async def test_processa_acquisto_invia(monkeypatch):
    doc = {"session_token": "t2", "email": "c@x.it",
           "bozza": {"intro": "x", "bullet_per_capitolo": {}}, "bozza_inviata_at": None}
    db = FakeDB(doc)
    delivery.set_db(db)
    monkeypatch.setattr(delivery.ciak_analisi, "genera_e_salva", lambda t, force=False: _a({"already_exists": False}))
    monkeypatch.setattr(delivery.ciak_pdf, "genera_bozza_pdf", lambda b, n: _a(b"PDF"))
    monkeypatch.setattr(delivery, "_upload_pdf", lambda data, token: _a("https://cdn/x.pdf"))
    sent = {}
    monkeypatch.setattr(delivery, "_send_email_attachment",
                        lambda **k: sent.update(k) or (True, None))
    res = await delivery.processa_acquisto("t2", "c@x.it", "Cliente")
    assert res["sent"] is True
    assert db.ciak_analisi.updated["bozza_inviata_at"] is not None
    assert db.ciak_analisi.updated["bozza"]["pdf_url"] == "https://cdn/x.pdf"
    assert sent["to"] == "c@x.it"


async def _a(v): return v
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi_delivery.py -v`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Write minimal implementation**

Modifica `backend/Dockerfile` — dopo `pip install -r requirements.txt` aggiungi:

```dockerfile
# Chromium per playwright (render PDF analisi). --with-deps installa le librerie di sistema.
RUN python -m playwright install --with-deps chromium
```

Crea `backend/services/ciak_analisi_delivery.py`:

```python
"""
Consegna post-acquisto della BOZZA analisi (Plan B).
Orchestratore idempotente: genera (Plan A) → render PDF (estetica Canva) →
upload Cloudinary → email transazionale con allegato. Emesso in background dal webhook €67.
"""
import logging
import os
import smtplib
from datetime import datetime, timezone
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from services import ciak_analisi, ciak_pdf

logger = logging.getLogger(__name__)

db = None


def set_db(database) -> None:
    global db
    db = database


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _upload_pdf(pdf_bytes: bytes, session_token: str) -> Optional[str]:
    """Upload Cloudinary raw → secure_url (None se Cloudinary non configurato/ko)."""
    try:
        from cloudinary_service import upload_file_direct
        res = await upload_file_direct(
            file_data=pdf_bytes, filename=f"bozza_analisi_{session_token}.pdf",
            resource_type="raw", folder="ciak/analisi/bozze",
        )
        return res.get("secure_url") if res.get("success") else None
    except Exception as e:
        logger.warning("[CIAK_DELIVERY] upload Cloudinary fallito: %s", e)
        return None


def _send_email_attachment(*, to: str, subject: str, body_text: str,
                           pdf_bytes: bytes, pdf_filename: str) -> tuple[bool, Optional[str]]:
    """Email transazionale SMTP con PDF in allegato. Ritorna (ok, err)."""
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pwd = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", f"Claudio Bertogliatti <{user}>")
    if not user or not pwd:
        return False, "SMTP non configurato"
    try:
        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        part = MIMEBase("application", "octet-stream")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{pdf_filename}"')
        msg.attach(part)
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.starttls()
            server.login(user, pwd)
            server.send_message(msg)
        return True, None
    except Exception as e:
        return False, str(e)


def _email_body(nome: str, link: Optional[str]) -> str:
    primo = (nome or "").split()[0] if nome else "ciao"
    link_line = f"\n\nPuoi anche scaricarla qui:\n{link}\n" if link else "\n"
    return (
        f"Ciao {primo},\n\n"
        "in allegato trovi l'anteprima della tua analisi strategica Ciak Blueprint."
        f"{link_line}\n"
        "È una sintesi: la versione completa — mercato, accademia e roadmap nel dettaglio — "
        "la vediamo insieme nella call strategica.\n\n"
        "A presto,\nClaudio\nEvolution PRO"
    )


async def processa_acquisto(session_token: str, email: str, nome: Optional[str]) -> dict:
    """
    Background post-€67: genera (idempotente) + invia bozza PDF una sola volta.
    Non solleva: logga e ritorna lo stato (non deve mai rompere il webhook).
    """
    if db is None:
        logger.error("[CIAK_DELIVERY] db non configurato")
        return {"sent": False, "error": "no_db"}
    try:
        await ciak_analisi.genera_e_salva(session_token)
    except Exception as e:
        logger.error("[CIAK_DELIVERY] generazione fallita per %s: %s", session_token, e)
        return {"sent": False, "error": f"gen: {e}"}

    doc = await db.ciak_analisi.find_one({"session_token": session_token})
    if not doc:
        return {"sent": False, "error": "analisi non trovata dopo generazione"}
    if doc.get("bozza_inviata_at"):
        return {"sent": False, "skipped": "gia_inviata"}

    bozza = doc.get("bozza") or {}
    dest = email or doc.get("email")
    if not dest:
        return {"sent": False, "error": "email mancante"}

    try:
        pdf_bytes = await ciak_pdf.genera_bozza_pdf(bozza, nome or "")
    except Exception as e:
        logger.error("[CIAK_DELIVERY] render PDF fallito per %s: %s", session_token, e)
        return {"sent": False, "error": f"pdf: {e}"}

    pdf_url = await _upload_pdf(pdf_bytes, session_token)
    ok, err = _send_email_attachment(
        to=dest, subject="La tua analisi Ciak Blueprint — anteprima",
        body_text=_email_body(nome, pdf_url),
        pdf_bytes=pdf_bytes, pdf_filename=f"analisi_ciak_{session_token[:8]}.pdf",
    )
    bozza["pdf_url"] = pdf_url
    update = {"bozza": bozza}
    if ok:
        update["bozza_inviata_at"] = _now_iso()
    else:
        logger.error("[CIAK_DELIVERY] email bozza ko per %s: %s", dest, err)
        update["bozza_errore"] = err
    await db.ciak_analisi.update_one({"session_token": session_token}, {"$set": update})
    return {"sent": ok, "pdf_url": pdf_url, "error": err}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi_delivery.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/services/ciak_analisi_delivery.py backend/tests/test_ciak_analisi_delivery.py
git commit -m "feat(ciak): delivery bozza (render+upload+email) + chromium nel Dockerfile"
```

---

## Task A6: Trigger delivery nel webhook €67

**Files:**
- Modify: `backend/routers/checkout.py:299-368`
- Test: `backend/tests/test_checkout_trigger.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_checkout_trigger.py
import pytest
from routers import checkout


@pytest.mark.asyncio
async def test_handle_checkout_triggers_delivery(monkeypatch):
    captured = {}

    # diagnostic trovata
    diag = {"_id": 1, "session_token": "tok", "user_email": "c@x.it", "user_name": "Cliente",
            "state_history": [], "events": [], "current_state": "report_generated"}

    class Coll:
        async def find_one(self, *a, **k): return diag
        async def replace_one(self, *a, **k): return None
    class DB:
        diagnostic_sessions = Coll()
    checkout.db = DB()

    monkeypatch.setattr(checkout, "transition_to", lambda *a, **k: None)
    monkeypatch.setattr(checkout, "add_event", lambda *a, **k: None)

    # cattura il task di delivery invece di eseguirlo
    import asyncio
    def fake_create_task(coro):
        captured["coro"] = coro
        coro.close()  # evita "never awaited"
        return None
    monkeypatch.setattr(asyncio, "create_task", fake_create_task)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", lambda **k: _noop())

    called = {}
    async def fake_processa(session_token, email, nome):
        called["args"] = (session_token, email, nome)
    monkeypatch.setattr("services.ciak_analisi_delivery.processa_acquisto", fake_processa)

    await checkout._handle_checkout_completed({
        "id": "cs_1", "amount_total": 6700,
        "metadata": {"tipo": "ciak_blueprint", "diagnostic_session_token": "tok"},
        "customer_email": "c@x.it",
    })
    # il task di delivery è stato schedulato
    assert "coro" in captured


async def _noop(): return None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_checkout_trigger.py -v`
Expected: FAIL (delivery non ancora triggerata).

- [ ] **Step 3: Write minimal implementation**

In `backend/routers/checkout.py`, dentro `_handle_checkout_completed`, **dopo** il blocco esistente che emette il task Systeme `ciak_bought_67` (riga ~368), aggiungi:

```python
    # Plan B: genera + invia la bozza analisi in background (idempotente, non blocca il webhook).
    from services import ciak_analisi_delivery
    ciak_analisi_delivery.set_db(db)
    _asyncio.create_task(ciak_analisi_delivery.processa_acquisto(
        session_token=diagnostic.get("session_token"),
        email=_user_email,
        nome=diagnostic.get("user_name"),
    ))
```

> NOTA: `_asyncio` è già importato in quel blocco (riga ~355). Se non in scope, usa `import asyncio as _asyncio` all'inizio della funzione.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_checkout_trigger.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routers/checkout.py backend/tests/test_checkout_trigger.py
git commit -m "feat(ciak): webhook €67 triggera la delivery bozza in background"
```

---

## Task A7: Test e2e Milestone A (manuale, post-deploy)

**Files:** nessuno

- [ ] **Step 1: Deploy backend**

```bash
cd C:/Users/berto/Desktop/appevolution
gcloud run deploy evolution-pro-backend --source ./backend --region europe-west1 --project gen-lang-client-0744698012 --allow-unauthenticated
```
Expected: revisione deployata. (Il build ora installa chromium → più lento del solito, ~qualche minuto in più.)

- [ ] **Step 2: Verifica render PDF in prod (chromium presente)**

Crea `C:\Users\berto\Desktop\_test_bozza_pdf.py` (poi cancella): genera l'analisi per una `diagnostic_session` reale già pagante (riusa una di test), poi chiama l'admin `POST /api/admin/ciak/analisi/genera/{token}` e verifica nel doc `ciak_analisi` che esista `bozza`. Poi simula la delivery chiamando un piccolo endpoint di test OPPURE verifica che, dopo un pagamento reale di test (Stripe test mode), arrivi l'email con allegato.

Checklist attesa:
- `bozza_inviata_at` valorizzato nel doc `ciak_analisi`
- `bozza.pdf_url` = URL Cloudinary raggiungibile (apri in browser → PDF brandizzato Canva)
- email ricevuta con PDF in allegato

- [ ] **Step 3: Verifica idempotenza**

Re-invia il webhook dallo Stripe Dashboard (Resend) → NON deve arrivare una seconda email (log `skipped: gia_inviata`).

- [ ] **Step 4: Cleanup**

```bash
rm C:/Users/berto/Desktop/_test_bozza_pdf.py
```
Cancella la diagnostic_session e l'analisi di test dal DB.

---

# MILESTONE B — Definitiva web + admin validazione

*Risultato testabile: Claudio vede le analisi da validare, edita i 6 capitoli, clicca "Valida e invia" → il cliente riceve il link e vede la definitiva brandizzata su `/analisi/:token`. Prompt editabili da UI.*

---

## Task B1: Endpoint pubblico definitiva (gated)

**Files:**
- Create: `backend/routers/ciak_analisi_public.py`
- Modify: `backend/server.py:~16810`
- Test: `backend/tests/test_ciak_analisi_public.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_analisi_public.py
import pytest
from fastapi import HTTPException
from routers import ciak_analisi_public as pub


class Coll:
    def __init__(self, doc): self.doc = doc
    async def find_one(self, q, proj=None): return self.doc


class DB:
    def __init__(self, doc): self.ciak_analisi = Coll(doc)


@pytest.mark.asyncio
async def test_definitiva_gated_non_inviata():
    pub.set_db(DB({"session_token": "t", "stato": "da_validare",
                   "analisi_definitiva": {"capitoli": {}}}))
    with pytest.raises(HTTPException) as e:
        await pub.get_analisi_pubblica("t")
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_definitiva_inviata_ok():
    doc = {"session_token": "t", "stato": "inviata",
           "analisi_definitiva": {"titolo": "X", "capitoli": {"punto_di_partenza": "a"},
                                  "accademia": {}, "roadmap": []},
           "research_data": {"competitor": []}, "email": "c@x.it", "script_call": {"agganci": []}}
    pub.set_db(DB(doc))
    res = await pub.get_analisi_pubblica("t")
    assert res["analisi_definitiva"]["titolo"] == "X"
    # NON deve esporre lo script di vendita interno
    assert "script_call" not in res


@pytest.mark.asyncio
async def test_definitiva_404():
    pub.set_db(DB(None))
    with pytest.raises(HTTPException) as e:
        await pub.get_analisi_pubblica("x")
    assert e.value.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi_public.py -v`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Write minimal implementation**

```python
# backend/routers/ciak_analisi_public.py
"""
Endpoint PUBBLICO della definitiva (Plan B). Nessuna auth (token = capability).
Espone la definitiva SOLO se stato == "inviata" (sbloccata da Claudio post-call).
Non espone mai lo script_call (interno vendita).
"""
import logging
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ciak/analisi", tags=["ciak-analisi-public"])

db = None


def set_db(database) -> None:
    global db
    db = database


@router.get("/{token}")
async def get_analisi_pubblica(token: str):
    if db is None:
        raise HTTPException(503, "Database non configurato")
    doc = await db.ciak_analisi.find_one({"session_token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Analisi non trovata")
    if doc.get("stato") != "inviata":
        raise HTTPException(409, "Analisi non ancora disponibile")
    return {
        "session_token": token,
        "titolo": (doc.get("analisi_definitiva") or {}).get("titolo"),
        "analisi_definitiva": doc.get("analisi_definitiva"),
        "research_data": doc.get("research_data"),
        "nome": (doc.get("nome") or doc.get("email", "").split("@")[0]),
    }
```

In `backend/server.py`, accanto alla registrazione di `ciak_analisi_admin_router` (~riga 16810):

```python
from routers.ciak_analisi_public import router as ciak_analisi_public_router, set_db as set_ciak_analisi_public_db
set_ciak_analisi_public_db(db)
app.include_router(ciak_analisi_public_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi_public.py -v`
Then: `cd backend && python -c "import ast; ast.parse(open('server.py').read()); print('server OK')"`
Expected: PASS + `server OK`

- [ ] **Step 5: Commit**

```bash
git add backend/routers/ciak_analisi_public.py backend/server.py backend/tests/test_ciak_analisi_public.py
git commit -m "feat(ciak): endpoint pubblico definitiva gated su stato inviata"
```

---

## Task B2: Pagina React `/analisi/:token` (estetica Canva)

**Files:**
- Create: `frontend/src/ciak/pages/Analisi.jsx`
- Create: `frontend/src/ciak/analisi/analisi.css`
- Modify: `frontend/src/ciak/CiakApp.jsx:~78`
- Verifica: build + browser

- [ ] **Step 1: Verifica dipendenza markdown**

Run: `cd frontend && node -e "require('react-markdown'); console.log('present')"`
Se stampa errore: `cd frontend && npm install react-markdown@9`
Expected: `present` (dopo install)

- [ ] **Step 2: Crea il CSS (design tokens Canva)**

`frontend/src/ciak/analisi/analisi.css`:

```css
.an-root{--navy:#0F172A;--yellow:#FACC15;--slate-50:#F8FAFC;--slate-200:#E2E8F0;--slate-400:#94A3B8;--slate-600:#475569;
  font-family:'Poppins',system-ui,sans-serif;color:var(--navy);background:#fff;max-width:900px;margin:0 auto;}
.an-cover{padding:80px 56px 60px;text-align:center;position:relative;overflow:hidden;}
.an-cover .an-logo{font-size:12px;font-weight:700;letter-spacing:2px;color:var(--slate-400);text-transform:uppercase;margin-bottom:32px;}
.an-cover h1{font-size:42px;font-weight:700;line-height:1.12;}
.an-pill{background:var(--yellow);padding:2px 16px;border-radius:30px;}
.an-cover .an-sub{font-size:17px;font-weight:600;margin-top:18px;color:var(--navy);}
.an-page{padding:20px 56px 64px;}
.an-section{margin-bottom:44px;}
.an-num{font-size:12px;font-weight:700;color:var(--yellow);letter-spacing:1px;display:block;margin-bottom:6px;}
.an-section h2{font-size:24px;font-weight:600;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid var(--slate-50);}
.an-section p{color:var(--slate-600);font-size:15px;margin-bottom:14px;line-height:1.7;}
.an-section strong{color:var(--navy);}
.an-cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0;}
.an-card{border:1px solid var(--slate-200);border-radius:12px;padding:18px;}
.an-card h4{font-size:15px;color:var(--navy);margin-bottom:6px;}
.an-card p{font-size:13px;margin:0;}
.an-roadmap-item{display:flex;gap:18px;align-items:center;background:var(--slate-50);padding:14px 18px;border-radius:10px;margin-bottom:10px;}
.an-roadmap-fase{min-width:90px;font-weight:700;font-size:12px;color:var(--navy);text-transform:uppercase;}
.an-price-pill{background:var(--navy);color:#fff;padding:10px 22px;border-radius:50px;display:inline-block;font-weight:500;margin-top:12px;}
.an-price-pill b{color:var(--yellow);}
.an-cta{background:var(--navy);color:#fff;border-radius:16px;padding:34px;margin-top:30px;}
.an-cta h3{font-size:20px;margin-bottom:10px;}
.an-cta p{color:#cbd5e1;}
.an-footer{margin-top:50px;padding-top:24px;border-top:1px solid var(--slate-200);color:var(--slate-400);font-size:12px;text-align:center;}
@media(max-width:640px){.an-cards{grid-template-columns:1fr;}.an-cover,.an-page{padding-left:24px;padding-right:24px;}.an-cover h1{font-size:32px;}}
```

- [ ] **Step 3: Crea il componente**

`frontend/src/ciak/pages/Analisi.jsx`:

```jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import "../analisi/analisi.css";

const CAPITOLI = [
  ["punto_di_partenza", "Il tuo punto di partenza"],
  ["dove_sei_adesso", "Dove sei adesso"],
  ["il_tuo_mercato", "Il tuo mercato"],
  ["la_tua_accademia", "La tua Accademia Digitale"],
  ["la_roadmap", "La roadmap"],
  ["prossimo_passo", "Il prossimo passo"],
];

export function CiakAnalisi() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/ciak/analisi/${token}`);
        if (res.status === 409) { setErr("not_ready"); return; }
        if (!res.ok) { setErr("not_found"); return; }
        setData(await res.json());
      } catch {
        setErr("not_found");
      }
    })();
  }, [token]);

  if (err === "not_ready")
    return <div className="an-root"><div className="an-page"><h2>La tua analisi è in preparazione</h2>
      <p>Sarà disponibile qui subito dopo la call strategica con Claudio.</p></div></div>;
  if (err) return <div className="an-root"><div className="an-page"><h2>Analisi non trovata</h2></div></div>;
  if (!data) return <div className="an-root"><div className="an-page"><p>Caricamento…</p></div></div>;

  const def = data.analisi_definitiva || {};
  const capitoli = def.capitoli || {};
  const accademia = def.accademia || {};
  const roadmap = def.roadmap || [];

  return (
    <div className="an-root">
      <header className="an-cover">
        <div className="an-logo">Ciak Blueprint · powered by Evolution PRO</div>
        <h1>La tua <span className="an-pill">analisi</span> strategica</h1>
        <div className="an-sub">Documento riservato · {data.nome}</div>
      </header>
      <div className="an-page">
        {CAPITOLI.map(([key, titolo], i) => (
          <section className="an-section" key={key}>
            <span className="an-num">{String(i + 1).padStart(2, "0")}</span>
            <h2>{titolo}</h2>
            <ReactMarkdown>{capitoli[key] || ""}</ReactMarkdown>

            {key === "la_tua_accademia" && (accademia.moduli || []).length > 0 && (
              <>
                <div className="an-cards">
                  {accademia.moduli.map((m, idx) => (
                    <div className="an-card" key={idx}>
                      <h4>{m.nome}</h4><p>{m.descrizione}</p>
                    </div>
                  ))}
                </div>
                {accademia.pricing_suggerito && (
                  <div className="an-price-pill">Pricing suggerito: <b>{accademia.pricing_suggerito}</b></div>
                )}
              </>
            )}

            {key === "la_roadmap" && roadmap.length > 0 && (
              <div>
                {roadmap.map((r, idx) => (
                  <div className="an-roadmap-item" key={idx}>
                    <div className="an-roadmap-fase">{r.fase}<br /><small>{r.durata}</small></div>
                    <div>{r.attivita}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        <div className="an-cta">
          <h3>Il prossimo passo</h3>
          <p>La partnership Evolution PRO è il veicolo che realizza questa roadmap. Ne parliamo nella call.</p>
        </div>
        <div className="an-footer">Ciak — powered by Evolution PRO · Delaware LLC · www.ciak.io</div>
      </div>
    </div>
  );
}

export default CiakAnalisi;
```

- [ ] **Step 4: Registra la rotta**

In `frontend/src/ciak/CiakApp.jsx`, accanto a `<Route path="/report/:token" ...>` (~riga 78):

```jsx
import { CiakAnalisi } from "./pages/Analisi";
// ...dentro <Routes>:
<Route path="/analisi/:token" element={<CiakAnalisi />} />
```

- [ ] **Step 5: Build + verifica browser**

Run: `cd frontend && npm run build`
Expected: build senza errori.

Verifica manuale: `npm start` (o dev server), apri `/analisi/<token-di-test-con-stato-inviata>` → la definitiva si vede brandizzata (cover con pill gialla, capitoli, card accademia, roadmap). Con un token `da_validare` → "in preparazione". Con token inesistente → "non trovata".

- [ ] **Step 6: Commit**

```bash
git add frontend/src/ciak/pages/Analisi.jsx frontend/src/ciak/analisi/analisi.css frontend/src/ciak/CiakApp.jsx frontend/package.json frontend/package-lock.json
git commit -m "feat(ciak): pagina pubblica /analisi/:token in estetica Canva"
```

---

## Task B3: Admin backend — coda + edit + valida/invia

**Files:**
- Modify: `backend/routers/ciak_analisi_admin.py`
- Test: `backend/tests/test_ciak_analisi.py`

- [ ] **Step 1: Write the failing test**

```python
def test_router_admin_validation_paths():
    from routers import ciak_analisi_admin
    paths = {r.path for r in ciak_analisi_admin.router.routes}
    assert "/api/admin/ciak/analisi/coda" in paths
    assert "/api/admin/ciak/analisi/{session_token}/valida-invia" in paths
    # PUT per salvare gli edit
    methods = {(r.path, m) for r in ciak_analisi_admin.router.routes for m in getattr(r, "methods", [])}
    assert ("/api/admin/ciak/analisi/{session_token}", "PUT") in methods
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_router_admin_validation_paths -v`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In `backend/routers/ciak_analisi_admin.py` aggiungi:

```python
from datetime import datetime, timezone


class DefinitivaUpdate(BaseModel):
    analisi_definitiva: dict
    script_call: dict | None = None


@router.get("/coda")
async def coda_da_validare(admin=Depends(require_ciak_admin)):
    """Analisi paganti in attesa di validazione (stato da_validare)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    cur = db.ciak_analisi.find({"stato": "da_validare"}, {"_id": 0}).sort("generated_at", 1)
    items = await cur.to_list(200)
    return {"items": items, "count": len(items)}


@router.put("/{session_token}")
async def salva_definitiva(session_token: str, body: DefinitivaUpdate,
                           admin=Depends(require_ciak_admin)):
    """Salva gli edit di Claudio sui 6 capitoli (e opzionalmente lo script call)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    update = {"analisi_definitiva": body.analisi_definitiva,
              "edited_at": datetime.now(timezone.utc).isoformat()}
    if body.script_call is not None:
        update["script_call"] = body.script_call
    res = await db.ciak_analisi.update_one({"session_token": session_token}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Analisi non trovata")
    return {"success": True}


@router.post("/{session_token}/valida-invia")
async def valida_e_invia(session_token: str, admin=Depends(require_ciak_admin)):
    """Sblocca la definitiva (stato inviata), invia il link al cliente, emette evento Systeme."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    doc = await db.ciak_analisi.find_one({"session_token": session_token})
    if not doc:
        raise HTTPException(404, "Analisi non trovata")

    await db.ciak_analisi.update_one(
        {"session_token": session_token},
        {"$set": {"stato": "inviata", "inviata_at": datetime.now(timezone.utc).isoformat()}},
    )

    base = os.environ.get("CIAK_BASE_URL", "https://ciak.io")
    link = f"{base}/analisi/{session_token}"
    email = doc.get("email")
    nome = doc.get("nome") or (email.split("@")[0] if email else "")

    # Email con il link (SMTP, gemello della delivery bozza)
    from services.ciak_analisi_delivery import _send_email_link
    ok, err = _send_email_link(
        to=email, nome=nome,
        subject="La tua analisi strategica Ciak è pronta",
        link=link,
    ) if email else (False, "email mancante")

    # Evento Systeme per CRM/automazioni (non per l'email)
    try:
        import asyncio
        from services.ciak_systeme import ciak_emit_event
        if email:
            asyncio.create_task(ciak_emit_event(
                email=email, event_name="ciak_analisi_pronta",
                first_name=nome, metadata={"analisi_url": link},
            ))
    except Exception as e:
        logger.warning("[CIAK_ANALISI] emit Systeme ko: %s", e)

    return {"success": True, "link": link, "email_sent": ok, "email_error": err}
```

Aggiungi `import os` e `import logging` in cima al file se mancanti, e in `ciak_analisi_delivery.py` aggiungi l'helper `_send_email_link`:

```python
def _send_email_link(*, to: str, nome: str, subject: str, link: str) -> tuple[bool, Optional[str]]:
    """Email transazionale SMTP con un link (no allegato). Ritorna (ok, err)."""
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pwd = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", f"Claudio Bertogliatti <{user}>")
    if not user or not pwd:
        return False, "SMTP non configurato"
    primo = (nome or "").split()[0] if nome else "ciao"
    body = (f"Ciao {primo},\n\nla tua analisi strategica completa è pronta. "
            f"Puoi consultarla qui:\n{link}\n\nA presto,\nClaudio\nEvolution PRO")
    try:
        msg = MIMEMultipart()
        msg["From"] = sender; msg["To"] = to; msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.starttls(); server.login(user, pwd); server.send_message(msg)
        return True, None
    except Exception as e:
        return False, str(e)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_analisi.py::test_router_admin_validation_paths -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routers/ciak_analisi_admin.py backend/services/ciak_analisi_delivery.py backend/tests/test_ciak_analisi.py
git commit -m "feat(ciak): admin coda/edit/valida-invia analisi definitiva"
```

---

## Task B4: Admin React — "Analisi da validare"

**Files:**
- Create: `frontend/src/ciak/admin/pages/AnalisiDaValidare.jsx`
- Modify: `frontend/src/ciak/admin/CiakAdminApp.jsx`
- Verifica: build + browser

- [ ] **Step 1: Crea il componente**

`frontend/src/ciak/admin/pages/AnalisiDaValidare.jsx`:

```jsx
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../api"; // riusa l'helper API admin esistente

const CAPITOLI = [
  ["punto_di_partenza", "Il tuo punto di partenza"],
  ["dove_sei_adesso", "Dove sei adesso"],
  ["il_tuo_mercato", "Il tuo mercato"],
  ["la_tua_accademia", "La tua Accademia Digitale"],
  ["la_roadmap", "La roadmap"],
  ["prossimo_passo", "Il prossimo passo"],
];

export default function AnalisiDaValidare() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [cap, setCap] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadCoda = async () => {
    const d = await apiGet("/analisi/coda");
    setItems(d.items || []);
  };
  useEffect(() => { loadCoda(); }, []);

  const apri = (it) => {
    setSel(it);
    setCap({ ...(it.analisi_definitiva?.capitoli || {}) });
    setMsg("");
  };

  const salva = async () => {
    setBusy(true);
    const def = { ...sel.analisi_definitiva, capitoli: cap };
    await apiPut(`/analisi/${sel.session_token}`, { analisi_definitiva: def });
    setMsg("Salvato.");
    setBusy(false);
  };

  const rigenera = async () => {
    setBusy(true);
    await apiPost(`/analisi/genera/${sel.session_token}?force=true`, {});
    setMsg("Rigenerazione avviata — ricarica tra poco.");
    setBusy(false);
  };

  const validaInvia = async () => {
    if (!confirm("Sbloccare la definitiva e inviare il link al cliente?")) return;
    setBusy(true);
    await salva();
    const r = await apiPost(`/analisi/${sel.session_token}/valida-invia`, {});
    setMsg(r.email_sent ? "Inviata ✓ — email partita." : `Inviata, ma email KO: ${r.email_error}`);
    setSel(null);
    await loadCoda();
    setBusy(false);
  };

  if (sel) {
    const script = sel.script_call || {};
    return (
      <div style={{ padding: 24, maxWidth: 900 }}>
        <button onClick={() => setSel(null)}>← Coda</button>
        <h2>{sel.email}</h2>
        {CAPITOLI.map(([k, t]) => (
          <div key={k} style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600 }}>{t}</label>
            <textarea value={cap[k] || ""} onChange={(e) => setCap({ ...cap, [k]: e.target.value })}
              rows={6} style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }} />
          </div>
        ))}
        <details style={{ margin: "16px 0" }}>
          <summary>Research brief</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(sel.research_data, null, 2)}</pre>
        </details>
        <details style={{ margin: "16px 0" }}>
          <summary>Script call (interno)</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(script, null, 2)}</pre>
        </details>
        {msg && <p style={{ color: "#0a0" }}>{msg}</p>}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={salva} disabled={busy}>Salva bozza edit</button>
          <button onClick={rigenera} disabled={busy}>Rigenera</button>
          <button onClick={validaInvia} disabled={busy}
            style={{ background: "#0F172A", color: "#fff", fontWeight: 600 }}>
            Valida e invia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Analisi da validare ({items.length})</h2>
      {items.length === 0 && <p>Nessuna analisi in attesa.</p>}
      {items.map((it) => (
        <div key={it.session_token} onClick={() => apri(it)}
          style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 10, cursor: "pointer" }}>
          <strong>{it.email}</strong> · stato cliente {it.stato_cliente}
          <div style={{ color: "#64748B", fontSize: 13 }}>{it.generated_at}</div>
        </div>
      ))}
    </div>
  );
}
```

> NOTA esecutore: verifica i nomi reali degli helper in `frontend/src/ciak/admin/api.js` (o equivalente usato da `MatteoKBEditor.jsx`). Se l'helper PUT non esiste, aggiungilo accanto a `apiGet/apiPost` con lo stesso pattern (fetch + Authorization Bearer). Allinea l'import di conseguenza.

- [ ] **Step 2: Registra NAV + rotta**

In `frontend/src/ciak/admin/CiakAdminApp.jsx`, dentro il macro `"clienti-attivi"` (o un nuovo macro `"gestione-analisi"`), aggiungi alla lista `pages`:

```jsx
{ to: "/admin/analisi-da-validare", label: "Analisi da validare" },
```

E nel blocco `<Routes>`:

```jsx
import AnalisiDaValidare from "./pages/AnalisiDaValidare";
// ...
<Route path="/admin/analisi-da-validare" element={<AnalisiDaValidare />} />
```

- [ ] **Step 3: Build + verifica browser**

Run: `cd frontend && npm run build`
Expected: build ok.

Verifica manuale: login admin → Clienti Attivi → "Analisi da validare" → apri un'analisi, edita un capitolo, "Salva", "Valida e invia" → controlla che la pagina pubblica `/analisi/:token` ora mostri la definitiva e che parta l'email.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/ciak/admin/pages/AnalisiDaValidare.jsx frontend/src/ciak/admin/CiakAdminApp.jsx frontend/src/ciak/admin/api.js
git commit -m "feat(ciak): admin UI Analisi da validare (coda + editor + valida/invia/rigenera)"
```

---

## Task B5: Admin React — editor prompt analisi (4 chiavi)

**Files:**
- Create: `frontend/src/ciak/admin/pages/AnalisiPromptEditor.jsx`
- Modify: `frontend/src/ciak/admin/CiakAdminApp.jsx`
- Verifica: build + browser

- [ ] **Step 1: Crea il componente (gemello di MatteoKBEditor con selettore chiave)**

`frontend/src/ciak/admin/pages/AnalisiPromptEditor.jsx`:

```jsx
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";

const KEYS = [
  ["research", "Research brief"],
  ["definitiva", "Analisi definitiva"],
  ["bozza", "Bozza teaser"],
  ["script_call", "Script call"],
];

export default function AnalisiPromptEditor() {
  const [key, setKey] = useState("definitiva");
  const [data, setData] = useState(null);
  const [content, setContent] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async (k) => {
    const d = await apiGet(`/analisi/prompt/${k}`);
    setData(d);
    setContent(d.active?.content ?? d.fallback_hardcoded ?? "");
    setLabel("");
    setMsg("");
  };
  useEffect(() => { load(key); }, [key]);

  const salva = async () => {
    if (!label.trim()) { setMsg("Inserisci una label per la versione."); return; }
    if (!confirm(`Attivare una nuova versione del prompt "${key}"?`)) return;
    setBusy(true);
    await apiPost(`/analisi/prompt/${key}`, {
      label, content, parent_id: data.active?.id ?? null, activate: true,
    });
    setMsg("Versione attivata ✓");
    await load(key);
    setBusy(false);
  };

  const riattiva = async (vid) => {
    setBusy(true);
    await apiPost(`/analisi/prompt/${key}/${vid}/activate`, {});
    await load(key);
    setBusy(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h2>Prompt motore analisi</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {KEYS.map(([k, lbl]) => (
          <button key={k} onClick={() => setKey(k)}
            style={{ fontWeight: k === key ? 700 : 400, background: k === key ? "#FACC15" : "#fff" }}>
            {lbl}
          </button>
        ))}
      </div>
      {data && (
        <>
          <p style={{ color: "#64748B" }}>
            Attiva: {data.active ? data.active.label : "— (fallback hardcoded)"}
          </p>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={18}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }} />
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="Label nuova versione (es. v2 — più asciutto)"
            style={{ width: "100%", margin: "10px 0", padding: 8 }} />
          {msg && <p style={{ color: "#0a0" }}>{msg}</p>}
          <button onClick={salva} disabled={busy}
            style={{ background: "#0F172A", color: "#fff", fontWeight: 600 }}>
            Salva e attiva
          </button>
          <h3 style={{ marginTop: 24 }}>Versioni</h3>
          {(data.versions || []).map((v) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between",
              padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span>{v.active ? "● " : ""}{v.label} · {v.created_at?.slice(0, 10)}</span>
              {!v.active && <button onClick={() => riattiva(v.id)}>Riattiva</button>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Registra NAV + rotta**

In `frontend/src/ciak/admin/CiakAdminApp.jsx`, nel macro `"strumenti"` (accanto a "KB Matteo"):

```jsx
{ to: "/admin/analisi-prompt", label: "Prompt Analisi" },
```

E nelle rotte:

```jsx
import AnalisiPromptEditor from "./pages/AnalisiPromptEditor";
// ...
<Route path="/admin/analisi-prompt" element={<AnalisiPromptEditor />} />
```

- [ ] **Step 3: Build + verifica browser**

Run: `cd frontend && npm run build`
Expected: ok.

Verifica manuale: Strumenti → Prompt Analisi → cambia chiave (4 tab), modifica "definitiva", "Salva e attiva" → rigenera un'analisi e verifica che il nuovo prompt sia in uso. Riattiva una versione precedente.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/ciak/admin/pages/AnalisiPromptEditor.jsx frontend/src/ciak/admin/CiakAdminApp.jsx
git commit -m "feat(ciak): admin editor prompt analisi (4 chiavi, versioni, rollback)"
```

---

## Task B6: Test e2e Milestone B (manuale, post-deploy)

**Files:** nessuno

- [ ] **Step 1: Deploy backend + frontend**

```bash
cd C:/Users/berto/Desktop/appevolution
gcloud run deploy evolution-pro-backend --source ./backend --region europe-west1 --project gen-lang-client-0744698012 --allow-unauthenticated
# frontend: secondo il flusso Vercel/cloudbuild già in uso per ciak.io
```

- [ ] **Step 2: Flusso completo**

1. Su una `diagnostic_session` reale pagante → admin "Analisi da validare" mostra l'item.
2. Apri, edita un capitolo, "Salva".
3. `/analisi/:token` (browser) → deve dare "in preparazione" (stato ancora da_validare).
4. "Valida e invia" → email con link parte; stato → inviata.
5. `/analisi/:token` → ora mostra la definitiva brandizzata (cover pill gialla, card accademia, roadmap).
6. "Prompt Analisi" → modifica + riattiva una versione → "Rigenera" un'analisi → verifica effetto.

- [ ] **Step 3: Verifica sicurezza gate**

`/analisi/<token-da_validare>` da browser anonimo → 409 "in preparazione". Lo `script_call` non è MAI nel payload pubblico (controlla la response di rete).

---

## Self-Review (eseguita in fase di scrittura)

- **Spec coverage** (`docs/superpowers/specs/2026-05-28-ciak-analisi-roadmap-design.md`): webhook €67 → A6; bozza PDF auto+email → A4/A5/A6; definitiva web `/analisi/:token` → B1/B2; admin validazione/invio → B3/B4; prompt-store editabile → A1/A2/A3/B5; consegna definitiva post-call → B3; error handling/degrado → genera_e_salva (Plan A) + delivery non-throwing (A5); idempotenza → A5/A6. **Fuori scope** (coerente con spec §15): email +48h prenotazione call (modulo separato), PDF della definitiva (solo web in fase 1), cleanup codice morto.
- **Placeholder scan:** nessun "TBD/handle edge cases"; ogni step di codice ha codice reale. Le 2 NOTE esecutore (A2 wiring prompt, B4 helper api) indicano di leggere righe correnti prima di editare file esistenti — non sono placeholder ma istruzioni di integrazione su codice che varia.
- **Type consistency:** `genera_e_salva(session_token, force=False)`, `genera_bozza_pdf(bozza, nome)`, `processa_acquisto(session_token, email, nome)`, store keyed `get_active_content(key)` / `create_version(key, content, label, author_email, parent_id, activate)`, doc `ciak_analisi` (`stato` da_validare|inviata, `bozza.pdf_url`, `bozza_inviata_at`, `inviata_at`, `analisi_definitiva.capitoli` 6 chiavi) coerenti tra backend e i 6 titoli usati in PDF/React.

## Note operative
- **Env richieste in prod:** `SMTP_HOST/PORT/USER/PASSWORD/FROM`, `CIAK_BASE_URL` (default `https://ciak.io`), `CLOUDINARY_*` (già presenti), `ANTHROPIC_API_KEY` (già), `STRIPE_CIAK_WEBHOOK_SECRET` (già).
- **Costo deploy:** chromium aumenta dimensione immagine + tempo build backend. Accettabile per il deliverable €67.
- **Decisione email** (SMTP con allegato) è isolata in `ciak_analisi_delivery.py`: se in futuro si passa a Systeme-link, si cambia solo lì.
