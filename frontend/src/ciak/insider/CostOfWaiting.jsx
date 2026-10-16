import React from 'react';

/**
 * Cosa comporta restare fermi, e cosa comporta partire. Costruito SOLO con le parole del
 * Blueprint di questa persona (problema, rischio, cosa manca): se mancano, la sezione non
 * compare. Nessuna statistica, nessuna promessa: per questo c'è anche il riquadro onesto.
 */
export default function CostOfWaiting({ blueprint }) {
  const problema = blueprint?.problema;
  const rischio = blueprint?.rischio?.lead;
  if (!problema && !rischio) return null;

  const costruisci = (blueprint?.manca || []).map((m) => m.h).filter(Boolean).slice(0, 3);

  return (
    <section className="pc-section">
      <div className="pc-wrap">
        <p className="pc-kicker">Cosa comporta, davvero</p>
        <h2 className="pc-h2">Restare ferma ha un costo. Partire anche. Ecco entrambi.</h2>

        <div className="pc-cost">
          <div className="pc-panel pc-cost__stay">
            <h3>Se aspetti o continui come ora</h3>
            <ul>
              {problema ? <li><i aria-hidden="true">→</i><span>Il nodo del tuo Blueprint resta dov'è: <b>{problema}</b></span></li> : null}
              {rischio ? <li><i aria-hidden="true">→</i><span>{rischio}</span></li> : null}
              <li><i aria-hidden="true">→</i><span>La data di partenza si sposta in avanti, un mese per ogni mese di attesa.</span></li>
            </ul>
          </div>
          <div className="pc-panel pc-cost__go">
            <h3>Se parti adesso</h3>
            <ul>
              {costruisci.length ? (
                <li><i aria-hidden="true">✓</i><span>Metti in piedi quello che oggi manca: {costruisci.join(', ').toLowerCase()}.</span></li>
              ) : null}
              <li><i aria-hidden="true">✓</i><span>Hai un piano con le date, non un'idea da rimandare.</span></li>
              <li><i aria-hidden="true">✓</i><span>Il lavoro pesante lo fa il team. Tu metti la competenza e la voce.</span></li>
            </ul>
          </div>
        </div>

        <p className="pc-honest">
          <b>Una cosa onesta.</b> Nessun guadagno è garantito: costruiamo un percorso, non promesse. E decidere in fretta senza leggere
          non serve a nessuno: per questo il contratto è scritto in chiaro e puoi farci domande prima di firmare.
        </p>
      </div>
    </section>
  );
}
