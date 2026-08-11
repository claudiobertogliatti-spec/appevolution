# Evolution PRO / Ciak — istruzioni permanenti per Claude Code

**Questo file contiene solo regole in vigore.** La cronaca delle sessioni sta in
`docs/agents/DIARIO-2026.md` e non va letta se non a domanda. Potato l'11/8/2026 da 1320
righe, di cui il 42% erano diari caricati in ogni sessione senza servire. Se una regola qui
dentro è smentita dal codice, **vince il codice** — e la regola va corretta, non aggirata.

---

## 0. Ordine di lettura e mappa della memoria

1. **`docs/agents/PROTOCOL.md`** — protocollo multi-agente (Claude Code · Codex · Antigravity). Prima di tutto.
2. **`docs/agents/HANDOFF.md`** — cosa è successo prima di te. Va **aggiornato prima di chiudere la sessione**.
3. **Questo file** — contesto tecnico e regole di prodotto.
4. Se tocchi **dati partner**: `memory/CIAK_MIGRATION_MEMORY.md`, **per intero** (§7).

Riferimenti a domanda, non da leggere sempre:

| File | Cosa contiene |
|---|---|
| `docs/deploy-playbook.md` | Deploy: locale, GitHub, Vercel, Cloud Run. Unica fonte sul deploy. |
| `docs/ciak-evolution-operating-memory.md` | Offerta, posizionamento, Metodo EVO, servizi extra, messaggi da preservare. |
| `docs/runbooks/backend-problemi-noti.md` | Cause root e recovery dei guasti backend ricorrenti. |
| `docs/runbooks/funnel-systeme-partner.md` | Creare il funnel Systeme.io di un partner (manuale, browser). |
| `docs/runbooks/standard-editing-video.md` | Standard di editing Descript per masterclass e lezioni. |
| `docs/runbooks/youtube-reauth.md` | Rigenerare il token OAuth YouTube della pipeline. |
| `docs/brand/ciak-brand-kit.md` | Brand kit definitivo v1.0 (font, palette). |
| `docs/strategy/ulama-adattamento-ciak.md` | Backlog strategico prodotto (20 voci). |
| `docs/marketing/claudio_voice_style.md` | Voce di Claudio per outreach (email/DM/WhatsApp). |
| `docs/agents/DIARIO-2026.md` | Cronaca storica. Non normativa. |

⚠️ `AGENTS.md` **non esiste più** (verificato 11/8/2026). La regola di precedenza
`CLAUDE.md > AGENTS.md` in `PROTOCOL.md §6` è rimasta senza oggetto.

---

## 1. Regole non negoziabili

### 1.1 Niente è "fatto" senza prova
Una prova è: **comando eseguito + suo output**, **URL live + cosa si vede**, **risposta
dell'API interrogata alla fonte**, **screenshot**. Non sono prove: "ho aggiornato il file",
"dovrebbe funzionare", "il deploy è partito". In `HANDOFF.md` le colonne **DICHIARATO** e
**VERIFICATO** sono separate apposta: in VERIFICATO si scrive solo con la prova accanto.

### 1.2 No-guessing
Mai assumere l'esistenza di file, path, firme di funzione, librerie, variabili o endpoint
senza averli letti o interrogati. Prima di proporre una modifica: **aprire il sorgente
reale**, non lo snippet parziale né il ricordo di sessioni precedenti.

Etichettare sempre: ✅ **fatto verificato** (con la prova a fianco) · 🔎 **deduzione logica**
(dichiarata come tale) · ⛔ **dato mancante / non verificabile** (evidenziato subito).
Se manca l'accesso per verificare al 100%, **dirlo** invece di produrre la risposta
plausibile. Se la richiesta è ambigua, chiedere.

> **Regola d'oro**: una risposta incompleta ma vera vale più di una risposta completa e
> inventata. Un report che inventa righe è peggio di nessun report.

