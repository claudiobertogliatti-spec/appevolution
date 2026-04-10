# Evolution PRO - Product Requirements Document

## Problema Originale
App di gestione aziendale AI-driven. I partner vengono guidati step-by-step (Posizionamento → Masterclass → Videocorso → Funnel → Lancio → Ottimizzazione) con supporto AI completo.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)
- Modello di vendita: **Traffico → Landing → Webinar → Offerta → Follow-up**

## Implementato

### Dashboard Risultati v3 (10 Aprile 2026) — DONE
- **6 sezioni action-oriented**:
  1. Blocco Stato "Come sta andando la tua accademia" (funziona / da migliorare / non stabile)
  2. KPI Principali: Visite, Contatti, Vendite, Conversione — numeri grandi + trend
  3. Diagnosi Automatica: traffico insufficiente / problema landing / problema webinar / tutto ok
  4. Prossima Azione: singola azione chiara su blocco scuro con CTA
  5. Prossimo Livello Consigliato: Foundation/Growth/Scale collegato a Growth System con motivazione e CTA
  6. Trend: andamento generale (migliorando / stabile / peggiorando)
- Protocollo Vendite rimosso da questa pagina (endpoint backend ancora disponibile)

### GrowthSystemPage Redesign Conversione (10 Aprile 2026) — DONE
- Blocco "Dove sei oggi": 3 scenari diagnostici
- Scelta guidata con auto-espansione livello consigliato
- Copy migliorato: Problema / Soluzione / Target per livello
- Blocco Realta + CTA conversione

### LancioPage AI-driven (DONE)
- Landing, Webinar, Offerta, Follow-up, Calendario 30gg, Social, Ads Meta

### Accelera la crescita (DONE)
- 4 categorie: Visibilita, Costanza, Monetizzazione, Direzione

## Endpoint API Chiave
- `GET /api/partner-journey/ottimizzazione/{partner_id}` - KPI + diagnosi
- `POST /api/partner-journey/ottimizzazione/salva-protocollo` - checklist settimanale
- `POST /api/partner-journey/lancio/generate-plan` - piano vendita AI

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
