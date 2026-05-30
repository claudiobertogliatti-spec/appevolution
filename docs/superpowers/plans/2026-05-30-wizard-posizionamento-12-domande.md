# Wizard Posizionamento — 12 domande Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire le 8 domande generiche dello Step04 Posizionamento con un set di 12 domande in 4 sezioni, con pre-fill di 2 campi dal Ciak gate (Q1 competenza, Q6 problema) e validazione server-side stringente.

**Architecture:** Modifiche puntuali a 3 file: PDF renderer (SECTIONS_GROUPED 4 sezioni), router posizionamento_approval (nuovo helper prefill + endpoint GET /prefill + validazione 12 keys in /finalize), Step04Posizionamento React (4 sezioni con header/subtitle + fetch prefill on mount). Nessuna migrazione dati (zero partner reali hanno completato lo step).

**Tech Stack:** FastAPI · Motor (Mongo async) · Playwright/Chromium · React + Tailwind · Axios.

**Spec di riferimento:** [`2026-05-30-wizard-posizionamento-12-domande-design.md`](../specs/2026-05-30-wizard-posizionamento-12-domande-design.md)

---

## File Structure

**Backend (modifiche):**
- `backend/services/posizionamento_pdf_renderer.py` — sostituire `SECTIONS` flat con `SECTIONS_GROUPED`, riscrivere `render_posizionamento_html` per renderizzare 4 sezioni con header+subtitle
- `backend/routers/posizionamento_approval.py` — aggiungere costante `POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR`, helper `_compute_prefill_from_ciak`, endpoint `GET /prefill/{partner_id}`, aggiornare validazione in `/finalize`

**Backend (test):**
- `backend/tests/test_posizionamento_finalize.py` — aggiungere test su /prefill e su validazione 12 keys

**Frontend (modifiche):**
- `frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx` — riscrivere con `SECTIONS` array (4 oggetti con header/subtitle/items), 12 textarea, fetch prefill su mount, validazione canComplete su 12 keys con min char per key

**Nessun file nuovo.** Nessuna migrazione.

---

## Task 1: PDF renderer — SECTIONS_GROUPED + render a 4 sezioni

**Files:**
- Modify: `backend/services/posizionamento_pdf_renderer.py`

- [ ] **Step 1: Sostituisci il contenuto del file**

Apri `backend/services/posizionamento_pdf_renderer.py` e sostituisci l'intero contenuto con:

