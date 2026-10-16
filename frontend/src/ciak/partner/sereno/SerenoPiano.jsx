import React from 'react';
import { CreditCard, ArrowRight } from 'lucide-react';
import { PLANS } from '../sections/EvoSPage';

// "Il tuo piano": current status first — never invents a plan or an expiry.
// Dates come from the real contract date (evo-s-eligibility); no date, no claim.
// The renewal options reuse the real EVO S data (prices from a single source,
// not retyped); opening one goes to the existing detail + checkout via onOpen.
const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function SerenoPiano({ plan, support, onOpen = () => {}, locked = false }) {
  const start = support?.contract_date ? fmtDate(support.contract_date) : null;
  const end = support?.unlock_date ? fmtDate(support.unlock_date) : null;
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
        ) : start && end ? (
          <>
            <div className="sereno-row"><span>Inizio del supporto</span><span>{start}</span></div>
            <div className="sereno-row"><span>Fine dei primi 12 mesi</span><span>{end}</span></div>
            {support.eligible && <p>I primi 12 mesi sono completati: puoi scegliere come continuare qui sotto.</p>}
          </>
        ) : (
          <p>La data di scadenza del tuo supporto te la conferma il team: scrivici dalla pagina Assistenza.</p>
        )}
      </section>

      <header className="sereno-intro" style={{ marginTop: 34 }}>
        <h1 style={{ fontSize: 22 }}>Se vuoi continuare dopo i 12 mesi</h1>
        <p>Quattro livelli di affiancamento. Scegli quello adatto a te — impegno minimo 6 mesi.</p>
      </header>

      {locked && (
        <p className="sereno-note" role="note">Il rinnovo si attiva al termine dei tuoi primi 12 mesi. Puoi già consultare i livelli qui sotto.</p>
      )}

      <div className="sereno-columns">
        {PLANS.map((p) => (
          <section key={p.id} className="sereno-panel">
            <span className={`sereno-badge${p.popular ? ' sereno-badge-action' : ''}`}>{p.badge}</span>
            <h3 style={{ marginTop: 12, fontSize: 18 }}>{p.name} · {p.priceLabel}</h3>
            <p>{p.beneficio}</p>
            <button className="sereno-secondary" onClick={() => onOpen(p.id)}>
              Vedi cosa include <ArrowRight aria-hidden="true" />
            </button>
          </section>
        ))}
      </div>

      <p className="sereno-note">Prezzi e condizioni provengono dal listino EVO S reale. Nulla è simulato.</p>
    </>
  );
}
