# Ciak Blueprint Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public Ciak Blueprint page as a premium, mobile-first product page while preserving all checkout behavior.

**Architecture:** Keep the existing `CiakBlueprint.jsx` component and checkout function intact. Modify only presentational JSX and Tailwind class names, then update local memory/spec notes for future agents.

**Tech Stack:** React, React Router, Tailwind CSS, existing Ciak frontend.

## Global Constraints

- Do not change `startCheckout`, checkout payload, API endpoint, Stripe redirect, error handling, or button click behavior.
- Preserve the existing Blueprint copy unless the user explicitly requests copy changes.
- Match the approved Ciak landing direction: white/clean sections, Ciak yellow accents, restrained deep blue, premium bordered highlight boxes.
- Mobile layout must avoid horizontal overflow and keep CTAs full-width where useful.

---

### Task 1: Blueprint Visual Refresh

**Files:**
- Modify: `frontend/src/ciak/pages/CiakBlueprint.jsx`
- Modify: `docs/superpowers/specs/2026-06-30-ciak-blueprint-design.md`
- Modify: `memory/CIAK_BLUEPRINT_LAYOUT.md`

**Interfaces:**
- Consumes: Existing `startCheckout()` function in `CiakBlueprint.jsx`.
- Produces: Same CTA buttons calling `startCheckout()` with unchanged behavior.

- [ ] **Step 1: Update the hero only visually**

Keep the hero title and paragraph copy, replace the dark full-width slab with a white/soft layout, add a right-side “Cosa ricevi” box, and keep the original CTA button wired to `startCheckout`.

- [ ] **Step 2: Tighten downstream sections**

Keep all section copy but improve spacing, cards, borders, and mobile readability.

- [ ] **Step 3: Verify behavior**

Run `npm run build` from `frontend`. Verify `/ciak-blueprint` in desktop and mobile viewports. Confirm the CTA button still calls the same checkout function.

- [ ] **Step 4: Save memory and commit**

Commit only the scoped files touched for landing/mobile polish and Blueprint visual refresh, ignoring unrelated dirty worktree files.
