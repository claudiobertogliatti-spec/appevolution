import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ArrowRight } from 'lucide-react';
import { PLANS } from '../sections/EvoSPage';

// "Il tuo piano": current status first — never invents a plan or an expiry.
// The renewal options reuse the real EVO S data (prices from a single source,
// not retyped), and the checkout stays in the existing /partner/rinnovo flow.
export default function SerenoPiano({ plan }) {
  return (
    <>
      <header className="sereno-intro">
        <h1>Il tuo piano.</h1>
        <p>Cosa comprende il tuo supporto e come continuare.</p>
      </header>

      <section className="sereno-panel">
        <h3><CreditCard aria-hidden="true" />Il tuo periodo di supporto</h3>
        {plan ? (
          <>
            <div className="sereno-row"><span>Piano attuale</span><span className="sereno-badge">{plan.name}</span></div>
            {plan.scadenza && <div className="sereno-row"><span>Scadenza</span><span>{plan.scadenza}</span></div>}
          </>
        ) : (
          <>
            <p>Durata, servizi inclusi e scadenza vengono mostrati dai dati verificati del tuo piano.</p>
            <div className="sereno-row"><span>Servizi inclusi</span><span className="sereno-badge">Da collegare</span></div>
            <div className="sereno-row"><span>Scadenza e prosecuzione</span><span className="sereno-badge">Da collegare</span></div>
          </>
        )}
      </section>

      <header className="sereno-intro" style={{ marginTop: 34 }}>
        <h1 style={{ fontSize: 22 }}>Se vuoi continuare dopo i 12 mesi</h1>
        <p>Quattro livelli di affiancamento. Scegli quello adatto a te — impegno minimo 6 mesi.</p>
      </header>

      <div className="sereno-columns">
        {PLANS.map((p) => (
          <section key={p.id} className="sereno-panel">
            <span className={`sereno-badge${p.popular ? ' sereno-badge-action' : ''}`}>{p.badge}</span>
            <h3 style={{ marginTop: 12, fontSize: 18 }}>{p.name} · {p.priceLabel}</h3>
            <p>{p.beneficio}</p>
            <Link to="/partner/rinnovo">Vedi cosa include →</Link>
          </section>
        ))}
      </div>

      <div className="sereno-actions">
        <Link className="sereno-primary" to="/partner/rinnovo">Valuta il rinnovo <ArrowRight aria-hidden="true" /></Link>
      </div>
      <p className="sereno-note">Prezzi e condizioni provengono dal listino EVO S reale. Nulla è simulato.</p>
    </>
  );
}
