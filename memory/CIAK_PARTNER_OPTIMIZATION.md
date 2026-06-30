# Ciak Partner Optimization Memory

Date: 2026-06-30

## Scope

Optimize the Ciak partner support section without changing backend APIs or the canonical partner journey.

## Current Surfaces

- Partner shell: `frontend/src/ciak/partner/CiakPartnerApp.jsx`
- Sidebar: `frontend/src/ciak/partner/PartnerSidebar.jsx`
- Support page: `frontend/src/ciak/partner/sections/TeamSupportoPage.jsx`
- Agent registry: `frontend/src/ciak/partner/operativo/agents.js`

## Decisions

- Keep `/partner/supporto` as the transverse support destination.
- Reuse `AGENTS` and `TEAM_ORDER` as the single source of truth for team members.
- Reuse `POST /api/stefania/chat` with `target_agent`; do not add backend endpoints.
- Improve partner UX through clearer routing by need: coordination, positioning, content, technical setup, launch, analysis.
- Keep the Ciak visual language: slate base, yellow accent, restrained operational UI.

## Verification

Run `npm run build` from `frontend`. Existing unrelated React hook warnings may appear; the build must exit with code 0.

## GitHub

Changes should be committed and pushed to `origin chore/consolidate-evo-ciak` so other AI agents and connected workflows can read them.
