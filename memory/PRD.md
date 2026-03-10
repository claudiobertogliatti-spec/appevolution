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
- ✅ Admin Clienti: Dropdown stati pulito (ora include anche "Analisi pronta")
- ✅ Alert automatico: Clienti che pagano ma non compilano questionario entro 24h

### Pulizia Agenti (Mar 2026) - NEW
- ✅ **Rimossi agenti ibernati che consumavano budget:**
  - ORION ($4) - Sales Intelligence → RIMOSSO
  - MARTA ($19) - CRM & Revenue → RIMOSSO  
  - LUCA ($2) - Compliance → RIMOSSO
  - ATLAS ($0) - Post-Sale & LTV → RIMOSSO
- ✅ **Agenti attivi rimanenti:**
  - VALENTINA (Onboarding & Consulenza Partner) - **RUOLO CORRETTO**
  - STEFANIA (Orchestrazione) - **RUOLO CORRETTO**
  - GAIA (Funnel & Incident)
  - ANDREA (Video Production)
  - MARCO (Accountability)
  - MAIN (Sistema Centrale)
- ✅ Rimossi ~1000 linee di codice morto dal backend
- ✅ Rimossa voce "ATLAS" dalla sidebar admin
- ✅ **FIX A:** Agenti ibernati eliminati anche dal database MongoDB
- ✅ **FIX B:** Ruoli VALENTINA e STEFANIA corretti nel database
- ✅ **FIX C:** Endpoint `/api/agents/marco/run` - Genera check-in per partner F3+
- ✅ **FIX D:** Counter `active_partners` ora mostra 25 (era 0/1)
- ✅ **FIX E:** Endpoint `/api/agents/andrea/run` - Genera piani video per partner F4+
- ✅ **Scheduler aggiornato:**
  - MARCO: ogni lunedì ore 9:00 (IT)
  - ANDREA: ogni giovedì ore 10:00 (IT)
  - STEFANIA: ogni giorno ore 7:00 (IT)

### Onboarding Partner con Upload Documenti (Mar 2026) - NEW
- ✅ **Backend (`routers/onboarding.py`):**
  - `POST /api/partner/{id}/profilo` - Salva dati anagrafici + genera contratto DOCX
  - `GET /api/partner/{id}/scarica-contratto` - Download contratto precompilato
  - `POST /api/partner/{id}/upload-contratto` - Upload contratto firmato
  - `POST /api/partner/{id}/conferma-pagamento` - Conferma bonifico/online
  - `POST /api/partner/{id}/upload-documenti` - Upload CI fronte/retro + CF
  - `POST /api/partner/{id}/upload-distinta` - Upload distinta pagamento
  - `GET /api/partner/{id}/onboarding` - Stato onboarding completo
  - `POST /api/partner/{id}/approva` - Admin approva/rifiuta step
  - `GET /api/partner/payment-info` - Info pagamento (IBAN, BIC, importo)
- ✅ **Frontend (`PartnerOnboarding.jsx`):**
  - Step 1: Form profilo completo (nome, cognome, indirizzo, CF, P.IVA, email, IBAN)
  - Step 2: Download + Upload contratto firmato
  - Step 3: Pagamento €2.790 (bonifico IBAN o carta online)
  - Step 4: Upload CI fronte + retro + Codice Fiscale
  - Step 5: Upload distinta di pagamento
  - Progress bar 5 step con stati (completato/corrente/pending)
  - Stato finale "In revisione" o "Completato"
- ✅ **Info Pagamento:**
  - IBAN: LT94 3250 0974 4929 5781
  - BIC: REVOLT21
  - Banca: Revolut Bank UAB
  - Importo: €2.790,00
  - Intestatario: Evolution PRO LLC
- ✅ **Backend:**
  - `analisi_workflow.py`: Orchestratore completo (validazione → AI → DOCX)
  - `genera_analisi.js`: Generatore DOCX con branding Evolution PRO
  - Endpoint `/api/clienti/{id}/avvia-analisi` - Avvia workflow in background
  - Endpoint `/api/clienti/{id}/workflow-status` - Polling stato
  - Endpoint `/api/clienti/{id}/scarica-docx` - Download DOCX
  - Endpoint `/api/clienti/admin/analisi-da-revisionare` - Lista per revisione admin
  - Endpoint `/api/clienti/admin/{id}/approva-analisi` - Approva analisi + EMAIL AUTOMATICA con link Google Calendar
  - Mount static files `/api/static/analisi/` per download
- ✅ **AI Enrichment:** Claude (via Emergent LLM Key) arricchisce le 7 risposte
- ✅ **DOCX Template:** Documento professionale con sezioni numerate
- ✅ **Email automatica:** Inviata al cliente quando l'analisi viene approvata, contiene:
  - Link scarica DOCX
  - Link Google Calendar per fissare la call strategica
  - Istruzioni preparazione call
- ✅ **Frontend Admin:**
  - Nuova colonna "Analisi" nella tabella clienti
  - Sezione "✨ Analisi Strategiche da Revisionare" in Approvazioni (con preview AI)
  - Pulsanti "Scarica DOCX" e "Approva"
- ✅ **Frontend Cliente (Post-Questionario):**
  - Download DOCX automatico
  - Team con STEFANIA coordinatrice aggiunta
  - Avatar PRO con info complete (€120/lezione, pacchetti 3/6/12)
  - Percorso Partnership dettagliato con:
    - Investimento €2.790 (IVA inclusa)
    - Timeline fasi F1-F10+
    - Procedura: firma contratto → distinta pagamento → documenti (CI + CF)
  - Bonus Strategici (7 micro-corsi)
- ✅ **Nuove credenziali admin:** claudio.bertogliatti@gmail.com / Evoluzione74

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
- Integrare avvio automatico workflow analisi dopo compilazione questionario (nel frontend ClienteDashboard)
- Integrare URL video di benvenuto (quando disponibile)
- Test completo funnel "Analisi Strategica" end-to-end

### P1 - High Priority
- Promuovere partner test a F10+ per verificare pagine post-lancio
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
