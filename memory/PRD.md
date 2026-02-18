# Evolution PRO OS - Product Requirements Document
**Version:** 27.0
**Last Updated:** 2026-02-18

## Original Problem Statement
Build "Evolution PRO OS", a proprietary web application for business workflow automation with AI agents, partner management, funnel deployment, video production, and lead monetization.

## Core Features Implemented

### Authentication & Users
- [x] Admin login (Claudio/Antonella)
- [x] Partner login system
- [x] Role-based access control

### Partner Management
- [x] Partner pipeline (F0-F10 phases)
- [x] Partner Profile Hub (connected to backend)
- [x] Document management
- [x] Domain configuration
- [x] **Onboarding Documents Upload** - F0 partners upload contracts, IDs, payment proof
- [x] **Admin Onboarding Review** - Verify/reject partner documents

### AI Agents (9 Agents)
- [x] VALENTINA - Chat support (with session persistence)
- [x] ANDREA - Video editing
- [x] STEFANIA - Copy Factory & War Mode Ads
- [x] GAIA - Funnel Deployer
- [x] ATLAS - LTV tracking
- [x] LUCA - Compliance
- [x] ORION - Lead Scoring & Intelligence (with session persistence)
- [x] Agent Hub Dashboard
- [x] **Team Evolution Page** - Agent overview for Admin & Partner

### Lead Management & Monetization
- [x] CSV Import from Systeme.io (13.246 contacts)
- [x] ORION Lead Scoring with custom tags
- [x] Temperature segmentation (HOT/WARM/COLD/FROZEN)
- [x] Tag-based automation triggers

### Sales & Payments
- [x] Stripe integration for Avatar service
- [x] Sales KPI Dashboard
- [x] Tripwire €7 tracking ready
- [x] Webhook endpoint for Systeme.io sales

### Integrations
- [x] Systeme.io (contacts, tags, webhooks)
- [x] Stripe (checkout, webhooks)
- [x] Telegram (notifications)
- [x] HeyGen (avatar generation)
- [x] Cloudinary (file storage)
- [x] Claude/OpenAI (via Emergent LLM Key)
- [x] **MongoDB Atlas** (cloud database)
- [x] **YouTube Data API** (playlist management, video uploads)

## Recent Changes (2026-02-18)

### Session 28 - VALENTINA Action Execution System VALIDATED ✅

1. **VALENTINA Task Execution Working End-to-End**
   - Implemented `_add_systeme_tag()` method with NLP parameter extraction
   - Added regex parsing to extract email and tag_name from natural language messages
   - Example: "Aggiungi il tag test_valentina al contatto info@danieleandolfi.com" → Task created and executed
   - **Verified**: Tag successfully added on Systeme.io (contact_id: 404930971, tag_id: 1876220)

2. **Action Detection Improvements**
   - Expanded keywords for better Italian phrase matching
   - Added "aggiungi il tag", "applica tag", "metti il tag" variations
   - Passing original message to execution context for parameter extraction

3. **Background Worker Confirmed Working**
   - Tasks created in `agent_tasks` collection with status tracking
   - Background worker processes pending tasks every 60 seconds
   - Tasks transition: pending → in_progress → completed/failed
   - Results stored with full Systeme.io response

4. **ORION Expanded Actions** (NEW)
   - `analyze_lead`: Analisi dettagliata lead specifico per email
   - `get_leads_to_reactivate`: Identifica COLD/FROZEN da riattivare  
   - `get_lead_trends`: Trend e statistiche nel tempo
   - `get_segment_details`: Breakdown approfondito per segmento
   - `get_conversion_potential`: Calcolo potenziale revenue con tassi conversione

### Session 27 - Complete Agent System + Integrated Services

1. **VALENTINA AI Overhaul**
   - Fixed memory persistence bug (sessions now cached)
   - Corrected LLM model name
   - Added honesty rules (no more fake "completed" actions)
   
2. **Internal/External Scope System**
   - Actions now filtered by scope (internal for admin, external for partners)
   - Partners get contextual help based on their phase (F0-F10)
   - Admin has full access to all data and operations

3. **Integrated Services** (`/app/backend/integrated_services.py`)
   - **Systeme.io Client**: Full API integration
     - Get/create contacts
     - Manage tags (add/remove)
     - Subscribe to campaigns
   - **Resend Email Service**: Transactional emails
     - Send single emails
     - Campaign emails to multiple recipients
     - Welcome email templates
   - **Background Job Executor**: 
     - Processes pending agent tasks every 60 seconds
     - Supports immediate execution with `execute_now=True`
     - Task status tracking (pending/in_progress/completed/failed)

