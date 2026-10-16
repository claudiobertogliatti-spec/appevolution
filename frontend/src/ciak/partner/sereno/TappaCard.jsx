import React from 'react';
import { Link } from 'react-router-dom';
import { TAPPE } from './tappe';
import { BOOSTER_CATALOG } from '../booster/boosterCatalog';

/** La tappa in corso: immagine, cosa facciamo, perché, cosa avrai. Poi un solo servizio extra, se il partner vuole delegare. */
export function TappaCard({ macroPhase }) {
  const t = TAPPE[macroPhase];
  if (!t) return null;
  return <section className="sereno-tappa" aria-labelledby="sereno-tappa-title">
    <img src={t.immagine} alt={t.alt} loading="lazy" />
    <div className="sereno-tappa-body">
      <p className="sereno-tappa-num">Tappa {t.numero} di 3 · {t.nome}</p>
      <h2 id="sereno-tappa-title">{t.motto}</h2>
      <dl>
        <div><dt>Cosa facciamo</dt><dd>{t.cosa}</dd></div>
        <div><dt>Perché</dt><dd>{t.perche}</dd></div>
        <div><dt>Alla fine avrai</dt><dd>{t.alla_fine}</dd></div>
      </dl>
    </div>
  </section>;
}

export function ExtraTappa({ macroPhase }) {
  const t = TAPPE[macroPhase];
  const servizio = t && BOOSTER_CATALOG[t.extra];
  if (!servizio) return null;
  return <aside className="sereno-extra-tappa" aria-label="Se preferisci che lo facciamo noi">
    <div><p className="sereno-extra-eyebrow">Preferisci che lo facciamo noi?</p>
      <h3>{servizio.name}</h3><p>{servizio.beneficio}</p></div>
    <div className="sereno-extra-side"><strong>{servizio.prezzo}</strong>
      <Link className="sereno-secondary" to={`/partner/servizi-extra/${servizio.id}`}>Scopri</Link></div>
  </aside>;
}
