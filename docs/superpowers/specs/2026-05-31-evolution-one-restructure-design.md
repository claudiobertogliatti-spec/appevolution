# Evolution One — Restructure Servizi Partner (Accelera la crescita)

**Data:** 2026-05-31
**Stato:** spec approvato per implementazione
**Owner:** Claudio
**Scope:** sezione `Evolution One` della sidebar `ciak.io/partner` — sottosezione `Accelera la crescita`. Fuori scope: `Evolution Growth System` (Foundation/Growth/Scale), pagine fasi EVO, altre aree partner.

## 1. Problema

La sezione `Accelera la crescita` oggi (`frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx`) è strutturata su 4 pilastri (Visibilità, Costanza, Monetizzazione, Direzione) ma è sotto-popolata di contenuti reali:

- Visibilità: 1 solo item (Avatar PRO)
- Costanza: 1 solo item (Gestione Contenuti Mensile €297/mese)
- Monetizzazione: 3 item *tutti in stato "In arrivo"* (Ebook / Audiobook / Audiolezioni). Da fuori sembra una categoria vuota.
- Direzione: 2 consulenze (Claudio €180, Antonella €180)

I 3 placeholder di Monetizzazione hanno una doppia carenza:
1. Non sono attivabili (mancano pricing e delivery)
2. Non rappresentano il vero motivo della categoria: la categoria deve far **vendere di più** il partner sui suoi tre fronti di vendita (corso, prodotti digitali, masterclass), non solo "convertire il corso in altri formati"

L'obiettivo è rendere `Accelera la crescita` un catalogo concreto e acquistabile di **servizi extra durante la partnership Evolution €2.790**, allineato all'obiettivo: portare il partner a vendere il suo corso, i suoi prodotti digitali e la sua masterclass.

## 2. Decisioni di design (locked)

### 2.1 Pilastri concettuali

Mantenuti i 4 pilastri attuali. Monetizzazione è arricchita e — in sidebar — esplosa in 3 sub-link pari livello.

### 2.2 Sidebar `PartnerSidebar.jsx` — struttura finale

```
Evolution One   (header)
├── Accelera la crescita        (collapsible, icon Rocket)
│    ├── Visibilità              → /partner/accelera/acc-visibilita
│    ├── Costanza                → /partner/accelera/acc-costanza
│    ├── Spinta Vendite          → /partner/accelera/acc-spinta-vendite      [NUOVO]
│    ├── Eventi Vendita          → /partner/accelera/acc-eventi-vendita      [NUOVO]
│    ├── Prodotti Digitali       → /partner/accelera/acc-prodotti-digitali   [NUOVO]
│    └── Direzione               → /partner/accelera/acc-direzione
└── Evolution Growth System      (collapsible, icon Layers — invariato)
     └── I tre livelli           → /partner/growth-system
```

Niente sub-nesting a 3 livelli. Le 6 voci sotto `Accelera la crescita` sono pari livello.

### 2.3 Pagina hub `AcceleraCrescitaPage.jsx` — 6 card pilastro

6 card al posto delle 4 attuali. Pattern di card identico (icona, tagline, contatore "N strumenti / M in arrivo").

| Pilastro | Icona lucide | Tone | Tagline |
|---|---|---|---|
| Visibilità | `Eye` | slate | Fatti vedere — anche quando non sei davanti alla camera |
| Costanza | `Repeat` | yellow | Pubblica ogni giorno senza pensarci |
| Spinta Vendite | `TrendingUp` | emerald | Ogni vendita vale di più |
| Eventi Vendita | `Radio` | rose | Trasforma un'ora live in un mese di vendite |
| Prodotti Digitali | `Layers` | indigo | Stesso contenuto, più formati, più ricavi |
| Direzione | `Compass` | blue | Una guida esperta quando ne hai bisogno |

I tone `rose` e `indigo` vanno aggiunti alla mappa `TONE` nel file (oggi sono slate/yellow/emerald/blue).

### 2.4 Catalogo completo (12 item)

