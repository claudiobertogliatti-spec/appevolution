# Ciak Start €499 — erogazione reale, dentro un'unica area a livelli (design)

Data: 2026-07-30 · Decisioni di Claudio prese in sessione · Stato: da implementare

> **Revisione della sera del 30/7.** La prima versione di questa spec progettava un "partner light":
> il cliente Start dentro l'area partner, accanto a un'area cliente `/cliente` mantenuta. Superata.
> Il compromesso nasceva da un vincolo che **non esiste**: credevo che l'area partner servisse 26
> partner paganti in produzione. Claudio ha confermato che **nessun partner è attualmente attivo
> dentro Ciak** — la migrazione dei dati è ancora in corso. Non c'è codice vivo da proteggere,
> quindi si fa il modello giusto: **un solo account, una sola area, un solo percorso, livelli di
> accesso.**

## Perché questo documento

Ciak Start è venduto ma non erogabile. Verificato il 30/7 alla fonte:

- l'area `/cliente/start` (`frontend/src/ciak/client/pages/StartPage.jsx`, 124 righe) mostra 7
  righe "etichetta + stato" e nient'altro: nessun contenuto, nessun deliverable;
- **nessun endpoint del repo scrive `start_progress`** — solo creazione col default in 3 punti
  (`services/ciak_client_accounts.py:66`, `routers/ciak_clients.py:463`,
  `routers/stripe_webhook.py:457,510`). Gli step non avanzano, né da cliente né da admin;
- l'account nasce **solo** dal Blueprint €27 (`routers/checkout.py:499-507`): chi paga i €499 da
  Payment Link statico non ha né account né accesso;
- `POST /api/admin/ciak-start/activate` esiste **solo** su `origin/ag/ciak-start-activate`
  (`backend/routers/ciak_admin.py:3664`), non su `main`: in produzione non c'è;
- un pagamento da Payment Link statico non ha `metadata.tipo` → `stripe_webhook.py:217-256` lo
  instrada nel ramo `else`: l'incasso arriva, **il credito €499 da scalare non viene registrato**.

## Cosa abbiamo promesso (vincolante, 4 fonti concordi)

| Fonte | Promessa |
|---|---|
| `messaggi-ko-v2.txt` (5 inviati, 9 in coda) | "Non è un documento. È un percorso in cui **costruisci** le cose una alla volta: posizionamento, brand, profili, sito vetrina, strategia contenuti e calendario editoriale. Alla fine **hai gli asset in mano**" + "499 si scalano interi" |
| 22 PDF già in mano ai ko | gli stessi 7 step, incluso *readiness partnership* |
| `services/ciak_offers.py:73-76` | "definizione del posizionamento, brand, profili, sito e strategia contenuti" |
| `default_start_progress()` | Posizionamento · Brand · Profili social · Sito vetrina · Strategia contenuti · Calendario · Readiness |

**Le 7 label non si toccano.** Sono su documenti già consegnati e sulla descrizione Stripe.

## L'idea portante

**Ciak Start non è un prodotto separato: è il primo tratto del Protocollo EVO, venduto da solo.**

Finché è un prodotto a sé, ogni passaggio di livello è una migrazione tra mondi — ed è da lì che
nascevano le tre falle del design precedente (`tier` mai aggiornato, avanzamento riazzerato, step
invisibili). Se invece è *lo stesso percorso, fermato prima*, allora l'upgrade non è una migrazione:
è un lucchetto che si apre. E la promessa commerciale "i €499 si scalano interi" diventa vera nel
codice, non solo nel messaggio: non compri due volte, continui.

## Architettura

### Un solo account

Oggi l'identità è spezzata su tre collection: `users` (auth), `ciak_clients` (chi entra dal funnel),
`partners` (chi eroga). Da qui vengono `_canonical_user_for_client` (`ciak_clients.py:272`) e il
rischio di record doppi.

Target: **`users.id == ciak_clients.id == partners.id`**, un solo identificativo. È già così nel
flusso partnership (`proposta.py`: `partner_id` è l'id dell'utente); va reso invariante.

Divisione di responsabilità, senza fondere le collection (fonderle toccherebbe ogni router: no):

| Collection | Ruolo |
|---|---|
| `users` | autenticazione e ruolo |
| `ciak_clients` | record **commerciale**: diagnosi, offerta, crediti, pagamenti |
| `partners` | record **operativo**: journey, brand kit, materiali, asset |
| `partners.tier` | **l'unico asse di accesso**: `blueprint` → `start` → `partnership` → `evo_s` |

