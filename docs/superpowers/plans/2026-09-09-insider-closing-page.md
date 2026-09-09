# Insider Closing Page (V1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una sales page a token post-call ("Evolution Insider") che presenta benvenuto + video + l'analisi del lead + doppia offerta Start/Partnership (entrambe acquistabili) con accettazione contratto stile-banca, riusando il flusso proposta/checkout/PDF esistente.

**Architecture:** Nuova pagina frontend `/insider/:token` (React, CRA/craco) che riusa gli endpoint proposta esistenti (`backend/routers/proposta.py`) + `start_checkout`. Logica di enfasi offerta = funzione pura testata. L'accettazione (checkbox) adatta `firma-contratto` (che già genera+salva il PDF). Il PDF firmato viene esposto nella sezione Materiali partner.

**Tech Stack:** Frontend React 18 (CRA + craco), react-router 7, lucide-react, CSS `sereno.css`. Backend FastAPI + Mongo (motor). Test frontend: jest via `frontend/preview/sereno/jest.config.cjs` + @testing-library/react. Test backend: pytest.

## Global Constraints

- **Prezzi reali, mai inventati:** Start **€390**, Partnership **€2.990**. Start è **credito** verso Partnership (Upgrade derivato €2.600). Fonte unica, mai riscrivere a mano.
- **Brand lock (interno Ciak):** Poppins, navy `#0F172A`, giallo `#FACC15`, grigi `#64748B`/`#E5E7EB`. Riusare le classi `sereno.css`. Nessuno stock photo generico.
- **Onestà (Codice del Consumo artt. 21-23):** nessun claim/recensione/percentuale inventati; non dire "sei già partner"; mai dichiarare "contratto firmato" senza PDF reale; stati d'errore onesti (mai finto success).
- **Lingua:** UI/copy in italiano; codice/commit/identificatori in inglese.
- **Isolamento:** tutto su branch `cc/ciak-pre-partnership-close`. La pagina è pubblica-a-token (nessun login).
- **⚖️ Gate legale (NON in questo piano, decisione Claudio/legale prima del go-live con pagamenti reali):** diritto di recesso + revisione testo contratto. Il codice si costruisce; l'accensione sui pagamenti reali è gated.
- **Test in CI:** la CI esegue solo i file nominati (`.github/workflows/ci.yml`). Ogni nuovo test va aggiunto alle liste (frontend riga ~169; backend blocco pytest).

---

## File Structure

**Frontend (nuovi):**
- `frontend/src/ciak/insider/offerEmphasis.js` — funzione pura: stato scoring → enfasi offerta.
- `frontend/src/ciak/insider/offerEmphasis.test.js`
- `frontend/src/ciak/insider/InsiderSalesPage.jsx` — shell: carica proposta+analisi, orchestra le sezioni.
- `frontend/src/ciak/insider/InsiderWelcome.jsx` — benvenuto + CTA Telegram + VideoSlot.
- `frontend/src/ciak/insider/AnalysisRecap.jsx` — rilettura analisi.
- `frontend/src/ciak/insider/OfferSections.jsx` — Start (preambolo) + Partnership, servizi inclusi, prezzi, CTA.
- `frontend/src/ciak/insider/ContractAccept.jsx` — checkbox + link contratto; gate del pagamento Partnership.
- `frontend/src/ciak/insider/insider.css` — stili (riusa token sereno).
- `frontend/src/ciak/insider/*.test.js` — test per i componenti con logica.

**Frontend (modificati):**
- `frontend/src/ciak/CiakApp.jsx` — nuova route `/insider/:token`.
- `frontend/src/ciak/partner/sections/PartnerFilesPage.jsx` — aggiungere il contratto firmato ai Materiali.

**Backend (modificati):**
- `backend/routers/proposta.py` — (a) `GET /{token}` arricchito con `analisi` + `scoring`; (b) `firma-contratto` adattato per accettazione-checkbox (firma disegnata opzionale).
- `backend/routers/ciak_clients.py` — verificare `start_checkout` (parametri) per il CTA Start dalla pagina.
- Test backend: `backend/tests/test_insider_closing.py`.

---

### Task 1: Funzione pura `offerEmphasis(stato)`

**Files:**
- Create: `frontend/src/ciak/insider/offerEmphasis.js`
- Test: `frontend/src/ciak/insider/offerEmphasis.test.js`

