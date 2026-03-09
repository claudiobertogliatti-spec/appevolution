# Evolution PRO OS - Product Requirements Document

## Original Problem Statement
Building "Evolution PRO OS," a proprietary web application for business workflow automation featuring:
- A functional AI orchestrator (VALENTINA) capable of executing real tasks
- Integration with OpenClaw for GUI automation on local machines
- Partner-facing dashboard with structured sidebar guiding users through multi-phase program (F0-F13)
- Admin dashboard with demo mode to view partner features unlocked
- Multi-agent AI system with 6 core agents
- Piano Continuità system for post-launch partner management
- **Systeme.io è l'unica fonte di verità per la gestione dei lead** (App gestisce solo clienti e partner)
- **Funnel Analisi Strategica €67** per acquisizione nuovi clienti

## User's Preferred Language
Italian

## Core Architecture
- **Frontend**: React with Shadcn/UI components
- **Backend**: FastAPI (server.py monolith - needs refactoring)
- **Database**: MongoDB Atlas
- **AI**: Claude via Emergent LLM Key (for VALENTINA and all agents)

## What's Been Implemented

### UI/UX Miglioramenti Funnel Cliente (Mar 2026) - NEW
- ✅ Landing Page: Nuovo titolo "La tua competenza merita un sistema che lavora anche quando tu non ci sei"
- ✅ Landing Page: Sottotitolo con team AI (VALENTINA, ANDREA, MARCO, GAIA, STEFANIA) + Claudio e Antonella
- ✅ Landing Page: Sezione "Come Funziona" con 3 step (Analisi Strategica, Studio di Fattibilità, Partnership)
- ✅ Questionario: Domanda 7 ("Perché proprio adesso?") evidenziata con bordo giallo #F5C518 e label "★ La più importante"
- ✅ Post-Questionario: 3 card risorse preparatorie (Guida Accademia, 3 Errori Formatori, Percorso Completo)
- ✅ Admin Clienti: Dropdown stati pulito (solo: Pagato, Questionario ✓, Call fissata, Proposta inviata, Partner ✓, Non convertito)
- ✅ Alert automatico: Clienti che pagano ma non compilano questionario entro 24h

### Lead Management Cleanup (Mar 2026)
- ✅ Rimosso `OrionLeadScoring.jsx` - Lead gestiti esclusivamente in Systeme.io
- ✅ Rimossa tab "Lead Scoring" da `WebhookDashboard.jsx`
- ✅ Rimosso componente `LeadCard` da WebhookDashboard
- ✅ Aggiornate "Automazioni Attive" (Lead Scoring → Sync Systeme.io)
- ✅ Rimosso import e routing di OrionLeadScoring da App.js

