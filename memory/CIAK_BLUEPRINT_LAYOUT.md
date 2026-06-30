# Ciak Blueprint Layout Memory

Date: 2026-06-30

## Decision

The `/ciak-blueprint` page uses the same premium visual language approved for the public Ciak landing, with a more distinctive strategic-scan/product feel.

## Rules For Future Agents

- Do not touch checkout logic in `frontend/src/ciak/pages/CiakBlueprint.jsx` unless explicitly requested.
- Preserve `startCheckout`, the `/api/checkout/create-session` payload, Stripe redirect handling, and CTA click wiring.
- Visual direction: light strategic-scan hero, subtle grid surface, Ciak yellow highlights, soft yellow borders/glows, restrained slate/deep-blue diagnostic panels.
- Avoid large full-width dark-blue slabs on this page.
- Hero title keeps the exact text `La chiarezza strategica per trasformare la tua competenza in un business digitale sostenibile.` and is tuned to render as three visual lines on desktop.
- The hero should present the product as a premium diagnostic offer, with a dark output panel listing:
  - Sessione strategica 60 min
  - Analisi di mercato specifica
  - Roadmap operativa personalizzata
- The output panel should not include a redundant footer row; internal deliverable text should be large and easy to read.
- Keep mobile-first spacing and full-width CTA buttons on narrow screens.
- Staggered cards, timeline markers, and a darker final decision CTA are acceptable when they preserve the locked copy and checkout behavior.

## Files

- Page: `frontend/src/ciak/pages/CiakBlueprint.jsx`
- Spec: `docs/superpowers/specs/2026-06-30-ciak-blueprint-design.md`
- Plan: `docs/superpowers/plans/2026-06-30-ciak-blueprint-layout.md`
