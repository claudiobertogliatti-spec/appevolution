import React from 'react';
import { Link } from 'react-router-dom';
import { GUIDE, VIDEO_DI_PROVA, PUBBLICAZIONE, EXTRA_CONTENUTI } from './guideContent';
import { BOOSTER_CATALOG } from '../booster/boosterCatalog';

export default function SerenoGuide() {
  const extra = BOOSTER_CATALOG[EXTRA_CONTENUTI];
  return <>
    <header className="sereno-intro"><h1>Guide.</h1><p>Istruzioni semplici, una alla volta, per registrare e per i tuoi contenuti social.</p></header>
    {VIDEO_DI_PROVA.length > 0 && <section className="sereno-guida" aria-labelledby="guida-video">
      <h2 id="guida-video">Video di esempio</h2>
      <ul>{VIDEO_DI_PROVA.map(v => <li key={v.url}><a href={v.url} target="_blank" rel="noopener noreferrer">{v.titolo}</a></li>)}</ul>
    </section>}
    {GUIDE.map(g => <section className="sereno-guida" key={g.id} aria-labelledby={`guida-${g.id}`}>
      <h2 id={`guida-${g.id}`}>{g.titolo}</h2><p>{g.intro}</p>
      <ol>{g.passi.map(([t, d]) => <li key={t}><strong>{t}.</strong> {d}</li>)}</ol>
      {g.nota && <p className="sereno-guida-nota">{g.nota}</p>}
    </section>)}
    <aside className="sereno-extra-tappa" aria-label="Se preferisci che lo facciamo noi">
      <div><p className="sereno-extra-eyebrow">Preferisci che lo facciamo noi?</p>
        {extra && <h3>{extra.name}</h3>}<p>{PUBBLICAZIONE}</p></div>
      {extra && <div className="sereno-extra-side"><strong>{extra.prezzo}</strong>
        <Link className="sereno-secondary" to={`/partner/servizi-extra/${extra.id}`}>Scopri</Link></div>}
    </aside>
  </>;
}