### Homepage Unificata (Mar 2026) - NEW
- ✅ Homepage unica per tutti gli utenti (nuovi e registrati)
- ✅ Login tramite modal (pulsante "Accedi" nell'header)
- ✅ Sezioni: Hero, Footer (rimossi "Come Funziona", Stats, CTA)
- ✅ CTA "Richiedi l'Analisi Strategica" per nuovi utenti
- ✅ Pulsante "Sei già Partner? Accedi" per utenti esistenti
- ✅ Testo aggiornato: "Dall'idea al tuo primo studente in 60 giorni"

### Questionario Pre-Call (Mar 2026) - NEW
- ✅ Backend: Nuovo modello cliente con `questionario`, `call`, `conversione`
- ✅ Endpoint questionario: POST/GET `/api/clienti/{id}/questionario`
- ✅ Endpoint call/conversione: fissa-call, converti-partner, segna-non-adatto
- ✅ Area Cliente: Progress bar 3 step, form 7 domande, sidebar team
- ✅ Admin: Nuove metriche (Questionario ✓, Call fissata, Convertiti)
- ✅ Admin: Modal risposte con note Claudio + azioni rapide
- ✅ Alert: Clienti che non compilano dopo 24h

### Dashboard Cliente (Mar 2026)
- ✅ Nuova ClienteDashboard.jsx con 5 sezioni:
  1. **Video Benvenuto** - Placeholder "Video in arrivo" (2-3 min da Claudio)
  2. **7 Bonus Formativi** - Gli stessi bonus della landing
  3. **Roadmap Partnership** - 10 fasi (F0-F9) + servizi post-lancio
  4. **Corso con Avatar** - Spiegazione servizio Delega AI Avatar
  5. **Studio di Fattibilità** - Processo (call 60min → 24h → documento)
- ✅ Banner "Videocall entro 24h" 
- ✅ Integrato in AnalisiStrategicaApp.jsx post-questionario

### Piano Continuità System (Mar 2026)
- ✅ Backend endpoint `GET/PUT /api/partners/{id}/piano-continuita`
- ✅ 4 piani disponibili: Starter (€29+15%), Builder (€49+10%), Pro (€79+7%), Elite (€99+5%)
- ✅ Auto-calcolo data rinnovo (+12 mesi)
- ✅ Sezione "Piano Continuità" nel modal scheda partner admin
- ✅ Banner "Partner senza Piano Continuità" per F8/F9

### Post-Lancio Phases (Mar 2026) - NEW
- ✅ F10 - La mia Accademia
- ✅ F11 - I miei Studenti
- ✅ F12 - Impegni Settimana
- ✅ F13 - Report Mensile
- ✅ Sidebar condizionale: sezione "Post-Lancio" visibile solo per F10+
- ✅ 4 nuove pagine frontend (`PostLancioPages.jsx`)
- ✅ Banner "Attiva Piano Continuità" per partner F8/F9 senza piano

### Multi-Agent AI System (Mar 2026)
- ✅ **VALENTINA** - Onboarding & Consulenza (108+ conversations)
- ✅ **ANDREA** - Avanzamento Corso & Video
- ✅ **MARCO** - Accountability settimanale, check-in system
- ✅ **GAIA** - Supporto Tech, funnel health monitoring
- ✅ **STEFANIA** - Orchestrazione, routing e daily monitoring
- ✅ **MAIN** - Sistema Centrale, coordinamento

### Agent Hub Dashboard (Mar 2026)
- ✅ Agent Hub UI at `/admin/agenti` with all 6 agents displayed
- ✅ Business Summary with Partner Attivi, MRR, LTV
- ✅ ORION rimosso dalla sidebar admin
- ✅ Team Evolution aggiornato con 6 agenti

### UI Fixes (Mar 2026)
- ✅ Sezione Approvazioni: colori corretti per tema chiaro
- ✅ Team Evolution: aggiornato a 6 agenti con ruoli corretti

## Known Issues
### P0 - Critical
- **OpenClaw execution fails**: "Agent was aborted" error on local machine

### P1 - High
- **YouTube API Token Expired**: `invalid_grant: Token has been expired or revoked`
- **Systeme.io MCP 404 errors**: Some API endpoints return 404 (need to verify correct paths)

### P2 - Medium
- Backend refactoring needed (server.py monolith 11k+ lines)

## Backlog / Future Tasks

### P0 - Immediate
- Test funnel "Analisi Strategica" (€67) end-to-end - Simulare registrazione, pagamento, questionario
- Promuovere partner test a F10+ per verificare pagine post-lancio
- Integrare URL video di benvenuto (quando disponibile)

### P1 - High Priority
- Implementare endpoint per studenti accademia
- Implementare endpoint per impegni settimanali (MARCO)
- Implementare endpoint per report mensile
- Aggiungere colonna "Piano Continuità" nella Pipeline Partner
- Fix OpenClaw "Agent was aborted" error (richiede log dal client locale)

### P2 - Medium Priority
- Backend refactoring: Break server.py into /routers structure
- Create page/view for FASE 2 - OUTLINE
- Create page/view for FASE 9 - LANCIO
- Fix Systeme.io MCP API 404 errors
- Rinnovare YouTube API Token

## 3rd Party Integrations
| Service | Status | Purpose |
|---------|--------|---------|
| MongoDB Atlas | ✅ Working | Primary database |
| Anthropic Claude | ✅ Working | All AI agents (Emergent Key) |
| Telegram Bot | ✅ Working | OpenClaw bridge, VALENTINA messages |
| OpenClaw + NVIDIA Kimi | ⚠️ Partial | GUI automation (local machine issue) |
| YouTube Data API v3 | ❌ Broken | Video uploads (expired token) |
| Stripe | ✅ Working | Payments |
| APScheduler | ✅ Working | Backend cron jobs |
| ReportLab | ✅ Working | PDF generation |

## File Structure
```
/app
├── backend/
│   ├── server.py               # Monolith (added piano_continuita endpoints)
│   ├── agent_hub_service.py    # Updated with 6 core agents + MARCO
│   └── routers/
│       ├── clienti.py
│       └── agents_router.py
└── frontend/
    └── src/
        ├── App.js              # Added PostLancio routes
        ├── components/
        │   ├── admin/
        │   │   ├── AdminSidebarLight.jsx  # ORION removed
        │   │   ├── ApprovalDashboard.jsx  # Light theme fix
        │   │   └── PartnerProfileModal.jsx # Piano Continuità section
        │   ├── partner/
        │   │   ├── PartnerSidebar.jsx     # Post-Lancio group (F10+)
        │   │   └── PostLancioPages.jsx    # NEW: 4 post-lancio pages
        │   └── shared/
        │       └── TeamEvolution.jsx      # Updated to 6 agents
        └── ...
```
