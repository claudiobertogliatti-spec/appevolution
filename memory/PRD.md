# Evolution PRO OS - Product Requirements Document
**Version:** 25.0
**Last Updated:** 2026-02-17

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

## Recent Changes (2026-02-17)

### Session 25 - CORS Fix, Team Evolution Page, Session Persistence
1. **CORS Configuration Fixed**
   - Moved CORS middleware before router inclusion
   - Added production domains to whitelist
   - Created `api-config.js` utility for dynamic API URL resolution
   - Frontend uses relative URLs `/api` on production domains

2. **Team Evolution Page** (`/components/shared/TeamEvolution.jsx`)
   - New page showcasing all 8 AI agents + human supervisors
   - White background with Evolution PRO color scheme
   - Flow diagram explaining how the team works
   - Added to both Admin and Partner sidebars

3. **Session Persistence**
   - VALENTINA Chat: Messages saved in sessionStorage per user
   - ORION: Analysis data persisted during browser session
   - Data survives navigation between pages

4. **Updated 30+ Components**
   - Migrated to centralized API configuration
   - Production-ready URL handling

## Recent Changes (2026-02-16)
1. **CSV Import Endpoint** (`/api/systeme/import-csv`)
   - Multi-encoding support (UTF-8, Latin-1)
   - Flexible column mapping
   - Upsert by email
   - Successfully imported 3,232 new contacts

2. **ORION Tag Scoring Updated**
   - Added Evolution PRO specific tags
   - `temp_recovery`: 15 points
   - `pagamento fee`: 100 points
   - `fase_*` tags: 30-90 points
   - `settimana 2-5`: 35-50 points

3. **Sales KPI Dashboard**
   - New component: `SalesKPIDashboard.jsx`
   - Endpoints: `/api/sales/kpi`, `/api/sales/recent`, `/api/sales/record`
   - Real-time tracking of Tripwire €7 sales
   - Period stats (today, week, month)
   - Product breakdown
   - Webhook configuration instructions

## Database Collections
- `users` - Authentication
- `partners` - Partner data
- `agents` - AI agent configurations
- `systeme_contacts` - 13,246 contacts from Systeme.io
- `payments` - Sales records
- `orion_analysis` - Lead scoring results
- `webhook_logs` - Webhook activity

## API Endpoints (Key)
- `POST /api/systeme/import-csv` - Import contacts from CSV
- `GET /api/sales/kpi` - Sales KPI data
- `POST /api/webhooks/systeme` - Systeme.io webhook receiver
- `POST /api/orion/analyze-list` - Run ORION analysis
- `GET /api/orion/segments` - Get lead segments

## Technical Debt
- **CRITICAL:** `server.py` is 8,000+ lines - needs refactoring into APIRouter modules
- `App.js` has complex conditional rendering - needs proper routing

## Backlog (Prioritized)
### P0 (Immediate)
- None currently blocking

### P1 (High Priority)
- Connect Systeme.io webhook for Tripwire sales
- Implement ORION agent actions (auto-tagging)
- Create real email sequences in Systeme.io

### P2 (Medium Priority)
- Backend refactoring (split server.py)
- Advanced post-launch metrics dashboard

### P3 (Future)
- Frontend refactoring
- Academy videos system
- Multi-tenant support

## Credentials (Test)
- Admin: `claudio@evolutionpro.it` / `Evolution2026!`
- API Keys: stored in `/app/backend/.env`