### 1.3 Git
1. **Mai `git add .` o `git add -A`.** Si aggiungono i file per nome, sempre: il repo
   contiene artefatti locali, archivi e file di credenziali.
2. **`main` è in produzione.** Un push su `main` fa partire CI e deploy. Non si pusha per "provare".
3. **Un agente = un branch** quando il lavoro dura più di un commit: `cc/<tema>` (Claude Code), `ag/<tema>` (Antigravity).
4. **Prima di iniziare**: `git fetch origin && git status`.
5. **Mai committare chiavi, token, `.env`, `client_secret.json`** — questo repo è **pubblico**
   (verificato 11/8/2026: `visibility: public`). Vale anche per i file `.md`.

### 1.4 Chi decide
Prezzo, sconti, contratti, chiavi e credenziali: decide **Claudio**. Un accordo fra due
agenti è una raccomandazione, non una delibera. Il piano commerciale ha la precedenza sul
lavoro di piattaforma: se stai per costruire qualcosa che non è stato chiesto, fermati e
scrivilo in `HANDOFF.md` invece di costruirlo.

### 1.5 Comunicazione
**Parlare sempre in italiano con Claudio**, in ogni risposta.

### 1.6 Autorizzazione operativa
Claude è autorizzato a committare e pushare senza chiedere conferma a ogni operazione, e a
operare in autonomia sul repository. **Non dare mai a Claudio comandi da eseguire a mano**:
si esegue direttamente.

---

## 2. Offerta e prezzi (fonte: `docs/ciak-evolution-operating-memory.md`)

| Prodotto | Prezzo | Note |
|---|---|---|
| **Ciak Blueprint** | **27 €** IVA inclusa | ✅ `backend/routers/checkout.py:256` → `unit_amount: 2700` |
| Ciak Start / Fondazioni | 499 € | Resta **cliente**, non partner. Credito garantito: chi passa alla Partnership paga 2.291 € |
| **Partnership completa** | **2.790 € + 10%** sulle vendite per 12 mesi | `contract.py` `DEFAULT_CONTRACT_PARAMS`; contratto Art.5: max 3 rate mensili |
| Consulenza Claudio | 299 € (1) / 699 € (3) | |
| Consulenza Antonella | 179 € (1) / 399 € (3) | |

⚠️ **`67€` non è un prezzo, è nomenclatura legacy.** Stati `purchased_67`/`clicked_67`, tag
`ciak_bought_67`/`ciak_clicked_67`, label "Analisi 67 EUR" sono nomi mai rinominati. Il
prezzo è 27 €. Non propagare "67€" come prezzo corrente.

Il 10% si spiega così: i servizi valgono ~10.000 €, il partner investe ~30%, Evolution ~70%;
il 10% remunera rischio, costruzione e affiancamento nei primi 12 mesi. Il sistema si
costruisce **dentro il subaccount Systeme.io del partner**: se non rinnova dopo 12 mesi non
perde il lavoro fatto.

---

## 3. Design — Brand-Lock First

Standard estetico di riferimento: Apple, Stripe, Linear, Vercel. Ma qui **l'estetica è
subordinata al brand**: si produce il deliverable venduto, e un funnel fuori brand non è
"meno bello", è un prodotto rotto.

### 3.1 Gerarchia di precedenza — inviolabile
1. **Brand kit definitivo** → priorità assoluta. Ciak/Evolution PRO: font **Poppins**,
   palette `#0F172A` `#64748B` `#E5E7EB` `#FACC15` (fonte `docs/brand/ciak-brand-kit.md` v1.0,
   confermata definitiva il 18/5/2026). Per i partner: token da `partner_brand_kits`.
2. **Direttiva design generica** (bento grid, glassmorphism, micro-interazioni, font display)
   → valida **solo dove non esiste un brand lock**: nuovi clienti, concept, mockup.