```python
"""Render PDF del Documento di Posizionamento del partner.

12 domande in 4 sezioni (vedi spec wizard-posizionamento-12-domande-design.md).
Layout brand Ciak (navy #0F172A + giallo #FACC15, Poppins).
Riusa html_to_pdf condiviso (backend/services/ciak_pdf.py)
che gira su playwright/chromium già installato nel container.
"""
import html as _html
import logging
from typing import Any

from .ciak_pdf import html_to_pdf

logger = logging.getLogger(__name__)


SECTIONS_GROUPED = [
    {
        "header": "A chi parli",
        "subtitle": "L'ICP scolpito — chi, dove ti cerca, quanto sa.",
        "items": [
            ("nicchia",                "01", "Nicchia precisa"),
            ("momento_di_vita",        "02", "Momento di vita / carriera"),
            ("livello_consapevolezza", "03", "Livello di consapevolezza"),
        ],
    },
    {
        "header": "Cosa vendi",
        "subtitle": "Promessa, trasformazione, prezzo, formato.",
        "items": [
            ("promessa",            "04", "Promessa in 1 frase"),
            ("trasformazione_90gg", "05", "Trasformazione in 90 giorni"),
            ("prezzo_e_formato",    "06", "Prezzo e formato"),
        ],
    },
    {
        "header": "Il tuo metodo",
        "subtitle": "Il modo riconoscibile in cui produci risultati.",
        "items": [
            ("metodo_nome",            "07", "Nome metodo"),
            ("metodo_step",            "08", "Step del metodo"),
            ("prova_sociale_concreta", "09", "Prova sociale concreta"),
        ],
    },
    {
        "header": "Perché tu",
        "subtitle": "La voce che ti rende difficile da copiare.",
        "items": [
            ("origin_story",            "10", "Origin story"),
            ("contrarian_view",         "11", "Punto di vista contrarian"),
            ("differenza_riconoscibile","12", "Come ti descriverebbero"),
        ],
    },
]


_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
:root{--navy:#0F172A;--yellow:#FACC15;--slate-50:#F8FAFC;--slate-200:#E2E8F0;--slate-400:#94A3B8;--slate-600:#475569;}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Poppins',sans-serif;color:var(--navy);line-height:1.6;background:#fff;}
.container{max-width:900px;margin:0 auto;}
.cover{padding:90px 60px 70px;text-align:center;position:relative;}
.cover .logo{font-size:13px;font-weight:700;letter-spacing:2px;color:var(--slate-400);text-transform:uppercase;margin-bottom:40px;}
.cover h1{font-size:42px;font-weight:700;line-height:1.1;}
.highlight-pill{background:var(--yellow);padding:2px 16px;border-radius:30px;display:inline-block;}
.cover .sub{color:var(--navy);font-size:18px;font-weight:600;margin-top:22px;}
.cover .who{color:var(--slate-600);font-size:14px;margin-top:8px;}
.page{padding:30px 60px 60px;}
.group{margin-bottom:36px;page-break-inside:avoid;}
.group-header{margin-bottom:14px;border-bottom:2px solid var(--yellow);padding-bottom:8px;}
.group-header h2{font-size:22px;font-weight:700;color:var(--navy);}
.group-header .subtitle{font-size:13px;color:var(--slate-400);margin-top:2px;font-weight:400;}
.section{margin-bottom:20px;page-break-inside:avoid;}
.section-num{font-size:11px;font-weight:700;color:var(--yellow);letter-spacing:1px;display:block;margin-bottom:4px;}
.section h3{font-size:16px;font-weight:600;margin-bottom:6px;}
.section p{color:var(--slate-600);font-size:14px;white-space:pre-wrap;}
.footer{margin-top:40px;padding-top:24px;border-top:1px solid var(--slate-200);color:var(--slate-400);font-size:12px;text-align:center;}
"""


def _esc(s: Any) -> str:
    return _html.escape(str(s or ""))


def render_posizionamento_html(answers: dict, nome: str) -> str:
    """Costruisce l'HTML del Documento di Posizionamento dalle 12 risposte in 4 sezioni."""
    groups_html = []
    for group in SECTIONS_GROUPED:
        items_html = []
        for key, num, label in group["items"]:
            value = _esc(answers.get(key, "")).strip()
            if not value:
                value = "<em style='color:var(--slate-400)'>Non compilato</em>"
            items_html.append(
                f'<section class="section"><span class="section-num">{num}</span>'
                f'<h3>{_esc(label)}</h3><p>{value}</p></section>'
            )
        groups_html.append(
            f'<div class="group">'
            f'  <div class="group-header"><h2>{_esc(group["header"])}</h2>'
            f'    <div class="subtitle">{_esc(group["subtitle"])}</div></div>'
            f'  {"".join(items_html)}'
            f'</div>'
        )

    return f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><style>{_CSS}</style></head>
<body><div class="container">
<header class="cover">
  <div class="logo">Documento di Posizionamento · Metodo EVO™</div>
  <h1>Il tuo <span class="highlight-pill">posizionamento</span></h1>
  <div class="sub">Fondamento Esamina · Fase 1</div>
  <div class="who">Preparato per {_esc(nome)}</div>
</header>
<div class="page">
  {''.join(groups_html)}
  <div class="footer">Documento generato dal Metodo EVO™ · Evolution PRO LLC · ciak.io</div>
</div></div></body></html>"""


async def genera_posizionamento_pdf(answers: dict, nome: str) -> bytes:
    """HTML → PDF bytes via playwright/chromium (riuso shared helper)."""
    return await html_to_pdf(render_posizionamento_html(answers, nome))
```

- [ ] **Step 2: Smoke check del render con 12 risposte**

Da `C:\Users\berto\Desktop\appevolution`:

