# Evolution PRO - Product Requirements Document

## Problema Originale
App di gestione aziendale AI-driven. I partner vengono guidati step-by-step (Posizionamento → Masterclass → Videocorso → Funnel → Lancio → Ottimizzazione) con supporto AI completo.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)
- Modello di vendita: **Traffico → Landing → Webinar → Offerta → Follow-up**

## Implementato

### Percorso Veloce — Go Live in 21 giorni (10 Aprile 2026) — DONE
- **5 fasi**: Posizionamento (gg 1-2), Webinar (gg 3-7), Funnel (gg 8-10), Traffico (gg 11-14), Webinar Live (gg 15-21)
- **Countdown Hero**: giorno corrente + giorni rimanenti + progress bar
- **Checklist giornaliera**: task specifici per ogni giorno, con persistenza MongoDB
- **Phase Stepper**: 5 fasi con badge "ORA" sulla fase corrente
- **Schermata di attivazione**: per i partner che non hanno ancora iniziato
- **Sidebar**: "Go Live in 21gg" con icona Zap rossa
- Endpoints: `POST /activate`, `GET /{partner_id}`, `POST /save-checklist`

### Dashboard Risultati v3 (10 Aprile 2026) — DONE
- 6 sezioni: Stato, KPI, Diagnosi, Prossima Azione, Prossimo Livello Consigliato, Trend

### GrowthSystemPage Redesign Conversione (10 Aprile 2026) — DONE
- Blocco "Dove sei oggi", scelta guidata, copy migliorato, blocco realta

### LancioPage AI-driven (DONE)
### Accelera la crescita (DONE)
### Fix precedenti (DONE)

## Endpoint API Chiave
- `POST /api/partner-journey/percorso-veloce/activate`
- `GET /api/partner-journey/percorso-veloce/{partner_id}`
- `POST /api/partner-journey/percorso-veloce/save-checklist`
- `GET /api/partner-journey/ottimizzazione/{partner_id}`
- `POST /api/partner-journey/lancio/generate-plan`

## Backlog

### P0
- Integrazione Execution Layer Systeme.io
- Admin Panel lista utenti con stato avanzamento

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
