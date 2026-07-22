# Masterclass + Ciak Blueprint Direct Response Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare la landing Masterclass e la landing Ciak Blueprint in un funnel a cascata misurabile, con copy più diretto, bridge post-opt-in non coercitivo e attribuzione separata.

**Architecture:** La landing `/` continua a catturare il Lead, ma dopo una risposta backend positiva naviga a `/ciak-blueprint?source=masterclass_optin`. Un helper puro centralizza le decisioni di routing; la pagina Blueprint rileva la sorgente, mostra un bridge accessibile e conserva il checkout esistente. Pixel/CAPI e metadata Stripe distinguono lead, bridge e traffico diretto.

**Tech Stack:** React 19, React Router, Tailwind CSS, Jest/CRACO, FastAPI, Pydantic, Stripe Checkout, Meta Pixel/CAPI.

## Global Constraints

- Dominio applicativo: `https://www.ciak.io`; non usare `app.evolution-pro.it`.
- Masterclass: accesso realmente gratuito e pulsante evidente per saltare il Blueprint.
- Blueprint: prezzo fisso 27 € IVA inclusa; checkout e pagina grazie esistenti restano operativi.
- Tono: diretto, italiano semplice, anti-fuffa; vietati risultati inventati, guru-speak, countdown e scarsità artificiale.
- Claudio è presentato come `Claudio Bertogliatti, creatore del Metodo Ciak`.
- Evolution esiste da 14 mesi; questa informazione appare soltanto nella sezione fiducia/FAQ.
- Gli eventi Meta browser e server rispettano il consenso marketing esplicito.
- Non modificare il contenuto video della masterclass, il prezzo o il system prompt di Matteo.
- Fonte design: `docs/superpowers/specs/2026-07-22-masterclass-blueprint-direct-response-design.md`.

---

## File map

- Create: `frontend/src/ciak/lib/funnelRouting.js` — routing puro e nomi sorgente.
- Create: `frontend/src/ciak/lib/funnelRouting.test.js` — test Jest del routing.
- Create: `frontend/src/ciak/components/BlueprintBridge.jsx` — bridge post-opt-in presentazionale.
- Create: `frontend/src/ciak/components/BlueprintBridge.test.jsx` — rendering statico del bridge.
- Modify: `frontend/src/ciak/pages/Landing.jsx` — copy Masterclass e redirect post-opt-in.
- Modify: `frontend/src/ciak/pages/CiakBlueprint.jsx` — copy Blueprint, bridge e sorgente checkout.
- Modify: `frontend/src/ciak/lib/metaPixel.js` — eventi di misurazione bridge.
- Modify: `backend/routers/checkout.py` — persistenza `attribution_source` nei metadata Stripe.
- Modify: `backend/tests/test_checkout_trigger.py` — test metadata e prezzo.

---

### Task 1: Centralizzare il routing del funnel

**Files:**
- Create: `frontend/src/ciak/lib/funnelRouting.js`
- Create: `frontend/src/ciak/lib/funnelRouting.test.js`

**Interfaces:**
- Produces: `BLUEPRINT_SOURCES`, `blueprintBridgeUrl()`, `isMasterclassOptin(search)`, `blueprintAttributionSource(search)`.
- Consumes: stringhe query nel formato `window.location.search`.

- [ ] **Step 1: Scrivere il test fallente**

```js
import {
  BLUEPRINT_SOURCES,
  blueprintAttributionSource,
  blueprintBridgeUrl,
  isMasterclassOptin,
} from "./funnelRouting";

describe("funnelRouting", () => {
  test("costruisce il bridge post-opt-in", () => {
    expect(blueprintBridgeUrl()).toBe("/ciak-blueprint?source=masterclass_optin");
  });

  test("riconosce soltanto la sorgente masterclass_optin", () => {
    expect(isMasterclassOptin("?source=masterclass_optin")).toBe(true);
    expect(isMasterclassOptin("?source=retargeting")).toBe(false);
    expect(isMasterclassOptin("")).toBe(false);
  });

  test("normalizza la sorgente per il checkout", () => {
    expect(blueprintAttributionSource("?source=masterclass_optin")).toBe(
      BLUEPRINT_SOURCES.MASTERCLASS_OPTIN,
    );
    expect(blueprintAttributionSource("?source=retargeting")).toBe(
      BLUEPRINT_SOURCES.RETARGETING,
    );
    expect(blueprintAttributionSource("?source=qualunque-cosa")).toBe(
      BLUEPRINT_SOURCES.DIRECT,
    );
  });
});
```

