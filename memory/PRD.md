# Evolution PRO - Product Requirements Document

## Problema Originale
Sviluppo di "Evolution PRO", un'applicazione di gestione aziendale basata su AI per la creazione e gestione di accademie digitali. Il sistema serve tre tipologie di utenti: Admin (Claudio), Partner (formatori/coach) e Clienti potenziali.

## Architettura
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + Pydantic + MongoDB
- **AI**: Anthropic Claude (via Emergent LLM Key)
- **Pagamenti**: Stripe
- **Background tasks**: Celery
- **PDF**: ReportLab

## Stato di avanzamento

### COMPLETATO
- [x] Sistema auth (JWT, login, ruoli admin/partner/operations)
- [x] Dashboard Admin completa (pipeline, partner, metriche, alert)
- [x] Funnel Cliente completo (4 step: questionario → analisi AI → proposta → booking)
- [x] Post Analisi Partnership (13 sezioni, contratto, chat AI, pagamento Stripe)
- [x] Fix globale routing frontend (/api/ prefix su 78+ file)
- [x] Fix backend redirect_slashes=False
- [x] Integrazione Systeme.io (import bulk, tag)
- [x] Modulo Firma Contratto (UI 2 colonne, chatbot Claude, accordion articoli)
- [x] Onboarding Partner (campi aziendali, upload documenti)
- [x] **Sidebar Partner minimale (4 item: Home, Il Mio Spazio, Supporto, Risultati)** ✅ 09/04/2026
- [x] **Home Partner come orchestratore (Hero "Sei qui", CTA, Progresso 5 step)** ✅ 09/04/2026
- [x] **StepPageWrapper per pagine step (header, stato, back-to-home)** ✅ 09/04/2026
- [x] **MioSpazioPage (Profilo + File in tabs)** ✅ 09/04/2026
- [x] **Logica avanzamento step (completato/in corso/bloccato)** ✅ 09/04/2026
- [x] **Admin vista partner con stessa logica semplificata** ✅ 09/04/2026

### IN CORSO
(nessuno)

### PROSSIMI (P0-P1)
- [ ] P0: SMTP trigger email alla prenotazione call (Step 4)
- [ ] P0: Admin Panel - lista utenti wizard con stato
- [ ] P1: Download PDF contratto firmato

### BACKLOG (P2-P3)
- [ ] P2: Integrazione reale Google Calendar
- [ ] P2: Integrazione reale Canva / Kling AI
- [ ] P3: Refactoring monolite server.py (>15k righe)
- [ ] P3: Fix alert fantasma "Test AlertQuestionario"

## File Chiave
- `/app/frontend/src/App.js` — Routing principale
- `/app/frontend/src/components/partner/PartnerSidebar.jsx` — Sidebar minimale
- `/app/frontend/src/components/partner/PartnerDashboardSimplified.jsx` — Home orchestratore
- `/app/frontend/src/components/partner/StepPageWrapper.jsx` — Wrapper step pages
- `/app/frontend/src/components/partner/MioSpazioPage.jsx` — Profilo + File
- `/app/frontend/src/components/partner/stepConfig.js` — Configurazione condivisa step
- `/app/frontend/src/components/cliente/PostAnalisiPartnership.jsx` — Funnel 13 sezioni
- `/app/backend/server.py` — Backend monolite
- `/app/backend/routers/contract.py` — Logica contrattuale

## Credenziali Test
Vedi `/app/memory/test_credentials.md`
