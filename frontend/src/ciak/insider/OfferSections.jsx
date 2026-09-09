import React, { useState } from 'react';
import './insider.css';
import { offerData } from './offerData';
import ContractAccept from './ContractAccept';
import { clientPost } from '../client/api';

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
 * Checkout wiring (Task 7):
 *  - Start CTA reuses the SAME call the client portal already uses
 *    (`clientPost('/start/checkout')` -> `POST /api/ciak/client/start/checkout`,
 *    verified in frontend/src/ciak/client/pages/StartPage.jsx). It relies on
 *    the client Bearer token already in localStorage from the prospect's
 *    earlier Blueprint magic-login — if that's missing/expired, `clientPost`
 *    throws "AUTH_EXPIRED" and we show an honest error, never a fake success.
 *  - Partnership CTA calls `POST /{token}/accetta`, then renders
 *    `ContractAccept` (checkbox-gated). Only on confirm does it call
 *    `POST /{token}/firma-contratto` (checkbox consent, Task 3) and, only if
 *    that succeeds, `POST /{token}/pagamento-stripe`, then redirects to the
 *    returned Stripe URL. Every step can fail honestly without faking the
 *    next one.
 *  - Opzione A' (post-review, B2B senza P.IVA obbligatoria): `firma-contratto`
 *    porta anche `dichiarazione_imprenditoriale: true` (gate: `ContractAccept`
 *    non chiama `onConfirm` finché entrambi i checkbox non sono spuntati) e
 *    `piva` (facoltativa, stringa vuota se non compilata).
 */
export default function OfferSections({
  token,
  partnerId,
  emphasis = { hero: 'partnership', startPreamble: false },
}) {
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState('');

  // 'idle' -> 'accepting' -> 'contract' -> 'processing'. Falls back to
  // 'contract' (not 'idle') on a post-acceptance failure so the prospect
  // doesn't have to re-accept the proposal to retry.
  const [partnershipStep, setPartnershipStep] = useState('idle');
  const [partnershipError, setPartnershipError] = useState('');

  async function handleSelectStart() {
    setStartError('');
    setStartLoading(true);
    try {
      const data = await clientPost('/start/checkout');
      if (!data.checkout_url) throw new Error('Checkout non disponibile');
      window.location.href = data.checkout_url;
    } catch (e) {
      setStartError(
        e.message === 'AUTH_EXPIRED'
          ? 'Devi accedere alla tua area cliente per attivare Ciak Start: usa il link ricevuto via email.'
          : e.message || 'Errore avvio checkout',
      );
      setStartLoading(false);
    }
  }

  async function handleSelectPartnership() {
    setPartnershipError('');
    setPartnershipStep('accepting');
    try {
      const res = await fetch(`/api/proposta/${token}/accetta`, { method: 'POST' });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      setPartnershipStep('contract');
    } catch (e) {
      setPartnershipError(e.message || 'Errore');
      setPartnershipStep('idle');
    }
  }

  async function handleConfirmContract({ piva } = {}) {
    setPartnershipError('');
    setPartnershipStep('processing');
    try {
      const signRes = await fetch(`/api/proposta/${token}/firma-contratto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clausole_vessatorie_approved: true,
          consenso_checkbox: true,
          dichiarazione_imprenditoriale: true,
          piva: piva || '',
        }),
      });
      if (!signRes.ok) throw new Error(`Errore ${signRes.status}`);

      const payRes = await fetch(`/api/proposta/${token}/pagamento-stripe`, { method: 'POST' });
      if (!payRes.ok) throw new Error(`Errore ${payRes.status}`);
      const payData = await payRes.json();
      if (!payData.checkout_url) throw new Error('Checkout non disponibile');
      window.location.href = payData.checkout_url;
    } catch (e) {
      // Torna alla schermata contratto (non a 'idle'): la proposta resta
      // accettata, il prospect non deve ripartire da capo per ritentare.
      setPartnershipError(e.message || 'Errore');
      setPartnershipStep('contract');
    }
  }

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
      onSelect={handleSelectStart}
      ctaLabel={startLoading ? 'Apro il checkout…' : 'Attiva Ciak Start'}
      ctaDisabled={startLoading}
      errorMessage={startError}
    />
  );

  const partnershipSection = (
    <OfferCard
      key="partnership"
      kind="partnership"
      offer={offerData.partnership}
      isHero
      onSelect={handleSelectPartnership}
      ctaLabel={partnershipStep === 'accepting' ? 'Un attimo…' : 'Entra in Partnership'}
      ctaDisabled={partnershipStep !== 'idle'}
      errorMessage={partnershipStep === 'idle' ? partnershipError : ''}
    >
      {partnershipStep === 'contract' || partnershipStep === 'processing' ? (
        <div className="insider-offer__contract-gate">
          <ContractAccept
            partnerId={partnerId}
            onConfirm={handleConfirmContract}
          />
          {partnershipError ? <p role="alert" className="insider-offer__error">{partnershipError}</p> : null}
        </div>
      ) : null}
    </OfferCard>
  );

  const sections = emphasis.hero === 'start'
    ? [startSection, partnershipSection]
    : [partnershipSection, startSection];

  return <div className="insider-offer-sections">{sections}</div>;
}

function OfferCard({
  kind, offer, isHero, preambleNote, creditCopy, onSelect, ctaLabel, ctaDisabled, errorMessage, children,
}) {
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
      <button type="button" className="insider-offer__cta" onClick={onSelect} disabled={ctaDisabled}>
        {ctaLabel}
      </button>
      {errorMessage ? <p role="alert" className="insider-offer__error">{errorMessage}</p> : null}
      {children}
    </section>
  );
}