4. **New API Endpoints**
   - `POST /api/email/send` - Send single email
   - `POST /api/email/campaign` - Send campaign to multiple recipients  
   - `POST /api/email/welcome/{partner_id}` - Send welcome email
   - `POST /api/systeme/tag/add` - Add tag to contact
   - `GET /api/systeme/contacts` - List contacts
   - `GET /api/systeme/tags` - List all tags
   - `POST /api/systeme/sync-contacts` - Sync contacts to local DB
   - `POST /api/jobs/task` - Create agent task
   - `POST /api/jobs/process` - Process pending tasks manually
   - `GET /api/jobs/status` - Get background worker status

5. **8 Agents Integrated** with scope filtering

3. **Agent Task System (NEW)**
   - Sistema per tracciare task assegnati agli agenti
   - **Endpoints**:
     - `POST /api/agent-tasks` - Crea task
     - `GET /api/agent-tasks` - Lista task
     - `PATCH /api/agent-tasks/{id}/status` - Aggiorna stato
     - `GET /api/agent-tasks/summary/dashboard` - Dashboard task

4. **Bonus Strategici Section** (`/components/partner/BonusStrategici.jsx`)
   - 7 strategic bonus guides for partners
   - Chapter-based reading experience
   - Progress tracking with session persistence
   - Completion badges per bonus
   - Responsive design matching Evolution PRO theme

2. **Contract PDF Generation** (`/api/partners/{id}/contract-pdf`)
   - Dynamic PDF generation using reportlab
   - Partner-specific data: name, email, date, phase
   - Professional formatting with Evolution PRO branding
   - 15 contract articles summary
   - Signature section
   - Download filename: `Contratto_EvolutionPRO_{Name}_{Date}.pdf`

3. **Welcome Email Integration**
   - Enhanced `send_partner_welcome_email()` function
   - Adds `welcome_partner` tag to Systeme.io for automation trigger
   - Telegram notification to admin on new partner registration
   - Email content logged to database for tracking
   - New endpoint: `POST /api/onboarding/send-welcome-email/{partner_id}`

4. **PartnerFilesPage.jsx Updates**
   - Connected "Scarica il tuo contratto (PDF)" button to real endpoint
   - Added data-testid for testing: `download-contract-pdf-btn`

## Database Collections
- `users` - Authentication
- `partners` - Partner data
- `agents` - AI agent configurations
- `systeme_contacts` - 13,246 contacts from Systeme.io
- `payments` - Sales records
- `orion_analysis` - Lead scoring results
- `webhook_logs` - Webhook activity
- `onboarding_documents` - Partner onboarding files
- `email_logs` - Email tracking

## API Endpoints (Key)
- `POST /api/systeme/import-csv` - Import contacts from CSV
- `GET /api/sales/kpi` - Sales KPI data
- `POST /api/webhooks/systeme` - Systeme.io webhook receiver
- `POST /api/orion/analyze-list` - Run ORION analysis
- `GET /api/orion/segments` - Get lead segments
- `GET /api/partners/{id}/contract-pdf` - Generate partner contract PDF
- `POST /api/onboarding/send-welcome-email/{id}` - Send welcome email + Systeme.io tag
- `GET /api/partners/{id}/onboarding-documents` - List onboarding docs
- `POST /api/partners/{id}/onboarding-documents/upload` - Upload onboarding doc

## Technical Debt
- **CRITICAL:** `server.py` is 10,000+ lines - needs refactoring into APIRouter modules
- `App.js` has complex conditional rendering - needs proper routing
- YouTube token expired (needs re-authentication)

## Backlog (Prioritized)

### P0 (Immediate)
- ✅ Production data fix verified
- ✅ Bonus Strategici implementation
- ✅ Contract PDF download
- ✅ Welcome email with Systeme.io tag
- ✅ **VALENTINA action execution system validated** (tags added to real Systeme.io contacts)

### P1 (High Priority)
- [ ] Connect ORION insights to 9 AI agents
- [ ] Implement locked section video modal
- [ ] Re-authenticate YouTube API token
- [ ] Create Systeme.io welcome automation

### P2 (Medium Priority)
- [ ] Backend refactoring (split server.py - now 10,000+ lines!)
  - ✅ Created `/app/backend/ARCHITECTURE.md` with migration plan
  - ✅ Created `/app/backend/routers/` folder structure
  - ✅ Prepared `auth.py`, `orion.py` router templates
  - [ ] Gradual endpoint migration (Phase 2)
- [ ] Advanced post-launch metrics dashboard
- [ ] Implement historical tracking for ORION trends

### P3 (Future)
- [ ] Frontend refactoring
- [ ] Academy videos system
- [ ] Multi-tenant support

## Credentials (Test)
- Admin: `claudio@evolutionpro.it` / `Evolution2026!`
- Partner F0: `testf0@evolutionpro.it` / `Test2026!`
- Partner F0 ID: `d248c632-869d-4a13-b94a-dbf2425fa143`
- API Keys: stored in `/app/backend/.env`

## Test Reports
- Latest: `/app/test_reports/iteration_7.json` - 100% pass rate
- Tests: `/app/backend/tests/test_bonus_contract_email.py`
