# Evolution PRO OS - PRD (Product Requirements Document)

## Overview
**Nome**: Evolution PRO OS Platform  
**Data creazione**: 11 Feb 2026  
**Versione**: 12.0 (Systeme.io MCP Full Integration)  
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
- **Systeme.io**: API + MCP Integration per agenti AI

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

### V7.0 - STEFANIA War Mode Multi-Channel (11 Feb 2026) ✅

### V8.0 - ATLAS Post-Sale & LTV Module (11 Feb 2026) ✅

### V9.0 - Course Builder AI & Renewal Plans (11 Feb 2026) ✅

#### 1. Course Builder AI Wizard (STEFANIA)
- **Wizard preferenze**: Selezione Durata (4/8 settimane, Self-paced), Livello (Principiante/Intermedio/Avanzato), Formato (Video/PDF/Workbook)
- **Generazione AI**: STEFANIA genera struttura corso completa con moduli e lezioni
- **Editor interattivo**: Modifica moduli/lezioni con chat STEFANIA integrata
- **API Endpoint**: `/api/stefania/course-builder/generate`, `/api/stefania/course-builder/chat`, `/api/stefania/course-builder/save`
- **Fallback Mock**: Quando LLM non disponibile, usa template predefinito

#### 2. Renewal Plans (Piani Post-12 Mesi)
- **Evolution Top**: €97/mese + 10% revenue - Mantenimento base
- **Evolution Elite**: €247/mese + 10% revenue - Ottimizzazione e scaling
- **Evolution Star**: €397/mese + 10% revenue - Full management
- **Interfaccia**: Card comparative con features, conferma modale

#### 3. Agenti AI Completi (9 totali)
- MAIN (Sistema Centrale)
- VALENTINA (Orchestratrice)
- ORION (Sales Intelligence)
- MARTA (CRM & Revenue)
- GAIA (Funnel & Incident)
- ANDREA (Video Production)
- STEFANIA (Copy & Traffico)
- LUCA (Compliance)
- ATLAS (Post-Sale & LTV)

### V11.0 - Partner Journey "Cosa fare ora" (12 Feb 2026) ✅

#### 1. PhaseProgressBar
- Barra progresso visiva con 11 fasi (F0-F10)
- Percentuale completamento dinamica
- Indicatori checkmark per fasi completate
- Glow effect sulla fase corrente

#### 2. PartnerCurrentPhase (Home Partner)
- Card "Azione corrente" con titolo, descrizione, CTA
- Tutor dinamico assegnato per fase (VALENTINA, STEFANIA, ANDREA)
- Colore personalizzato per fase
- "Strumenti disponibili ora" - grid con tool contestuali

#### 3. PHASE_ACTIONS & PHASE_TOOLS
- Mappatura completa F0-F10 con azioni specifiche
- CTA contestuali che navigano alle sezioni corrette
- Tutor assignment automatico per fase

#### 4. Sidebar Admin Riorganizzata
- Menu "Strumenti" collapsabile per Claudio
- Navigazione semplificata per Antonella
- Badge "NOW" su "Cosa fare ora" per Partner

---

#### 5. Dynamic Content Unlock (Gamification)
- Sistema di punti per studenti Academy
- Bonus content che si sblocca automaticamente
- Condizioni: progress_50, progress_100, referral_1, referral_3, streak_7, feedback_given
- Tracking automatico progressi e moduli completati

#### 2. Feedback-to-Copy Bridge
- Raccolta feedback studenti (testimonial, domande, commenti)
- Analisi AI con STEFANIA per estrarre copy angles
- Tipi: pain_point, success_story, objection, desire
- Score di rilevanza per prioritizzazione

#### 3. LTV Dashboard
- **Student Funnel**: totali, attivi, completati, churned
- **Completion Rate**: percentuale completamento corso
- **Referral Performance**: tracking e conversione referral
- **Gamification Stats**: punti totali, bonus sbloccati, top performers
- **Asset Value**: calcolo valore totale dell'Academy

#### 4. Real-Time API Integration (Meta + LinkedIn)
- Connessione API Meta Ads Manager
- Connessione API LinkedIn Campaign Manager
- Smart-Optimization con threshold CPL dal Business Plan
- ROI Calculator con dati CRM da MARTA

#### 5. Copy Factory Admin
- **Admin Review Mode**: Claudio/Antonella possono editare script prima dell'approvazione Partner
- **Master Input Database**: 4 Success Cases Evolution PRO con Hook examples
- **10 Regole d'Oro del Copy Core**: Integrate nel Drafting Engine (Schwartz, Brown, Halbert, Kennedy)
- **Drafting Engine**: STEFANIA genera bozze complete dei 6 blocchi

#### 2. War Mode Multi-Channel (Meta + LinkedIn)
- **Hook Gallery (Meta)**: 3 varianti per video ads
  - Angolo del Dolore (Emotional Trigger)
  - Angolo del Segreto (Curiosity Gap)
  - Angolo del Risultato (Social Proof)
- **LinkedIn Content Hub**:
  - Thought Leadership Posts
  - ABM Targeting Ads
  - Lead Gen Forms nativi
