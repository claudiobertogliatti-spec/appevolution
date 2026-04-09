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

## Completati
- [x] Step 1-4 ClienteWizard (Welcome → Quiz → Checkout → Onboarding)
- [x] Pipeline AI Backend (Scoring + Claude + PDF)
- [x] Post Analisi e Partnership — Funnel 11 sezioni
- [x] **Ristrutturazione PDF a 11 sezioni — 09 Apr 2026**
  - Titolo/Copertina → Sintesi → Diagnosi → Punti di forza → Criticità → Livello → Conseguenze → Direzione → Intro soluzione → Esito → Prossimo passo + Appendice Scoring
  - Layout professionale con reportlab: tabelle, badge colorati, HR separatori
- [x] **Aggiornamento prompt AI Claude — 09 Apr 2026**
  - Nuovo prompt genera JSON a 11 sezioni specifiche
  - Output strutturato: sintesi_progetto, diagnosi, punti_di_forza[], criticita[], livello_progetto, conseguenze, direzione, esito
- [x] **Upload Audio Analisi (Admin) — 09 Apr 2026**
  - Endpoint POST /api/admin/cliente/{user_id}/upload-audio-analisi
  - Endpoint GET /api/cliente-analisi/audio/{user_id}
  - AudioAnalisiModal nel ProspectPipeline con bottone cuffie viola
  - Player HTML5 reale nel Post Analisi (o "in preparazione" se non caricato)
  - Testato: 15/15 backend, frontend 100% (iteration_40)

## P0 — Prossimi
- [ ] SMTP trigger email nell'endpoint /api/cliente-analisi/call-prenotata
- [ ] Admin Panel: lista utenti wizard, dati mini-quiz, stato corrente, forza cambio stato

## P1 — Alta Priorità
- [ ] Generazione PDF contratto firmato (reportlab)

## P2 — Media Priorità
- [ ] Integrazione reale Google Calendar
- [ ] Integrazioni Canva/Kling (serve API key)

## P3 — Technical Debt
- [ ] Refactoring server.py monolite (>15.000 righe)
- [ ] Bug: Alert fantasma "Test AlertQuestionario"

## Credentials
- Admin: claudio.bertogliatti@gmail.com / Evoluzione74
- Operations: antonella@evolution-pro.it / OperationsAnto2024!
