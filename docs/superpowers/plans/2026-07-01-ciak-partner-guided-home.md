# Ciak Partner Guided Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Ciak partner area into a guided, human-feeling workspace that follows the canonical Metodo EVO: Stefania onboarding with Claudio welcome video, Valentina-led Esamina, Valida as the project core, and Ottimizza for launch/post-launch. Fill and connect the main pages with the agreed simple, motivating, professional copy.

**Architecture:** Keep the React partner shell and existing backend endpoints. Replace the old dark sidebar/navigation language with a lighter guided structure. Reuse the existing agent registry, journey phase config, file archive, team support chat, Booster EVO, and EVO-S pages where possible, wrapping or renaming them only where the user-facing concept changes.

**Tech Stack:** React 19, react-router-dom 7, Tailwind utility classes, lucide-react icons, existing `/api/*` endpoints, localStorage welcome flag for v1.

## Global Constraints

- Implement from `origin/main` or a clean branch based on `main`; do not build on the divergent production deploy branch unless explicitly requested.
- Preserve legacy routes with redirects or aliases so old links do not break.
- Keep copy in Italian, direct and reassuring: motivating, simple, professional.
- Avoid technical-first labels in user-facing navigation: no "workspace", "growth system", "booster" as primary labels.
- Use the real Ciak logo from `/ciak/logo.webp`.
- Use a light gray app background, white sidebar, yellow border/glow, full blue buttons with lucide icons.
- Reuse existing agent images and `AGENTS` data; do not duplicate agent data unless a small presentation adapter is needed.
- Keep the partner operational APIs untouched unless a missing Telegram URL or welcome flag truly requires a backend follow-up.
- After each task, run the smallest useful check before continuing.

---

## Task 1: Start From The Correct Codebase

**Files/areas**

- Git branch state
- `frontend/src/ciak/partner/*`
- `docs/superpowers/specs/2026-07-01-ciak-partner-guided-home-design.md`

**Steps**

- [ ] Fetch latest refs.
- [ ] Create a new branch from `origin/main`, for example `feat/ciak-guided-partner-home`.
- [ ] Re-read the approved design spec and confirm the implementation branch contains the current partner app files.
- [ ] Do not merge the divergent `chore/consolidate-evo-ciak` branch. Cherry-pick or manually port only ideas already captured in the spec.

**Verification**

- [ ] `git status --short`
- [ ] `git log --oneline --decorate -5`

**Commit**

- No commit for this setup task unless branch/doc housekeeping changes are made.

---

## Task 2: Redesign The Partner Shell And Routes

**Files**

- `frontend/src/ciak/partner/CiakPartnerApp.jsx`
- `frontend/src/ciak/partner/PartnerSidebar.jsx`

**Navigation target**

- Home
- Metodo EVO
- Materiali
- Il team Ciak.io
- Gruppo Telegram
- Servizi extra
- Continua a scalare

**Steps**

- [ ] Update `CiakPartnerApp.jsx` routes for the new canonical pages:
  - `/partner` and `/partner/home` render the dynamic guided home.
  - `/partner/metodo-evo` renders the Metodo EVO map.
  - `/partner/materiali` renders the guided file/material archive.
  - `/partner/team-ciak` renders the team page.
  - `/partner/telegram` renders or redirects to the Telegram support experience.
  - `/partner/servizi-extra` renders the service acceleration page.
  - `/partner/continua-scalare` renders the post-12-month scaling plans page.
- [ ] Preserve old routes by rendering equivalent pages or redirecting:
  - `/partner/workspace` -> `/partner/materiali` or a compatibility workspace view if still needed.
  - `/partner/mio-spazio` -> `/partner/materiali`.
  - `/partner/supporto` -> `/partner/team-ciak`.
  - `/partner/booster-evo` -> `/partner/servizi-extra`.
  - `/partner/evo-s` -> `/partner/continua-scalare`.
  - `/partner/growth-system` and `/partner/accelera/*` remain accessible if used by existing sections.
- [ ] Redesign `PartnerSidebar.jsx` with the approved visual treatment:
  - White panel on gray background.
  - Yellow border and soft glow.
  - Real Ciak logo at top.
  - Blue active/action buttons with icons.
  - Compact journey/status language: "Protocollo EVO · 12 mesi".
- [ ] Add a compact "Il team Ciak.io" preview block before Telegram with agent photo, name, role, and chat CTA.
- [ ] Add business continuity blocks:
  - Included investment: "Il tuo investimento include costruzione, lancio e accompagnamento."
  - Services extra: "Vuoi accelerare?"
  - Post 12 months: "Continua a scalare."

