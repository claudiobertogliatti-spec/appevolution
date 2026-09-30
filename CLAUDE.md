# Evolution PRO — Istruzioni permanenti per Claude Code

## Architettura Evolution concordata — 8 settembre 2026

Leggere [docs/strategy/evolution-architettura-concordata.md](docs/strategy/evolution-architettura-concordata.md) prima di lavorare su admin, reparti, agenti e collaborazioni. Piano in `docs/superpowers/plans/2026-09-08-evolution-organigramma-autonomia.md`. Claudio ha autorizzato l'avvio **backend-first**, mantenendo l'admin operativo: implementazione isolata, nessuna nuova autonomia attivata senza verifiche. Mandati tecnici in `docs/strategy/evolution-reparti-mandati.md`.

## ⛔ LEGGERE PRIMA DI TUTTO — protocollo multi-agente (2026-07-27)

Su questo repo lavorano più agenti (Claude Code, Codex, Antigravity).
**Prima di qualsiasi cosa, leggere `docs/agents/PROTOCOL.md` e `docs/agents/HANDOFF.md`**,
e aggiornare l'handoff prima di chiudere la sessione.

Le tre regole che vengono violate più spesso:
1. **Il repo di verità è `C:\Users\berto\appevolution`.** `C:\Users\berto\Desktop\appevolution`
   è una copia ritirata: non lavorarci, non committarci.
2. **Niente è "fatto" senza prova** (comando+output, URL, risposta API, screenshot).
3. **Mai `git add .`** — si aggiungono i file per nome.

## ⛔ DIRETTIVA TASSATIVA — Verifica al 100%, zero allucinazioni (2026-08-05)

Vale per **ogni agente** su questo repo (Claude Code, Codex, Antigravity) e per ogni
risposta. Estende la regola 2 qui sopra ("niente è fatto senza prova") a monte: non solo
le azioni, ma anche le **affermazioni** vanno provate.

**1. No-guessing.** Mai assumere l'esistenza di file, percorsi, firme di funzione,
librerie, variabili o endpoint senza averli letti o interrogati direttamente. Prima di
proporre una modifica: leggere il sorgente reale, non lo snippet parziale né il ricordo
di sessioni precedenti. ⚠️ Su questo repo l'errore costa: vedi `server.py` (shadow
routes — grep prima di toccare) e il doppio campo hash password.

**2. Incertezza dichiarata.** Se manca l'accesso o lo strumento per verificare al 100%,
dirlo invece di produrre la risposta plausibile. Se la richiesta è ambigua, chiedere.
Etichettare sempre in modo esplicito:
- ✅ **fatto verificato** (con la prova a fianco: comando+output, URL, risposta API)
- 🔎 **deduzione logica** (dichiarata come tale)
- ⛔ **dato mancante / non verificabile** (evidenziato subito)

**3. Checklist pre-risposta.** Ho verificato ogni nome di file/funzione/variabile nel
codice reale? Sto rispondendo solo su ciò che posso dimostrare? C'è un punto in cui sto
tirando a indovinare? → fermarsi e correggere, o dichiarare il limite.

**Regola d'oro**: una risposta incompleta ma vera vale più di una risposta completa e
inventata. Un report che inventa righe è peggio di nessun report.

## 🎨 DIRETTIVA DESIGN — Brand-Lock First (2026-08-05)

Vale per **ogni agente** (Claude Code, Codex, Antigravity). Standard estetico di
riferimento: Apple, Stripe, Linear, Vercel. Ma su questo repo l'estetica è **subordinata
al brand**: qui si produce il deliverable venduto €499, e un funnel fuori brand non è
"meno bello", è un prodotto rotto.

### 1. Gerarchia di precedenza — inviolabile
1. **Brand kit definitivo** → PRIORITÀ ASSOLUTA. Ciak/Evolution PRO: font **Poppins**,
   palette `#0F172A` `#64748B` `#E5E7EB` `#FACC15` (fonte: `docs/brand/ciak-brand-kit.md`
   v1.0, confermata definitiva il 18/5/2026). Per i partner: token da `partner_brand_kits`.
