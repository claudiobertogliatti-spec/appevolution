# Evolution PRO OS - PRD (Product Requirements Document)

## Overview
**Nome**: Evolution PRO OS Platform  
**Data creazione**: 11 Feb 2026  
**Versione**: 4.0  
**Stato**: Aggiornamento Completo ✅

## Problem Statement
Creare un'applicazione full-stack proprietaria per Evolution PRO - una piattaforma di gestione partner per la creazione di videocorsi. L'applicazione elimina dipendenze da tool esterni come Descript e Google Drive, internalizzando processi di video editing e file management.

## User Personas
1. **Claudio B. (Admin - Fondatore)**: Gestisce l'intero ecosistema, monitora agenti AI, partner, metriche post-lancio e alert
2. **Antonella B. (Admin - Operations)**: Focus su gestione operativa partner, feed video editing, compliance
3. **Partner (Marco Ferretti, Sara Lombardi, etc.)**: Business coach e consulenti che seguono il percorso formativo

## Technical Stack
- **Frontend**: React 19, Tailwind CSS, Lucide Icons
- **Backend**: FastAPI (Python), MongoDB (Motor)
- **AI Integration**: Claude Sonnet via Emergent LLM Key, OpenAI TTS & Whisper
- **Video Processing**: FFmpeg, OpenAI Whisper
- **YouTube Integration**: YouTube Data API v3 (OAuth2)
- **Design**: Dark theme (Navy #1a2332, Yellow #F5C518)

---

## What's Been Implemented

### V1.0 (11 Feb 2026) ✅
- MVP con dashboard Admin e Partner
- Chatbot VALENTINA con Claude AI
- Persistenza MongoDB

### V2.0 (11 Feb 2026) ✅
- Pipeline video ANDREA (Whisper + FFmpeg)
- Native File Manager (eliminato Google Drive)
- LUCA Compliance Dashboard

### V3.0 (11 Feb 2026) ✅
- YouTube Data API v3 integration (OAuth2 completato)
- GAIA Funnel Deployer (Systeme.io templates)
- OpenAI TTS per voce avatar intro/outro

### V4.0 (11 Feb 2026) ✅
**Nuove Funzionalità dal JSX Aggiornato:**

#### Admin Features
- **Sistema Notifiche (NotificationBell)**
  - Pannello dropdown con notifiche categorizzate
  - Badge conteggio non lette
  - Tipi: modulo completato, escalation, video pronto, file caricato
  - "Segna tutte come lette"

- **Dual Admin Switcher (Claudio/Antonella)**
  - Profili admin separati con dashboard personalizzate
  - Claudio: Overview, Agenti AI, Partner, Editing, Post-Lancio, GAIA, LUCA, Alert
  - Antonella: Overview, Partner, Editing Feed, LUCA, Alert
  - Avatar e colori distinti

- **Metriche Post-Lancio**
  - Solo per partner F8+ (lanciati)
  - KPI: Studenti iscritti, Completamento corso, NPS Score, Revenue
  - Grafico iscrizioni settimanali
  - NPS Breakdown (Promotori/Passivi/Detrattori)
  - Completamento per modulo (Funnel studenti)
  - Feedback più citati
  - Systeme.io Live Status (nuovi iscritti, conversion rate, views funnel)

- **Feed Video ANDREA (per Antonella)**
  - Feed video in attesa di editing
  - Stati: nuovo, in lavorazione, in attesa link
  - "Prendi in carico" funzionalità
  - Alert "X video in attesa"

- **Nuovo Partner Form (Onboarding)**
  - Form multi-step per creare partner
  - Campi: nome, email, nicchia, investimento, password Systeme
  - Preview email benvenuto
  - Generazione credenziali automatica
  - "Copia per Telegram"

#### Partner Features
- **Calendario Editoriale 30 Giorni**
  - Piano contenuti pre-lancio strutturato
  - 4 settimane (Awareness, Autorità, Lead Gen, Conversione)
  - Tipi contenuti: YouTube, Instagram, TikTok, Blog/Email
  - Accordion espandibile per settimana
  - Legenda colorata per piattaforma

- **Wizard Posizionamento (Documenti)**
  - 9 domande guidate per Canvas Posizionamento
  - Progress bar e dot navigation
  - Hints con esempi pratici
  - Generazione Canvas finale
  - Copia/Salva output

#### Refactoring Frontend
- Componenti estratti in file separati:
  - `/components/common/NotificationBell.jsx`
  - `/components/common/AdminSwitcher.jsx`
  - `/components/admin/MetrichePostLancio.jsx`
  - `/components/admin/FeedVideoNuovi.jsx`
  - `/components/admin/NuovoPartnerForm.jsx`
  - `/components/partner/CalendarioEditoriale.jsx`
  - `/components/partner/WizardPosizionamento.jsx`
- Costanti in `/data/constants.js`

---

## Code Architecture

```
/app
├── backend/
│   ├── server.py             # Main FastAPI app
│   ├── video_processor.py    # Video editing (FFmpeg, Whisper)
│   ├── file_storage.py       # Local file management
│   ├── youtube_uploader.py   # YouTube API & OAuth
│   ├── tts_generator.py      # OpenAI TTS
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── App.css           # Styles
│   │   ├── components/
│   │   │   ├── common/       # NotificationBell, AdminSwitcher
│   │   │   ├── admin/        # MetrichePostLancio, FeedVideoNuovi, NuovoPartnerForm
│   │   │   └── partner/      # CalendarioEditoriale, WizardPosizionamento
│   │   └── data/
│   │       └── constants.js  # Static data, colors, mock metrics
│   └── package.json
├── storage/                  # Local file storage
├── secrets/                  # YouTube OAuth credentials
└── memory/
    └── PRD.md
```

---

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control` | GET | Dashboard data |
| `/api/agents` | GET | List AI agents |
| `/api/partners` | GET/POST | Partner CRUD |
| `/api/alerts` | GET/DELETE | Alert management |
| `/api/chat` | POST | VALENTINA chatbot |
| `/api/files/upload` | POST | File upload |
| `/api/videos/process` | POST | Start video processing |
| `/api/videos/jobs` | GET | Video jobs queue |
| `/api/youtube/upload/{job_id}` | POST | Upload to YouTube |
| `/api/compliance/pending` | GET | Pending documents |
| `/api/gaia/templates` | GET/POST | Systeme.io templates |
| `/api/tts/generate` | POST | Generate TTS audio |

---

## 3rd Party Integrations

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| Anthropic Claude | VALENTINA chatbot | Emergent LLM Key |
| OpenAI TTS | Voice generation | Emergent LLM Key |
| OpenAI Whisper | Video transcription | Local installation |
| YouTube Data API v3 | Video uploads | OAuth2 (authorized) |
| FFmpeg | Video editing | Local installation |

---

## Prioritized Backlog

### P0 - Completato ✅
- [x] MVP funzionante
- [x] ANDREA Video Pipeline
- [x] Native File Manager
- [x] YouTube Integration
- [x] GAIA Funnel Deployer
- [x] OpenAI TTS
- [x] Sistema Notifiche
- [x] Dual Admin Switcher
- [x] Metriche Post-Lancio
- [x] Feed Video per Antonella
- [x] Nuovo Partner Form
- [x] Calendario Editoriale
- [x] Wizard Posizionamento

### P1 - Alta Priorità
- [ ] Autenticazione JWT (Admin vs Partner login)
- [ ] Notifiche Telegram per alert e video pronti
- [ ] API backend per Wizard Posizionamento

### P2 - Media Priorità
- [ ] Systeme.io API reale (attualmente mock data)
- [ ] Custom Intro/Outro video templates
- [ ] Course Builder AI con STEFANIA
- [ ] Cloudflare R2 migration per storage scalabile

### P3 - Bassa Priorità
- [ ] Dashboard analytics avanzate
- [ ] Mobile responsive optimization
- [ ] Multi-tenant support

---

## Next Action Items

1. **Autenticazione**: Implementare JWT login per Admin e Partner
2. **Telegram Bot**: Notifiche real-time per alert critici
3. **Systeme.io API**: Sostituire mock data con integrazione reale
4. **Testing**: Eseguire test completo di tutte le funzionalità
