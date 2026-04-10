# Evolution PRO - Product Requirements Document

## Problema Originale
App di gestione aziendale AI-driven. I partner vengono guidati step-by-step con supporto AI completo.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)

## Flusso Partner (aggiornato 10 Aprile 2026)
**Posizionamento → Funnel Light → Masterclass → Videocorso → Funnel di Vendita → Lancio**

## Implementato

### Distribuzione Funnel Systeme.io (10 Aprile 2026) — DONE
- **Workflow Admin**: Assegna template → Copia share link → Importa nel sub-account → Personalizza → Rendi live → Consegna URL
- **5 stati distribuzione**: da_importare → importato → personalizzato → live → consegnato
- **4 template master**: Webinar Evergreen, Masterclass Transformation, Sales Page PRO, Lead Gen Freebie
- **Auto-sync**: quando consegnato con URL, aggiorna automaticamente funnel_light del partner
- **UI Admin**: Summary cards + pannello assegnazione + lista con stepper + share link copiabile + storico

### Funnel Light — "Attiva il tuo primo funnel" (10 Aprile 2026) — DONE
- Nuovo step 2 nel percorso (tra Posizionamento e Masterclass)
- Template-based: landing + form + thank you, auto-compilato dal posizionamento

### Dashboard Operativa - Vista Antonella (10 Aprile 2026) — DONE
### Percorso Veloce — Go Live in 21 giorni (10 Aprile 2026) — DONE
### Dashboard Risultati v3 (10 Aprile 2026) — DONE
### GrowthSystemPage Conversione (10 Aprile 2026) — DONE
### LancioPage AI-driven (DONE)
### Accelera la crescita (DONE)

## Endpoint API Chiave
- `GET /api/partner-journey/funnel-distribution/templates`
- `GET /api/partner-journey/funnel-distribution/all-pending`
- `POST /api/partner-journey/funnel-distribution/assign`
- `POST /api/partner-journey/funnel-distribution/update-status`
- `GET /api/partner-journey/funnel-light/{partner_id}`
- `POST /api/partner-journey/funnel-light/generate`
- `POST /api/partner-journey/funnel-light/publish`
- `GET /api/partner-journey/dashboard-operativa`

## Backlog

### P0
- Configurare share link reali Systeme.io (sostituire placeholder)

### P1
- SMTP invio email, PDF contratto, personalizzazione contratto Admin

### P2
- Google Calendar, Canva, Kling AI

### P3
- Refactoring server.py, fix alert fantasma