⛔ Non sostituire Poppins con un font "più di carattere". ⛔ Non scartare `#E5E7EB` perché
"grigio piatto": è un colore ufficiale. In caso di conflitto → **proporre** a Claudio, mai
applicare di nascosto. `#F43F5E` è il quinto colore **semantico** (urgenza/errori), **non un
colore di marca**: l'accento resta `#FACC15`. Anche `#F59E0B` (stato *pending* in
`funnel_export_service.py:155,178`) è semantico: non toccarlo.

### 3.2 Il giallo non si usa per il testo su fondo chiaro
Stessa hex, tre ruoli, due destinazioni: **non fare un replace globale**. Testo su fondo
scuro → `#FACC15`; testo su fondo chiaro → **`#0F172A`** (il giallo su bianco non passa il
contrasto); sfondi/bordi/linee/token → `#FACC15`.

### 3.3 Verifica dipendenze prima di animare
✅ Verificato 11/8/2026: `evolution-pro-site` ha `framer-motion@12.42.2`; **`frontend/` non ha
né framer-motion né gsap**. Aggiungere una libreria di motion dove non c'è è una **decisione
da far approvare**, non un dettaglio da infilare in un commit. Il pubblico Ciak è poco
digitalizzato: rispettare `prefers-reduced-motion`, non nascondere contenuto critico dietro
un'animazione.

### 3.4 Onestà sui dati
⛔ Mai generare recensioni, testimonianze, percentuali o claim di guadagno inventati: è
illecito (Codice del Consumo artt. 21-23, direttiva Omnibus). È il motivo per cui
`POST /funnel/{id}/genera-ai` è ritirato con **HTTP 410** (✅ `funnel_builder.py:243`).

### 3.5 Stato dei sorgenti
✅ Verificato 11/8/2026 con `grep -rn` su `backend/`: palette vecchia (`#1a1a2e`, `#e94560`,
`#f5a623`) → **0 occorrenze**; gialli fuori brand (`#FFD24D`, `#F2C418`) → **0**.
⛔ **Aperto**: `backend/routers/funnel_builder.py` (righe 438, 614, 664, 733) e
`backend/funnel_export_service.py:104` usano ancora `'Segoe UI'`. Il brand è Poppins.

### 3.6 🪤 Trappole di lettura sul funnel builder (già costate ore)
- `test_funnel_builder.py` è un test **e2e HTTP**: **invia** i colori nel payload e poi
  asserisce quelli. Cambiare i default NON lo rompe.
- `LandingPageParams` **non è usata** oltre alla definizione: `POST /{partner_id}/landing-page`
  passa il dict grezzo a `_render`, quindi lì i default non si applicano. Li applica `funnel_factory.py:57`.
- `_render` sostituisce **solo le chiavi presenti**: una chiave mancante lascia il
  placeholder letterale (`{COLORE_PRIMARIO}`) → CSS invalido, non "colore di default".

---

## 4. Architettura e deploy

### 4.1 Dove gira cosa
- **Frontend**: `frontend/` (CRA, bundle `CiakApp`) su **Vercel**, progetto `ciak-frontend`.
  Domini `ciak.io` / `www.ciak.io`. Deploy automatico su push a `main`.
- **Sito istituzionale**: `evolution-pro-site/` → `www.evolution-pro.it` (Vite).
- **Backend**: Cloud Run `evolution-pro-backend` + `evolution-pro-worker`, region
  `europe-west1`, project `gen-lang-client-0744698012`.
- **DB**: MongoDB Atlas. **Redis**: Upstash. **Celery**: worker in-process nel backend
  (`GET /api/celery/status` → `worker_running`).

### 4.2 Il deploy è automatico — non deployare a mano
✅ Verificato 11/8/2026: esistono `.github/workflows/ci.yml` e `.github/workflows/deploy-backend.yml`.
- **CI** su ogni PR e push: gitleaks · `compileall` · flake8 E9/F821 · lista esplicita di unit test · build smoke frontend.
- **Deploy backend** su push a `main` che tocca `backend/**`: builda da `origin/main`, deploya
  backend + worker, punta il traffico all'ultima revisione, smoke test su `/api/health`.

