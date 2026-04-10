# Evolution PRO - Product Requirements Document

## Problema Originale
App di gestione aziendale AI-driven. I partner vengono guidati step-by-step (Posizionamento → Masterclass → Videocorso → Funnel → Lancio → Ottimizzazione) con supporto AI completo.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)
- Modello di vendita: **Traffico → Landing → Webinar → Offerta → Follow-up**

## Implementato

### Dashboard KPI Risultati (10 Aprile 2026) — DONE
- **Blocco Stato**: "Come sta andando" con 3 stati (In attesa / Da migliorare / Sistema funziona)
- **KPI Principali**: Visite, Contatti, Vendite, Conversione — numeri grandi + trend badge
- **Diagnosi Automatica**: poche visite=traffico, pochi contatti=landing, poche vendite=webinar, tutto ok=funziona
- **Prossima Azione**: singola azione chiara su blocco scuro (pubblica contenuti / migliora landing / lavora sul webinar)
- **Trend**: andamento generale (migliorando / stabile / peggiorando)
- **Protocollo Vendite**: checklist settimanale 4 azioni con persistenza MongoDB

### GrowthSystemPage Redesign Conversione (10 Aprile 2026) — DONE
- Blocco "Dove sei oggi": 3 scenari diagnostici (A/B/C) che guidano il partner
- Scelta guidata: selezione scenario → auto-espansione livello consigliato con badge "PER TE"
- Copy migliorato: ogni livello ha sezioni Problema, Soluzione, Target
- Blocco Realta: sezione scura "Cosa succede se non fai nulla"
- CTA di conversione con conferma visiva

### Modello di Vendita nella LancioPage (DONE)
- Landing Page, Webinar, Offerta, Email Follow-up, Calendario 30gg, Contenuti Social, Piano Ads Meta
- UI: 7 tabs + FunnelSteps indicator

### Sezione "Accelera la crescita" (DONE)
- 4 categorie sidebar: Visibilita, Costanza, Monetizzazione, Direzione

### Fix precedenti (DONE)
- React Hooks bug, Editing manuale VideocorsoPage, Posizionamento/Masterclass/Videocorso/Funnel AI-driven, Fix LLM Integration

## Endpoint API Chiave
- `POST /api/partner-journey/lancio/generate-plan`
- `GET /api/partner-journey/ottimizzazione/{partner_id}` - KPI + protocollo + diagnosi
- `POST /api/partner-journey/ottimizzazione/salva-protocollo` - salva checklist settimanale

## Backlog

### P0
- Integrazione Execution Layer Systeme.io
- Admin Panel lista utenti con stato avanzamento

### P1
- SMTP invio email, PDF contratto, personalizzazione contratto Admin

### P2
- Google Calendar, Canva, Kling AI

### P3
- Refactoring server.py, fix alert fantasma "Test AlertQuestionario"

## Note Tecniche
- `UserMessage(text=...)` non `content=`
- `send_message()` ritorna stringa
- LLM gpt-4o via Emergent Proxy