| Categoria | Item (label UI) | Categoria stato | Modello | Prezzo | Stripe service ID |
|---|---|---|---|---|---|
| Visibilità | Avatar PRO | attivo | una tantum | €1.490 | `avatar-pro` *(checkout dedicato `AvatarCheckout`)* |
| Visibilità | Gestione Campagne | nuovo | mensile (sconto 30% sul listino) + 10% sulle vendite | €348/mo *(listino €497)* + 10% | `gestione-campagne-mensile` |
| Costanza | Calendario PRO | rinominato (era "Gestione Contenuti Mensile") | mensile | €297/mo | `calendario-pro` *(ID Stripe invariato)* |
| Spinta Vendite | Booster Checkout | nuovo | una tantum | €197 | `booster-checkout` |
| Spinta Vendite | Upsell Post-Acquisto | nuovo | una tantum | €297 | `upsell-post-acquisto` |
| Spinta Vendite | Offerta di Recupero | nuovo | una tantum | €197 | `offerta-di-recupero` |
| Eventi Vendita | Live Promo | nuovo | pacchetti 3 / 6 / 12 | €1.490 / €2.490 / €3.990 | `live-promo-3`, `live-promo-6`, `live-promo-12` |
| Prodotti Digitali | Ebook del Corso | attivato (era "In arrivo") | una tantum | €497 | `ebook-corso` |
| Prodotti Digitali | Audiobook | attivato (era "In arrivo") | una tantum | €697 | `audiobook` |
| Prodotti Digitali | Audiolezioni | attivato (era "In arrivo") | una tantum | €397 | `audiolezioni` |
| Direzione | Strategia con Claudio | rinominato (era "Sessione con Claudio") | pacchetti 1 / 5 / 10 | €180 / €765 / €1.350 | `ConsulenzaCheckout consultantType=claudio` *(invariato)* |
| Direzione | Marketing con Antonella | rinominato (era "Sessione con Antonella") | pacchetti 1 / 5 / 10 | €180 / €765 / €1.350 | `ConsulenzaCheckout consultantType=antonella` *(invariato)* |

Nessun item resta in stato "In arrivo". I 3 Prodotti Digitali sono attivati: rimuovere il flag `comingSoon: true`.

### 2.5 Copy per item (struttura)

Ogni item conserva lo schema attuale `{ problema, soluzione, beneficio, cta }`. Per i nuovi item lo spec fornisce la traccia direzionale; il copy verbatim verrà rifinito in fase di implementazione applicando la voice guide Claudio (registro scritto in-app: anti-hype, business-outcome, frase a capo per enfasi).

**Gestione Campagne (Visibilità)**
- problema: pubblichi e fai contenuto, ma il traffico organico non basta a riempire il funnel. Le ads ti spaventano: budget bruciato, metriche poco chiare.
- soluzione: gestiamo noi le campagne Meta + Google. Setup, creatività, ottimizzazione e report mensile. Budget partner separato, paghi direttamente le piattaforme.
- beneficio: traffico in target tutti i mesi, senza imparare la piattaforma né perdere weekend interi.
- cta: Attiva la gestione campagne
- prezzo display: €348/mese *(listino €497, –30% per partner)* + 10% sul fatturato generato

**Booster Checkout (Spinta Vendite)**
- problema: quando un cliente sta per comprare il corso, sei a un click dal massimo dell'attenzione. Lì oggi non c'è niente.
- soluzione: aggiungiamo un'offerta complementare nella pagina di checkout — un click, prezzo basso, valore alto. Lui spende €17-€47 in più, tu raddoppi il margine sulla vendita.
- beneficio: stesso traffico, stessa pagina, +25-40% di valore medio per cliente.
- cta: Attiva il Booster Checkout