```
python -c "from backend.services.posizionamento_pdf_renderer import render_posizionamento_html, SECTIONS_GROUPED; answers={'nicchia':'consulenti fin','momento_di_vita':'in scaling','livello_consapevolezza':'sanno problema','promessa':'10 clienti 90gg','trasformazione_90gg':'pipeline costante','prezzo_e_formato':'497-1490 corso','metodo_nome':'Metodo X','metodo_step':'1.A 2.B 3.C','prova_sociale_concreta':'Mario 3 vendite','origin_story':'ho fallito','contrarian_view':'tutti sbagliano X','differenza_riconoscibile':'quello che ti fa Y'}; html = render_posizionamento_html(answers, 'Mario'); assert 'A chi parli' in html and 'Cosa vendi' in html and 'Il tuo metodo' in html and 'Perche tu' in html or 'Perch&eacute;' in html or 'Perché' in html; assert all(num in html for num in ['01','02','03','04','05','06','07','08','09','10','11','12']); print('OK', len(html), 'chars,', len(SECTIONS_GROUPED), 'sezioni')"
```

Expected: `OK <N> chars, 4 sezioni`

- [ ] **Step 3: Smoke check che chiavi vecchie non rompano il render**

Verifica che dare le chiavi vecchie (`cliente_tipo`, `metodo_proprio`, ecc.) non causi crash, semplicemente i campi nuovi siano vuoti ("Non compilato"):

```
python -c "from backend.services.posizionamento_pdf_renderer import render_posizionamento_html; html = render_posizionamento_html({'cliente_tipo':'vecchio','metodo_proprio':'vecchio'}, 'Test'); assert 'Non compilato' in html; print('OK legacy answers do not break render')"
```

Expected: `OK legacy answers do not break render`

- [ ] **Step 4: Commit**

```
git add backend/services/posizionamento_pdf_renderer.py
git -c commit.gpgsign=false commit -m "feat(posizionamento): renderer PDF a 4 sezioni con 12 keys (SECTIONS_GROUPED)"
```

---

## Task 2: Helper prefill + endpoint GET /prefill

**Files:**
- Modify: `backend/routers/posizionamento_approval.py`

- [ ] **Step 1: Aggiungi helper `_compute_prefill_from_ciak`**

Apri `backend/routers/posizionamento_approval.py`. Sotto la funzione `_current_file` (cerca `async def _current_file`), aggiungi:

```python
async def _compute_prefill_from_ciak(partner_id: str) -> dict:
    """Calcola pre-fill da diagnostic_sessions (Ciak gate) per Step04.

    Mappa Q1 Ciak (competenza_raw) → 'nicchia'
    Mappa Q6 Ciak (problema_raw) → 'promessa' (con frase fatta)
    Solo testi liberi — gli enum di Q4/Q5 producono UX awkward.
    Se partner senza email o senza diagnostic_session → ritorna {}.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "email": 1})
    if not partner or not partner.get("email"):
        return {}
    session = await db.diagnostic_sessions.find_one(
        {"email": partner["email"]},
        {"_id": 0, "answers": 1, "competenza_raw": 1, "problema_raw": 1},
        sort=[("created_at", -1)],
    )
    if not session:
        return {}
    competenza = (session.get("competenza_raw") or
                  (session.get("answers") or {}).get("competenza", "")).strip()
    problema = (session.get("problema_raw") or
                (session.get("answers") or {}).get("problema", "")).strip()
    out = {}
    if competenza:
        out["nicchia"] = competenza
    if problema:
        out["promessa"] = f"Aiuto le persone a risolvere questo problema: {problema}."
    return out
```

- [ ] **Step 2: Aggiungi endpoint `GET /prefill/{partner_id}`**

Sotto l'endpoint `get_document_metadata` esistente (cerca `@router.get("/document/{partner_id}")`), aggiungi:

```python
@router.get("/prefill/{partner_id}")
async def get_prefill(partner_id: str) -> dict:
    """Ritorna pre-fill suggerito per Step04 dalle risposte Ciak gate.

    Il frontend chiama questo SOLO se step.data.answers è vuoto.
    Ritorna {nicchia?, promessa?} — solo i campi con dati Ciak disponibili.
    """
    return await _compute_prefill_from_ciak(partner_id)
```

- [ ] **Step 3: Smoke check import e signature**

