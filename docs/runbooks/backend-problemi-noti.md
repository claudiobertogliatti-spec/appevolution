# Runbook — problemi noti del backend e recovery

Estratto da `CLAUDE.md` l'11/8/2026. Cause root documentate a partire dal 2026-04-17.

⚠️ **Stato al 2026-08-11**: i problemi #6, #9, #11..#14 sono **risolti nel codice** — restano
qui per capire *perché* certi timeout e fallback esistono, non come cose da rifare. Il
**punto 8 (deploy via editor web GitHub + CodeMirror) è superato**: il deploy backend è
automatico via `.github/workflows/deploy-backend.yml`. Vedi `docs/deploy-playbook.md`.

Restano attuali e utili: **#1** (import `emergentintegrations` sempre in try/except),
**#2** (permessi Secret Manager su `youtube-client-secret`), **#3** (traffico pinnato su
revision vecchia), **#7** (falsi alert dalla pipeline legacy).

---

## ⚠️ Problemi noti del backend — cause root documentate (2026-04-17)

### 1. `emergentintegrations` non è in requirements.txt
Il pacchetto `emergentintegrations` (ex Emergent AI) non è installabile da PyPI. Tutti gli import a livello di modulo devono usare `try/except ImportError`. File già fixati:
- `backend/server.py` (StripeCheckout)
- `backend/marco_ai.py`, `gaia_ai.py`, `stefania_ai.py`, `stefania_ai_onboarding.py` (LlmChat, UserMessage)
- `backend/routers/agents_router.py`, `backend/routers/partner_journey.py`

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
