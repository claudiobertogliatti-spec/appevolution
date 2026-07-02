# Ciak Admin CRM Department Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each admin macro-section into a simple CRM department room with responsible AI agent, contextual chat, morning briefing, and large operational cards.

**Architecture:** Keep the current sidebar and route map stable. Add reusable department-room components and data configuration, then reuse them in `RepartoLanding` and selected admin pages. The first release uses deterministic briefing copy and current route/card data; later releases can connect the briefing to live backend metrics.

**Tech Stack:** React 19, React Router 7, Tailwind utility classes, lucide-react icons, existing Ciak admin API helpers.

## Global Constraints

- Sidebar structure stays stable.
- Layout must be clean, with large cards and simple descriptions.
- Each department shows only fundamental CEO-level signals, not vanity statistics.
- Each department has an AI responsible agent and contextual chat/check area.
- Delivery must support the future requirement of importing real partner data and materials from Google Drive with AI assistance.
- AI-generated/imported partner data must distinguish confirmed, probable, and missing data.

---

### Task 1: Department Room Data Model

**Files:**
- Create: `frontend/src/ciak/admin/departmentRooms.js`

**Interfaces:**
- Produces: `DEPARTMENT_ROOMS`, `getDepartmentRoom(id)`, `getDepartmentForPath(pathname)`.
- Consumes: no new code.

- [ ] Create a config object for Dashboard, Acquisizione, Vendite, Delivery, Casi studio, Back office.
- [ ] Include `agent`, `briefing`, `metrics`, `priorities`, and `guardrail` fields.
- [ ] Map current route paths to department ids.

### Task 2: Reusable Department Components

**Files:**
- Create: `frontend/src/ciak/admin/components/DepartmentRoom.jsx`

**Interfaces:**
- Consumes: a department room object from `departmentRooms.js`.
- Produces: `DepartmentAgentPanel`, `DepartmentBriefing`, `DepartmentMetricStrip`, `DepartmentRoomIntro`.

- [ ] Build an agent panel with photo/initials, role, prompt chips, and a compact chat-style text area.
- [ ] Build a morning briefing card with sections: numbers, working, not working, priority solution, accorgimenti.
- [ ] Build a metric strip capped at six core metrics.
- [ ] Keep copy concise and UI card radius at or below established style.

### Task 3: Apply To Macro Landing Pages

**Files:**
- Modify: `frontend/src/ciak/admin/CiakAdminApp.jsx`

**Interfaces:**
- Consumes: `getDepartmentRoom` and `DepartmentRoomIntro`.

- [ ] Import new components.
- [ ] Render the department room intro at the top of `RepartoLanding`.
- [ ] Remove the sidebar chat/team block or simplify it into a non-chat “Il team AI” pointer.
- [ ] Keep all existing macro cards and routes.

### Task 4: Apply To Dashboard Home

**Files:**
- Modify: `frontend/src/ciak/admin/pages/CabinaRegia.jsx`

**Interfaces:**
- Consumes: department room components for `dashboard`.

- [ ] Add Luca department intro above the existing semaphore/cards.
- [ ] Avoid duplicating the old Luca chat at the bottom if the new intro already covers it.

### Task 5: Verification

**Files:**
- Build command only.

- [ ] Run `npm run build` from `frontend`.
- [ ] Confirm `/admin`, `/admin/reparto/vendite`, `/admin/reparto/delivery` render with the new room structure.
- [ ] Confirm no visible sidebar navigation regressions.

## Self-Review

- Spec coverage: Covers contextual agent chat, morning briefing, CEO metrics, clean card layout, and Drive import requirement in constraints.
- Placeholder scan: No implementation placeholders are left in this plan.
- Type consistency: Component and helper names are defined before use.
