# Ciak Start €499 — erogazione reale (design)

Data: 2026-07-30 · Decisioni di Claudio prese in sessione · Stato: da implementare

## Perché questo documento

Ciak Start è venduto ma non erogabile. Verificato il 30/7 alla fonte:

- l'area `/cliente/start` (`frontend/src/ciak/client/pages/StartPage.jsx`, 124 righe) mostra 7
  righe "etichetta + stato" e nient'altro: nessun contenuto, nessun form, nessun deliverable;
- **nessun endpoint del repo scrive `start_progress`** — esiste solo la creazione col default in
  3 punti (`services/ciak_client_accounts.py:66`, `routers/ciak_clients.py:463`,
  `routers/stripe_webhook.py:457,510`). Gli step non possono avanzare, né dal cliente né dall'admin;
- l'account cliente nasce **solo** dal Blueprint €27 (`routers/checkout.py:499-507`), quindi chi paga
  i €499 da Payment Link statico non ha né account né accesso;
- l'endpoint che risolve l'attivazione manuale (`POST /api/admin/ciak-start/activate`) esiste
  **solo** su `origin/ag/ciak-start-activate` (`backend/routers/ciak_admin.py:3664`), non su `main`:
  in produzione non c'è;
- un pagamento da Payment Link statico non ha `metadata.tipo` → `routers/stripe_webhook.py:217-256`
  lo instrada nel ramo `else` (servizi extra): l'incasso arriva, il credito €499 da scalare dalla
  Partnership **non viene registrato**.

## Cosa abbiamo promesso (vincolante, 4 fonti concordi)

| Fonte | Promessa |
|---|---|
| `messaggi-ko-v2.txt` (5 inviati, 9 in coda) | "Non è un documento. È un percorso in cui **costruisci** le cose una alla volta: posizionamento, brand, profili, sito vetrina, strategia contenuti e calendario editoriale. Alla fine **hai gli asset in mano**" + "499 si scalano interi" |
| 22 PDF già in mano ai ko | gli stessi 7 step, incluso *readiness partnership* |
| `services/ciak_offers.py:73-76` | "definizione del posizionamento, brand, profili, sito e strategia contenuti" |
| `default_start_progress()` | Posizionamento · Brand · Profili social · Sito vetrina · Strategia contenuti · Calendario · Readiness |

**Le 7 label non si toccano.** Sono su documenti già consegnati e sulla descrizione Stripe.

## Decisioni prese (Claudio, 30/7)