- [ ] **Step 2: Verificare che il test fallisca**

Run:

```powershell
cd frontend
npm test -- --watchAll=false --runTestsByPath src/ciak/lib/funnelRouting.test.js
```

Expected: FAIL perché `./funnelRouting` non esiste.

- [ ] **Step 3: Implementare l'helper minimo**

```js
export const BLUEPRINT_SOURCES = Object.freeze({
  DIRECT: "direct",
  MASTERCLASS_OPTIN: "masterclass_optin",
  RETARGETING: "retargeting",
});

export function blueprintBridgeUrl() {
  return `/ciak-blueprint?source=${BLUEPRINT_SOURCES.MASTERCLASS_OPTIN}`;
}

export function isMasterclassOptin(search = "") {
  return new URLSearchParams(search).get("source") === BLUEPRINT_SOURCES.MASTERCLASS_OPTIN;
}

export function blueprintAttributionSource(search = "") {
  const source = new URLSearchParams(search).get("source");
  return Object.values(BLUEPRINT_SOURCES).includes(source)
    ? source
    : BLUEPRINT_SOURCES.DIRECT;
}
```

- [ ] **Step 4: Eseguire il test e verificare PASS**

Run lo stesso comando dello Step 2.

Expected: 3 test PASS, 0 FAIL.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/ciak/lib/funnelRouting.js frontend/src/ciak/lib/funnelRouting.test.js
git commit -m "test(ciak): definisci routing funnel a cascata"
```

---

### Task 2: Portare l'opt-in al bridge solo dopo cattura valida

**Files:**
- Modify: `frontend/src/ciak/pages/Landing.jsx`
- Test: `frontend/src/ciak/lib/funnelRouting.test.js`

**Interfaces:**
- Consumes: `blueprintBridgeUrl()` dal Task 1; `captureResponse.ok`; `trackLead(eventId)`.
- Produces: redirect post-opt-in stabile e nessun falso evento Lead su risposta backend non valida.

- [ ] **Step 1: Estendere il test del contratto URL**

Aggiungere a `funnelRouting.test.js`:

```js
test("il bridge mantiene una singola destinazione canonica", () => {
  const url = new URL(blueprintBridgeUrl(), "https://www.ciak.io");
  expect(url.pathname).toBe("/ciak-blueprint");
  expect(url.searchParams.get("source")).toBe("masterclass_optin");
});
```

- [ ] **Step 2: Eseguire il test**

Run il comando del Task 1.

Expected: 4 test PASS.

- [ ] **Step 3: Modificare `captureEmail`**

Importare:

```js
import { blueprintBridgeUrl } from "../lib/funnelRouting";
```

Dopo il `fetch`, rifiutare esplicitamente risposte non valide:

```js
if (!captureResponse?.ok) {
  throw new Error("lead_capture_failed");
}

trackLead(leadEventId);
localStorage.setItem("ciak_lead_email", e);
localStorage.setItem("ciak_lead_name", n);
localStorage.setItem("ciak_lead_nome", n);
navigate(blueprintBridgeUrl());
```

Rimuovere il vecchio `navigate("/masterclass")` e il wrapper `try/catch` interno attorno a `trackLead`: la funzione è già un no-op senza consenso.

- [ ] **Step 4: Verificare test e build**

```powershell
cd frontend
npm test -- --watchAll=false --runTestsByPath src/ciak/lib/funnelRouting.test.js
$env:CI='false'; $env:DISABLE_ESLINT_PLUGIN='true'; npm run build
```

Expected: test PASS; build exit 0.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/ciak/pages/Landing.jsx frontend/src/ciak/lib/funnelRouting.test.js
git commit -m "feat(ciak): porta opt-in Masterclass al Blueprint"
```