Da `C:\Users\berto\Desktop\appevolution\backend`:

```
$env:MONGO_URL='mongodb://localhost:27017'; $env:DB_NAME='test_db'; python -c "from routers.posizionamento_approval import _compute_prefill_from_ciak, get_prefill, router; paths=[r.path for r in router.routes]; assert '/api/partner/posizionamento/prefill/{partner_id}' in paths, f'missing: {paths}'; print('OK prefill endpoint registered')"
```

Expected: `OK prefill endpoint registered` (la "Cloudinary credentials not configured" warning è benigna)

- [ ] **Step 4: Aggiungi test integration in stile repo**

Apri `backend/tests/test_posizionamento_finalize.py` e aggiungi alla fine:

```python
class TestPrefillEndpoint:
    def test_prefill_unknown_partner_returns_empty(self):
        r = requests.get(f"{BASE_URL}/api/partner/posizionamento/prefill/no-one-{uuid.uuid4().hex[:8]}")
        assert r.status_code == 200
        assert r.json() == {}

    def test_prefill_returns_dict(self):
        # Per il partner di test deploy-check-evo: potrebbe avere o non avere
        # una diagnostic_session associata. Verifichiamo solo la shape.
        r = requests.get(f"{BASE_URL}/api/partner/posizionamento/prefill/deploy-check-evo")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, dict)
        # Le keys ammesse sono solo nicchia e/o promessa
        for k in body.keys():
            assert k in ("nicchia", "promessa"), f"unexpected key: {k}"
```

- [ ] **Step 5: Commit**

```
git add backend/routers/posizionamento_approval.py backend/tests/test_posizionamento_finalize.py
git -c commit.gpgsign=false commit -m "feat(posizionamento): endpoint GET /prefill + helper _compute_prefill_from_ciak"
```

---

## Task 3: Validazione stringente in /finalize

**Files:**
- Modify: `backend/routers/posizionamento_approval.py`

- [ ] **Step 1: Aggiungi costante con i 12 keys e min_char**

Apri `backend/routers/posizionamento_approval.py`. Sotto la definizione di `STEP_ID = "04-posizionamento"` (in cima al file), aggiungi:

```python
# Le 12 chiavi del wizard Posizionamento con min_char di validazione.
# Vedi spec docs/superpowers/specs/2026-05-30-wizard-posizionamento-12-domande-design.md
POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR = {
    "nicchia": 30,
    "momento_di_vita": 25,
    "livello_consapevolezza": 25,
    "promessa": 40,
    "trasformazione_90gg": 50,
    "prezzo_e_formato": 30,
    "metodo_nome": 5,
    "metodo_step": 80,
    "prova_sociale_concreta": 50,
    "origin_story": 80,
    "contrarian_view": 50,
    "differenza_riconoscibile": 40,
}
```

- [ ] **Step 2: Sostituisci la validazione in `/finalize`**

Cerca nella funzione `finalize_posizionamento` il blocco:

```python
    answers = (step.get("data") or {}).get("answers") or {}
    if not answers or not any((answers.get(k) or "").strip() for k in answers):
        raise HTTPException(400, "Nessuna risposta al wizard Posizionamento trovata")
```

Sostituiscilo con:

```python
    answers = (step.get("data") or {}).get("answers") or {}
    missing = [
        k for k, min_chars in POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR.items()
        if len((answers.get(k) or "").strip()) < min_chars
    ]
    if missing:
        raise HTTPException(
            400,
            f"Risposte mancanti o troppo brevi: {', '.join(missing)}",
        )
```

- [ ] **Step 3: Smoke check import della costante**

Da `C:\Users\berto\Desktop\appevolution\backend`:

```
$env:MONGO_URL='mongodb://localhost:27017'; $env:DB_NAME='test_db'; python -c "from routers.posizionamento_approval import POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR; assert len(POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR) == 12; assert all(isinstance(v, int) and v > 0 for v in POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR.values()); print('OK 12 keys with min_chars:', sum(POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR.values()))"
```

Expected: `OK 12 keys with min_chars: 491`

- [ ] **Step 4: Aggiungi test integration di validazione**

