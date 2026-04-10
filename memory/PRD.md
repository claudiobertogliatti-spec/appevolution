# Evolution PRO - Product Requirements Document

## Problema Originale
App di gestione aziendale AI-driven. I partner vengono guidati step-by-step con supporto AI completo.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)

## Implementato

### Dashboard Operativa - Vista Antonella (10 Aprile 2026) — DONE
- **Summary Cards**: Totale Partner, In linea, Rallentati, Bloccati
- **Filtri**: Tutti / Bloccati / Rallentati / In linea
- **Per ogni partner**: fase attuale, giorni nello step, ultimo avanzamento, blocco attuale, livello esecuzione (alto/medio/basso)
- **Stato rischio**: in_linea (verde) / rallentato (giallo) / bloccato (rosso)
- **Azione consigliata**: generata automaticamente in base a rischio + fase + livello esecuzione
- **Row espandibile**: blocco attuale + azione consigliata + CTA "Apri scheda partner"
- Sidebar Antonella aggiornata con "Dashboard Operativa" sotto OPERATIVO

### Percorso Veloce — Go Live in 21 giorni (10 Aprile 2026) — DONE
- 5 fasi, countdown hero, checklist giornaliera con persistenza, phase stepper

### Dashboard Risultati v3 (10 Aprile 2026) — DONE
- 6 sezioni: Stato, KPI, Diagnosi, Prossima Azione, Prossimo Livello Consigliato, Trend

### GrowthSystemPage Redesign Conversione (10 Aprile 2026) — DONE
- Blocco "Dove sei oggi", scelta guidata, copy migliorato, blocco realta

### LancioPage AI-driven (DONE)
### Accelera la crescita (DONE)

## Endpoint API Chiave
- `GET /api/partner-journey/dashboard-operativa` - Dashboard operativa team
- `POST /api/partner-journey/percorso-veloce/activate`
- `GET /api/partner-journey/percorso-veloce/{partner_id}`
- `POST /api/partner-journey/percorso-veloce/save-checklist`
- `GET /api/partner-journey/ottimizzazione/{partner_id}`

## Backlog

### P0
- Integrazione Execution Layer Systeme.io
- Admin Panel lista utenti con stato avanzamento (PARZIALMENTE COMPLETATO con Dashboard Operativa)

### P1
- SMTP invio email, PDF contratto, personalizzazione contratto Admin

### P2
- Google Calendar, Canva, Kling AI

### P3
- Refactoring server.py, fix alert fantasma

## Note Tecniche
- `UserMessage(text=...)` non `content=`
- `send_message()` ritorna stringa
- LLM gpt-4o via Emergent Proxy