**Verification**

- [ ] Navigate all sidebar items in browser.
- [ ] Verify old URLs still land on a useful page.
- [ ] Confirm logo renders and no sidebar labels wrap badly at desktop width.

**Commit**

- [ ] `git add frontend/src/ciak/partner/CiakPartnerApp.jsx frontend/src/ciak/partner/PartnerSidebar.jsx`
- [ ] `git commit -m "feat: redesign ciak partner navigation"`

---

## Task 3: Build The Dynamic Guided Home

**Files**

- `frontend/src/ciak/partner/operativo/PartnerOperativo.jsx`
- `frontend/src/ciak/partner/operativo/Benvenuto.jsx`
- New components if useful:
  - `frontend/src/ciak/partner/operativo/GuidedHome.jsx`
  - `frontend/src/ciak/partner/operativo/AgentFocusCard.jsx`
  - `frontend/src/ciak/partner/operativo/NextActionPanel.jsx`
  - `frontend/src/ciak/partner/operativo/HumanSupportPanel.jsx`

**Home states**

- First access:
  - Large Stefania visual.
  - Warm greeting.
  - Claudio welcome video.
  - CTA: "Ho visto il video, inizia il percorso".
  - Store `ciak_benvenuto_seen_${partnerId}` for v1.
- After first access:
  - Home updates to current phase/step.
  - Large active agent visual based on step/phase.
  - Chat/live question panel in evidence.
  - Clear next action, not a generic dashboard.
- Later:
  - Welcome video remains reachable from Materiali or a small "Rivedi il video di benvenuto" link/card.

**Steps**

- [ ] Reuse `AGENTS`, `STEP_TO_AGENT`, and `PHASE_CONFIG` to determine active agent.
- [ ] Keep Stefania as onboarding host until the welcome video is completed.
- [ ] Ensure Esamina uses Valentina across its 5 steps.
- [ ] Keep Valida framed as "il cuore del progetto".
- [ ] Keep Ottimizza framed as "lancio e post-lancio".
- [ ] Add chat CTA copy that feels live and accompanied, without promising instant human response if the endpoint is AI chat.
- [ ] Add Telegram support CTA in the home support panel.

**Copy anchors**

- "Oggi ti accompagno nel prossimo passo."
- "Fai una cosa alla volta. Il metodo è già ordinato per te."
- "Se hai un dubbio, scrivimi qui: ti aiuto a capire cosa fare adesso."
- "Per il supporto umano trovi il tuo gruppo Telegram personale."

**Verification**

- [ ] Clear localStorage welcome flag and load home: Stefania + Claudio video state appears.
- [ ] Click CTA: app moves to journey state and does not show the first-access block again.
- [ ] Confirm active agent photo changes according to the current phase/step.
- [ ] Confirm mobile and desktop layouts do not overlap.

**Commit**

- [ ] `git add frontend/src/ciak/partner/operativo`
- [ ] `git commit -m "feat: add guided ciak partner home"`

---

## Task 4: Add The Metodo EVO Page

**Files**

- New: `frontend/src/ciak/partner/sections/MetodoEvoPage.jsx`
- Optional shared constants:
  - `frontend/src/ciak/partner/operativo/evoMethod.js`

**Structure**

- Onboarding:
  - Stefania greeting.
  - Claudio welcome video.
  - Purpose: "Prepariamo il terreno e ti mostriamo come lavoreremo insieme."
- Esamina:
  - Led by Valentina.
  - 5 steps.
  - Purpose: understand identity, positioning, offer clarity, audience, and message.
- Valida:
  - The core of the project.
  - Show the main workspaces already used by the project:
    - Masterclass.
    - Corso.
    - Sistema di vendita.
    - Preparazione lancio.
    - Online / test reale.
- Ottimizza:
  - Launch and post-launch.
  - Improve based on real data and team review.

**Steps**

- [ ] Create the page as an orientation map, not another work dashboard.
- [ ] Show current phase/step if journey state is available.
- [ ] Include one clear CTA back to the Home next action.
- [ ] Keep headings short and concrete.

**Verification**

- [ ] `/partner/metodo-evo` renders.
- [ ] Current phase highlight works or falls back gracefully.
- [ ] Text is readable on mobile.

**Commit**

- [ ] `git add frontend/src/ciak/partner/sections/MetodoEvoPage.jsx`
- [ ] `git commit -m "feat: add metodo evo partner page"`

