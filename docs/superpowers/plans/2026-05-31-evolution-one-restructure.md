# Evolution One — Restructure Accelera la crescita

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ridisegnare la sezione `Evolution One > Accelera la crescita` di `ciak.io/partner` portandola a 6 pilastri (Visibilità · Costanza · Spinta Vendite · Eventi Vendita · Prodotti Digitali · Direzione) con catalogo completo di 12 servizi acquistabili.

**Architecture:** Frontend React (CRA, react-router) + backend FastAPI con catalogo `SERVIZI_CATALOGO` in-memory e checkout Stripe (`/api/servizi-extra/{id}/acquista`). La mappa `CATEGORIES` in `AcceleraCrescitaPage.jsx` è la single source of truth lato frontend; il backend deve censire 10 nuovi `stripe_service_id`. Nessun cambio strutturale al rendering: solo data + 2 nuove tone color.

**Tech Stack:** React 19 + Tailwind + lucide-react · FastAPI + Stripe SDK · pytest (backend) + smoke runtime browser (frontend).

**Spec di riferimento:** [`docs/superpowers/specs/2026-05-31-evolution-one-restructure-design.md`](../specs/2026-05-31-evolution-one-restructure-design.md)

---

## File structure

| File | Azione | Responsabilità |
|---|---|---|
| `backend/routers/servizi_extra.py` | Modify | Estende `SERVIZI_CATALOGO` con 10 nuovi entry + env vars `STRIPE_PRICE_*` |
| `backend/tests/test_servizi_extra_catalogo.py` | Create | Pytest: verifica i 10 nuovi servizi sono nel catalogo con prezzo e tipo corretti |
| `frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx` | Modify | Aggiunge tone `rose`+`indigo`; riscrive mappa `CATEGORIES` a 6 chiavi con 12 item; aggiorna parser `categoryId` per kebab-case |
| `frontend/src/ciak/partner/PartnerSidebar.jsx` | Modify | Sostituisce 4 voci `ACCELERA_ITEMS` con 6 voci nuove |
| `frontend/src/ciak/partner/CiakPartnerApp.jsx` | Modify | Redirect compat: `acc-monetizzazione` → `acc-spinta-vendite` |
| **Stripe Dashboard** | Manuale | 10 nuovi `price_*` creati in test mode + live |
| **.env / Cloud Run** | Manuale | 10 nuove env vars `STRIPE_PRICE_*` configurate |

---

## Task 1: Backend — estendere SERVIZI_CATALOGO

**Files:**
- Modify: `backend/routers/servizi_extra.py:29-30` (env vars) e `backend/routers/servizi_extra.py:63-97` (catalogo)

- [ ] **Step 1: Aggiungere 10 env var stub** (subito dopo la riga 30)

Apri `backend/routers/servizi_extra.py`. Trova:

```python
STRIPE_PRICE_CALENDARIO_PRO = os.environ.get('STRIPE_PRICE_CALENDARIO_PRO', 'price_1TEpHJKjIoAIM4LD1sTFrvz0')
STRIPE_PRICE_CALENDARIO_STARTER = os.environ.get('STRIPE_PRICE_CALENDARIO_STARTER', 'price_1TEpHJKjIoAIM4LD8002kZ5h')
```

Aggiungi subito sotto (gli stub `price_TODO_*` saranno rimpiazzati dai veri price ID in Task 9):

```python
# Evolution One — Servizi Extra (nuovi)
STRIPE_PRICE_GESTIONE_CAMPAGNE = os.environ.get('STRIPE_PRICE_GESTIONE_CAMPAGNE', 'price_TODO_gestione_campagne')
STRIPE_PRICE_BOOSTER_CHECKOUT = os.environ.get('STRIPE_PRICE_BOOSTER_CHECKOUT', 'price_TODO_booster_checkout')
STRIPE_PRICE_UPSELL_POST_ACQUISTO = os.environ.get('STRIPE_PRICE_UPSELL_POST_ACQUISTO', 'price_TODO_upsell_post_acquisto')
STRIPE_PRICE_OFFERTA_DI_RECUPERO = os.environ.get('STRIPE_PRICE_OFFERTA_DI_RECUPERO', 'price_TODO_offerta_di_recupero')
STRIPE_PRICE_LIVE_PROMO_3 = os.environ.get('STRIPE_PRICE_LIVE_PROMO_3', 'price_TODO_live_promo_3')
STRIPE_PRICE_LIVE_PROMO_6 = os.environ.get('STRIPE_PRICE_LIVE_PROMO_6', 'price_TODO_live_promo_6')
STRIPE_PRICE_LIVE_PROMO_12 = os.environ.get('STRIPE_PRICE_LIVE_PROMO_12', 'price_TODO_live_promo_12')
STRIPE_PRICE_EBOOK_CORSO = os.environ.get('STRIPE_PRICE_EBOOK_CORSO', 'price_TODO_ebook_corso')
STRIPE_PRICE_AUDIOBOOK = os.environ.get('STRIPE_PRICE_AUDIOBOOK', 'price_TODO_audiobook')
STRIPE_PRICE_AUDIOLEZIONI = os.environ.get('STRIPE_PRICE_AUDIOLEZIONI', 'price_TODO_audiolezioni')
```

- [ ] **Step 2: Estendere SERVIZI_CATALOGO con 10 nuovi entry**

Trova nella stessa file la chiusura della lista `SERVIZI_CATALOGO` (riga ~97). Subito **prima** della parentesi `]` finale, aggiungi questi 10 entry:

