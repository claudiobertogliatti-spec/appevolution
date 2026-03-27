# Evolution PRO - Product Requirements Document

## Original Problem Statement
Build a multi-faceted AI-powered application for "Evolution PRO" business including:
- Systeme.io Payment Integration with Stripe
- High-Conversion Sales Script generation using LLM
- Avatar & Social Plan Management (HeyGen)
- **Discovery Engine AI with YouTube Data API v3 Integration**
- "Sblocco Core" Roadmap automation
- Ollama Integration for local LLM processing
- **Lead Acquisition Automation with Email Sequence for €67 Analysis Sale**
- **Post-Payment Automation with AI Analysis & Email Workflows**
- **Piano Continuità Management with Stripe Subscriptions**
- **Import Lista Fredda su Systeme.io via API**
- **Calendario Editoriale con AI (Claude) + Asset Generation (Canva, Kling, HeyGen)**

## User's Preferred Language
**Italian** - All UI and communications should be in Italian.

## Core Architecture
```
/app
├── backend/           # FastAPI backend
│   ├── server.py      # Main API server (monolith)
│   ├── routers/       # API routers
│   │   ├── discovery_engine.py  # Lead discovery + YouTube API + auto-approve + email sequence
│   │   ├── stripe_webhook.py    # Stripe webhook + post-payment automation
│   │   ├── flusso_analisi.py    # Attiva-partnership + Systeme.io integration
│   │   ├── partner_journey.py   # Partner journey with AI generation
│   │   ├── lista_fredda.py      # Lista fredda management + webhook tracking
│   │   ├── systeme_contacts.py  # NEW: Import contatti su Systeme.io via API
│   │   ├── media_integrations.py # Canva, Kling, HeyGen stub + Calendario Editoriale
│   │   └── servizi_extra.py     # Servizi a pagamento con Stripe
│   ├── celery_app.py   # Celery configuration with beat schedule
│   ├── celery_tasks.py # Celery tasks (video, email, auto-approve, GAIA, expiry, systeme import)
│   ├── systeme_mcp_client.py # Systeme.io API client
│   ├── email_templates.py # Email template management (WYSIWYG ready)
│   └── ...
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/
        │   │   ├── AdminDashboardPro.jsx
        │   │   ├── AdminPartnerTools.jsx
        │   │   ├── ListaFreddaAdmin.jsx  # UI gestione lista fredda
        │   │   ├── ServiziExtraAdmin.jsx # UI gestione servizi
        │   │   └── EmailTemplatesManager.jsx  # WYSIWYG editor
        │   ├── partner/
        │   └── chat/
        └── App.js
```

## What's Been Implemented

### Session: 25 March 2026 - BUG FIX CRITICO + Import Systeme.io + Calendario Editoriale

#### ✅ BUG FIX CRITICO - Partner non visibili in Dashboard
**Problema**: I partner reali (22) non venivano mostrati nella dashboard Overview e nella Pipeline Partner. Erano visibili solo i 5 partner seed.

**Causa**: Le chiamate API in `/app/frontend/src/App.js` mancavano del prefisso `/api/`:
- `${API}/partners` invece di `${API}/api/partners`
- `${API}/alerts` invece di `${API}/api/alerts`
- `${API}/agents` invece di `${API}/api/agents`
- E molti altri endpoint (compliance, gaia, videos, files, chat)

**Fix**: Corretti tutti gli endpoint in App.js aggiungendo il prefisso `/api/`.

#### ✅ FIX URGENTE - Import Lista Fredda su Systeme.io via API
Implementato router `/app/backend/routers/systeme_contacts.py`:

- **`POST /api/systeme/contacts/import`** - Import array di contatti su Systeme.io con tag automatico
  - Crea contatti se non esistono via API nativa Systeme.io
  - Assegna automaticamente tag Lista_Fredda (id: 1934404)
  - Rispetta rate limit API (5 req/sec)
  
- **`POST /api/systeme/contacts/tag`** - Assegna tag a singolo contatto già presente
  - Cerca contatto per email
  - Assegna tag specificato
  
- **`POST /api/systeme/contacts/import-bulk`** - Import massivo da MongoDB lista_fredda
  - Legge dalla collection `lista_fredda`
  - Processa in batch da 50 contatti (configurabile)
  - Esegue in background per non bloccare
  - Notifica Telegram al completamento
  
