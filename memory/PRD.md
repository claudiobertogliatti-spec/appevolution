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
- [x] Ristrutturazione PDF a 11 sezioni
- [x] Upload Audio Analisi (Admin)
- [x] Funnel Post-Analisi unificato su /proposta
- [x] Admin Preview completo pagina Analisi e Partnership
- [x] Articoli contratto con accordion + Clausole Specifiche banner + Firma con flag
- [x] Riscrittura copy decisionale (7 modifiche: apertura, diagnosi, conseguenze, transizione, pre-contratto, pagamento)
- [x] **Sidebar Partner guidata — 09 Apr 2026**
  - Blocco "Progresso Accademia" (%, fase, completati)
  - Step con stati: completato (verde ✅), in corso (giallo pulsante), bloccato (grigio 🔒)
  - Logica sblocco sequenziale
  - Blocco "Prossima azione" sempre visibile (fondo nero, testo giallo)
  - "I nostri risultati" con KPI sintetici (badge "dopo il lancio")
  - "Vai oltre" nascosto fino al completamento del lancio
  - Linguaggio "noi" in tutta la sidebar e modal bloccato
  - Modal bloccato indica fase attuale da completare

## P0 - Prossimi
- [ ] SMTP trigger email nell'endpoint /api/cliente-analisi/call-prenotata
- [ ] Admin Panel: lista utenti wizard, dati mini-quiz, stato corrente

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
