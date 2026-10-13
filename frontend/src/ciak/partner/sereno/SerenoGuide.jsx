import React from 'react';
import { Link } from 'react-router-dom';
import { GUIDE, VIDEO_DI_PROVA, REGOLE_VIDEO, PUBBLICAZIONE, EXTRA_CONTENUTI } from './guideContent';
import { BOOSTER_CATALOG } from '../booster/boosterCatalog';

function ExtraBox({ id, testo }) {
  const extra = BOOSTER_CATALOG[id];
  if (!extra) return null;
  return <aside className="sereno-extra-tappa" aria-label={`Se preferisci che lo facciamo noi: ${extra.name}`}>
    <div><p className="sereno-extra-eyebrow">Preferisci che lo facciamo noi?</p><h3>{extra.name}</h3><p>{testo}</p></div>
    <div className="sereno-extra-side"><strong>{extra.prezzo}</strong>
      <Link className="sereno-secondary" to={`/partner/servizi-extra/${extra.id}`}>Scopri</Link></div>
  </aside>;
}

export default function SerenoGuide() {
  return <>
    <header className="sereno-intro"><h1>Guide.</h1><p>Istruzioni semplici, una alla volta, per registrare e per i tuoi contenuti social.</p></header>
    <section className="sereno-guida sereno-guida-chiave" aria-labelledby="guida-video">
      <h2 id="guida-video">Le tue lezioni: come ce le mandi</h2>
      <ol>{REGOLE_VIDEO.map(([t, d]) => <li key={t}><strong>{t}.</strong> {d}</li>)}</ol>
      <h3>Guarda un esempio</h3>
      {VIDEO_DI_PROVA.length > 0
        ? <ul>{VIDEO_DI_PROVA.map(v => <li key={v.url}><a href={v.url} target="_blank" rel="noopener noreferrer">{v.titolo}</a></li>)}</ul>
        : <p className="sereno-guida-nota">In arrivo: tre video brevi che ti mostrano la distanza dalla telecamera, lo sfondo e la luce.</p>}
    </section>
    {GUIDE.map(g => <React.Fragment key={g.id}><section className="sereno-guida" aria-labelledby={`guida-${g.id}`}>
      <h2 id={`guida-${g.id}`}>{g.titolo}</h2><p>{g.intro}</p>
      <ol>{g.passi.map(([t, d]) => <li key={t}><strong>{t}.</strong> {d}</li>)}</ol>
      {g.nota && <p className="sereno-guida-nota">{g.nota}</p>}
    </section>{g.extra && <ExtraBox id={g.extra} testo={g.extraTesto} />}</React.Fragment>)}
    <ExtraBox id={EXTRA_CONTENUTI} testo={PUBBLICAZIONE} />
  </>;
}