Il record operativo si crea **al primo pagamento, qualunque sia il livello** — non solo dal basso.
⚠️ **Correzione del 30/7 sera:** la prima stesura diceva "nasce dal Blueprint €27", perché
`ensure_client_for_blueprint` (`checkout.py:504`) è l'unico punto che crea account oggi. **È
sbagliato:** il partner Luigi Calafiore è entrato acquistando **direttamente la partnership**, senza
passare dall'analisi. Se il modello assume l'ingresso dal basso, chi entra dall'alto ricade nello
stesso buco che stiamo chiudendo.

**Il `tier` non è una scala da percorrere: è un livello che si assegna.** I tre ingressi devono
creare l'account allo stesso modo, con `tier` diverso:

| Ingresso | Account oggi | Email con l'accesso oggi |
|---|---|---|
| Blueprint €27 | sì, `ciak_clients` (`checkout.py:504`) | ❌ canale inesistente (verificato 30/7) |
| Start €499 | no: solo attivazione manuale | ❌ niente |
| **Partnership diretta** | sì, `partners` via `proposta.py` | ✅ workflow Systeme `516732` attivo, campo `partner_setup_url` |

Per i partner il canale **esiste**: Calafiore è quindi il primo test reale del pattern magic-link.
**Da verificare: ha ricevuto l'email di setup password ed è riuscito a entrare?** Se no, l'email
transazionale serve anche per la partnership, non solo per Blueprint e Start.

### Una sola area

