# Evolution PRO - Product Requirements Document

## Original Problem Statement
Build a multi-faceted AI-powered application for "Evolution PRO" business including:
- Systeme.io Payment Integration with Stripe
- High-Conversion Sales Script generation using LLM
- Avatar & Social Plan Management (HeyGen)
- **Discovery Engine AI with YouTube Data API v3 Integration**
- "Sblocco Core" Roadmap automation
- Ollama Integration for local LLM processing
- **Lead Acquisition Automation with Email Sequence for €67 Analysis Sale**
- **Post-Payment Automation with AI Analysis & Email Workflows**
- **Piano Continuità Management with Stripe Subscriptions**

## User's Preferred Language
**Italian** - All UI and communications should be in Italian.

## Core Architecture
```
/app
├── backend/           # FastAPI backend
│   ├── server.py      # Main API server (monolith)
│   ├── routers/       # API routers
│   │   ├── discovery_engine.py  # Lead discovery + YouTube API + auto-approve + email sequence
│   │   ├── stripe_webhook.py    # Stripe webhook + post-payment automation
│   │   ├── flusso_analisi.py    # Attiva-partnership + Systeme.io integration
│   │   └── partner_journey.py   # Partner journey with AI generation
│   ├── celery_app.py   # Celery configuration with beat schedule
│   ├── celery_tasks.py # Celery tasks (video, email, auto-approve, GAIA, expiry)
│   ├── systeme_mcp_client.py # Systeme.io API client
│   ├── email_templates.py # Email template management (WYSIWYG ready)
│   └── ...
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/
        │   │   ├── AdminDashboardPro.jsx
        │   │   ├── AdminPartnerTools.jsx
        │   │   └── EmailTemplatesManager.jsx  # WYSIWYG editor
        │   ├── partner/
        │   └── chat/
        └── App.js
```

## What's Been Implemented

### Session: 24 March 2026 - Lista Fredda + STEFANIA Integration

#### ✅ PARTE 1 - Import Lista Fredda CSV
- `POST /api/lista-fredda/import` - Upload CSV con deduplicazione su email
- `GET /api/lista-fredda/stats` - Statistiche (totale, per stato, aperture, click)
- `GET /api/lista-fredda/leads` - Lista con filtri (stato, tag, has_phone)
- `GET /api/lista-fredda/leads/caldi` - Solo lead caldi
- `GET /api/lista-fredda/export` - Export CSV filtrato

#### ✅ PARTE 2 - Webhook Tracking Systeme.io
- `POST /api/lista-fredda/webhook/systeme-tracking` - Eventi: email_opened, link_clicked, unsubscribed, reply_received
- Auto-update stato: in_sequenza → caldo → in_funnel → convertito
- Alert Telegram per risposte e lead caldi

#### ✅ PARTE 3 - Trigger STEFANIA (Celery Tasks)
- `stefania_check_email4_noclick` - 48h dopo apertura email 4, se non clicca → task WhatsApp
- `stefania_check_funnel_nopayment` - 24h dopo ingresso funnel, se non paga → reminder

#### ✅ PARTE 5 - Fix Endpoints Mancanti
- `GET /api/flusso-analisi/pending` - Analisi in attesa
- `GET /api/flusso-analisi/stats` - Statistiche flusso €67
- `GET /api/flusso-analisi/list` - Lista analisi con filtri
- `GET /api/partners-unified` - Unified view funzionante con nomi

#### ✅ Discovery CSV Import
- `POST /api/discovery/import-csv` - Import lead da CSV nella discovery

#### ✅ PRIORITÀ ASSOLUTA (a) - Trigger Automatico Post-Pagamento €67 - COMPLETE
Il flusso era già implementato e funzionante:
1. Stripe webhook riceve `payment_intent.succeeded` → `/api/webhooks/stripe`
2. `pagamento_analisi: true` sul cliente
3. Genera analisi Claude se questionario completato
4. Genera call script (8 blocchi)
5. Invia email `analisi_welcome` via Celery (immediata)
6. Schedula reminder `analisi_reminder_48h` via Celery (T+48h)
7. Notifica Telegram admin

**File chiave**: `/app/backend/routers/stripe_webhook.py`

#### ✅ PRIORITÀ ASSOLUTA (b) - Sub-account Systeme.io Partnership - COMPLETE
1. **Endpoint**: `POST /api/flusso-analisi/attiva-partnership/{user_id}`
2. **Verifica**: Contratto firmato + pagamento completato
3. **Crea sub-account Systeme.io** via `create_partner_subaccount_async()`
4. **Salva `systeme_account_id`** nel profilo partner
5. **Invia email `partnership_welcome`** con variabili {{nome}}, {{email}}
6. **Fallback**: Se Systeme.io fallisce, logga errore e invia email con nota manuale
7. **Notifica Telegram admin**

**File chiave**: `/app/backend/routers/flusso_analisi.py`, `/app/backend/systeme_mcp_client.py`

#### ✅ PRIORITÀ 2 (d) - Piano Continuità - COMPLETE
1. **Admin endpoint lista piani**: `GET /api/admin/piano-continuita`
   - Lista tutti i partner con piano attivo
   - Stats: total_active, expiring_7_days, expiring_30_days, total_mrr
2. **Storico pagamenti**: `GET /api/admin/piano-continuita/{partner_id}/payments`
3. **GAIA check mensile**: Task Celery `gaia_monthly_check` (ogni 30 giorni)
4. **Notifica scadenza 7 giorni**: Task Celery `check_piano_continuita_expiry` (giornaliero)
5. **Trigger manuale GAIA**: `POST /api/admin/piano-continuita/{partner_id}/trigger-gaia-check`