- **`GET /api/systeme/contacts/import-bulk/status/{job_id}`** - Stato job di import
- **`GET /api/systeme/contacts/import-bulk/jobs`** - Lista job di import

#### ✅ Task Celery `import_lista_fredda_systeme`
- Aggiunto in `/app/backend/celery_tasks.py`
- Può essere schedulato via Celery Beat o triggerato manualmente
- Processa tutti i contatti della lista fredda verso Systeme.io

#### ✅ PARTE C - Calendario Editoriale Completo
Implementato in `/app/backend/routers/media_integrations.py`:

- **`POST /api/media/calendario/genera`** - Genera calendario editoriale mensile
  - Input: partner_id, mese, anno, nicchia, target, tono, num_post
  - Genera piano contenuti con Claude AI (temi, copy, hashtag, CTA)
  - Fallback a contenuti mock se Claude non disponibile
  - Ogni contenuto ha: giorno, tipo (POST/CAROSELLO/REEL/VIDEO_AVATAR), titolo, copy, hashtags, prompt_visivo
  
- **`GET /api/media/calendario/{id}/status`** - Verifica stato generazione
- **`GET /api/media/calendario/partner/{partner_id}`** - Lista calendari di un partner
- **`POST /api/media/calendario/{id}/genera-assets`** - Genera asset visivi per ogni contenuto
  - POST → Canva (stub)
  - CAROSELLO → Canva (stub)
  - REEL → Kling AI (stub)
  - VIDEO_AVATAR → HeyGen (stub, ma API già configurata)

#### ✅ PARTE B & D - Stub Canva/Kling già presenti
Gli endpoint esistenti ora restituiscono risposte mock complete:
- `POST /api/media/analisi-pdf/genera` - PDF analisi (Canva stub)
- `POST /api/media/canva/post` - Post grafico
- `POST /api/media/canva/carosello` - Carosello
- `POST /api/media/kling/reel` - Reel cinematografico
- `GET /api/media/brand-kit/{partner_id}` - Brand kit partner
- `POST /api/media/brand-kit/{partner_id}/genera` - Genera brand kit

### Session: 24 March 2026 - Lista Fredda + STEFANIA Integration

#### ✅ PARTE 1 - Import Lista Fredda CSV
- `POST /api/lista-fredda/import` - Upload CSV con deduplicazione su email
- `GET /api/lista-fredda/stats` - Statistiche (totale, per stato, aperture, click)
- `GET /api/lista-fredda/leads` - Lista con filtri (stato, tag, has_phone)
- `GET /api/lista-fredda/leads/caldi` - Solo lead caldi
- `GET /api/lista-fredda/export` - Export CSV filtrato

#### ✅ PARTE 2 - Webhook Tracking Systeme.io
- `POST /api/lista-fredda/webhook/systeme-tracking` - Eventi: email_opened, link_clicked, unsubscribed, reply_received
- Auto-update stato: in_sequenza → caldo → in_funnel → convertito
- Alert Telegram per risposte e lead caldi

#### ✅ PARTE 3 - Trigger STEFANIA (Celery Tasks)
- `stefania_check_email4_noclick` - 48h dopo apertura email 4, se non clicca → task WhatsApp
- `stefania_check_funnel_nopayment` - 24h dopo ingresso funnel, se non paga → reminder

## API Endpoints - Nuovo

### Systeme.io Contacts
- `POST /api/systeme/contacts/import` - Import array contatti
- `POST /api/systeme/contacts/tag` - Tag singolo contatto
- `POST /api/systeme/contacts/import-bulk` - Import massivo da MongoDB
- `GET /api/systeme/contacts/import-bulk/status/{job_id}` - Stato job
- `GET /api/systeme/contacts/import-bulk/jobs` - Lista job

### Media & Calendario Editoriale
- `GET /api/media/status` - Stato integrazioni (Canva, Kling, HeyGen, Cloudinary)
- `POST /api/media/calendario/genera` - Genera calendario mensile
- `GET /api/media/calendario/{id}/status` - Stato calendario
- `GET /api/media/calendario/partner/{partner_id}` - Lista calendari partner
- `POST /api/media/calendario/{id}/genera-assets` - Genera asset visivi

