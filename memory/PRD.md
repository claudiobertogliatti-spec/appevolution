# Evolution PRO - Product Requirements Document

## Problema Originale
Applicazione di gestione aziendale basata su AI per l'ecosistema Evolution PRO. I partner vengono guidati attraverso un percorso step-by-step (Posizionamento, Masterclass, Videocorso, Funnel, Lancio, Ottimizzazione) con supporto AI completo.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)
- Background: Celery + Redis
- PDF: ReportLab
- Execution layer: Systeme.io (template standard + contenuti dinamici)

## Decisione Architetturale
- **App = Intelligenza** - genera academy_blueprint, piano lancio, contenuti, ads, webinar
- **Systeme.io = Esecuzione** - template standard + drag-and-drop + blocchi dinamici
- **Pattern AI-driven** su tutte le pagine: Input -> Generazione AI -> Output strutturato -> Validazione Partner -> Approvazione

## Cosa è stato implementato

### Sessione corrente (10 Aprile 2026)
- **Fix React Hooks bug in CourseOutputView** (DONE)
- **Editing manuale moduli/lezioni VideocorsoPage** (DONE): sia vista admin che partner
- **LancioPage AI-driven** (DONE): Calendario 30gg, Contenuti Pronti, Piano Ads Meta, Webinar, Promozione Webinar
- **Sezione "Accelera la crescita"** (DONE): Sostituita "Vai oltre" nella sidebar con 4 categorie:
  - Visibilità (Avatar PRO)
  - Costanza (Gestione contenuti 3 mesi)
  - Monetizzazione (Ebook/Audiobook/Audiolezioni - in arrivo)
  - Direzione (Sessioni con Claudio e Antonella)
  - Pagine semplici: problema → soluzione → beneficio → CTA
  - Framing "strumenti per accelerare" (no "servizi extra")

### Sessioni precedenti
- Posizionamento AI-driven (DONE)
- Masterclass AI-driven (DONE)
- 3 PDF Materiali Masterclass (DONE)
- VideocorsoPage AI-driven (DONE)
- FunnelPage AI-driven / Academy Blueprint (DONE)
- Fix LLM Integration / emergentintegrations (DONE)
- Vista Admin avanzata con pannello operativo (DONE)
- Fix Systeme.io import bulk/tag (DONE)
- Fix routing frontend /api/ prefix (DONE)
- Modulo Firma Contratto con Chatbot AI (DONE)

## Endpoint API Chiave

### Lancio
- `POST /api/partner-journey/lancio/generate-plan` - genera piano completo via LLM
- `POST /api/partner-journey/lancio/approve-plan?partner_id=X` - approva piano
- `GET /api/partner-journey/lancio/{partner_id}` - stato + plan_data

### Posizionamento
- `POST /api/partner-journey/posizionamento/save-inputs`
- `POST /api/partner-journey/posizionamento/generate-positioning`
- `POST /api/partner-journey/posizionamento/approve-positioning?partner_id=X`

### Masterclass
- `POST /api/masterclass-factory/{id}/generate-script`
- `POST /api/masterclass-factory/{id}/approve-script`

### Videocorso
- `POST /api/partner-journey/videocorso/generate-course`
- `POST /api/partner-journey/videocorso/update-course` (modifica manuale)
- `POST /api/partner-journey/videocorso/approve-course?partner_id=X`

### Funnel
- `POST /api/partner-journey/funnel/generate` (bio_partner, garanzia)
- `POST /api/partner-journey/funnel/approve-blueprint?partner_id=X`

## Backlog Prioritizzato

### P0
- Integrazione "Execution Layer" con Systeme.io (Funnel)
- Admin Panel: lista utenti wizard con stato avanzamento

### P1
- Invio link call via SMTP al termine dello Step 4
- Download PDF contratto firmato
- Personalizzazione parametri contrattuali (Admin)

### P2
- Integrazione reale Google Calendar, Canva, Kling AI

### P3
- Refactoring server.py (>15.400 righe)
- Fix alert fantasma "Test AlertQuestionario"

## Note Tecniche
- Usare SOLO `emergentintegrations` da pip, mai shim locali
- `UserMessage(text=...)` non `content=`
- `send_message()` ritorna stringa, non oggetto con `.content`
- Default LLM: gpt-4o via Emergent Proxy