**Interfaces:**
- Produces: `offerEmphasis(stato: number|string) -> { hero: 'start'|'partnership', startPreamble: boolean }`
  - stato 3-4 (pronto) → `{ hero: 'partnership', startPreamble: false }`
  - stato 1-2 (tiepido) o ignoto → `{ hero: 'start', startPreamble: true }`

- [ ] **Step 1: Write the failing test**

```js
import { offerEmphasis } from './offerEmphasis';

test('pronti (stato 3-4) → Partnership eroe', () => {
  expect(offerEmphasis(4)).toEqual({ hero: 'partnership', startPreamble: false });
  expect(offerEmphasis(3)).toEqual({ hero: 'partnership', startPreamble: false });
});
test('tiepidi (stato 1-2) → Start preambolo', () => {
  expect(offerEmphasis(2)).toEqual({ hero: 'start', startPreamble: true });
  expect(offerEmphasis(1)).toEqual({ hero: 'start', startPreamble: true });
});
test('ignoto → default Start preambolo (fail-safe)', () => {
  expect(offerEmphasis(undefined)).toEqual({ hero: 'start', startPreamble: true });
  expect(offerEmphasis('boh')).toEqual({ hero: 'start', startPreamble: true });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd frontend && node node_modules/jest/bin/jest.js --config=preview/sereno/jest.config.cjs --runInBand --runTestsByPath src/ciak/insider/offerEmphasis.test.js`
Expected: FAIL ("Cannot find module './offerEmphasis'").

- [ ] **Step 3: Implement**

```js
// Presentation only: never gates a purchase, only which offer is emphasized.
export function offerEmphasis(stato) {
  const n = Number(stato);
  if (n >= 3) return { hero: 'partnership', startPreamble: false };
  return { hero: 'start', startPreamble: true };
}
```

