# Ciak Video Opt-in Memory

Date: 2026-06-30

## Decision

The public `ciak.io` opt-in hero is the new visual reference for future partner-area layout work.

## Creative Direction

- N26-like cleanliness and trust.
- Ciak colors and identity.
- Hero message: `Il Sistema AI che progetta la tua crescita digitale`.
- Local looping MP4 as the full hero background, with explicit volume toggle.
- Large centered hero title over the video, inspired by N26-style product pages.
- Hero title is Ciak deep blue (`slate-900`), not white.
- No subtitle under the hero title; the masterclass opt-in form follows immediately.
- Under the hero form, use a premium dark-blue bordered/glowing box with the exact text `Scopri i 5 errori killer (e come evitarli) che bloccano la crescita di molti professionisti, prima di investire tempo e denaro nella direzione sbagliata.`, formatted as three visual lines.
- The old three hero chips (`Analisi`, `Direzione`, `Crescita`) are removed.
- Keep the best existing copy: strategic direction, structure before execution, masterclass and Checkpoint Strategico.
- Problem-section headline: exact text `Non ti manca presenza online, ti manca una direzione.`, formatted as three visual lines.
- Final CTA: keep the copy exactly as written, remove the full dark-blue background, and present it in a white section with a highlighted box, soft yellow border, and yellow glow.
- Mobile: avoid horizontal overflow; cookie banner buttons stack full-width on narrow screens.
- Below the hero, the page should explain: the real problem, the Ciak method, the three-level path, and a final opt-in CTA.

## Files

- Landing page: `frontend/src/ciak/pages/Landing.jsx`
- Video asset: `frontend/public/ciak/ciak-spot.mp4`
- Design spec: `docs/superpowers/specs/2026-06-30-ciak-video-optin-design.md`

## Verification

Run `npm run build` from `frontend`; build must exit with code 0.