---

### Task 3: Creare il bridge post-opt-in accessibile

**Files:**
- Create: `frontend/src/ciak/components/BlueprintBridge.jsx`
- Create: `frontend/src/ciak/components/BlueprintBridge.test.jsx`
- Modify: `frontend/src/ciak/pages/CiakBlueprint.jsx`

**Interfaces:**
- Consumes: boolean `visible`, callback `onSkip`, callback `onBuy`.
- Produces: `BlueprintBridge({ visible, onSkip, onBuy })` senza dipendenze da router o window.

- [ ] **Step 1: Scrivere il test fallente**

```jsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BlueprintBridge } from "./BlueprintBridge";

test("non renderizza nulla fuori dal percorso post-opt-in", () => {
  expect(renderToStaticMarkup(<BlueprintBridge visible={false} />)).toBe("");
});

test("mostra conferma, acquisto e accesso gratuito", () => {
  const html = renderToStaticMarkup(
    <BlueprintBridge visible onBuy={() => {}} onSkip={() => {}} />,
  );
  expect(html).toContain("Iscrizione completata");
  expect(html).toContain("Analizziamo il mio progetto");
  expect(html).toContain("Non ora, guarda la masterclass");
});
```

- [ ] **Step 2: Verificare FAIL**

```powershell
cd frontend
npm test -- --watchAll=false --runTestsByPath src/ciak/components/BlueprintBridge.test.jsx
```

Expected: FAIL perché il componente non esiste.

- [ ] **Step 3: Implementare il componente**

```jsx
export function BlueprintBridge({ visible, onBuy, onSkip }) {
  if (!visible) return null;
  return (
    <section className="border-b border-yellow-200 bg-yellow-50" aria-label="Accesso Masterclass confermato">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <p className="text-sm font-semibold text-slate-950">Iscrizione completata. La masterclass è pronta.</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
          Se vuoi andare oltre la teoria, possiamo applicare subito il Metodo Ciak al tuo progetto.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onBuy} className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-yellow-300">
            Analizziamo il mio progetto — 27 €
          </button>
          <button type="button" onClick={onSkip} className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800">
            Non ora, guarda la masterclass
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Collegare il bridge alla pagina**

In `CiakBlueprint.jsx`:

```jsx
import { BlueprintBridge } from "../components/BlueprintBridge";
import { isMasterclassOptin } from "../lib/funnelRouting";

const isBridge = isMasterclassOptin(window.location.search);
```

Renderizzare subito dopo `CiakHeader`:

```jsx
<BlueprintBridge
  visible={isBridge}
  onBuy={startCheckout}
  onSkip={() => window.location.assign("/masterclass")}
/>
```

- [ ] **Step 5: Eseguire test e build**

```powershell
cd frontend
npm test -- --watchAll=false --runTestsByPath src/ciak/components/BlueprintBridge.test.jsx src/ciak/lib/funnelRouting.test.js
$env:CI='false'; $env:DISABLE_ESLINT_PLUGIN='true'; npm run build
```

Expected: tutti i test PASS; build exit 0.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/ciak/components/BlueprintBridge.jsx frontend/src/ciak/components/BlueprintBridge.test.jsx frontend/src/ciak/pages/CiakBlueprint.jsx
git commit -m "feat(ciak): aggiungi bridge Blueprint post opt-in"
```

---

### Task 4: Implementare il copy Masterclass approvato

**Files:**
- Modify: `frontend/src/ciak/pages/Landing.jsx`

**Interfaces:**
- Consumes: form e handler esistenti; video esistente; CTA unica.
- Produces: landing Masterclass conforme alla sezione 6 della spec.

- [ ] **Step 1: Sostituire il blocco hero**

Usare esattamente:

