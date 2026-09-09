import React from 'react';
import './insider.css';
import { offerData } from './offerData';

/**
 * OfferSections — Start "preambolo" + Partnership, insider closing page.
 *
 * Prices are real (offerData.js is the single source): Start 390 €,
 * Partnership 2.990 €. Start is a credit toward Partnership, never a
 * separate spend — the copy says so explicitly.
 *
 * `emphasis` (from offerEmphasis, Task 4) only ever changes presentation:
 *  - `emphasis.hero` decides which section renders first in the DOM.
 *  - Partnership keeps its "hero" visual treatment (badge, accent border)
 *    even when Start is the preamble (`emphasis.startPreamble`), so a
 *    warm-but-not-ready prospect sees Start first without the page
 *    anchoring on the smaller offer.
 *
 * CTAs call `onSelectStart` / `onSelectPartnership` (optional props, default
 * no-op placeholders). The real checkout wiring is Task 7 — this component
 * never calls `fetch` itself.
 */
export default function OfferSections({
  token,
  emphasis = { hero: 'partnership', startPreamble: false },
  onSelectStart,
  onSelectPartnership,
}) {
  // Partnership is ALWAYS the visual hero (badge/accent/primary CTA) — the
  // anti-anchoring rule. `emphasis.hero` only ever controls display ORDER.
  const startSection = (
    <OfferCard
      key="start"
      kind="start"
      offer={offerData.start}
      isHero={false}
      preambleNote={
        emphasis.startPreamble
          ? 'Il passo giusto adesso: costruisci le fondazioni, poi decidi con calma sulla Partnership.'
          : null
      }
      creditCopy={offerData.start.creditCopy}
      onSelect={() => (onSelectStart ? onSelectStart(token) : undefined)}
      ctaLabel="Attiva Ciak Start"
    />
  );

  const partnershipSection = (
    <OfferCard
      key="partnership"
      kind="partnership"
      offer={offerData.partnership}
      isHero
      onSelect={() => (onSelectPartnership ? onSelectPartnership(token) : undefined)}
      ctaLabel="Entra in Partnership"
    />
  );

  const sections = emphasis.hero === 'start'
    ? [startSection, partnershipSection]
    : [partnershipSection, startSection];

  return <div className="insider-offer-sections">{sections}</div>;
}

function OfferCard({ kind, offer, isHero, preambleNote, creditCopy, onSelect, ctaLabel }) {
  return (
    <section
      className={`insider-offer${isHero ? ' insider-offer--hero' : ''}`}
      data-offer={kind}
    >
      {isHero ? <p className="insider-offer__badge">Consigliata per te</p> : null}
      <h2 className="insider-offer__name">{offer.name}</h2>
      <p className="insider-offer__price">{offer.price}</p>
      {offer.tagline ? <p className="insider-offer__tagline">{offer.tagline}</p> : null}
      {preambleNote ? <p className="insider-offer__preamble-note">{preambleNote}</p> : null}
      {creditCopy ? <p className="insider-offer__credit">{creditCopy}</p> : null}
      <ul className="insider-offer__services">
        {offer.servizi.map((voce) => (
          <li key={voce}>{voce}</li>
        ))}
      </ul>
      <button type="button" className="insider-offer__cta" onClick={onSelect}>
        {ctaLabel}
      </button>
    </section>
  );
}