**Upsell Post-Acquisto (Spinta Vendite)**
- problema: dopo l'acquisto il cliente è caldo. Oggi finisce sulla thank-you e basta. Stai lasciando soldi sul tavolo.
- soluzione: una pagina post-checkout con un'offerta one-click che si addebita sulla stessa carta. Niente nuovo checkout, niente attrito.
- beneficio: tassi di accettazione 15-30% — su 100 clienti, 20 portano a casa una seconda vendita senza fatica.
- cta: Attiva l'Upsell

**Offerta di Recupero (Spinta Vendite)**
- problema: chi rifiuta l'upsell oggi se ne va. Hai perso l'occasione una seconda volta.
- soluzione: una versione più leggera dell'offerta a un terzo del prezzo. Per chi voleva ma non era pronto al prezzo pieno.
- beneficio: recuperi il 5-10% di chi avresti perso. Soldi in più senza traffico in più.
- cta: Attiva l'Offerta di Recupero

**Live Promo (Eventi Vendita)**
- problema: un evento live converte come niente, ma costruirlo da zero ti costa una settimana di stress. E poi il copy del pitch è la cosa più difficile da scrivere.
- soluzione: organizziamo noi il webinar live promo. Tu fai il talk, noi facciamo il resto: landing iscrizione, sequenza email pre-live, regia diretta, follow-up, script di vendita scritto su misura della tua offerta.
- beneficio: un live al mese trasforma traffico tiepido in clienti. Senza che tu costruisca nulla da zero.
- cta: Pianifica i tuoi Live Promo
- pacchetti: 3 / 6 / 12 live → €1.490 / €2.490 / €3.990 (–16% / –33% sul singolo)

**Calendario PRO (Costanza)** — solo rinominato. Copy invariato rispetto a `AcceleraCrescitaPage.jsx:54-65`.

**Avatar PRO (Visibilità)** — pricing display aggiunto (€1.490 una tantum). Copy invariato rispetto a `AcceleraCrescitaPage.jsx:30-42`.

**Ebook del Corso / Audiobook / Audiolezioni** — copy esistenti restano. Rimuovere `comingSoon: true`. Aggiungere `isStripe: true` + `stripeServiceId` + `price`.

**Strategia con Claudio / Marketing con Antonella** — rinominate. Copy può restare; valutare se aggiornare problema/soluzione per allinearsi al nuovo titolo orientato all'outcome (Strategia vs Marketing) in fase di implementazione.

### 2.6 Routing

Le 3 nuove sub-categorie introducono 3 nuove route gestite dallo stesso `AcceleraCrescitaPage` via param `categoryId`:

- `/partner/accelera/acc-spinta-vendite` → `CATEGORIES.spinta_vendite`
- `/partner/accelera/acc-eventi-vendita` → `CATEGORIES.eventi_vendita`
- `/partner/accelera/acc-prodotti-digitali` → `CATEGORIES.prodotti_digitali`

Il parametro nella URL diventa `acc-{slug}` come per le esistenti (`acc-visibilita`, `acc-costanza`, `acc-direzione`). La logica di parsing `categoryId.replace("acc-", "")` resta valida; serve solo aggiungere i 3 nuovi slug nella mappa `CATEGORIES`.

**Compat URL legacy:** `/partner/accelera/acc-monetizzazione` non esiste più. Si può lasciare un redirect lato React Router verso `/partner/accelera/acc-spinta-vendite` (la prima delle 3 ex-Monetizzazione) per evitare 404 da bookmark. Decisione: aggiungere il redirect.

### 2.7 Backend / Stripe — servizi nuovi da censire

Nuovi `stripe_service_id` da creare nella collection `servizi_extra` (collection esistente lato `/api/servizi-extra/:id/acquista`):

```
gestione-campagne-mensile
booster-checkout
upsell-post-acquisto
offerta-di-recupero
live-promo-3
live-promo-6
live-promo-12
ebook-corso
audiobook
audiolezioni
```

`avatar-pro` e i 2 `consulenza-checkout` (Claudio / Antonella) restano sui loro endpoint dedicati. `calendario-pro` mantiene lo stesso `stripe_service_id` (solo il label cambia da "Gestione Contenuti Mensile" a "Calendario PRO").