```jsx
<p className="text-xs font-semibold uppercase tracking-widest text-yellow-700">
  Masterclass gratuita · 30 minuti
</p>
<h1 className="mt-4 max-w-6xl text-5xl font-semibold leading-[0.98] tracking-tight text-slate-950 md:text-7xl">
  Da competenza o corso fermo a un'offerta digitale che il mercato può capire e acquistare.
</h1>
<p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700 md:text-xl">
  Scopri perché partire dalle lezioni, dalla piattaforma o dai contenuti può bloccare il progetto prima ancora della vendita — e quali decisioni chiarire prima di investire altro tempo.
</p>
```

CTA di entrambi i form:

```jsx
{submitting ? "..." : "Guarda la masterclass gratuita"}
```

Microcopy:

```jsx
<p className="mt-3 text-xs text-slate-500">
  Accesso immediato · Nessuna carta richiesta · Contenuto operativo
</p>
```

- [ ] **Step 2: Riscrivere la sezione problema**

Titolo e apertura:

```jsx
<h2>Il problema non è il corso.</h2>
<p>
  È aver iniziato a costruirlo prima di chiarire cosa vendere, a chi e perché dovrebbero scegliere te.
</p>
```

Renderizzare queste tre card:

```jsx
{[
  {
    title: "Hai una competenza, ma non ancora un'offerta",
    body: "Sai fare bene il tuo lavoro, ma il mercato non vede ancora un problema preciso, un risultato comprensibile e una ragione per scegliere te.",
  },
  {
    title: "Hai già un corso, ma resta fermo",
    body: "Le lezioni esistono, ma manca un collegamento chiaro tra ciò che insegni, il bisogno del pubblico e la decisione di acquisto.",
  },
  {
    title: "Hai contenuti e strumenti, ma non un sistema",
    body: "Social, piattaforma e funnel lavorano separatamente. Produci attività, ma non una strada leggibile verso la vendita.",
  },
].map((item) => (
  <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6">
    <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
    <p className="mt-3 leading-relaxed text-slate-600">{item.body}</p>
  </article>
))}
```

- [ ] **Step 3: Aggiornare contenuti, guida, metodo e FAQ**

Renderizzare le cinque promesse con questo contenuto:

```jsx
{[
  "Perché un buon corso può restare fermo anche quando i contenuti sono validi.",
  "Come riconoscere un problema che il mercato considera davvero prioritario.",
  "Come trasformare competenze e contenuti in un'offerta semplice da capire.",
  "Cosa validare prima di costruire, rilanciare o acquistare altro traffico.",
  "Quale passo scegliere in base alla situazione reale del tuo progetto.",
].map((text) => <li key={text}>{text}</li>)}
```

La bio deve usare questo testo:

```jsx
<h2>Claudio Bertogliatti, creatore del Metodo Ciak</h2>
<p>
  Ho creato il Metodo Ciak dopo aver visto troppi professionisti partire dal punto sbagliato: registrano lezioni, aprono profili e costruiscono funnel prima di avere chiarito cosa vendere, a chi e perché il mercato dovrebbe scegliere loro.
</p>
```

Usare queste FAQ complete:

```js
const masterclassFaq = [
  {
    q: "Ho già un corso: questa masterclass è adatta a me?",
    a: "Sì. Ti aiuta a verificare se il corso comunica un problema prioritario, un pubblico preciso e una ragione concreta per acquistarlo.",
  },
  {
    q: "Non ho ancora un pubblico: posso iniziare?",
    a: "Sì. La masterclass parte dalle decisioni che vengono prima dei contenuti e del traffico: mercato, problema, offerta e posizionamento.",
  },
  {
    q: "È una vendita mascherata?",
    a: "No. La masterclass è gratuita e puoi guardarla senza acquistare il Blueprint. Alla fine sarai tu a decidere se approfondire il tuo progetto.",
  },
  {
    q: "Quanto dura e cosa ricevo?",
    a: "Dura circa 30 minuti. Ricevi il quadro con cui esaminare il progetto e, al termine, puoi rispondere alle 8 Domande Ciak.",
  },
];
```

- [ ] **Step 4: Verificare le stringhe vietate e la build**

