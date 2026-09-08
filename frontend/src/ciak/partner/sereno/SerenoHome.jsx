import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Route, MessagesSquare } from 'lucide-react';
import { homeModel, PHASE_COPY } from './homeModel';
import './sereno.css';

export default function SerenoHome({ state, partnerName, onOpenStep }) {
  const model = homeModel(state);
  const phase = PHASE_COPY[model.step?.macro_phase];
  const name = (partnerName || '').trim().split(' ')[0];
  return <div className="sereno-home">
    <header className="sereno-intro"><h1>{name ? `Bentornato, ${name}.` : 'Bentornato al tuo progetto.'}</h1><p>Ecco dove siamo e il prossimo passo.</p></header>
    {phase && <div className="sereno-eyebrow"><Route aria-hidden="true"/>{phase[0]} <span>/</span> {phase[1]}</div>}
    <section className="sereno-focus" aria-labelledby="sereno-next-title">
      <span className={`sereno-badge sereno-badge-${model.kind}`}>{model.badge}</span>
      <h2 id="sereno-next-title">{model.title}</h2><p>{model.description}</p>
      <div className="sereno-actions">{model.kind === 'action'
        ? <button className="sereno-primary" onClick={() => onOpenStep(model.step.step_id)}>Apri il passaggio <ArrowRight aria-hidden="true"/></button>
        : <Link className="sereno-primary" to={model.kind === 'complete' ? '/partner/materiali' : '/partner/team'}>{model.kind === 'complete' ? 'Guarda i tuoi materiali' : 'Chiedi un aggiornamento'}<ArrowRight aria-hidden="true"/></Link>}
      </div>
    </section>
    <div className="sereno-columns"><section className="sereno-panel"><h3><Route aria-hidden="true"/>Il tuo progetto prende forma</h3><div className="sereno-phases">{Object.entries(PHASE_COPY).map(([id, [label]]) => <span key={id} className={model.step?.macro_phase === id ? 'current' : ''}>{label}</span>)}</div><Link to="/partner/percorso">Guarda il percorso completo →</Link></section>
      <section className="sereno-panel"><h3><MessagesSquare aria-hidden="true"/>Un aiuto, quando serve</h3><p>Per un dubbio o un passaggio poco chiaro, trovi qui il supporto.</p><Link to="/partner/team">Chiedi una mano →</Link></section></div>
  </div>;
}
