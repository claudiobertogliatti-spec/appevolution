# Evolution PRO - PRD (Product Requirements Document)

## Overview
**Nome**: Evolution PRO OS Platform  
**Data creazione**: 11 Feb 2026  
**Versione**: 3.0  
**Stato**: Dashboard Integrata Completa ✅

## Problem Statement
Creare un'applicazione full-stack basata su Evolution PRO - una piattaforma di gestione partner per la creazione di videocorsi. L'applicazione include:
- Dashboard Admin per gestire agenti AI, pipeline partner, alert
- Area Partner con videocorso, file manager, chatbot AI VALENTINA
- Sistema di fasi (F0-F10) per il percorso formativo

## User Personas
1. **Admin (Claudio B.)**: Fondatore che gestisce l'intero ecosistema, monitora agenti AI, partner e alert
2. **Partner (Marco Ferretti, Sara Lombardi, etc.)**: Business coach e consulenti che seguono il percorso formativo

## Core Requirements
- ✅ Dashboard Admin con KPI e metriche
- ✅ Griglia Agenti AI con status e budget
- ✅ Pipeline Partner visualizzata per fasi
- ✅ Sistema Alert & Escalation
- ✅ Area Partner con Videocorso (YouTube integration)
- ✅ File Manager per fase
- ✅ Chatbot VALENTINA con Claude AI (Emergent LLM Key)
- ✅ Persistenza dati su MongoDB

## Technical Stack
- **Frontend**: React 19, Tailwind CSS, Lucide Icons
- **Backend**: FastAPI (Python), MongoDB (Motor)
- **AI Integration**: Claude Sonnet via Emergent LLM Key
- **Design**: Dark theme (Navy #1a2332, Yellow #F5C518)

## What's Been Implemented

### V1.0 (11 Feb 2026) - MVP
- Dashboard Admin con KPI
- Griglia 9 Agenti AI
- Pipeline Partner
- Alert & Escalation
- Videocorso Partner con YouTube
- Chatbot VALENTINA (Claude AI)
- MongoDB persistence

### V2.0 (11 Feb 2026) - Video Pipeline & Native Storage
- **ANDREA Pipeline "Surgical Cut"**:
  - Auto-Trim silenzi > 0.4s (FFmpeg silencedetect)
  - Rilevamento intercalari italiani (Whisper locale)
  - Pace-Maker 1.15x con pitch correction
  - Normalizzazione audio -14 LUFS
  - Branding automatico Intro/Outro
  - Video Approval UI con preview
  - YouTube-ready post-approvazione

- **Native File Manager** (elimina Google Drive):
  - Storage interno persistente
  - Partner Upload per video e documenti
  - Internal linking per agenti
  - Statistiche storage real-time

- **LUCA Compliance Dashboard**:
  - Lista documenti da verificare
  - Anteprima rapida
  - Workflow verifica/rifiuto
  - Metriche compliance

### Tech Stack Additions
- `openai-whisper` (locale) per transcription
- `ffmpeg-python` + FFmpeg CLI per video processing
- `aiofiles` per async file handling
- Background tasks per processing asincrono

## Prioritized Backlog

### P0 - Critico (Completato)
- ✅ MVP funzionante end-to-end
- ✅ ANDREA Video Pipeline con Whisper + FFmpeg
- ✅ Native File Manager (eliminato Google Drive)
- ✅ LUCA Compliance Dashboard

### P1 - Alta Priorità
- [ ] YouTube Data API v3 integration per upload automatico
- [ ] Autenticazione JWT (Admin vs Partner login)
- [ ] Notifiche Telegram per alert e video pronti
- [ ] Systeme.io API per aggiornare area corsi partner

### P2 - Media Priorità
- [ ] Custom Intro/Outro templates per partner (upload assets)
- [ ] Voce avatar generata via TTS per intro/outro
- [ ] Export dati partner in CSV/PDF
- [ ] Cloudflare R2 migration per storage scalabile

### P3 - Bassa Priorità
- [ ] Dark/Light mode toggle
- [ ] Localizzazione multi-lingua
- [ ] Mobile responsive optimization
- [ ] Analytics e reportistica avanzata

## Next Action Items
1. **YouTube Integration**: Fornire Client ID/Secret per upload automatico video approvati
2. **Template Branding**: Caricare file intro/outro personalizzati per partner
3. **Telegram Bot**: Configurare notifiche real-time per alert e video completati
