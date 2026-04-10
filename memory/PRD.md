# Evolution PRO - Product Requirements Document

## Problema Originale
App di gestione aziendale AI-driven. I partner vengono guidati step-by-step (Posizionamento → Masterclass → Videocorso → Funnel → Lancio → Ottimizzazione) con supporto AI completo.

## Architettura
- Frontend: React, Tailwind CSS, Shadcn UI, Axios
- Backend: FastAPI, Motor (MongoDB async), emergentintegrations (LLM via Emergent Proxy)
- Modello di vendita: **Traffico → Landing → Webinar → Offerta → Follow-up**

## Implementato (10 Aprile 2026)

### Modello di Vendita nella LancioPage (DONE)
- **Landing Page**: headline, promessa, problema, benefici, CTA iscrizione, social proof
- **Webinar**: titolo, promessa, scaletta 6 fasi, CTA vendita, obiezioni comuni con risposte
- **Offerta**: prezzo pieno/lancio, 3+ bonus con valore percepito, garanzia, urgenza
- **Email Follow-up**: 6 email complete (replay, valore, caso studio, obiezioni, bonus, urgenza)
- **Calendario 30gg**: contenuti giornalieri con CTA verso la landing
- **Contenuti Social**: reel/carousel/post pronti collegati al funnel
- **Piano Ads Meta**: obiettivo, target, budget, creatività, copy
- **UI**: 7 tabs + FunnelSteps indicator (Landing → Webinar → Offerta → Follow-up)

### Sezione "Accelera la crescita" (DONE)
- 4 categorie sidebar: Visibilità, Costanza, Monetizzazione, Direzione
- Pagine semplici: problema → soluzione → beneficio → CTA

### Fix precedenti (DONE)
- React Hooks bug CourseOutputView
- Editing manuale moduli/lezioni VideocorsoPage (admin + partner)
- Posizionamento/Masterclass/Videocorso/Funnel AI-driven
- Fix LLM Integration / emergentintegrations

## Endpoint API Chiave
- `POST /api/partner-journey/lancio/generate-plan` - genera piano vendita completo
- `POST /api/partner-journey/lancio/approve-plan?partner_id=X`
- `GET /api/partner-journey/lancio/{partner_id}` - stato + plan_data

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