```powershell
Select-String -LiteralPath frontend/src/ciak/pages/Landing.jsx -Pattern 'rivoluzionario','guadagni automatici','posti limitati','countdown' -CaseSensitive:$false
cd frontend
$env:CI='false'; $env:DISABLE_ESLINT_PLUGIN='true'; npm run build
```

Expected: nessuna stringa vietata; build exit 0.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/ciak/pages/Landing.jsx
git commit -m "copy(ciak): rafforza landing Masterclass"
```

---

### Task 5: Implementare copy Blueprint, tracking bridge e attribuzione Stripe

**Files:**
- Modify: `frontend/src/ciak/pages/CiakBlueprint.jsx`
- Modify: `frontend/src/ciak/lib/metaPixel.js`
- Modify: `backend/routers/checkout.py`
- Modify: `backend/tests/test_checkout_trigger.py`

**Interfaces:**
- Consumes: `attributionSource` dal Task 3.
- Produces: `trackBlueprintBridgeView()`, `trackBlueprintBridgeSkip()`, metadata Stripe `attribution_source`.

- [ ] **Step 1: Scrivere il test backend fallente**

Nel test che cattura `stripe.checkout.Session.create`, aggiungere:

```python
request = CreateSessionRequest(
    product="ciak_blueprint",
    source="masterclass_optin",
    email="lead@example.com",
    origin_url="https://www.ciak.io",
)
response = await checkout.create_checkout_session(request, request=None)

assert captured["kwargs"]["line_items"][0]["price_data"]["unit_amount"] == 2700
assert captured["kwargs"]["metadata"]["attribution_source"] == "masterclass_optin"
```

- [ ] **Step 2: Eseguire e verificare FAIL**

```powershell
& 'C:\Users\berto\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pytest backend/tests/test_checkout_trigger.py -q
```

Expected: FAIL su `attribution_source` mancante. Se `python` è lo Store alias, usare il runtime Python configurato dal workspace.

- [ ] **Step 3: Salvare la sorgente consentita nei metadata Stripe**

In `checkout.py`:

```python
ALLOWED_ATTRIBUTION_SOURCES = {"direct", "masterclass_optin", "retargeting"}

attribution_source = (
    payload.source if payload.source in ALLOWED_ATTRIBUTION_SOURCES else "direct"
)
metadata: dict = {
    "tipo": "ciak_blueprint",
    "stato": str(payload.stato),
    "attribution_source": attribution_source,
}
```

- [ ] **Step 4: Passare la sorgente dal frontend**

In `CiakBlueprint.jsx` aggiornare l'import React e gli helper:

```jsx
import { useEffect, useState } from "react";
import { blueprintAttributionSource } from "../lib/funnelRouting";
import {
  trackBlueprintBridgeSkip,
  trackBlueprintBridgeView,
  trackInitiateCheckout,
} from "../lib/metaPixel";

const attributionSource = blueprintAttributionSource(window.location.search);
```

Nel payload checkout:

```js
body: JSON.stringify({
  product: "ciak_blueprint",
  source: attributionSource,
  email,
  session_token: sessionToken,
  origin_url: window.location.origin,
}),
```

Collegare la misurazione al bridge:

```jsx
useEffect(() => {
  if (isBridge) trackBlueprintBridgeView();
}, [isBridge]);

<BlueprintBridge
  visible={isBridge}
  onBuy={startCheckout}
  onSkip={() => {
    trackBlueprintBridgeSkip();
    window.location.assign("/masterclass");
  }}
/>
```

- [ ] **Step 5: Aggiungere gli eventi bridge**

In `metaPixel.js`:

```js
export function trackBlueprintBridgeView() {
  if (!isReady()) return;
  window.fbq("trackCustom", "BlueprintBridgeView", { source: "masterclass_optin" });
}

