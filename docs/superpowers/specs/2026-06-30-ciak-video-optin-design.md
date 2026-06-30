# Ciak Video Opt-in Design

Date: 2026-06-30

## Goal

Turn the public Ciak opt-in hero into the visual and messaging reference for the next partner-area redesign.

## Direction

Use the local video `Ciak_Spot.mp4` as a looping hero asset, with an N26-like clean product layout and Ciak colors.

The hero should communicate:

> Il Sistema AI che progetta la tua crescita digitale

The existing page copy remains useful and should be reused in a tighter structure:

- Ciak helps consultants and professionals understand the strategic direction of their digital project.
- The problem is not execution first; it is structure.
- The masterclass and Checkpoint Strategico remain the primary opt-in flow.

## UX Requirements

- Use a local MP4 in `frontend/public/ciak/`.
- The video autoplays, loops, is inline, and starts muted.
- Add a visible volume toggle button over the video.
- Preserve the existing name/email capture behavior and validation.
- Keep the CTA `Accedi alla masterclass`.
- Use Ciak palette: white, `slate-900`, `yellow-400`, muted slate text.
- The page should feel clean, premium, and product-led, closer to N26 than to a dense dashboard.

## Implementation Scope

- Modify `frontend/src/ciak/pages/Landing.jsx`.
- Add `frontend/public/ciak/ciak-spot.mp4`.
- Add memory note for future agents.
- No backend changes.

## Verification

- Run `npm run build` in `frontend`.
- Confirm the build exits with code 0.
- Existing unrelated React hook warnings are acceptable.