- [ ] **Step 4: Run test, verify PASS** (same command).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/ciak/insider/offerEmphasis.js frontend/src/ciak/insider/offerEmphasis.test.js
git commit -m "feat(insider): pure offerEmphasis(stato) for the closing page"
```

---

### Task 2: `GET /api/proposta/{token}` arricchito con analisi + scoring

**Files:**
- Modify: `backend/routers/proposta.py` (funzione `get_proposta`, ~riga 332)
- Test: `backend/tests/test_insider_closing.py`

**Interfaces:**
- Consumes: doc `proposte` (ha `prospect_email`, `partner_id`, `prospect_nome`).
- Produces: la risposta di `GET /{token}` include `analisi` (dict dell'analisi del lead, o `None`) e `scoring_stato` (int 1-4 o `None`), presi dalla sessione diagnostica per `prospect_email`.

**⚠️ Prima di implementare:** confermare la collection reale dell'analisi (grep: `grep -rn "diagnostic\|posizionamento\|analisi" backend/routers/*.py | grep -i "find_one\|collection"`), e la chiave (email/id). Sotto si assume `db.diagnostic_sessions.find_one({"email": prospect_email})` con `.get("scoring", {}).get("stato")` — **adeguare ai nomi reali trovati**.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_insider_closing.py
import pytest
from httpx import AsyncClient, ASGITransport
from server import app  # adeguare all'import reale dell'app FastAPI

@pytest.mark.asyncio
async def test_get_proposta_include_analisi_e_scoring(seed_proposta_con_analisi):
    token = seed_proposta_con_analisi["token"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get(f"/api/proposta/{token}")
    assert r.status_code == 200
    body = r.json()
    assert "analisi" in body
    assert body["scoring_stato"] in (1, 2, 3, 4)
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd backend && python -m pytest tests/test_insider_closing.py::test_get_proposta_include_analisi_e_scoring -q`
Expected: FAIL (KeyError/AssertionError: `analisi`/`scoring_stato` assenti).

- [ ] **Step 3: Implement** — in `get_proposta`, prima del `return proposta`, arricchire (adeguare nomi collection/chiavi ai reali):

```python
    # Arricchimento per la pagina Insider: analisi + scoring del lead.
    proposta["analisi"] = None
    proposta["scoring_stato"] = None
    email = proposta.get("prospect_email")
    if email:
        sess = await db.diagnostic_sessions.find_one({"email": email}, {"_id": 0})
        if sess:
            proposta["analisi"] = sess.get("analisi") or sess.get("analysis")
            proposta["scoring_stato"] = (sess.get("scoring") or {}).get("stato")
    return proposta
```

- [ ] **Step 4: Run test, verify PASS.**

- [ ] **Step 5: Add test to CI** — aggiungere `tests/test_insider_closing.py` al blocco pytest in `.github/workflows/ci.yml`.

- [ ] **Step 6: Commit**

```bash
git add backend/routers/proposta.py backend/tests/test_insider_closing.py .github/workflows/ci.yml
git commit -m "feat(proposta): enrich GET /{token} with lead analisi + scoring_stato"
```

---

### Task 3: Adattare `firma-contratto` all'accettazione-checkbox

**Files:**
- Modify: `backend/routers/proposta.py` (`firma_contratto_proposta`, ~riga 383)
- Test: `backend/tests/test_insider_closing.py`

**Interfaces:**
- Consumes: `POST /{token}/firma-contratto` con body `{ clausole_vessatorie_approved: true, consenso_checkbox: true, signature_base64?: str }`.
- Produces: se `signature_base64` assente ma `consenso_checkbox === true`, l'accettazione è valida; `contract_data` registra `metodo: "checkbox"` + `ip_address` + `signed_at` + `version`. Genera comunque il PDF (invariato).

**⚠️ Nota legale:** il gate recesso/testo è fuori da questo piano; qui si adatta solo il meccanismo di consenso.

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_firma_contratto_accetta_checkbox_senza_firma_disegnata(seed_proposta_accettata):
    token = seed_proposta_accettata["token"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post(f"/api/proposta/{token}/firma-contratto",
                         json={"clausole_vessatorie_approved": True, "consenso_checkbox": True})
    assert r.status_code == 200
    assert r.json()["success"] is True
```

- [ ] **Step 2: Run test, verify it fails** (oggi manca `signature_base64` → `validate_signature_payload` solleva).

Run: `cd backend && python -m pytest tests/test_insider_closing.py::test_firma_contratto_accetta_checkbox_senza_firma_disegnata -q`

- [ ] **Step 3: Implement** — in `firma_contratto_proposta`, sostituire la validazione firma con:

```python
    consenso = body.get("consenso_checkbox") is True
    sig = body.get("signature_base64")
    if sig:
        validate_signature_payload(sig)
    elif not consenso:
        raise HTTPException(422, "Serve l'accettazione (checkbox) o la firma")
    now = datetime.now(timezone.utc)
    contract_data = {
        "version": "v1.0",
        "signed_at": now.isoformat(),
        "signature_base64": sig or "",
        "metodo": "checkbox" if not sig else "signature",
        "ip_address": _trusted_client_ip(request),
        "clausole_vessatorie_approved": True,
    }
```

(il resto della funzione — update proposta/partner, `generate_contract_pdf`, email — resta invariato.)

- [ ] **Step 4: Run test, verify PASS.**

- [ ] **Step 5: Commit**

```bash
git add backend/routers/proposta.py backend/tests/test_insider_closing.py
git commit -m "feat(proposta): accept checkbox consent (bank-style) in firma-contratto"
```

---

### Task 4: Route `/insider/:token` + shell `InsiderSalesPage`

**Files:**
- Create: `frontend/src/ciak/insider/InsiderSalesPage.jsx`
- Create: `frontend/src/ciak/insider/insider.css`
- Modify: `frontend/src/ciak/CiakApp.jsx` (aggiungere `<Route path="/insider/:token" element={<InsiderSalesPage />} />`)
- Test: `frontend/src/ciak/insider/InsiderSalesPage.test.js`

**Interfaces:**
- Consumes: `GET /api/proposta/:token` (Task 2), `offerEmphasis` (Task 1).
- Produces: componente che carica la proposta, calcola l'enfasi, e monta `InsiderWelcome`, `AnalysisRecap`, `OfferSections`. Stati onesti: loading, token invalido/scaduto (404/410), già acquistato (`stato` in `pagamento_completato`/`contratto_firmato`).

- [ ] **Step 1: Write the failing test** (render + stato onesto)

```js
import React from 'react';
import { render, screen } from '@testing-library/react';
global.TextEncoder = require('util').TextEncoder;
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const InsiderSalesPage = require('./InsiderSalesPage').default;

afterEach(() => { delete global.fetch; });

test('token scaduto (410) → messaggio onesto, nessun crash', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 410, json: () => Promise.resolve({}) }));
  render(<MemoryRouter initialEntries={['/insider/tok']}>
    <Routes><Route path="/insider/:token" element={<InsiderSalesPage />} /></Routes>
  </MemoryRouter>);
  expect(await screen.findByText(/non è più disponibile|scadut/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run test, verify fail.** (`cd frontend && node node_modules/jest/bin/jest.js --config=preview/sereno/jest.config.cjs --runInBand --runTestsByPath src/ciak/insider/InsiderSalesPage.test.js`)

- [ ] **Step 3: Implement** `InsiderSalesPage.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './insider.css';
import { offerEmphasis } from './offerEmphasis';
import InsiderWelcome from './InsiderWelcome';
import AnalysisRecap from './AnalysisRecap';
import OfferSections from './OfferSections';

export default function InsiderSalesPage() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    fetch(`/api/proposta/${token}`)
      .then(async (r) => {
        if (r.status === 410) return { status: 'expired' };
        if (r.status === 404) return { status: 'notfound' };
        if (!r.ok) return { status: 'error' };
        const p = await r.json();
        if (['pagamento_completato', 'contratto_firmato'].includes(p.stato)) return { status: 'done', p };
        return { status: 'ready', p };
      })
      .then((s) => { if (alive) setState(s); })
      .catch(() => { if (alive) setState({ status: 'error' }); });
    return () => { alive = false; };
  }, [token]);

  if (state.status === 'loading') return <div className="insider"><p role="status">Un attimo…</p></div>;
  if (state.status === 'expired') return <div className="insider"><p role="alert">Questa pagina non è più disponibile: il periodo è scaduto. Scrivici e la riapriamo.</p></div>;
  if (state.status === 'notfound') return <div className="insider"><p role="alert">Link non valido.</p></div>;
  if (state.status === 'error') return <div className="insider"><p role="alert">Non riusciamo a caricare la pagina. Riprova tra poco.</p></div>;
  if (state.status === 'done') return <div className="insider"><p>Hai già completato: trovi tutto nella tua area riservata.</p></div>;

  const p = state.p;
  const emphasis = offerEmphasis(p.scoring_stato);
  return (
    <div className="insider">
      <InsiderWelcome name={p.prospect_nome} telegramUrl={p.telegram_group_url} />
      <AnalysisRecap analisi={p.analisi} />
      <OfferSections token={token} emphasis={emphasis} />
    </div>
  );
}
```

- [ ] **Step 4:** Stub minimi di `InsiderWelcome`/`AnalysisRecap`/`OfferSections` (default export che rende un `<div/>`) per far passare il test; verranno completati nei task 5-7. Run test → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/ciak/insider/ frontend/src/ciak/CiakApp.jsx
git commit -m "feat(insider): /insider/:token route + sales page shell with honest states"
```

---

### Task 5: `InsiderWelcome` (benvenuto + Telegram + VideoSlot)

**Files:**
- Modify: `frontend/src/ciak/insider/InsiderWelcome.jsx`
- Test: `frontend/src/ciak/insider/InsiderWelcome.test.js`

**Interfaces:**
- Consumes: `{ name?: string, telegramUrl?: string, videoUrl?: string }`.
- Produces: benvenuto col nome, badge "Evolution Insider", CTA Telegram (solo se `telegramUrl`), VideoSlot (placeholder onesto se `videoUrl` assente — niente player finto).

- [ ] **Step 1: Write the failing test**

```js
import React from 'react';
import { render, screen } from '@testing-library/react';
import InsiderWelcome from './InsiderWelcome';

test('benvenuto col nome + Insider; niente player se manca il video', () => {
  render(<InsiderWelcome name="Marco Rossi" telegramUrl="https://t.me/x" />);
  expect(screen.getByText(/Marco/)).toBeTruthy();
  expect(screen.getByText(/Evolution Insider/i)).toBeTruthy();
  expect(screen.getByRole('link', { name: /telegram/i }).getAttribute('href')).toBe('https://t.me/x');
  expect(screen.queryByRole('button', { name: /play/i })).toBeNull();
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — benvenuto (nome → primo nome), badge Insider, CTA Telegram condizionale, VideoSlot: se `videoUrl` presente `<iframe>`/player; altrimenti un riquadro "Il video arriva a breve" (onesto), nessun controllo finto. Usare classi `insider.css`/token sereno.
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** (`feat(insider): welcome + Telegram CTA + honest video slot`).

---

### Task 6: `OfferSections` (Start preambolo + Partnership, prezzi reali, credito, enfasi)

**Files:**
- Modify: `frontend/src/ciak/insider/OfferSections.jsx`
- Create: `frontend/src/ciak/insider/offerData.js` (fonte unica: nomi, prezzi, servizi inclusi Start/Partnership)
- Test: `frontend/src/ciak/insider/OfferSections.test.js`

**Interfaces:**
- Consumes: `{ token, emphasis }` (da Task 1/4). `offerData` = `{ start: {price:'390 €', servizi:[...]}, partnership:{price:'2.990 €', servizi:[...]} }`.
- Produces: due sezioni lunghe con servizi inclusi; prezzi reali; copy credito ("i €390 si riscalano"); ordine/enfasi da `emphasis.hero`; CTA che chiamano gli handler di Task 7.

**⚠️ Servizi inclusi:** ricavare le liste dai testi commerciali reali (contratto/listino) — NON inventare voci di servizio. Se non c'è una fonte strutturata, `offerData.js` diventa la fonte, popolata dai contenuti reali (da confermare con Claudio in review).

- [ ] **Step 1: Write the failing test**

```js
import React from 'react';
import { render, screen } from '@testing-library/react';
import OfferSections from './OfferSections';

test('prezzi reali + copy credito; niente prezzo inventato', () => {
  render(<OfferSections token="t" emphasis={{ hero: 'partnership', startPreamble: false }} />);
  expect(screen.getByText(/390\s*€/)).toBeTruthy();
  expect(screen.getByText(/2\.990\s*€/)).toBeTruthy();
  expect(screen.getByText(/si riscalano|credito/i)).toBeTruthy();
});
test('enfasi Start-preambolo per i tiepidi', () => {
  const { container } = render(<OfferSections token="t" emphasis={{ hero: 'start', startPreamble: true }} />);
  // la sezione Start precede la Partnership nel DOM
  const html = container.innerHTML;
  expect(html.indexOf('390')).toBeLessThan(html.indexOf('2.990'));
});
```

- [ ] **Step 2-4:** fail → implement `offerData.js` (prezzi reali) + `OfferSections` (ordina per `emphasis`, rende servizi, CTA Start/Partnership) → PASS.
- [ ] **Step 5: Commit** (`feat(insider): dual offer sections with real prices and credit copy`).

---

### Task 7: Wiring checkout — Start (`start_checkout`) + Partnership (accetta→pagamento)

**Files:**
- Modify: `frontend/src/ciak/insider/OfferSections.jsx` (handler CTA)
- Create: `frontend/src/ciak/insider/ContractAccept.jsx` (+ test)
- Test: `frontend/src/ciak/insider/ContractAccept.test.js`, aggiornare `OfferSections.test.js`

**⚠️ Prima:** verificare la firma reale di `start_checkout` (`grep -n "def start_checkout" backend/routers/ciak_clients.py` e i parametri body/URL) e adeguare la chiamata.

**Interfaces:**
- Start CTA → `POST` (o redirect) verso l'endpoint reale `start_checkout` → redirect a Stripe.
- Partnership CTA → `POST /api/proposta/:token/accetta` → mostra `ContractAccept` → al submit (checkbox spuntato) `POST /api/proposta/:token/firma-contratto {clausole_vessatorie_approved:true, consenso_checkbox:true}` poi `POST /api/proposta/:token/pagamento-stripe` → redirect a Stripe.

- [ ] **Step 1: Write the failing test** (`ContractAccept`)

```js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContractAccept from './ContractAccept';

test('il CTA pagamento è disabilitato finché il checkbox non è spuntato', () => {
  const onConfirm = jest.fn();
  render(<ContractAccept contractUrl="/c.pdf" onConfirm={onConfirm} />);
  const btn = screen.getByRole('button', { name: /paga|procedi/i });
  expect(btn.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(btn.disabled).toBe(false);
  fireEvent.click(btn);
  expect(onConfirm).toHaveBeenCalled();
});
test('il link al contratto è presente', () => {
  render(<ContractAccept contractUrl="/c.pdf" onConfirm={() => {}} />);
  expect(screen.getByRole('link', { name: /contratto|condizioni/i }).getAttribute('href')).toBe('/c.pdf');
});
```

- [ ] **Step 2-4:** fail → implement `ContractAccept` (checkbox + testo piccolo + link; bottone gated) e i due handler in `OfferSections` (fetch mockato nei test) → PASS.
- [ ] **Step 5:** test wiring in `OfferSections.test.js`: Start CTA chiama l'endpoint start; Partnership CTA chiama `accetta` poi (dopo consenso) `firma-contratto`+`pagamento-stripe` (assert su `fetch.mock.calls`).
- [ ] **Step 6: Commit** (`feat(insider): checkout wiring — Start + Partnership with contract acceptance`).

---

### Task 8: Esporre il contratto firmato nei Materiali partner

**Files:**
- Modify: `frontend/src/ciak/partner/sections/PartnerFilesPage.jsx` (effect che costruisce `files`)
- Test: `frontend/src/ciak/partner/sections/PartnerFilesPage.test.js` (estendere)

**Interfaces:**
- Consumes: `/api/contract/pdf-download/{partnerId}` (URL del PDF firmato) — presente se il partner ha `contract_signed`.
- Produces: nella lista `files` compare una voce "Contratto firmato" (cartella `brand_kit` o nuova `contratti`) con `url = /api/contract/pdf-download/{partnerId}` quando esiste.

**⚠️ Prima:** confermare come sapere se il contratto esiste (campo partner `contract_signed`, o `GET /api/contract/pdf/{id}` che risponde 200). Preferire un check già disponibile nei dati partner per non aggiungere fetch.

- [ ] **Step 1: Write the failing test** — estendere il test autenticato esistente: con partner che ha `contract_signed`, la voce "Contratto firmato" compare e il suo Scarica chiama `/api/contract/pdf-download/...`.
- [ ] **Step 2-4:** fail → nell'effect di `PartnerFilesPage`, se il partner risulta con contratto firmato, `push` della voce contratto in `reali` → PASS.
- [ ] **Step 5: Commit** (`feat(partner): show the signed contract PDF in Materiali`).

---

### Task 9: Verifica visiva + build di produzione

**Files:** nessuno nuovo (verifica).

- [ ] **Step 1:** aggiungere una route/preview per `/insider/:token` con dati demo (riusare il pattern `preview/sereno`), oppure verificare in-app.
- [ ] **Step 2:** `node preview/sereno/build.cjs` (se la pagina è nel preview) e screenshot delle sezioni + stato "checkbox gate".
- [ ] **Step 3:** build di produzione: `cd frontend && REACT_APP_PARTNER_SERENO=true GENERATE_SOURCEMAP=false CI=false node node_modules/@craco/craco/dist/bin/craco.js build` → exit 0, nessun warning dai file insider.
- [ ] **Step 4:** aggiungere i test frontend insider alla lista CI (`.github/workflows/ci.yml` riga ~169).
- [ ] **Step 5: Commit** (`chore(insider): wire insider tests into CI + build verified`).

---

## Note di esecuzione

- Ogni task ⚠️ richiede una verifica di nome/firma reale PRIMA di scrivere il codice (no-guessing): `start_checkout`, la collection dell'analisi, il check "contratto esiste". Sono segnalate nei task.
- **NON** accendere la pagina su pagamenti reali prima del **gate legale** (recesso + testo contratto) — è fuori piano, decisione Claudio.
- La pagina è pubblica-a-token: nessun `PARTNER_SERENO_ENABLED` gate (quello riguarda solo l'area partner post-acquisto).

## Self-review (coperto)

- Spec §3 (sales page lunga, doppia offerta, prezzi reali, credito) → Task 4,5,6.
- Spec §3.4 + §5 (contratto stile banca, PDF in Materiali) → Task 3,7,8.
- Spec §4 (personalizzazione da scoring) → Task 1,2,4.
- Spec §5 gate legale → fuori piano, dichiarato (Global Constraints + Note).
- Spec §8 (stati onesti) → Task 4 (+ pattern ripreso ovunque).
- Video/Telegram (asset di Claudio) → Task 5 (slot/CTA condizionali).
