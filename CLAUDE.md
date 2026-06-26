# Evolution PRO — Istruzioni permanenti per Claude Code

## Preferenze di comunicazione

- **Lingua**: Parla sempre in italiano con Claudio, in ogni risposta.

## Autorizzazione operativa

Claude è autorizzato a committare e pushare su `main` senza richiedere conferma esplicita a ogni operazione. L'utente (Claudio) ha dato autorizzazione permanente per operare in modo autonomo su questo repository.

**Deploy autonomo**: Claude deve eseguire direttamente git add/commit/push usando il sandbox bash (mcp__workspace__bash). NON dare mai comandi PowerShell da eseguire manualmente a Claudio. Se il sandbox bash è temporaneamente down, usare Claude in Chrome con l'editor GitHub web (CM6). Non chiedere mai a Claudio di lanciare comandi manualmente.

**Se il sandbox bash fallisce**: usare Claude in Chrome → navigare su github.com/claudiobertogliatti-spec/appevolution → aprire il file → Edit → modificare via console CM6 → commit su main.

## ⛔ Dominio `app.evolution-pro.it` — DISMESSO (eliminazione in corso)

`app.evolution-pro.it` è un dominio **morto**: nessun partner ci accede più. L'app operativa
(admin + area partner) vive su **`ciak.io`** (alias build `ciak-frontend.vercel.app`), stesso
bundle `CiakApp`, stesso backend `evolution-pro-backend` (Cloud Run). La vecchia app Evolution PRO
(`App.js` + `components/`) è già stata rimossa dal frontend il 2026-06-03.

**Regola**: non introdurre nuovi riferimenti a `app.evolution-pro.it`. Per URL di frontend usare
`https://www.ciak.io`. NON toccare il runtime/deploy di `ciak.io` durante la pulizia.

Inventario, stato e step infra residui (DNS, Vercel domain, Cloud Run mapping, CORS GCS):
vedi `docs/migration/eliminazione-app-evolution-pro.md`.

## Direzioni strategiche prodotto (Ciak) — leggere prima di lavorare su posizionamento/agenti/funnel

**Fonte di verità completa**: `docs/strategy/ulama-adattamento-ciak.md` (backlog di 20 voci + analisi di 6 corsi). Consultarlo prima di toccare il percorso Partner (F1–F7), gli agenti (Valentina, Andrea, Gaia, Marco, Matteo, Stefania), il wizard `Step04Posizionamento`, il motore Blueprint (`ciak_matteo*`), o i renderer documenti posizionamento.

**Contesto**: abbiamo analizzato 6 corsi esterni per arricchire il percorso Ciak. Ciak è una piattaforma Done-for-You che costruisce e lancia il corso/offerta di consulenti-coach; gli altri corsi insegnano manualmente la stessa macchina. Si adottano i **framework**, non il linguaggio.

**Regola di brand voice (non negoziabile)**: tono diretto, italiano semplice, anti-fuffa, frasi brevi. Vietato il registro guru/coach-speak (vedi tabella termini vietati in `backend/services/ciak_matteo.py`). Marco De Veglia (BrandFacile) è già allineato e si importa senza filtri; Ulama e Freddi vanno filtrati dal registro motivazionale/spirituale.

