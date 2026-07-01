# Ciak Admin Acquisizione CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first CRM-oriented Acquisizione experience for `ciak.io/admin`.

**Architecture:** Add one backend summary endpoint under `/api/admin/ciak` that derives monthly revenue pipeline and today's priorities from existing lead, diagnostic, proposal, and partner collections. Update the Acquisizione frontend with a command center tab and replace the ads stub with a real Meta/Claude/Content Studio page.

**Tech Stack:** FastAPI, MongoDB/Motor, React CRA, Tailwind, lucide-react.

## Global Constraints

- Do not connect real Meta APIs in this pass.
- Do not automate ad spend, budget changes, or publishing.
- Use existing backend data wherever possible.
- Use simple, motivating, professional Italian copy.
- Keep the UI aligned with the new Ciak admin visual direction.

---

### Task 1: Backend Command Center Endpoint

**Files:**
- Modify: `backend/routers/ciak_admin.py`

**Interfaces:**
- Produces: `GET /api/admin/ciak/acquisizione-command-center`
- Returns: `{ target, month, funnel, priorities, bottlenecks }`

- [ ] Add the endpoint using existing collections.
- [ ] Count current-month Blueprint purchases, call booked, call done, proposals in trattativa, and paid contracts.
- [ ] Build four priority buckets for today's work.
- [ ] Return bottleneck messages derived from conversion gaps.
- [ ] Run `py -m compileall -q backend`.

### Task 2: Frontend Command Center

**Files:**
- Create: `frontend/src/ciak/admin/pages/AcquisizioneCommandCenter.jsx`
- Modify: `frontend/src/ciak/admin/pages/PipelineAcquisizione.jsx`

**Interfaces:**
- Consumes: `apiGet("/acquisizione-command-center")`
- Produces: a first tab named `Da lavorare oggi`

- [ ] Create KPI cards for target, gap, Blueprint, call, proposals, contracts.
- [ ] Create priority lists with direct links to lead detail.
- [ ] Add bottleneck cards with action copy.
- [ ] Add the new tab before Panoramica and Contatti.
- [ ] Run `npm run build`.

### Task 3: Ads CRM Page

**Files:**
- Create: `frontend/src/ciak/admin/pages/AcqCampaignsPage.jsx`
- Modify: `frontend/src/ciak/admin/CiakAdminApp.jsx`

**Interfaces:**
- Produces route: `/admin/acq-campagne-ads`

- [ ] Replace the current stub route with the real page.
- [ ] Add Meta Business Connect panel.
- [ ] Add Claude Campaign Manager panel with manual approval rules.
- [ ] Add Content Studio app cards for Canva, HeyGen, ElevenLabs, Clideo/CapCut.
- [ ] Add approval queue mock workflow for campaign/creative actions.
- [ ] Run `npm run build`.

### Task 4: Verification

**Files:**
- Modify as needed only for build fixes.

- [ ] Run backend compile.
- [ ] Run frontend build.
- [ ] Review git diff for accidental unrelated edits.
- [ ] Report what changed and any limitations.