⛔ **Superato, non rifare**: `gcloud run deploy --source ./backend` dalla cartella locale
(deployava una copia stale), trigger Cloud Build `auto-deploy-main`, Dockerfile dal bucket
GCS, servizio `evolution-pro-frontend-v2` (non esiste più), commit via editor web GitHub +
iniezione CodeMirror. Erano workaround per un sandbox senza git: oggi la CI è il gate.

### 4.3 Regola anti-confusione
Locale passato ≠ online · GitHub pushato ≠ Vercel pronto · Vercel pronto ≠ backend
deployato · backend deployato ≠ frontend aggiornato. Ogni deploy si chiude col blocco
`Deploy summary` di `docs/deploy-playbook.md`.

### 4.4 Dominio dismesso
`app.evolution-pro.it` è **morto** (DNS rimosso). Per URL frontend usare
`https://www.ciak.io`. ✅ Verificato 11/8/2026: 0 occorrenze in `backend/` e `frontend/src/`.

---

## 5. Percorso partner

### 5.1 Fasi
| Phase | Step attivo | Significato |
|-------|-------------|-------------|
| F1 | 1 | Posizionamento · F2 → Funnel Light · F3 → Masterclass |
| F4 | 4 | Videocorso · F5 → Funnel Vendita · F6 → Lancio |
| LIVE / OTTIMIZZAZIONE | 7 | Partner live |

**Metodo EVO** (3 fasi, non 7, verso il cliente): **Esamina** (brand, storia, posizionamento) ·
**Valida** (masterclass, videocorso, funnel, lancio) · **Ottimizza** (dal go-live al 12° mese).
**Messaggio da mantenere**: il partner **supervisiona e valida**, Evolution **implementa**.
Copy finale, funnel, automazioni e setup non sono a carico del partner: usare
"valida/conferma/supervisiona", mai "riscrivi/pubblica/costruisci".

### 5.2 Team AI Ciak — canonico, customer-facing
Fonte di verità: `frontend/src/ciak/partner/operativo/agents.js` (export `AGENTS`), foto in
`frontend/public/agents/*.jpg`. **Non inventare altri agenti customer-facing.**

| Agente | Ruolo | Step |
|---|---|---|
| **Stefania** | Coordinatrice del percorso | 01, 02, 10 (+ default) |
| **Valentina** | Brand & Posizionamento | burocrazia, 03, 04 |
| **Andrea** | Coach video e contenuti | 05, 06, 07, 08 |
| **Gaia** | Supporto tecnico funnel | 09 |
| **Marco** | Strategia lancio | 11, 12, 13 |
| **Matteo** | Analista Ciak Blueprint | scoring/diagnostica |

**Luca** è a parte: agente **lato admin** (AD di Claudio), chat in Cabina di Regia
(`/admin`), backend `backend/routers/admin_luca.py`. Modalità **sola consulenza**: legge i
reparti, consiglia, **non esegue e non approva**.

⛔ **Non modificare il system prompt di Matteo** (`backend/services/ciak_matteo.py` / prompt
store) senza via libera esplicita di Claudio. **Brand voice (non negoziabile)**: tono
diretto, italiano semplice, anti-fuffa, frasi brevi. Vietato il registro guru/coach-speak
(tabella termini vietati in `ciak_matteo.py`).

### 5.3 Organigramma e admin
4 reparti: **Vendite** → Gaia · **Delivery** → Stefania · **Comunicazione** → Andrea ·
**Back office** → Valentina. I 4 responsabili restano anche membri del team che lavora il
percorso partner: il cappello di reparto si aggiunge, non sostituisce. Sidebar admin: array
`NAV` in `frontend/src/ciak/admin/CiakAdminApp.jsx`, 5 macro-voci (Dashboard · Acquisizione ·
Vendite · Delivery · Back office) con `hideFor: ["antonella"]`. Home `/admin` = Cabina di
Regia; Antonella vede solo Dashboard + Delivery.

