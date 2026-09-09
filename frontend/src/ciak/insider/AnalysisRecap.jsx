import React from 'react';
import './insider.css';

/**
 * Rilettura dell'analisi ("ecco cosa abbiamo visto di te").
 *
 * `analisi` è il valore reale di `analisi_definitiva` per questo lead
 * (stringa, eventualmente multi-riga). Honesty rule: se manca, si dice
 * la verità con un placeholder neutro — non si inventa mai un contenuto.
 */
export default function AnalysisRecap({ analisi }) {
  const paragraphs = (analisi || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section className="insider-analysis-recap">
      <h2 className="insider-analysis-recap__title">Ecco cosa abbiamo visto di te</h2>
      {paragraphs.length > 0 ? (
        <div className="insider-analysis-recap__body">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="insider-analysis-recap__placeholder">
          La tua analisi sarà qui a breve.
        </p>
      )}
    </section>
  );
}
