# Evolution PRO OS - PRD (Product Requirements Document)

## Overview
**Nome**: Evolution PRO OS Platform  
**Data creazione**: 11 Feb 2026  
**Versione**: 6.0 (Produzione Video Update)  
**Stato**: ✅ Implementazione Completa

## Problem Statement
Creare un'applicazione full-stack proprietaria per Evolution PRO - una piattaforma di gestione partner per la creazione di videocorsi. L'applicazione elimina dipendenze da tool esterni come Descript e Google Drive, internalizzando processi di video editing e file management.

## User Personas
1. **Claudio B. (Admin - Fondatore)**: Gestisce l'intero ecosistema
2. **Antonella B. (Admin - Operations)**: Focus su gestione operativa
3. **Partner**: Business coach e consulenti

## Technical Stack
- **Frontend**: React 19, Tailwind CSS
- **Backend**: FastAPI (Python), MongoDB
- **AI Integration**: Claude Sonnet via Emergent LLM Key
- **Video**: FFmpeg, OpenAI Whisper
- **YouTube**: Data API v3 (OAuth2)

---

## What's Been Implemented

### V1.0 - V4.0 (Completati)
- Dashboard Admin/Partner, Chatbot VALENTINA
- Pipeline video ANDREA (Whisper + FFmpeg)
- Native File Manager, LUCA Compliance
- YouTube API, GAIA Funnel Deployer, OpenAI TTS
- Sistema Notifiche, Dual Admin Switcher
- Metriche Post-Lancio, Feed Video per Antonella
- Nuovo Partner Form, Calendario Editoriale, Wizard Posizionamento

### V5.0 - Masterclass & Tutoring (Completato)
- Script Builder a 6 Blocchi
- Tutor Dinamico STEFANIA (F3/F4)
- Brand Kit Editor
- GAIA Templates Repository

### V6.0 - Produzione Video ANDREA (11 Feb 2026) ✅

#### 1. Pre-Flight Checklist
- **6 items verificabili** con toggle interattivo:
  - ☐ Sfondo ordinato e professionale
  - ☐ Luce frontale (ring light o finestra)
  - ☐ Microfono a 15-20cm
  - ☐ Inquadratura dal petto in su
  - ☐ Ambiente silenzioso
  - ☐ Script pronto sul teleprompter
- Blocco progressivo: Teleprompter visibile solo dopo checklist completa

#### 2. Teleprompter Intelligente
- **Script diviso in 6 blocchi** (basato su output STEFANIA)
- Ogni blocco con:
  - Script content leggibile
  - Tip di registrazione specifico
  - Pulsante Upload video
  - Status: pending → uploaded → approved
- Registrazione blocco per blocco

#### 3. ANDREA Chat - Video Production Coach
- **Switch automatico** quando partner entra in F5
- Coaching su:
  - Setup tecnico (audio, video, inquadratura)
  - Energy coaching ("Alza il volume del 20%")
  - Feedback post-upload
- Prompt specializzato per ogni fase:
  - `setup` → Guida Pre-Flight Check
  - `recording` → Coaching energetico
  - `review` → Feedback video caricato

#### 4. Surgical Cut Integration
- Upload video per blocco → trigger Surgical Cut automatico
- Auto-trim silenzi (>0.4s)
- Pace-Maker (1.15x speed)
- Notifica quando processing completato

#### 5. Assembly Finale
- Pulsante "Assembla Video Finale" (visibile quando tutti blocchi approvati)
- Concatenazione con Intro/Outro brandizzate
- Upload automatico YouTube con Tag SEO

---

## Tutor Dinamico - Logica Aggiornata

```
Partner Phase:
├── F0, F1, F2    → VALENTINA (Supporto generale)
├── F3, F4        → STEFANIA (Copy & Marketing)
├── F5            → ANDREA (Video Production)
└── F6 - F10      → VALENTINA (Supporto generale)
```

---

## Code Architecture

```
/app
├── backend/
│   ├── server.py             # FastAPI + ANDREA/STEFANIA endpoints
│   ├── video_processor.py    # Surgical Cut (FFmpeg, Whisper)
│   ├── file_storage.py
│   ├── youtube_uploader.py
│   └── tts_generator.py
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── common/       # NotificationBell, AdminSwitcher
│   │   │   ├── admin/        # MetrichePostLancio, FeedVideoNuovi...
│   │   │   └── partner/      # ProduzioneVideo, AndreaChat, MasterclassBuilder,
│   │   │                     # StefaniaChat, BrandKitEditor...
│   │   └── data/constants.js
│   └── package.json
└── memory/PRD.md
```

---

## Key API Endpoints (ANDREA)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/andrea/chat` | POST | Chat con tutor ANDREA |
| `/api/andrea/preflight/{id}` | GET/POST | Gestione Pre-Flight Checklist |
| `/api/andrea/blocks/{id}` | GET | Lista blocchi video |
| `/api/andrea/blocks/{id}/{block}/upload` | POST | Upload video blocco |
| `/api/andrea/blocks/{id}/{block}/approve` | POST | Approva blocco |
| `/api/andrea/assembly/{id}` | POST | Assembla video finale |

---

## Testing Status
- Build frontend: ✅ Successo
- Build backend: ✅ Successo
- API ANDREA Chat: ✅ Funzionante
- API Pre-Flight: ✅ Funzionante
- API Video Blocks: ✅ Funzionante
- UI Produzione Video: ✅ Funzionante
- Tutor dinamico: ✅ Funzionante (VALENTINA→STEFANIA→ANDREA)

---

## Prioritized Backlog

### P0 - Completato ✅
- [x] Tutte le funzionalità V1.0 - V6.0

### P1 - Alta Priorità
- [ ] Autenticazione JWT (Admin vs Partner login)
- [ ] Notifiche Telegram per alert critici
- [ ] Deploy su `app.evolution-pro.it`

### P2 - Media Priorità
- [ ] Systeme.io API reale
- [ ] Knowledge Base: VALENTINA/STEFANIA/ANDREA citano moduli specifici
- [ ] Custom Intro/Outro video templates

### P3 - Bassa Priorità
- [ ] Mobile responsive optimization

---

## Next Action Items
1. Implementare JWT authentication
2. Integrare Telegram Bot per notifiche
3. Collegare domain `app.evolution-pro.it`
