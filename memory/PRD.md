# Evolution PRO — PRD (Product Requirements Document)

## Problema originale
Piattaforma gestionale per l'onboarding e la crescita dei partner in un ecosistema di accademie digitali.

## Utenti
- **Admin (Claudio)**: Gestisce partner, configura contenuti, monitora KPI
- **Antonella**: Operatrice, gestisce contatti quotidiani
- **Partner**: Professionisti che creano la propria accademia digitale
- **Cliente Analisi**: Prospect che compilano questionario e pagano analisi strategica (67 EUR)

## Architettura
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB (motor) + Celery
- Integrazioni: Systeme.io, Claude AI (Emergent LLM Key), Stripe, Telegram Bot, Cloudinary

---

## Funzionalita Implementate

### Core Platform
- [x] Login/Registrazione con JWT
- [x] Dashboard Admin con pipeline conversione, alert, KPI
- [x] Dashboard Partner con percorso guidato 6+ step
- [x] Sidebar Partner con navigazione step
- [x] Pannello Operativo laterale con tracking fasi
- [x] Systeme.io import contatti bulk e tag

### Firma Contratto Partnership
- [x] UI firma digitale con chatbot Claude (2 colonne)
- [x] Redirect obbligatorio per partner non firmati
- [x] PDF generazione contratto firmato (reportlab, 52KB A4)
- [x] PDF salvato in MongoDB (collection contract_pdfs) + backup Cloudinary
- [x] Download PDF via /api/contract/pdf-download/{partner_id}
- [x] Notifica post-firma via Systeme.io (tag contratto_firmato ID 1958860)
- [x] Notifica Telegram admin con link PDF
- [x] **Admin UI personalizzazione parametri contratto** (ContractParamsModal.jsx) - 10 Apr 2026

### Modello Done-for-You
- [x] DoneForYouWrapper con 3 stati (in_lavorazione, pronto, approvato)
- [x] SLA chiari e comunicazione autorevole (blocco 21 giorni)

### Sistema Notifiche Partner
- [x] Telegram Bot + Systeme.io Email via Tag
- [x] Trigger automatici + Anti-spam 24h
- [x] Admin UI Pannello Notifiche

### Growth System
- [x] Scelta livello (foundation/growth/scale) con API backend
- [x] GET/POST /api/partner-journey/growth-level/{partner_id}
- [x] Notifica Telegram admin alla scelta

### Pagamento Cliente Analisi
- [x] Stripe checkout 67 EUR funzionante (chiave aggiornata 10 Apr 2026)
- [x] Flusso: questionario -> /attivazione-analisi -> Stripe -> verifica

### Code Quality & Security
- [x] eval() -> safe parser
- [x] pickle -> JSON (secure_credentials.py)
- [x] Circular import risolto
- [x] Credenziali hardcoded rimosse da server.py, contract.py, proposta.py
- [x] Tutte credenziali ora solo in .env (MONGO_ATLAS_URL, REDIS_FALLBACK_URL)

### Refactoring (10 Apr 2026)
- [x] **App.js splitting: da 1907 a 1449 righe** (-24%)
  - Estratto: constants/appConstants.js (API, PHASES, PHASE_LABELS, etc.)
  - Estratto: components/shared/DashboardWidgets.jsx (Logo, PhaseProgressBar, KPICard, AgentCard)
  - Estratto: components/partner/PartnerSections.jsx (PartnerFileManager, PartnerChat, PartnerResources, PartnerCurrentPhase)

---

## Backlog Prioritizzato

### P1 - Alta Priorita
- [ ] KPI Tracking reale (GA4 + Meta Pixel per partner)
- [ ] Webhook Stripe per conferma pagamento automatica

### P2 - Media Priorita
- [ ] Integrazione API reali Canva/Kling AI
- [ ] Admin UI per gestire stati step dei partner
- [ ] Migrazione localStorage -> httpOnly cookies per token auth
- [ ] Rimuovere 238 console.log legacy

### P3 - Bassa Priorita
- [ ] Refactoring server.py (>15k righe monolite)
- [ ] Refactoring componenti massive (PartnerDetailModal 1200 righe)
- [ ] Fix JSONDecodeError backend startup log (artefatto hot-reload)
