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
- **Posizionamento AI-driven** (COMPLETATO): 7 input → generazione AI 6 sezioni + frase chiave → approvazione
- **Masterclass AI-driven** (COMPLETATO): 7 input → generazione script 7 sezioni → modifica inline → approvazione
- **3 PDF Materiali Masterclass** (COMPLETATO): Template Script, Struttura Tipo, Consigli Registrazione via ReportLab
- **VideocorsoPage AI-driven** (COMPLETATO): 3 input (durata/bonus/contenuti) → generazione corso completo con moduli, lezioni, bonus, prezzi, posizionamento → approvazione
- **Fix LLM Integration** (COMPLETATO): Rimosso shim locale, usa il package venv emergentintegrations==0.1.1

### Sessioni precedenti
- Vista Admin avanzata con pannello operativo (DONE)
- Fix bug login produzione con Axios (DONE)
- Generazione PDF ReportLab per Step 1 (DONE)
- Fix Systeme.io import bulk/tag (DONE)
- Fix routing frontend /api/ prefix (DONE)
- Modulo Firma Contratto con Chatbot AI (DONE)

## Endpoint API Chiave

### Posizionamento
- `POST /api/partner-journey/posizionamento/save-inputs`
- `POST /api/partner-journey/posizionamento/generate-positioning`
- `POST /api/partner-journey/posizionamento/approve-positioning?partner_id=X`

### Masterclass
- `POST /api/masterclass-factory/{id}/generate-script` (7 sezioni strutturate)
- `POST /api/masterclass-factory/{id}/approve-script`

### Materiali PDF Masterclass
- `GET /api/materials/masterclass/template-script`
- `GET /api/materials/masterclass/struttura-tipo`
- `GET /api/materials/masterclass/consigli-registrazione`

### Videocorso
- `POST /api/partner-journey/videocorso/save-inputs`
- `POST /api/partner-journey/videocorso/generate-course`
- `POST /api/partner-journey/videocorso/approve-course?partner_id=X`
- `GET /api/partner-journey/videocorso/{partner_id}`

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
- Fix `legal_pages_service.py` import shim anthropic

## Note Tecniche
- NON toccare `frontend/Dockerfile` e `frontend/nginx.conf`
- Usare Axios (non fetch) nel frontend
- Lo shim locale `emergentintegrations_OLD/` è disabilitato - NON riattivare
- Default LLM model: gpt-4o via Emergent Proxy
- Flusso AI-driven: Input → Generazione → Output → Validazione (pattern per tutte le pagine step)
