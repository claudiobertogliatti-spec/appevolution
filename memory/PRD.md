# Evolution PRO - Product Requirements Document

## Original Problem Statement
Build a multi-faceted AI-powered application for "Evolution PRO" business including:
- Systeme.io Payment Integration with Stripe
- High-Conversion Sales Script generation using LLM
- Avatar & Social Plan Management (HeyGen)
- Discovery Engine AI for lead generation
- "Sblocco Core" Roadmap automation
- Ollama Integration for local LLM processing

## User's Preferred Language
**Italian** - All UI and communications should be in Italian.

## Core Architecture
```
/app
├── backend/           # FastAPI backend
│   ├── server.py      # Main API server (monolith)
│   ├── routers/       # API routers
│   │   └── partner_journey.py  # Partner journey with AI generation
│   ├── heygen_service.py
│   ├── ollama_service.py
│   ├── stefania_ai.py # AI assistant (renamed from Valentina)
│   └── stefania_memory.py
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/  # Admin dashboard components
        │   │   └── YouTubeHeygenHub.jsx  # Fixed race condition
        │   ├── partner/ # Partner views
        │   └── chat/   # Stefania chat
        └── App.js
```

## What's Been Implemented

### Session: 23 March 2026
#### Bug Fixes
1. **Masterclass Script Generation (P0)** ✅
   - Fixed `AttributeError: 'str' object has no attribute 'file_contents'`
   - Root cause: `llm.send_message()` requires `UserMessage(text=prompt)` not raw string
   - Fixed all 6 occurrences in `/app/backend/routers/partner_journey.py`
   - Tested: `POST /api/partner-journey/masterclass/generate-script` now working

2. **YouTubeHeygenHub Race Condition (P2)** ✅
   - Added `loadingProduction` and `productionError` states
   - Shows loading spinner while fetching production data
   - Shows error message with retry button if API calls fail
   - Improved error handling in `loadProductionData()` function

#### New Features
3. **Delete Button for Discovery Leads** ✅
   - Added delete button (trash icon) in Discovery Leads table
   - Added confirmation modal with lead details before deletion
   - Uses existing `DELETE /api/discovery/leads/{lead_id}` endpoint
   - Delete button also added in Lead Detail modal

#### FASE 1 - Quick Wins (COMPLETED)
4. **Filtri Avanzati Discovery Leads** ✅
   - Filter by Status: pending, scored, discovered, contacted, qualified, rejected
   - Filter by Platform: LinkedIn, Instagram, YouTube, Facebook, Google, Manual
   - Filter by Minimum Score: 50, 60, 70 (Hot), 80 (Very Hot), 90 (Super Hot)
   - Reset filters button
   - Active filters badges display
   - Total leads counter

5. **Countdown Scadenza Partnership** ✅
   - New "Scadenza" column in Partners table with Timer icon
   - Color-coded badges: red (≤7 days), amber (≤30 days), green (>30 days)
   - Calculates 12 months from payment date
   - Shows "Scaduto" for expired partnerships

6. **Export CSV Lista Partner** ✅
   - Green "Export CSV" button in Partners table toolbar
   - Exports: Nome, Email, Telefono, Nicchia, Fase, Progresso, Partnership Pagata, 
     Data Pagamento, Giorni alla Scadenza, Data Scadenza, Ultima Attività, 
     Giorni Inattività, Stato, Contratto Firmato, Onboarding Completato
   - UTF-8 with BOM for Excel compatibility

#### FASE 2 - Pipeline HeyGen→YouTube (IMPLEMENTED)
7. **One-Click Pipeline** ✅
   - New endpoint: `POST /api/heygen/one-click-pipeline`
   - Workflow: Script → HeyGen Video Generation → Poll for completion → YouTube Upload
   - Background task execution with progress tracking (0-100%)
   - Pipeline status endpoint: `GET /api/heygen/pipeline-status/{job_id}`
   - Pipeline jobs list: `GET /api/heygen/pipeline-jobs`
   - Telegram notifications at start, completion, and failure
   - Auto-upload to YouTube with configurable privacy (private/unlisted/public)

#### FASE 3 - Scheduler Automatici (IMPLEMENTED)
8. **New Scheduled Jobs** ✅
   - **Systeme.io Sync** (every 6 hours): Syncs all contacts from Systeme.io
   - **Partnership Expiry Reminder** (daily 8:00): Alerts for 30/15/7 days and expired
   - **Weekly KPI Report** (Monday 8:30): Partners, Leads, Clients stats summary
   - All notifications sent via Telegram
   - New endpoint: `POST /api/notify/telegram` for scheduler use

### Previous Session: March 2026

#### 1. Valentina → Stefania Renaming ✅
- Replaced all occurrences (323 total) of "Valentina" with "Stefania"
- Renamed files: ValentinaChat.jsx → StefaniaChat.jsx, etc.
- Updated imports and exports

