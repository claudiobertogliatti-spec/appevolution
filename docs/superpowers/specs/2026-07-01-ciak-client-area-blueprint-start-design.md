# Ciak Client Area, Blueprint And Start Design

## Goal

Create a separate client experience for people who enter the Ciak funnel before becoming partners.

The client area must educate the user, deliver the paid Blueprint value, support Ciak Start, and prepare the upgrade to the full partnership without confusing clients with partners.

## Strategic Principles

- Ciak is the guided path and operating cockpit.
- Blueprint is the paid diagnostic entry point at 27 euro.
- Ciak Start is a client product at 499 euro for users below 50 points.
- Partnership is a separate premium path at 2,790 euro plus 10 percent for 12 months, for users at or above 50 points.
- A Ciak Start customer is not a partner.
- If a Start customer later upgrades to Partnership, the 499 euro Start purchase is always credited.

## Offer Rules

### Ciak Blueprint

- Price: 27 euro.
- Creates the user account.
- Unlocks the Area Cliente Ciak.
- Generates the diagnostic analysis, roadmap, Claudio call script, call slide/deck material, and booking path.

### Ciak Start

- Price: 499 euro.
- Target: users with Blueprint score below 50.
- Customer status: client, not partner.
- Included services:
  - social cleanup and direction;
  - base brand direction;
  - first positioning;
  - simple showcase website;
  - content calendar;
  - content strategy;
  - preparation for a future Partnership.
- Upgrade credit: 499 euro, always guaranteed.

### Partnership

- Price: 2,790 euro.
- Target: users with Blueprint score at or above 50, or Start customers ready to upgrade.
- If upgraded from Start, checkout total is 2,291 euro.
- Partner area remains separate from the client area and uses the full Metodo EVO operating path.

## Account And Credentials

The system uses one account across the funnel.

After Blueprint purchase:

1. The system creates or updates a Ciak client account using the checkout/form email.
2. The user receives an email with a secure magic login link.
3. The magic link opens the Area Cliente Ciak.
4. The user can set a personal password after first access.

Access levels:

- `cliente_blueprint`: Blueprint analysis, roadmap, call booking, preparatory materials.
- `cliente_start`: all Blueprint access plus Start workspace and service progress.
- `partner`: full partner area after Partnership activation.

Passwords must not be emailed in clear text. Magic links must be temporary, single-use where practical, and tied to the email identity.

## Client Area Name

User-facing name:

> Il tuo percorso Ciak

This name works for Blueprint users, Start customers, and future partners without implying they are already partners.

## Area Cliente Structure

### Home

Purpose: show the next best action.

States:

- Analysis being prepared.
- Analysis ready.
- Call to book.
- Call booked.
- Call completed, next offer available.
- Start active.
- Upgrade available.

The home should never feel like a generic dashboard. It should answer: what happens now?

### Blueprint Section

Contains:

- score and readiness explanation;
- analysis teaser or full analysis when available;
- roadmap;
- downloadable PDF if available;
- call booking CTA;
- state of the strategic session.

The Blueprint section should make the 27 euro purchase feel concrete before any higher offer is made.

### Call Materials For Claudio

Internal admin-side artifacts generated from Blueprint:

- definitive analysis;
- roadmap;
- Claudio call script;
- slide/deck outline for the videocall;
- key objections;
- recommended offer path.

These artifacts are not all public. The client sees only the materials intended for them. Claudio and admin see the call materials.

### Ciak Start Section

Visible only after Start is proposed or purchased.

When proposed:

- explains why Start is the right next step;
- shows the included services;
- shows price 499 euro;
- clearly says the 499 euro becomes guaranteed credit toward Partnership.

When purchased:

- shows Start service checklist;
- tracks progress and deliverables;
- stores materials delivered by the team;
- keeps a clear upgrade CTA.

Suggested Start checklist:

- Positioning direction.
- Brand basics.
- Social profile cleanup.
- Showcase site.
- Content strategy.
- Content calendar.
- Final review and upgrade readiness.