- **Auto-Pivot Logic**: Se CPL Meta supera soglia, suggerisce shift budget a LinkedIn
- **LTV Tracking**: Confronto Lifetime Value tra piattaforme

#### 3. Performance Bridge
- **Cross-Platform Analysis**: Confronto ROAS/CPL tra Meta e LinkedIn
- **Alert System**: Notifiche automatiche per CPL alto o ROAS basso
- **UTM Generator**: Link tracciati con parametri Evolution PRO

#### 4. Pre-Flight Checklist (v6.0)
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

## Key API Endpoints (Course Builder v9.0)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stefania/course-builder/generate` | POST | Genera struttura corso con AI |
| `/api/stefania/course-builder/chat` | POST | Chat con STEFANIA per modifiche |
| `/api/stefania/course-builder/save` | POST | Salva struttura finale |
| `/api/stefania/course-builder/{partner_id}` | GET | Recupera struttura salvata |

---

## Testing Status
- Build frontend: ✅ Successo
- Build backend: ✅ Successo
- API ANDREA Chat: ✅ Funzionante
- API Pre-Flight: ✅ Funzionante
- API Video Blocks: ✅ Funzionante
- UI Produzione Video: ✅ Funzionante
- Tutor dinamico: ✅ Funzionante (VALENTINA→STEFANIA→ANDREA)
- Course Builder Wizard: ✅ Funzionante
- Renewal Plans: ✅ Funzionante
- 9 Agenti AI: ✅ Tutti presenti

---

## Prioritized Backlog

### P0 - Completato ✅
- [x] Tutte le funzionalità V1.0 - V9.0
- [x] STEFANIA Copy Factory con Admin Review
- [x] War Mode Multi-Channel (Meta/LinkedIn)
- [x] Auto-Pivot Cross-Platform Analysis
- [x] ATLAS Post-Sale & LTV Module
- [x] Feedback-to-Copy Bridge
- [x] Dynamic Content Unlock (Gamification)
- [x] Real-Time API Integration Framework
- [x] Course Builder AI Wizard
- [x] Renewal Plans Post-12 Mesi
- [x] Systeme.io Live Data Integration (V10.0)

### P1 - Alta Priorità
- [ ] Autenticazione JWT (Admin vs Partner login)
- [ ] Notifiche Telegram per alert critici
- [ ] Deploy su `app.evolution-pro.it`

### P2 - Media Priorità
- [ ] Collegamento API reale Meta/LinkedIn Ads (credenziali user)
- [x] Systeme.io API Integration ✅ (Demo + API reale quando connesso)
- [ ] Knowledge Base: VALENTINA/STEFANIA/ANDREA citano moduli specifici
- [ ] Custom Intro/Outro video templates

### P3 - Bassa Priorità
- [ ] Mobile responsive optimization
- [ ] A/B testing automatico degli hook

---

## API Endpoints (Systeme.io v10.0)

### Systeme.io Live Data
- `POST /api/systeme/credentials` - Salva credenziali API Systeme.io
- `GET /api/systeme/status/{partner_id}` - Stato connessione
- `POST /api/systeme/sync` - Sincronizza contatti da Systeme.io
- `GET /api/systeme/stats/{partner_id}` - Statistiche aggregate (contatti, conversioni, funnel)
- `GET /api/systeme/contacts/{partner_id}` - Lista contatti sincronizzati
- `GET /api/systeme/dashboard/{partner_id}` - Dashboard completa
- `DELETE /api/systeme/disconnect/{partner_id}` - Disconnetti integrazione

---

## API Endpoints (ATLAS v8.0)

### Academy Students
- `GET /api/atlas/students/{partner_id}` - Lista studenti
- `POST /api/atlas/students/enroll` - Iscrivi studente
- `POST /api/atlas/students/{id}/progress` - Aggiorna progresso

### Bonus Content (Gamification)
- `GET /api/atlas/bonuses/{partner_id}` - Lista bonus
- `POST /api/atlas/bonuses` - Crea bonus

### Feedback-to-Copy Bridge
- `POST /api/atlas/feedback` - Submit feedback
- `GET /api/atlas/feedback/{partner_id}` - Lista feedback
- `POST /api/atlas/feedback/analyze/{partner_id}` - Analizza con STEFANIA
- `GET /api/atlas/copy-angles/{partner_id}` - Angoli estratti

### LTV Dashboard
- `GET /api/atlas/ltv-dashboard/{partner_id}` - Dashboard completa
- `POST /api/atlas/referral/create` - Crea referral
- `GET /api/atlas/referrals/{partner_id}` - Lista referral

### Real-Time API
- `POST /api/stefania/api/store-credentials` - Salva credenziali Meta/LinkedIn
- `POST /api/stefania/api/sync-metrics/{partner_id}` - Sync metriche real-time
- `GET /api/stefania/api/roi/{partner_id}` - Calcola ROI con CRM

---

## Next Action Items
1. Implementare JWT authentication
2. Integrare Telegram Bot per notifiche
3. Collegare domain `app.evolution-pro.it`
4. Dashboard Metriche Post-Lancio Avanzata (NPS, grafici, visualizzazione funnel studenti)
5. ACADEMY_VIDEOS - Sistema micro-learning video
