# Evolution PRO OS - PRD (Product Requirements Document)

## Overview
**Nome**: Evolution PRO OS Platform  
**Data creazione**: 11 Feb 2026  
**Versione**: 15.0 (Webhooks & Automations)  
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
- **Systeme.io**: API + MCP Integration + Webhooks per automazioni

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
- **Generazione AI REALE**: STEFANIA genera struttura corso completa con Claude AI (Fixed 13 Feb 2026)
- **Editor interattivo**: Modifica moduli/lezioni con chat STEFANIA integrata
- **API Endpoint**: `/api/stefania/course-builder/generate`, `/api/stefania/course-builder/chat`, `/api/stefania/course-builder/save`
- **Bug Fix**: Corretto parsing risposta LLM (response invece di response.text)

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

### V14.0 - Design System Evolution PRO Rebrand (13 Feb 2026) ✅

#### 1. Nuovo Design System CSS
- **Colore primario brand**: #F2C418 (Giallo oro)
- **LIGHT THEME COMPLETO** (13 Feb 2026): Sfondo bianco #FAFAF7, testo nero #1E2128
- **Dark theme rimosso**: Tutta l'app ora in light theme
- **Accenti**: Verde #2D9F6F, Viola #7B68AE
- File: `/app/frontend/src/styles/design-system.css`
- CSS Variables: `/app/frontend/src/App.css` (--evo-bg, --evo-surface, --evo-text)

#### 2. Light Theme Fix (13 Feb 2026)
- **Pagina Login**: Sfondo bianco con card ombreggiata
- **Dashboard Admin/Partner**: Background #FAFAF7
- **Tutte le sezioni**: Documenti, VALENTINA Chat, Post-Lancio, Editing
- **Modali**: Overlay bg-black/40 con content bianco
- **Componenti UI**: Tutti aggiornati (sheet, dialog, drawer, alert-dialog)

#### 2. Nuova Sidebar Partner
- Logo "Evolution PRO" con colori brand
- Card utente gialla con avatar, nome, fase e progress bar
- Menu "Il tuo percorso" con 6 step navigabili
- Badge "NUOVO" per evidenziare nuove sezioni
- Sezione "Strumenti" separata
- Pulsante "Parla con Valentina" prominente
- Footer con Aiuto e Esci
- File: `/app/frontend/src/components/partner/PartnerSidebar.jsx`

#### 3. Dashboard Partner Semplificata
- Hero card arancione "Cosa fare ora"
- Barra progresso visiva
- Lista step con check verdi per completati
- Celebrazione animata al completamento
- FAB Valentina sempre visibile

#### 4. Partner Dashboard V2 - Gamification Update (13 Feb 2026)
- **Banner di benvenuto dinamico**: Saluto basato sull'ora (Buongiorno/Buon pomeriggio/Buonasera)
- **Banner evento live**: Con promemoria WhatsApp integrato
- **Tempi stimati**: Ogni step mostra durata stimata (~2 min, ~10 min, etc.)
- **Sistema Achievement**: 6 badge sbloccabili (Primo Passo, Posizionato, Maestro, Regista, Online!, Top Partner)
- **Sezione Risorse**: Guide, Video, Template, Brand Kit con card cliccabili
- **Sezione Risultati**: Statistiche Clienti, Rating, Crescita, Traguardi
- **Pulsanti "Serve aiuto?"**: Video tutorial su ogni sezione

### V15.0 - Systeme.io Webhooks & Automations (13 Feb 2026) ✅

#### 1. Webhook Endpoint
- **URL**: `/api/webhooks/systeme`
- **Eventi supportati**: new_sale, new_subscriber, tag_added, course_access, refund
- **Verifica firma**: HMAC-SHA256 con secret key
- **Logging**: Tutti gli eventi loggati in `webhook_logs` collection

#### 2. Auto-Onboarding Partner
- **Trigger**: `new_sale` con prodotto partner
- **Azioni**: Crea partner, account utente, notifica Telegram, registra pagamento

#### 3. Lead Scoring (ORION)
- **Trigger**: `new_subscriber`, `form_subscribed`
- **Scoring automatico**: form +10, webinar +25, call +50, vendita +100

#### 4. Auto-Progressione Fasi
- **Trigger**: `tag_added`
- **Tag supportati**: F0-Completato, F1-Completato, etc.

#### 5. Dashboard Admin Webhooks
- **File**: `/app/frontend/src/components/admin/WebhookDashboard.jsx`
- **Features**: URL webhook, statistiche, log eventi, lead scoring

### V16.0 - Funnel Review & Masterclass Studio (13 Feb 2026) ✅

