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
│   ├── heygen_service.py
│   ├── ollama_service.py
│   ├── stefania_ai.py # AI assistant (renamed from Valentina)
│   └── stefania_memory.py
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/  # Admin dashboard components
        │   ├── partner/ # Partner views
        │   └── chat/   # Stefania chat
        └── App.js
```

## What's Been Implemented

### Session: March 2026

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

## Credentials (Test)
- **Admin:** claudio.bertogliatti@gmail.com / Evoluzione74
- **Operations:** antonella@evolution-pro.it / OperationsAnto2024!

## Pending/Future Tasks

### P1 - High Priority
- [ ] Deploy to production
- [ ] Test Digital Twin creation with real videos
- [ ] E.P.O.S. Automation (Spoiler Strategico, Calendar Unlock)

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
