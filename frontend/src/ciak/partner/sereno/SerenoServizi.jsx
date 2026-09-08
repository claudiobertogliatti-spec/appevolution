import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GROUPS } from '../sections/BoosterEvoPage';

// "Servizi aggiuntivi": calm framing over the real catalog. Optional by design,
// and it never invents a price — the real catalog (prices, timing, checkout)
// stays in the existing /partner/servizi-extra flow.
export default function SerenoServizi() {
  return (
    <>
      <header className="sereno-intro">
        <h1>Servizi aggiuntivi.</h1>
        <p>Un aiuto in più, quando è utile al tuo progetto.</p>
      </header>

      <section className="sereno-focus">
        <span className="sereno-badge">Facoltativi</span>
        <h2>Il tuo percorso resta completo.</h2>
        <p>Questi servizi sono opzionali: non servono per completare ciò che hai già acquistato. Li attivi solo se ti servono, con prezzi e tempi chiari prima di scegliere.</p>
      </section>

      <div className="sereno-columns">
        {GROUPS.map((g) => (
          <section key={g.title} className="sereno-panel">
            <h3>{g.title}</h3>
            <p>{g.subtitle}</p>
            <Link to="/partner/servizi-extra">Vedi i servizi →</Link>
          </section>
        ))}
      </div>

      <div className="sereno-actions">
        <Link className="sereno-primary" to="/partner/servizi-extra">Sfoglia tutti i servizi <ArrowRight aria-hidden="true" /></Link>
      </div>
      <p className="sereno-note">Prezzi, tempi e modalità di ogni servizio sono nel catalogo, senza nulla di simulato.</p>
    </>
  );
}