#### 1. Funnel Review Builder
- **File**: `/app/frontend/src/components/partner/FunnelReviewBuilder.jsx`
- **Features**:
  - Wizard a 4 step: Opt-in → Masterclass → Ordine+Email → Thank You
  - Andrea AI come tutor che prepara contenuto per ogni sezione
  - Anteprima form cattura lead
  - 6 email automatiche pre-configurate con timing
  - Barra di stato con contatore approvazioni
  - Pulsante "Lancia il Funnel" quando tutto approvato
  - Modale celebrazione lancio

#### 2. Masterclass & Videocorso Studio con Opzioni Premium
- **File**: `/app/frontend/src/components/partner/MasterclassVideocorso.jsx`
- **Opzioni di Produzione**:
  - **🤖 Avatar + Voice Clone (PREMIUM)**: €120/video IVA inclusa
    - Avatar professionale con sembianze partner
    - Voice clone della voce reale
    - Montaggio e post-produzione inclusi
    - Consegna 48-72 ore
    - Revisioni illimitate
  - **🎬 Registra in Autonomia (INCLUSO)**: €0/video
    - Partner registra con smartphone
    - Andrea fa editing professionale
    - Grafiche, titoli, transizioni, musica incluse
- **Selezione Mix**: Partner può scegliere quali lezioni delegare ad Avatar e quali fare in autonomia
- **Riepilogo dinamico**: Totale automatico basato su selezione
- **🎁 Prova Gratuita Avatar**: Sample 30 secondi gratuito
  - Step 1: Carica foto frontale
  - Step 2: Registra campione vocale 10-15 sec
  - Step 3: Genera e visualizza Avatar sample
  - Consigli per foto perfetta (illuminazione, sfondo, risoluzione)
- **Tab Masterclass**: Scaletta 5 blocchi + Setup registrazione
- **Tab Videocorso**: 8 lezioni con indicazioni regista AI

#### 3. Sidebar Partner Aggiornata
- Nuova voce "Il tuo Funnel" con badge NUOVO
- Voce "Masterclass" rinominata in "Masterclass & Videocorso"

#### 4. App.js Ristrutturato
- Sidebar condizionale (PartnerSidebar vs Admin)
- Sfondo dinamico (chiaro per Partner, scuro per Admin)
- Topbar solo per Admin
- Colori brand coordinati in tutta l'app

### V17.0 - HeyGen Avatar Integration (13 Feb 2026) ✅

#### 1. Backend Integration
- **File**: `/app/backend/heygen_service.py`
- **API Key configurata**: `HEYGEN_API_KEY` in `.env`
- **Connessione verificata**: ✅ 1290 avatars, 2332 voices disponibili

#### 2. API Endpoints
- `GET /api/heygen/status`: Verifica connessione API
- `GET /api/heygen/avatars`: Lista avatar disponibili
- `GET /api/heygen/voices`: Lista voci disponibili
- `POST /api/heygen/sample/generate`: Genera sample gratuito 30 sec
- `GET /api/heygen/sample/{video_id}/status`: Stato generazione sample
- `POST /api/heygen/lesson/generate`: Genera video lezione (€120)
- `POST /api/heygen/order`: Crea ordine Avatar multiplo
- `GET /api/heygen/orders/{partner_id}`: Ordini partner
- `GET /api/heygen/lessons/{partner_id}`: Video lezioni partner

#### 3. Database Collections
- `avatar_samples`: Sample gratuiti generati
- `avatar_lessons`: Video lezioni pagate
- `avatar_orders`: Ordini Avatar

#### 4. Frontend (Prova Gratuita)
- Upload foto partner
- Registrazione campione vocale
- Generazione sample 30 sec
- Preview video risultato
### V13.0 - JWT Authentication & Telegram Notifications (13 Feb 2026) ✅

#### 1. JWT Authentication System
- **Login Page**: UI completa con branding Evolution PRO
- **Token Management**: Salvataggio in localStorage, verifica automatica
- **Role-based Access**: Admin vede toggle Admin/Partner, Partner solo Partner view
- **Logout**: Pulsante logout funzionante con pulizia sessione
- **Default Users**: claudio@evolutionpro.it, antonella@evolutionpro.it (auto-seed)

#### 2. Telegram Bot Notifications
- **Bot**: @valentina_evo_bot (Valentina Evolution Pro)
- **Admin Setup**: `/api/telegram/setup-admin` per registrare admin
- **Test Endpoint**: `/api/telegram/test` per verificare funzionamento
- **Notification Types**: Alert sistema, nuovi partner, fasi completate
- **Chat ID Admin**: 852111182 (Claudio Bertogliatti)
- **Auto-Notification**: Notifica Telegram automatica al cambio fase partner