## Pending/Future Tasks

### P0 - Completati ✅
- [x] Import Lista Fredda su Systeme.io via API
- [x] Endpoint POST /api/systeme/contacts/import
- [x] Endpoint POST /api/systeme/contacts/tag
- [x] Job Celery import_lista_fredda_systeme
- [x] Calendario Editoriale con Claude AI
- [x] Modulo Firma Contratto Partnership (UI + backend)
- [x] Redesign Contratto a 2 colonne + Chatbot Claude
- [x] **Personalizzazione Parametri Contratto (Admin)** — 27 Mar 2026
  - Backend: `GET/PATCH /api/admin/partners/{partner_id}/contract-params`
  - Backend: `GET /api/contract/text/{partner_id}` con rendering dinamico
  - Frontend Admin: Modale "Personalizza Contratto" nel menu partner
  - Frontend Partner: ContractSigning carica testo dinamico dal backend
  - Parametri: corrispettivo, corrispettivo_testo, royalty_perc, durata_mesi, num_rate, note_admin
  - Testing: 100% backend (11/11 tests) + 100% frontend UI
- [x] **Upload Documenti Onboarding Partner** — 27 Mar 2026
  - Backend: `POST /api/partner/documents/upload/{doc_type}` con Cloudinary
  - Backend: `GET /api/partner/documents/status`, `POST submit-review`
  - Backend: `PATCH verify/reject` per admin con nota rifiuto
  - Frontend Partner: Pagina upload con 6 card documento, drag&drop, progress bar, bottone "Invia per verifica"
  - Frontend Admin: Sezione "Documenti Onboarding" nella scheda partner (tab Documenti) con bottoni Verifica/Rifiuta + modale nota rifiuto
  - Sidebar: Badge "DA CARICARE" / "IN VERIFICA" per partner con docs incompleti
  - Navigation: Post-firma → redirect a `/dashboard/documents`
  - Testing: 100% backend (14/14) + 100% frontend

### P0 - Prossimi
- [ ] **Configurare Tag Systeme.io** — Creare tag nella dashboard Systeme.io e inserire ID nel .env:
  - `SYSTEME_TAG_DOC_RIFIUTATO`, `SYSTEME_TAG_DOCS_IN_VERIFICA`, `SYSTEME_TAG_DOCS_VERIFICATI`, `SYSTEME_TAG_CONTRATTO_FIRMATO`
  - Creare automazioni email collegate a ciascun tag

### P1 - Alta Priorità
- [ ] **Test Flusso Acquisto Servizi Extra (Parte F)**: Verificare end-to-end checkout Stripe → webhook → attivazione
- [ ] **Integrazioni Reali**: Ottenere API key per Canva e Kling dall'utente

### P2 - Media Priorità
- [ ] UI Frontend per Calendario Editoriale
- [ ] Preview asset generati prima di pubblicazione
- [ ] Scheduling automatico post social

### P3 - Technical Debt
- [ ] Refactoring `server.py` monolith
- [ ] Unificazione collection `users` e `partners`
- [ ] Documentazione OpenAPI

## 3rd Party Integrations Status

| Servizio | Status | Note |
|----------|--------|------|
| Stripe | ✅ Configurato | Checkout + Webhook |
| Systeme.io | ✅ Configurato | API Key funzionante |
| Telegram | ✅ Configurato | Notifiche admin |
| Claude AI | ✅ Configurato | Via Emergent LLM Key |
| HeyGen | ✅ Configurato | Avatar video |
| Cloudinary | ✅ Configurato | File storage |
| Canva | ⚠️ STUB | Richiede API Token |
| Kling AI | ⚠️ STUB | Richiede API Key |
| YouTube | ✅ Configurato | OAuth per upload |

## Credentials (Test)
- **Admin:** claudio.bertogliatti@gmail.com / Evoluzione74
- **Operations:** antonella@evolution-pro.it / OperationsAnto2024!

## Important Notes
- **Systeme.io Tag ID Lista Fredda**: 1934404
- **Rate Limit Systeme.io**: Max 5 richieste/secondo
- **Canva/Kling**: Funzionano in modalità STUB fino a configurazione API key
- **Calendario Editoriale**: Genera contenuti mock se Claude non risponde in tempo
