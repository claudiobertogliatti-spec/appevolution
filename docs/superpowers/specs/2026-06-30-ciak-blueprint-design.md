# Ciak Blueprint Design

Date: 2026-06-30

## Direction

The public `/ciak-blueprint` page should feel like a premium strategic-scan product page aligned with the approved Ciak landing, but more distinctive and memorable.

## Requirements

- Do not change checkout logic, API payload, Stripe redirect, or button behavior.
- Keep the existing strategic copy unless the user explicitly asks to change it.
- Replace the dominant dark hero slab with a light strategic-scan hero using a subtle grid surface and a dark diagnostic output panel.
- Use Ciak yellow as the main highlight through borders, glow, badges, and CTAs.
- Use deep blue/slate as an authority accent for diagnostic panels and decision CTAs, not as a full-page dominant background.
- Hero includes a dark strategic output panel with the three concrete deliverables:
  - Sessione strategica 60 min
  - Analisi di mercato specifica
  - Roadmap operativa personalizzata
- The output panel does not include a redundant footer row; its internal card text should be large and readable.
- In the `Cosa non è il Ciak Blueprint` section, omit the explanatory intro paragraph, align the negative list with the left title, and place the yellow protocol summary box below the title.
- The price/value line remains visible near the primary CTA.
- The hero title keeps the exact original text and is tuned to render as three visual lines on desktop.
- The page may use staggered cards, timeline markers, and a darker final decision CTA to make the offer more visually distinctive.
- Mobile layout stacks content cleanly, avoids horizontal overflow, and uses full-width CTAs where useful.

## Files

- Page: `frontend/src/ciak/pages/CiakBlueprint.jsx`
- Plan: `docs/superpowers/plans/2026-06-30-ciak-blueprint-layout.md`
- Memory: `memory/CIAK_BLUEPRINT_LAYOUT.md`

## Verification

- Run `npm run build` from `frontend`.
- Verify `/ciak-blueprint` at desktop and mobile widths.
- Confirm checkout buttons still call `startCheckout`.
