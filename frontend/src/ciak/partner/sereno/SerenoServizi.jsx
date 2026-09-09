import React from 'react';
import { ArrowRight } from 'lucide-react';

// Sereno vetrina for the extra services. Optional by design. Prices and names
// come from the real catalog passed in by the caller — nothing is invented, and
// the detail page (packages + Stripe checkout) stays the existing flow via onOpen.
export default function SerenoServizi({ sections = [], onOpen = () => {} }) {
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

      {sections.map((section) => (
        <div key={section.title} className="sereno-serv-section">
          <header className="sereno-serv-head">
            <h2>{section.title}</h2>
            {section.subtitle && <p>{section.subtitle}</p>}
          </header>
          <div className="sereno-columns">
            {section.items.map((it) => (
              <article key={it.id} className="sereno-panel sereno-serv-card">
                <h3>{it.name}</h3>
                {it.price && <p className="sereno-serv-price">{it.price}</p>}
                {it.idealePer && (
                  <p className="sereno-serv-ideal"><span>Ideale se</span>{it.idealePer}</p>
                )}
                <button className="sereno-secondary" onClick={() => onOpen(it.id)}>
                  Scopri <ArrowRight aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      ))}

      <p className="sereno-note">Prezzi, tempi e modalità di ogni servizio sono nel dettaglio, con pagamento sicuro via Stripe. Nulla è simulato.</p>
    </>
  );
}
