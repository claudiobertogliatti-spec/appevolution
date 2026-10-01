import React from 'react';

/**
 * I dubbi che bloccano di solito. Risposte coerenti con il contratto (Art. 5.7, 5.2, 8.2):
 * niente rimborsi promessi, niente "tutto tuo al 100%", niente tempi garantiti.
 */
export default function Objections({ deadlineLabel, onAsk }) {
  return (
    <section className="pc-section">
      <div className="pc-wrap">
        <p className="pc-kicker">I dubbi che arrivano di solito</p>
        <h2 className="pc-h2">Tre risposte prima che tu debba chiederle.</h2>
        <div className="pc-faq">
          <div className="pc-panel">
            <h3>«Non ho tempo per un corso»</h3>
            <p>La tua parte è piccola e delimitata: mettere voce e competenza. Strategia, pagine e percorso di vendita li costruisce il team. Non fa tutto l'AI: la voce resta tua.</p>
          </div>
          <div className="pc-panel">
            <h3>«Non so se sono pronta»</h3>
            <p>Il tuo Blueprint dice a che punto sei. Se vuoi un gradino più basso, parti da Ciak Start: i 390 € ti tornano interi come credito sulla Partnership.</p>
          </div>
          <div className="pc-panel">
            <h3>«Voglio leggere tutto con calma»</h3>
            <p>
              Giusto. Il contratto è scritto in chiaro e puoi fare domande in chat prima di firmare, anche sui punti scomodi.
              {deadlineLabel ? ` La proposta resta aperta fino a ${deadlineLabel}.` : ''}{' '}
              {onAsk ? <button type="button" className="pc-linkbtn" onClick={onAsk}>Chiedi adesso</button> : null}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