```python
    {
        "id": "gestione-campagne",
        "nome": "Gestione Campagne",
        "descrizione": "Gestione mensile delle tue campagne Meta e Google. Budget partner separato.",
        "features": [
            "Setup pixel + tracking Meta/Google",
            "Creatività e copy gestiti dal team",
            "Ottimizzazione settimanale",
            "Report mensile dettagliato",
            "Budget partner pagato direttamente alle piattaforme",
        ],
        "prezzo": 348,
        "tipo": "abbonamento_mensile",
        "stripe_price_id": STRIPE_PRICE_GESTIONE_CAMPAGNE,
        "attivo": True,
    },
    {
        "id": "booster-checkout",
        "nome": "Booster Checkout",
        "descrizione": "Order bump aggiunto al checkout del corso per aumentare il valore medio per cliente.",
        "features": [
            "Offerta complementare progettata su misura",
            "Copy persuasivo incluso",
            "Integrazione con il tuo checkout Systeme/Stripe",
            "Setup completo + test conversione",
        ],
        "prezzo": 197,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_BOOSTER_CHECKOUT,
        "attivo": True,
    },
    {
        "id": "upsell-post-acquisto",
        "nome": "Upsell Post-Acquisto",
        "descrizione": "Pagina upsell one-click subito dopo l'acquisto del corso.",
        "features": [
            "Pagina upsell progettata sulla tua offerta",
            "Pagamento one-click sulla stessa carta",
            "Integrazione checkout esistente",
            "Copy + setup completo",
        ],
        "prezzo": 297,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_UPSELL_POST_ACQUISTO,
        "attivo": True,
    },
    {
        "id": "offerta-di-recupero",
        "nome": "Offerta di Recupero",
        "descrizione": "Downsell mostrato a chi rifiuta l'upsell: versione più leggera dell'offerta.",
        "features": [
            "Offerta a prezzo ridotto",
            "Copy di recupero",
            "Integrazione su pagina downsell dedicata",
            "Setup completo",
        ],
        "prezzo": 197,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_OFFERTA_DI_RECUPERO,
        "attivo": True,
    },
    {
        "id": "live-promo-3",
        "nome": "Live Promo — 3 eventi",
        "descrizione": "3 webinar live promo con script di vendita, landing iscrizione, sequenza email e regia.",
        "features": [
            "3 eventi live (uno al mese)",
            "Script di vendita scritto su misura",
            "Landing iscrizione + sequenza email",
            "Regia live + follow-up post-evento",
        ],
        "prezzo": 1490,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_LIVE_PROMO_3,
        "attivo": True,
    },
    {
        "id": "live-promo-6",
        "nome": "Live Promo — 6 eventi",
        "descrizione": "6 webinar live promo (–16% sul singolo evento).",
        "features": [
            "6 eventi live distribuiti su 6 mesi",
            "Script di vendita ricalibrato per evento",
            "Landing + sequenza email + regia",
            "Follow-up post-evento incluso",
        ],
        "prezzo": 2490,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_LIVE_PROMO_6,
        "attivo": True,
    },
    {
        "id": "live-promo-12",
        "nome": "Live Promo — 12 eventi",
        "descrizione": "12 webinar live promo su 12 mesi (–33% sul singolo evento).",
        "features": [
            "12 eventi live (uno al mese per un anno)",
            "Script di vendita per ogni evento",
            "Landing + sequenza email + regia",
            "Follow-up + report performance",
        ],
        "prezzo": 3990,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_LIVE_PROMO_12,
        "attivo": True,
    },
    {
        "id": "ebook-corso",
        "nome": "Ebook del Corso",
        "descrizione": "Versione ebook del tuo videocorso: formattazione, copertina, distribuzione.",
        "features": [
            "Trasposizione testuale completa del corso",
            "Impaginazione professionale",
            "Copertina grafica inclusa",
            "File PDF + EPUB pronto alla distribuzione",
        ],
        "prezzo": 497,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_EBOOK_CORSO,
        "attivo": True,
    },
    {
        "id": "audiobook",
        "nome": "Audiobook",
        "descrizione": "Versione audio professionale del tuo corso, fruibile ovunque.",
        "features": [
            "Registrazione audio professionale",
            "Editing e mastering",
            "Capitoli + metadata",
            "File MP3 pronto alla distribuzione",
        ],
        "prezzo": 697,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_AUDIOBOOK,
        "attivo": True,
    },
    {
        "id": "audiolezioni",
        "nome": "Audiolezioni",
        "descrizione": "Estrazione audio episodica dalle lezioni del corso.",
        "features": [
            "Estrazione audio da ogni lezione",
            "Editing leggero + intro/outro",
            "Tagging episodi",
            "Set MP3 pronto alla distribuzione",
        ],
        "prezzo": 397,
        "tipo": "una_tantum",
        "stripe_price_id": STRIPE_PRICE_AUDIOLEZIONI,
        "attivo": True,
    },
```

- [ ] **Step 3: Verificare import modulo senza errore**

Run dalla root del progetto:

```bash
cd backend && python -c "from routers.servizi_extra import SERVIZI_CATALOGO; print(len(SERVIZI_CATALOGO), 'servizi'); [print(s['id'], s['prezzo'], s['tipo']) for s in SERVIZI_CATALOGO]"
```

Expected output (12 righe id+prezzo+tipo, lista non vuota):
```
12 servizi
calendario-pro 297 abbonamento_mensile
calendario-starter 97 una_tantum
gestione-campagne 348 abbonamento_mensile
booster-checkout 197 una_tantum
upsell-post-acquisto 297 una_tantum
offerta-di-recupero 197 una_tantum
live-promo-3 1490 una_tantum
live-promo-6 2490 una_tantum
live-promo-12 3990 una_tantum
ebook-corso 497 una_tantum
audiobook 697 una_tantum
audiolezioni 397 una_tantum
```

- [ ] **Step 4: Commit**

```bash
git add backend/routers/servizi_extra.py
git commit -m "feat(servizi-extra): catalogo Evolution One — 10 nuovi servizi (Gestione Campagne, Spinta Vendite, Eventi Vendita, Prodotti Digitali)"
```

---

## Task 2: Backend — test pytest sul catalogo esteso

**Files:**
- Create: `backend/tests/test_servizi_extra_catalogo.py`

- [ ] **Step 1: Scrivere test pytest**

Crea il file `backend/tests/test_servizi_extra_catalogo.py` con questo contenuto:

