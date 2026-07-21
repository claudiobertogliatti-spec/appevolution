# Simulatore Fatturato €1M — Obiettivo definitivo

> **Stato:** obiettivo concordato con Claudio (21/07/2026), prima della costruzione. Questo documento è la fonte di verità su *cosa* costruire e *perché*. Il piano di implementazione task-by-task (TDD) si scrive al momento del build.

**Goal:** portare dentro Ciak Admin il pianificatore di fatturato a 3 anni verso €1M, oggi prototipato come artifact HTML, e darlo in mano a **Luca (AD)** perché lo tari su dati reali (scenari pessimisti/ottimisti). Il milione è la **traiettoria di 3 anni**, non il numero dell'anno 1.

---

## Perché

Il conto economico "primo milione" costruito da Claudio (e la revisione di ChatGPT) è directionally giusto ma **ingegnerizzato a ritroso**: fragile su (a) conversione top-funnel — dato live ~0 su 932 sulla landing — e (b) throughput di delivery (oggi ~5 partner lanciati vs 80/anno del modello). Le voci ricorrenti (EVO-S, provvigioni) sono ricavi **a regime**, non anno 1: le coorti maturano dopo 12 mesi.

Serve uno strumento che smetta di dare per scontati i tassi e li renda **leve tarabili sui dati veri**, mostrando la traiettoria onesta anno 1 → anno 2 → anno 3. Il prototipo esiste già ed è validato (logica testata in Node); va portato nel prodotto.

Prototipo di riferimento (artifact): https://claude.ai/code/artifact/e490c280-29f6-444a-b4e5-af04a9c2bfdc

## Decisioni prese (delegate da Claudio)

1. **Collocazione — Admin → Direzione / Cockpit €1M**, come vista dedicata "Simulatore Fatturato" accanto ai KPI reparto. Il cockpit mostra i dati *veri* (`repartoMetrics.js`, vedi `docs/` cockpit €1M); il simulatore è la *proiezione*. Stessa platea (Claudio, Antonella, Luca AD), stesso modello mentale del target €1M, piano e realtà affiancati.
2. **Persistenza — a fasi.**
   - **Fase 1 (MVP): calcolo 100% live + 3 preset pre-caricati coi numeri reali attuali.** Nessun backend, nessun DB. Come l'artifact ma dentro Ciak, con i preset tarati sulla realtà Evolution.
   - **Fase 2 (solo dopo uso reale): scenari salvabili/confrontabili su Mongo.** Si costruisce quando Luca lo usa davvero e chiede di salvare "prudente v2", "base rivisto", ecc. Rispetta la regola CEO: niente infrastruttura prima della validazione d'uso.
3. **Accesso:** Claudio + **Luca (AD)**, profilo direzione/superadmin. **Antonella: nessun accesso.**

---

## Il modello di calcolo (fonte di verità — invariato dal prototipo)

### Listino (costanti)
- Ciak Blueprint: **€27** (front-end, netto CAC nel modello)
- Ciak Start: **€499**
- Upgrade Partnership: **€2.291** (con credito dei €499 già pagati)
- Partnership diretta a freddo: **€2.790**
- **Provvigione 10% sul venduto del partner — SOLO durante i 12 mesi di Partnership.** One-shot per coorte, non ricorrente. Finiti i 12 mesi si spegne.
- **EVO-S = SOLO CANONE, nessuna provvigione dopo.** 4 tier: 147 / 297 / 497 / 797 €/mese. Media ponderata usata nel modello ≈ **363,7 €/mese** (mix 10/30/15/5 su 60). Permanenza minima 6 mesi; soggetto a churn.

### Motore (simulazione mensile su 36 mesi)
Ogni anno entra una coorte di partner **distribuita nei 12 mesi**. Per ogni anno `y` (0,1,2):
- Volume Blueprint anno = `bpSold_target × rampa[y]`.
- Funnel: `Start = Blueprint × conv1`; `Upgrade = Start × conv2`; `Partnership = Upgrade + dirette×rampa[y]`.
- **Clamp capacità:** partner effettivi = `min(domanda, capacità_lancio × 12)`. L'eccedenza è fatturato non incassato (segnalato).
- Ricavi riconosciuti nell'anno: Blueprint netto CAC (`bpSold×(27−CAC)`), Start, Setup (mix upgrade/diretta).

Per ogni sotto-coorte acquisita al mese `t`:
- **Lancio** a `t + (mesi firma→lancio)`.
- **Provvigione 10%:** matura ogni mese nella finestra `[t+TTL, t+12)` = `venduto_partner × 10%`. Zero fuori dalla finestra.
- **EVO-S canone:** dal mese `t+12` in poi, con decadimento churn: `retention × (1−churn)^(mesi_in_evos/12)` mensile × canone medio. Nessuna provvigione.
- I ricavi dopo il mese 36 non si contano → **l'anno 3 è una stima conservativa del regime**.

### Servizi extra
Upside, non base. Scalati sul volume (rampa). Mostrati come voce separata e marcata "upside".

### Leve — due gruppi
**Ipotesi di mercato** (cambiano con lo scenario; budget sul prudente):
- Venduto medio partner (€/mese) — *la leva che decide provvigioni ed EVO-S*
- Blueprint/anno target; conv Blueprint→Start; conv Start→Partnership; Partnership dirette/anno; % partner che entrano in EVO-S

