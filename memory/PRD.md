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
- [x] Inserimento 3 video Mini-Corso nello Step 4 — 09 Apr 2026
- [x] Fix frontend robustness (Array.isArray, loading guard) — 09 Apr 2026
- [x] FRONTEND_URL default → app.evolution-pro.it — 09 Apr 2026
- [x] AnalisiInPreparazione: verify-payment useEffect — 09 Apr 2026
- [x] **Post Analisi e Partnership — 09 Apr 2026**
  - Funnel di conversione a 11 sezioni sequenziali
  - Sezioni: Recap → Analisi (PDF+Audio) → Transizione → Partnership → Processo → Valore → Bonus → Decisione → Contratto (accordion+chat AI) → Firma → Pagamento (Stripe+Bonifico)
  - Backend: 4 nuovi endpoint (contract-text, partnership-firma, partnership-checkout, partnership-bonifico)
  - 18 articoli contratto parsati, 5 articoli vessatori con flag conferma obbligatorio
  - Chat supporto contrattuale Claude AI integrata
  - Testato: 14/14 backend, 11/11 sezioni frontend (iteration_39)

## P0 — Prossimi
- [ ] SMTP trigger email nell'endpoint /api/cliente-analisi/call-prenotata
- [ ] Admin Panel: lista utenti wizard, dati mini-quiz, stato corrente, forza cambio stato

## P1 — Alta Priorità
- [ ] Pulsante "Ascolta sintesi audio" — integrazione reale NotebookLM
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
