# Evolution PRO - Product Requirements Document

## Problema Originale
Applicazione di gestione aziendale basata su AI per l'ecosistema Evolution PRO. I partner vengono guidati attraverso un percorso step-by-step (Posizionamento → Masterclass → Videocorso → Funnel → Lancio → Ottimizzazione) con supporto AI.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)
- Background: Celery + Redis
- PDF: ReportLab

## Cosa è stato implementato

### Sessione corrente (Aprile 2026)
- **Posizionamento AI-driven** (COMPLETATO): Riscrittura completa di PosizionamentoPage.jsx con flusso Input → Generazione → Output → Validazione. 7 campi input, generazione AI con 6 sezioni + frase chiave, approvazione.
- **Masterclass AI-driven** (COMPLETATO): Riscrittura completa di MasterclassPage.jsx con flusso Input → Generazione → Output → Validazione. 7 campi input, generazione script con 7 sezioni, modifica inline, approvazione.
- **Fix LLM Integration** (COMPLETATO): Rimosso shim locale `/app/backend/emergentintegrations/` che bypassava il proxy Emergent. Ora usa il package venv (emergentintegrations==0.1.1).

### Sessioni precedenti
- Vista Admin avanzata con pannello operativo (DONE)
- Fix bug login produzione con Axios (DONE)
- Generazione PDF ReportLab per Step 1 (DONE)
- Videocorso: Approvazione Outline + Registrazione (DONE)
- Fix Systeme.io import bulk/tag (DONE)
- Fix routing frontend /api/ prefix (DONE)
- Modulo Firma Contratto con Chatbot AI (DONE)

## Endpoint API Chiave

### Posizionamento (Nuovi)
- `POST /api/partner-journey/posizionamento/save-inputs` — Salva 7 input partner
- `POST /api/partner-journey/posizionamento/generate-positioning` — Genera posizionamento AI
- `POST /api/partner-journey/posizionamento/approve-positioning?partner_id=X` — Approva

### Masterclass (Aggiornati)
- `POST /api/masterclass-factory/{id}/generate-script` — Genera script 7 sezioni
- `POST /api/masterclass-factory/{id}/approve-script` — Approva script

## Backlog Prioritizzato

### P0
- Trigger email SMTP alla conferma booking (Step 4)
- Admin Panel: lista utenti wizard con stato avanzamento

### P1
- Download PDF contratto firmato
- Personalizzazione parametri contrattuali per partner (Admin)

### P2
- Generazione PDF contratto firmato con ReportLab
- Integrazione reale Google Calendar
- Integrazione reale Canva/Kling AI

### P3
- Refactoring server.py (>15.400 righe)
- Fix alert fantasma "Test AlertQuestionario"
- Fix `legal_pages_service.py` che importa `emergentintegrations.llm.anthropic` (non presente nella nuova libreria)

## Credenziali Test
- Admin: claudio.bertogliatti@gmail.com / Evoluzione74
- Partner Demo: testf0@evolutionpro.it

## Note Tecniche
- NON toccare `frontend/Dockerfile` e `frontend/nginx.conf`
- Usare Axios (non fetch) nel frontend per evitare errore `body stream already read`
- Lo shim locale `emergentintegrations_OLD/` è stato disabilitato - NON riattivare
- Il default LLM model è gpt-4o via Emergent Proxy (funziona anche .with_model per anthropic/openai)