2. **Direttiva design generica** (bento grid, glassmorphism, micro-interazioni, palette
   sofisticate, font display tipo Syne/Satoshi/Inter) → valida **solo dove non esiste un
   brand lock**: nuovi clienti (es. SlimAmour), concept, mockup esplorativi.

⛔ Non sostituire Poppins con un font "più di carattere". ⛔ Non scartare `#E5E7EB`
perché "grigio piatto": è un colore ufficiale. In caso di conflitto → **proporre**
l'alternativa a Claudio, mai applicarla di nascosto.

### 2. Verifica dipendenze prima di animare
Stato verificato il 5/8/2026: `evolution-pro-site` ha `framer-motion@12.42.2`;
`frontend/` (app Ciak/partner) **non ha né framer-motion né gsap**. Aggiungere una
libreria di motion dove non c'è è una **decisione da far approvare**, non un dettaglio
implementativo da infilare in un commit.
Dove il motion è disponibile: fisica spring (`stiffness:300, damping:25`) invece di
durate fisse, `whileHover`/`whileTap`, scroll reveal `viewport:{once:true}`,
`staggerChildren:0.1`. ⚠️ Il pubblico Ciak è poco digitalizzato: rispettare
`prefers-reduced-motion` e non nascondere contenuto critico dietro un'animazione.

### 3. Onestà sui dati nel funnel builder
Si copia il **livello visivo** di Lovable/Linear, non la disinvoltura sui dati.
⛔ Mai generare recensioni, testimonianze, percentuali o claim di guadagno inventati:
è illecito (Codice del Consumo artt. 21-23, direttiva Omnibus). È il motivo per cui
`POST /funnel/{id}/genera-ai` è stato ritirato con **HTTP 410**.

### 4. Stato dei sorgenti: verificare, non ricordare
Prima di affermare che un file usa una certa palette o un certo template, **aprirlo**.

✅ **Palette allineata al brand il 5/8/2026.** La vecchia (`#1a1a2e`/`#e94560`/`#f5a623`)
non esiste più in `backend/` (grep: 0 occorrenze). Mapping applicato:
| Vecchio | Nuovo | Dove |
|---|---|---|
| `#1a1a2e` | `#0F172A` | ovunque (slate-900 brand) |
| `#f5a623` | `#FACC15` | accento landing |
| `#e94560` | `#F43F5E` **solo nella landing** (`COLORE_SECONDARIO` = quinto colore semantico, urgenza/errori) | |
| `#e94560` | `#0F172A` **nei 3 documenti legali** (link e header tabella: sobri, brand-puri) | |
| `#16213e` | `#1E293B` | gradient header export |

⚠️ Il quinto colore `#F43F5E` **non è un colore di marca**: usarlo solo per urgenza/errori,
mai come accento decorativo — l'accento resta `#FACC15`.

🪤 **Errori di lettura da non ripetere** (commessi il 5/8 e corretti):
- `test_funnel_builder.py` è un test **e2e HTTP** (`requests.post` a `BASE_URL`), non un
  unit test: **invia** i colori nel payload e poi asserisce quelli. Cambiare i default NON
  lo rompe. Non dedurre l'effetto di un'asserzione senza leggere come il test costruisce
  l'input.
- `LandingPageParams` **non è usata** in `funnel_builder.py` oltre alla definizione: il
  percorso `POST /{partner_id}/landing-page` passa il dict grezzo a `_render`, quindi lì i
  default non si applicano. Chi li applica è `funnel_factory.py:57`.
- `_render` (`funnel_builder.py:132`) sostituisce **solo le chiavi presenti**: una chiave
  mancante lascia il placeholder letterale nell'HTML (`{COLORE_PRIMARIO}`) → CSS invalido,
  non "colore di default".

### 5. Gialli fuori brand — ✅ CHIUSO il 5/8/2026
`#FFD24D` e `#F2C418` **non esistono più** in `backend/`: 26 occorrenze in 14 file, tutte
sistemate (commit `c7f56d5e` per contract/export, `e43de35f` per le altre 23).
Riverifica: `grep -rni "FFD24D\|F2C418" backend/ --include=*.py` → 0.

