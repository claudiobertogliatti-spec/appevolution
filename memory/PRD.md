# Evolution PRO - Product Requirements Document

## Problema Originale
Applicazione di gestione aziendale basata su AI per l'ecosistema Evolution PRO. I partner vengono guidati attraverso un percorso step-by-step (Posizionamento → Masterclass → Videocorso → Funnel → Lancio → Ottimizzazione) con supporto AI.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)
- Background: Celery + Redis
- PDF: ReportLab
- Execution layer: Systeme.io (template standard + contenuti dinamici)

## Decisione Architetturale Funnel
- **App = Intelligenza** → genera academy_blueprint completo
- **Systeme.io = Esecuzione** → template standard + drag-and-drop + blocchi dinamici
- **Template standard riutilizzabile** come base, personalizzazione per blocchi, codice custom solo dove serve
- Il partner NON costruisce nulla → il sistema genera, il partner valida

## Cosa è stato implementato

### Sessione corrente (Aprile 2026)
- **Posizionamento AI-driven** (DONE): 7 input → generazione AI 6 sezioni + frase chiave → approvazione
- **Masterclass AI-driven** (DONE): 7 input → script 7 sezioni → modifica inline → approvazione
- **3 PDF Materiali Masterclass** (DONE): Template Script, Struttura Tipo, Consigli Registrazione
- **VideocorsoPage AI-driven** (DONE): 3 input → corso completo con moduli, lezioni, bonus, prezzi → approvazione
- **FunnelPage AI-driven — Academy Blueprint** (DONE): 2 input (bio, garanzia) → blueprint completo con:
  - Landing Page (hero, problema, promessa, moduli, bonus, garanzia, FAQ, bio, CTA finale)
  - Email Sequence (5 email con body completo: consegna, problema, errore, soluzione, urgenza)
  - Area Studenti (welcome, moduli, lezioni, bonus, risorse)
- **Fix LLM Integration** (DONE): Rimosso shim locale, usa emergentintegrations==0.1.1
- **Fix React Hooks bug in CourseOutputView** (DONE - 10 Apr): useState spostato prima del return condizionale
- **Editing manuale moduli/lezioni** (DONE - 10 Apr): Aggiungi/Rimuovi modulo e lezione in VideocorsoPage

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
- `POST /api/masterclass-factory/{id}/generate-script`
- `POST /api/masterclass-factory/{id}/approve-script`
- `GET /api/materials/masterclass/template-script`
- `GET /api/materials/masterclass/struttura-tipo`
- `GET /api/materials/masterclass/consigli-registrazione`

### Videocorso
- `POST /api/partner-journey/videocorso/generate-course`
- `POST /api/partner-journey/videocorso/approve-course?partner_id=X`

### Funnel (Academy Blueprint)
- `POST /api/partner-journey/funnel/generate` (bio_partner, garanzia)
- `POST /api/partner-journey/funnel/approve-blueprint?partner_id=X`
- `GET /api/partner-journey/funnel/{partner_id}`

## Pattern AI-driven (tutte le pagine)
Input → Generazione AI → Output strutturato → Validazione Partner → Approvazione

## Backlog Prioritizzato

### P0
- Integrazione "Execution Layer" con Systeme.io (Funnel) - duplicare template e riempire blocchi con blueprint approvato
- Step 5 (LancioPage) AI-driven: pubblicazione, go-live, checklist lancio
- Admin Panel: lista utenti wizard con stato avanzamento
- Trigger email SMTP alla conferma booking

### P1
- Download PDF contratto firmato
- Personalizzazione parametri contrattuali (Admin)

### P2
- Integrazione reale Google Calendar, Canva, Kling AI

### P3
- Refactoring server.py (>15.400 righe)
- Fix alert fantasma "Test AlertQuestionario"

## Note Tecniche
- NON toccare `frontend/Dockerfile` e `frontend/nginx.conf`
- Usare Axios (non fetch) nel frontend
- Lo shim locale `emergentintegrations_OLD/` è disabilitato - NON riattivare
- Default LLM model: gpt-4o via Emergent Proxy