### Partnership Education Section

Purpose: educate, not pressure.

Contains a short video course or lesson sequence explaining:

- what happens inside the Partnership;
- what Evolution builds;
- what the customer must provide;
- why Systeme.io stays in the future partner's own space;
- why the 10 percent exists;
- what the 12-month operating path includes;
- how the 499 euro Start credit works.

For Start customers, this section should show:

- Partnership full price: 2,790 euro.
- Ciak Start credit: -499 euro.
- Upgrade total: 2,291 euro.

## Score-Based Routing

Blueprint score controls the recommended offer, not account creation.

- Score below 50: recommend Ciak Start.
- Score 50 or above: recommend Partnership.

Admin must be able to override the recommended path after the call, but the system should keep the original score and recommendation visible for audit.

Recommended fields:

- `blueprint_score`
- `recommended_offer`
- `offer_decision`
- `offer_decided_by`
- `offer_decided_at`
- `start_credit_amount`
- `start_credit_applied`

## Admin Experience

Admin needs a client pipeline separate from the partner pipeline.

Pipeline buckets:

- Blueprint purchased.
- Analysis generated.
- Analysis validated.
- Call booked.
- Call completed.
- Start proposed.
- Start active.
- Partnership proposed.
- Upgraded to partner.

Admin actions:

- generate or regenerate analysis artifacts;
- validate client-facing analysis;
- view Claudio call script and slide/deck outline;
- mark call outcome;
- propose Start;
- propose Partnership;
- activate Start after payment;
- upgrade Start customer to Partnership with guaranteed credit.

## Data Model Direction

Prefer a dedicated client status over overloading partner records.

Suggested records:

- Existing `diagnostic_sessions` remains the source for Blueprint answers, score, and state.
- Existing `ciak_analisi` remains the source for analysis, roadmap, and call artifacts.
- Add or extend a `ciak_clients` style record for account/access state, offer state, and Start progress.

Do not rename historical technical states such as `purchased_67` without a full migration audit. If needed, introduce display labels and aliases while preserving old state keys.

## Payment Rules

Blueprint:

- amount: 27 euro;
- unlocks `cliente_blueprint`.

Start:

- amount: 499 euro;
- unlocks `cliente_start`;
- sets guaranteed `start_credit_amount = 499`.

Partnership:

- normal amount: 2,790 euro;
- upgrade from Start amount: 2,291 euro;
- credit must be visible in checkout and in admin.

## Migration And Compatibility

The project still contains legacy language around 67 euro analysis and old partnership decision routes.

Implementation must:

- keep legacy technical keys where needed;
- update visible labels to Blueprint 27 euro;
- preserve existing checkout/webhook behavior while adding Start and upgrade flows;
- avoid converting Start customers into partners;
- route partners only after Partnership activation.

## Testing

Backend checks:

- Blueprint purchase creates client account/access.
- Magic login flow grants correct access.
- Score below 50 recommends Start.
- Score 50 or above recommends Partnership.
- Start purchase unlocks `cliente_start`.
- Start upgrade checkout applies 499 euro credit.
- Partnership direct checkout remains 2,790 euro.

Frontend checks:

- Area Cliente loads for Blueprint users.
- Start section is hidden before proposal/purchase.
- Start service progress is visible after purchase.
- Partnership education section shows correct pricing and credit.
- Partner area stays unavailable until Partnership activation.

Browser checks:

- Blueprint client first login.
- Analysis ready state.
- Call booking state.
- Start proposal state.
- Start active state.
- Upgrade to Partnership state.
- Mobile layout without horizontal overflow.

## Non-Goals

- Do not build the full partner journey again inside the client area.
- Do not make Start customers partners.
- Do not expose Claudio's internal call script to the client.
- Do not rename all historical 67 euro technical states in this pass.
- Do not automate ad spend, publishing, or external platform changes as part of Start.