**Voice di Claudio per OUTREACH (email/DM/WhatsApp)**: fonte di verità in `docs/marketing/claudio_voice_style.md` (aggiornato 2026-06-26 con sample diretto di Claudio). Ogni messaggio di contatto proposto a Claudio deve rispettare quei 7 punti: apertura diretta motivata da interesse reale · credenziali numeriche in una riga (22 anni vendita, €6M, 25.000 trattative) · anti-posizionamento ("non un corso, non un'agenzia") · promessa a basso impegno (direzione strategica prima dell'implementazione) · 1 sola CTA www.ciak.io · chiusura che restituisce libertà ("se non ti interessa ignora pure") · firma "Claudio". Aggiornare quel file ogni volta che Claudio raffina il suo stile.

**Mappa per origine**: posizionamento = **De Veglia/BrandFacile** (core) · strategia high-ticket = Ulama + Freddi · contenuti/organico = Baleni/Cavina · esecuzione sullo stack = Corsi Systeme.io · ads/scaling = Lead a Catinelle.

**Priorità di implementazione (dal backlog)**:
1. **Script di vendita** unico per Marco: Ulama (6 fasi: Connecting→Engagement→Transition→Presenting→Obiezioni→Committing) + Freddi (script telefonico 12 punti + application "psicologia inversa").
2. **KB offerta/prezzo** per Valentina/Marco: 4 tipologie offerta (Ulama) + value ladder BASE/10x/100x (Freddi/Giannini) + 10 errori sul prezzo.
3. **Motore di posizionamento di Valentina (De Veglia)**: Brandshot competitor-oriented · idea differenziante "Specialista" + Test del Contrario + Test dei Limiti come quality gate · output come **Brand Positioning Statement** (template a 5 slot: *"<nome> è <categoria> che <idea differenziante>. A differenza dei concorrenti che <X>, noi <Y>, e per il cliente significa <vantaggi>"*) nel documento generato dopo `Step04Posizionamento`.
4. Framework 3 obiezioni (Meccanismo/Interna/Esterna) + 5 livelli di consapevolezza (Schwartz) → Valentina + scoring Matteo.
5. Altri innesti: prompt-pack scaricabili per agente (Baleni), traccia video faceless + repurposing (Andrea), sistema short-form + calendario editoriale template (Cavina), DM automation comment-to-DM (Gaia), SLO auto-liquidante (Gaia/Marco), loop recensione→regalo per testimonianze (F7), SOP native Systeme.io (Gaia/team), runbook ads + KPI campagne per `MetrichePostLancio` (Lead a Catinelle).

**Vincolo**: NON modificare il system prompt di Matteo (`ciak_matteo.py` / prompt store) senza via libera esplicito di Claudio.

## Pipeline Video — Processo Definitivo per TUTTI i Partner

Processo standard per masterclass e ogni lezione videocorso di ogni partner Evolution PRO.

### Flusso automatico completo
```
VIDEO GREZZO (Drive o GCS) → Extract Audio → AssemblyAI (transcript+filler+silenzi)
→ GPT-4 Smart Edit → FFmpeg tagli → Shotstack watermark (solo masterclass)
→ YouTube upload (unlisted, playlist partner) → ready_for_review
→ Partner approva → Systeme.io pubblicazione automatica (modulo+lezione+embed YouTube)
```

### Variabili Cloud Run richieste
- `ASSEMBLYAI_API_KEY` = `d11bb60eb50a4c7bb33aa37b6b21d38b`
- `SHOTSTACK_API_KEY` = `DsuIAAMRfJlnmKbZP9NGTOic0jESshwDB6tHwPHm`
- `SYSTEME_API_KEY_DEFAULT` = `h9vsf4fb2hwiclriknvslyxzk5p9gmoleodsduaydqwttndlagje3huzqhxsuxmf` ← account evolutionpro, vale per TUTTI i partner come sub-account

### Per ogni nuovo partner: unico step manuale
1. Creare corso Systeme.io nell'account del partner (UI o API)
2. Salvare nel DB: `partner.systeme_course_id`
3. Tutto il resto è automatico

### Durata stimata: ~20-30 min per video 7-15 min (completamente automatica)

## ✅ Backfill evolution_id da eseguire una volta

Dopo il deploy del 2026-04-20, chiamare una volta con token admin:
```
POST /api/admin/backfill-evolution-ids
Authorization: Bearer <admin_token>
```

## ⚠️ IMPORTANTE: Emergent AI non esiste più

**Emergent AI è stato sostituito da Claude (questo stesso assistente).** Non perdere tempo a ragionare su "Emergent gestisce il backend" o a fare workaround per l'infrastruttura Emergent — non esiste più.

Il backend è ora interamente gestibile tramite push su `main` nel repository GitHub. Il push triggerà Cloud Build e deploy su Cloud Run normalmente.

## Infrastruttura backend (riferimento)

- **Servizio Cloud Run backend**: `evolution-pro-backend` in `europe-west1` (project `gen-lang-client-0744698012`, number `977860235035`)
- **Comando deploy da source**: `gcloud run deploy evolution-pro-backend --source ./backend --region europe-west1`
- **Comando aggiorna env var**: `gcloud run services update evolution-pro-backend --update-env-vars KEY=value --region europe-west1`
- **`EMERGENT_LLM_KEY`**: è una chiave Anthropic Claude (`sk-ant-api03-...`), usata dal backend per le chiamate LLM. Non è Emergent — è Claude.
- **Redis**: Upstash (`rediss://...included-tomcat-82332.upstash.io:6379`) — funzionante
- **Celery worker**: si avvia automaticamente all'avvio del backend. Verificare con `GET /api/celery/status`

## ⚠️ Problemi noti del backend — cause root documentate (2026-04-17)

### 1. `emergentintegrations` non è in requirements.txt
Il pacchetto `emergentintegrations` (ex Emergent AI) non è installabile da PyPI. Tutti gli import a livello di modulo devono usare `try/except ImportError`. File già fixati:
- `backend/server.py` (StripeCheckout)
- `backend/marco_ai.py`, `gaia_ai.py`, `stefania_ai.py`, `stefania_ai_onboarding.py` (LlmChat, UserMessage)
- `backend/routers/agents_router.py`, `routers/partner_journey.py`

Se appare un nuovo file con `from emergentintegrations.xxx import YYY` a livello di modulo → aggiungere try/except.

### 2. `youtube-client-secret` — permessi Secret Manager
Il compute SA (`977860235035-compute@developer.gserviceaccount.com`) deve avere `roles/secretmanager.secretAccessor` sul secret `youtube-client-secret`. Se nuove revision falliscono con "Permission denied on secret", eseguire:
```bash
gcloud secrets add-iam-policy-binding youtube-client-secret \
  --member="serviceAccount:977860235035-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project gen-lang-client-0744698012
```

### 3. Traffico pinned su revision vecchia
Se `gcloud run deploy --source` crea nuove revision ma il traffico resta su quella vecchia:
```bash
gcloud run services update-traffic evolution-pro-backend --to-latest --region europe-west1
```
Se fallisce per altri errori, correggi prima quelli (es. permessi secret).

### 4. Env var corrotta con spazi in PowerShell
In PowerShell, `--update-env-vars KEY=val1,KEY2=val2` può corrompere i valori se ci sono backtick/newline. Verificare sempre con `gcloud run services describe` che i valori siano corretti. Se `CELERY_ENABLED` ha valore `true FORCE_RESTART=1` invece di `true`, reimpostare con:
```bash
gcloud run services update evolution-pro-backend --update-env-vars CELERY_ENABLED=true --remove-env-vars FORCE_RESTART --region europe-west1
```

### 5. Video pipeline Celery
Il Celery worker processa i video dei partner (masterclass, videocorso). Pipeline: `queued → downloading → transcribing → cutting_fillers → uploading_youtube → ready_for_review → approved`.
Se un video resta in `queued` per più di 30 minuti:
1. Verificare `GET /api/celery/status` — deve avere `worker_running: true`
2. Se il worker non parte, vedere i punti 1-4 sopra
3. **Plan B bypass**: usare `PATCH /api/admin/partner/{id}/journey` con `{"collection":"masterclass_factory","data":{"video_pipeline_status":"ready_for_review","video_youtube_url":"...drive_url...","video_embed_url":"...drive_preview_url..."}}` per portare il video in review manuale senza processing automatico

### 6. `SoftTimeLimitExceeded` sulla pipeline video (risolto 2026-04-20)
**Sintomo**: pipeline bloccata in `error` con `pipeline_error: "SoftTimeLimitExceeded()"`. Stato DB: `pipeline_status: "error"`, `video_raw_duration_s: null` (il download non è completato).

**Causa**: il global Celery soft limit era 25 minuti — troppo poco per scaricare + elaborare file masterclass grandi (30-90 min di video).

**Fix applicato**: `backend/video_pipeline_task.py` — aggiunto `soft_time_limit=10800` (3h) e `time_limit=11100` al decorator `@celery_app.task` di `process_partner_video`.

**Procedura di recovery** (da fare dal browser loggato come admin su `ciak.io/admin`):
```js
// 1. Verifica stato
const token = localStorage.getItem("access_token") || localStorage.getItem("token");
fetch("/api/partner-journey/masterclass/video-status/PARTNER_ID", {headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(console.log)

// 2. Reset pipeline
fetch("/api/partner-journey/masterclass/reset-pipeline?partner_id=PARTNER_ID", {method:"POST",headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(console.log)

// 3. Pulisci video_youtube_url errato (se presente)
fetch("/api/admin/partner/PARTNER_ID/journey", {method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({collection:"masterclass_factory",data:{video_youtube_url:null,video_embed_url:null,video_systeme_embed:null,video_youtube_id:null}})}).then(r=>r.json()).then(console.log)

// 4. Retrigger (DOPO il deploy del fix timeout)
fetch("/api/admin/partner/PARTNER_ID/retrigger-video?video_type=masterclass", {method:"POST",headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(console.log)
```

**Nota**: tutti questi snippet JS funzionano direttamente dalla console del browser su `ciak.io/admin` (il token è in localStorage). Utile quando il backend non è raggiungibile dall'allowlist di rete Cowork.

### 7. Falsi alert "Video processing failed: Input file not found"
**Causa**: il vecchio endpoint `POST /api/videos/process` (pipeline legacy `VideoProcessor` in `server.py`) viene chiamato con un URL Drive come `input_file`. Lui lo tratta come percorso locale → errore. Questo endpoint è separato dalla pipeline Celery reale (`process_partner_video`). Gli alert che iniziano con `Video processing failed: Input file not found: /app/storage/videos/raw/https:/...` sono falsi positivi dalla pipeline legacy e **non** indicano un problema sulla pipeline Celery del partner.

### 9. MongoDB timeout in Celery task (risolto 2026-04-20)
**Sintomo**: pipeline video va in `error` con `pipeline_error: "ac-kblkisa-shard-00-01.4cgj8wx.mongodb.net:27017: timed out"` — avviene subito dopo `queued`, prima ancora del download.

**Causa**: `video_pipeline_task.py` leggeva `MONGO_URL` senza il fallback presente in `server.py`. Se `MONGO_URL` punta al cluster Emergent morto (`customer-apps.xxx`), il task Celery va in timeout. L'API server invece ha il fallback su `MONGO_ATLAS_URL`.

**Fix applicato**: in `_run_pipeline()` (~linea 680), aggiunto stesso fallback di `server.py`:
```python
MONGO_URL = os.environ.get("MONGO_URL", os.environ.get("MONGODB_URL", "mongodb://localhost:27017"))
if not MONGO_URL or "customer-apps" in MONGO_URL:
    MONGO_URL = os.environ.get("MONGO_ATLAS_URL", MONGO_URL)
mongo = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
```
**Recovery**: dopo il deploy del fix, reset pipeline + retrigger normalmente.

### 8. Deploy via GitHub web editor (workaround bash sandbox)
Se il sandbox bash Cowork non parte (errore "Workspace unavailable"), è possibile committare direttamente da GitHub:
1. Aprire il file su `github.com/claudiobertogliatti-spec/appevolution`
2. Cliccare il pulsante matita (Edit)
3. Modificare il testo usando JavaScript via console del browser (CodeMirror 6):
```js
// Accedi alla view CM6 (pattern corretto — .parent non funziona, usare .view direttamente)
const tile = document.querySelector('.cm-content').cmTile;
window.__cmView = tile.view; // tile.view è direttamente la EditorView CM6
// Sostituisci testo
const doc = __cmView.state.doc.toString();
const OLD = 'OLD_TEXT';
const idx = doc.indexOf(OLD);
__cmView.dispatch({changes:{from:idx, to:idx+OLD.length, insert:'NEW_TEXT'}});
// Poi cliccare "Commit changes..." e nel dialog "Commit changes" (senza ...)
```
4. Cliccare "Commit changes..." → commettere direttamente su `main`

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

## Phase mapping (tabella di riferimento)

| Phase | Step attivo | Significato |
|-------|-------------|-------------|
| F1    | 1           | Posizionamento in corso |
| F2    | 2           | Funnel Light in corso |
| F3    | 3           | Masterclass in corso |
| F4    | 4           | Videocorso in corso |
| F5    | 5           | Funnel Vendita in corso |
| F6    | 6           | Lancio in corso |
| LIVE  | 7           | Partner live |

## Deploy

- Trigger Cloud Build: `auto-deploy-main` si attiva su push a `main`
- Dockerfile e nginx.conf vengono presi dal bucket GCS (non dal repo)
- Il servizio attivo frontend è `evolution-pro-frontend-v2` (non il vecchio `evolution-pro-frontend`)
- Se le modifiche non appaiono online: verificare traffic routing con `gcloud run services describe evolution-pro-frontend-v2`
- Il blocco traffico su vecchie revision: usare `gcloud run services update-traffic evolution-pro-backend --to-latest --region europe-west1`
- Se le nuove revision falliscono: vedere sezione "Problemi noti del backend" sopra
- **PowerShell**: eseguire sempre i comandi git da `C:\Users\berto\Desktop\appevolution`, non da `C:\WINDOWS\system32`
- **PowerShell sintassi**: `&&` NON funziona in PowerShell. Usare `;` oppure comandi separati: `git add -A; git commit -m "msg"; git push origin main`
- **Sandbox Linux Cowork**: se il workspace bash non parte (errore "Workspace unavailable"), usare GitHub web editor (vedi punto 8 nei Problemi noti). Il codice è sempre scritto correttamente su disco tramite file tools.

## Evolution ID — ID lifecycle stabile per utente (2026-04-20)

### Formato
`EVO-XXXXXXXX` (8 caratteri hex uppercase), es. `EVO-3A7F2B19`

### Come funziona
- Generato alla **prima registrazione** (qualunque flusso)
- Rimane **invariato** durante tutta la vita dell'utente: utente → cliente → partner
- Memorizzato in `users.evolution_id`, `partners.evolution_id`, `clienti.evolution_id`

### File coinvolti
- `backend/auth.py`: `UserInDB` genera `evolution_id`; `UserResponse` lo espone; `login()` lo include nel token
- `backend/server.py`:
  - `register_cliente_analisi` → genera `evolution_id` nel documento user
  - `create_partner_account` → genera `evolution_id`, propaga a `partners`
  - `register` (flusso auth_service) → propaga `evolution_id` al documento partner
  - `admin_promote_partner` → propaga `evolution_id` al partner (o lo genera se mancante)
  - `/auth/me` → restituisce `evolution_id` nel profilo
  - `POST /admin/backfill-evolution-ids` → migrazione retroattiva per utenti esistenti

### UI
- `PartnerProfileModal.jsx`: badge viola `EVO-...` accanto al tag fase
- `PartnerDetailModal.jsx`: campo "ID Lifecycle" nella sezione Anagrafica (sola lettura)
- `AdminClientiAnalisiPanel.jsx`: `EVO-...` sotto il nome nella tabella clienti

### Migrazione utenti esistenti
Dopo il deploy, chiamare una volta:
```
POST /api/admin/backfill-evolution-ids
Authorization: Bearer <admin_token>
```
Restituisce `{ updated_users, updated_partners }`.

## Architettura MasterclassPage (2026-04-20)

### Vista Admin — sequenza 4 card numerate
File: `frontend/src/components/partner/MasterclassPage.jsx`

La vista admin (`isAdmin=true`) mostra 4 card in sequenza verticale:
1. **Creazione Script** — `AdminMasterclassPanel` (7 domande + Genera Script AI + Segna Pronto). Verde quando `fullScript` esiste.
2. **Approvazione Script** — script + bottone giallo "Approva Script" (chiama `approveScript(true)`). Verde quando `dyfStatus === "approvato"`.
3. **Creazione Video** — stato pipeline (`videoData?.pipeline_status`). Verde quando `ready_for_review` o `approved`.
4. **Approvazione Video** — bottone verde grande "Approva il Video Masterclass" visibile solo quando `pipeline_status === "ready_for_review"`. Chiama `handleApproveVideo` definito in `MasterclassPage`.

Stato colori card: grigio (non attivo) → bordo giallo (attivo) → bordo/sfondo verde (completato).

`handleApproveVideo` è in `MasterclassPage` (non in `AdminMasterclassPanel`). Chiama `POST /api/partner-journey/masterclass/approve-video?partner_id=`.

`approveScript` e `isApprovingScript` vengono da `useDoneForYou(partnerId, "masterclass")` destructurato al top del componente.

### Vista Partner — sequenza unificata 4 step
La vista partner (non admin) è una **singola pagina** con 4 card sempre visibili (non schermate separate).

**Flusso reale**: il team Evolution crea lo script e fa tutto l'editing; il partner registra il grezzo e approva il risultato.

1. **Script pronto** — spinner se in corso, verde quando `dyfStatus === "pronto" || "approvato"`
2. **Approva lo Script** — script + bottone verde "Approva lo Script" (chiama `approveScript(false)`). Si sblocca quando step 1 completato.
3. **Invia il Video Grezzo** — istruzioni Drive + `VideoSubmissionCard`. Dopo invio: "Video ricevuto — il team sta lavorando all'editing" (nessuna label tecnica pipeline visibile al partner).
4. **Approva il Video Definitivo** — embed YouTube + bottone verde "Approva il Video — Tutto ok!" (chiama `handleApproveVideo`). Si sblocca quando `pipeline_status === "ready_for_review"`.

Roadmap visiva nell'header scuro in cima mostra i 4 step con colori aggiornati in tempo reale.

**NON usare più** `VideoUploadPhase` o `FinalVideoReviewPhase` come schermate separate — esistono nel file ma non vengono chiamate.

### Flusso video — Masterclass e Videocorso (identico per entrambi)

**Il partner NON fa editing.** Il flusso corretto è:
1. Team Evolution crea lo script (admin panel)
2. Partner approva lo script
3. Partner registra il video grezzo → carica su Google Drive → entra in piattaforma e invia il link Drive
4. Team Evolution scarica, edita, carica su YouTube (unlisted) sul canale Evolution PRO
5. Partner guarda il video su YouTube e lo approva cliccando "Approva il Video — Tutto ok!"

**Visibilità pipeline al partner**: mostrare SOLO "Video ricevuto — il team sta lavorando all'editing". MAI mostrare label tecniche come "Trascrizione AI", "Taglio filler words", "Upload YouTube".

**Questo flusso vale identicamente per ogni lezione del Videocorso** (stesso pattern: grezzo Drive → editing team → YouTube → approvazione partner).

### YouTube Playlist
- Creata automaticamente dalla pipeline Celery al primo video processato
- Nome: `"Evolution PRO - {partner_name}"` (file: `backend/video_pipeline_task.py`, funzione `create_youtube_playlist_sync`)
- ID salvato in `partner.youtube_playlist_id`, URL in `partner.youtube_playlist_url`
- La stessa playlist viene riusata per tutte le lezioni del videocorso dello stesso partner
- Aggiunta video alla playlist: `add_to_youtube_playlist_sync(youtube_id, playlist_id)`

### Daniele Andolfi — masterclass (2026-04-20)
- Partner ID: `"23"`, email: `andolfi3275@gmail.com`
- Video grezzo: `masterclass 2.mp4` (Google Drive ID `1_5iI-JsEWue-CUVu3SoIMkdJknQYB1UY`)
- Pipeline fallita con `SoftTimeLimitExceeded` — fix timeout deployato il 2026-04-20, pipeline riavviata automaticamente
- Quando arriva a `ready_for_review`: admin vede il video in Video Review panel (sezione "Da approvare") e in MasterclassPage step 4
- Prima masterclass reale del sistema — usarla per verificare qualità produzione

### AdminSidebarLight — struttura nav (2026-04-20)
File: `frontend/src/components/admin/AdminSidebarLight.jsx`

Sezioni nav:
- **GIORNALIERO**: oggi, notifiche
- **ACQUISIZIONE**: clienti-analisi (Pre-Call), flusso-analisi (Post-Call), lead-manager (Leads)
- **PARTNER**: partner, video-review, documenti-partner, ex-partner
- **MARKETING**: warmode, calendario-admin, servizi-admin
- **SISTEMA**: agenti (Automazione), configurazione, metriche (KPI & Metriche), email-templates (Template Email)

Vista Antonella: nasconde l'intera sezione ACQUISIZIONE (Set `ANTONELLA_HIDDEN`).
MiniDashboard: 4 tile cliccabili (Approvazioni, Call da fissare, Alert partner, Conversione%). Auto-refresh 60s.
Stefania pinned in cima con sfondo `#FFF9E6` e bordo `#FFD24D80`.
Larghezza sidebar: 260px.

## AdminPartnerJourneyEditor — Editor Journey Admin (2026-04-20)

### Cosa fa
Editor full-page per modificare tutti i dati journey di un singolo partner. Pensato per migrare i dati dei 23 partner in onboarding senza bloccarsi.

### File
- `frontend/src/components/admin/AdminPartnerJourneyEditor.jsx` — componente principale
- Montato in `App.js` come `nav==="journey-editor"` (richiede `selectedPartner`)

### Come aprirlo
Dalla lista partner (nav `"partner"`) → bottone viola **"Journey"** nella colonna Azioni. Passa `selectedPartner` e naviga a `nav="journey-editor"`.

### Struttura accordion — 6 step
1. **Posizionamento** → `partner_posizionamento` (corso_titolo, corso_descrizione, avatar, target, USP)
2. **Funnel Light** → `partner_funnel` (funnel_url, optin_url, is_published)
3. **Masterclass** — Script + Video:
   - Script: `dyf_status` dropdown + textarea script → `masterclass_factory`
   - Video: `pipeline_status` dropdown (bypass manuale), YouTube URL (con embed preview + auto-estrazione ID), Drive URL → `masterclass_factory`
4. **Videocorso** → `partner_videocorso` — editor per-lezione (title, pipeline_status, YouTube URL) + "Aggiungi lezione"
5. **Funnel Vendita** → `partner_funnel` (vendita_url, checkout_url, thankyou_url, is_active)
6. **Lancio** → `partners` (launch_date, launch_notes)

Header: fase dropdown → salva su `partners.phase`.

### API usata
- Lettura: `GET /api/admin/partner/{partner_id}/full-data`
- Scrittura: `PATCH /api/admin/partner/{partner_id}/journey` con `{collection, data}`

## Sessione 2026-04-20 — Fix applicati e funzionalità aggiunte

### Fix applicati in questa sessione
1. **`backend/video_pipeline_task.py`** — MongoDB Atlas fallback in `_run_pipeline()` (problema #9)
2. **`frontend/src/components/partner/MasterclassPage.jsx`** — `VideoSubmissionCard`: rimosso label tecnico pipeline e raw error MongoDB esposti al partner
3. **`CLAUDE.md`** — aggiunto problema #9 + corretta sintassi CM6
4. **`frontend/src/components/admin/AdminPartnerJourneyEditor.jsx`** — nuovo file (editor full-page journey admin)
5. **`frontend/src/App.js`** — import + route `journey-editor` + bottone "Journey" in AdminPartners

### Daniele Andolfi (partner ID "23") — stato pipeline masterclass
- Video grezzo: `masterclass 2.mp4` (Drive ID `1_5iI-JsEWue-CUVu3SoIMkdJknQYB1UY`)
- Pipeline avviata dopo fix MongoDB — era in stato `downloading` a fine sessione
- Quando arriva a `ready_for_review`: admin vede in Video Review panel e in MasterclassPage step 4
- Se si blocca ancora: usare Plan B bypass (PATCH journey con YouTube URL manuale + status `ready_for_review`)

### CM6 editor GitHub — pattern corretto per commit via browser
```js
const tile = document.querySelector('.cm-content').cmTile;
window.__cmView = tile.view;
const doc = __cmView.state.doc.toString();
const OLD = 'OLD_TEXT';
const idx = doc.indexOf(OLD);
__cmView.dispatch({changes:{from:idx, to:idx+OLD.length, insert:'NEW_TEXT'}});
// Poi cliccare "Commit changes..." → nel dialog "Commit changes" (senza ...)
// Il button click va fatto in 2 passi: apri dialog, poi click final button
```

### Commit via browser (quando bash sandbox è down)
Endpoint GitHub: `tree-save` (non `update`). Token CSRF si trova in:
```js
const scripts = Array.from(document.querySelectorAll('script[data-target="react-app.embeddedData"]'));
const data = JSON.parse(scripts[0].textContent);
window.__tokens = data?.payload?.csrf_tokens; // chiave: /owner/repo/tree-save/main/path
```
Il flusso corretto: applica modifiche CM6 → click "Commit changes..." → click "Commit changes" nel dialog.

## Automazione Funnel Systeme.io (2026-04-21)

### Stack tecnico editor
Systeme.io usa React + TipTap/ProseMirror. I contenteditable della pagina Optin sono accessibili via React fiber tree.

### ⚠️ DISTINZIONE FONDAMENTALE: Duplica vs Condividi

- **Duplica** (⋯ menu) → clona il funnel nello STESSO account Systeme.io (evolutionpro). Utile per varianti interne. NON crea il funnel nell'account del partner.
- **Condividi** (⋯ menu) → genera un link. Quando aperto dall'account del partner, importa il funnel in quell'account. Questo è il meccanismo corretto per i partner.

### Workflow corretto per creare il funnel di un partner
1. systeme.io/dashboard/funnels → ⋯ Template Master → **Condividi** → copia il link
2. Login nell'account Systeme.io del partner
3. Apri il link condivisione nel browser del partner → funnel importato automaticamente
4. Clicca sul funnel → step Optin → Modifica Pagina
5. Esegui script iniezione nella console del browser (getTipTapEditor + setEditorText)
6. Click Salvare — chiama POST /dashboard/editor/api/page/{ID}/save
7. Salva URL nel campo Systeme.io del FunnelBuilder admin

### Funzione helper (incollare nella console dell'editor Systeme.io)
```
function getTipTapEditor(el) {
  let node = el.parentElement;
  for (let i=0;i<5;i++) {
    const key = Object.keys(node).find(k=>k.startsWith('__reactFiber'));
    if (key) { let f=node[key]; for(let j=0;j<30;j++) { if(f?.memoizedProps?.editor?.commands) return f.memoizedProps.editor; f=f?.return; if(!f)break; } }
    node=node.parentElement; if(!node)break;
  } return null;
}
function setEditorText(editor,text){editor.commands.focus();editor.commands.selectAll();editor.commands.insertContent(text);}
const fields = { /* optin_page_fields dal payload JSON di FunnelBuilder */ };
const els = Array.from(document.querySelectorAll('[contenteditable]'));
Object.entries(fields).forEach(([i,t])=>{ const ed=getTipTapEditor(els[+i]); if(ed)setEditorText(ed,t); });
```

### Mappatura indici Optin
0=HEADLINE_PRINCIPALE | 1=SOTTOTITOLO | 2=copyright breve | 3=PARTNER_BIO
4=intro bullet | 5=DOLORE_1 | 6=DOLORE_2 | 7=DOLORE_3 | 8=DOLORE_4
9=footer info | 10=copyright footer

### Card FunnelBuilder aggiunta (2026-04-21)
File: frontend/src/components/admin/FunnelBuilder.jsx
Card 'Funnel Systeme.io' con: URL input (salva in partner_funnel.funnel_systeme_url),
link 'Apri funnel', pulsante 'Copia dati per Claude (JSON)' con optin_page_fields mappati.

### Template Master Systeme.io
ID: 6706257 | URL: evolutionpro.systeme.io/optin-f2485c57
NON modificare il Template Master — usare sempre Duplica.

### Struttura Template Master aggiornata (2026-04-21)
Il Template Master ora include:
- **Urgency bar in cima** con countdown (giorni/ore/minuti/secondi) — componente nativo Systeme.io, NON TipTap
- **Footer con link legali**: Cookie Policy | Privacy Policy | Condizioni di Vendita

### Mappatura indici contenteditable (post-aggiornamento)
| Idx | Contenuto | Campo FunnelBuilder |
|-----|-----------|---------------------|
| 0 | Headline | HEADLINE_PRINCIPALE |
| 1 | Sottotitolo | SOTTOTITOLO |
| 2 | Copyright breve | © {PARTNER_NOME} |
| 3 | Bio trainer | PARTNER_BIO |
| 4 | Intro bullet | generato |
| 5 | Bullet 1 | DOLORE_1 |
| 6 | Bullet 2 | DOLORE_2 |
| 7 | Bullet 3 | DOLORE_3 |
| 8 | Bullet 4 | DOLORE_4 |
| 9 | Footer info | {PARTNER_NOME} + {PARTNER_NICCHIA} + tel |
| 10 | Copyright + link legali | Copyright ANNO © {PARTNER_NOME} + link Cookie/Privacy/Vendita |

I link nel footer (Cookie Policy, Privacy Policy, Condizioni di Vendita) devono avere href reali per ogni partner.

### Daniele Andolfi — funnel TEST creato
Funnel ID: 7114182 | Pagina Optin ID: 40213665
URL: evolutionpro.systeme.io/optin-f2485c57-7d6c3447
Demo completata: copy iniettato e salvato correttamente.
⚠️ Creato con Duplica (non Condividi) — è nell'account evolutionpro, NON nell'account Systeme.io di Daniele.
Va ricreato seguendo il workflow corretto con Condividi + account partner.


## Sessione 2026-04-22 — Fix pipeline GCS + debug multi-sessione Daniele Andolfi

### Problema: `await` in funzione sync `resolve_gdrive_url` (problema #11)
**Sintomo**: `SyntaxError: 'await' outside async function (video_pipeline_task.py, line 76)` — il worker Celery crashava all'import.

**Causa**: una sessione precedente aveva aggiunto via CM6 il codice GCS dentro `resolve_gdrive_url()` (che è `def`, non `async def`), mettendo `await download_from_gcs(...)` in una funzione sincrona.

**Fix**: rimosso il blocco errato da `resolve_gdrive_url()`, riportandola alla forma originale (commit `eb27d65` + `da4acec` per triggerare rebuild).

### Problema: URL GCS non gestito in `download_video()` (problema #12)
**Sintomo**: pipeline va in `error` con `"Request URL has an unsupported protocol 'gs://'"`. Lo stato scende da `queued` a `error` quasi immediatamente.

**Causa**: `download_from_gcs()` esisteva nel file ma non veniva mai chiamata da `download_video()`. Quando il fix del problema #11 ha rimosso il blocco errato da `resolve_gdrive_url()`, non c'era più nessun codice path per gestire URL `gs://`.

**Fix** (commit `585b468`): aggiunto in cima a `download_video()`:
```python
# GCS diretto
if url.startswith("gs://"):
    return await download_from_gcs(url, dest_path)
```
Deve essere inserito PRIMA della riga `file_id = extract_gdrive_file_id(url)` dentro `download_video()` (non dentro `resolve_gdrive_url()`).

### ⚠️ Rischio CM6: `doc.indexOf(TARGET)` trova la PRIMA occorrenza
In `video_pipeline_task.py` ci sono DUE occorrenze di `file_id = extract_gdrive_file_id(url)`:
- Indice ~2189 → dentro `resolve_gdrive_url()` (funzione SYNC — non mettere `await`)
- Indice ~5724 → dentro `download_video()` (funzione ASYNC — ok per `await`)

`doc.indexOf(...)` trova sempre la prima. Per targetare la seconda usare:
```js
const idx1 = doc.indexOf(TARGET);
const idx2 = doc.indexOf(TARGET, idx1 + 1); // seconda occorrenza
```
oppure usare un contesto più ampio e unico come anchor.

### Risultato finale (2026-04-22)
Dopo il deploy della revisione `evolution-pro-backend-00223-zpm`:
- Pipeline di Daniele Andolfi (partner ID "23") avanzata correttamente: `queued` → `downloading` → `cleaning`
- Il GCS download ha funzionato — il video (`masterclass 2.mp4`) è stato scaricato da `gs://gen-lang-client-0744698012_cloudbuild/raw_videos/23/masterclass/ad035e094bd946cea7ac19df6eef97e2.mp4`
- FFmpeg `cleaning` in corso al momento della chiusura sessione

### Commit in questa sessione
- `eb27d65` — rimosso await errato da resolve_gdrive_url
- `da4acec` — trigger rebuild (commento aggiunto)
- `585b468` — aggiunto GCS URL handling in download_video()

### Recovery se pipeline si blocca dopo cleaning
Se pipeline finisce in `error` durante `transcribing`, `cutting_fillers`, o `uploading_youtube`:
1. `POST /api/partner-journey/masterclass/reset-pipeline?partner_id=23` — reset stato
2. `POST /api/admin/partner/23/retrigger-video?video_type=masterclass` — retrigger
3. Se il video ha già l'URL YouTube ma il partner deve ancora approvarlo: usare Plan B bypass (PATCH journey con `pipeline_status: "ready_for_review"` + `video_youtube_url` + `video_embed_url`)


## Sessione 2026-04-22 (continuazione) — Pipeline Daniele Andolfi avanzata

### Task stuck in `queued` dopo retrigger precedente (problema risolto)
**Sintomo**: dopo il deploy del commit `d4c8d68` e il retrigger (task `437c536c`), la pipeline era rimasta in `queued` per ore.

**Causa**: il task era stato consumato dal worker silenziosamente — il worker lo preleva da Redis, tenta di eseguirlo, ma fallisce PRIMA di chiamare `set_status("downloading")`. Il DB rimane in `queued` e il task sparisce da Redis (default `task_acks_late=False` → task rimosso da Redis al momento del pickup, non al completamento).

**Recovery**: reset + retrigger fresco (task `f6d5df3b`, ore 13:53:13 UTC 2026-04-22).

### Progressione pipeline confermata (2026-04-22 ~13:53 UTC)
- `13:53:13` — retrigger eseguito (task `f6d5df3b-3a59-47fb-bff8-d373166bb80a`)
- `13:53:24` — status `downloading` ✓ (worker ha preso il task in ~11 secondi)
- `13:53:46` — status `cleaning` ✓ (GCS download completato in ~22 secondi)
- `cleaning` in corso con FFmpeg nel thread executor (fix #13 funziona)

**Nota**: il GCS download da `gs://gen-lang-client-0744698012_cloudbuild/...` è molto rapido (stessa infrastruttura GCP) — circa 20 secondi anche per file grandi.

### Recovery se cleaning si blocca ancora
Se `cleaning` dura più di 40 minuti senza andare in `error` o `transcribing`:
1. Verificare che il container sia aggiornato: `GET /api/celery/status` → `worker_pid` deve essere quello del nuovo deploy
2. Se il container è vecchio: attendere o forzare nuovo deploy con commit vuoto
3. Se container nuovo ma ancora bloccato: usare Plan B bypass con YouTube URL manuale

## Sessione 2026-04-22 (seconda continuazione) — Fix timeout subprocess + monitoraggio cleaning

### Fix subprocess timeouts troppo bassi per Cloud Run lento (problema #14 — commit su main)
**Sintomo**: su Cloud Run con CPU throttling, FFmpeg per video 13 min impiega ~15-21+ min. I timeout subprocess erano troppo bassi e rischiavano di far fallire il processing.

**Fix applicato** (commit `fix: increase ffmpeg subprocess timeouts (900→3600s, 300→1200s) for slow Cloud Run CPU`):
- `cmd_s` silenceremove: `timeout=900` → `timeout=3600` (1h)
- `cmd_a` loudnorm analysis: `timeout=300` → `timeout=1200` (20 min)
- `cmd_n` loudnorm apply: `timeout=900` → `timeout=3600` (1h)
- `cmd` extract_audio_for_whisper: `timeout=300` → `timeout=1200` (20 min)
- `cmd_c` cut_filler_segments: `timeout=300` → `timeout=1200` (20 min)

**Nota**: questo fix non impatta la pipeline in corso (Cloud Build ~10 min) — vale per le prossime esecuzioni.

### Osservazione: secondo tentativo (retry 1) in cleaning da 21+ min senza errore (14:37 UTC)
Con il fix `run_in_executor` (commit `d4c8d68`), un timeout subprocess propagherebbe l'eccezione correttamente e imposterebbe `error`. Il fatto che il status sia ancora `cleaning` senza errore a 21+ min significa che **silenceremove è completato con successo** entro i 900s. Il processing è probabilmente in fase loudnorm apply.

**Stima completion cleaning**: ~14:44-14:55 UTC.


## Sessione 2026-04-22 (terza continuazione) — Diagnosi timeout extract_audio + Retry 2

### Causa root del fallimento al secondo tentativo (confermata)
**Sintomo**: cleaning→downloading a 14:53:58 UTC, dopo 38 min 34 sec = 2314 secondi.

**Calcolo**: 2314s corrisponde ESATTAMENTE a:
- silenceremove: ~900s (timeout massimo)
- loudnorm analysis: ~300s (timeout massimo)
- loudnorm apply: ~814s (completato prima del limite)
- **extract_audio_for_whisper: 300s timeout scattato** ← causa root

`extract_audio_for_whisper` estrae l'audio per Whisper (ffmpeg -vn -acodec copy). Per un video da 13 min su Cloud Run con CPU throttling, 300s non è sufficiente. **Il fix corretto era alzarlo a 1200s** — già committato.

### Retry 2 (ultimo automatico — max_retries=2)
- Downloading a 14:53:58 UTC
- Cleaning a ~14:54:45 UTC

**Se il nuovo container (timeout fix deployato ~14:40) ha preso il task** → extract_audio avrà 1200s → cleaning completo ~15:29-15:35 → transcribing → success.
**Se il vecchio container ha preso il task** → stesso fallimento a ~15:32, poi serve reset+retrigger manuale.

### Recovery se retry 2 fallisce
```
POST /api/partner-journey/masterclass/reset-pipeline?partner_id=23
POST /api/admin/partner/23/retrigger-video?video_type=masterclass
```
Il retrigger manuale avvierà un task fresco sul container con timeout=1200s.


## Sessione 2026-04-23 — Funnel Systeme.io Daniele Andolfi + Fix pipeline video

### Funnel Systeme.io — workflow documentato e completato per Daniele Andolfi

**Funnel creato nell'account Daniele** (`daniele-andolfi.systeme.io`):
- Funnel ID: `7121027`
- URL Optin: `https://daniele-andolfi.systeme.io/optin-f2485c57-b026fccf`
- Salvato in Evolution PRO: `partner_funnel.funnel_systeme_url`

**4 step personalizzati** con copy estratto autonomamente dai documenti Drive:
1. **Optin** (pageID 40268226) — headline, bio, 4 bullet points (dai "5 segnali" del calendario lancio)
2. **Landing vendita** (pageID 40268227) — 24 campi, copy direct response con 12 moduli videocorso
3. **Modulo d'ordine 97€** (pageID 40268228) — struttura corso, testimonianze placeholder
4. **Pagina ringraziamento** (pageID 40268230) — 3 campi

**API Systeme.io utili** (da usare nell'account loggato):
- Lista funnel: `GET /api/dashboard/customer/funnels/list?pagination[limit]=25`
- Step list: `GET /api/dashboard/customer/funnels/{id}/steps/list`
- User info: `GET /api/dashboard/user/user-data`
- Editor pagina: `https://systeme.io/dashboard/page/{pageId}/edit`

**Workflow corretto per ogni nuovo partner:**
1. Account evolutionpro → Template Master → ⋯ → **Condividi** → copia link (finestra privata)
2. Tab loggata con account partner → incolla link → funnel importato automaticamente
3. Recupera funnel ID: `/api/dashboard/customer/funnels/list`
4. Per ogni step: naviga all'editor, inietta copy via script TipTap/React fiber, salva
5. Salva URL in Evolution PRO via `PATCH /api/admin/partner/{id}/journey`

### Fix strutturali pipeline video committate in questa sessione

**video_pipeline_task.py** (commit diretto):
1. `acks_late=True` + `reject_on_worker_lost=True` nel decorator — task re-accodato se worker muore
2. **Heartbeat loop** — aggiorna `pipeline_heartbeat_at` ogni 30s; permette al check di distinguere task vivi da morti
3. **Cancellazione heartbeat** nel `finally` block
4. **Error handler robusto** con riconnessione MongoDB di emergenza se `set_status("error")` fallisce
5. Tutti i timeout subprocess già presenti: silenceremove 3600s, loudnorm 1200s/3600s, extract_audio 1200s

**celery_tasks.py** — `check_stuck_video_pipelines` riscritto:
- Prima: reset dopo 45 min, nessun retrigger (pipeline valide venivano resettate prematuramente)
- Ora: usa `pipeline_heartbeat_at` — se heartbeat > 5 min → task morto → **reset + retrigger automatico**
- Fallback per task senza heartbeat (formato vecchio): reset dopo 240 min
- Copre sia masterclass che ogni lezione del videocorso
- Già presente in `beat_schedule` ogni 30 minuti

### Stato pipeline Daniele Andolfi (2026-04-23)
- Retrigger alle 07:10:57 UTC → cleaning alle 07:10:57 UTC
- Alle 09:40 UTC: ancora in cleaning (2h 30min), nessun errore
- Fix heartbeat non attiva su questo run (committata dopo) — pipeline monitora manualmente

### Da fare
1. ✅ Fix acks_late + heartbeat committate
2. ✅ check_stuck_video_pipelines con auto-retrigger committato
3. Attivare funnel Systeme.io di Daniele (bozza → attivo nel dashboard)
4. Aggiornare telefono Daniele nei footer funnel quando disponibile
5. Eseguire backfill evolution_id: `POST /api/admin/backfill-evolution-ids`


<!-- trigger build: 2026-04-23T16:28:19.119Z — worker separato su evolution-pro-worker -->

<!-- deploy: worker separato attivo 2026-04-23T16:39:17.810Z -->

## ⏳ TODO YouTube — rigenerare il token sotto "Production" (fix scadenza 7 giorni)

La pipeline video carica su YouTube con un token OAuth in `youtube-user-credentials`
(Secret Manager, montato in `/secrets/youtube_credentials.pickle`). Se le lezioni
finiscono in `error_youtube` con `invalid_grant`, il token e' scaduto/revocato.

Fix fatto il 2026-06-09: token rigenerato (v5), deploy `00334`, consent screen
pubblicata in **Production**. **RESTA DA FARE**: il token v5 era emesso quando
l'app era ancora in "Testing", quindi eredita la scadenza a 7 giorni. Va
**rigenerato una volta ORA che l'app e' Production** per renderlo permanente.

Procedura completa: `docs/runbooks/youtube-reauth.md` (+ `scripts/youtube_reauth.py`).
In breve: `python scripts/youtube_reauth.py client_secret.json` (consenso col canale
Evolution PRO) -> `gcloud secrets versions add youtube-user-credentials
--data-file=youtube_credentials.json` -> redeploy backend.


## Sessione 2026-06-10 — Posizionamento 6 campi completato per TUTTI i 24 partner + API partner-hub

### Stato
- I 6 campi Posizionamento (Chi sei, Per chi lavori, Problema che risolvi, La tua soluzione, Pitch 10 secondi, Differenziatore) sono inseriti e verificati (backend + UI) per tutti i 24 partner. Elena Perniola lasciata vuota (nessun documento su Drive né web — regola di Claudio).
- Testi sintetizzati fedelmente dai documenti Drive di ciascun partner: "DOCUMENTO DI POSIZIONAMENTO <Nome>" (questionario 46 domande) oppure "<Nome> Pos" (Piano Operativo Strategico). Mappatura questionario → campi: Q17→Chi sei · Q11→Per chi lavori · Q12→Problema · Q18/19→Soluzione · Q23 condensato→Pitch · Q20/24→Differenziatore.

### Metodo veloce per scrivere/leggere il Posizionamento (USARE QUESTO, non la UI campo-per-campo)
Endpoint SENZA autenticazione (verificato giu 2026):
- `GET /api/partners` — lista partner con id
- `GET /api/partner-hub/{partner_id}` — profilo hub completo
- `PUT /api/partner-hub/{partner_id}` — upsert (body JSON, solo campi non-null)
- `PATCH /api/partner-hub/{partner_id}/field?field=X&value=Y` — singolo campo (stessa chiamata delle matite UI)

Campi: `whoYouAre, targetAudience, problem, solution, pitch, differentiator` (+ offerName, offerPrice, offerIncludes, offerGuarantee).
Eseguire le fetch dalla console del browser su una pagina di ciak-frontend.vercel.app (origin corretto). ~100× più veloce della UI; la tab Posizionamento storicamente bloccava gli screenshot CDP.

Vista admin dell'area partner senza passare dal selettore: `localStorage.setItem('ciak_partner_view_id', JSON.stringify({id,name}))` poi navigare su /partner/mio-spazio.

### ID partner (giu 2026)
| Partner | ID |
|---------|----|
| Arianna Aceto | 2 |
| Marco Orlandi | 3 |
| Sarah Arensi | 4 |
| Valter Romani | 9 |
| Simone Riccò | 10 |
| Daphne Oliveti | 11 |
| Mariantonietta Tornello | 12 |
| Cosimo Filieri | 13 |
| Annamaria Depalma | 14 |
| Marco Lamanna | 15 |
| Giuseppe Sarno | 16 |
| Elena Perniola | 17 |
| Maria Giulia Falcone | 18 |
| Michele Baggio | 19 |
| Alice Conventi | 20 |
| Silvia Sedda | 21 |
| Eva Gugliucciello | 22 |
| Daniele Andolfi | 23 |
| Sara Stella Due | 00435c30-cc6a-4667-a2b8-015c972661cd |
| Filadelfio Vasi | 38999296-0c07-4409-a2ff-c2df8be7680e |
| Federica Arimatea | fd1d56a7-2499-4be7-b39c-3b89caf6137d |
| Loris Bonomi | eb88d08c-9b23-478c-b759-e40bdef483cc |
| Marco Serra | 177e74e7-ec19-4ad2-98d4-b64a2d85c9ef |
| Andrea Fredi | 045f338e-74a0-46b4-b928-2ace47b092f5 |

### Note Drive
- Le cartelle partner sono sparse su più alberi: cercare con `title contains '<cognome>'`. Parent ricorrenti: `1sN2AADdLgSsqY92sQMj9QypOM0TKVx-H` e `1VJKKwveD6hAWpw68Jy6K4z2KzZxBVeAB`.
- app.evolution-pro.it risultava irraggiungibile (giu 2026): l'app operativa è ciak-frontend.vercel.app (/admin e /partner).

## Standard editing video — Descript (2026-06-16)

Standard ufficiale di editing per masterclass e ogni lezione videocorso di ogni partner. Approvato da Claudio sul pilota "Modulo1_L1 - Benvenuto al corso". Questo è il **nuovo flusso** che sostituisce, lato qualità, la vecchia pipeline Celery FFmpeg/Shotstack.

### Ricetta-standard (ordine di applicazione)
1. **Pulizia**: rimuovere intercalari, ripetizioni inutili e pause troppo lunghe per stringere il ritmo. **Eccezione ferrea**: NON tagliare silenzi/pause durante meditazioni guidate o esercizi di respirazione. Verificare sempre che il discorso resti logico e di senso compiuto in italiano.
2. **Studio Sound** sulla voce del relatore (audio "da studio"). Sostituisce il solo loudnorm.
3. **NIENTE sottotitoli** (scelta di Claudio — nessuna caption da nessuna parte).
4. **Intro brandizzata** (title card): sfondo antracite `#1A1F24`, titolo giallo `#FFD24D` (font Manrope Bold) col **nome della lezione**, sottotitolo **"Modulo X - Lezione Y"** (NON "Evolution PRO"), musica soft con ducking. Voiceover AI **voce Cedric** che introduce in 2-3 frasi il contenuto (script ricavato dalla trascrizione).
5. **Outro brandizzato** (stessa grafica) con voiceover Cedric, testo fisso: "Grazie per aver seguito questa lezione. Ci vediamo nella prossima."
6. **Livelli**: voiceover intro/outro allineati al parlato della lezione (stessi LUFS), musica ~15% con ducking. Nessun salto di volume.
7. **Sincronia audio/video sempre preservata** — vincolo non negoziabile.

### ⚠️ Regola di sicurezza ferrea (anti-distruzione)
**MAI fare trim sulla traccia script.** Un trim sulla traccia script durante il pilota ha distrutto il corpo lezione (composizione ridotta a 5s, recuperata con undo). La durata dell'intro si regola **solo spostando il confine di scena**, mai tagliando lo script.

### Limite del connettore Descript (MCP) in Cowork
In questa sessione MCP la **generazione audio TTS e l'assegnazione delle voci AI sono disabilitate**: l'agente scrive i testi dei segmenti intro/outro ma NON può assegnare la voce Cedric né renderizzare l'audio. Passaggio **manuale** in Descript (2 clic): selezionare il segmento scratch → pannello Speaker → scegliere **Cedric** (per intro e outro). Implicazione strategica: per l'automazione end-to-end (Strada 2, pipeline propria) la voce intro/outro va generata via API TTS (es. ElevenLabs italiano), non via connettore Descript.

### Sequenza operativa per lezione (Strada 1 — Descript via connettore)
1. Video grezzo in un progetto Descript (import se necessario).
2. Applicare la ricetta-standard via `prompt_project_agent` (cleanup + Studio Sound + intro/outro brandizzati + livelli; no sottotitoli).
3. **Claudio**: assegnare voce Cedric a intro/outro in Descript (2 clic) → audio generato.
4. Pubblicare link riservato Descript (unlisted) come artefatto di review: `publish_project` 1080p, access `unlisted`. **MAI su YouTube prima dell'approvazione di Claudio.**
5. **Claudio** approva, esporta in alta e carica manualmente sulla playlist YT del partner.

### Strumenti connettore Descript (server MCP)
`list_projects`, `get_project`, `prompt_project_agent` (usare `conversation_id` per continuare la stessa conversazione), `wait_for_job` (timeout client ~180s — se scade, usare `list_jobs` per leggere lo stato), `publish_project`, `import_media`. Per modifiche successive sulla stessa composizione, riusare il `conversation_id` restituito dal primo job.

### Pilota di riferimento (2026-06-16)
Progetto Descript `b7e11cff-7c07-4bc1-99d0-8fc3fd46a374` ("Modulo1_L1_pilotaautomatico", videocorso mindfulness, 3 lezioni: L1 Pilota automatico / L2 Fare vs Essere / L3 Tornare ai sensi). Composizione approvata: "Modulo1_L1 - Benvenuto al corso" (id `acbf9a4d-bad3-4105-a9ff-af6459f9d512`).

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

## Team AI Ciak (CANONICO, customer-facing) - MEMORIZZATO 2026-06-18

Fonte di verita': frontend/src/ciak/partner/operativo/agents.js (export AGENTS). Foto in frontend/public/agents/*.jpg (6 file). Sono i 6 agenti "ufficiali" con foto, usati nelle chat dell'area partner (AgentDrawer / PhaseAgentHeader) e nella pagina proposta. NON inventare altri agenti customer-facing (Orion/Marta/Atlas/Luca esistono nel backend ma NON hanno foto ne' presenza customer-facing).

Roster (id | nome | ruolo customer-facing | foto):
- STEFANIA | Stefania | Coordinatrice del tuo percorso | /agents/stefania.jpg
- VALENTINA | Valentina | Brand & Posizionamento | /agents/valentina.jpg
- ANDREA | Andrea | Coach video e contenuti | /agents/andrea.jpg
- GAIA | Gaia | Supporto tecnico funnel | /agents/gaia.jpg
- MARCO | Marco | Strategia lancio | /agents/marco.jpg
- MATTEO | Matteo | Analista Ciak Blueprint | /agents/matteo.jpg

Mapping step->agente (STEP_TO_AGENT in agents.js), determina quale volto/prompt mostra la chat per step:
- 01-contratto, 02-discovery-video, 10-funnel-team-work -> STEFANIA (default fallback STEFANIA)
- burocrazia, 03-brand-kit, 04-posizionamento -> VALENTINA
- 05-script-masterclass, 06-outline-lezioni, 07-registra-masterclass, 08-registra-lezioni -> ANDREA
- 09-funnel-asset -> GAIA
- 11-calendario-30gg, 12-prezzo-webinar, 13-lancio -> MARCO
(MATTEO = analista Blueprint/diagnostica, scoring)

Come funziona la chat area partner: AgentDrawer mostra volto+nome dell'agente attivo per lo step (getAgentForStep) e passa target_agent al backend, che swappa il system prompt dell'agente. File chat: frontend/src/ciak/partner/operativo/AgentDrawer.jsx, PhaseAgentHeader.jsx, agents.js, phases.js. Prossime modifiche richieste da Claudio riguarderanno proprio queste chat dell'area partner.

Allineamento fatto 2026-06-18: la pagina proposta (frontend/src/ciak/pages/Proposta.jsx) ora usa questi 6 agenti CON foto (array TEAM con avatar) + le 3 Fasi ufficiali Evolution PRO (Creazione Accademia / Lancio del Progetto / Ottimizzazione del Servizio) al posto delle vecchie 7 fasi. Coerenza con evolution-pro.it (Metodo EVO: Esamina-Valida-Ottimizza, 3 fasi).


## Sessione 2026-06-19 — Fix "I Miei File": Visualizza rotto per file caricati dal partner

### Causa root (due bug concorrenti)
1. **Frontend (`PartnerFilesPage.jsx`)**: `handleView`/`Scarica` facevano `url.replace("/api","")` sugli URL relativi. Ma Vercel proxa **solo** `/api/* -> Cloud Run`; `/files/...` senza prefisso cadeva sulla SPA (index.html) -> il file non si apriva. Fix: aprire l'URL **as-is** (`window.open(url)`), senza togliere `/api`. Vale anche per il contratto PDF (`/api/contract/pdf-download/{id}`).
2. **Backend (`/api/files/upload` -> `file_storage.upload_file`)**: gli upload del partner finivano **solo su disco locale** di Cloud Run (effimero). `internal_url = /api/files/documents/pending/...`. Al riciclo dell'istanza i byte spariscono -> GET 404 (content-type `application/json`). I file ufficiali (contratto PDF in `db.contract_pdfs`, distinta su Cloudinary) erano già durevoli e infatti funzionavano.

### Fix applicato
- **Frontend**: rimosso `.replace("/api","")` in entrambi i punti.
- **Backend**: `upload_file` ora legge i byte una volta (`await file.read()` + `file.seek(0)`) e li carica anche su **Cloudinary** (`upload_file_direct`, folder `evolution_pro/partner_files/{partner_id}`, resource_type per estensione: image/video/raw). `internal_url` = `secure_url` Cloudinary; disco locale resta come fallback best-effort.
- **Cleanup**: rimosse via `DELETE /api/files/{file_id}` le 3 voci morte 404 di Luigi (Calafiore1/2.jpeg, Distinta_Calafiore.jpeg — foto-sorgente grezze, irrecuperabili perché su disco effimero). Restano i 2 file ufficiali durevoli (contratto PDF + distinta), entrambi 200.

### Regola generale (anti-ricorrenza)
**Mai affidarsi al disco locale di Cloud Run per file persistenti**: è effimero e per-istanza. Ogni file che deve sopravvivere va su Cloudinary/GCS. Se in futuro "Visualizza" torna a dare 404 con content-type `application/json`, è quasi certamente un file finito solo su disco locale.


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