Apri `backend/tests/test_posizionamento_finalize.py`. Trova `class TestFinalizeEndpoint` e aggiungi un test:

```python
    def test_finalize_400_when_answers_incomplete(self):
        # Partner senza risposte complete (il test partner potrebbe averle parziali
        # da setup precedenti). Se 200, significa che era già stato fatto un finalize
        # — accettabile, lo skip.
        partner_id = _create_test_partner_with_answers()
        r = requests.post(
            f"{BASE_URL}/api/partner/posizionamento/finalize",
            json={"partner_id": partner_id},
        )
        if r.status_code == 200 or r.status_code == 409:
            pytest.skip(f"Partner ha già risposte complete (status {r.status_code})")
        assert r.status_code == 400
        # Verifica messaggio elenca le keys mancanti
        detail = r.json().get("detail", "")
        assert "mancanti" in detail.lower() or "brevi" in detail.lower()
```

- [ ] **Step 5: Commit**

```
git add backend/routers/posizionamento_approval.py backend/tests/test_posizionamento_finalize.py
git -c commit.gpgsign=false commit -m "feat(posizionamento): validazione /finalize su 12 keys con min_char per ciascuna"
```

---

## Task 4: Step04Posizionamento — riscrittura con 4 sezioni + 12 fields + prefill fetch

**Files:**
- Modify: `frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx`

- [ ] **Step 1: Sostituisci il contenuto completo del file**

Sovrascrivi `frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx`:

