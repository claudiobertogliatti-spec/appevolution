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
- [x] Fix Dashboard Cliente + Flusso €2.790 — 08 Apr 2026
- [x] Correzione architetturale: Admin Preview Cliente — 08 Apr 2026
- [x] Questionario strutturato per pipeline AI — 08 Apr 2026
- [x] Motore generazione output dal questionario — 08 Apr 2026
- [x] Step 3 Checkout Analisi Strategica (€67) — 08 Apr 2026
- [x] Step 4 Conferma & Onboarding (Mini-Corso + Booking) — 08 Apr 2026
- [x] Correzioni UI ClienteWizard — 09 Apr 2026
  - Testo ingrandito su tutti gli step (heading text-3xl/4xl, body text-base)
  - Step 3: "Analisi Strategica" (no AI-Driven), bullet points contenuti, no Script Call/Verifica
  - Step 3: Rimossa frase "scalato dal costo della partnership"
  - Step 4: Testo booking aggiornato (60 min, Claudio CEO, Servizio Partnership)
  - Step 4: Orari aggiornati a 10-11-12-15-16-17-18

## P0 — Prossimi
- [ ] SMTP trigger email nell'endpoint /api/cliente-analisi/call-prenotata
- [ ] Implementazione fase "Post Analisi" (Analisi e Partnership)
- [ ] Admin Panel: lista utenti wizard, dati mini-quiz, stato corrente, forza cambio stato

## P1 — Alta Priorità
- [ ] Pulsante "Ascolta sintesi audio" (stub NotebookLM)
- [ ] Generazione PDF contratto firmato (reportlab)
- [ ] PRICE_ID Stripe per Servizi Extra

## P2 — Media Priorità
- [ ] Integrazione reale Google Calendar
- [ ] Integrazioni Canva/Kling (serve API key)

## P3 — Technical Debt
- [ ] Refactoring server.py monolite (>15.000 righe)
- [ ] Bug: Alert fantasma "Test AlertQuestionario"

## Credentials
- Admin: claudio.bertogliatti@gmail.com / Evoluzione74
- Operations: antonella@evolution-pro.it / OperationsAnto2024!
