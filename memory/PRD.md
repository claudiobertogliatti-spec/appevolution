# Evolution PRO — PRD (Product Requirements Document)

## Problema originale
Piattaforma gestionale per l'onboarding e la crescita dei partner in un ecosistema di accademie digitali. Il partner viene guidato step-by-step dalla definizione del posizionamento al lancio del corso online.

## Utenti
- **Admin (Claudio)**: Gestisce i partner, configura i contenuti, monitora KPI
- **Antonella**: Operatrice, gestisce contatti quotidiani con i partner
- **Partner**: Professionisti che creano la propria accademia digitale

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

### Modello Done-for-You (NUOVO - 10 Apr 2026)
- [x] **DoneForYouWrapper** — Componente riutilizzabile con 3 stati:
  - Stato 1: In preparazione (in_lavorazione / in_revisione)
  - Stato 2: Pronto (contenuto + Approva)
  - Stato 3: Approvato (step completato)
- [x] Backend API: GET/POST step-status, approve, bulk-update
- [x] Tutte le pagine partner aggiornate al modello Done-for-You:
  - FunnelLightPage, FunnelPage, MasterclassPage, VideocorsoPage
  - LancioPage, CalendarioLancioPage, EmailAutomation, CourseBuilderWizard
- [x] Rimossi tutti i bottoni "Genera" e "Rigenera" dal partner
- [x] Messaggi chiari: "Non devi costruire nulla. Il sistema e il team costruiscono tutto per te."
- [x] stepConfig.js aggiornato con descrizioni done-for-you

### Pagina Webinar Partner (NUOVO - 10 Apr 2026)
- [x] Pagina accessibile dalla sidebar partner
- [x] Struttura 6 blocchi: Hook, Problema, Errori, Metodo, Offerta, CTA
- [x] Sezione Azioni: Registra Video / Avatar AI
- [x] Pianificazione: Data + Ora
- [x] Links: Landing Webinar + Pagina Iscrizione
- [x] Backend API: GET/POST webinar data
- [x] Integrato con DoneForYouWrapper

### Dashboard e Strumenti
- [x] Dashboard Operativa (Vista Antonella)
- [x] Percorso Veloce "Go Live in 21gg"
- [x] Ottimizzazione Page (KPI decisionale)
- [x] Growth System Page (conversione)
- [x] Distribuzione Funnel (Admin, share_link Systeme.io)

---

## Backlog Prioritizzato

### P0 - Critico
(Nessuno al momento)

### P1 - Alta Priorita
- [ ] KPI Tracking reale (GA4 + Meta Pixel per partner)
- [ ] Generazione PDF contratto firmato (reportlab)
- [ ] Configurazione SMTP per email post-firma

### P2 - Media Priorita
- [ ] Integrazione API reali Canva/Kling AI
- [ ] Admin UI per gestire stati step dei partner (modale per cambiare in_lavorazione → pronto)

### P3 - Bassa Priorita
- [ ] Refactoring server.py (>15k righe monolite)
- [ ] Fix alert fantasma "Test AlertQuestionario"
- [ ] Fix JSONDecodeError backend startup log
