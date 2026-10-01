import React from 'react';

/** Chiusura: tre passaggi chiari, la scadenza REALE (se c'è) e la porta aperta alle domande. */
export default function FinalCta({ deadlineLabel, onAsk }) {
  return (
    <section className="pc-section pc-dark pc-final" id="chiusura">
      <div className="pc-wrap">
        <p className="pc-eyebrow">Adesso tocca a te</p>
        <h2 className="pc-final__title">Il Blueprint dice dove sei. La data la scegli tu.</h2>
        <div className="pc-three">
          <div><b>1 · Scegli il percorso</b>Partnership o Ciak Start, come da Blueprint.</div>
          <div><b>2 · Leggi e accetta</b>Il contratto è in chiaro, con la chat per i dubbi.</div>
          <div><b>3 · Completa il pagamento</b>Carta, rate con Klarna (se disponibile) o bonifico. Poi si parte.</div>
        </div>
        <div className="pc-cta-row">
          <a className="pc-btn pc-btn--yellow" href="#offerta">Scelgo il mio percorso</a>
          {onAsk ? <button type="button" className="pc-btn pc-btn--ghost" onClick={onAsk}>Ho una domanda prima di decidere</button> : null}
        </div>
        <p className="pc-final__small">
          {deadlineLabel
            ? `Questa pagina resta aperta fino a ${deadlineLabel}. Dopo quella data si chiude e, se serve, la riapriamo. `
            : ''}
          Nessun guadagno garantito.
        </p>
      </div>
    </section>
  );
}
