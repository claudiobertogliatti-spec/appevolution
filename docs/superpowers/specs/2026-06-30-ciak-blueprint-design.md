# Ciak Blueprint Design

Date: 2026-06-30

## Direction

The public `/ciak-blueprint` page should feel like a premium product page aligned with the approved Ciak landing.

## Requirements

- Do not change checkout logic, API payload, Stripe redirect, or button behavior.
- Keep the existing strategic copy unless the user explicitly asks to change it.
- Replace the dominant dark hero slab with a clean white hero.
- Use Ciak yellow as the main highlight through borders, glow, badges, and CTAs.
- Use deep blue/slate as an authority accent, not as a full-page dominant background.
- Hero includes a side box named `Cosa ricevi` with the three concrete deliverables:
  - Sessione strategica 60 min
  - Analisi di mercato specifica
  - Roadmap operativa personalizzata
- The price/value line remains visible near the primary CTA.
- Mobile layout stacks content cleanly, avoids horizontal overflow, and uses full-width CTAs where useful.

## Files

- Page: `frontend/src/ciak/pages/CiakBlueprint.jsx`
- Plan: `docs/superpowers/plans/2026-06-30-ciak-blueprint-layout.md`
- Memory: `memory/CIAK_BLUEPRINT_LAYOUT.md`

## Verification

- Run `npm run build` from `frontend`.
- Verify `/ciak-blueprint` at desktop and mobile widths.
- Confirm checkout buttons still call `startCheckout`.