---

## Task 5: Convert Materials Into A Guided Archive

**Files**

- `frontend/src/ciak/partner/sections/PartnerFilesPage.jsx`
- Optional new wrapper:
  - `frontend/src/ciak/partner/sections/MaterialiPage.jsx`

**Target behavior**

- The section is called "Materiali".
- It is an ordered archive, not a Drive clone.
- It groups by journey phase where possible:
  - Esamina
  - Valida
  - Ottimizza
  - Onboarding / Amministrazione
- It supports tabs:
  - Tutti
  - Da rivedere
  - Caricati da te
  - Consegnati dal team
- Each material card shows:
  - Phase/category.
  - Origin, if inferable.
  - Status or next action.
  - Download/open CTA.
- Keep existing upload endpoint `/api/files/upload`.
- Keep existing load endpoint `/api/files/partner/:partnerId`.

**Steps**

- [ ] Rename visible copy from "I Miei File" to "Materiali".
- [ ] Replace category-only browsing with phase-first grouping, while preserving category filters where useful.
- [ ] Add a small welcome video card so the user can rewatch Claudio's welcome video.
- [ ] Keep upload actions simple and labeled by user intent:
  - "Carica documento"
  - "Carica video"
  - "Carica immagine"
  - "Carica audio"
- [ ] Use empty states that explain what will appear there.

**Copy anchors**

- "Qui trovi tutto quello che serve per proseguire senza cercare nelle chat."
- "I materiali importanti restano ordinati per fase del percorso."
- "Quando il team ti consegna qualcosa, lo ritrovi qui."

**Verification**

- [ ] Existing file loading still works.
- [ ] Existing upload still posts the same payload.
- [ ] Empty file state is clear.
- [ ] `/partner/materiali` is reachable from sidebar and old workspace/file routes.

**Commit**

- [ ] `git add frontend/src/ciak/partner/sections/PartnerFilesPage.jsx frontend/src/ciak/partner/sections/MaterialiPage.jsx`
- [ ] `git commit -m "feat: organize ciak partner materials"`

---

## Task 6: Add The Team Ciak.io Page And Sidebar Preview

**Files**

- Existing: `frontend/src/ciak/partner/sections/TeamSupportoPage.jsx`
- New or renamed wrapper:
  - `frontend/src/ciak/partner/sections/TeamCiakPage.jsx`
- Existing: `frontend/src/ciak/partner/operativo/agents.js`

**Team**

- Stefania: Coordinatrice del percorso.
- Valentina: Esamina, brand e posizionamento.
- Andrea: Valida, video e corso.
- Gaia: Valida, funnel e tecnica.
- Marco: Ottimizza, lancio e crescita.

**Steps**

- [ ] Reuse existing chat mechanics from `TeamSupportoPage.jsx`.
- [ ] Present the team as people/agents accompanying the journey, not as a help desk.
- [ ] Use compact cards with real photos, role, phase, and "Scrivi" CTA.
- [ ] Keep Matteo hidden from primary display unless product requires him elsewhere.
- [ ] Make `/partner/supporto` render or redirect to this page for compatibility.

**Copy anchors**

- "Il team che ti accompagna nel percorso."
- "Ogni fase ha un riferimento chiaro: sai sempre a chi chiedere."
- "Scrivi all'agente giusto e mantieni ordinato il lavoro dentro Ciak."

**Verification**

- [ ] Agent cards render with photos.
- [ ] Chat opens and still calls the expected support endpoint.
- [ ] Sidebar team preview links to the page and agent chat actions behave consistently.

**Commit**

- [ ] `git add frontend/src/ciak/partner/sections/TeamSupportoPage.jsx frontend/src/ciak/partner/sections/TeamCiakPage.jsx frontend/src/ciak/partner/operativo/agents.js`
- [ ] `git commit -m "feat: add ciak team support page"`

---

## Task 7: Add Telegram, Services Extra, And Scaling Pages

**Files**

- New: `frontend/src/ciak/partner/sections/TelegramSupportPage.jsx`
- New or wrapper: `frontend/src/ciak/partner/sections/ServiziExtraPage.jsx`
- Existing: `frontend/src/ciak/partner/sections/BoosterEvoPage.jsx`
- Existing: `frontend/src/ciak/partner/sections/EvoSPage.jsx`
- Optional wrapper: `frontend/src/ciak/partner/sections/ContinuaScalarePage.jsx`