#### 3. Partner Documents Admin View
- **Nuova sezione Admin**: "Documenti Partner" nella sidebar
- **Tabella riassuntiva**: Tutti i partner con stato documenti
- **Colonne**: Posizionamento, Script Masterclass, Struttura Corso
- **Badge di stato**: completed, ai_draft, in_review, not_started
- **Modal dettagli**: Visualizza contenuto completo con 3 tab
- **API Endpoints**:
  - `POST /api/positioning/save` - Salva posizionamento partner
  - `GET /api/positioning/{partner_id}` - Recupera posizionamento
  - `GET /api/partner-documents/{partner_id}` - Tutti i documenti partner
  - `GET /api/partner-documents/all/summary` - Riassunto per Admin

#### 4. Partner Profile Complete View
- **Modal Profilo Completo**: Click su partner dalla lista
- **3 Colonne Layout**:
  - Anagrafica (email, telefono, azienda, P.IVA, nicchia)
  - Social (Instagram, LinkedIn, YouTube)
  - Contratto (tipo, data inizio, scadenza, giorni rimanenti)
  - Pagamenti (lista pagamenti, revenue totale)
  - Progresso (fase attuale, barra progresso, moduli completati)
  - Documenti (posizionamento, script, corso)
- **Funzionalità**:
  - **Modifica**: Edit inline di tutti i campi
  - **Esporta PDF**: Download report completo partner
  - **Invia Email**: Invio documenti al partner
- **API Endpoints**:
  - `GET /api/partners/{id}/profile` - Profilo esteso
  - `PATCH /api/partners/{id}/profile` - Aggiorna profilo
  - `GET /api/partners/{id}/payments` - Storico pagamenti
  - `POST /api/partners/{id}/payments` - Aggiungi pagamento
  - `GET /api/partners/{id}/export-pdf` - Export PDF
  - `POST /api/partners/{id}/send-documents` - Invia email

#### 1. Systeme.io Live Data Dashboard
- Connessione API reale (`api.systeme.io`)
- Sincronizzazione automatica contatti (1000+ paginati)
- Statistiche aggregate: tag, funnel, conversioni
- Dashboard real-time con dati live

#### 2. MCP Integration per Agenti AI
- Modulo `systeme_mcp.py` con client completo
- Permessi granulari per ogni agente:
  - **VALENTINA**: get_contacts, get_tags, get_courses, get_funnels
  - **STEFANIA**: get_contacts, get_tags, create_tag, add_tag_to_contact, get_campaigns
  - **ANDREA**: get_courses, get_course_students, enroll_student
  - **GAIA**: get_funnels, get_funnel, get_contacts, create_contact
  - **MARTA**: get_contacts, create_contact, update_contact, get_tags, add_tag, get_orders
  - **ORION**: get_contacts, get_products, get_orders
  - **ATLAS**: get_courses, get_course_students, get_contacts
  - **LUCA**: get_contacts, get_tags (solo lettura)

#### 3. API Endpoints per Agenti
- `POST /api/systeme/agent/action` - Azione generica
- `GET /api/systeme/agent/permissions` - Permessi agenti
- `GET /api/systeme/gaia/funnels` - GAIA funnels
- `GET /api/systeme/stefania/tags` - STEFANIA tags
- `GET /api/systeme/marta/contacts` - MARTA CRM
- `GET /api/systeme/andrea/courses` - ANDREA corsi
- `GET /api/systeme/orion/products` - ORION prodotti

#### 4. Chiavi Configurate
- `SYSTEME_API_KEY` - API pubblica per lettura dati
- `SYSTEME_MCP_KEY` - MCP per operazioni avanzate agenti

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
- [x] Autenticazione JWT (Admin vs Partner login) ✅ (13 Feb 2026)
- [x] Notifiche Telegram per alert critici ✅ (13 Feb 2026)
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
1. ~~Implementare JWT authentication~~ ✅ Completato
2. ~~Integrare Telegram Bot per notifiche~~ ✅ Completato
3. ~~Sezione Documenti Partner per Admin~~ ✅ Completato
4. ~~Profilo Partner completo con anagrafica~~ ✅ Completato
5. ~~Dashboard Partner semplificata (UX friendly)~~ ✅ Completato
6. Allineare sidebar/topbar ai colori brand Evolution PRO
7. Collegare domain `app.evolution-pro.it`
8. Dashboard Metriche Post-Lancio Avanzata (NPS, grafici, visualizzazione funnel studenti)
9. ACADEMY_VIDEOS - Sistema micro-learning video
