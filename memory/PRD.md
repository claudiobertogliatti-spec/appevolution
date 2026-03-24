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

## User's Preferred Language
**Italian** - All UI and communications should be in Italian.

## Core Architecture
```
/app
├── backend/           # FastAPI backend
│   ├── server.py      # Main API server (monolith)
│   ├── routers/       # API routers
│   │   ├── discovery_engine.py  # Lead discovery + auto-approve + email sequence
│   │   └── partner_journey.py   # Partner journey with AI generation
│   ├── celery_app.py   # Celery configuration
│   ├── celery_tasks.py # Celery tasks (video, email, auto-approve)
│   ├── email_templates.py # Email template management (WYSIWYG ready)
│   ├── heygen_service.py
│   ├── ollama_service.py
│   └── stefania_ai.py
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

### Session: 24 March 2026 - Lead Auto-Approve & Email Sequence COMPLETED ✅

#### PRIORITÀ 1 COMPLETATA: Automazione Acquisizione Lead & Sequenza Email Vendita €67

1. **Auto-Approvazione Lead** ✅
   - Endpoint: `GET/PUT /api/discovery/settings/auto-approve`
   - Criteri configurabili: `min_score` (default: 80), `required_fit_level` (default: "altissimo")
   - Job Celery periodico: `process_auto_approve_leads` (ogni ora)
   - Trigger manuale: `POST /api/discovery/trigger-auto-approve`
   - File: `/app/backend/celery_tasks.py`

2. **Sequenza Email di Vendita (4 Email su 7 Giorni)** ✅
   - Endpoint avvio: `POST /api/discovery/lead/{lead_id}/start-email-sequence`
   - Endpoint stop: `POST /api/discovery/lead/{lead_id}/stop-email-sequence`
   - Scheduling: Email 1 (D+0), Email 2 (D+2), Email 3 (D+4), Email 4 (D+7)
   - Task Celery: `send_lead_sequence_email`
   - Integrazione Systeme.io via tag

3. **4 Template Email per Sequenza di Vendita** ✅
   - `lead_sequence_email_1`: Presentazione + problema (variabili: nome, niche)
   - `lead_sequence_email_2`: Caso studio "Marco" (conversione €47k in 90 giorni)
   - `lead_sequence_email_3`: Offerta €67 con CTA checkout Stripe
   - `lead_sequence_email_4`: Reminder finale con urgenza
   - File: `/app/backend/email_templates.py`
   - Tutti i template sono modificabili via editor WYSIWYG

4. **Bug Fix: ObjectId in create_lead response** ✅
   - Aggiunto `doc.pop("_id", None)` prima di restituire il documento

#### Test Results
- **Iteration 25**: 19/19 tests passed (100%)
- Auto-approve settings CRUD ✅
- Email sequence start/stop ✅
- 4 lead sequence email templates ✅
- Celery task integration ✅

### Previous Sessions

#### Session: 24 March 2026 - Post-Payment Automation
- **Automazione Post-Pagamento €67** ✅: Email benvenuto + Reminder 48h via Celery
- **Editor WYSIWYG Template Email** ✅: `/app/frontend/src/components/admin/EmailTemplatesManager.jsx`
- **Fix Bug Masterclass** ✅: Risolto conflitto di rotta in `partner_journey.py`
- **Fix Partners Unified View** ✅: Aggiunto helper per serializzazione ObjectId

#### Session: 23 March 2026
- Stripe Webhook ✅
- Admin Override Dati Partner ✅
- Partners Unified View ✅
- Funnel Admin Unlock ✅
- HeyGen Pipeline ✅
- Celery Queue Setup ✅
- Discovery Engine Filters ✅
- Partnership Countdown ✅
- Export CSV Partner ✅

## API Endpoints

### Discovery Engine - Lead Management
- `GET /api/discovery/leads` - Lista lead con filtri
- `GET /api/discovery/leads/hot` - Lead caldi (score >= 50)
- `POST /api/discovery/leads` - Crea nuovo lead
- `GET /api/discovery/leads/{lead_id}` - Dettaglio lead
- `DELETE /api/discovery/leads/{lead_id}` - Elimina lead
- `POST /api/discovery/score/{lead_id}` - Calcola score AI

### Discovery Engine - Auto-Approve & Email Sequence
- `GET /api/discovery/settings/auto-approve` - Recupera impostazioni
- `PUT /api/discovery/settings/auto-approve` - Aggiorna impostazioni
- `POST /api/discovery/trigger-auto-approve` - Trigger manuale
- `POST /api/discovery/lead/{lead_id}/start-email-sequence` - Avvia sequenza
- `POST /api/discovery/lead/{lead_id}/stop-email-sequence` - Stop sequenza

### Email Templates (Admin)
- `GET /api/admin/email-templates` - Lista tutti i template
- `GET /api/admin/email-templates/{template_id}` - Singolo template
- `PUT /api/admin/email-templates/{template_id}` - Aggiorna template

### Celery Configuration
```python
beat_schedule = {
    'check-stuck-pipelines': 300s (5 min),
    'check-pending-analisi-reminders': 3600s (1 hour),
    'process-auto-approve-leads': 3600s (1 hour)  # NEW
}
```

## Database Collections
- `discovery_leads` - Lead data with email_sequence_* fields
- `admin_settings` - Auto-approve settings (type: "auto_approve_outreach")
- `email_templates` - Custom email templates
- `email_logs` - Email sending logs

## Pending/Future Tasks

### P1 - High Priority
- [ ] **Sviluppo Modulo Piano Continuità**: UI admin + Stripe Subscriptions + agente GAIA + notifiche
- [ ] **Attivazione Partnership**: Sub-account Systeme.io + email onboarding
- [ ] **Verifica YouTube OAuth**: Test su produzione

### P2 - Medium Priority
- [ ] Filtri Avanzati Discovery Leads (per target_fit_level)
- [ ] Countdown Scadenza Partnership
- [ ] Export CSV Partner

### P3 - Technical Debt
- [ ] Refactoring `server.py` monolith
- [ ] Unificazione collection `users` e `partners`
- [ ] Documentazione OpenAPI

## Important Notes
- **Celery Queue**: Usa coda `analisi_automation` per task email e auto-approve
- **Systeme.io Integration**: Email inviate via tag su Systeme.io, non direttamente
- **STRIPE_CHECKOUT_URL_ANALISI**: Variabile env per link checkout €67
- **LLM Integration**: Usa `emergentintegrations.llm.chat.LlmChat` con `UserMessage(text=...)`

## Credentials (Test)
- **Admin:** claudio.bertogliatti@gmail.com / Evoluzione74
- **Operations:** antonella@evolution-pro.it / OperationsAnto2024!
