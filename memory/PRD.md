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

## Brand Palette
- Giallo Evolution: #FFD24D
- Nero Antracite: #1A1F24
- Sidebar Bg: #F5F3EE
- Yellow Dark: #D4A017

## API Config
- `api-config.js` → `API` ritorna URL base SENZA `/api`
- Tutti i componenti: `${API}/api/endpoint`

## Completati
- [x] Import Lista Fredda Systeme.io
- [x] Calendario Editoriale Claude AI
- [x] Modulo Firma Contratto (PDF + Email SMTP)
- [x] Upload Documenti Onboarding (Cloudinary)
- [x] System Prompt 5 Agenti AI
- [x] Funnel Builder Fase 4
- [x] Seed protetto + Fallback Atlas/Redis/SMTP
- [x] P4 - Pagina Proposta + Stripe (13/13 test)
- [x] Fix Errore 520 Pydantic
- [x] Redesign Admin Sidebar v2 — Cockpit Operativo (#FFD24D)
- [x] Fix doppio /api/api/ in produzione
- [x] **Fix Dashboard Cliente + Flusso €2.790** — 08 Apr 2026 (10/10 test)
  - BUG 1: Login cliente → mode=cliente (non più mode=partner)
  - BUG 2: ClienteDashboard v2 — 5 step progress bar + polling 30s + questionario inline
  - BUG 3: Endpoint POST /api/proposta/{token}/conferma-stripe (verifica Stripe + promozione partner)
  - BUG 4: PropostaPage chiama backend dopo redirect Stripe
  - MOD 5: analisi_generata + decisione_attivata nell'endpoint status
  - MOD 6: Callback onDecisione + onPartnerAttivato in App.js

## P0 — Prossimi
- [ ] Aggiornamento Prompt Agenti AI (Framework CMO, Copywriter)
- [ ] Sistema Ruoli completo (transizione customer → partner automatica)
- [ ] Redesign Dashboard Admin Claudio
- [ ] Modalità Impersonate Admin

## P1 — Alta Priorità
- [ ] PRICE_ID Stripe per Servizi Extra
- [ ] Deploy Cloud Run (utente deve fare git pull + build --no-cache)

## P2 — Media Priorità
- [ ] Integrazioni Canva/Kling (serve API key)

## P3 — Technical Debt
- [ ] Refactoring server.py monolite (>14.800 righe)

## Credentials
- Admin: claudio.bertogliatti@gmail.com / Evoluzione74
- Operations: antonella@evolution-pro.it / OperationsAnto2024!