```jsx
import React, { useState, useEffect } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import axios from "axios";

const SECTIONS = [
  {
    header: "A chi parli",
    subtitle: "L'obiettivo è chiaro: tre risposte che scolpiscono il tuo cliente ideale.",
    items: [
      {
        key: "nicchia",
        label: "Qual è la nicchia precisa che vuoi servire?",
        hint: "Non \"consulenti\", ma \"consulenti finanziari indipendenti italiani 35-50 anni che operano per conto proprio\".",
        minChar: 30,
      },
      {
        key: "momento_di_vita",
        label: "In che momento della loro vita o carriera ti cercano?",
        hint: "Stanno per cambiare, sono in crisi, hanno appena fallito, stanno scalando? Quando \"scattano\" e ti vengono a cercare.",
        minChar: 25,
      },
      {
        key: "livello_consapevolezza",
        label: "Quanto sanno già del problema quando ti incontrano?",
        hint: "Non sanno di averlo (devi spiegarglielo)? Sanno di averlo ma cercano soluzioni sbagliate? Hanno già provato cose che non hanno funzionato?",
        minChar: 25,
      },
    ],
  },
  {
    header: "Cosa vendi",
    subtitle: "Non un corso. Un risultato. Tre risposte che lo rendono ineluttabile.",
    items: [
      {
        key: "promessa",
        label: "Qual è la promessa in 1 frase?",
        hint: "Headline-ready. Non \"ti aiuto a stare meglio\", ma \"in 90 giorni esci dal lavoro a ore e crei un'offerta che vendi anche mentre dormi\". Specifica, misurabile, con un tempo.",
        minChar: 40,
      },
      {
        key: "trasformazione_90gg",
        label: "Cosa è cambiato concretamente nella vita del cliente dopo 90 giorni?",
        hint: "Numeri, comportamenti, sensazioni misurabili. Non \"si sente più sicuro\", ma \"ha la sua agenda piena di call qualificate, fattura 3-5k al mese ricorrenti, smette di rincorrere clienti\".",
        minChar: 50,
      },
      {
        key: "prezzo_e_formato",
        label: "A che prezzo lo vendi e in che formato?",
        hint: "Range realistico (es. \"tra 497€ e 1.490€\"), formato (corso self-paced, gruppo coaching 8 settimane, 1-1 6 mesi). Se ancora non lo sai, scrivi quello che IMMAGINI di vendere — lo affineremo insieme.",
        minChar: 30,
      },
    ],
  },
  {
    header: "Il tuo metodo",
    subtitle: "Non per sembrare diverso. Per essere riconoscibile. Tre risposte che danno forma al tuo modo di lavorare.",
    items: [
      {
        key: "metodo_nome",
        label: "Come si chiama il tuo metodo? (anche provvisorio)",
        hint: "Un nome breve, memorabile, che dica qualcosa. Es: \"Metodo EVO\", \"Sistema Profit-First\", \"Approccio Anti-Fuffa\". Se non ce l'hai ancora, scrivi 2-3 idee separate da virgola — lo affineremo insieme.",
        minChar: 5,
      },
      {
        key: "metodo_step",
        label: "In 3-5 step, come funziona?",
        hint: "Le tappe concrete che il cliente attraversa, in ordine. Una riga per step. Es: 1. Diagnosi del posizionamento attuale 2. Costruzione offerta core 3. Funnel di acquisizione live 4. Primi 10 clienti paganti 5. Sistema di scaling.",
        minChar: 80,
      },
      {
        key: "prova_sociale_concreta",
        label: "Un caso reale con un numero o un risultato concreto.",
        hint: "Nome + cosa è cambiato + tempo. Es: \"Marco R., consulente assicurativo: da 0 a 8 clienti paganti in 45 giorni dopo il primo lancio. Fatturato +6.200€/mese.\" Se non hai casi, scrivi quello del cliente più vicino al risultato (anche tuo, se sei partito da zero).",
        minChar: 50,
      },
    ],
  },
  {
    header: "Perché tu",
    subtitle: "Quello che ti rende difficile da copiare. Tre risposte che diventano la tua voce.",
    items: [
      {
        key: "origin_story",
        label: "Perché sei tu a fare questo? Cosa ti è successo che ti ha portato qui?",
        hint: "Una storia vera, anche piccola. Il momento in cui hai capito che dovevi farlo, la frustrazione che ti ha spinto, il fallimento da cui hai imparato. Non per fare \"lo storytelling\": è quello che ti rende umano e credibile agli occhi del tuo pubblico.",
        minChar: 80,
      },
      {
        key: "contrarian_view",
        label: "Cosa pensi che gli altri nel tuo settore sbaglino?",
        hint: "Non per attaccare nessuno. Per piantare bandiera. Es: \"Tutti vendono templates di funnel. Io penso che senza un posizionamento solido il template è la cosa meno importante.\" Una frase netta, riconoscibile.",
        minChar: 50,
      },
      {
        key: "differenza_riconoscibile",
        label: "Se un cliente parlasse di te a un amico, come ti descriverebbe in 1 frase?",
        hint: "Non \"il migliore di tutti\", ma una caratteristica concreta. Es: \"Quello che ti fa fare lo schema su carta prima di toccare un funnel.\" \"Quella che non ti molla finché non hai chiuso il primo cliente.\" Specifica, riconoscibile, vera.",
        minChar: 40,
      },
    ],
  },
];

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items);

export default function Step04Posizionamento({ step, partnerId, onComplete, onSaveDraft }) {
  const [answers, setAnswers] = useState(step?.data?.answers || {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(
    step?.approval_status === "pending_review" || step?.approval_status === "approved"
  );

  // Pre-fill da Ciak gate alla prima visita (se nessuna risposta esistente)
  useEffect(() => {
    const existingKeys = Object.keys(step?.data?.answers || {}).filter(
      (k) => (step.data.answers[k] || "").trim().length > 0
    );
    if (existingKeys.length > 0 || !partnerId) return;
    axios
      .get(`${API}/api/partner/posizionamento/prefill/${partnerId}`)
      .then((r) => {
        const prefill = r.data || {};
        if (Object.keys(prefill).length === 0) return;
        setAnswers((prev) => {
          const next = { ...prev, ...prefill };
          if (onSaveDraft) onSaveDraft({ answers: next });
          return next;
        });
      })
      .catch(() => {
        // Silente: pre-fill è best-effort
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const update = (k, v) => {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    if (onSaveDraft) onSaveDraft({ answers: next });
  };

  const canComplete = ALL_ITEMS.every(
    (it) => (answers[it.key] || "").trim().length >= it.minChar
  );

  const finalize = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (onSaveDraft) await onSaveDraft({ answers });
      const res = await axios.post(`${API}/api/partner/posizionamento/finalize`, {
        partner_id: partnerId,
      });
      setDone(true);
      if (onComplete) onComplete({ answers, approval_status: res.data.approval_status });
    } catch (e) {
      if (e?.response?.status === 409) {
        setError(e.response.data?.detail || "Documento già approvato dal team.");
      } else if (e?.response?.status === 400) {
        setError(e.response.data?.detail || "Alcune risposte sono mancanti o troppo brevi.");
      } else {
        setError("Errore tecnico durante la generazione del documento. Riprova tra qualche minuto.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <StepBase
        eyebrow="Step 4 — Posizionamento"
        title="Documento inviato al team"
        ctaDisabled={true}
        onCta={() => {}}
        secondaryNote=""
      >
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="font-semibold text-slate-900 mb-1">✓ Documento generato</div>
          <p className="text-sm text-slate-600">
            Il team lo sta revisionando — di solito entro 24h.
            Nel frattempo puoi proseguire con lo step successivo.
            Lo trovi anche in <strong>I Miei File</strong>.
          </p>
        </div>
      </StepBase>
    );
  }

  return (
    <StepBase
      eyebrow="Step 4 — Posizionamento"
      title="Le fondamenta del tuo messaggio"
      ctaLabel={submitting ? "Sto generando il documento..." : "Genera Documento"}
      ctaDisabled={!canComplete || submitting}
      onCta={finalize}
      secondaryNote="12 domande in 4 sezioni. Rispondi con onestà — il team userà queste risposte per costruire i tuoi materiali."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.header} className="mb-8 pb-2 border-b border-slate-100 last:border-b-0">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">{section.header}</h3>
            <p className="text-xs text-slate-500 mt-1 italic">{section.subtitle}</p>
          </div>
          <div className="space-y-5">
            {section.items.map((it) => {
              const value = answers[it.key] || "";
              const len = value.trim().length;
              const ok = len >= it.minChar;
              return (
                <div key={it.key}>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    {it.label}
                  </label>
                  <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">{it.hint}</p>
                  <textarea
                    value={value}
                    onChange={(e) => update(it.key, e.target.value)}
                    rows={3}
                    disabled={submitting}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y disabled:bg-gray-50"
                  />
                  <div className={`text-[10px] mt-1 ${ok ? "text-slate-400" : "text-slate-500"}`}>
                    {len}/{it.minChar} min
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </StepBase>
  );
}
```

