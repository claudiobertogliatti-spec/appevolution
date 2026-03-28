# Evolution PRO - PRD

## Problema Originale
Applicazione di gestione aziendale basata su AI per Evolution PRO LLC. Gestisce partner (formatori), onboarding, contratti, produzione contenuti, accountability e supporto tecnico tramite agenti AI specializzati.

## Architettura
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB (Motor async)
- AI: Claude via Emergent LLM Key
- Storage: Cloudinary
- CRM: Systeme.io
- Payments: Stripe
- Background: Celery + Redis (Upstash)

## Team AI
| ID Tecnico | Nome | Ruolo |
|---|---|---|
| STEFANIA | Stefania | Coordinatrice |
| VALENTINA | Valentina | Strategia e Onboarding |
| ANDREA | Andrea | Produzione Contenuti |
| MARCO | Marco | Accountability Settimanale |
| GAIA | Gaia | Supporto Tecnico |

## Completati
- [x] Import Lista Fredda Systeme.io
- [x] Calendario Editoriale Claude AI
- [x] Modulo Firma Contratto Partnership
- [x] Personalizzazione Parametri Contratto Admin
- [x] Upload Documenti Onboarding (Cloudinary)
- [x] System Prompt ANDREA, MARCO, VALENTINA
- [x] Allineamento Globale Ruoli Team — 27 Mar 2026
- [x] Aggiornamento MONGO_URL/DB_NAME — 27 Mar 2026
- [x] **Modulo Fase 4: Funnel Builder** — 28 Mar 2026
  - Landing Page Builder (11 sezioni, template HTML, pre-compilazione, progress bar)
  - Documenti Legali (Cookie Policy, Privacy Policy, Condizioni di Vendita)
  - Backend: `/app/backend/routers/funnel_builder.py` con 4 endpoint
  - Frontend: `/app/frontend/src/components/admin/FunnelBuilder.jsx`
  - Testato 100% (16/16 backend, UI verificata)
- [x] **Fix bug /api/api/ doppio prefisso** — 28 Mar 2026
  - `getApiUrl()` in App.js restituiva `/api` come base + `/api/partners` = `/api/api/partners`
  - Corretto: ora restituisce URL base senza `/api` suffisso
  - Fix applicato con `Promise.allSettled` per resilienza
- [x] **Disabilitazione seed produzione** — 28 Mar 2026
  - Seed `INITIAL_PARTNERS` (5 finti) e `INITIAL_ALERTS` (3 fantasma) protetti da `SEED_ENABLED` env var (default: `false`)
  - Seed agents, modules, templates, notifications, success_cases mantenuti attivi
  - 22 partner reali preservati in produzione
- [x] **Fallback MONGO_URL Atlas** — 28 Mar 2026
  - Se `MONGO_URL` contiene `customer-apps` (cluster interno Emergent), il backend usa automaticamente Atlas esterno
  - Garantisce connessione al DB corretto (`evolution_pro` su `cluster0.4cgj8wx.mongodb.net`) anche dopo deploy

## P0 - Prossimi
- [ ] Configurare Tag Systeme.io (creare tag e inserire ID nel .env)

## P1 - Alta Priorità
- [ ] Generazione PDF contratto firmato (ReportLab)
- [ ] Configurazione SMTP per email conferma + PDF
- [ ] Test E2E flusso Servizi Extra (Stripe)

## P2 - Media Priorità
- [ ] UI Frontend Calendario Editoriale
- [ ] Integrazioni Canva/Kling (serve API key)

## P3 - Technical Debt
- [ ] Refactoring server.py monolite (>14000 righe)
- [ ] Unificazione collection users/partners

## DB
- `evolution_pro` su `cluster0.4cgj8wx.mongodb.net` (utente: evolution_admin)
- bcrypt==4.0.1 (compatibilità passlib)

## Credentials
- Admin: claudio.bertogliatti@gmail.com / Evoluzione74
- Operations: antonella@evolution-pro.it / OperationsAnto2024!
