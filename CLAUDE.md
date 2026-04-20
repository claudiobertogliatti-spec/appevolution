# Evolution PRO — Istruzioni permanenti per Claude Code

## Preferenze di comunicazione

- **Lingua**: Parla sempre in italiano con Claudio, in ogni risposta.

## Autorizzazione operativa

Claude Code è autorizzato a committare e pushare su `main` senza richiedere conferma esplicita a ogni operazione. L'utente (Claudio) ha dato autorizzazione permanente per operare in modo autonomo su questo repository.

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
La vista partner (non admin) è una **singola pagina** con 4 card sempre visibili (non schermate separate):

1. **Creazione Script** — spinner se in corso, verde quando `dyfStatus === "pronto" || "approvato"`
2. **Approva lo Script** — script + bottone verde "Approva lo Script" (chiama `approveScript(false)`). Si sblocca quando step 1 completato.
3. **Carica il Video Grezzo** — istruzioni Drive + `VideoSubmissionCard` + stato pipeline. Si sblocca quando script approvato.
4. **Verifica il Video Finale** — embed YouTube quando disponibile. Si sblocca quando team approva il video.

Roadmap visiva nell'header scuro in cima mostra i 4 step con colori aggiornati in tempo reale.

**NON usare più** `VideoUploadPhase` o `FinalVideoReviewPhase` come schermate separate — esistono nel file ma non vengono chiamate.

### YouTube Playlist
- Creata automaticamente dalla pipeline Celery al primo video processato
- Nome: `"Evolution PRO - {partner_name}"` (file: `backend/video_pipeline_task.py`, funzione `create_youtube_playlist_sync`)
- ID salvato in `partner.youtube_playlist_id`, URL in `partner.youtube_playlist_url`
- La stessa playlist viene riusata per tutte le lezioni del videocorso dello stesso partner
- Aggiunta video alla playlist: `add_to_youtube_playlist_sync(youtube_id, playlist_id)`

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