**File chiave**: `/app/backend/celery_tasks.py`, `/app/backend/celery_app.py`

#### ✅ PRIORITÀ 3 (c) - Export CSV Partner - COMPLETE
**Endpoint**: `GET /api/admin/partners/export-csv`
**Colonne**: ID, Nome, Email, Telefono, Fase, Nicchia, Revenue Totale, MRR, Piano Continuità, Fee Mensile, Data Contratto, Data Rinnovo Piano, Giorni alla Scadenza, Ultimo Aggiornamento, Giorni dall'Ultimo Update, Status

#### ✅ Automazione Acquisizione Lead - COMPLETE (from previous session)
- Auto-approve leads con score ≥ 80 e `target_fit_level: altissimo`
- Sequenza 4 email (D+0, D+2, D+4, D+7) per vendita analisi €67
- Template modificabili via WYSIWYG

### Test Results
- **Iteration 25**: 19/19 tests passed (100%) - Lead auto-approve & email sequence
- **Iteration 26**: 20/20 tests passed (100%) - Post-payment automation & partnership activation
- **Iteration 27**: 20/20 tests passed (100%) - YouTube Data API v3 Discovery Integration

## API Endpoints

### YouTube Discovery (NEW)
- `POST /api/discovery/search` - Ricerca canali YouTube reali (source: "youtube")
- `POST /api/youtube-heygen/youtube/upload-client-secret` - Upload credenziali OAuth
- `GET /api/youtube-heygen/youtube/get-auth-url` - Genera URL autorizzazione OAuth
- `GET /api/youtube-heygen/youtube/auth-status` - Verifica stato autenticazione

### Stripe Webhook & Post-Payment
- `POST /api/webhooks/stripe` - Webhook Stripe (payment_intent.succeeded, checkout.session.completed)
- `POST /api/webhooks/test-analisi-payment/{user_id}` - Test: simula pagamento €67
- `GET /api/webhooks/test-automation-status/{user_id}` - Test: verifica stato automazione

### Partnership Activation
- `POST /api/flusso-analisi/attiva-partnership/{user_id}` - Attiva partnership con Systeme.io

### Admin Piano Continuità
- `GET /api/admin/piano-continuita` - Lista piani attivi con stats
- `GET /api/admin/piano-continuita/{partner_id}/payments` - Storico pagamenti
- `POST /api/admin/piano-continuita/{partner_id}/trigger-gaia-check` - Trigger GAIA

### Admin Export
- `GET /api/admin/partners/export-csv` - Export CSV completo partner

### Discovery Engine
- `POST /api/discovery/search` - Ricerca lead (YouTube API v3 integrata)
- `GET /api/discovery/leads` - Lista lead con filtri (source, status, min_score)
- `GET /api/discovery/leads/hot` - Lead con score alto
- `GET /api/discovery/leads/{lead_id}` - Dettaglio singolo lead
- `GET /api/discovery/settings/auto-approve` - Recupera impostazioni auto-approve
- `PUT /api/discovery/settings/auto-approve` - Aggiorna impostazioni
- `POST /api/discovery/trigger-auto-approve` - Trigger manuale
- `POST /api/discovery/lead/{lead_id}/start-email-sequence` - Avvia sequenza
- `POST /api/discovery/lead/{lead_id}/stop-email-sequence` - Stop sequenza

### Celery Beat Schedule
```python
beat_schedule = {
    'check-stuck-pipelines': 300s (5 min),
    'check-pending-analisi-reminders': 3600s (1 hour),
    'process-auto-approve-leads': 3600s (1 hour),
    'gaia-monthly-check': 2592000s (30 days),
    'check-piano-continuita-expiry': 86400s (24 hours)
}
```

## Deployment Status
**Ready for production deployment** to `app.evolution-pro.it`
- ✅ `load_dotenv(override=False)` - Fixed
- ✅ Removed `get_env_override` - Uses `os.environ.get` only
- ✅ CORS respects `CORS_ORIGINS='*'`

## Pending/Future Tasks

### P1 - High Priority
- [ ] **Stripe Subscription per Piano Continuità**: Implementare rinnovo automatico via Stripe subscriptions
- [ ] **Google Custom Search API**: Integrare per source="google" nella Discovery

### P2 - Medium Priority
- [ ] Filtri avanzati Discovery Leads per `target_fit_level`
- [ ] Countdown scadenza partnership (UI)
- [ ] Instagram/LinkedIn API integration per Discovery

### P3 - Technical Debt
- [ ] Refactoring `server.py` monolith
- [ ] Unificazione collection `users` e `partners`
- [ ] Documentazione OpenAPI

## Important Notes
- **YouTube Data API v3**: Quota 10.000 unità/giorno. Una ricerca costa ~100 unità.
- **YouTube OAuth**: Credenziali in `/app/storage/youtube_credentials.pickle`
- **Celery Queue**: Usa coda `analisi_automation` per task email e auto-approve
- **Systeme.io Integration**: Email inviate via tag su Systeme.io
- **GAIA**: Agente AI per check-in mensili sui partner
- **Fallback Pattern**: Se integrazioni esterne falliscono, il flusso continua con logging
- **Lead Scoring YouTube**: subscriber_count (1k-10k = +30pt), video frequency (+20pt), keywords (+20pt), email/website (+15pt), IT content (+15pt)

## Credentials (Test)
- **Admin:** claudio.bertogliatti@gmail.com / Evoluzione74
- **Operations:** antonella@evolution-pro.it / OperationsAnto2024!
