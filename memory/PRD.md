# Evolution PRO — PRD (Product Requirements Document)

## Problema originale
Piattaforma gestionale per l'onboarding e la crescita dei partner in un ecosistema di accademie digitali. Il partner viene guidato step-by-step dalla definizione del posizionamento al lancio del corso online.

## Utenti
- **Admin (Claudio)**: Gestisce i partner, configura i contenuti, monitora KPI
- **Antonella**: Operatrice, gestisce contatti quotidiani con i partner
- **Partner**: Professionisti che creano la propria accademia digitale
- **Cliente Analisi**: Prospect che compilano questionario e pagano per l'analisi strategica

## Architettura
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB (motor) + Celery
- Integrazioni: Systeme.io, Claude AI (Emergent LLM Key), Stripe, Telegram Bot, Cloudinary

---

## Funzionalita Implementate

### Core Platform
- [x] Login/Registrazione con JWT
- [x] Dashboard Admin con pipeline conversione, alert, KPI
- [x] Dashboard Partner con percorso guidato 6 step
- [x] Sidebar Partner con navigazione step
- [x] Pannello Operativo laterale con tracking fasi
- [x] Systeme.io import contatti bulk e tag

### Firma Contratto Partnership
- [x] UI firma digitale con chatbot Claude
- [x] Redirect obbligatorio per partner non firmati
- [x] **PDF generazione contratto firmato** (reportlab, 52KB, layout A4 professionale)
- [x] PDF salvato in MongoDB (collection `contract_pdfs`) + backup Cloudinary
- [x] Download PDF via `/api/contract/pdf-download/{partner_id}`
- [x] **Notifica post-firma via Systeme.io** (tag `contratto_firmato` ID 1958860)
- [x] Notifica Telegram admin con link PDF
- [x] SMTP rimosso, sostituito con Systeme.io + Telegram

### Modello Done-for-You
- [x] DoneForYouWrapper con 3 stati (in_lavorazione, pronto, approvato)
- [x] SLA chiari e comunicazione autorevole (blocco 21 giorni)

### Sistema Notifiche Partner
- [x] Telegram Bot + Systeme.io Email via Tag
- [x] Trigger automatici + Anti-spam 24h
- [x] Admin UI Pannello Notifiche

### Growth System
- [x] Scelta livello (foundation/growth/scale) con API backend
- [x] GET/POST `/api/partner-journey/growth-level/{partner_id}`
- [x] Notifica Telegram admin alla scelta

### Pagamento Cliente Analisi
- [x] Stripe checkout 67 euro funzionante (chiave aggiornata 10 Apr 2026)
- [x] Flusso: questionario -> /attivazione-analisi -> Stripe -> verifica

### Code Quality & Security
- [x] eval() -> safe parser
- [x] pickle -> JSON (secure_credentials.py)
- [x] Circular import risolto
- [x] **Credenziali hardcoded rimosse da server.py** (ATLAS, Redis, SMTP)
- [x] Tutte le credenziali ora solo in `.env` (MONGO_ATLAS_URL, REDIS_FALLBACK_URL)

---

## Backlog Prioritizzato

### P1 - Alta Priorita
- [ ] Personalizzazione parametri contratto Admin (PATCH/GET contract-params)
- [ ] KPI Tracking reale (GA4 + Meta Pixel per partner)

### P2 - Media Priorita
- [ ] Integrazione API reali Canva/Kling AI
- [ ] Admin UI per gestire stati step dei partner
- [ ] Splitting App.js (1903 righe) in componenti piu piccoli
- [ ] Rimuovere 238 console.log legacy dal codebase

### P3 - Bassa Priorita
- [ ] Refactoring server.py (>15k righe monolite)
- [ ] Fix alert fantasma "Test AlertQuestionario"
- [ ] Fix JSONDecodeError backend startup log
- [ ] Refactoring componenti massive (PartnerDetailModal, AgentDashboard)
- [ ] Migrazione localStorage -> httpOnly cookies per token auth
