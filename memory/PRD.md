# Evolution PRO - Product Requirements Document

## Problema Originale
Sviluppo di "Evolution PRO", applicazione di gestione aziendale basata su AI per accademie digitali. Tre tipi di utenti: Admin (Claudio), Partner (formatori/coach), Clienti potenziali.

## Architettura
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + Pydantic + MongoDB (Motor async)
- **AI**: Anthropic Claude (via Emergent LLM Key)
- **Pagamenti**: Stripe
- **PDF**: ReportLab

## Stato di avanzamento

### COMPLETATO
- [x] Sistema auth (JWT, login, ruoli admin/partner/operations)
- [x] Dashboard Admin completa (pipeline, partner, metriche, alert)
- [x] Funnel Cliente completo (4 step: questionario → analisi AI → proposta → booking)
- [x] Post Analisi Partnership (13 sezioni, contratto, chat AI, pagamento Stripe)
- [x] Fix globale routing frontend (/api/ prefix)
- [x] Fix backend redirect_slashes=False
- [x] Integrazione Systeme.io (import bulk, tag)
- [x] Modulo Firma Contratto (UI, chatbot Claude, accordion articoli)
- [x] Onboarding Partner (campi aziendali, upload documenti)
- [x] **Sidebar Partner minimale** (4 item: Home, Il Mio Spazio, Supporto, Risultati) ✅
- [x] **Home Partner come orchestratore** (6 blocchi: SEI QUI, COSA DEVI FARE ADESSO, A CHE PUNTO SEI, DOPO QUESTO STEP, HAI BISOGNO DI AIUTO?, COME FUNZIONA IL PERCORSO) ✅
- [x] **StepPageWrapper** (header, stato, back-to-home per ogni step page) ✅
- [x] **MioSpazioPage** (Profilo + File in tabs) ✅
- [x] **Logica avanzamento step** (completato/in corso/bloccato) ✅
- [x] **Separazione Vista Partner/Admin** ✅ 09/04/2026
- [x] **AdminPartnerOpsPanel** (pannello operativo destra, 5 macro-step, micro-step, stati, fase auto-sync) ✅ 09/04/2026
- [x] **API progress** (GET/PATCH /api/admin/partners/{id}/progress + phase sync) ✅ 09/04/2026

- [x] **Fix Pannello Operativo Admin** (demoPartner con ID fittizio -> usa partner reale da DB) ✅ 09/04/2026
- [x] **Vista Admin Avanzata** (27 micro-step operativi, note admin, progress globale, sync automatica fase) ✅ 09/04/2026
- [x] **Sblocco navigazione Admin** (admin naviga liberamente tutti gli step senza lock, partner resta bloccato) ✅ 09/04/2026
- [x] **Panoramica Admin completa** (admin vede TUTTE le domande/contenuti di ogni step in un'unica vista, senza wizard passo-passo) ✅ 09/04/2026
- [x] **Fix Login Produzione** (errore "body stream already read" → sostituito fetch con Axios in Homepage.jsx) ✅ 09/04/2026
- [x] **PDF Materiali Posizionamento** (3 PDF operativi generati con ReportLab + download funzionante) ✅ 09/04/2026
- [x] **VideocorsoPage Outline Review** (2 fasi: revisione struttura con titoli/lezioni/argomenti/bonus/risorse → poi registrazione) ✅ 09/04/2026

### NOTE DEPLOY PRODUZIONE (CRITICO)
- `frontend/Dockerfile` e `frontend/nginx.conf` devono essere nel repo (Emergent li cancella con auto-commit)
- `nginx.conf` deve sostituire `/etc/nginx/nginx.conf` direttamente (non include subdirectory)
- Deploy con **SHA esatto** del build (`@sha256:...`) mai con `:latest` (Emergent sovrascrive il tag)

### PROSSIMI (P0-P1)
- [ ] P0: SMTP trigger email alla prenotazione call (Step 4)
- [ ] P0: Admin Panel - lista utenti wizard con stato
- [ ] P1: Download PDF contratto firmato

### BACKLOG (P2-P3)
- [ ] P2: Integrazione reale Google Calendar
- [ ] P2: Integrazione reale Canva / Kling AI
- [ ] P3: Refactoring monolite server.py (>15k righe)
- [ ] P3: Fix alert fantasma "Test AlertQuestionario"

## File Chiave
- `/app/frontend/src/App.js` — Routing principale
- `/app/frontend/src/components/partner/PartnerSidebar.jsx` — Sidebar minimale
- `/app/frontend/src/components/partner/PartnerDashboardSimplified.jsx` — Home 6 blocchi
- `/app/frontend/src/components/partner/StepPageWrapper.jsx` — Wrapper step pages
- `/app/frontend/src/components/partner/MioSpazioPage.jsx` — Profilo + File
- `/app/frontend/src/components/partner/AdminPartnerOpsPanel.jsx` — Pannello ops admin
- `/app/frontend/src/components/partner/stepConfig.js` — Config condivisa step
- `/app/backend/routers/partner_progress.py` — API micro-step progress
- `/app/backend/server.py` — Backend monolite

## Credenziali Test
Vedi `/app/memory/test_credentials.md`

## Schema DB Partner Progress
```json
{
  "progress_details": {
    "posizionamento": {
      "status": "completed|in_progress|not_started",
      "micro_steps": {
        "questionario": { "status": "completed", "label": "...", "updated_at": "..." }
      }
    }
  }
}
```

## Fase auto-sync
- posizionamento completato → F3
- masterclass completato → F4
- videocorso completato → F6
- funnel completato → F7
- lancio completato → LIVE
