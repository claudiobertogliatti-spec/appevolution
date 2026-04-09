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
- [x] Step 1-4 ClienteWizard (Welcome -> Quiz -> Checkout -> Onboarding)
- [x] Pipeline AI Backend (Scoring + Claude + PDF)
- [x] Post Analisi e Partnership - Funnel 11 sezioni
- [x] Ristrutturazione PDF a 11 sezioni - 09 Apr 2026
- [x] Aggiornamento prompt AI Claude - 09 Apr 2026
- [x] Upload Audio Analisi (Admin) - 09 Apr 2026
- [x] **Funnel Post-Analisi unificato su /proposta - 09 Apr 2026**
  - Routing /proposta e /firma unificati a PostAnalisiPartnership
  - Dati personali con campi: nome_azienda, email_lavoro, PEC
  - Contratto a 2 colonne: testo legale + Assistente Contrattuale (chat AI Claude)
  - Flag articoli importanti (3, 5, 7, 9, 11) con conferma obbligatoria
  - Firma digitale con invio email PDF (SMTP smtp.register.it)
  - Pagamento Stripe / Bonifico bancario con dati IBAN
  - Upload distinta pagamento, doc identita, codice fiscale
  - Testato: 14/14 backend, 100% frontend (iteration_41)

## P0 - Prossimi
- [ ] SMTP trigger email nell'endpoint /api/cliente-analisi/call-prenotata
- [ ] Admin Panel: lista utenti wizard, dati mini-quiz, stato corrente, forza cambio stato

## P1 - Alta Priorita
- [ ] Generazione PDF contratto firmato standalone (download diretto)

## P2 - Media Priorita
- [ ] Integrazione reale Google Calendar
- [ ] Integrazioni Canva/Kling (serve API key)

## P3 - Technical Debt
- [ ] Refactoring server.py monolite (>15.000 righe)
- [ ] Bug: Alert fantasma "Test AlertQuestionario"

## Credentials
- Admin: claudio.bertogliatti@gmail.com / Evoluzione74
- Operations: antonella@evolution-pro.it / OperationsAnto2024!