**Pricing tier — Gestione Campagne:** il 10% sul fatturato generato è una commission separata gestita fuori Stripe checkout (probabilmente bonifico/fattura mensile col partner). In Stripe checkout va solo la fee mensile €348. Il copy della card hub deve dichiarare entrambe le componenti ("€348/mese + 10% sulle vendite generate") per onestà.

**Pricing tier — Live Promo:** 3 service ID separati invece di 1 con tier (allinea pattern esistente, semplifica checkout). La pagina detail mostra 3 pacchetti cliccabili (pattern `packages` già esistente per le consulenze) e ogni scelta richiama il rispettivo `stripe_service_id`.

## 3. Estensioni alla mappa `TONE`

Aggiungere `rose` e `indigo` con le stesse chiavi degli esistenti:

```js
rose: {
  iconBg: "bg-rose-100",
  iconText: "text-rose-600",
  softBg: "bg-rose-50",
  softBorder: "border-rose-200",
  accentText: "text-rose-700",
  label: "text-rose-700",
  labelBg: "bg-rose-100",
  cardBorder: "border-rose-200",
  btn: "bg-rose-500 hover:bg-rose-600",
},
indigo: {
  iconBg: "bg-indigo-100",
  iconText: "text-indigo-600",
  softBg: "bg-indigo-50",
  softBorder: "border-indigo-200",
  accentText: "text-indigo-700",
  label: "text-indigo-700",
  labelBg: "bg-indigo-100",
  cardBorder: "border-indigo-200",
  btn: "bg-indigo-500 hover:bg-indigo-600",
},
```

## 4. Cosa NON tocchiamo

- `Evolution Growth System` (Foundation / Growth / Scale) e relativi prezzi €297/€497/€797/mese — fuori scope
- Endpoint backend `/api/servizi-extra/:id/acquista`, `/api/avatar-checkout`, `/api/consulenza-checkout` — invariati
- Pattern UI dell'`ItemDetailPage` (Problema → Soluzione → Beneficio → CTA) — invariato
- Sezione *Direzione*: pricing invariato (€180/€765/€1.350), solo titoli card rinominati
- Voce *Webinar* in `MAIN_NAV` della sidebar (è temporaneamente fuori da Evolution One e andrà in fase Ottimizza post-lancio)
- Fasi EVO, Workspace, fascia Go Live 21gg

## 5. Definition of done

1. `PartnerSidebar.jsx` → `ACCELERA_ITEMS` aggiornato a 6 voci con i nuovi slug
2. `AcceleraCrescitaPage.jsx` → mappa `CATEGORIES` con 6 chiavi; nuove `tone: rose` e `tone: indigo` aggiunte alla mappa `TONE`; tutti gli item con copy, pricing display, `isStripe` / `stripeServiceId` / `hasCheckout` / `packages` corretti; `comingSoon` rimosso dai 3 Prodotti Digitali
3. `App.js` (o file routing partner) → 3 nuove route per i 3 nuovi slug + redirect compat da `acc-monetizzazione`
4. Backend `servizi_extra` → 10 nuovi `stripe_service_id` censiti con prezzi sopra (sia in DB sia su Stripe Dashboard)
5. Smoke test acquisto: tutti i nuovi item portano alla pagina checkout Stripe coerente

## 6. Open questions (da risolvere fuori da questa spec, non bloccanti per il plan)

- Naming del *bonifico/fattura* per la commission 10% di Gestione Campagne: gestita in `partners.gestione_campagne_commissions` o fattura PDF mensile esterna? Da decidere prima del go-live del servizio.
- Live Promo: se un pacchetto da 3 viene esaurito, come riacquista il partner? Auto-rinnovo o nuovo acquisto manuale? Default per ora: nuovo acquisto manuale.
- Avatar PRO: il prezzo €1.490 va riflesso anche dentro `AvatarCheckout.jsx` (oggi il prezzo è gestito da quel componente; verificare coerenza).