**Telegram**

- Position Telegram as human support, not task management.
- If partner data has a Telegram URL, show "Apri il tuo gruppo Telegram".
- If not, show "Richiedi collegamento Telegram" and explain that the team will connect the personal group.
- Keep Ciak as the source of truth for tasks/materials/progress.

**Servizi extra**

- Position as acceleration during the included 12-month journey.
- Copy: "Hai già un percorso completo. Se vuoi velocizzare alcuni risultati, puoi aggiungere supporti mirati."
- Link existing Booster/Accelera services under a calmer label.

**Continua a scalare**

- Position after the 12 months.
- Preserve existing EVO-S plan mechanics.
- User-facing label: "Continua a scalare".
- Explain minimum 6 months without making it feel hidden or punitive.

**Steps**

- [ ] Add Telegram support page with fallback state.
- [ ] Wrap `BoosterEvoPage` in `ServiziExtraPage` or adjust its visible header/copy.
- [ ] Wrap `EvoSPage` in `ContinuaScalarePage` or adjust route-level copy.
- [ ] Ensure checkout/request actions are unchanged.

**Verification**

- [ ] `/partner/telegram` renders both with and without `partner.telegram_group_url` or equivalent field.
- [ ] `/partner/servizi-extra` keeps service request flow working.
- [ ] `/partner/continua-scalare` keeps subscription/checkout flow working.

**Commit**

- [ ] `git add frontend/src/ciak/partner/sections frontend/src/ciak/partner/CiakPartnerApp.jsx`
- [ ] `git commit -m "feat: connect partner support and scaling pages"`

---

## Task 8: Copy Pass And Visual QA

**Files**

- All touched partner app files.

**Steps**

- [ ] Search for old labels and replace or demote them where user-facing:
  - "Workspace"
  - "Mio spazio"
  - "Growth System"
  - "Booster EVO"
  - "EVO-S"
  - "Supporto Team"
- [ ] Keep old names only where needed for technical route compatibility or existing component names.
- [ ] Read every new visible paragraph aloud for the target user: professional with low digital/marketing confidence.
- [ ] Remove jargon and overly enthusiastic claims.
- [ ] Check button text uses direct verbs.
- [ ] Verify no visible text explains UI mechanics or design choices.

**Verification**

- [ ] `rg "Workspace|Mio spazio|Growth System|Booster EVO|EVO-S|Supporto Team" frontend/src/ciak/partner`
- [ ] Confirm remaining occurrences are technical or intentionally hidden from primary nav.

**Commit**

- [ ] `git add frontend/src/ciak/partner`
- [ ] `git commit -m "copy: align ciak partner guidance language"`

---

## Task 9: Build And Browser Verification

**Commands**

```bash
cd frontend
yarn build
yarn start
```

**Browser checks**

- [ ] Home first access.
- [ ] Home after welcome video CTA.
- [ ] Metodo EVO.
- [ ] Materiali empty/loaded state.
- [ ] Team Ciak.io page and chat drawer.
- [ ] Telegram support page.
- [ ] Servizi extra.
- [ ] Continua a scalare.
- [ ] Legacy route compatibility.
- [ ] Desktop viewport.
- [ ] Mobile viewport.

**Expected result**

- Build succeeds.
- No blank pages.
- No console errors from missing imports/routes.
- Sidebar and page content remain readable and non-overlapping.
- The app feels like a guided journey, not a collection of disconnected tools.

**Commit**

- [ ] Commit any fixes from verification with a focused message, for example:
  - `fix: polish ciak partner responsive states`

---

## Task 10: Deployment Decision

**Steps**

- [ ] Summarize local changes and commit list.
- [ ] Confirm whether the user wants preview deployment first or production deployment.
- [ ] Deploy only from the clean implementation branch.
- [ ] After deploy, verify the target deployment URL and the production alias if promoted.

**Verification**

- [ ] Vercel deployment points to the intended commit.
- [ ] Public domain is promoted only after user confirmation.

---

## Risks And Follow-Ups

- Backend persistence for `welcome_video_seen` is better long-term than localStorage, but localStorage is acceptable for v1 because the current app already uses it.
- Telegram group URL may not exist in the partner payload. Implement a graceful fallback first, then add backend/admin support if needed.
- The old production deployment came from a dirty divergent branch. Avoid repeating that by deploying only from a clean branch based on `main`.
- Existing service/checkout pages should be wrapped carefully so commercial flows are not broken by copy/navigation changes.

