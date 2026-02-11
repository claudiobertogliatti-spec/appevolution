# Evolution PRO - PRD (Product Requirements Document)

## Overview
**Nome**: Evolution PRO OS Platform  
**Data creazione**: 11 Feb 2026  
**Versione**: 2.0  
**Stato**: MVP + Video Pipeline Completato ✅

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

## What's Been Implemented (11 Feb 2026)

### Backend (`/app/backend/server.py`)
- API `/api/agents` - CRUD agenti AI
- API `/api/partners` - CRUD partner
- API `/api/alerts` - Gestione alert
- API `/api/modules` - Moduli videocorso
- API `/api/chat` - Chatbot VALENTINA con Claude
- API `/api/stats` - Statistiche dashboard
- Seed data automatico su startup

### Frontend (`/app/frontend/src/App.js`)
- Sidebar con switch Admin/Partner
- Admin Overview con KPI cards
- Admin Agenti AI grid
- Admin Partner Pipeline (table + kanban)
- Admin Alert list con dismiss
- Partner Videocorso con YouTube player
- Partner File Manager
- Partner Resources/Templates
- Partner VALENTINA Chat

## Prioritized Backlog

### P0 - Critico (Completato)
- ✅ MVP funzionante end-to-end

### P1 - Alta Priorità
- [ ] Autenticazione JWT (Admin vs Partner login)
- [ ] Upload file reale su cloud storage (S3/Cloudinary)
- [ ] Gestione stato moduli dal database

### P2 - Media Priorità
- [ ] Dashboard ANDREA per editing pipeline
- [ ] Notifiche email/Telegram per alert
- [ ] Export dati partner in CSV/PDF
- [ ] Integrazione Systeme.io API

### P3 - Bassa Priorità
- [ ] Dark/Light mode toggle
- [ ] Localizzazione multi-lingua
- [ ] Mobile responsive optimization
- [ ] Analytics e reportistica avanzata

## Next Action Items
1. Aggiungere autenticazione per separare accesso Admin/Partner
2. Implementare upload file reale invece di simulato
3. Collegare progressi moduli al database per persistenza
