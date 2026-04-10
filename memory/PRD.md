# Evolution PRO - Product Requirements Document

## Problema Originale
App di gestione aziendale AI-driven. I partner vengono guidati step-by-step con supporto AI completo.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)

## Flusso Partner (aggiornato 10 Aprile 2026)
**Posizionamento → Funnel Light → Masterclass → Videocorso → Funnel di Vendita → Lancio**

## Implementato

### Funnel Light — "Attiva il tuo primo funnel" (10 Aprile 2026) — DONE
- Nuovo step 2 nel percorso (inserito tra Posizionamento e Masterclass)
- Template-based: landing webinar + form contatti + thank you page
- Auto-compilato dai dati del posizionamento (no LLM, veloce)
- Pubblicazione immediata con URL generato
- Endpoints: `GET /funnel-light/{id}`, `POST /generate`, `POST /publish`
- stepConfig.js aggiornato: 6 step (posizionamento, funnel-light, masterclass, videocorso, funnel, lancio)
- PHASE_ACTIONS F2 aggiornato

### Dashboard Operativa - Vista Antonella (10 Aprile 2026) — DONE
- Summary Cards + Filtri + Lista partner con rischio/esecuzione/azione

### Percorso Veloce — Go Live in 21 giorni (10 Aprile 2026) — DONE
- 5 fasi, countdown, checklist giornaliera

### Dashboard Risultati v3 (10 Aprile 2026) — DONE
- 6 sezioni: Stato, KPI, Diagnosi, Prossima Azione, Prossimo Livello, Trend

### GrowthSystemPage Conversione (10 Aprile 2026) — DONE

### LancioPage AI-driven (DONE)
### Accelera la crescita (DONE)

## Endpoint API Chiave
- `GET /api/partner-journey/funnel-light/{partner_id}`
- `POST /api/partner-journey/funnel-light/generate`
- `POST /api/partner-journey/funnel-light/publish`
- `GET /api/partner-journey/dashboard-operativa`
- `POST /api/partner-journey/percorso-veloce/activate`
- `GET /api/partner-journey/percorso-veloce/{partner_id}`

## Backlog

### P0
- Integrazione Execution Layer Systeme.io (collegare funnel light a Systeme.io reale)

### P1
- SMTP invio email, PDF contratto, personalizzazione contratto Admin

### P2
- Google Calendar, Canva, Kling AI

### P3
- Refactoring server.py, fix alert fantasma
