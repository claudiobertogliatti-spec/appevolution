# Piano di implementazione — Funnel pubblico Ciak

> Eseguire con sviluppo subagent-driven, un task alla volta, TDD e review separata. Base minima: `871ade85`; prima di ogni task riallinearsi alla `origin/main` corrente senza sovrascrivere lavoro parallelo.

**Obiettivo:** consegnare la FASE 2 del funnel definitivo: `/masterclass` acquisisce Nome + Email, `/masterclass/guarda` mostra il video, `/blueprint` vende l'analisi a 27 € e tutti i sistemi emettono URL canonici.

**Vincoli:** non modificare `frontend/src/ciak/pages/Landing.jsx` (lane Claude FASE 3); usare soltanto Metodo EVO; nessun claim “14 mesi”; nessun risultato o scarsità non verificati; preservare consenso marketing e deduplica Pixel/CAPI.

## Task 1 — Contratti puri di routing e attribuzione

**File:**

- Create/modify: `frontend/src/ciak/lib/funnelRouting.js`
- Create/modify: `frontend/src/ciak/lib/funnelRouting.test.js`

**TDD:** scrivere prima test che fissano:

- `blueprintBridgeUrl()` → `/blueprint?source=masterclass_optin`;
- riconoscimento esclusivo di `source=masterclass_optin`;
- skip URL → `/masterclass/guarda`;
- whitelist attribution: `direct`, `masterclass_optin`, `retargeting`;
- fallback a `direct` per valori arbitrari.

Implementare il minimo necessario e far passare il test mirato.

**Verifica:** test mirato PASS, nessun riferimento nuovo a `/ciak-blueprint`.

## Task 2 — Separare landing e contenuto Masterclass

**File:**

- Create: `frontend/src/ciak/pages/MasterclassLanding.jsx`
- Modify: `frontend/src/ciak/pages/Masterclass.jsx`
- Modify: `frontend/src/ciak/CiakApp.jsx`
- Create/modify: test React delle due route/componenti

**Comportamento:**

- `/masterclass` monta `MasterclassLanding`;
- `/masterclass/guarda` monta il contenuto video esistente;
- eliminare dal contenuto video stato, validazione e campo telefono del vecchio gate;
- conservare video YouTube, timer/fine-video e CTA alle 8 Domande;
- l'accesso diretto a `/masterclass/guarda` funziona anche dal link email.

**Copy landing:** implementare hero e struttura definiti nella spec. Il modulo in hero e quello finale condividono Nome + Email e la stessa funzione di submit. Includere professionisti con corso già costruito ma fermo.

**TDD minimo:**

- la landing mostra Nome ed Email ma nessun input telefono;
- il viewer mostra il video e non mostra il form;
- la route `/masterclass/guarda` non rimanda alla landing.

## Task 3 — Migrare la cattura Lead sulla nuova landing

**File:**

- Modify: `frontend/src/ciak/pages/MasterclassLanding.jsx`
- Reuse: `frontend/src/ciak/lib/metaPixel.js`
- Create/modify: test di submit

**Comportamento atomico:**

1. validare Nome + Email e bloccare domini non deliverable già noti;
2. generare un `event_id` condiviso;
3. inviare `/api/ciak/lead-capture` con UTM, referrer, `_fbp`, `_fbc`, consenso e `event_source_url` corrente;
4. emettere `trackLead(event_id)` soltanto se la risposta backend è `ok`;
5. salvare le chiavi localStorage compatibili;
6. navigare a `/blueprint?source=masterclass_optin` soltanto dopo risposta positiva;
7. su errore backend mostrare errore e consentire retry, senza contare il Lead.

Il payload usa `telefono: ""` e una sorgente canonica nuova, per esempio `masterclass_landing`, concordata con i test/backend esistenti.

**TDD minimo:** successo, errore backend, email finta, doppio click disabilitato, consenso marketing assente.

## Task 4 — Bridge post-opt-in e copy Blueprint

**File:**

- Modify: `frontend/src/ciak/pages/CiakBlueprint.jsx`
- Create/modify: test React Blueprint

**Comportamento:**

- mostrare il bridge solo con `source=masterclass_optin`;
- copy: “Iscrizione completata. La masterclass è pronta.” e riferimento al Metodo EVO;
- CTA primaria acquisto a 27 €;
- CTA secondaria evidente `Non ora, guarda la masterclass` → `/masterclass/guarda`;
- tracciare `BlueprintBridgeView` una sola volta per visita e `BlueprintCheckoutStart` al click;
- mantenere `/blueprint` diretto privo di bridge.

**Copy pagina:** applicare hero, blocchi problema/decisioni/deliverable, esito potenzialmente negativo, per chi/non per chi, Claudio creatore di Ciak e Metodo EVO, garanzia e FAQ. Non inserire claim numerici non verificati né “14 mesi”.

**Accessibilità:** entrambe le azioni bridge sono raggiungibili da tastiera, con focus visibile e gerarchia chiara.

## Task 5 — Canonicalizzare checkout, CAPI e link applicativi

**File probabili da verificare prima di modificare:**

- `backend/routers/checkout.py`
- relativi test backend checkout/CAPI
- eventuali template email o link interni trovati con ricerca repository

**Prima dell'edit:** cercare tutte le occorrenze applicative di `/ciak-blueprint`, distinguendo redirect legacy/documentazione da URL emessi dal sistema.

**Backend:**

- success → `/blueprint/grazie?session_id={CHECKOUT_SESSION_ID}`;
- cancel → `/blueprint?from=cancel`;
- purchase `event_source_url` → `/blueprint/grazie`;
- metadata `attribution_source` solo da whitelist, fallback `direct`.

**TDD minimo:** URL Stripe canonici, sorgente valida preservata, sorgente arbitraria normalizzata, CAPI canonical URL. I redirect legacy in `CiakApp.jsx` e `vercel.json` devono restare.

## Task 6 — Audit di coerenza e regressioni

**Controlli statici:**

- nessun `Metodo Ciak` nei file pubblici interessati;
- nessun claim `14 mesi`;
- nessun telefono in `/masterclass`;
- nessun URL `/ciak-blueprint` emesso da frontend/backend/email, eccetto redirect legacy e documentazione storica esplicita;
- nessuna modifica a `Landing.jsx`.

**Test:**

- suite frontend mirata;
- suite backend mirata;
- build produzione con `DISABLE_ESLINT_PLUGIN=true CI=false npm run build`;
- controllo diff e status pulito.

## Task 7 — Verifica browser e handoff a Claude

Verificare almeno:

1. `/masterclass` desktop/mobile, validazione e retry;
2. opt-in reale controllato → `/blueprint?source=masterclass_optin`;
3. bridge acquisto e skip → `/masterclass/guarda`;
4. `/masterclass/guarda` accessibile direttamente e video funzionante;
5. `/blueprint` diretto senza bridge;
6. success/cancel checkout canonici in ambiente sicuro;
7. redirect legacy senza catene;
8. Pixel/CAPI Lead deduplicabile e non emesso su risposta fallita.

Dopo verifica live del Lead, comunicare a Claude il commit finale e il via libera per la FASE 3: nuova vetrina `/` e SEO multi-shell. La rimozione del form dalla home avverrà in quella fase, non in questa branch.

## Definition of Done

- tutti i criteri della spec sono soddisfatti;
- ogni task ha implementazione, review di conformità e review qualità;
- review finale dell'intero diff completata;
- nessuna modifica parallela persa;
- branch pronta per integrazione secondo `superpowers:finishing-a-development-branch`.