🪤 **Non è stato un replace globale, e non deve esserlo se ricapita.** Lo stesso hex aveva
tre ruoli, con due destinazioni diverse:
| Ruolo | Destinazione | Perché |
|---|---|---|
| Testo su fondo scuro (`#0F172A`, `#1A1F24`) | `#FACC15` | contrasto ok |
| Testo su fondo chiaro (`#FAFAF7`, bianco PDF) | **`#0F172A`** | il giallo su bianco non passa il contrasto — il brand kit vieta il giallo per il testo |
| Sfondi, bordi, linee, token | `#FACC15` | non è testo |

I 5 casi della riga centrale erano link nelle email ai partner (`email_templates.py:33`,
`server.py:4223`) e titoli di sezione nei PDF dell'analisi (`analisi_consulenziale.py:897,981`,
`flusso_analisi.py:1940`). Convertirli in giallo brand avrebbe **peggiorato** un problema di
accessibilità già presente.

⚠️ Non sono gialli fuori brand ma **colori semantici** — non toccarli:
`#F59E0B` in `funnel_export_service.py:155,178` (stato *pending*),
`#F43F5E` (urgenza/errori, vedi §4).

⛔ Restano altri hex non-brand mai censiti (`#FADA5E`, `#FFF8DC`, `#FEF9E7`, `#1a1f24`,
`#2D3038`, `#16213e` nei template email). Nessuno è un giallo di marca usato male: sono
sfondi tenui e neutri. Da valutare solo se si fa un riallineamento completo dei template email.

### 6. Font fuori brand (aperto)
I 3 template legali in `funnel_builder.py` usano `font-family:'Segoe UI',system-ui`;
`funnel_export_service.py:104` idem. Il brand è **Poppins**.

## ⚠️ Prezzo Ciak Blueprint = 27€ (2700), non 67€. I nomi *_67 sono LEGACY (2026-07-05)

Il prodotto 'Ciak Blueprint' costa **27€ IVA inclusa** (checkout.py `unit_amount: 2700`, lockato 2026-05-12). Ogni riferimento a '67€', '6700', stato `purchased_67`/`clicked_67`, tag `ciak_bought_67`/`ciak_clicked_67` è **nomenclatura legacy mai rinominata**, NON il prezzo. Non propagare '67€' come prezzo corrente. (Fix default mark-purchased 6700→2700 applicato 2026-07-05.)

## Preferenze di comunicazione

- **Lingua**: Parla sempre in italiano con Claudio, in ogni risposta.

## Autorizzazione operativa

Claude è autorizzato a committare e pushare su `main` senza richiedere conferma esplicita a ogni operazione. L'utente (Claudio) ha dato autorizzazione permanente per operare in modo autonomo su questo repository.

**Deploy autonomo**: Claude deve eseguire direttamente git add/commit/push usando il sandbox bash (mcp__workspace__bash). NON dare mai comandi PowerShell da eseguire manualmente a Claudio. Se il sandbox bash è temporaneamente down, usare Claude in Chrome con l'editor GitHub web (CM6). Non chiedere mai a Claudio di lanciare comandi manualmente.

**Se il sandbox bash fallisce**: usare Claude in Chrome → navigare su github.com/claudiobertogliatti-spec/appevolution → aprire il file → Edit → modificare via console CM6 → commit su main.

## ⛔ Migrazione partner Drive→Ciak — LEGGERE IL PROTOCOLLO PRIMA DI TOCCARE UN PARTNER

Prima di qualsiasi lavoro sui dati di un partner (migrazione, compilazione step,
allineamento fasi): **leggere per intero `memory/CIAK_MIGRATION_MEMORY.md`**.
Contiene le 16 regole operative, il caso pilota (**Sarah Arensi, ID 4** — non Daniele
Andolfi) e le decisioni su chi è escluso. Vedi anche `docs/migration/`.

