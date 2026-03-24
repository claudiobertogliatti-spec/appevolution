# Evolution PRO - Product Requirements Document

## Original Problem Statement
Build a multi-faceted AI-powered application for "Evolution PRO" business including:
- Systeme.io Payment Integration with Stripe
- High-Conversion Sales Script generation using LLM
- Avatar & Social Plan Management (HeyGen)
- Discovery Engine AI for lead generation
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
│   │   ├── discovery_engine.py  # Lead discovery + auto-approve + email sequence
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

### Session: 24 March 2026 - BRIEF TECNICO IMPLEMENTATION

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

## API Endpoints

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
- [ ] **Verifica YouTube OAuth su produzione**: Testare `/api/youtube/auth-url` su dominio reale
- [ ] **Stripe Subscription per Piano Continuità**: Implementare rinnovo automatico via Stripe subscriptions

### P2 - Medium Priority
- [ ] Filtri avanzati Discovery Leads per `target_fit_level`
- [ ] Countdown scadenza partnership (UI)

### P3 - Technical Debt
- [ ] Refactoring `server.py` monolith
- [ ] Unificazione collection `users` e `partners`
- [ ] Documentazione OpenAPI

## Important Notes
- **Celery Queue**: Usa coda `analisi_automation` per task email e auto-approve
- **Systeme.io Integration**: Email inviate via tag su Systeme.io
- **GAIA**: Agente AI per check-in mensili sui partner
- **Fallback Pattern**: Se integrazioni esterne falliscono, il flusso continua con logging

## Credentials (Test)
- **Admin:** claudio.bertogliatti@gmail.com / Evoluzione74
- **Operations:** antonella@evolution-pro.it / OperationsAnto2024!