1. **Erogazione su area EVO come "partner light"**, non area cliente nuova.
2. **Sito vetrina pubblicato sul dominio proprio del cliente** (non sottodominio Systeme).
3. **21 giorni, 3 consegne datate, 1 sola call** (kickoff 30'), resto asincrono con approvazione
   team entro 48h lavorative.
4. Profili social: il sistema genera bio e cover, **li applica il cliente**. Non chiediamo mai gli
   accessi ai suoi social.
5. Calendario editoriale a **90 giorni** (non 30 di lancio, non 12 mesi): un cliente Start non ha
   un corso da lanciare.
6. **La vetrina non vende**: nessun checkout, nessun opt-in, nessuna automazione. È il confine
   col pacchetto da €2.790.

## Architettura

### Il vincolo che determina tutto

`require_partner_or_admin_for_partner` (`routers/partner_journey.py:28-46`) risolve il `partner_id`
**dal record `users`**, e `seed_partner_journey` (`services/journey_seed.py:73`) scrive su
`partners.journey_current_step`. Quindi un cliente Start **deve avere un record `partners`** per
usare l'area operativa. L'alternativa — adattare il gate — significa mettere le mani in
`partner_journey.py` (6.000+ righe) che oggi serve partner paganti: non si fa con la cassa in gioco.

### Modello dati

- `partners.tier = "start"` (campo nuovo, esplicito). Nessun subaccount Systeme, nessun contratto
  partnership, nessuna automazione partner.
- `users` con `partner_id` valorizzato (⚠️ in fase di piano verificare il ramo non-admin della
  guardia, righe 46+, per il valore corretto di `role`).
- `ciak_clients` resta la fonte per credito e pagamento (`start_credit_amount`,
  `start_purchased_at`), così la promessa dello scalo sulla Partnership vive dove già vive.
- `partner_journey_steps` con la definizione Start.

### Debito da pagare nello stesso commit, non dopo

I clienti Start finiscono nella collection dei partner da €2.790. Senza filtro si sporcano cockpit
€1M, `/api/partners`, lista Gestione Partner, conteggi fatturato e i check di
`routers/admin_diagnostics.py` (`MISSING_SUBDOMAIN` e `REVENUE_ZERO_WITH_ACTIVE_CONTRACT`
scatterebbero su ogni cliente Start). Filtro `tier != "start"` introdotto **contestualmente**.
Se si rimanda, i numeri diventano inaffidabili in una settimana.

## Il percorso: 11 step interni, 7 asset promessi, 3 consegne

| # | step_id | Origine | Consegna |
|---|---|---|---|
| 1 | `02-discovery-video` | riuso, copy da riscrivere per Start | — |
| 2 | `start-attivazione` | **nuovo** (ricevuta €499 + credito), sostituisce `01-contratto` | — |
| 3 | `burocrazia` | riuso identico (alimenta le pagine legali della vetrina) | — |
| 4 | `03-brand-kit` | riuso identico + `brand_kit_pdf_renderer.py` | Sett. 1 |
| 5 | `la-tua-storia` | riuso identico + `storia_pdf_renderer.py` | Sett. 1 |
| 6 | `obiettivo` | riuso identico | Sett. 1 |
| 7 | `04-posizionamento` | riuso identico + `posizionamento_pdf_renderer.py` | Sett. 1 |
| 8 | `start-profili` | **nuovo** | Sett. 2 |
| 9 | `start-vetrina` | **nuovo** | Sett. 2 |
| 10 | `start-contenuti` | **nuovo**, riusa `editorial_calendar` in `mode="start"` | Sett. 3 |
| 11 | `start-readiness` | **nuovo** | Sett. 3 |

Tutti in `macro_phase: "esamina"` → agente **Valentina**, attestato e dispensa di fine fase
già esistenti (`certificati_pdf_renderer.py`, `PhaseRewardCard`).

## Componenti

### Backend — modifiche a codice esistente
- `models/partner_journey_step.py`: nuova costante `START_JOURNEY_STEPS`. La definizione
  partnership non si tocca.
- `services/journey_seed.py`: `seed_partner_journey(..., tier)` sceglie la definizione.
  Resta idempotente (check su `partner_id` + `step_id`).
- `services/editorial_calendar.py`: `mode="start"` → 90 giorni da posizionamento + offerta,
  senza `06-outline-lezioni`.
- Filtri `tier != "start"` nei punti di conteggio elencati sopra.
- `POST /api/admin/ciak-start/activate` (da `ag/ciak-start-activate`, **da mergiare per primo**):
  oltre a `ciak_clients`, crea `partners` con `tier=start`, `users` agganciato, journey Start,
  e restituisce il magic link.

### Backend — nuovo
- `services/profili_social_kit.py` — bio per piattaforma dal posizionamento, cover dal brand kit,
  checklist di applicazione.
- `services/vetrina_builder.py` — pagina di presentazione brandizzata (template **nuovo**, non
  `LANDING_PAGE_TEMPLATE` di `funnel_builder.py` che è un funnel) + le 3 pagine legali già
  generate da `funnel_builder.py` (cookie, privacy, CGV) parametrizzate su `sito_url`.
- `services/start_readiness.py` — asset consegnati, gap verso la Partnership, credito €499,
  prossimo passo.

### Frontend
- 5 componenti in `frontend/src/ciak/partner/operativo/steps/` + 5 righe nel registry
  `STEP_COMPONENTS` (`PartnerOperativo.jsx:11`).
- Badge "Ciak Start" nell'area: non deve sembrare la Partnership.
- `StartPage.jsx` diventa la **porta**: le 7 consegne con le date + accesso al percorso.
  L'erogazione non si duplica lì.

### Fuori scope, deliberatamente
Automazione della pubblicazione vetrina (API Vercel, gestione domini). Resta procedura manuale
(`npx vercel --prod`) + checklist DNS per il cliente. È infrastruttura prima della validazione:
si fa dopo la terza vendita. **Vincolo:** la parte DNS deve essere una checklist eseguibile da
Antonella o dal cliente, mai una call di Claudio.

## Flusso end-to-end

1. Il cliente paga (Payment Link statico oppure checkout self-service).
2. Attivazione: `POST /api/admin/ciak-start/activate` con l'email.
3. L'endpoint crea/aggiorna `ciak_clients` (credito), `partners` (`tier=start`), `users`,
   il journey Start, e restituisce il magic link.
4. Claudio invia il magic link e fissa il kickoff (unica call, 30').
5. Il cliente entra: badge Start, agente Valentina, 3 consegne con date.
6. Compila dati → brand kit → storia → obiettivo → posizionamento. I due step con approval bridge
   (`03-brand-kit`, `04-posizionamento`) passano dal team entro 48h lavorative. PDF generati.
7. Settimana 2: profili + vetrina. Il sistema genera, il team pubblica, il cliente riceve la
   checklist DNS.
8. Settimana 3: strategia + calendario 90 giorni.
9. Readiness: PDF finale + attestato + dispensa + proposta upgrade €2.291 col credito già scalato.

## Casi limite

| Caso | Comportamento |
|---|---|
| Doppia attivazione / doppio pagamento | idempotente: non raddoppia il credito, non azzera i progressi |
| Email Stripe ≠ email account | l'email è la chiave dell'attivazione; mismatch = riconciliazione manuale |
| **Upgrade a Partnership** | **additivo**: il journey si estende agli step Valida senza perdere i dati compilati. Se si sbaglia qui, chi sale perde il lavoro fatto |
| Cliente senza dominio | non blocca la consegna: sottodominio nostro, si sposta quando compra il dominio |
| Pagamento da link statico | cieco per il webhook (nessun `metadata.tipo`): attivazione manuale. Debito: creare i Payment Link con metadata via API |
| Generazione AI fallita | fallback deterministico, come già fa `editorial_calendar`. Mai una pagina vuota al cliente |

## Test

**Unit**
- `START_JOURNEY_STEPS`: 11 step, tutti `macro_phase=esamina`, `step_number` ordinati.
- `seed_partner_journey` con `tier="start"` seeda 11 step; con `tier="partnership"` invariato.
- `build_editorial_calendar(mode="start")` produce 90 giorni senza outline corso.
- `start_readiness` con asset parziali.
- Filtri `tier`: un cliente Start non compare nei conteggi partner né nei 2 check diagnostici.

**Integrazione**
- Attivazione idempotente: crea `partners` + `users` + journey; seconda chiamata non duplica.
- Guardia: il cliente Start accede al proprio `partner_id`, non ad altri.
- Upgrade additivo: journey esteso, `data` degli step preesistenti intatta.

**E2E manuale (gate prima del primo cliente vero)**
Attivazione su cliente di test → login col magic link → compilazione di uno step → PDF generato.
Mai su dati di partner veri.

## Ordine di implementazione

1. Merge di `ag/ciak-start-activate` (superato il gate Codex) — senza questo non esiste attivazione.
2. Definizione step Start + seed per tier + filtri `tier`.
3. `start-attivazione` + `start-readiness` (chiudono la promessa del credito).
4. `start-profili` + `start-contenuti` (riuso alto, valore immediato).
5. `start-vetrina` + runbook DNS.
6. `StartPage` come porta + badge.

I punti 1-3 sono il minimo per erogare a un cliente reale senza promesse scoperte.

## Aperti

- Valore corretto di `users.role` per un cliente Start: verificare il ramo non-admin della guardia
  (`partner_journey.py:46+`) prima di implementare.
- Chi esegue la pubblicazione della vetrina in pratica (Claudio o Antonella) e con quale account
  Vercel: decisione operativa, non tecnica.
- Copy dello step Benvenuto per Start (oggi è scritto per il partner da €2.790).
