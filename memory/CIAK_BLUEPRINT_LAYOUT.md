# Ciak Blueprint Layout Memory

Date: 2026-06-30

## Decision

The `/ciak-blueprint` page uses the same premium, clean visual language approved for the public Ciak landing.

## Rules For Future Agents

- Do not touch checkout logic in `frontend/src/ciak/pages/CiakBlueprint.jsx` unless explicitly requested.
- Preserve `startCheckout`, the `/api/checkout/create-session` payload, Stripe redirect handling, and CTA click wiring.
- Visual direction: white sections, Ciak yellow highlights, soft yellow borders/glows, restrained slate/deep-blue accents.
- Avoid large full-width dark-blue slabs on this page.
- The hero should present the product as a premium diagnostic offer, with a `Cosa ricevi` box listing:
  - Sessione strategica 60 min
  - Analisi di mercato specifica
  - Roadmap operativa personalizzata
- Keep mobile-first spacing and full-width CTA buttons on narrow screens.

## Files

- Page: `frontend/src/ciak/pages/CiakBlueprint.jsx`
- Spec: `docs/superpowers/specs/2026-06-30-ciak-blueprint-design.md`
- Plan: `docs/superpowers/plans/2026-06-30-ciak-blueprint-layout.md`