```python
"""
Test catalogo SERVIZI_CATALOGO esteso con i 10 nuovi servizi Evolution One.
Verifica che id/prezzo/tipo siano allineati allo spec
docs/superpowers/specs/2026-05-31-evolution-one-restructure-design.md
"""
import pytest
from routers.servizi_extra import SERVIZI_CATALOGO


EXPECTED_NEW_SERVIZI = {
    # id : (prezzo, tipo)
    "gestione-campagne": (348, "abbonamento_mensile"),
    "booster-checkout": (197, "una_tantum"),
    "upsell-post-acquisto": (297, "una_tantum"),
    "offerta-di-recupero": (197, "una_tantum"),
    "live-promo-3": (1490, "una_tantum"),
    "live-promo-6": (2490, "una_tantum"),
    "live-promo-12": (3990, "una_tantum"),
    "ebook-corso": (497, "una_tantum"),
    "audiobook": (697, "una_tantum"),
    "audiolezioni": (397, "una_tantum"),
}


def _catalog_by_id():
    return {s["id"]: s for s in SERVIZI_CATALOGO}


@pytest.mark.parametrize("servizio_id,expected", EXPECTED_NEW_SERVIZI.items())
def test_nuovo_servizio_presente_con_prezzo_e_tipo_corretti(servizio_id, expected):
    expected_prezzo, expected_tipo = expected
    by_id = _catalog_by_id()
    assert servizio_id in by_id, f"Servizio {servizio_id} mancante nel catalogo"
    s = by_id[servizio_id]
    assert s["prezzo"] == expected_prezzo, f"{servizio_id}: prezzo {s['prezzo']} != atteso {expected_prezzo}"
    assert s["tipo"] == expected_tipo, f"{servizio_id}: tipo {s['tipo']} != atteso {expected_tipo}"
    assert s["attivo"] is True, f"{servizio_id} non attivo"
    assert s["stripe_price_id"], f"{servizio_id} senza stripe_price_id"
    assert isinstance(s["features"], list) and len(s["features"]) >= 3, f"{servizio_id} senza features sufficienti"


def test_catalogo_totale_12_servizi():
    # 2 calendario + 10 nuovi
    assert len(SERVIZI_CATALOGO) == 12
```

- [ ] **Step 2: Run test, verificare PASS**

```bash
cd backend && pytest tests/test_servizi_extra_catalogo.py -v
```

Expected: `11 passed` (10 parametrizzati + 1 totale).

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_servizi_extra_catalogo.py
git commit -m "test(servizi-extra): copertura catalogo Evolution One (id/prezzo/tipo)"
```

---

## Task 3: Frontend — estendere mappa TONE con `rose` e `indigo`

**Files:**
- Modify: `frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx:160-205`

- [ ] **Step 1: Aggiungere le 2 nuove tone**

Trova in `AcceleraCrescitaPage.jsx` la fine dell'oggetto `TONE` (subito prima di `};` a riga ~205). Sostituisci la chiusura `},\n};` dell'ultima tone (`blue`) con la versione che aggiunge `rose` + `indigo`:

Vecchio (cerca esattamente):

```js
  blue: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    softBg: "bg-blue-50",
    softBorder: "border-blue-200",
    accentText: "text-blue-700",
    label: "text-blue-700",
    labelBg: "bg-blue-100",
    cardBorder: "border-blue-200",
    btn: "bg-blue-500 hover:bg-blue-600",
  },
};
```

Nuovo:

```js
  blue: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    softBg: "bg-blue-50",
    softBorder: "border-blue-200",
    accentText: "text-blue-700",
    label: "text-blue-700",
    labelBg: "bg-blue-100",
    cardBorder: "border-blue-200",
    btn: "bg-blue-500 hover:bg-blue-600",
  },
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
};
```

- [ ] **Step 2: Verificare classi Tailwind safelist**

Tailwind purge-CSS richiede che ogni classe usata compaia *staticamente* nel sorgente. Le classi `bg-rose-*`, `text-rose-*`, `border-rose-*`, `bg-indigo-*`, `text-indigo-*`, `border-indigo-*` sono ora presenti come stringhe statiche nell'oggetto sopra → Tailwind le includerà automaticamente.

Nessuna modifica a `tailwind.config.js` necessaria. Verificare comunque che esista una safelist o che il file `AcceleraCrescitaPage.jsx` sia tracciato dal content scan:

```bash
cd frontend && cat tailwind.config.js | grep -A 3 content
```

Expected: `content` include `./src/**/*.{js,jsx,...}` o simile. Se NON include i path `ciak/partner/sections/`, aggiungere.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx
git commit -m "feat(accelera): aggiunge tone rose+indigo per Eventi Vendita e Prodotti Digitali"
```

---

## Task 4: Frontend — riscrivere mappa `CATEGORIES` con 6 pilastri

**Files:**
- Modify: `frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx:14` (import icone) e `:22-157` (oggetto CATEGORIES)

- [ ] **Step 1: Aggiornare gli import di icone**

Trova in `AcceleraCrescitaPage.jsx` riga 14:

```js
import { ArrowLeft, ArrowRight, Eye, Repeat, DollarSign, Compass, Tag } from "lucide-react";
```

Sostituisci con (aggiunte `TrendingUp`, `Radio`, `Layers` — usate dalle 3 nuove categorie — rimossa `DollarSign` non più usata):

```js
import { ArrowLeft, ArrowRight, Eye, Repeat, TrendingUp, Radio, Layers, Compass, Tag } from "lucide-react";
```

- [ ] **Step 2: Sostituire l'intero oggetto `CATEGORIES`**

Trova in `AcceleraCrescitaPage.jsx` l'intero blocco `const CATEGORIES = { ... };` (righe ~22-157, parte da `const CATEGORIES = {` e finisce con `};` prima del commento `/* Mappa "tone" → classi Tailwind ... */`).

Sostituisci l'intero blocco con questo:

