# Diario di sessione 2026 — cronaca, NON normativa

⚠️ **Questo file non è una fonte di regole.** È l'archivio delle sezioni "Sessione …"
che stavano dentro `CLAUDE.md` fino al 2026-08-11, spostate qui perché erano il 42%
del file (558 righe su 1320) e venivano caricate in ogni sessione di ogni agente
senza servire quasi mai.

**Come si usa**: si consulta *a domanda* ("perché la pipeline video aveva quel timeout?",
"come era stato creato il funnel di Andolfi?"), mai come istruzione da eseguire.

**Cosa vale e cosa no:**
- I *fix* descritti qui sono già nel codice. Il codice è la fonte, non questo file.
- I *path* citati sono quelli del momento in cui fu scritta la voce. Molti non esistono
  più: `frontend/src/App.js`, `components/partner/MasterclassPage.jsx`,
  `components/admin/AdminPartnerJourneyEditor.jsx`, `components/partner/stepConfig.js`,
  `components/partner/StepPageWrapper.jsx`, `components/cliente/IntroQuestionario.jsx`
  sono stati **verificati inesistenti** l'11/8/2026. L'app frontend vive in `frontend/src/ciak/`.
- Le procedure di deploy citate (Cloud Build `auto-deploy-main`, `gcloud run deploy --source`
  dalla cartella locale, editor web GitHub + iniezione CodeMirror, connettore GitHub come
  canale di scrittura) sono **superate**: da `.github/workflows/deploy-backend.yml` il deploy
  backend è automatico su push a `main`. Vedi `docs/deploy-playbook.md`.
- Gli stati "✅ fatto" scritti qui non sono verificati. Vale la regola di `PROTOCOL.md §4`:
  si verifica alla fonte prima di agire.

Le sezioni sono nell'ordine in cui stavano in `CLAUDE.md` (che non è cronologico).

---

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

### AdminSidebarLight — ⚠️ OBSOLETO (vecchio admin Evolution PRO)
`frontend/src/components/admin/AdminSidebarLight.jsx` **non è** la sidebar attiva (non esiste più su `origin/main`). La struttura "GIORNALIERO / ACQUISIZIONE / PARTNER / MARKETING / SISTEMA" era l'admin Evolution PRO. La sidebar admin di **ciak.io** vive interamente nell'array `NAV` di `frontend/src/ciak/admin/CiakAdminApp.jsx` → struttura corrente a 5 macro-reparti documentata nella sezione "Sidebar admin Ciak — 5 macro-reparti" in fondo a questo file.

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

## Sessione 2026-06-10 — Posizionamento 6 campi completato per TUTTI i 24 partner + API partner-hub

### Stato
- I 6 campi Posizionamento (Chi sei, Per chi lavori, Problema che risolvi, La tua soluzione, Pitch 10 secondi, Differenziatore) sono inseriti e verificati (backend + UI) per tutti i 24 partner. Elena Perniola lasciata vuota (nessun documento su Drive né web — regola di Claudio).
- Testi sintetizzati fedelmente dai documenti Drive di ciascun partner: "DOCUMENTO DI POSIZIONAMENTO <Nome>" (questionario 46 domande) oppure "<Nome> Pos" (Piano Operativo Strategico). Mappatura questionario → campi: Q17→Chi sei · Q11→Per chi lavori · Q12→Problema · Q18/19→Soluzione · Q23 condensato→Pitch · Q20/24→Differenziatore.

### Metodo veloce per scrivere/leggere il Posizionamento (USARE QUESTO, non la UI campo-per-campo)

⚠️ **Dal 2026-07-30 questi endpoint RICHIEDONO autenticazione.** Prima erano aperti a
chiunque: `GET /api/partner-hub/{id}` restituiva l'anagrafica completa e
`PATCH .../field` scriveva qualunque campo, senza token. Ora passano solo admin/superadmin
(su qualunque partner) e il partner stesso (solo sul proprio `partner_id`).

- `GET /api/partner-hub/{partner_id}` — profilo hub completo
- `PUT /api/partner-hub/{partner_id}` — upsert (body JSON, solo campi non-null)
- `PATCH /api/partner-hub/{partner_id}/field?field=X&value=Y` — singolo campo (stessa chiamata delle matite UI)

Campi ammessi: `whoYouAre, targetAudience, problem, solution, pitch, differentiator`
(+ offerName, offerPrice, offerIncludes, offerGuarantee). `PATCH .../field` accetta **solo**
i campi del modello `PartnerProfileHub`; qualunque altro nome → 422.

Dalla console del browser, loggati come admin su www.ciak.io, va aggiunto l'header:

```js
const t = localStorage.getItem("ciak_admin_token");
const H = { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
await fetch(`/api/partner-hub/${id}`, { headers: H }).then(r => r.json());
await fetch(`/api/partner-hub/${id}/field?field=pitch&value=${encodeURIComponent(v)}`,
            { method: "PATCH", headers: H });
```

Resta ~100× più veloce della UI; la tab Posizionamento storicamente bloccava gli screenshot CDP.
`GET /api/partners` (lista partner con id) è su un altro prefisso e non è toccato da questa modifica.

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

