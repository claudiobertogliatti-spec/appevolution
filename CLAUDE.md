# Evolution PRO — Istruzioni permanenti per Claude Code

## Autorizzazione operativa

Claude Code è autorizzato a committare e pushare su `main` senza richiedere conferma esplicita a ogni operazione. L'utente (Claudio) ha dato autorizzazione permanente per operare in modo autonomo su questo repository.

## ⚠️ IMPORTANTE: Emergent AI non esiste più

**Emergent AI è stato sostituito da Claude (questo stesso assistente).** Non perdere tempo a ragionare su "Emergent gestisce il backend" o a fare workaround per l'infrastruttura Emergent — non esiste più.

Il backend è ora interamente gestibile tramite push su `main` nel repository GitHub. Il push triggerà Cloud Build e deploy su Cloud Run normalmente.

## Infrastruttura backend (riferimento)

- **Servizio Cloud Run backend**: `evolution-pro-backend` in `europe-west1` (project number `977860235035`)
- **Comando deploy env var**: `gcloud run services update evolution-pro-backend --update-env-vars KEY=value --region europe-west1`
- **`EMERGENT_LLM_KEY`**: è una chiave Anthropic Claude (`sk-ant-api03-...`), usata dal backend per le chiamate LLM. Non è Emergent — è Claude.
- **Redis**: Upstash (`rediss://...included-tomcat-82332.upstash.io:6379`) — funzionante
- **CELERY_ENABLED**: impostare a `true` via gcloud se il worker non parte

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
- Se le modifiche non appaiono online: verificare traffic routing con `gcloud run services describe evolution-pro-frontend`
- Il blocco traffico su vecchie revision è causato da Emergent (infrastrutturale, non risolvibile dal codice)
