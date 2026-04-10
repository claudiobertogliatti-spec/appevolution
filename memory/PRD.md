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
- Integrazioni: Systeme.io, Claude AI (Emergent LLM Key), Stripe

---

## Funzionalita Implementate

### Core Platform
- [x] Login/Registrazione con JWT
- [x] Dashboard Admin con pipeline conversione, alert, KPI
- [x] Dashboard Partner con percorso guidato 6 step
- [x] Sidebar Partner con navigazione step
- [x] Pannello Operativo laterale con tracking fasi
- [x] Firma Contratto Partnership con chatbot Claude
- [x] Systeme.io import contatti bulk e tag

### Modello Done-for-You
- [x] DoneForYouWrapper con 3 stati (in_lavorazione, pronto, approvato)
- [x] SLA chiari e comunicazione autorevole (blocco 21 giorni)

### Pagina Webinar Partner
- [x] Pagina accessibile dalla sidebar partner
- [x] Integrato con DoneForYouWrapper

### Sistema Notifiche Partner
- [x] Telegram Bot + Systeme.io Email via Tag
- [x] Trigger automatici + Anti-spam 24h
- [x] Admin UI Pannello Notifiche

### Code Quality Fix
- [x] eval() -> safe parser
- [x] pickle -> JSON (secure_credentials.py)
- [x] Circular import risolto (notifications.py)
- [x] MD5 -> SHA-256 (discovery_engine.py)
- [x] Validazione input notifiche

### Stripe Payment Fix (10 Apr 2026)
- [x] Aggiornata chiave Stripe API (sk_live_...) - la precedente era scaduta
- [x] Checkout €67 per analisi strategica funzionante
- [x] Flusso cliente: questionario -> /attivazione-analisi -> Stripe checkout -> verifica pagamento

### Growth System Backend Integration (10 Apr 2026)
- [x] GET /api/partner-journey/growth-level/{partner_id} - recupera livello scelto
- [x] POST /api/partner-journey/growth-level/choose - salva scelta livello (foundation/growth/scale)
- [x] Validazione livello e partner esistente
- [x] Salvataggio in collection MongoDB growth_levels + aggiornamento documento partner
- [x] Notifica Telegram admin alla scelta del livello
- [x] Frontend: caricamento livello esistente al mount
- [x] Frontend: salvataggio livello tramite API con stato loading

---

## Backlog Prioritizzato

### P1 - Alta Priorita
- [ ] KPI Tracking reale (GA4 + Meta Pixel per partner)
- [ ] Generazione PDF contratto firmato (reportlab)
- [ ] Configurazione SMTP per email post-firma

### P2 - Media Priorita
- [ ] Integrazione API reali Canva/Kling AI
- [ ] Admin UI per gestire stati step dei partner
- [ ] Migrazione localStorage -> httpOnly cookies per token auth
- [ ] Splitting App.js (1903 righe) in componenti piu piccoli
- [ ] Rimuovere 238 console.log legacy dal codebase

### P3 - Bassa Priorita
- [ ] Refactoring server.py (>15k righe monolite)
- [ ] Fix alert fantasma "Test AlertQuestionario"
- [ ] Fix JSONDecodeError backend startup log
- [ ] Refactoring componenti massive (PartnerDetailModal 1065 righe, AgentDashboard 1021 righe)