**Realtà operativa** (le tara Luca sui dati veri):
- CAC per Blueprint; capacità di lancio (partner/mese); tempo firma→lancio (mesi); churn EVO-S (%/anno); rampa di crescita anno 1/2/3 (% del target); servizi extra a regime (€/anno)

### Scenari preset (valori iniziali — da sostituire coi dati reali Evolution)
| Leva | Prudente | Base | Ambizioso |
|---|---|---|---|
| Venduto partner €/mese | 2.000 | 4.000 | 6.000 |
| Blueprint/anno | 800 | 1.500 | 2.200 |
| Blueprint→Start | 10% | 15% | 20% |
| Start→Partnership | 12% | 20% | 25% |
| Partnership dirette | 8 | 20 | 30 |
| Entrano in EVO-S | 50% | 70% | 80% |
| CAC Blueprint | 25 € | 20 € | 15 € |
| Capacità lancio/mese | 3 | 6 | 8 |
| Firma→lancio | 7 mesi | 5 mesi | 4 mesi |
| Churn EVO-S | 25% | 20% | 12% |
| Rampa anno 1/2/3 | 40/70/100% | 50/80/100% | 60/85/100% |

**Regola d'uso (da CEO):** budget aziendale sul **prudente**; organico e capacità sul **base**; l'**ambizioso** serve solo a decidere quando assumere o automatizzare.

### Output
- 3 card anno (Anno 1 validare / Anno 2 sovrapporre / Anno 3 regime): breakdown per voce + totale + distanza dal milione.
- Grafico a barre traiettoria vs linea €1M.
- Alert sempre attivi che tengono onesto il modello:
  - **Anno 0 di validazione:** tutto poggia sul Blueprint che converte (dato live ~0/932).
  - **Doppio 10%:** il 10% della Gestione Campagne si somma o sostituisce il 10% della Partnership? Da chiudere nel contratto prima di budgettare gli extra.
  - **CAC che brucia cassa** se ≥ 27 €.
  - **Clamp capacità** quando la domanda supera i lanci producibili.
  - **Stress venduto=0:** mostra quanto crolla il modello senza il successo del partner.

---

## Dati reali da raccogliere per i preset (fonte, non assunzione)
Vedi `feedback_fonte_verita_dati_live`. Da confrontare alla fonte, mai dedurre dai tag:
- Conversione reale Blueprint (oggi ~0/932 — Systeme/landing).
- CAC reale per Blueprint (Meta Ads).
- Venduto medio mensile dei partner lanciati (Stripe / checkout funnel owned).
- Tempo reale firma→lancio (`partner_journey_steps`).
- Capacità di lancio sostenibile oggi (delivery: Andrea/Gaia + team).
- Retention/churn EVO-S (una volta attivo).

Finché mancano, i preset restano ipotesi dichiarate, non piano.

---

## Fasi di build

**Stack (verificato nel repo):** React + Tailwind (tema chiaro, Poppins, palette slate/yellow/blue), test con **Jest via `craco test`** (non Vitest), test colocati `*.test.js(x)` con `test`/`expect` globali. Pagine admin: `export function X({ onAuthExpired })` sotto `frontend/src/ciak/admin/pages/`, montate in `CiakAdminApp.jsx` (route relative a `/admin`). Home `/admin` = `CabinaRegia` (Luca). Accessi via `admin_type`; Antonella nascosta con `hideFor`/route guard.

**Fase 1 — MVP live dentro Ciak (obiettivo di questo ciclo)**
- Engine puro `frontend/src/ciak/admin/simulatoreFatturato.js` (costanti, scenari, `computeModel`), con test `simulatoreFatturato.test.js` che replicano i numeri del prototipo (base anno 1: setup €79.448, start €56.138; totali ~248k/508k/754k; EVO-S anno 1 = 0).
- Pagina `pages/SimulatoreFatturato.jsx` in stile admin (Tailwind chiaro), due gruppi di leve, 3 scenari, 3 card anno, barre traiettoria, alert.
- Route `/admin/simulatore` guardata (Antonella → redirect); card d'ingresso nella Cabina di Regia (home di Luca).
- Preset coi numeri di partenza (dichiarati provvisori finché non tarati sui dati veri).
- Nessun endpoint backend.

**Fase 2 — scenari salvabili (solo dopo uso reale)**
- Collezione Mongo `revenue_scenarios` (nome, leve, autore, timestamp).
- Endpoint admin CRUD sotto il router Ciak.
- UI salva/carica/confronta scenari.

**Fuori scope (v1)**
- Collegamento automatico dei preset ai dati live (fase successiva; prima manuale).
- Export PDF/condivisione esterna.
- Multi-utente/permessi fini oltre direzione.

## Decisioni finali (Claudio 21/07/2026)
- **Nome feature: "Simulatore Fatturato".**
- **Accesso:** Claudio + Luca (AD). Antonella nessun accesso.
- **Doppio 10% risolto — c'è un solo 10%, e vale SOLO il primo anno** (i 12 mesi di Partnership). Non si somma un secondo 10% dalla Gestione Campagne, né esiste provvigione ricorrente dopo il primo anno. La Gestione Campagne resta come servizio (canone fisso in "servizi extra"); il suo 10% non crea un secondo flusso provvigionale sopra quello di Partnership. Il modello attuale (una sola riga provvigione, finestra 12 mesi, EVO-S solo canone) è già corretto.
