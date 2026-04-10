# Evolution PRO — PRD (Product Requirements Document)

## Problema originale
Piattaforma gestionale per l'onboarding e la crescita dei partner in un ecosistema di accademie digitali.

## Utenti
- **Admin (Claudio)**: Gestisce partner, configura contenuti, monitora KPI
- **Antonella**: Operatrice, gestisce contatti quotidiani
- **Partner**: Professionisti che creano la propria accademia digitale
- **Cliente Analisi**: Prospect (questionario + pagamento 67 EUR analisi)

## Architettura
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB (motor) + Celery
- Integrazioni: Systeme.io, Claude AI, Stripe (live + webhook), Telegram Bot, Cloudinary, GA4, Meta Pixel

---

## Funzionalita Implementate

### Core Platform
- [x] Login/Registrazione con JWT
- [x] Dashboard Admin con pipeline conversione, alert, KPI
- [x] Dashboard Partner con percorso guidato step
- [x] Sidebar Partner con navigazione step
- [x] Pannello Operativo con tracking fasi
- [x] Systeme.io import contatti bulk e tag

### Firma Contratto Partnership
- [x] UI firma digitale con chatbot Claude (2 colonne)
- [x] Redirect obbligatorio per partner non firmati
- [x] PDF generazione contratto (reportlab, MongoDB + Cloudinary backup)
- [x] Download PDF via /api/contract/pdf-download/{partner_id}
- [x] Notifica post-firma Systeme.io (tag contratto_firmato) + Telegram
- [x] Admin UI personalizzazione parametri contratto (ContractParamsModal)

### Pagamento Cliente Analisi
- [x] Stripe checkout 67 EUR funzionante
- [x] **Webhook Stripe** per conferma automatica pagamento (POST /api/webhook/stripe)
- [x] Webhook gestisce: verifica pagamento, crea record cliente, notifica Telegram, sync Systeme.io
- [x] Idempotenza: non duplica se gia processato
- [x] Returns 200 sempre (evita retry Stripe)

### KPI Tracking (10 Apr 2026)
- [x] **GA4 + Meta Pixel** integrazione frontend
- [x] Caricamento dinamico script da config backend
- [x] Admin UI: TrackingConfigPanel nella sidebar SISTEMA
- [x] Eventi tracciati: PageView, Questionario (start/complete), Checkout (initiate/purchase), Contract Sign, Growth Level
- [x] Config salvata in MongoDB (app_settings collection)

### Modello Done-for-You + Notifiche
- [x] DoneForYouWrapper + SLA + blocco 21 giorni
- [x] Telegram Bot + Systeme.io Email via Tag
- [x] Admin UI Pannello Notifiche

### Growth System
- [x] Scelta livello + API backend + Notifica Telegram

### Code Quality & Refactoring
- [x] eval/pickle rimossi, credenziali da source -> .env
- [x] App.js: da 1907 a 1452 righe (-24%)

---

## Backlog

### P2 - Media Priorita
- [ ] Integrazione API reali Canva/Kling AI
- [ ] Admin UI per gestire stati step dei partner
- [ ] Migrazione localStorage -> httpOnly cookies
- [ ] Rimuovere console.log legacy

### P3 - Bassa Priorita
- [ ] Refactoring server.py (>15k righe)
- [ ] Refactoring PartnerDetailModal (1200 righe)