### 5.4 Dati partner — leggere il protocollo prima di toccare
Prima di qualsiasi lavoro sui dati di un partner (migrazione, compilazione step,
allineamento fasi): **leggere per intero `memory/CIAK_MIGRATION_MEMORY.md`**. Non leggerne
frammenti con grep: è proprio la parte non letta che dice che stai sbagliando approccio.

Le due regole più violate:
- **Regola 7** — non marcare una fase come completa perché esiste un materiale parziale.
- **Regola 6** — ciò che non abbiamo si lascia vuoto o si segna come mancante; non si inventa.

⚠️ Gli stati "✅ fatto" scritti nelle memorie **non sono verificati**: verificare sempre alla
fonte (`GET /api/partners/{id}`, `/api/partner-hub/{id}`, `/api/admin/partner/{id}/full-data`).

### 5.5 API partner-hub — il modo veloce (non la UI campo per campo)
Richiede **autenticazione** (dal 30/7/2026): admin/superadmin su qualunque partner, il
partner solo sul proprio `partner_id`.

- `GET /api/partner-hub/{partner_id}` — profilo completo
- `PUT /api/partner-hub/{partner_id}` — upsert (solo campi non-null)
- `PATCH /api/partner-hub/{partner_id}/field?field=X&value=Y` — singolo campo

Campi ammessi: `whoYouAre, targetAudience, problem, solution, pitch, differentiator,
offerName, offerPrice, offerIncludes, offerGuarantee`. Qualunque altro nome → 422.
Dalla console del browser (admin su `www.ciak.io`) il token è in
`localStorage.ciak_admin_token`, da passare come `Authorization: Bearer`. Vista admin
dell'area partner: `localStorage.setItem('ciak_partner_view_id', JSON.stringify({id,name}))`
→ `/partner/mio-spazio`.

**Lista partner**: interrogare `GET /api/partners`. ⛔ La tabella ID di giugno 2026 (24
partner, ora in `DIARIO-2026.md`) è **incompleta**: una probe live dell'11/8/2026 ne ha
contati **26**.

### 5.6 Evolution ID
`EVO-XXXXXXXX` (8 hex uppercase), generato alla prima registrazione e **invariato** per tutta
la vita dell'utente (utente → cliente → partner). In `users`/`partners`/`clienti`
(`.evolution_id`); file `backend/auth.py`, `backend/server.py`. ⛔ **Da verificare** se il
backfill (`POST /api/admin/backfill-evolution-ids`) sia mai stato eseguito: la memoria si
contraddiceva.

---

## 6. Pipeline video

### 6.1 Flusso reale — il partner NON fa editing
1. Il team Evolution crea lo script (admin panel) → 2. il partner **approva lo script** →
3. il partner registra il grezzo e invia il link Drive/GCS → 4. il team edita e carica su
YouTube (unlisted, playlist del partner) → 5. il partner **approva il video**.

Identico per masterclass e per ogni lezione del videocorso.

**Visibilità al partner**: mostrare solo *"Video ricevuto — il team sta lavorando
all'editing"*. ⛔ Mai label tecniche ("Trascrizione AI", "Taglio filler words", "Upload YouTube").

### 6.2 Pipeline automatica
`queued → downloading → cleaning → transcribing → cutting_fillers → uploading_youtube →
ready_for_review → approved`. Task: `backend/video_pipeline_task.py` (heartbeat ogni 30s;
`check_stuck_video_pipelines` in `celery_tasks.py` resetta e ritriggera i task morti).
Playlist YouTube creata al primo video: `"Evolution PRO - {partner_name}"`.

