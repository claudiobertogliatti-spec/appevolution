# Evolution PRO OS - Product Requirements Document

## Original Problem Statement
Building "Evolution PRO OS," a proprietary web application for business workflow automation featuring:
- A functional AI orchestrator (VALENTINA) capable of executing real tasks
- Integration with OpenClaw for GUI automation on local machines
- Partner-facing dashboard with structured sidebar guiding users through multi-phase program (F0-F9)
- Admin dashboard with demo mode to view partner features unlocked

## User's Preferred Language
Italian

## Core Architecture
- **Frontend**: React with Shadcn/UI components
- **Backend**: FastAPI (server.py monolith - needs refactoring)
- **Database**: MongoDB Atlas
- **AI**: Claude via Emergent LLM Key (for VALENTINA)

## What's Been Implemented

### Completed (Dec 2025)
- ✅ Partner Sidebar restructured with Dashboard, Percorso (F0-F9), Profilo, Servizi Extra
- ✅ Admin "Demo Mode" - all phases unlocked when viewing partner dashboard
- ✅ VALENTINA AI agent with delegation capability to OpenClaw
- ✅ OpenClaw local setup with NVIDIA Kimi K2.5 (free tier)
- ✅ ScriptBuilder component for FASE 3
- ✅ ContrattoPartnership component for contract viewing
- ✅ DatiPersonali component for personal/business data
- ✅ LegalPagesGenerator with disclaimer integrated in Dominio page (FASE 7)
- ✅ Telegram bot integration for OpenClaw communication

### Refactoring Done (Feb 2026)
- ✅ Separated `profilo-contratto` → ContrattoPartnership (not LegalPagesGenerator)
- ✅ Added `profilo-dati` → DatiPersonali for personal data management
- ✅ Added LegalPagesGenerator button in DomainConfiguration (FASE 7)
- ✅ Updated PartnerSidebar with new "Dati Personali" item
- ✅ Fixed dark text on dark background in FASE 5 (ProduzioneVideo) and FASE 8 (CalendarioEditoriale)
- ✅ Removed "Le tue Risorse" section from Partner Dashboard
- ✅ Refactored PartnerFilesPage to show only partner files (script, posizionamento, video, audio, PDF, distinte)
- ✅ Extended ContrattoPartnership from 8 to 15 articles (complete contract)
- ✅ Reordered Profilo sidebar: Dati Personali → Contratto → Brand Kit → I Miei File
- ✅ Renamed "Bonus Strategici" to "Risorse Gratis" and moved to Servizi Extra
- ✅ Replaced YouTube video upload with generic video upload in I Miei File

### Analisi Strategica App (Feb-Mar 2026)
- ✅ Created public landing page at `/analisi-strategica`
- ✅ Registration flow with form validation
- ✅ 8-question questionnaire for project evaluation
- ✅ Stripe checkout integration for €67 payment (LIVE key configured)
- ✅ Client dashboard with 7 bonus materials
- ✅ Backend API: `/api/clienti/*` routes (async with Motor)
- ✅ Admin routes for managing clients and status updates
- ✅ **Mar 2026**: Fixed funnel flow - questionnaire only after payment
- ✅ **Mar 2026**: CTA button updated to "Acquista e Registrati — €67"
- ✅ **Mar 2026**: Separated registration and payment steps for robustness
- ✅ **Mar 2026**: AI-powered analysis document generator (Claude via Emergent Key)
- ✅ **Mar 2026**: Analysis modal with markdown rendering and download

## Known Issues
### P0 - Critical
- **OpenClaw execution fails**: "Agent was aborted" error on local machine
  - Gateway connects to Telegram but task execution fails
  - Likely context size or model timeout issue

### P1 - High
- **YouTube API Token Expired**: `invalid_grant: Token has been expired or revoked`
  - Blocks video upload functionality
  - Needs re-authentication in Google Cloud Console

### P2 - Medium
- Unreadable text on dark blue backgrounds (some pages)
- Backend refactoring needed (server.py monolith)

## Backlog / Future Tasks

### P1 - High Priority
- Create page/view for FASE 2 - OUTLINE
- Create page/view for FASE 9 - LANCIO (final verification)

### P2 - Medium Priority
- Backend refactoring: Break server.py into /routers structure
- Implement Landing Page & Funnel Builder (drag-and-drop)
- Implement Historical Data Tracking

## 3rd Party Integrations
| Service | Status | Purpose |
|---------|--------|---------|
| MongoDB Atlas | ✅ Working | Primary database |
| Systeme.io API | ✅ Working | Contact/tag management |
| Anthropic Claude | ✅ Working | VALENTINA AI (Emergent Key) |
| Telegram Bot | ✅ Working | OpenClaw bridge |
| OpenClaw + NVIDIA Kimi | ⚠️ Partial | GUI automation |
| YouTube Data API v3 | ❌ Broken | Video uploads |
| Stripe | ✅ Working | Payments |
| Cloudinary | ✅ Working | Media storage |

## Credentials (Test)
- Admin: claudio@evolutionpro.it / Evolution2026!
- OpenClaw Bot Token: 8424701823:AAGtRwk4ZUthZxYAer4vfnLmTxzs3c3jkIs

## File Structure
```
/app
├── backend/
│   ├── server.py               # Monolith (needs refactoring)
│   ├── valentina_ai.py         # AI orchestrator
│   ├── openclaw_integration.py # Telegram bridge
│   └── routers/                # Future refactoring target
└── frontend/
    └── src/
        ├── App.js              # Main router
        ├── components/
        │   └── partner/
        │       ├── PartnerSidebar.jsx
        │       ├── ContrattoPartnership.jsx
        │       ├── DatiPersonali.jsx
        │       ├── DomainConfiguration.jsx
        │       ├── LegalPagesGenerator.jsx
        │       └── ...
        └── ...
```
