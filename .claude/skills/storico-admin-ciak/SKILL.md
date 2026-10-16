---
name: storico-admin-ciak
description: "Storico dell'admin Ciak e del backend: eliminazione app.evolution-pro.it, Calafiore e 'Segna 67 EUR pagato', Cabina di Regia, audit partner 26/6, sidebar reparti, card Campagne email, fatture di cortesia, Swipeeza archiviato, incidente Emergent force-push. Caricala per capire perché una parte dell'admin è fatta così prima di modificarla."
user-invocable: false
---

> Contenuto spostato alla lettera da `CLAUDE.md` il 30/9/2026. Sono note di sessione con
> la loro data: descrivono lo stato di allora. Prima di agire verifica sul codice attuale.

## Problema storico (ora risolto): Emergent force-push

In passato Emergent AI faceva force-push su `main` periodicamente. Questo non accade più. I fix critici sotto erano necessari dopo ogni reset Emergent.

### Fix da riapplicare dopo ogni Emergent reset

**1. `frontend/src/components/partner/stepConfig.js` — Phase mapping corretto**
```js
export function getStepFromPhase(phase) {
  if (!phase) return 1;
  if (phase === 'LIVE' || phase === 'OTTIMIZZAZIONE') return 7;
  const n = parseInt(phase.replace('F', '') || '1');
  if (n < 1) return 1;
  return Math.min(n, 7);
}
```
Motivo: F1→1 (step 1 attivo), F2→2 (step 2 attivo), ecc. Il vecchio codice usava F1→0 che bloccava tutti gli step.

**2. `frontend/src/components/partner/StepPageWrapper.jsx` — API constant**
```js
const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");
```
Motivo: in produzione i download materiali devono usare path relativo, non REACT_APP_BACKEND_URL.

**3. `frontend/src/App.js` — partnerSelf (dati reali partner)**
Aggiungere dopo `const [partnerShowChat,setPartnerSelf]=useState(false)`:
```js
const [partnerSelf,setPartnerSelf]=useState(null);
useEffect(() => {
  if (currentUser?.role === "partner" && currentUser?.partner_id) {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (token) {
      axios.get(`${API}/api/partners/${currentUser.partner_id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setPartnerSelf(r.data)).catch(() => {});
    }
  }
}, [currentUser?.partner_id]);
```
E modificare `basePartner`:
```js
const basePartner = currentUser?.role === "partner" && currentUser?.partner_id
  ? partnerSelf || partners.find(p => p.id === currentUser.partner_id) || { id: currentUser.partner_id, name: currentUser.name || "Partner", niche: "", phase: "F1", revenue: 0, contract: {}, alert: false, modules: [] }
  : partners[0] || null;
