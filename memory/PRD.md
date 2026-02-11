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

### V3.0 (11 Feb 2026) - Dashboard Integrata & Automazioni
- **YouTube SEO Automation**:
  - OAuth2 flow per upload automatico
  - Tag SEO predefiniti + keywords da Whisper
  - Descrizione ottimizzata per canale Evolution PRO
  - Privacy "unlisted" per Systeme.io integration

- **GAIA Funnel Deployer** (Systeme.io):
  - Template Repository con 5 categorie (Lead Gen, Masterclass, Vendita, Webinar, Altri)
  - Sistema caricamento Share Links dinamico
  - Brand Kit Injector con variabili: `{{Nome_Partner}}`, `{{Colore_Brand}}`, `{{Logo_URL}}`
  - Preview e copia link rapida

- **OpenAI TTS per Intro/Outro**:
  - 9 voci disponibili (alloy, ash, coral, echo, fable, nova, onyx, sage, shimmer)
  - Generazione audio MP3 per branding video
  - API endpoint `/api/tts/generate`

## Prioritized Backlog

### P0 - Critico (Completato)
- ✅ MVP funzionante
- ✅ ANDREA Video Pipeline (Whisper + FFmpeg)
- ✅ Native File Manager (eliminato Google Drive)
- ✅ LUCA Compliance Dashboard
- ✅ YouTube Data API v3 integration
- ✅ GAIA Funnel Deployer (Systeme.io templates)
- ✅ OpenAI TTS per voce avatar

### P1 - Alta Priorità
- [ ] **Completare OAuth YouTube**: Autorizzare l'app visitando l'URL generato
- [ ] Autenticazione JWT (Admin vs Partner login)
- [ ] Notifiche Telegram per alert e video pronti

### P2 - Media Priorità
- [ ] Systeme.io API per aggiornare automaticamente area corsi
- [ ] Custom Intro/Outro video templates (non solo audio)
- [ ] Cloudflare R2 migration per storage scalabile

### P3 - Bassa Priorità
- [ ] Dashboard analytics avanzate
- [ ] Mobile responsive optimization
- [ ] Multi-tenant support

## Next Action Items
1. **YouTube Integration**: Fornire Client ID/Secret per upload automatico video approvati
2. **Template Branding**: Caricare file intro/outro personalizzati per partner
3. **Telegram Bot**: Configurare notifiche real-time per alert e video completati