#### 2. Ollama Integration ✅
- Cloudflare Tunnel connection to local Ollama instance
- Fallback to Claude when Ollama unavailable
- Model: llama3.2:3b (primary), Claude (fallback)

#### 3. HeyGen Digital Twin Creation ✅
- API endpoint: `POST /api/heygen/create-digital-twin`
- Upload training video + consent video
- Background polling for creation status
- Frontend form in YouTube × HeyGen Hub

#### 4. Admin Manual Control Panel ✅
**For Clients (Clienti Analisi):**
- Clickable status badges to toggle: `questionario_compilato`, `pagamento_analisi`, `analisi_generata`
- "Segna Pagamento Manuale" button for bonifico payments
- API: `POST /api/admin/clienti-analisi/{id}/modifica-stato`

**For Partners:**
- "Controllo Admin" panel in Profile tab
- Phase selector: F1, F2, F3, F4, F5, F6, F7, F8, F9, LIVE
- Checkboxes: Partnership Pagata, Contratto Firmato, Onboarding Completato, Masterclass Pronta
- "Segna Pagamento Partnership" button in Payments tab
- API: `POST /api/partners/{id}/segna-pagamento-partnership`

#### 5. YouTube × HeyGen Hub ✅
- HeyGen API connection status
- YouTube OAuth working
- Partner list with avatar status
- Video generation form

#### 6. Discovery Engine / Agent Hub ✅
- Discovery Leads tab with hot leads table
- Lead detail modal with analysis results
- "Avvia Analisi" button with Ollama/Claude fallback

## API Endpoints

### Partner Journey (AI-powered)
- `POST /api/partner-journey/masterclass/generate-script` - Generate masterclass script ✅ FIXED
- `POST /api/partner-journey/posizionamento/generate-structure` - Generate course structure ✅ FIXED
- `POST /api/partner-journey/funnel/generate` - Generate funnel content
- `POST /api/partner-journey/lancio/genera-calendario` - Generate launch calendar
- `POST /api/partner-journey/ottimizzazione/genera-report` - Generate optimization report

### Admin - Clienti Analisi
- `GET /api/admin/clienti-analisi` - List all clients
- `POST /api/admin/clienti-analisi/{id}/segna-pagamento-manuale` - Mark manual payment
- `POST /api/admin/clienti-analisi/{id}/modifica-stato` - Toggle client status

### Admin - Partners
- `GET /api/partners/with-social` - Partners with social plan
- `PATCH /api/partners/{id}` - Update partner (includes admin fields)
- `POST /api/partners/{id}/segna-pagamento-partnership` - Mark partnership payment

### HeyGen
- `GET /api/heygen/test-connection` - Test HeyGen API
- `POST /api/heygen/create-digital-twin` - Create avatar from video
- `GET /api/heygen/avatar-creation-status/{partner_id}` - Check creation status

### Ollama
- `GET /api/ollama/status` - Check Ollama connection

### Discovery Engine
- `GET /api/discovery/leads/hot` - Get hot leads
- `POST /api/discovery/analyze-website/{lead_id}` - Analyze lead website

## Database Collections (MongoDB Atlas)
- `users` - Clients and users
- `partners` - Partner data
- `partner_payments` - Payment records
- `discovery_leads` - Lead data
- `admin_logs` - Admin action logs
- `avatar_creation_jobs` - HeyGen job tracking
- `stefania_conversations` - Chat history
- `stefania_knowledge` - AI knowledge base
- `partner_posizionamento` - Partner positioning data
- `partner_masterclass` - Masterclass scripts and videos
- `partner_funnel` - Funnel content
- `partner_lancio` - Launch calendar and status

## Credentials (Test)
- **Admin:** claudio.bertogliatti@gmail.com / Evoluzione74
- **Operations:** antonella@evolution-pro.it / OperationsAnto2024!

## Pending/Future Tasks

### P1 - High Priority
- [ ] **Deploy to production** - Preview works, production needs deployment
- [ ] Test Digital Twin creation with real videos
- [ ] E.P.O.S. Automation (Spoiler Strategico, Calendar Unlock)
- [ ] Clarify "Funnel partner 1: dominio test" requirement (waiting for user input)

### P2 - Medium Priority
- [ ] Roadmap "Sblocco Core" Phase 2 (Funnel Deploy)
- [ ] Partner data sync (users vs partners collections)
- [ ] Refactor server.py monolith

### P3 - Low Priority
- [ ] Dedicated VPS for Ollama (permanent solution)
- [ ] Roadmap Phase 3 (Marketing Automatico)
- [ ] Refactor App.js

## Technical Debt
- `server.py` is a large monolith (13000+ lines)
- `App.js` uses complex conditional rendering instead of router
- Partner data split between `users` and `partners` collections

## Important Notes
- **LLM Integration**: Uses `emergentintegrations.llm.chat.LlmChat` with `UserMessage(text=...)` for all LLM calls
- **Production vs Preview**: Changes on preview need to be deployed to production (app.evolution-pro.it)
