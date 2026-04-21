# Evolution PRO — Istruzioni permanenti per Claude Code

## Preferenze di comunicazione

- **Lingua**: Parla sempre in italiano con Claudio, in ogni risposta.

## Autorizzazione operativa

Claude è autorizzato a committare e pushare su `main` senza richiedere conferma esplicita a ogni operazione. L'utente (Claudio) ha dato autorizzazione permanente per operare in modo autonomo su questo repository.

**Deploy autonomo**: Claude deve eseguire direttamente git add/commit/push usando il sandbox bash (mcp__workspace__bash). NON dare mai comandi PowerShell da eseguire manualmente a Claudio. Se il sandbox bash è temporaneamente down, usare Claude in Chrome con l'editor GitHub web (CM6). Non chiedere mai a Claudio di lanciare comandi manualmente.

**Se il sandbox bash fallisce**: usare Claude in Chrome → navigare su github.com/claudiobertogliatti-spec/appevolution → aprire il file → Edit → modificare via console CM6 → commit su main.

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

**Procedura di recovery** (da fare dal browser loggato come admin su `app.evolution-pro.it`):
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

**Nota**: tutti questi snippet JS funzionano direttamente dalla console del browser su `app.evolution-pro.it` (il token è in localStorage). Utile quando il backend non è raggiungibile dall'allowlist di rete Cowork.

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

### Daniele Andolfi — funnel TEST creato
Funnel ID: 7114182 | Pagina Optin ID: 40213665
URL: evolutionpro.systeme.io/optin-f2485c57-7d6c3447
Demo completata: copy iniettato e salvato correttamente.
⚠️ Creato con Duplica (non Condividi) — è nell'account evolutionpro, NON nell'account Systeme.io di Daniele.
Va ricreato seguendo il workflow corretto con Condividi + account partner.
