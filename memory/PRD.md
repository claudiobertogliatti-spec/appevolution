# Evolution PRO - PRD

## Problema Originale
Applicazione di gestione aziendale basata su AI per Evolution PRO LLC. Gestisce partner (formatori), onboarding, contratti, produzione contenuti, accountability e supporto tecnico tramite agenti AI specializzati.

## Utenti
- **Admin (Claudio Bertogliatti)**: CEO, supervisione completa
- **Operations (Antonella Rossi)**: Supervisione social e comunicazione
- **Partner**: Formatori che creano e vendono videocorsi

## Architettura
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB (Motor async)
- AI: Claude via Emergent LLM Key
- Storage: Cloudinary
- CRM: Systeme.io
- Payments: Stripe
- Background: Celery + Redis (Upstash)

## Team AI (Organigramma)
| ID Tecnico | Nome Display | Ruolo |
|------------|-------------|-------|
| STEFANIA | Stefania | Coordinatrice |
| VALENTINA | Valentina | Strategia e Onboarding |
| ANDREA | Andrea | Produzione Contenuti |
| MARCO | Marco | Accountability Settimanale |
| GAIA | Gaia | Supporto Tecnico |
| OPENCLAW | Valentina | Data Intelligence (alias) |
| MAIN | Main | Sistema Centrale |

## Supervisione Umana
- **Claudio Bertogliatti**: CEO/Supervisione
- **Antonella Rossi**: Supervisione social e comunicazione

## Completati
- [x] Import Lista Fredda su Systeme.io via API
- [x] Calendario Editoriale con Claude AI
- [x] Modulo Firma Contratto Partnership (UI + backend)
- [x] Redesign Contratto a 2 colonne + Chatbot Claude
- [x] Personalizzazione Parametri Contratto (Admin) — 27 Mar 2026
- [x] Upload Documenti Onboarding Partner (Cloudinary) — 27 Mar 2026
- [x] Aggiornamento System Prompt ANDREA, MARCO, VALENTINA — 27 Mar 2026
- [x] GAP Framework (Instructional Design, PLF, Traffic Flywheel) — 27 Mar 2026
- [x] **Allineamento Globale Ruoli Team** — 27 Mar 2026
  - Backend: agent_prompts.py, server.py (INITIAL_AGENTS, FIX B, build_system_prompt)
  - Frontend: App.js (TEAM_AGENTS, chat header, titles, sidebar), TeamEvolution.jsx, AgentDashboard.jsx, AdminSidebarLight.jsx, AdminSwitcher.jsx, AndreaChat.jsx
  - DB: Ruoli aggiornati via seed + startup fix
- [x] **Aggiornamento MONGO_URL e DB_NAME** — 27 Mar 2026
  - Nuovo DB: evolution-pro su cluster0.4cgj8wx.mongodb.net
  - .gitignore ripulito (rimosso blocco .env per deploy)

## P0 - Prossimi
- [ ] Configurare Tag Systeme.io (creare tag nella dashboard e inserire ID nel .env)

## P1 - Alta Priorità
- [ ] Generazione PDF contratto firmato (ReportLab) + salvataggio
- [ ] Configurazione SMTP per invio email conferma + PDF allegato
- [ ] Test E2E flusso Servizi Extra (Stripe checkout → webhook → attivazione)
- [ ] Integrazioni Reali Canva/Kling (serve API key dall'utente)

## P2 - Media Priorità
- [ ] UI Frontend Calendario Editoriale
- [ ] Preview asset generati prima di pubblicazione
- [ ] Scheduling automatico post social

## P3 - Technical Debt
- [ ] Refactoring server.py monolith (>14000 righe)
- [ ] Unificazione collection users e partners
- [ ] Documentazione OpenAPI

## 3rd Party Integrations
| Servizio | Status | Note |
|----------|--------|------|
| Stripe | Configurato | Checkout + Webhook |
| Systeme.io | Configurato | API Key funzionante |
| Telegram | Configurato | Notifiche admin |
| Claude AI | Configurato | Via Emergent LLM Key |
| HeyGen | Configurato | Avatar video |
| Cloudinary | Configurato | File storage |
| Canva | STUB | Richiede API Token |
| Kling AI | STUB | Richiede API Key |
| YouTube | Configurato | OAuth per upload |

## Credentials (Test)
- **Admin:** claudio.bertogliatti@gmail.com / Evoluzione74
- **Operations:** antonella@evolution-pro.it / OperationsAnto2024!

## Note Importanti
- DB: evolution-pro su cluster0.4cgj8wx.mongodb.net (utente: evolution_admin)
- bcrypt==4.0.1 (fissato per compatibilità passlib)
- Canva/Kling funzionano in modalità STUB
- Il chatbot /api/chat usa STEFANIA come ID tecnico ma ruolo "Coordinatrice"
- OPENCLAW e VALENTINA condividono lo stesso prompt (retrocompatibilità)