export function trackBlueprintBridgeSkip() {
  if (!isReady()) return;
  window.fbq("trackCustom", "BlueprintBridgeSkip", { destination: "masterclass" });
}
```

- [ ] **Step 6: Applicare il copy Blueprint**

Hero esatto:

```jsx
<p>Ciak Blueprint · Analisi strategica individuale</p>
<h1>Prima di costruire o rilanciare il tuo corso, scopri se l'offerta sta in piedi.</h1>
<p>
  In 60 minuti analizziamo pubblico, problema, posizionamento e offerta. Entro 72 ore ricevi una roadmap concreta: cosa correggere, cosa costruire e quale passo fare per primo.
</p>
<button onClick={startCheckout}>Voglio il mio Blueprint — 27 €</button>
<p>Pagamento unico · IVA inclusa · Rimborso se non ricevi una direzione utile</p>
```

Renderizzare le sezioni nell'ordine seguente usando questi contenuti:

```js
const blueprintDecisions = [
  "Cosa puoi vendere realmente partendo dalla tua competenza.",
  "Quale pubblico riconosce il problema e lo considera prioritario.",
  "Come rendere l'offerta comprensibile prima di produrre altro.",
  "Perché il mercato dovrebbe scegliere te invece delle alternative.",
];

const blueprintDeliverables = [
  { title: "8 Domande Ciak", body: "Raccogliamo esperienza, pubblico, problema, offerta e risorse prima della sessione." },
  { title: "Sessione individuale di 60 minuti", body: "Claudio lavora sul tuo caso: non è un webinar registrato né una call commerciale mascherata." },
  { title: "Analisi specifica del mercato", body: "Valutiamo categoria, alternative, domanda, posizionamento e sostenibilità della proposta." },
  { title: "Roadmap entro 72 ore", body: "Ricevi priorità, correzioni e prossimi passi: sai cosa fare e cosa non costruire ancora." },
];

const blueprintAudience = {
  forYou: [
    "Hai una competenza professionale reale.",
    "Vuoi trasformarla in un'offerta digitale o rilanciare un corso fermo.",
    "Sei disposto a mettere alla prova le tue ipotesi.",
    "Cerchi una direzione operativa, non motivazione.",
  ],
  notForYou: [
    "Cerchi una formula per guadagnare senza esperienza o lavoro.",
    "Vuoi soltanto sentirti confermare che la tua idea è perfetta.",
    "Pensi che un'ora possa sostituire l'esecuzione.",
    "Vuoi partire con ads e funnel senza chiarire prima l'offerta.",
  ],
};

const blueprintFaq = [
  { q: "È una call commerciale?", a: "No. Analizziamo il progetto e produciamo una roadmap. Se Ciak può aiutarti anche nell'esecuzione, te lo diremo senza obblighi." },
  { q: "Devo avere già un corso?", a: "No. Puoi partire da una competenza, un metodo professionale o un'offerta già esistente che non sta vendendo." },
  { q: "Sono obbligato a entrare nella Partnership?", a: "No. Il Blueprint ha valore autonomo e non crea obblighi successivi." },
  { q: "Cosa succede dopo il pagamento?", a: "Accedi alle 8 Domande Ciak e prenoti la sessione nel primo slot disponibile." },
];
```

Fra `blueprintDeliverables` e `blueprintAudience` inserire:

```jsx
<aside className="rounded-2xl border border-yellow-300 bg-yellow-50 p-6 text-slate-900">
  L'analisi può anche concludere che l'idea non sia ancora pronta. Meglio scoprirlo con 27 € che dopo mesi di produzione.
</aside>
```

Dopo la sezione fiducia inserire la garanzia:

```jsx
<h2>Se non ricevi una direzione utile, ti restituiamo i 27 €.</h2>
<p>
  Al termine della sessione, se il Blueprint non ti ha dato maggiore chiarezza e un prossimo passo concreto, puoi richiedere il rimborso integrale.
</p>
```

La sezione Claudio deve usare lo stesso blocco approvato della Masterclass:

```jsx
<h2>Claudio Bertogliatti, creatore del Metodo Ciak</h2>
<p>
  Ho creato il Metodo Ciak dopo aver visto troppi professionisti partire dal punto sbagliato: registrano lezioni, aprono profili e costruiscono funnel prima di avere chiarito cosa vendere, a chi e perché il mercato dovrebbe scegliere loro.
