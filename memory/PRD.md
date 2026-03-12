# Evolution PRO OS - Product Requirements Document

## Progetto
**Evolution PRO OS** - Applicazione web proprietaria per automazione workflow aziendali con sistema multi-agente AI.

## Obiettivi Principali
1. Sistema multi-agente AI (VALENTINA, ANDREA, GAIA, MARCO, STEFANIA) funzionante
2. Integrazione OpenClaw per automazioni GUI locali
3. Funnel acquisizione clienti per servizio "Analisi Strategica" (€67)
4. Dashboard partner/admin con gestione completa onboarding

## Architettura Tecnica
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Database**: MongoDB Atlas
- **AI**: Claude via emergentintegrations (Emergent LLM Key)
- **Pagamenti**: Stripe
- **Automazioni**: Telegram Bot + Systeme.io

## Flusso Nuovo Onboarding Cliente Analisi (IMPLEMENTATO - Mar 2026)

### Step 1: Registrazione (SENZA pagamento)
- **URL Pubblico**: `/analisi-strategica`
- **Componente**: `AnalisiStrategicaLanding.jsx`
- **API**: `POST /api/cliente-analisi/register`
- **Risultato**: Crea utente con `user_type: cliente_analisi`, `pagamento_analisi: false`
- Auto-login dopo registrazione

### Step 2: Pagamento
- **Componente**: `DashboardPagamento.jsx` (mostrato post-login se non pagato)
- **API**: `POST /api/cliente-analisi/checkout` → redirect Stripe
- **API**: `POST /api/cliente-analisi/verify-payment` → verifica e aggiorna stato
- **Risultato**: Crea record `clienti`, imposta `pagamento_analisi: true`

### Step 3: Questionario
- **Componente**: `ClienteDashboard.jsx` (mostrato post-pagamento)
- Flusso: Pre-Questionnaire → Questionnaire → Post-Questionnaire

## Endpoints Chiave

### Autenticazione
- `POST /api/auth/login` - Login utente
- `POST /api/auth/register` - Registrazione partner

### Cliente Analisi (NUOVO)
- `POST /api/cliente-analisi/register` - Registrazione cliente (no pagamento)
- `POST /api/cliente-analisi/checkout` - Crea sessione Stripe
- `POST /api/cliente-analisi/verify-payment` - Verifica pagamento
- `GET /api/cliente-analisi/status/{user_id}` - Stato cliente

### Partner
- `GET /api/partners` - Lista partner
- `POST /api/chat` - Chat con VALENTINA (supporta OpenClaw)

## File Principali
- `/app/frontend/src/App.js` - Routing e logica principale
- `/app/frontend/src/components/cliente/AnalisiStrategicaLanding.jsx` - Landing registrazione
- `/app/frontend/src/components/cliente/DashboardPagamento.jsx` - Pagina pagamento
- `/app/frontend/src/components/cliente/ClienteDashboard.jsx` - Dashboard cliente (>1200 righe)
- `/app/backend/server.py` - Backend monolite (>11000 righe)

## Credenziali Test
- **Admin**: claudio.bertogliatti@gmail.com / Evoluzione74

## Issues Noti

### P0 - Verifica Utente
- Test end-to-end OpenClaw da chat app → Telegram → automazione locale

### P1 - Bloccato
- Autonomia agenti via tag Systeme.io (in attesa creazione automazioni utente)

### P2 - Backlog
- Refactoring `server.py` (monolite critico)
- Refactoring `ClienteDashboard.jsx` (>1200 righe)
- Refresh token YouTube API
- Verifica template contratto partner

## Changelog Recente
- **Mar 12, 2026**: Implementato nuovo flusso onboarding separato registrazione/pagamento
- **Mar 12, 2026**: Creati componenti `AnalisiStrategicaLanding.jsx` e `DashboardPagamento.jsx`
- **Mar 12, 2026**: Integrazione Stripe con emergentintegrations funzionante