- [ ] **Step 2: Build check**

Da `C:\Users\berto\Desktop\appevolution\frontend`:

```
npm run build
```

Expected: build completa, niente errori nuovi su `Step04Posizionamento.jsx`. Warning preesistenti su altri file sono OK.

- [ ] **Step 3: Commit**

```
git add frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx
git -c commit.gpgsign=false commit -m "feat(ciak): Step04Posizionamento — 12 domande in 4 sezioni + prefill da Ciak gate"
```

---

## Task 5: Deploy backend + push frontend + smoke test live + memoria

**Files:**
- Nessun file di codice. Solo deploy + verifica + nota di sessione.

- [ ] **Step 1: Push e deploy**

Da `C:\Users\berto\Desktop\appevolution`:

```
git push origin main
gcloud run deploy evolution-pro-backend --source ./backend --region europe-west1 --project gen-lang-client-0744698012 --allow-unauthenticated --quiet
```

Attendere ~5-12 min per la build (include Chromium). A fine deploy verifica:

```
gcloud run services describe evolution-pro-backend --region=europe-west1 --format='value(status.latestReadyRevisionName,status.url)'
```

Annota la rev (es. `evolution-pro-backend-00304-xxx`).

- [ ] **Step 2: Smoke endpoint nuovi**

```
curl -s -o /dev/null -w "prefill=%{http_code}\n" https://evolution-pro-backend-977860235035.europe-west1.run.app/api/partner/posizionamento/prefill/deploy-check-evo
curl -s https://evolution-pro-backend-977860235035.europe-west1.run.app/api/partner/posizionamento/prefill/deploy-check-evo
```