```js
const CATEGORIES = {
  "visibilita": {
    id: "visibilita",
    icon: Eye,
    tone: "slate",
    title: "Visibilità",
    tagline: "Fatti vedere — anche quando non sei davanti alla camera",
    items: [
      {
        id: "avatar_pro",
        title: "Avatar PRO",
        problema:
          "Vuoi pubblicare video costantemente ma non hai tempo di registrare, oppure non ti senti a tuo agio davanti alla telecamera.",
        soluzione:
          "Un clone digitale professionale con la tua voce e il tuo stile. Insegna al posto tuo, in HD, con espressioni naturali.",
        beneficio:
          "Pubblichi video ogni settimana senza registrare nulla. I tuoi studenti vedono te, ma tu risparmi ore di lavoro.",
        cta: "Attiva il tuo Avatar",
        hasCheckout: true,
      },
      {
        id: "gestione_campagne",
        title: "Gestione Campagne",
        problema:
          "Pubblichi contenuti e fai organico, ma il traffico non basta a riempire il funnel. Le ads ti spaventano: budget bruciato, metriche confuse.",
        soluzione:
          "Gestiamo noi le tue campagne Meta e Google. Setup pixel, creatività, copy, ottimizzazione settimanale, report mensile. Il budget delle ads lo paghi direttamente alle piattaforme.",
        beneficio:
          "Traffico in target tutti i mesi senza imparare la piattaforma e senza perdere weekend interi a ottimizzare.",
        cta: "Attiva la Gestione Campagne",
        isStripe: true,
        stripeServiceId: "gestione-campagne",
        price: "€348/mese (–30% sul listino) + 10% sulle vendite generate",
      },
    ],
  },
  "costanza": {
    id: "costanza",
    icon: Repeat,
    tone: "yellow",
    title: "Costanza",
    tagline: "Pubblica ogni giorno senza pensarci",
    items: [
      {
        id: "calendario_pro",
        title: "Calendario PRO",
        problema:
          "Sai che dovresti essere presente sui social ogni settimana, ma il tempo non c'è. Il risultato: profilo fermo, visibilità bassa, studenti che non ti trovano.",
        soluzione:
          "Ogni mese ti consegniamo 20 contenuti pronti da pubblicare: post, caroselli e reel già scritti, formattati e ottimizzati per la tua nicchia. Tu copi, incolli e pubblichi. Oppure ce lo lasci fare direttamente tu.",
        beneficio:
          "Il tuo profilo è attivo 365 giorni l'anno senza che tu ci pensi. Chi ti cerca ti trova. La costanza è uno degli strumenti di vendita più efficaci.",
        cta: "Attiva il Calendario PRO",
        isStripe: true,
        stripeServiceId: "calendario-pro",
        price: "€297/mese",
      },
    ],
  },
  "spinta-vendite": {
    id: "spinta-vendite",
    icon: TrendingUp,
    tone: "emerald",
    title: "Spinta Vendite",
    tagline: "Ogni vendita vale di più",
    items: [
      {
        id: "booster_checkout",
        title: "Booster Checkout",
        problema:
          "Quando un cliente sta per comprare il corso, sei a un click dal massimo dell'attenzione. Lì oggi non c'è niente: prendi i soldi del corso e basta.",
        soluzione:
          "Aggiungiamo un'offerta complementare nella pagina di checkout. Un click, prezzo basso, valore alto. Lui spende €17–€47 in più, tu raddoppi il margine sulla vendita.",
        beneficio:
          "Stesso traffico, stessa pagina, +25–40% di valore medio per cliente. Senza nuovi costi.",
        cta: "Attiva il Booster Checkout",
        isStripe: true,
        stripeServiceId: "booster-checkout",
        price: "€197 una tantum",
      },
      {
        id: "upsell_post_acquisto",
        title: "Upsell Post-Acquisto",
        problema:
          "Dopo l'acquisto il cliente è caldo. Oggi finisce sulla thank-you e se ne va. Stai lasciando soldi sul tavolo.",
        soluzione:
          "Una pagina post-checkout con un'offerta one-click che si addebita sulla stessa carta. Niente nuovo checkout, niente attrito.",
        beneficio:
          "Tassi di accettazione 15–30%. Su 100 clienti, fino a 20 portano a casa una seconda vendita senza fatica.",
        cta: "Attiva l'Upsell",
        isStripe: true,
        stripeServiceId: "upsell-post-acquisto",
        price: "€297 una tantum",
      },
      {
        id: "offerta_di_recupero",
        title: "Offerta di Recupero",
        problema:
          "Chi rifiuta l'upsell oggi se ne va. Hai perso l'occasione una seconda volta.",
        soluzione:
          "Una versione più leggera dell'offerta a un terzo del prezzo. Per chi voleva ma non era pronto al prezzo pieno.",
        beneficio:
          "Recuperi il 5–10% di chi avresti perso. Soldi in più senza traffico in più.",
        cta: "Attiva l'Offerta di Recupero",
        isStripe: true,
        stripeServiceId: "offerta-di-recupero",
        price: "€197 una tantum",
      },
    ],
  },
  "eventi-vendita": {
    id: "eventi-vendita",
    icon: Radio,
    tone: "rose",
    title: "Eventi Vendita",
    tagline: "Trasforma un'ora live in un mese di vendite",
    items: [
      {
        id: "live_promo",
        title: "Live Promo",
        problema:
          "Un evento live converte come niente. Ma costruirlo da zero ti costa una settimana di stress. E il copy del pitch è la cosa più difficile da scrivere.",
        soluzione:
          "Organizziamo noi il webinar live promo. Tu fai il talk, noi facciamo il resto: landing iscrizione, sequenza email pre-live, regia diretta, follow-up, script di vendita scritto su misura della tua offerta.",
        beneficio:
          "Un live al mese trasforma traffico tiepido in clienti. Senza che tu costruisca nulla da zero.",
        cta: "Pianifica i tuoi Live Promo",
        hasCheckout: true,
        livePromoTiers: true,
        packages: [
          { label: "3 Live", price: 1490, originalPrice: null, saving: null, perEvent: 497, stripeServiceId: "live-promo-3" },
          { label: "6 Live", price: 2490, originalPrice: 2982, saving: "–16%", perEvent: 415, stripeServiceId: "live-promo-6" },
          { label: "12 Live", price: 3990, originalPrice: 5964, saving: "–33%", perEvent: 333, stripeServiceId: "live-promo-12" },
        ],
      },
    ],
  },
  "prodotti-digitali": {
    id: "prodotti-digitali",
    icon: Layers,
    tone: "indigo",
    title: "Prodotti Digitali",
    tagline: "Stesso contenuto, più formati, più ricavi",
    items: [
      {
        id: "ebook_corso",
        title: "Ebook del Corso",
        problema:
          "Hai un videocorso ma non tutti vogliono guardare video. Stai perdendo chi preferisce leggere.",
        soluzione:
          "Trasformiamo il tuo corso in un ebook professionale, completo di formattazione, copertina e distribuzione.",
        beneficio:
          "Un nuovo prodotto da vendere a chi preferisce leggere. Un ulteriore punto di ingresso nel tuo funnel.",
        cta: "Crea il tuo Ebook",
        isStripe: true,
        stripeServiceId: "ebook-corso",
        price: "€497 una tantum",
      },
      {
        id: "audiobook",
        title: "Audiobook",
        problema:
          "Il tuo pubblico è impegnato e non ha tempo di sedersi a leggere o guardare video.",
        soluzione:
          "Creiamo la versione audio del tuo corso, ascoltabile ovunque: in auto, in palestra, camminando.",
        beneficio:
          "Raggiungi chi consuma contenuti in movimento. Un formato comodo da fruire.",
        cta: "Crea il tuo Audiobook",
        isStripe: true,
        stripeServiceId: "audiobook",
        price: "€697 una tantum",
      },
      {
        id: "audiolezioni",
        title: "Audiolezioni",
        problema:
          "Le tue lezioni video sono ottime, ma non tutti hanno tempo di guardarle integralmente.",
        soluzione:
          "Estraiamo l'audio da ogni lezione del tuo corso e lo trasformiamo in episodi consumabili ovunque.",
        beneficio:
          "I tuoi studenti completano il corso anche quando sono fuori casa. Più completamento significa più risultati.",
        cta: "Attiva le Audiolezioni",
        isStripe: true,
        stripeServiceId: "audiolezioni",
        price: "€397 una tantum",
      },
    ],
  },
  "direzione": {
    id: "direzione",
    icon: Compass,
    tone: "blue",
    title: "Direzione",
    tagline: "Una guida esperta quando ne hai bisogno",
    items: [
      {
        id: "strategia_claudio",
        title: "Strategia con Claudio",
        problema:
          "Hai dubbi sulla strategia, non sai se stai andando nella direzione giusta e ti servono risposte chiare.",
        soluzione:
          "90 minuti 1:1 con Claudio. Strategia, posizionamento, pricing, lancio: ti dice cosa fare e perché.",
        beneficio:
          "Esci dalla sessione con un piano d'azione preciso. Settimane di indecisione risolte in 90 minuti.",
        cta: "Prenota con Claudio",
        hasCheckout: true,
        consultantType: "claudio",
        price: "€180 / sessione",
        packages: [
          { label: "1 sessione", price: 180, originalPrice: null, saving: null },
          { label: "5 sessioni", price: 765, originalPrice: 900, saving: "–15%", perSession: 153 },
          { label: "10 sessioni", price: 1350, originalPrice: 1800, saving: "–25%", perSession: 135 },
        ],
      },
      {
        id: "marketing_antonella",
        title: "Marketing con Antonella",
        problema:
          "Vuoi migliorare le vendite, il funnel o i contenuti ma non sai da dove partire.",
        soluzione:
          "90 minuti 1:1 con Antonella. Marketing operativo, copy, funnel: ti guida passo dopo passo con azioni concrete.",
        beneficio: "Un piano d'azione su misura per le vendite. Ottimizzazione concreta, non teoria.",
        cta: "Prenota con Antonella",
        hasCheckout: true,
        consultantType: "antonella",
        price: "€180 / sessione",
        packages: [
          { label: "1 sessione", price: 180, originalPrice: null, saving: null },
          { label: "5 sessioni", price: 765, originalPrice: 900, saving: "–15%", perSession: 153 },
          { label: "10 sessioni", price: 1350, originalPrice: 1800, saving: "–25%", perSession: 135 },
        ],
      },
    ],
  },
};
```