</p>
```

Testo fiducia esatto:

```text
Evolution esiste da 14 mesi e i primi partner stanno completando il loro percorso di costruzione e lancio. Per questo non mostriamo risultati prematuri o testimonianze gonfiate. Ti mostriamo il processo, il lavoro reale e ciò che puoi valutare concretamente prima di decidere.
```

- [ ] **Step 7: Verificare test backend, frontend e build**

```powershell
& 'C:\Users\berto\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pytest backend/tests/test_checkout_trigger.py -q
cd frontend
npm test -- --watchAll=false --runTestsByPath src/ciak/components/BlueprintBridge.test.jsx src/ciak/lib/funnelRouting.test.js
$env:CI='false'; $env:DISABLE_ESLINT_PLUGIN='true'; npm run build
```

Expected: tutti i test PASS; build exit 0.

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/ciak/pages/CiakBlueprint.jsx frontend/src/ciak/lib/metaPixel.js backend/routers/checkout.py backend/tests/test_checkout_trigger.py
git commit -m "feat(ciak): completa funnel Blueprint tracciato"
```

---

### Task 6: Verifica end-to-end e rilascio controllato

**Files:**
- Modify only if verification reveals a defect in the files listed above.

**Interfaces:**
- Consumes: funnel completo Tasks 1–5.
- Produces: evidenza PASS/FAIL prima della campagna Meta.

- [ ] **Step 1: Eseguire la suite mirata fresca**

```powershell
cd frontend
npm test -- --watchAll=false --runTestsByPath src/ciak/components/BlueprintBridge.test.jsx src/ciak/lib/funnelRouting.test.js
$env:CI='false'; $env:DISABLE_ESLINT_PLUGIN='true'; npm run build
cd ..
& 'C:\Users\berto\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pytest backend/tests/test_checkout_trigger.py -q
git diff --check
```

Expected: 0 test falliti; build exit 0; `git diff --check` senza output.

- [ ] **Step 2: Verificare manualmente in locale/mobile**

Controllare a 390 px e desktop:

```text
/ -> opt-in -> /ciak-blueprint?source=masterclass_optin
Bridge: entrambe le CTA visibili senza scroll
Non ora -> /masterclass
/ciak-blueprint -> nessun bridge
CTA Blueprint -> checkout Stripe a 27 €
Nessun overflow orizzontale
```

- [ ] **Step 3: Pubblicare solo i file del piano**

```powershell
git status --short
git push origin main
```

Non includere file concorrenti o non tracciati estranei al funnel.

- [ ] **Step 4: Verificare il deploy live**

Su `https://www.ciak.io` verificare:

```text
Landing Masterclass nuova live
Opt-in reale salvato nel CRM
Email Masterclass ricevuta
Bridge Blueprint mostrato
Skip verso Masterclass funzionante
Checkout 27 € raggiungibile
```

In Meta Events Manager verificare, con consenso marketing accettato:

```text
Lead ricevuto
Event ID browser/CAPI deduplicato
BlueprintBridgeView ricevuto
InitiateCheckout ricevuto
Purchase verificato solo con un pagamento reale autorizzato
```

- [ ] **Step 5: Test consenso rifiutato**

Con consenso marketing rifiutato:

```text
Opt-in e accesso Masterclass funzionano
Nessun Pixel Meta browser caricato
Nessuna CAPI Lead inviata
CRM ed email continuano a funzionare
```

- [ ] **Step 6: Registrare verdetto**

Il report finale deve contenere:

```text
FUNNEL: PASS/FAIL
COPY MASTERCLASS: PASS/FAIL
COPY BLUEPRINT: PASS/FAIL
LEAD PIXEL+CAPI: PASS/FAIL
CHECKOUT 27 EUR: PASS/FAIL
CONSENSO: PASS/FAIL
MOBILE: PASS/FAIL
CAMPAGNA META PRONTA: SI/NO
```

Non dichiarare la campagna pronta se uno dei controlli Lead, checkout o consenso è FAIL.
