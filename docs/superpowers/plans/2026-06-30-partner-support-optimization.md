# Partner Support Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Ciak partner support section so partners can quickly understand which team member to contact and open the right chat with less friction.

**Architecture:** Keep the implementation frontend-only. Reuse the existing `AGENTS` registry, the existing `/api/stefania/chat` endpoint, and the current partner routing.

**Tech Stack:** React 19, CRACO/CRA, TailwindCSS utility classes, lucide-react icons, existing partner area components.

## Global Constraints

- Do not change backend APIs.
- Do not change the canonical partner journey state machine.
- Preserve the existing slate/yellow Ciak brand language.
- Keep edits scoped to the partner support/navigation surface.
- Record the decision in local project memory and publish the change to GitHub.

---

### Task 1: Local Memory

**Files:**
- Create: `memory/CIAK_PARTNER_OPTIMIZATION.md`

**Interfaces:**
- Consumes: current partner area structure.
- Produces: a durable local note for future AI agents.

- [ ] **Step 1: Add memory file**

Add a concise note describing the partner support optimization, target files, and verification expectations.

- [ ] **Step 2: Review memory**

Run: `Get-Content memory\CIAK_PARTNER_OPTIMIZATION.md`
Expected: file contains scope, touched surfaces, and verification command.

### Task 2: Team Support UX

**Files:**
- Modify: `frontend/src/ciak/partner/sections/TeamSupportoPage.jsx`

**Interfaces:**
- Consumes: `AGENTS`, `TEAM_ORDER`, `partner`.
- Produces: a more scannable support page with clearer agent routing and a safer chat drawer.

- [ ] **Step 1: Improve support page structure**

Add a concise hero, quick-routing chips, improved agent cards, and a lightweight response-time panel using local static data keyed by agent id.

- [ ] **Step 2: Improve chat drawer**

Keep the existing endpoint payload. Improve empty/error states, button labels, keyboard handling, and mobile spacing.

- [ ] **Step 3: Verify frontend build**

Run: `npm run build` from `frontend`.
Expected: exit code 0. Existing React hook warnings may remain if unrelated.

### Task 3: Partner Sidebar Clarity

**Files:**
- Modify: `frontend/src/ciak/partner/PartnerSidebar.jsx`

**Interfaces:**
- Consumes: current React Router routes.
- Produces: clearer support navigation without route changes.

- [ ] **Step 1: Clarify support item**

Make the support nav item visually distinct as a quick help entry while preserving active behavior.

- [ ] **Step 2: Verify frontend build**

Run: `npm run build` from `frontend`.
Expected: exit code 0. Existing React hook warnings may remain if unrelated.

### Task 4: Publish

**Files:**
- Commit all files modified by this task only, plus plan/memory.

**Interfaces:**
- Consumes: local git branch `chore/consolidate-evo-ciak`.
- Produces: pushed commit on GitHub.

- [ ] **Step 1: Inspect diff**

Run: `git diff -- frontend/src/ciak/partner/sections/TeamSupportoPage.jsx frontend/src/ciak/partner/PartnerSidebar.jsx memory/CIAK_PARTNER_OPTIMIZATION.md docs/superpowers/plans/2026-06-30-partner-support-optimization.md`

- [ ] **Step 2: Commit scoped changes**

Run: `git add <the four task files> && git commit -m "feat: optimize partner support area"`

- [ ] **Step 3: Push**

Run: `git push origin chore/consolidate-evo-ciak`

