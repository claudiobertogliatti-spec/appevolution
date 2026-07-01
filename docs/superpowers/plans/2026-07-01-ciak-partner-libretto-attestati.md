# Ciak Partner Libretto Attestati Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-friendly partner experience with visible locked/unlocked phase rewards, certificate downloads, and a first Project Book PDF.

**Architecture:** Keep the partner journey as source of truth. Add a small rewards backend that derives phase completion from `/api/partner-journey/operativo/state`, renders simple branded PDFs on demand, and exposes a compact state endpoint for the frontend. Add focused partner UI components for reward cards and improve mobile layout around existing components.

**Tech Stack:** React, Tailwind utility classes, FastAPI, Mongo/Motor, ReportLab.

## Global Constraints

- Do not touch admin files in this implementation.
- Keep user-facing copy simple, motivating, and professional.
- The partner sees rewards before completion as locked prizes.
- PDFs must use Ciak visual language: light gray, yellow border/accent, blue CTA/accent, Ciak.io naming.
- Missing project data must not block PDF generation.
- Mobile partner must show one primary action at a time.

---

### Task 1: Backend Rewards State And PDFs

**Files:**
- Create: `backend/services/partner_rewards_pdf.py`
- Create: `backend/routers/partner_rewards.py`
- Modify: `backend/server.py`

**Interfaces:**
- Produces: `GET /api/partner-rewards/{partner_id}/state`
- Produces: `GET /api/partner-rewards/{partner_id}/certificate/{phase}`
- Produces: `GET /api/partner-rewards/{partner_id}/project-book`

- [ ] Create PDF renderer service with `render_certificate_pdf(payload)` and `render_project_book_pdf(payload)`.
- [ ] Create router that computes phase state from `partner_journey_steps` and returns locked/unlocked rewards.
- [ ] Register router in `backend/server.py`.
- [ ] Verify Python syntax with `py -m py_compile`.

### Task 2: Frontend Reward Components

**Files:**
- Create: `frontend/src/ciak/partner/rewards/rewardUtils.js`
- Create: `frontend/src/ciak/partner/rewards/ProjectBookCard.jsx`
- Create: `frontend/src/ciak/partner/rewards/PhaseRewardCard.jsx`

**Interfaces:**
- Consumes: partner id and existing journey `state`.
- Produces: reusable reward UI for Home and Metodo EVO.

- [ ] Add phase completion helpers.
- [ ] Add Project Book card with locked/unlocked states and download buttons.
- [ ] Add Phase Reward card for attestato and bonus states.

### Task 3: Partner Home And Metodo EVO Integration

**Files:**
- Modify: `frontend/src/ciak/partner/operativo/GuidedHome.jsx`
- Modify: `frontend/src/ciak/partner/sections/MetodoEvoPage.jsx`
- Modify: `frontend/src/ciak/partner/operativo/steps/StepFinaleCelebrativa.jsx`

**Interfaces:**
- Consumes: components from Task 2.
- Produces: visible rewards in partner home, Metodo EVO, and Go Live celebration.

- [ ] Add Project Book card under the main Home action area.
- [ ] Add phase reward cards to Metodo EVO.
- [ ] Add Go Live certificate/project-book buttons to final celebration.

### Task 4: Mobile Partner Layout

**Files:**
- Modify: `frontend/src/ciak/partner/CiakPartnerApp.jsx`
- Modify: `frontend/src/ciak/partner/PartnerSidebar.jsx`
- Modify: `frontend/src/ciak/partner/operativo/JourneyMap.jsx`
- Modify: `frontend/src/ciak/partner/operativo/GuidedHome.jsx`

**Interfaces:**
- Produces: partner area usable on mobile without horizontal overflow.

- [ ] Hide desktop sidebar on small screens.
- [ ] Add mobile top bar and bottom navigation.
- [ ] Reduce JourneyMap visible density on mobile.
- [ ] Keep primary action visible and touch-friendly.

### Task 5: Verification

**Files:**
- No source changes unless verification finds defects.

- [ ] Run `py -m py_compile backend/services/partner_rewards_pdf.py backend/routers/partner_rewards.py backend/server.py`.
- [ ] Run `npm run build` in `frontend`.
- [ ] If dev server is available, inspect `/partner` at mobile and desktop widths.
