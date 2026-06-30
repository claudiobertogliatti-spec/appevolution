# Ciak Video Opt-in Design

Date: 2026-06-30

## Goal

Turn the public Ciak opt-in hero into the visual and messaging reference for the next partner-area redesign.

## Direction

Use the local video `Ciak_Spot.mp4` as a looping full-bleed hero background, with an N26-like clean product layout and Ciak colors.

The hero should communicate:

> Il Sistema AI che progetta la tua crescita digitale

The existing page copy remains useful and should be reused in a tighter structure:

- Ciak helps consultants and professionals understand the strategic direction of their digital project.
- The problem is not execution first; it is structure.
- The masterclass and Checkpoint Strategico remain the primary opt-in flow.

## UX Requirements

- Use a local MP4 in `frontend/public/ciak/`.
- The video is the hero background, not a side card.
- The video autoplays, loops, is inline, and starts muted.
- Add a visible volume toggle button over the video.
- Keep the primary title large and centered over the video.
- The primary title uses Ciak deep blue (`slate-900`) over the video.
- Do not show a hero subtitle below the title; keep the opt-in form as the immediate next element.
- Under the hero form, show a premium dark-blue bordered/glowing explanatory box with the exact text `Scopri i 5 errori killer (e come evitarli) che bloccano la crescita di molti professionisti, prima di investire tempo e denaro nella direzione sbagliata.`, formatted as three visual lines.
- Do not use the three small hero chips (`Analisi`, `Direzione`, `Crescita`) in the video hero.
- Preserve the existing name/email capture behavior and validation.
- Keep the CTA `Accedi alla masterclass`.
- Use Ciak palette: white, `slate-900`, `yellow-400`, muted slate text.
- The page should feel clean, premium, and product-led, closer to N26 than to a dense dashboard.
- Below the hero, reuse the original page logic with stronger copy and cleaner graphics: problem, method, path, final CTA.
- The problem-section headline must read exactly `Non ti manca presenza online, ti manca una direzione.` and be formatted as three visual lines.
- The final CTA must keep its copy exactly as written, remove the full dark-blue background, and use a white page section with a highlighted box, soft yellow border, and yellow glow.
- Mobile layout must not create horizontal overflow; the cookie banner actions stack full-width on narrow screens.

## Implementation Scope

- Modify `frontend/src/ciak/pages/Landing.jsx`.
- Add `frontend/public/ciak/ciak-spot.mp4`.
- Add memory note for future agents.
- No backend changes.

## Verification

- Run `npm run build` in `frontend`.
- Confirm the build exits with code 0.
- Existing unrelated React hook warnings are acceptable.
