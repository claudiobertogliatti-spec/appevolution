# Evolution PRO OS - PRD (Product Requirements Document)

## Overview
**Nome**: Evolution PRO OS Platform  
**Data creazione**: 11 Feb 2026  
**Versione**: 5.0 (Masterclass & Tutoring Update)  
**Stato**: ✅ Implementazione Completa

## Problem Statement
Creare un'applicazione full-stack proprietaria per Evolution PRO - una piattaforma di gestione partner per la creazione di videocorsi. L'applicazione elimina dipendenze da tool esterni come Descript e Google Drive, internalizzando processi di video editing e file management.

## User Personas
1. **Claudio B. (Admin - Fondatore)**: Gestisce l'intero ecosistema, monitora agenti AI, partner, metriche post-lancio e alert
2. **Antonella B. (Admin - Operations)**: Focus su gestione operativa partner, feed video editing, compliance
3. **Partner (Marco Ferretti, Sara Lombardi, etc.)**: Business coach e consulenti che seguono il percorso formativo

## Technical Stack
- **Frontend**: React 19, Tailwind CSS, Lucide Icons
- **Backend**: FastAPI (Python), MongoDB (Motor)
- **AI Integration**: Claude Sonnet via Emergent LLM Key
- **Voice**: OpenAI TTS & Whisper
- **Video Processing**: FFmpeg
- **YouTube Integration**: YouTube Data API v3 (OAuth2)

---

## What's Been Implemented

### V1.0 - V3.0 (Completati)
- Dashboard Admin/Partner, Chatbot VALENTINA
- Pipeline video ANDREA (Whisper + FFmpeg)
- Native File Manager, LUCA Compliance
- YouTube Data API, GAIA Funnel Deployer, OpenAI TTS

### V4.0 (Completato)
- Sistema Notifiche, Dual Admin Switcher
- Metriche Post-Lancio, Feed Video per Antonella
- Nuovo Partner Form, Calendario Editoriale, Wizard Posizionamento

### V5.0 - Masterclass & Tutoring (11 Feb 2026) ✅

#### 1. Modulo Masterclass Trasformativa
- **Script Builder a 6 Blocchi** con UI dedicata:
  - 🎯 Hook - Distruzione dello Status Quo
  - ⭐ Grande Promessa - Risultato Specifico & Desiderabile
  - 🔷 Il Metodo - Framework Proprietario in 3 Pilastri
  - 👥 Case History - Prova Sociale con Numeri Reali
  - 🎁 Offerta - Stack di Valore Irresistibile
  - ⚡ CTA - Call to Action Urgente
- Progress bar e hint strategici per ogni blocco
- Pulsanti "Salva Bozza" e "Invia a STEFANIA"

#### 2. Tutor Dinamico STEFANIA
- **Switch automatico** da VALENTINA a STEFANIA quando partner entra in F3/F4
- **Chat AI specializzata** in copywriting persuasivo
- **Feedback correttivo** su contenuto troppo "accademico"
- **Alert Admin** se script non sufficientemente persuasivo
- **Review automatica** dello script completo

#### 3. Brand Kit Editor
- Color picker per colori brand (primario + secondario)
- Upload logo URL
- Tagline/Slogan
- Info contatto (email, website)
- Social media (Instagram, LinkedIn, YouTube)
- **Variabili per Systeme.io**: `{{Brand_Color}}`, `{{Logo_URL}}`, `{{Nome_Partner}}`, `{{Tagline}}`

#### 4. GAIA Templates Repository
- **Masterclass Transformation Template** (opt-in, watch page, email sequence)
- Lead Gen - Freebie Download
- Webinar Evergreen Funnel
- Sales Page PRO - Long Form
- Brand variables pre-configurate

#### 5. Knowledge Base
- VALENTINA e STEFANIA citano moduli specifici
- Guidano l'utente agli strumenti interni della Dashboard
- Eliminati riferimenti a Drive e Telegram

---

## Code Architecture

```
/app
├── backend/
│   ├── server.py             # Main FastAPI + Stefania endpoints
│   ├── video_processor.py    # Video editing (FFmpeg, Whisper)
│   ├── file_storage.py       # Local file management
│   ├── youtube_uploader.py   # YouTube API & OAuth
│   ├── tts_generator.py      # OpenAI TTS
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── common/       # NotificationBell, AdminSwitcher
│   │   │   ├── admin/        # MetrichePostLancio, FeedVideoNuovi, NuovoPartnerForm
│   │   │   └── partner/      # MasterclassBuilder, StefaniaChat, BrandKitEditor,
│   │   │                     # CalendarioEditoriale, WizardPosizionamento
│   │   └── data/constants.js
│   └── package.json
├── storage/
├── secrets/
└── memory/PRD.md
```

---

## Key API Endpoints (Nuovi)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stefania/chat` | POST | Chat con tutor STEFANIA |
| `/api/stefania/review-script` | POST | Review automatica script |
| `/api/masterclass/script/{id}` | GET/POST | CRUD script Masterclass |
| `/api/masterclass/script/{id}/submit` | POST | Invia script per review |
| `/api/brandkit/{id}` | GET/POST | CRUD Brand Kit partner |
| `/api/notifications` | GET | Lista notifiche |
| `/api/notifications/{id}/read` | POST | Segna notifica letta |

---

## Tutor Dinamico - Logica

```
Partner Phase:
├── F0, F1, F2 → VALENTINA (Supporto generale)
├── F3, F4     → STEFANIA (Copy & Marketing Tutor)
└── F5 - F10  → VALENTINA (Supporto generale)
```

STEFANIA si attiva automaticamente per le fasi **Masterclass** e **Struttura Corso**.

---

## 3rd Party Integrations

| Service | Purpose | Auth |
|---------|---------|------|
| Anthropic Claude | VALENTINA + STEFANIA chatbot | Emergent LLM Key |
| OpenAI TTS | Voice generation | Emergent LLM Key |
| OpenAI Whisper | Video transcription | Local |
| YouTube API v3 | Video uploads | OAuth2 |
| FFmpeg | Video editing | Local |

---

## Prioritized Backlog

### P0 - Completato ✅
- [x] Tutte le funzionalità V1.0 - V5.0

### P1 - Alta Priorità
- [ ] Autenticazione JWT (Admin vs Partner login)
- [ ] Notifiche Telegram per alert critici
- [ ] Deploy su custom domain `app.evolution-pro.it`

### P2 - Media Priorità
- [ ] Systeme.io API reale (attualmente template links)
- [ ] Pipeline ANDREA integrata nel tab Produzione
- [ ] Custom Intro/Outro video templates

### P3 - Bassa Priorità
- [ ] Course Builder AI avanzato
- [ ] Mobile responsive optimization

---

## Testing Status
- Build frontend: ✅ Successo
- Build backend: ✅ Successo
- API Stefania Chat: ✅ Funzionante
- API Masterclass Script: ✅ Funzionante
- API Notifications: ✅ Funzionante
- UI Masterclass Builder: ✅ Funzionante
- UI Brand Kit Editor: ✅ Funzionante
- Tutor dinamico: ✅ Funzionante

---

## Next Action Items
1. Implementare JWT authentication
2. Integrare Telegram Bot per notifiche
3. Collegare domain `app.evolution-pro.it`