Non leggerne frammenti con grep/sed: è proprio la parte non letta che dice che si sta
sbagliando approccio. Il 2026-07-20 questo errore è costato ore di lavoro rifatto e due
falsi allarmi.

Le due regole più violate:
- **Regola 7** — non marcare una fase come completa solo perché esiste un materiale parziale.
- **Regola 6** — ciò che non abbiamo si lascia vuoto o si segna come mancante; non si inventa.

⚠️ **Gli stati "✅ fatto" scritti nelle memorie e negli audit non sono verificati.** Verificare
sempre alla fonte (`GET /api/partners/{id}`, `/api/partner-hub/{id}`, `/api/admin/partner/{id}/full-data`)
prima di dare un partner per completato.

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
- **PowerShell**: eseguire sempre i comandi git da `C:\Users\berto\appevolution`, non da `C:\WINDOWS\system32`. ⚠️ Corretto il 2026-07-27: qui c'era `Desktop\appevolution`, che è la copia ritirata (ferma all'11/7). Vedi `docs/agents/PROTOCOL.md`.
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

## 📚 Storico spostato in skill (30/9/2026)

Per tenere questo file corto (viene caricato a ogni sessione), i diari di sessione e le sezioni
storiche sono stati spostati **alla lettera, senza modifiche** in skill che Claude carica solo
quando servono. Qualsiasi agente può comunque leggerle come file normali:

- **`.claude/skills/storico-pipeline-video/SKILL.md`** — Sessione 2026-04-22 — Fix pipeline GCS + debug multi-sessione Daniele Andolfi; Sessione 2026-04-22 (continuazione) — Pipeline Daniele Andolfi avanzata; Sessione 2026-04-22 (seconda continuazione) — Fix timeout subprocess + monitoraggio cleaning; Sessione 2026-04-22 (terza continuazione) — Diagnosi timeout extract_audio + Retry 2; ⏳ TODO YouTube — rigenerare il token sotto "Production" (fix scadenza 7 giorni); Standard editing video — Descript (2026-06-16)
- **`.claude/skills/storico-funnel-systeme/SKILL.md`** — Automazione Funnel Systeme.io (2026-04-21); Sessione 2026-04-23 — Funnel Systeme.io Daniele Andolfi + Fix pipeline video
- **`.claude/skills/storico-journey-partner/SKILL.md`** — Architettura MasterclassPage (2026-04-20); AdminPartnerJourneyEditor — Editor Journey Admin (2026-04-20); Sessione 2026-04-20 — Fix applicati e funzionalità aggiunte; Sessione 2026-06-10 — Posizionamento 6 campi completato per TUTTI i 24 partner + API partner-hub; Sessione 2026-06-19 — Fix "I Miei File": Visualizza rotto per file caricati dal partner
- **`.claude/skills/storico-admin-ciak/SKILL.md`** — Problema storico (ora risolto): Emergent force-push; Sessione 2026-06-19 — Eliminazione definitiva `app.evolution-pro.it` (Fasi 1-3); Sessione 2026-06-18 (continuazione) - Luigi Calafiore + funzione admin "Segna 67 EUR pagato (manuale)"; Sessione 2026-06-26 — Cabina di Regia (organigramma 4 reparti) + canale di deploy via connettore GitHub; Sessione 2026-06-26 (continuazione) — Audit 7 partner attivi + Sprint acquisizione "dentro o fuori"; Sidebar admin Ciak — 5 macro-reparti + Agente di Riferimento (2026-06-26); Sessione 2026-06-27 — Card "Campagne email" nella pagina admin "Oggi"; Sessione 2026-06-30 — Fatture di cortesia (Back office · Valentina); Strumento contenuti — Swipeeza (AI Carousel Maker) — archiviato 2026-07-09
- **`.claude/skills/luca-ad/SKILL.md`** — Sessione 2026-06-29 — Luca AD + Revisione Video stile-Descript (provata end-to-end); ⚠️ STATO DI LUCA — aggiornato il 15/8/2026. Questo riquadro SUPERA le due righe "SOLA CONSULENZA" qui sopra.

