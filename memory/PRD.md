# Evolution PRO - PRD

## Problema Originale
Applicazione di gestione aziendale basata su AI per Evolution PRO LLC. Gestisce partner (formatori), onboarding, contratti, produzione contenuti, accountability e supporto tecnico tramite agenti AI specializzati.

## Architettura
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB (Motor async)
- AI: Claude via Emergent LLM Key
- Storage: Cloudinary
- CRM: Systeme.io
- Payments: Stripe
- Background: Celery + Redis (Upstash)

## Brand Palette
- Giallo Evolution: #FFD24D (rgb 255,210,77)
- Nero Antracite: #1A1F24 (rgb 26,31,36)
- Sidebar Background: #F5F3EE (sabbia caldo)
- Sidebar Border: #E8E4DC
- Yellow Dark: #D4A017
- Muted: #8B8680

## Team AI
| ID Tecnico | Nome | Ruolo |
|---|---|---|
| STEFANIA | Stefania | Coordinatrice |
| VALENTINA | Valentina | Strategia e Onboarding |
| ANDREA | Andrea | Produzione Contenuti |
| MARCO | Marco | Accountability Settimanale |
| GAIA | Gaia | Supporto Tecnico |

## Completati
- [x] Import Lista Fredda Systeme.io
- [x] Calendario Editoriale Claude AI
- [x] Modulo Firma Contratto Partnership
- [x] Personalizzazione Parametri Contratto Admin
- [x] Upload Documenti Onboarding (Cloudinary)
- [x] System Prompt ANDREA, MARCO, VALENTINA
- [x] Allineamento Globale Ruoli Team — 27 Mar 2026
- [x] Modulo Fase 4: Funnel Builder — 28 Mar 2026
- [x] Fix bug /api/api/ doppio prefisso — 28 Mar 2026
- [x] Disabilitazione seed produzione — 28 Mar 2026
- [x] Fallback MONGO_URL Atlas + REDIS_URL — 28 Mar 2026
- [x] Generazione PDF contratto + SMTP Email — 28 Mar 2026
- [x] P4 - Pagina Proposta Pubblica — 29 Mar 2026 (13/13 test)
- [x] Fix critico Errore 520 — 30 Mar 2026
- [x] **Redesign Admin Sidebar v1** — 01 Apr 2026 (struttura cockpit operativo)
- [x] **Redesign Admin Sidebar v2** — 01 Apr 2026
  - Palette corretta: #FFD24D + #1A1F24
  - Sfondo sabbia #F5F3EE
  - Titoli sezioni 15px/900 weight
  - Pulsanti 52px altezza, font 15px, sidebar 300px
  - 3 nuove pagine: OggiDashboard, PrioritaPipeline, PartnerBloccati
  - Rinominato: COMMERCIALE→ACQUISIZIONE, CONTROLLO→SISTEMA
  - Vista Antonella: nasconde completamente voci non rilevanti

## P0 - Prossimi (Maxi Brief UX)
- [ ] Aggiornamento Prompt Agenti AI (Fase 6 Brief UX)
- [ ] Sistema Ruoli e Redirect Login (Parte 1 Brief UX)
- [ ] Redesign Dashboard Cliente Pre/Post call (Parte 3 Brief UX)
- [ ] Redesign Dashboard Partner 7 Fasi (Parte 4 Brief UX)
- [ ] Redesign Dashboard Admin Claudio (Parte 5 Brief UX)
- [ ] Modalità Impersonate Admin (Parte 7 Brief UX)

## P1 - Alta Priorità
- [ ] PRICE_ID Stripe per Servizi Extra Partner
- [ ] Test E2E flusso Servizi Extra (Stripe)

## P2 - Media Priorità
- [ ] Integrazioni Canva/Kling (serve API key)

## P3 - Technical Debt
- [ ] Refactoring server.py monolite (>14000 righe)

## DB
- `evolution_pro` su `cluster0.4cgj8wx.mongodb.net` (utente: evolution_admin)
- bcrypt==4.0.1 (compatibilità passlib)

## Credentials
- Admin: claudio.bertogliatti@gmail.com / Evoluzione74
- Operations: antonella@evolution-pro.it / OperationsAnto2024!