```
Motivo: il partner loggato non appare nell'array `partners` (che richiede ruolo admin per essere popolato).

**4. `frontend/src/App.js` — questionario_started token fix**
Nella route `/questionario`:
```js
if (!currentUser.questionario_started) {
  const updated = { ...currentUser, questionario_started: true };
  setCurrentUser(updated);
  localStorage.setItem("user", JSON.stringify(updated));
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");
  if (token) {
    fetch(`${API}/api/cliente-analisi/questionario-started`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
}
```
Motivo: Homepage salva il token come `access_token`, il vecchio codice leggeva solo `token`.

**5. `frontend/src/App.js` — renderPartnerSection route mancanti**
Aggiungere prima del `return <PartnerDashboardSimplified ...>`:
```js
if (nav === 'calendario-lancio') return <CalendarioLancioPage partner={p} onNavigate={setPartnerDashNav} />;
if (nav === 'webinar') return <WebinarPage partner={p} onNavigate={setPartnerDashNav} />;
if (nav === 'growth-system') return <GrowthSystemPage partner={p} onNavigate={setPartnerDashNav} />;
```

**6. `frontend/src/utils/clienteFlowGuard.js` — localStorage intro check**
```js
const introSeen = user.questionario_started || user.intro_questionario_seen ||
  (typeof localStorage !== "undefined" && localStorage.getItem("intro_questionario_seen"));
if (introSeen) return "/questionario";
```
Motivo: `intro_questionario_seen` è salvato in localStorage ma il guard controllava solo il campo DB.

**7. `frontend/src/components/cliente/IntroQuestionario.jsx` — token key fix**
Sostituire `localStorage.getItem("token")` con `localStorage.getItem("access_token") || localStorage.getItem("token")` in tutti i punti del file.

## Sessione 2026-06-19 — Eliminazione definitiva `app.evolution-pro.it` (Fasi 1-3)

**Obiettivo**: eliminare tutto ciò che riguarda `app.evolution-pro.it` (dominio morto) senza toccare `ciak.io`.
**Doc di riferimento/tracking**: `docs/migration/eliminazione-app-evolution-pro.md`.

### Stato di partenza
- Il dead code frontend era già stato rimosso (3/6): `frontend/src/App.js` + `components/` non esistono più; `index.js` monta `CiakApp` su tutti gli host.
- Residui trovati: default/CORS backend, embed funnel, commenti, pipeline build Vercel.

### Fase 1 — codice (commit su `main`)
- `backend/server.py`: rimosse da `ALLOWED_ORIGINS` `https://app.evolution-pro.it` e `https://www.app.evolution-pro.it`; 2× default `FRONTEND_URL` → `https://www.ciak.io`.
- `backend/routers/proposta.py`, `servizi_extra.py`, `flusso_analisi.py`: default `FRONTEND_URL`/`BASE_URL` → `https://www.ciak.io`.
- `backend/gcs_cors.json`: rimossa origin `app.evolution-pro.it`.
- `funnel_analisi_embed.html`, `funnel_analisi_minimo.html`: `API_URL` → `https://www.ciak.io`.
- `CLAUDE.md`: aggiunta sezione "Dominio DISMESSO"; recovery aggiornate a `ciak.io/admin`.
- Nuovo `docs/migration/eliminazione-app-evolution-pro.md`.

### Fase 2 — consolidamento deploy Vercel su Ciak (commit su `main`, deploy verde)
- `frontend/vercel.json`: collassati i 2 rewrite SPA in **un solo catch-all → `/index.ciak.html`** (rimossa la regola host-specifica e il ramo `index.evolution.html`); rimosso header `/index.evolution.html`.
- `frontend/scripts/postbuild-ciak.js`: ora **rimuove `build/index.html`** (`fs.unlinkSync`) invece di rinominarlo in `index.evolution.html`, così `/` non viene servito coi meta default.
- `frontend/src/utils/api-config.js`: `PRODUCTION_DOMAINS = ['ciak.io']`.
- `frontend/src/index.js`, `frontend/src/ciak/CiakApp.jsx`: commenti puliti (niente più `app.evolution-pro.it`).
- Test postbuild a vuoto OK (genera `index.ciak.html`, rimuove `index.html`); `vercel.json` valido.

### Fase 3 — infrastruttura (verificata/eseguita 2026-06-19)
- **Cloud Run env**: `FRONTEND_URL` era **già** `https://www.ciak.io` (e `STRIPE_CHECKOUT_URL_ANALISI` su ciak.io) → nessuna modifica. Nessun `BASE_URL` impostato.
- **Cloud Run domain mappings** (europe-west1): `Listed 0 items` → nessun mapping a `app.evolution-pro.it`.
- **Cloud Run services** (europe-west1): solo `evolution-pro-backend` e `evolution-pro-worker` (entrambi da tenere). NON esiste più `evolution-pro-frontend-v2` in europe-west1.
- **GCS CORS**: il bucket con `app.evolution-pro.it` era **`gs://gen-lang-client-0744698012_cloudbuild`** (upload resumable dal browser). Applicata CORS aggiornata (solo `ciak.io`/`www.ciak.io`) con `gsutil cors set`. Gli altri bucket (`ai-studio-bucket-...`, `run-sources-...`, `...-cloudbuild-logs`) sono Google-interni, non toccati.
- **Vercel**: progetto **`ciak-frontend`** (scope `claudiobertogliatti-specs-projects`), domini = `ciak.io` / `www.ciak.io` / `ciak-frontend.vercel.app`. Ricerca "evolution" tra i domini dell'account → **nessun risultato**: `app.evolution-pro.it` non era su Vercel.
- **DNS**: `app.evolution-pro.it` era **CNAME → `ghs.googlehosted.com`** (mapping Google orfano, nessun servizio dietro → 404). Record **rimosso su register.it** → il dominio non risolve più.

### Esito
`app.evolution-pro.it` non è più servito da nulla (Vercel/Cloud Run/DNS) ed è eliminato. `ciak.io` invariato e funzionante (deploy verde).

### Residuo opzionale (non urgente)
- Verificare in Stripe / Cal.com / Systeme.io eventuali success/cancel/redirect URL configurati a mano verso `app.evolution-pro.it` (lato env già su ciak.io).

### Note operative apprese
- I commit su `main` sono stati fatti via **editor web GitHub + iniezione CodeMirror 6** (console JS): il sandbox bash non ha credenziali git push, e il connettore GitHub MCP **non ha permessi di scrittura albero** (403 su tree). Pattern affidabile: applicare modifica CM6 → attendere che il bottone "Commit changes…" si abiliti → aprire dialog → il campo messaggio ha placeholder "Update <file>" → click "Commit changes".
- ⚠️ **Sicurezza**: `gcloud run services describe` stampa **tutte le secret in chiaro** (Stripe live, Anthropic, Mongo, ecc.). Per i describe futuri filtrare solo la chiave necessaria; se l'output è uscito dal PC, ruotare le chiavi live.

## Sessione 2026-06-18 (continuazione) - Luigi Calafiore + funzione admin "Segna 67 EUR pagato (manuale)"

### Luigi Calafiore - inserimento funnel ciak.io (ricostruzione processo offline)
Lead luigi.calafiore@gmail.com inserito passando dal funnel reale di www.ciak.io:
- Fase 1: opt-in masterclass gratuita (nome, email, telefono +39 327 188 1639) -> ciak_leads, source landing_hero + masterclass_gate.
- Fase 2: 8 Domande Ciak compilate (profilo reale: design automobilistico, Calafiore Automobili, hypercar made in Italy). Matteo -> Stato 3 (Validazione), score 9, report generato.
- Fase 3: analisi 67 EUR segnata come pagata (manuale) -> diagnostic_session a purchased_67.
Verifica: compare in Pipeline Blueprint (acquistato), Transactions (6700 cent), stats acquisti_67=1, uscito da Pipeline Prospect.

### NUOVA funzione admin: segna acquisto 67 EUR manuale (per acquisti offline)
Nel funnel ciak il passaggio a purchased_67 avviene SOLO via webhook Stripe (checkout.py). Non esisteva un modo admin per segnare un 67 EUR pagato offline (il "segna pagamento manuale" nel CLAUDE.md riguardava il vecchio flusso cliente_analisi, non i lead diagnostici ciak). Aggiunto:
- Backend: POST /api/admin/ciak/lead/mark-purchased in backend/routers/ciak_admin.py (commit 51e4bd1). Body: {email, amount_cent=6700, metodo="manuale", note}. Replica il webhook: transition_to(purchased_67) + add_event(stripe_payment_completed, manual=True) + replace_one. Idempotente (se gia' post-acquisto non fa nulla). Richiede una diagnostic_session esistente. NON esegue pagamenti reali ne emette tag Systeme.
- Frontend: sezione "Analisi 67 EUR" + bottone "Segna 67 EUR come pagato (manuale)" in frontend/src/ciak/admin/pages/AdminLeadDetail.jsx (commit 015c950). Usa apiPost.
Riutilizzabile per ogni inserimento offline: scheda lead admin -> bottone.

### Note deploy/infra (importante per le prossime sessioni)
- Sandbox bash Cowork NON ha credenziali git push (solo git fetch funziona). Commit fatti via connettore GitHub (create_or_update_file/push_files) oppure editor web CM6 in Claude in Chrome (base64+atob per evitare escaping; per file con unicode usare Uint8Array.from(atob(b64),c=>c.charCodeAt(0)) + new TextDecoder('utf-8')).
- ATTENZIONE: la copia di lavoro locale del repo (C:\Users\berto\appevolution) e' risultata STALE/TRONCATA (es. ciak_admin.py troncato a meta' file). NON usarla come base per i commit: origin/main e' avanti. Recuperare il contenuto autorevole via connettore GitHub get_file_contents o git fetch + worktree.

### Prossimo step Luigi: Partnership 2.790 EUR in 3 tranche (rate concordate)
Bridge automatico lead->proposta NON cablato (AdminLeadDetail "Genera Proposta" e' un alert placeholder; la diagnostic_session non ha partner_id). Gli stati partner_approved/partner_active non sono scritti da alcun endpoint: il "partner reale" e' governato da partners.partnership_pagata/active, non dalla state machine.
Percorso admin manuale supportato:
1. POST /api/partners {name, niche, phase:"F1"} -> annota id
2. POST /api/admin/upsert-partner-credentials {partner_id, name, email, password:"Evolution2026!", phase} (crea login + evolution_id + bridge)
3. (opz) PATCH /api/admin/partners/{id}/contract-params {corrispettivo:2790, num_rate:3} (default gia' 2790/3 rate; bloccato se contratto firmato)
4. (opz) POST /api/proposta/genera/{partner_id} -> URL https://www.ciak.io/proposta/{token} per firma digitale + PDF
5. POST /api/partners/{id}/segna-pagamento-partnership {amount, metodo_pagamento, note} per ogni tranche incassata (fa $inc revenue, invia email benvenuto)
6. POST /api/admin/ciak/partner/{id}/piano-pagamento {tipo:"rate_concordate", rate_totali:3, rate_pagate, importo_rata, prossima_scadenza, note}
UI pronta in PartnerDetailModal + ContractParamsModal (admin Ciak). Il piano-pagamento e' descrittivo (non addebita): le rate reali si incassano fuori sistema e si registrano con segna-pagamento-partnership + update rate_pagate. Prezzo 2.790 default in contract.py DEFAULT_CONTRACT_PARAMS; contratto Art.5 ammette max 3 rate mensili.

## Sessione 2026-06-26 — Cabina di Regia (organigramma 4 reparti) + canale di deploy via connettore GitHub

### ✅ NUOVO CANALE DI DEPLOY — connettore GitHub ora SCRIVIBILE (usare questo)
Il connettore GitHub di Claude (GitHub App "Claude Github MCP Connector", owner `anthropics`) era **autorizzato ma non installato** sui repo → ogni scrittura dava `403 "Resource not accessible by integration"`. **Risolto il 2026-06-26 installando la GitHub App sul repo `appevolution`** (installation_id `142749581`).
**Da ora il deploy si fa via connettore**, in un colpo e byte-esatto:
- `create_or_update_file` (per gli update serve la `sha` del blob corrente), `push_files` (più file in un commit), `delete_file`.
- Verifica: il commit ritorna la `sha` del blob → confrontarla con `git hash-object` del file locale (deve coincidere).
- **NON serve più** l'editor web GitHub + iniezione CM6 (vecchio workaround lento e a rischio corruzione): resta solo come fallback estremo.
- Il sandbox bash resta senza credenziali di push (solo `git fetch`); il canale di scrittura è il connettore.

### Cabina di Regia — nuova pagina admin
File `frontend/src/ciak/admin/pages/CabinaRegia.jsx` · route `/admin/cabina-regia` (voce di primo livello sotto "Dashboard", `hideFor: ["antonella"]`, registrata in `CiakAdminApp.jsx`).
Vista d'insieme dei **4 reparti operativi** col **semaforo di autonomia**: 🟢 automatico · 🟡 aspetta l'OK di Claudio · 🔴 urgente (fermo >4h).
Dati (endpoint già esistenti, senza auth): `/api/agent-hub/summary`, `/api/agent-tasks/approval-stats`, `/api/agent-tasks/approvals`, `/api/discovery/stats/today`.
Semaforo = matrice di `backend/approval_workflow.py` (NEVER_APPROVE=🟢 · ALWAYS_APPROVE/`awaiting_approval`=🟡 · stale/escalated=🔴).
Bottoni **Approva/Rifiuta** sui task 🟡 → nuovi endpoint backend `POST /api/agent-tasks/{id}/approve` e `/reject` in `server.py` (usano `approve_task`/`reject_task` di `approval_workflow.py`). Card cliccabili che portano al reparto.

### Organigramma — 4 reparti e responsabili (decisi da Claudio 2026-06-26)
| Reparto | Responsabile | Pagina collegata |
|---|---|---|
| Vendite (acquisizione → firma) | **Gaia** | `/admin/lead-manager` |
| Delivery (firma → LIVE) | **Stefania** | `/admin/partner` |
| Comunicazione (contenuti) | **Andrea** | `/admin/calendario-editoriale` |
| Back office (soldi/contratti/infra) | **Valentina** | `/admin/transactions` |

Regola: i 4 responsabili **continuano a far parte del team che lavora il percorso partner nella Delivery** (insieme a Marco e Matteo, che restano specialisti del percorso, non capi-reparto). Il "responsabile" è un cappello operativo in più, non sostituisce il ruolo dell'agente nel team prodotto.

### Briefing giornaliero schedulato
Task Cowork `briefing-cabina-regia` (cron `30 7 * * *`, ora locale): ogni mattina apre `/admin/cabina-regia` e manda a Claudio il riepilogo dei 4 reparti + semaforo + cosa aspetta il suo OK. Richiede app Cowork aperta e login admin su ciak.io.


## Sessione 2026-06-26 (continuazione) — Audit 7 partner attivi + Sprint acquisizione "dentro o fuori"

### Fronte 1 — Verifica migrazione dati 7 partner (via API partner-hub + full-data)
Metodo: fetch da console browser su www.ciak.io. Endpoint senza auth: `GET /api/partners`, `GET /api/partner-hub/{id}`. Con auth admin (token in `localStorage.ciak_admin_token`): `GET /api/admin/partner/{id}/full-data`, `/api/admin/ciak/leads`, `/api/admin/ciak/stats`.
ID: Marco Lamanna=15, Eva Gugliucciello=22, Cosimo Filieri=13, Daniele Andolfi=23, Andrea Fredi=045f338e-..., Sara Stella Due=00435c30-..., **Luigi Calafiore=92e68c6c-2671-46ba-9e06-df5752ebc7f6**.
Stato (posiz.=6 campi hub; offerta=offerName/Price/Includes/Guarantee):
- Daniele Andolfi (F5): posiz OK, offerta vuota, blueprint OK, MC script+video OK, videocorso 0 lezioni, **unico con funnel Systeme reale** (7121027).
- Cosimo Filieri (F5): posiz OK, **offerta parziale** (La Musicheria 59€; manca garanzia), blueprint OK, MC script+video OK, 0 lezioni, no funnel.
- Marco Lamanna (F4): posiz OK, offerta vuota, blueprint OK, MC video ma NO script, 0 lezioni, no funnel.
- Andrea Fredi (F1): posiz OK, offerta vuota, blueprint NO, MC script+video OK, 0 lezioni, no funnel.
- Sara Stella Due (F5): posiz OK, offerta vuota, blueprint NO, MC video ma no script, 0 lezioni, no funnel.
- Eva Gugliucciello (F5): posiz OK, offerta vuota, blueprint NO, MC script ma NO video, no videocorso, no funnel.
- Luigi Calafiore (F1): **tutto vuoto**, da popolare da zero.
Gap sistematici: **Offerta** mancante per quasi tutti; **videocorso 0 lezioni** per tutti; incoerenze fase↔dati (Eva e Sara in F5 senza asset da F5).

### Fronte 2 — Pipeline lead quasi vuota
`/api/admin/ciak/stats`: 7 lead, 2 acquisti €67. **Silvia Arcari (silvia.arcari73@gmail.com) è l'unico inbound vero.** Il resto è rete personale di Claudio (WhatsApp) o inserimenti manuali. → Il funnel non genera lead organici; converte l'outreach caldo personale.

### Decisione "dentro o fuori" + deliverable
Obiettivo **3 partnership/mese** (≈€8.370). Vincoli: **24/7 · budget ≈ zero · chiude solo Claudio**. Strategia organico/manuale. Numero magico: **~20 messaggi personalizzati/giorno (~400 contatti/mese)** → ~40 interessati → ~10 call → 3 close. 4 leve gratuite: outreach caldo personale (priorità), LinkedIn organico, lista fredda 13k (email engine già pronto da riallineare+accendere), referral 24 partner.
Deliverable creati: `docs/marketing/claudio_voice_style.md`, `docs/strategy/sprint-acquisizione-3-partnership.md`, `docs/marketing/messaggi-outreach-pronti.md`.
Prossimi step: (1) lista 100 contatti mirati sui 2 ICP (benessere + business/vendita), (2) riallineare le 9 email cold alla nuova voce, (3) foglio KPI contatti→risposte→call→close. Strumenti da autorizzare: Apollo, LinkedIn personal MCP, Gmail.

## Sidebar admin Ciak — 5 macro-reparti + Agente di Riferimento (2026-06-26)

**File unico**: `frontend/src/ciak/admin/CiakAdminApp.jsx` (array `NAV` + `<Routes>`). NON esiste `AdminSidebarLight.jsx`. La sidebar è a macro-voci con flyout al hover; `MacroItem` mostra sotto ogni titolo, in carattere piccolo, `(Agente di Riferimento: X)`. Filtro per ruolo: `hideFor: ["antonella"]`.

Struttura (organigramma a reparti):

| Macro | Agente di Riferimento | Voci | hideFor antonella |
|---|---|---|---|
| **Dashboard** | Luca | *Comando*: Panoramica Reparti (`/admin`) · *Urgenze*: Oggi, Approvazioni, Revisioni Video | no |
| **Acquisizione** | Andrea | Lead Manager, Lista Fredda, Masterclass Analytics, Pipeline Prospect, Campagne Ads, Calendario Editoriale | sì |
| **Vendite** | Gaia | Pipeline Blueprint, Analisi da validare, Servizi Extra | sì |
| **Delivery** | Stefania | Partner, Quarantena, Ex Partner, Pipeline Video, Documenti Partner, Stefania | no |
| **Back office** | Valentina | Transazioni, Configurazione, KB Matteo | sì |

**Home `/admin`** = Panoramica Reparti (pagina `CabinaRegia`) per Claudio; Antonella mantiene `AntonellaDashboard`. La voce Panoramica usa `to: "/admin", end: true`. La route `/admin/cabina-regia` resta come alias (usata dal task schedulato `briefing-cabina-regia`). L'ex pagina KPI `AdminDashboard` è stata rimossa dalla sidebar e dall'index (import eliminato per non rompere il build CRA su Vercel, che tratta i warning come errori).

**Antonella = reparto Delivery**: vede solo Dashboard + Delivery. Vista da rifinire (panoramica/Oggi dedicati a Delivery) — TODO.

**Luca = nuovo Agente di Riferimento della Dashboard (AD/amministratore delegato di Claudio)**. È un agente **lato admin** (diverso dai 6 customer-facing in `agents.js`): interfaccia unica verso tutti gli agenti, risponde su qualsiasi tema anche tecnico. Fase 1 fatta (etichetta in sidebar). **Fase 2 FATTA (2026-06-29)**: chat AD `LucaChat` dentro la Cabina di Regia (home `/admin`); backend `backend/routers/admin_luca.py` con endpoint `/api/admin/luca/chat` e `/history` (registrato in `server.py` subito dopo `admin_stefania`); contesto live che legge i reparti (partner/fasi/inattivi + step da `partners`/`partner_journey_steps`, lead + analisi 67 EUR da `ciak_leads`/`diagnostic_sessions`, MRR/health da `agent_hub_service`, semaforo da `approval_workflow`); **sistema operativo iniettato nel prompt** rubato dai migliori AD del mondo (Grove, Bezos, Collins, Wickman/EOS, Slootman, Dalio, Benioff, Doerr, Hastings, Campbell, Lencioni, Lean/Toyota, Drucker) = 20 principi + ritmo operativo giorno/settimana/trimestre + protocollo decisionale. Modalita' SOLA CONSULENZA (legge e consiglia, non esegue, non approva). ⚠️ **SUPERATO IL 15/8/2026 — vedi il riquadro "Stato di Luca" più sotto (sessione 2026-08-15): la chat continua a non eseguire, ma il briefing schedulato del mattino sì.** Storico chat in collezione `admin_luca_conversations`. **Resta solo la foto reale** `/agents/luca.jpg`: il connettore GitHub non carica file binari, quindi l'avatar usa il fallback monogramma "L" oro su antracite; la foto va caricata a mano (drag-drop su GitHub) o con un generatore di ritratti. Vincolo: NON toccare il system prompt di Matteo.

Tutte le route preesistenti restano registrate (è un filtro di vista). Pagine fuori sidebar ma vive via URL: `leads`, `clienti-analisi`, `partner-setup-pending`, `automazione` (serve all'area partner), `metriche`, `analisi-prompt`, `template-email`.

Commit: `660de01` (5 macro + Agente di Riferimento) · `b266800` (Panoramica Reparti = home /admin). Deploy via connettore GitHub, sha verificata + parse Babel/JSX OK.


## Sessione 2026-06-27 — Card "Campagne email" nella pagina admin "Oggi"

Claudio voleva vedere le statistiche delle campagne email nella pagina admin **Oggi**, aggiornate da sole ogni giorno.

**Vincolo**: le stats campagne email NON sono nella API pubblica Systeme (chiave). Vivono dietro la **sessione browser** dell'account Systeme `evolutionpro`, su endpoint interni `/api/dashboard/customer/mailing/...`. Il backend non puo' leggerle da solo -> le alimenta un task giornaliero che gira nel browser loggato su Systeme.

### Endpoint interni Systeme (sessione browser, NON API pubblica)
- Lista newsletter (broadcast): `GET https://systeme.io/api/dashboard/customer/mailing/newsletters/list?pagination[order]=next&pagination[limit]=50` — il limite DEVE essere 10/25/50. Ritorna `{items:[{mailing:{id,subject}, scheduledAt, stats:{emailsSent,emailsOpened,clicks}}], hasMore}`.
- Stats ricche + oggetto per singolo mailing: `GET .../mailing/{mailingId}/preview` -> `{email:{subject,fromName}, stats:{sentAmount,openedAmount,clickedAmount,bouncedAmount,spamReportAmount}}`.
- Altri: `.../mailing/{id}/statistics/list?pagination[limit]=N` (createdAt = data invio), `.../statistics/count`, `.../click-link-statistics`.
- Le campagne che NON sono "newsletter" (es. la riavvivazione mailing_id `12236704`) NON compaiono in newsletters/list -> vanno aggiunte come ID extra nel task.

### Backend (Cloud Run)
Nuovo router `backend/routers/email_campaigns.py` (registrato in `server.py` dopo funnel_builder), prefix `/api/admin/ciak`:
- `POST /email-campaigns/snapshot` -> upsert collection `email_campaign_stats` (una per mailing_id). Auth = **chiave condivisa** header `X-Snapshot-Key` (env `EMAIL_SNAPSHOT_KEY`, fallback `ciak-email-snapshot-2026`), NON il JWT admin (il task gira nel browser, non sempre loggato admin).
- `GET /email-campaigns` -> richiede JWT admin; lista recenti ordinata per `sent_at` desc.

### Frontend (Vercel)
- `frontend/src/ciak/admin/components/EmailCampaignsBlock.jsx` -> card che legge `GET /api/admin/ciak/email-campaigns` e mostra oggetto + data + inviate + aperture% + click% (+ spam se >0). Click a 0 evidenziato rosso.
- Montato in `frontend/src/ciak/admin/pages/Oggi.jsx` prima della sezione Alert.

### Task schedulato
`briefing-cabina-regia` (07:35) esteso: prima del briefing fa lo snapshot email (Systeme -> POST snapshot con la chiave) e aggiunge una riga "Email" nel briefing.

### Note deploy (importante)
Sandbox bash Cowork: NESSUNA credenziale git push + DNS ristretto (no ssh github). I 2 file NUOVI committati via **connettore GitHub** (sha byte-esatta verificata). I 2 file ESISTENTI modificati (`server.py` ~683KB, `Oggi.jsx`) via **editor web GitHub + CM6**: il connettore richiede il contenuto COMPLETO, e i file base (origin/main) non sono riproducibili byte-esatti a mano. Pattern di sicurezza usato: confronto SHA-256 del documento CM6 col file validato in sandbox PRIMA del commit (TextEncoder->crypto.subtle.digest), poi commit dal dialog GitHub.

## Sessione 2026-06-30 — Fatture di cortesia (Back office · Valentina)

Flusso per generare le **fatture delle vendite**. Scelte di Claudio: **PDF di cortesia**
(NON fattura elettronica SDI — l'invio resta al commercialista), per tutte e 3 le fonti di
vendita, intestate a **Evolution PRO LLC** e **SENZA IVA** (società di diritto USA/Delaware,
priva di P.IVA italiana → reverse charge ove applicabile). NON è la P.IVA italiana di
Bertogliatti: l'emittente è la LLC.

### Dati emittente (default, sovrascrivibili dalla UI)
Evolution PRO LLC · 8 The Green, Ste A, Dover, DE 19901, USA · EIN 30-1375330 · File Number
2394173 (Delaware Division of Corporations) · legale rappr. Claudio Bertogliatti · sede
operativa Torino · IBAN Revolut Bank UAB `LT94 3250 0974 4929 5781`. Fonte: `contratto_template_unpacked` + `routers/contract.py`.

### Dove
Admin Ciak → **Back office → Fatture** (`/admin/fatture`). Voce in sidebar `back-office`.

### File
- `backend/services/invoice_pdf.py` — costanti `EMITTENTE_DEFAULT` + `render_invoice_pdf(invoice, emittente)` (ReportLab, no IVA, nota reverse charge) + `upload_invoice_pdf_to_cloudinary()` best-effort.
- `backend/routers/ciak_admin.py` — endpoint fattura appesi in fondo (stesso router già registrato, auth `require_ciak_admin`).
- `frontend/src/ciak/admin/pages/Fatture.jsx` — pagina (tab Da fatturare / Emesse + fattura manuale + editor emittente).
- `frontend/src/ciak/admin/CiakAdminApp.jsx` — import + voce NAV back-office + route `fatture`.

### Endpoint (prefix `/api/admin/ciak`, auth admin)
- `GET /invoices/sources` — vendite fatturabili dalle 3 fonti con `gia_fatturata` + blocco `cliente` precompilato. Fonti: **Ciak Blueprint €67** (`diagnostic_sessions` con `stripe_payment_completed` + `ciak_orphan_purchases`), **Partnership €2.790** (`proposte.pagamento_completato`), **Servizi extra** (`partner_servizi` stato=attivo, prezzo dal catalogo `SERVIZI_CATALOGO`).
- `POST /invoices` — genera: numero progressivo, render PDF, salva. Idempotente per `source_key` (409 se già fatturata). Totale calcolato server-side dalle righe.
- `GET /invoices` — registro (senza pdf_base64) + totale fatturato. `GET /invoices/{id}` dettaglio.
- `GET /invoices/{id}/pdf` — stream PDF (dal base64 in DB).
- `POST /invoices/{id}/cancel` — annulla (resta a registro, esce dai totali, libera la sorgente).
- `GET|PUT /invoices/settings` — dati emittente (override su `ciak_invoice_settings`).

### Collezioni
- `ciak_invoices` — 1 doc/fattura: `id, numero, anno, data_emissione, fonte, source_key, partner_id, cliente{}, righe[], totale, valuta, stato(emessa|annullata), pdf_url(cloudinary|null), pdf_base64(durevole), created_at/by`.
- `ciak_invoice_counters` — `{_id: anno, seq}`, `find_one_and_update $inc upsert` → numerazione atomica `<prefix><anno>/NNN` (es. `2026/001`).
- `ciak_invoice_settings` — `{_id:"default", ...override emittente}`.

### Note
- PDF durevole in DB (base64) + backup Cloudinary → niente rischio disco effimero Cloud Run.
- Numerazione progressiva per anno, anti-duplicato via `source_key` (`blueprint:<sid>`, `partnership:<token|partner_id>`, `extra:<servizio_id_doc>`).
- Deploy via **connettore GitHub** (4 commit `7157552`, `59b92d5`, `aa0922b`, `f482463`), tutti verificati blob-sha byte-esatti. Base ricostruita da `origin/main` (working tree locale era 22 commit indietro).
- TODO eventuale: estensione a fattura elettronica SDI (provider) se servirà — la struttura dati è già pronta.

## Strumento contenuti — Swipeeza (AI Carousel Maker) — archiviato 2026-07-09

**Cosa è**: `swipeeza.com` — generatore AI di caroselli social (Instagram/LinkedIn/X). Punti forti = **velocità + qualità grafica** (motore GPT-Image-2, testo nelle slide leggibile). Il cuore del tool è la **knowledge base del brand in markdown**: la carichi una volta, l'AI la usa come "bibbia" a ogni generazione. Flusso: carichi KB → scrivi un topic in una frase → ottieni ZIP con 7 slide (1:1 o 4:5) + Story 9:16 + caption platform-aware + 3-5 hook alternativi. Funzioni: rigenerazione slide-per-slide, **multi-brand** (brand separati con KB/palette/font propri), 3 livelli qualità (Standard ~30-40 crediti / Enhanced 60-80 / Studio 120-180). **Limite**: fa slide+caption, NON pubblica né schedula (output → scheduler abituale). Prezzi: Free 200 cr 1 brand · Starter €29 (1 brand) · **Pro €79 (4.500 cr, 3 brand)** = fascia giusta per gestire i 2 brand Ciak · Studio €179 (10 brand).

**Stato**: Claudio NON lo sta ancora usando (me lo ha fatto conoscere). Materiale pronto per accensione futura in **`docs/marketing/swipeeza/`**:
- `KB-evolution-pro-ciak.md` — knowledge base brand #1 (Ciak/Evolution PRO) da caricare su Swipeeza.
- `KB-metodo-evo.md` — knowledge base brand #2 (Metodo EVO™: Esamina·Valida·Ottimizza).
- `guida-operativa-e-topic-pack.md` — analisi tool + setup consigliato + **30 topic Instagram pronti** (15 per brand, mappati sui 5 pillars / 3 fasi EVO).

Le due KB sono costruite sulla documentazione reale (voice-lock `docs/marketing/claudio_voice_style.md`, pillars/glossario tradotto `linee-guida-social-v5.md`, palette antracite `#1A1F24` + giallo `#FFD24D` + crema `#F5F3EE`, font Manrope, modello EVO 70/30 €2.790+10%). Contengono glossario che forza la traduzione dei termini tecnici (nicchia/funnel/posizionamento) e checklist anti-fuffa applicata a ogni slide. Canale ottimizzato: **Instagram** (feed 4:5 + Story 9:16). Quando Claudio vorrà accenderlo: entrare nel dashboard con Claude in Chrome (login richiesto), caricare le 2 KB come brand separati, generare i primi caroselli di prova e affinare le KB sull'output reale.