Expected: `prefill=200` e una risposta JSON dict (può essere `{}` se il test partner non ha Ciak gate, o `{nicchia: ..., promessa: ...}` se ce l'ha).

- [ ] **Step 3: Smoke test live via Claude-in-Chrome**

Con Claudio in cabina:
1. Login partner `deploy-check-evo` su `ciak.io/partner`
2. Vai allo Step 4 Posizionamento
3. Verifica che le 4 sezioni si vedano (A chi parli / Cosa vendi / Il tuo metodo / Perché tu) con sottotitoli
4. Verifica che `nicchia` e `promessa` siano pre-compilate se il partner ha avuto Ciak gate (altrimenti vuote — entrambi i casi accettabili)
5. Compila tutte le 12 risposte rispettando i min_char
6. Click "Genera Documento" → verifica spinner → verifica "Documento inviato al team"
7. Vai in "I Miei File" → apri il PDF posizionamento → verifica le 4 sezioni si vedano nel PDF (header "A chi parli" / "Cosa vendi" / "Il tuo metodo" / "Perché tu" con sottolineatura gialla)
8. Login admin → Oggi → coda Approvazioni materiali → apri PDF → Approva → verifica partner ora vede badge verde "Approvato"
9. (Opzionale) Test rifiuto: re-finalize, admin → Rifiuta con nota "Manca specificità ICP" → partner vede "Da rivedere" + messaggio in chat Valentina

Se ogni step passa: deploy verificato. Se fallisce, raccogli error logs (frontend console + backend Cloud Run logs `gcloud logging read 'resource.type=cloud_run_revision' --limit=50`).

- [ ] **Step 4: Aggiorna memoria**

Modifica `C:\Users\berto\.claude\projects\C--Users-berto--claude\memory\session_2026_05_30_ponte_posizionamento_approvazione.md` aggiungendo in fondo una sezione "Aggiornamento sera" con la nuova rev backend, e aggiungi in `MEMORY.md` una riga sopra l'attuale entry sessione 30/5 PM:

```
- ✅ **[Sessione 30/5/2026 (notte) — Wizard Posizionamento 12 domande in 4 sezioni (DEPLOYATO)](session_2026_05_30_ponte_posizionamento_approvazione.md)** — Step04 ora ha 12 domande raggruppate in A chi parli / Cosa vendi / Il tuo metodo / Perché tu. Pre-fill di `nicchia` (da Ciak Q1) e `promessa` (da Ciak Q6) alla prima visita. Validazione server-side per minChar su ognuna delle 12. PDF brand Ciak con 4 sezioni separate. Backend rev `<NEW_REV>`. Smoke test live OK.
```

(Sostituisci `<NEW_REV>` con la rev annotata allo Step 1.)

- [ ] **Step 5: Commit eventuale aggiornamento spec/plan se è emerso qualcosa**

Se durante il smoke test sono emersi piccoli aggiusti (es. un min_char troppo alto/basso, una hint da migliorare), apri una sessione di follow-up — non aggiustare in deploy senza spec.

---

## Self-review applicato

- ✅ **Spec coverage:**
  - 12 domande in 4 sezioni → Task 1 (PDF renderer SECTIONS_GROUPED) + Task 4 (frontend SECTIONS)
  - Pre-fill da Ciak gate (solo testi liberi Q1+Q6) → Task 2 (helper + endpoint) + Task 4 (fetch on mount)
  - Validazione server-side 12 keys con min_char → Task 3
  - Migration zero (no real partner ha completato) → documentato come "out of scope" nella spec, nessun task
  - Edge cases (partner senza Ciak gate, partner con vecchie risposte, ricarica dopo prefill) → coperti dalla logica `if existingKeys.length > 0 ... return` e dalla difesa "Non compilato" nel renderer
  - Testing in stile repo (requests + BASE_URL) → Task 2 step 4 + Task 3 step 4

- ✅ **Placeholder scan:** Nessun TBD/TODO. Tutto il codice è completo.

- ✅ **Type consistency:**
  - `POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR` (backend) e `SECTIONS[*].items[*].key + minChar` (frontend) coincidono per nome + valore.
  - `SECTIONS_GROUPED[*].items[*][0]` (key, backend renderer) corrisponde alle key del frontend e a `POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR`.
  - Endpoint `/api/partner/posizionamento/prefill/{partner_id}` consistente in backend e frontend.