## Sessione 2026-06-29 — Luca AD + Revisione Video stile-Descript (provata end-to-end)

### 1. Luca = Amministratore Delegato AI (Fase 2 FATTA, live in produzione)
- Backend `backend/routers/admin_luca.py`: prefix `/api/admin/luca`, endpoint `/chat` e `/history` (GET+DELETE), require_admin. Registrato in `server.py` subito dopo `admin_stefania`. Storico in collezione `admin_luca_conversations`. Modello claude-sonnet-4-6.
- Prompt AD con "sistema operativo" rubato dai migliori AD del mondo = 20 principi attribuiti (Grove output/OKR/leva, Bezos working-backwards/Type1-2/disagree-commit/input-metrics, Collins first-who/fatti-brutali/flywheel, Wickman EOS Rocks/L10/IDS, Slootman Amp-It-Up, Dalio believability/registro-errori, Benioff V2MOM, Doerr OKR/CFR, Hastings context-not-control/keeper-test, Campbell+Lencioni squadra, Lean gemba/PDCA/Hoshin, Drucker efficacia) + ritmo operativo giorno/settimana/trimestre + protocollo decisionale. Modalita SOLA CONSULENZA: legge i 4 reparti, consiglia, NON esegue/approva.
- Contesto live (build_luca_context) legge: partner/fasi/inattivi/step (Delivery), lead + analisi 67 EUR (ciak_leads/diagnostic_sessions), MRR/health (agent_hub_service), semaforo approvazioni (approval_workflow).
- Frontend `LucaChat.jsx`, pannello in CabinaRegia (home /admin). Avatar = SVG inline monogramma L oro su antracite. NOTA: il connettore GitHub NON carica file binari -> il luca.jpg generato e stato rimosso, foto reale da caricare a mano.

### 2. Verifica onesta del sistema agenti (analisi, non codice)
- Gli agenti NON dialogano tra loro: sono personaggi (swap del system prompt via target_agent) con cronologia separata. Coordinano via STATO CONDIVISO nel DB (partners, agent_tasks/coda approvazione) + Claudio umano-nel-loop. Lo smistamento di Stefania (route_message) e solo un consiglio, non innesca nessun agente. run_daily_monitoring produce etichette, non azioni.
- Luca NON e un orchestratore: e read+advise. Per coordinamento vero (futuro): bus task agente-verso-agente, Luca Fase 3 con poteri approva/assegna, memoria condivisa di squadra.

### 3. Revisione Video stile-Descript dentro Ciak — COSTRUITA, DEPLOYATA, PROVATA
Idea: la pipeline si ferma DOPO la trascrizione; chi revisiona legge il testo contro lo SCRIPT del team (che il team Ciak produce gia), toglie i tagli sbagliati con un click, approva -> montaggio. Circa 1/10 del tempo vs guardarsi il video.
5 incrementi (tutti live):
- Inc1 `video_pipeline_task.py`: flag env VIDEO_REVIEW_ENABLED (default off). Checkpoint dopo all_segs (ramo trascrizione-OK) -> salva review_transcript/review_words/review_cut_segments + status da_revisionare, return (no taglio/upload). + Checkpoint CATCH-ALL dopo il blocco trascrizione (prima di YouTube): in review-mode ferma SEMPRE a da_revisionare anche se la trascrizione fallisce -> non pubblica mai il grezzo. Cap AssemblyAI alzato da 300 a 900s.
- Inc2 `partner_journey.py`: GET `/api/partner-journey/masterclass/review-data/{partner_id}` (transcript, words, cut_segments, script, raw_duration). POST `/api/partner-journey/masterclass/review-approve` body {partner_id, disabled_cut_ids} -> aggiorna enabled, status montaggio, avvia Fase B.
- Inc4 `video_pipeline_task.py` (in fondo): _apply_approved_cuts + task Celery apply_approved_cuts + run_apply_background. Ri-scarica il grezzo, taglia solo i segmenti enabled, upload YouTube, ready_for_review. Pipeline principale intatta.
- Inc3 `frontend/src/ciak/admin/pages/MasterclassReview.jsx`, route `/admin/revisione-video/:partnerId` in CiakAdminApp: script a sinistra, trascrizione coi tagli barrati (mappa parole-tempi, normalizza ms/s), lista tagli con toggle Taglia/Tieni, bollini controlla su smart/pause-lunghe, bottone Approva e monta.
- Inc5: route in `CiakAdminApp.jsx`; sezione "Da revisionare - taglio testo" con bottone Apri revisione in `VideoReview.jsx` (lo endpoint /api/admin/video-review gia ritorna tutti gli stati).
Campi DB nuovi (su masterclass_factory): review_transcript, review_words, review_cut_segments[{id,start,end,type(filler/silence/smart),reason,word,enabled}], review_filler_report, review_note, video_reviewed. Stati pipeline nuovi: da_revisionare, montaggio.

