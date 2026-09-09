import React, { useRef, useState } from 'react';
import './insider.css';
import { offerData } from './offerData';
import ContractAccept from './ContractAccept';
import { clientPost } from '../client/api';

/**
 * OfferSections — copy di vendita post-call APPROVATO da Claudio (9/9).
 *
 * Modello foot-in-the-door: Ciak Start è il primo passo dato per scontato
 * (390 €, credito verso la Partnership), poi la Partnership è l'upgrade
 * ("turbo") e mantiene SEMPRE il trattamento visivo hero. L'ordine in pagina
 * è FISSO: ponte → Ciak Start → divider "turbo" → Partnership. I prezzi sono
 * reali (offerData / pricing.js): Start 390 €, Partnership 2.990 € / 2.600 €.
 *
 * Checkout wiring (invariato):
 *  - Start CTA riusa `clientPost('/start/checkout')` -> POST
 *    /api/ciak/client/start/checkout (stesso token cliente del portale). Se il
 *    token manca/è scaduto, `clientPost` lancia "AUTH_EXPIRED" → errore onesto,
 *    mai un finto successo.
 *  - Partnership CTA: POST /{token}/accetta → `ContractAccept` (2 checkbox
 *    obbligatori) → solo su conferma POST /{token}/firma-contratto (consenso +
 *    dichiarazione imprenditoriale + P.IVA facoltativa) e, solo se ok, POST
 *    /{token}/pagamento-stripe → redirect a Stripe. Ogni step fallisce onesto.
 *  - I gate legale/fiscale sui pagamenti restano lato backend (paid_offer_gate):
 *    se chiusi, `checkoutReadiness` disabilita le CTA e mostra il messaggio.
 */
export default function OfferSections({ token, partnerId, name, checkoutReadiness }) {
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState('');
  const startBusy = useRef(false);
  const contractBusy = useRef(false);
  const startEnabled = checkoutReadiness?.start?.enabled === true;
  const partnershipEnabled = checkoutReadiness?.partnership?.enabled === true;
  const closedMessage = checkoutReadiness?.message
    || 'Il pagamento non è ancora disponibile. Il team ti avviserà quando potrai procedere.';

  // 'idle' -> 'accepting' -> 'contract' -> 'processing'. Falls back to
  // 'contract' (not 'idle') on a post-acceptance failure so the prospect
  // doesn't have to re-accept the proposal to retry.
  const [partnershipStep, setPartnershipStep] = useState('idle');
  const [partnershipError, setPartnershipError] = useState('');

  const firstName = (name || '').trim().split(/\s+/)[0] || '';

  async function handleSelectStart() {
    if (!startEnabled || startBusy.current) return;
    startBusy.current = true;
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
      startBusy.current = false;
    }
  }

  async function handleSelectPartnership() {
    if (!partnershipEnabled || partnershipStep !== 'idle') return;
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
    if (!partnershipEnabled || contractBusy.current) return;
    contractBusy.current = true;
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
      if (!signRes.ok) throw new Error(await responseError(signRes));

      const payRes = await fetch(`/api/proposta/${token}/pagamento-stripe`, { method: 'POST' });
      if (!payRes.ok) throw new Error(await responseError(payRes));
      const payData = await payRes.json();
      if (!payData.checkout_url) throw new Error('Checkout non disponibile');
      window.location.href = payData.checkout_url;
    } catch (e) {
      // Torna alla schermata contratto (non a 'idle'): la proposta resta
      // accettata, il prospect non deve ripartire da capo per ritentare.
      setPartnershipError(e.message || 'Errore');
      setPartnershipStep('contract');
      contractBusy.current = false;
    }
  }

  return (
    <div className="insider-offer-sections">
      <p className="insider-offer-bridge">
        <strong>{firstName ? `Bene ${firstName}` : 'Bene'}</strong>, ora finalmente il tuo Progetto ha
        una direzione chiara! Hai visto cosa funziona e dove, invece, si nasconde il collo di bottiglia.
      </p>

      <OfferCard
        kind="start"
        offer={offerData.start}
        isHero={false}
        onSelect={handleSelectStart}
        ctaLabel={startLoading ? 'Apro il checkout…' : offerData.start.cta}
        ctaDisabled={!startEnabled || startLoading}
        errorMessage={startError || (!startEnabled ? closedMessage : '')}
      />

      <div className="insider-turbo"><span>Se vuoi mettere il turbo al tuo Progetto</span></div>

      <OfferCard
        kind="partnership"
        offer={offerData.partnership}
        isHero
        onSelect={handleSelectPartnership}
        ctaLabel={partnershipStep === 'accepting' ? 'Un attimo…' : offerData.partnership.cta}
        ctaDisabled={!partnershipEnabled || partnershipStep !== 'idle'}
        errorMessage={!partnershipEnabled ? closedMessage : partnershipStep === 'idle' ? partnershipError : ''}
      >
        {partnershipStep === 'contract' || partnershipStep === 'processing' ? (
          <div className="insider-offer__contract-gate">
            <ContractAccept
              partnerId={partnerId}
              onConfirm={handleConfirmContract}
              disabled={!partnershipEnabled || partnershipStep === 'processing'}
            />
            {partnershipError ? <p role="alert" className="insider-offer__error">{partnershipError}</p> : null}
          </div>
        ) : null}
      </OfferCard>
    </div>
  );
}

async function responseError(response) {
  const data = await response.json().catch(() => ({}));
  return data?.detail?.message || (typeof data?.detail === 'string' ? data.detail : `Errore ${response.status}`);
}

function OfferCard({ kind, offer, isHero, onSelect, ctaLabel, ctaDisabled, errorMessage, children }) {
  const bodyParagraphs = Array.isArray(offer.body) ? offer.body : (offer.body ? [offer.body] : []);
  return (
    <section
      className={`insider-offer${isHero ? ' insider-offer--hero' : ''}`}
      data-offer={kind}
    >
      <h2 className="insider-offer__name">{offer.name}</h2>
      <p className="insider-offer__price">
        {offer.price}
        {offer.priceNote ? <small>{offer.priceNote}</small> : null}
      </p>
      {bodyParagraphs.map((paragraph, index) => (
        <p key={index} className="insider-offer__body">{paragraph}</p>
      ))}
      {offer.creditCopy ? <p className="insider-offer__credit">{offer.creditCopy}</p> : null}
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