`/cliente` (`StartPage`, `BlueprintPage`, `PartnershipEducationPage`, `ClientLayout` — 548 righe)
va in **dismissione**, non in manutenzione: duplica concetti dell'area operativa e nessuna feature
va scritta due volte. ⚠️ Prima di staccarla: verificare quanti clienti Blueprint la stanno usando
(dato **non** in nostro possesso — non si stacca su un'inferenza).

Ciò che era `/cliente/start` diventa una **vista di riepilogo dentro l'area unica**: le 7 consegne
promesse con le loro date. Non è un secondo posto dove si eroga.

### Un solo percorso, con `min_tier` per step

`JOURNEY_STEPS_DEFINITION` (`models/partner_journey_step.py:61`) resta **una sola definizione**,
estesa con i 4 step che oggi mancano e con un campo nuovo `min_tier` per step. Niente
`START_JOURNEY_STEPS` separata: era la radice del problema.

| step_id | Fase EVO | `min_tier` | Stato |
|---|---|---|---|
| `02-discovery-video` Benvenuto | esamina | `blueprint` | riuso, copy da adattare per livello |
| `start-attivazione` (ricevuta + credito) | esamina | `start` | **nuovo** |
| `01-contratto` | esamina | `partnership` | riuso |
| `burocrazia` I tuoi dati | esamina | `start` | riuso (alimenta le legal della vetrina) |
| `03-brand-kit` | esamina | `start` | riuso + `brand_kit_pdf_renderer.py` |
| `la-tua-storia` | esamina | `start` | riuso + `storia_pdf_renderer.py` |
| `obiettivo` | esamina | `start` | riuso |
| `04-posizionamento` | esamina | `start` | riuso + `posizionamento_pdf_renderer.py` |
| `start-profili` | esamina | `start` | **nuovo** |
| `start-vetrina` | esamina | `start` | **nuovo** |
| `start-contenuti` (strategia + calendario 90gg) | esamina | `start` | **nuovo** |
| `start-readiness` | esamina | `start` | **nuovo** |
| `05-script-masterclass` … `13-lancio` | valida | `partnership` | invariati |

I 4 step nuovi entrano in **Esamina per tutti**, non solo per i clienti Start: profili, sito vetrina,
strategia e calendario sono parte della fase "chiariamo chi sei e a chi parli" anche per un partner
da €2.790, che oggi semplicemente non li ha come step espliciti. Un percorso, non due.

### Gate per livello

Un solo helper (`services/entitlements.py`, nuovo) che risponde a: *questo tier vede questo step /
questa sezione?* Usato da backend e frontend, mai duplicato in condizioni sparse.

| Elemento | `blueprint` | `start` | `partnership` |
|---|---|---|---|
| Home, Percorso, Materiali | ✅ | ✅ | ✅ |
| Step Esamina `min_tier=start` | 🔒 | ✅ | ✅ |
| Fase Valida / Ottimizza | 🔒 | 🔒 | ✅ |
| Team Ciak.io (`/partner/team`) | 🔒 | 🔒 | ✅ |
| Servizi Extra, Rinnovo (`PartnerSidebar.jsx:19-22`) | 🔒 | 🔒 | ✅ |

**Bloccato significa visibile e non raggiungibile**, nemmeno via URL diretta: il lucchetto è la leva
di upgrade più onesta che abbiamo — non diciamo che è tuo, mostriamo dov'è. Ma il gate è nel
backend, non solo nella grafica.

### Upgrade = cambio di `tier`

Nessuna migrazione, nessun reseed, nessun record nuovo. `process_ciak_client_partnership_payment`
(`stripe_webhook.py:482-561`) — che oggi **non tocca `partners`** — deve scrivere
`partners.tier = "partnership"`. Fine.

Le tre falle del design precedente non vengono corrette: **non esistono più**. Il partner non
sparisce dai conteggi (il tier è l'unico asse, aggiornato in un punto solo); l'avanzamento non si
azzera (nessun riseed con `start_step_number=2`); gli step Start non scompaiono dalla mappa (sono
step del percorso unico, non di una definizione parallela).

## Componenti

### Backend — modifiche
- `models/partner_journey_step.py`: 4 step nuovi in `esamina` + campo `min_tier` su tutti.
- `services/entitlements.py` (**nuovo**): unico luogo dove vive la gerarchia dei tier e la domanda
  "cosa vede questo livello".
- `services/journey_seed.py`: seed dell'unica definizione; gli step sopra il tier nascono `blocked`.
- `services/editorial_calendar.py`: `mode="start"` → 90 giorni da posizionamento + offerta, senza
  pretendere `06-outline-lezioni`.
- `routers/checkout.py`: alla conferma Blueprint crea anche il record operativo con `tier="blueprint"`.
- `routers/stripe_webhook.py`: `tier="start"` sul pagamento Start, `tier="partnership"` su quello
  Partnership.
- `POST /api/admin/ciak-start/activate` (da `ag/ciak-start-activate`, **da mergiare per primo**):
  crea/recupera l'account, imposta `tier="start"`, registra credito e pagamento, restituisce il
  magic link.
- Conteggi partner e i 2 check di `routers/admin_diagnostics.py`: contano `tier="partnership"` e
  oltre. Con il tier come unico asse, il filtro è una condizione sola, non una toppa.

### Backend — nuovo
- `services/profili_social_kit.py` — bio per piattaforma dal posizionamento, cover dal brand kit,
  checklist di applicazione.
- `services/vetrina_builder.py` — pagina di presentazione brandizzata (template **nuovo**, non
  `LANDING_PAGE_TEMPLATE` di `funnel_builder.py`, che è un funnel) + le 3 pagine legali già
  generate da `funnel_builder.py` (cookie, privacy, CGV) parametrizzate su `sito_url`.
- `services/start_readiness.py` — asset consegnati, gap verso la Partnership, credito, prossimo passo.

### Frontend
- 5 componenti step in `operativo/steps/` + 5 righe nel registry `STEP_COMPONENTS`
  (`PartnerOperativo.jsx:11`).
- `PartnerSidebar` e `JourneyMap` derivano le voci dal tier (helper condiviso, non `if` sparsi).
- Badge del livello in area. Copy di `GoLive21Banner` per livello: i 21 giorni valgono per Start,
  ma "prima lanciamo e prima incassiamo" parla di un lancio che un cliente Start non fa.
- `/cliente`: in dismissione, dopo la verifica sui clienti Blueprint.

### Fuori scope, deliberatamente
Automazione della pubblicazione vetrina (API Vercel, gestione domini). Resta la procedura manuale
già in uso (`npx vercel --prod`) + checklist DNS. **Vincolo:** la parte DNS deve essere eseguibile
da Antonella o dal cliente, mai una call di Claudio.

## Decisioni di Claudio (30/7)

1. **Una sola interfaccia a livelli**, l'account nasce dal Blueprint €27, i servizi Partnership
   restano visibili ma bloccati.
2. **Sito vetrina sul dominio proprio del cliente** (scartati sottodominio Systeme e solo-contenuti).
3. **21 giorni, 3 consegne datate, 1 sola call** (kickoff 30'), resto asincrono, approvazioni ≤48h.
4. **Profili social:** il sistema genera bio e cover, li applica il cliente. Mai chiedere i suoi accessi.
5. **Calendario a 90 giorni** (non i 30 di lancio, non 12 mesi): un cliente Start non ha un corso.
6. **La vetrina non vende** (no checkout, opt-in, automazioni): è il confine col €2.790.

## Flusso end-to-end

1. Il cliente paga (Payment Link statico oppure checkout self-service).
2. Attivazione: `POST /api/admin/ciak-start/activate` con l'email → account, `tier="start"`,
   credito, journey, magic link.
3. Claudio invia il magic link e fissa il kickoff (unica call, 30').
4. Il cliente entra nell'area: badge del livello, agente Valentina, 3 consegne con date, fasi
   successive visibili e bloccate.
5. Compila dati → brand kit → storia → obiettivo → posizionamento. I due step con approval bridge
   (`03-brand-kit`, `04-posizionamento`) passano dal team entro 48h lavorative. PDF generati.
6. Settimana 2: profili + vetrina. Il sistema genera, il team pubblica, il cliente riceve la
   checklist DNS.
7. Settimana 3: strategia + calendario 90 giorni.
8. Readiness: PDF finale + attestato + dispensa + proposta upgrade €2.291 col credito già scalato.
9. Se compra: `tier="partnership"`. Stessa area, stesso percorso, lucchetti aperti.

## Email di onboarding: la consegna dell'accesso esce da Systeme

### La falla trovata il 30/7

`_deliver_client_access_link` (`routers/checkout.py:93-125`) **non invia alcuna email**: scrive il
campo `client_access_url` sul contatto Systeme ed emette il tag `ciak_client_access_ready`. L'invio
dipende interamente da un workflow configurato **dentro Systeme.io**.

Nel censimento dei workflow Systeme (17/5) i tag attivi sono `ciak_bought_67` e
`partner_setup_pending`, e l'unico custom field creato è `partner_setup_url`:
**`ciak_client_access_ready` e `client_access_url` non risultano**. Se è ancora così, un cliente che
paga il Blueprint €27 non riceve l'accesso: il magic link viene generato e salvato in
`ciak_clients.last_magic_login_url`, ma non raggiunge nessuno.

Aggravante: entrambe le chiamate sono best-effort con `logger.warning`, quindi il webhook risponde
200 comunque. **Il fallimento è silenzioso**: nessun allarme, nessun contatore, nessun test — la
logica di consegna vive in una configurazione che git non vede.

### ✅ VERIFICATO IN SYSTEME il 30/7 (sessione di Claudio, sola lettura) — la falla è confermata
- Campo `client_access_url`: **non esiste** (l'unico campo affine è `Partner Setup URL`).
- Tag `ciak_client_access_ready`: **non esiste**, 0 contatti.
- **Nessun workflow** su quel tag: verificati tutti gli 8 flussi di lavoro attivi e le 8 regole di
  automazione. Nessuna riguarda l'accesso cliente.
- Workflow `Ciak Bought 67` (516729), attivo, 3 email: puntano a `/ciak-blueprint/grazie` (pagina
  **statica, uguale per tutti**) e a Cal.com. **Nessun link personale per entrare in piattaforma**,
  nessun uso di un campo di accesso.
- Tag `ciak_bought_67`: **2 contatti**. `ciak_bought_27` e `ciak_bought_499`: 0.

**Nessun cliente è rimasto fuori: in admin `CLIENTI CIAK = 0` e `BLUEPRINT ACQUISTATI = 0`.** Il
danno è potenziale, non ancora avvenuto → l'email va scritta prima della prima vendita, non dopo.

✅ **Discrepanza CHIUSA (30/7):** i 2 contatti taggati `ciak_bought_67` sono **Andrea Fredi e Daniele
Andolfi**, entrambi **partner**. Hanno acquistato l'analisi al **vecchio prezzo €67**, quando l'area
cliente Ciak non esisteva, e sono poi proseguiti in partnership: il loro record vive in `partners`,
non in `ciak_clients`. **Nessun cliente da recuperare.**
🔴 Corollario più duro: `ciak_bought_27 = 0` → **il Blueprint al prezzo attuale non è mai stato
acquistato da nessuno.** La catena del €27 non si è rotta: non è mai partita.

### 🔴 Conseguenza più grave: la catena del €27 non è mai stata percorsa
Con `ciak_clients = 0`, **nessuno ha mai completato** pagamento → account → magic link → accesso. Il
27/7 era stata verificata la *creazione* della Checkout Session (`cs_live_...`), non un pagamento
andato a termine. Impatto sul piano: il **piano B3** (aprire gli ~8.400 warm verso il Blueprint €27)
si appoggia all'assunto "chi compra il Blueprint ha l'account e il checkout €499 self-service
funziona" — assunto **non validato da nessun pagamento reale**.
→ **Gate prima di qualunque invio massivo verso il €27: un pagamento vero end-to-end** (carta di
Claudio, l'incasso rientra) con verifica che nascano `ciak_clients`, magic link e accesso.

### Decisione

**L'email che consegna l'accesso è transazionale e la manda il backend via SMTP**, con esito
registrato. Systeme resta per marketing e nurturing, non per la chiave d'accesso. Perché:
1. se non parte dobbiamo accorgercene noi, non dal cliente che non si è mai visto;
2. un template nel repo è testabile e revisionabile, un workflow Systeme no;
3. limite già documentato: l'editor Systeme non accetta merge tag negli `href` → il link arriva come
   testo che *forse* il client email rende cliccabile. Per la chiave d'accesso "forse" non basta.

Infrastruttura già in casa da riusare: `services/ciak_checkpoint_email.py` (template HTML +
`send_checkpoint_email_sync`, SMTP `smtp.register.it`, sender `info@evolution-pro.it`) e
`services/ciak_analisi_delivery.py` (invio con link e con allegato).

### Nessuna credenziale via email

Non esistono password in chiaro e non si spediscono. Vale il pattern già in LOCK dal 17/5: **link di
accesso che porta dentro e fa impostare la password**. Per il cliente è meno attrito di
utente+password da copiare.

### Contenuto (`services/ciak_onboarding_email.py`, nuovo)

Un template, parametrico sul livello (`blueprint` | `start`). Target poco digitalizzato → **una sola
azione in alto**, il resto sotto (vedi il pattern low-literacy già adottato per i wizard).

1. Una frase: cosa hai comprato, cosa succede adesso.
2. **Un solo pulsante: "Entra e scegli la tua password"** + URL in chiaro sotto come rete di sicurezza.
3. **I prossimi passi numerati**, con il tempo che prende ciascuno. Per `start`: le 3 consegne con le
   date reali calcolate dalla data di pagamento (sett. 1 posizionamento e brand · sett. 2 profili e
   vetrina · sett. 3 contenuti e calendario).
4. Cosa aspettarsi da noi e quando: approvazioni ≤48h lavorative, call di kickoff da fissare.
5. A chi scrivere se il link non funziona.

### Trigger

| Evento | Oggi | Target |
|---|---|---|
| Pagamento Blueprint €27 | solo campo+tag Systeme (`checkout.py:516-526`) | email SMTP livello `blueprint` |
| Pagamento Start €499 (checkout) | **niente** (`process_ciak_start_payment` non invia nulla) | email SMTP livello `start` |
| Attivazione Start manuale (Payment Link) | **niente** | stessa email, dall'endpoint di attivazione |

### Osservabilità (la parte che oggi manca del tutto)

- Collection `onboarding_emails`: `email`, `tier`, `magic_link_id`, `sent_at`, `status`
  (`sent` | `failed`), `error`. Un pagamento senza riga corrispondente è un allarme.
- Retry: un tentativo differito in caso di errore SMTP, poi resta `failed` e visibile.
- **Fallback admin**: pagina/endpoint per rigenerare e reinviare l'accesso a un'email — vale anche
  come recovery per chi ha pagato prima di questo fix.
- **Controllo una volta sola sui già paganti:** contare i `ciak_clients` con
  `last_magic_link_created_at` valorizzato e token mai usato → sono clienti che hanno pagato e non
  sono mai entrati. Da fare appena il fix è in produzione, e da recuperare a mano.

## Dipendenza dalla migrazione partner (da coordinare, non ignorare)

La migrazione dei dati partner è **in corso in un'altra sessione** e scrive nel modello attuale
(nessun `tier`, journey senza i 4 step nuovi). Due conseguenze:

- **Backfill previsto e banale:** `update_many` per assegnare `tier="partnership"` ai partner
  migrati + seed idempotente per i 4 step nuovi (che nascono `pending`, non rompono nulla).
- **La finestra si chiude quando i partner entrano davvero.** Oggi nessun partner è attivo dentro
  Ciak: si può cambiare il modello dati senza rompere nessuno a metà percorso. Dopo, ogni modifica
  strutturale costa una migrazione. Questo lavoro va fatto **adesso**, non dopo.

## Casi limite

| Caso | Comportamento |
|---|---|
| Doppia attivazione / doppio pagamento | idempotente: non raddoppia il credito, non azzera i progressi |
| Email Stripe ≠ email account | l'email è la chiave dell'attivazione; mismatch = riconciliazione manuale |
| Upgrade | cambio di `tier`: nessun dato toccato, nessun reseed |
| Downgrade / mancato pagamento | il tier non si abbassa da solo: decisione umana, non automatismo |
| Cliente senza dominio | non blocca la consegna: sottodominio nostro, si sposta quando compra il dominio |
| Pagamento da link statico | cieco per il webhook (nessun `metadata.tipo`): attivazione manuale. Debito: creare i Payment Link con metadata via API |
| Generazione AI fallita | fallback deterministico, come già fa `editorial_calendar`. Mai una pagina vuota al cliente |
| **Sequenza Systeme `Ciak Bought 67`** | ✅ verificato 30/7: **non manda l'accesso**, quindi nessun doppione di credenziali. Ma le sue 3 email mandano il cliente alle 8 Domande e a Cal.com: **va riallineata**, non spenta, o lo stesso giorno riceve due messaggi che dicono cose diverse |
| Verifiche dietro login | sia la config Systeme sia `/api/ciak/admin/clienti-ciak` (JWT admin, `ciak_admin.py:45-53`) richiedono una sessione autenticata di Claudio: delegabili a un agente non-codice **con mandato di sola lettura** |

## Test

**Unit**
- `entitlements`: per ogni tier, quali step e quali sezioni sono visibili/raggiungibili.
- `JOURNEY_STEPS_DEFINITION`: 20 step, `min_tier` valorizzato su tutti, `step_number` ordinati.
- `seed_partner_journey`: gli step sopra il tier nascono `blocked`.
- `build_editorial_calendar(mode="start")`: 90 giorni senza outline corso.
- Conteggi partner: un account `tier=blueprint`/`start` non compare tra i partner né nei 2 check
  diagnostici; con `tier=partnership` **compare**.

**Integrazione**
- Attivazione idempotente: crea account + journey; seconda chiamata non duplica.
- Gate backend: un `tier=start` che chiama un endpoint di fase Valida riceve 403, non dati.
- Upgrade: cambio `tier` → nessuno step perde `data`, un solo step `in_progress`,
  `journey_current_step` invariato.

**E2E manuale (gate prima del primo cliente vero)**
Attivazione su account di test → login col magic link → compilazione di uno step → PDF generato →
upgrade simulato → gli asset Start sono ancora lì e visibili. Mai su dati di partner veri.

## Ordine di implementazione

1. Merge di `ag/ciak-start-activate` (superato il gate Codex) — senza questo non esiste attivazione.
1-bis. **Email di onboarding transazionale + osservabilità.** Sale in cima insieme al punto 1: un
   cliente che paga e non riceve l'accesso è il danno peggiore del sistema, e oggi accade in
   silenzio. Include il controllo sui già paganti mai entrati.
2. `min_tier` + `entitlements.py` + gate backend e sidebar. È la spina dorsale: prima di tutto il resto.
3. `start-attivazione` + `start-readiness` (chiudono la promessa del credito).
4. `start-profili` + `start-contenuti` (riuso alto, valore immediato).
5. `start-vetrina` + runbook DNS.
6. Vista riepilogo delle 7 consegne + dismissione di `/cliente`.

I punti 1-3 sono il minimo per erogare a un cliente reale senza promesse scoperte.

## Aperti

- Unificazione degli `id` (`users` / `ciak_clients` / `partners`): è il lavoro strutturale vero.
  Va quantificato prima di iniziare il punto 2 — quanti record esistono oggi con id divergenti.
- Quanti clienti Blueprint usano `/cliente` oggi: dato mancante, prerequisito della dismissione.
- Copy per livello dello step Benvenuto e del banner 21 giorni.
- Chi pubblica la vetrina in pratica (Claudio o Antonella) e con quale account Vercel.