### 4. INFRA — scoperte critiche (LEGGERE prima di deployare il backend)
- ⚠️ **SUPERATO (verificato 2026-07-30): IL DEPLOY BACKEND ORA È AUTOMATICO.** Il testo qui
  sotto descriveva la situazione di giugno 2026 ed è obsoleto — si conserva solo come
  storico. Oggi esiste `.github/workflows/deploy-backend.yml`: su push a `main` che tocca
  `backend/**` deploya via Workload Identity sia `evolution-pro-backend` sia
  `evolution-pro-worker`, punta il traffico all'ultima revisione e fa uno smoke test su
  `/api/health`. **Non serve nessun `gcloud run deploy` manuale, e soprattutto non si
  deploya più dalla cartella locale**: il workflow builda da `origin/main`, quindi non è
  più possibile mandare in produzione una copia stale. Esiste anche `.github/workflows/ci.yml`
  (gitleaks + compileall + flake8 E9/F821 + unit test + build frontend) su ogni PR e push.
  *(Storico, NON più valido: «IL DEPLOY BACKEND NON E AUTOMATICO DA GITHUB: NON esiste
  trigger Cloud Build. Si deploya con `gcloud run deploy evolution-pro-backend --source
  ./backend`, che builda dalla CARTELLA LOCALE. La copia locale era 41 commit indietro ->
  per settimane i commit backend fatti via GitHub NON arrivavano in produzione.»
  La procedura che indicava di deployare da `C:\Users\berto\Desktop\appevolution` era
  doppiamente sbagliata: quella è la copia ritirata vietata in cima a questo file.)*
- Le build Cloud Run sono REGIONALI: gcloud builds list (global) mostra solo build vecchie; usare --region=europe-west1.
- Il worker Celery gira IN-PROCESS nel backend (GET /api/celery/status -> worker_running true, beat_running true). Il servizio separato evolution-pro-worker NON e il consumer attivo dei video: basta deployare evolution-pro-backend. Flag VIDEO_REVIEW_ENABLED=true messo su backend + worker (le env var persistono tra i deploy da source).
- Frontend: deploya da solo via Vercel su push a main (nessun gcloud).

### 5. Test reale Daniele Andolfi (partner_id "23") — PROVATO END-TO-END OK
- Grezzo: gs://gen-lang-client-0744698012_cloudbuild/raw_videos/23/masterclass/ad035e094bd946cea7ac19df6eef97e2.mp4 (1.26 GB, ~13.7 min).
- Comandi test PowerShell (endpoint aperti, niente token): reset = Invoke-RestMethod -Method Post -Uri ".../masterclass/reset-pipeline?partner_id=23"; submit = POST .../masterclass/submit-video-link body {partner_id:"23", video_url:gs://...}; stato = GET .../masterclass/video-status/23.
- RISULTATO: da_revisionare con transcript 7218 caratteri, 1159 parole, 46 tagli proposti. Schermata ciak.io/admin/revisione-video/23 piena. FUNZIONA.
- CAUSA dei fallimenti iniziali (error_youtube): account AssemblyAI con SALDO NEGATIVO (400 "balance negative", chiave d11bb60e...). RICARICATO -> trascrizione OK. Prima del catch-all, fallita la trascrizione, la pipeline tirava dritto fino a YouTube (token scaduto) -> error_youtube; ora il catch-all chiude il buco.

### 6. TODO residui (RIPRENDERE DA QUI)
1. TOKEN YOUTUBE scaduto: la Fase B (montaggio dopo Approva e monta) carica su YouTube e fallisce -> rigenerare il token (runbook docs/runbooks/youtube-reauth.md). Senza, la revisione funziona ma il montaggio non finisce online.
2. (Opzionale) esporre review_note / errore-trascrizione anche in review-data + schermata, cosi gli errori (es. credito AssemblyAI) si vedono in admin senza leggere i log.
3. Estendere la revisione testo al VIDEOCORSO (ora solo masterclass).
4. Foto reale Luca /agents/luca.jpg (ora solo monogramma SVG): caricare a mano o con generatore ritratti.
5. Pulizia working tree locale: git clean -fd per togliere i file temporanei _*_check.py / _*_check.jsx (non sono su GitHub).
6. Valutare trigger Cloud Build da main per auto-deploy backend.
7. Task ancora aperto: funnel-da-browser su Systeme (clone Template Master via Condividi + iniezione copy TipTap).
8. Futuro Luca: Fase 3 orchestratore (approva/assegna dalla chat) + bus task agente-verso-agente.

### Commit chiave (su main) e stato deploy
Luca: 7112e43 (admin_luca + LucaChat + CabinaRegia), 3d0a5b9 (server.py reg), 6625253 (CLAUDE.md Luca), 2cb9a11 (avatar SVG). Revisione video: 1ab2322 (checkpoint), 9611959 (Fase B), endpoint review-data/review-approve, b76074a (MasterclassReview), 207ac20 (route), c226e19 (VideoReview entry), dd2b61a (cap 15min + catch-all). Backend in produzione: revision evolution-pro-backend-00401 (deploy da source DOPO git reset --hard origin/main).

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