Servizi: AssemblyAI (trascrizione), Shotstack (watermark masterclass), Systeme.io
(pubblicazione). **Le chiavi stanno nelle env var di Cloud Run e in Secret Manager, non in
questo file.** Per ogni nuovo partner l'unico step manuale è creare il corso Systeme.io e
salvare `partner.systeme_course_id`.

### 6.3 Revisione testo stile-Descript
Con `VIDEO_REVIEW_ENABLED=true` la pipeline si ferma **dopo la trascrizione** (stato
`da_revisionare`): si revisiona il *testo* contro lo script, si disattivano i tagli
sbagliati, si approva → montaggio. Schermata `/admin/revisione-video/:partnerId`
(`frontend/src/ciak/admin/pages/MasterclassReview.jsx`), endpoint
`/api/partner-journey/masterclass/review-data/{id}` e `.../review-approve`.
⛔ Coperta solo la **masterclass**; il videocorso no.

### 6.4 ⏳ Token YouTube — aperto
Se le lezioni finiscono in `error_youtube` con `invalid_grant`, il token OAuth è scaduto. Il
token attuale fu emesso quando la consent screen era in "Testing" → eredita la scadenza a 7
giorni. **Va rigenerato ora che l'app è in Production.** Vedi `docs/runbooks/youtube-reauth.md`.

---

## 7. 🪤 Trappole note — anti-ricorrenza

Regole generalizzate da bug reali. Ognuna è costata tempo almeno una volta.

1. **Mai affidarsi al disco locale di Cloud Run per file persistenti**: è effimero e
   per-istanza. Ogni file che deve sopravvivere va su Cloudinary/GCS. Se "Visualizza" dà 404
   con content-type `application/json`, è quasi certamente un file finito solo su disco locale.
2. **`server.py` ha shadow routes**: fare `grep` prima di toccare un endpoint. Esiste il test
   `backend/tests/test_no_shadow_routes.py`.
3. **Doppio campo hash password**: verificare quale dei due si sta leggendo.
4. **Import `emergentintegrations`**: il pacchetto non è installabile da PyPI. Ogni import a
   livello di modulo va in `try/except ImportError`.
5. **Nel frontend non togliere il prefisso `/api`** dagli URL: Vercel proxa *solo* `/api/*` →
   Cloud Run. Un URL senza prefisso cade sulla SPA e restituisce `index.html`.
6. **Emergent AI non esiste più.** `EMERGENT_LLM_KEY` è una chiave Anthropic Claude. Non
   ragionare su "Emergent gestisce il backend".
7. **`gcloud run services describe` stampa tutte le secret in chiaro.** Filtrare sempre la
   sola chiave necessaria.
8. **PowerShell**: `&&` non funziona, usare `;`. Git si esegue da `C:\Users\berto\appevolution`
   — le copie su Desktop sono **ritirate**.

---

## 8. Manutenzione di questo file

Perché questo file era diventato illeggibile: ci si scriveva la **cronaca** invece delle
**regole**. Per non ricascarci:

1. **Una voce = una regola in vigore**, con data e dove si verifica. Il racconto di come ci
   si è arrivati va in `HANDOFF.md` o in `DIARIO-2026.md`.
2. **Niente hash di commit, niente "Sessione del …", niente TODO personali** qui dentro: i
   TODO stanno in `HANDOFF.md` sotto **APERTO**.
3. Quando una cosa è **chiusa**, la voce si **cancella** o si riduce a una riga con la prova.
   Non si lascia il racconto della chiusura.
4. Quando una cosa è **superata**, si scrive ⛔ e si dice cosa fare *invece*.
5. Un workflow lungo (>20 righe) diventa un **runbook** in `docs/runbooks/` con un puntatore qui.
6. **Massimo 350 righe.** Lo verifica la CI: `backend/tests/test_docs_coerenza.py` fallisce
   se il file sfora, se cita path inesistenti o se contiene qualcosa che somiglia a una
   chiave. Se il test è rosso la memoria è marcia: si pota, non si alza il limite.