Note operative sul nuovo `CATEGORIES`:
- Le chiavi sono **kebab-case** (`spinta-vendite`, `eventi-vendita`, `prodotti-digitali`) per allinearsi 1:1 con lo slug URL `acc-{key}`. Questo elimina la conversione dash↔underscore.
- L'item Live Promo ha `livePromoTiers: true` + `packages` con `stripeServiceId` per pacchetto: il checkout reale verrà gestito in Task 5.
- I 3 Prodotti Digitali NON hanno più `comingSoon: true`: sono attivi con `isStripe`.

- [ ] **Step 3: Build webpack/CRA per verificare zero errori**

```bash
cd frontend && npm run build 2>&1 | tail -30
```

Expected: `Compiled successfully` o `Compiled with warnings` (warning sì, errori no).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx
git commit -m "feat(accelera): riscrive CATEGORIES con 6 pilastri (spinta-vendite, eventi-vendita, prodotti-digitali) + 12 item completi"
```

---

## Task 5: Frontend — gestire checkout Live Promo (3 pacchetti → 3 stripe service IDs)

**Files:**
- Modify: `frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx:218-236` (funzione `handleStripeAcquisto` dentro `ItemDetailPage`)

Le consulenze (Direzione) usano `ConsulenzaCheckout` con pacchetti e un singolo endpoint. Live Promo invece deve chiamare endpoint diversi per pacchetto (`live-promo-3` / `live-promo-6` / `live-promo-12`). Aggiorniamo `ItemDetailPage.handleStripeAcquisto` per supportare il caso `livePromoTiers`.

- [ ] **Step 1: Aggiornare `handleStripeAcquisto`**

Trova nel file `AcceleraCrescitaPage.jsx` (dentro `function ItemDetailPage`) la funzione:

```js
  const handleStripeAcquisto = async () => {
    if (!item.isStripe || !item.stripeServiceId) return;
    try {
      setPurchasing(true);
      const res = await fetch(`/api/servizi-extra/${item.stripeServiceId}/acquista`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error("Errore acquisto:", err);
    } finally {
      setPurchasing(false);
    }
  };
```

Sostituisci con:

```js
  const handleStripeAcquisto = async () => {
    // Determina lo stripe service ID effettivo (singolo o per-pacchetto come Live Promo)
    let serviceId = item.stripeServiceId;
    if (item.livePromoTiers && item.packages && selectedPackage !== null) {
      serviceId = item.packages[selectedPackage]?.stripeServiceId;
    }
    if (!serviceId) return;
    try {
      setPurchasing(true);
      const res = await fetch(`/api/servizi-extra/${serviceId}/acquista`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error("Errore acquisto:", err);
    } finally {
      setPurchasing(false);
    }
  };
```

- [ ] **Step 2: Assicurarsi che il pulsante CTA usi `handleStripeAcquisto` anche per Live Promo**

Trova nel render di `ItemDetailPage`:

```js
          <button
            onClick={item.isStripe ? handleStripeAcquisto : onBack}
```

Sostituisci con:

```js
          <button
            onClick={(item.isStripe || item.livePromoTiers) ? handleStripeAcquisto : onBack}
```

Trova il condizionale che renderizza `<CategoryPage>`/checkout (parte ~365-378):

```js
  // Checkout dedicati
  if (selectedItem?.hasCheckout && selectedItem.id === "avatar_pro") {
    return <AvatarCheckout partner={partner} onBack={() => setSelectedItem(null)} />;
  }
  if (selectedItem?.hasCheckout && selectedItem.consultantType) {
    return (
      <ConsulenzaCheckout
        partner={partner}
        onBack={() => setSelectedItem(null)}
        defaultConsultant={selectedItem.consultantType}
        packages={selectedItem.packages}
      />
    );
  }
```

Live Promo ha `hasCheckout: true` ma NON deve aprire `AvatarCheckout` né `ConsulenzaCheckout`. Deve cadere nel branch `ItemDetailPage` (dove `handleStripeAcquisto` lo gestisce con i pacchetti). Le condizioni esistenti già lo escludono (`id === "avatar_pro"` false, `consultantType` false), quindi cade in `ItemDetailPage`. ✓ Nessuna modifica necessaria a questo blocco.

- [ ] **Step 3: Build per verifica**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `Compiled successfully` o solo warning.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx
git commit -m "feat(live-promo): checkout per-pacchetto (3/6/12 live → 3 stripe service IDs)"
```

---

## Task 6: Frontend — aggiornare logica parser `categoryId`

**Files:**
- Modify: `frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx:449-454` (funzione `AcceleraCrescitaPage`)

Le nuove chiavi `CATEGORIES` sono kebab-case e gli slug URL sono `acc-spinta-vendite`, `acc-eventi-vendita`, `acc-prodotti-digitali`. La logica attuale `categoryId.replace("acc-", "")` produce esattamente la chiave kebab-case → corrisponde. Verifichiamo che funzioni per tutti i 6 slug.

- [ ] **Step 1: Verificare/aggiornare la funzione `AcceleraCrescitaPage`**

Trova:

```js
export function AcceleraCrescitaPage({ partnerId, categoryId }) {
  const navigate = useNavigate();
  const partner = { id: partnerId };
  const [selectedCategory, setSelectedCategory] = useState(
    categoryId ? CATEGORIES[categoryId.replace("acc-", "")] : null
  );
```

La replace produce:
- `acc-visibilita` → `visibilita` → CATEGORIES["visibilita"] ✓
- `acc-costanza` → `costanza` ✓
- `acc-spinta-vendite` → `spinta-vendite` → CATEGORIES["spinta-vendite"] ✓
- `acc-eventi-vendita` → `eventi-vendita` ✓
- `acc-prodotti-digitali` → `prodotti-digitali` ✓
- `acc-direzione` → `direzione` ✓

Nessuna modifica necessaria. ✓ (Lascia il codice invariato.)

- [ ] **Step 2: Smoke test mentale**

Apri il file `frontend/src/ciak/partner/sections/AcceleraCrescitaPage.jsx`. Conferma che le 6 chiavi di `CATEGORIES` sono esattamente:
`"visibilita"`, `"costanza"`, `"spinta-vendite"`, `"eventi-vendita"`, `"prodotti-digitali"`, `"direzione"`.

Niente da committare per questo task: è una verifica.

---

## Task 7: Frontend — aggiornare `PartnerSidebar.ACCELERA_ITEMS`

**Files:**
- Modify: `frontend/src/ciak/partner/PartnerSidebar.jsx:23-28`

- [ ] **Step 1: Sostituire ACCELERA_ITEMS con 6 voci**

Trova:

```js
const ACCELERA_ITEMS = [
  { to: "/partner/accelera/acc-visibilita", label: "Visibilità" },
  { to: "/partner/accelera/acc-costanza", label: "Costanza" },
  { to: "/partner/accelera/acc-monetizzazione", label: "Monetizzazione" },
  { to: "/partner/accelera/acc-direzione", label: "Direzione" },
];
```

Sostituisci con:

```js
const ACCELERA_ITEMS = [
  { to: "/partner/accelera/acc-visibilita", label: "Visibilità" },
  { to: "/partner/accelera/acc-costanza", label: "Costanza" },
  { to: "/partner/accelera/acc-spinta-vendite", label: "Spinta Vendite" },
  { to: "/partner/accelera/acc-eventi-vendita", label: "Eventi Vendita" },
  { to: "/partner/accelera/acc-prodotti-digitali", label: "Prodotti Digitali" },
  { to: "/partner/accelera/acc-direzione", label: "Direzione" },
];
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `Compiled successfully` o solo warning.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/ciak/partner/PartnerSidebar.jsx
git commit -m "feat(sidebar): Accelera passa da 4 a 6 voci (Spinta/Eventi/Prodotti separati)"
```

---

## Task 8: Frontend — redirect compat `acc-monetizzazione`

**Files:**
- Modify: `frontend/src/ciak/partner/CiakPartnerApp.jsx:219-223`

Lo slug `acc-monetizzazione` non esiste più tra le `CATEGORIES`. Senza redirect, chi ha bookmarkato la vecchia URL vede una pagina hub (lo state `selectedCategory` sarà `undefined` → fallback hub). Per chiarezza inseriamo un redirect esplicito a `acc-spinta-vendite`.

- [ ] **Step 1: Aggiungere import `Navigate` da react-router-dom**

In testa al file `CiakPartnerApp.jsx`, trova l'import esistente da `react-router-dom`:

```js
import { ..., useParams, ... } from "react-router-dom";
```

Verifica che includa `Navigate`. Se assente, aggiungilo:

```js
import { ..., useParams, Navigate, ... } from "react-router-dom";
```

(Se il file non ha già `Navigate`, è preferibile aggiungerlo in coda agli imports esistenti per ridurre il diff.)

- [ ] **Step 2: Aggiornare `AcceleraRoute` con redirect**

Trova:

```js
function AcceleraRoute({ partnerId }) {
  const { categoryId } = useParams();
  return <AcceleraCrescitaPage partnerId={partnerId} categoryId={categoryId} />;
}
```

Sostituisci con:

```js
function AcceleraRoute({ partnerId }) {
  const { categoryId } = useParams();
  // Redirect legacy: la categoria Monetizzazione è stata splittata in 3 (Spinta/Eventi/Prodotti).
  // I bookmark esistenti atterrano su "Spinta Vendite" (la prima del trio).
  if (categoryId === "acc-monetizzazione") {
    return <Navigate to="/partner/accelera/acc-spinta-vendite" replace />;
  }
  return <AcceleraCrescitaPage partnerId={partnerId} categoryId={categoryId} />;
}
```

- [ ] **Step 3: Build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `Compiled successfully` o solo warning.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/ciak/partner/CiakPartnerApp.jsx
git commit -m "feat(routing): redirect compat acc-monetizzazione → acc-spinta-vendite"
```

---

## Task 9: Stripe Dashboard + env vars (manuale Claudio)

**Owner:** Claudio. Da fare *prima* del Task 10 (smoke checkout) e *prima* del deploy produzione.

- [ ] **Step 1: Creare 10 Stripe Prices in test mode**

Stripe Dashboard → Products → Create product per ciascuno. Prezzi in EUR:

| Product name | Mode | Recurrence | Amount EUR |
|---|---|---|---|
| Gestione Campagne | Subscription | Monthly | 348,00 |
| Booster Checkout | One-time | — | 197,00 |
| Upsell Post-Acquisto | One-time | — | 297,00 |
| Offerta di Recupero | One-time | — | 197,00 |
| Live Promo — 3 eventi | One-time | — | 1.490,00 |
| Live Promo — 6 eventi | One-time | — | 2.490,00 |
| Live Promo — 12 eventi | One-time | — | 3.990,00 |
| Ebook del Corso | One-time | — | 497,00 |
| Audiobook | One-time | — | 697,00 |
| Audiolezioni | One-time | — | 397,00 |

Annota il `price_id` di ciascuno (es. `price_1QwXyz...`).

- [ ] **Step 2: Aggiornare env vars locali**

In `backend/.env` (o file di config locale) aggiungi:

```
STRIPE_PRICE_GESTIONE_CAMPAGNE=price_XXXX
STRIPE_PRICE_BOOSTER_CHECKOUT=price_XXXX
STRIPE_PRICE_UPSELL_POST_ACQUISTO=price_XXXX
STRIPE_PRICE_OFFERTA_DI_RECUPERO=price_XXXX
STRIPE_PRICE_LIVE_PROMO_3=price_XXXX
STRIPE_PRICE_LIVE_PROMO_6=price_XXXX
STRIPE_PRICE_LIVE_PROMO_12=price_XXXX
STRIPE_PRICE_EBOOK_CORSO=price_XXXX
STRIPE_PRICE_AUDIOBOOK=price_XXXX
STRIPE_PRICE_AUDIOLEZIONI=price_XXXX
```

(Sostituire `price_XXXX` con i veri ID dello step 1.)

- [ ] **Step 3: Aggiornare env vars produzione (Cloud Run)**

Per il backend Cloud Run, aggiornare via gcloud:

```bash
gcloud run services update appevolution-backend --region=europe-west1 \
  --update-env-vars="STRIPE_PRICE_GESTIONE_CAMPAGNE=price_XXXX,STRIPE_PRICE_BOOSTER_CHECKOUT=price_XXXX,STRIPE_PRICE_UPSELL_POST_ACQUISTO=price_XXXX,STRIPE_PRICE_OFFERTA_DI_RECUPERO=price_XXXX,STRIPE_PRICE_LIVE_PROMO_3=price_XXXX,STRIPE_PRICE_LIVE_PROMO_6=price_XXXX,STRIPE_PRICE_LIVE_PROMO_12=price_XXXX,STRIPE_PRICE_EBOOK_CORSO=price_XXXX,STRIPE_PRICE_AUDIOBOOK=price_XXXX,STRIPE_PRICE_AUDIOLEZIONI=price_XXXX"
```

Il nome esatto del service Cloud Run va confermato leggendo `gcloud run services list --region=europe-west1`.

- [ ] **Step 4: Verificare**

```bash
cd backend && python -c "from routers.servizi_extra import SERVIZI_CATALOGO; [print(s['id'], s['stripe_price_id']) for s in SERVIZI_CATALOGO if 'TODO' in s['stripe_price_id']]"
```

Expected output: **nessuna riga** (nessun price ID resta TODO). Se vedi `price_TODO_*`, la env var non è stata caricata.

Nessun commit qui — sono modifiche di configurazione esterne al repo.

---

## Task 10: Smoke test runtime — sidebar + 6 pagine + redirect

**Owner:** sviluppatore che esegue il plan.

- [ ] **Step 1: Avviare il frontend in dev mode**

```bash
cd frontend && npm start
```

Aprire `http://localhost:3000/partner` con un utente partner di test.

- [ ] **Step 2: Verificare sidebar `Accelera la crescita`**

Espandere il collapsible `Accelera la crescita`. Devono comparire **6 voci** in quest'ordine:

1. Visibilità
2. Costanza
3. Spinta Vendite
4. Eventi Vendita
5. Prodotti Digitali
6. Direzione

- [ ] **Step 3: Visitare ciascuna pagina categoria**

Cliccare su ciascuna delle 6 voci. Per ognuna verificare:
- Header con icona + titolo + tagline corretti (cfr. spec §2.3)
- Lista item con i nomi attesi (cfr. spec §2.4)
- Nessun bordo o background errato (tone applicato correttamente — Spinta Vendite = emerald, Eventi Vendita = rose, Prodotti Digitali = indigo, Direzione = blue)

- [ ] **Step 4: Verificare detail page di un item nuovo**

Cliccare su `Spinta Vendite > Booster Checkout`. Devono comparire i 3 blocchi Problema/Soluzione/Risultato con i copy dello spec §2.5, e il bottone CTA `Attiva il Booster Checkout` con sotto il prezzo `€197 una tantum`.

- [ ] **Step 5: Verificare detail page Live Promo (pacchetti)**

Cliccare su `Eventi Vendita > Live Promo`. Devono comparire:
- Problema/Soluzione/Risultato dello spec §2.5
- Tre card di pacchetto: `3 Live €1.490 / 6 Live €2.490 (–16%) / 12 Live €3.990 (–33%)`
- CTA `Pianifica i tuoi Live Promo`

- [ ] **Step 6: Verificare redirect legacy**

Visitare manualmente `http://localhost:3000/partner/accelera/acc-monetizzazione`. Browser deve cambiare URL automaticamente in `/partner/accelera/acc-spinta-vendite` e mostrare la pagina Spinta Vendite.

- [ ] **Step 7: Annotare problemi rilevati**

Se uno qualunque dei step sopra fallisce, NON procedere oltre. Documentare il problema e correggere prima di passare allo smoke checkout.

Nessun commit qui — è verifica visiva.

---

## Task 11: Smoke test checkout Stripe (test mode)

**Pre-requisito:** Task 9 completato (env vars Stripe configurate in `.env` locale).

- [ ] **Step 1: Avviare backend e frontend localmente**

```bash
# terminale 1
cd backend && uvicorn server:app --reload --port 8000

# terminale 2
cd frontend && npm start
```

- [ ] **Step 2: Test checkout `Booster Checkout` (una tantum semplice)**

Dal browser, partner loggato:
1. `Spinta Vendite > Booster Checkout > Attiva il Booster Checkout`
2. Browser deve fare redirect a `checkout.stripe.com/...`
3. Inserire carta test `4242 4242 4242 4242`, scadenza qualunque futura, CVC `123`
4. Submit → success → redirect a `/partner/servizi?success=true&servizio=booster-checkout`

- [ ] **Step 3: Test checkout `Live Promo — 6 eventi` (pacchetto medio)**

1. `Eventi Vendita > Live Promo`
2. Selezionare il pacchetto **6 Live**
3. CTA `Pianifica i tuoi Live Promo` → redirect a Stripe Checkout
4. Importo totale visualizzato in Stripe: **€2.490,00**
5. Completare pagamento test → success

Se l'importo Stripe non corrisponde a €2.490, il `stripeServiceId` del pacchetto non sta arrivando al backend correttamente. Tornare a Task 5 step 1.

- [ ] **Step 4: Test checkout `Gestione Campagne` (subscription)**

1. `Visibilità > Gestione Campagne > Attiva la Gestione Campagne`
2. Redirect a Stripe Checkout in modalità `subscription`
3. Stripe deve mostrare "€348,00 / mese"
4. Completare → success

- [ ] **Step 5: Verificare record `partner_servizi` creato**

Dopo i 3 acquisti test, verificare nel database:

```bash
cd backend && python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
async def main():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('MONGO_DB_NAME', 'evolution_pro')]
    async for s in db.partner_servizi.find({'servizio_id': {'$in': ['booster-checkout','live-promo-6','gestione-campagne']}}).sort('created_at', -1).limit(5):
        print(s.get('servizio_id'), s.get('stato'), s.get('partner_id'))
asyncio.run(main())
"
```

Expected: 3 record con `stato: attivo`.

Nessun commit — è verifica e2e.

---

## Task 12: Push e deploy

- [ ] **Step 1: Verifica stato git**

```bash
cd /c/Users/berto/Desktop/appevolution && git status && git log --oneline -10
```

Expected: working tree clean, 7-8 commit nuovi pronti a partire dal commit dello spec (`15c5d92`).

- [ ] **Step 2: Push su `main`**

```bash
git push origin main
```

(Auth permanente per push diretti su main — vedi memoria.)

- [ ] **Step 3: Verificare deploy Cloud Run + Vercel**

Backend Cloud Run: il push triggera build automatica via Cloud Build. Attendere ~3-4 min, poi verificare:

```bash
gcloud run revisions list --service=appevolution-backend --region=europe-west1 --limit=3
```

La nuova revisione deve essere `Active`.

Frontend Vercel: il push triggera build automatica. Verificare su `https://vercel.com/dashboard` che il deploy `appevolution` (custom domain `ciak.io`) sia completato.

- [ ] **Step 4: Smoke check produzione**

Da browser, aprire `https://ciak.io/partner` con utente partner reale, ripetere i passi del Task 10 (verifica visiva sidebar + 6 pagine + redirect compat).

NON eseguire checkout reale in produzione: il test mode Stripe già fatto in Task 11 è sufficiente fino a quando un partner reale non lo prova nella sua user journey.

Nessun commit — è deploy verification.

---

## Out of scope (per chiarezza)

- `Evolution Growth System` (Foundation/Growth/Scale) — restano come sono
- `frontend/src/components/partner/AcceleraCrescitaPage.jsx` (vecchio file per `app.evolution-pro.it`) — non toccare
- `frontend/src/App.js` route `acc-*` legacy (riga 1465-1468) — non toccare; sono per la vista pre-Ciak
- `AvatarCheckout.jsx` e `ConsulenzaCheckout.jsx` — non toccare
- Prezzo display Avatar PRO nella card hub — open question §6 dello spec, fuori da questo plan
- Commission 10% Gestione Campagne (fattura/bonifico mensile) — open question §6, fuori da questo plan
- Riacquisto automatico Live Promo dopo esaurimento pacchetto — open question §6, fuori da questo plan
