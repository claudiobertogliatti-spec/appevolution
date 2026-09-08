import React from 'react';
import { Link } from 'react-router-dom';
import { hasMaterialOutput } from '../operativo/journeyPresentation';
import { journeyModel, stepPresentation } from './journeyModel';

export default function SerenoJourney({ state, loading, error, onRetry, onMaterials, stepHref }) {
  const model = journeyModel(state);
  return <>
    <header className="sereno-intro"><h1>Il tuo percorso, un passo alla volta.</h1><p>Ritrova ciò che abbiamo fatto e guarda cosa viene dopo.</p></header>
    {loading ? <p role="status">Stiamo caricando il tuo percorso…</p> : error ? <section className="sereno-panel" role="alert"><h2>Non riusciamo a caricare il percorso.</h2><p>Riprova. Se il problema continua, contatta il team.</p><button className="sereno-secondary" onClick={onRetry}>Riprova</button><Link className="sereno-secondary" to="/partner/team">Chiedi aiuto</Link></section> : !model.total ? <section className="sereno-panel"><h2>Il percorso non è ancora disponibile.</h2><p>Contatta il team per conoscere il prossimo passaggio.</p><Link to="/partner/team">Chiedi al team →</Link></section> : <>
      <div className="sereno-journey-progress"><strong>{model.completed} di {model.total} passaggi completati</strong>{model.skipped > 0 && <small>{model.skipped} non richiesti per il tuo progetto</small>}<p>Apri una fase per consultare i suoi passaggi.</p></div>
      {model.phases.map(phase => <details key={`${phase.id}-${state?.current_step?.step_id}`} open={phase.steps.some(s => s.step_id === state?.current_step?.step_id)}>
        <summary>{phase.label}<small>{phase.description} · {phase.steps.filter(s => s.status === 'done').length}/{phase.steps.length} completati</small></summary>
        <ol className="sereno-journey-list">{phase.steps.map(step => {
          const status = stepPresentation(step, state?.current_step?.step_id);
          return <li className="sereno-row" key={step.step_id}><div><span className={`sereno-badge sereno-badge-${status.kind}`}>{status.label}</span><h2>{step.label || 'Passaggio del progetto'}</h2>{step.code && <small>{step.code}</small>}</div><div>
            {status.kind === 'action' && <Link className="sereno-primary" to={stepHref ? stepHref(step) : `/partner?step=${encodeURIComponent(step.step_id)}`}>Apri il passaggio →</Link>}
            {status.kind === 'complete' && hasMaterialOutput(step) && <button className="sereno-secondary" onClick={() => onMaterials(step)}>Consulta materiali</button>}
            {['blocked','unknown'].includes(status.kind) && <Link className="sereno-secondary" to="/partner/team">Chiedi aiuto</Link>}
            {status.kind === 'waiting' && <small>Puoi chiedere un aggiornamento in Assistenza.</small>}
          </div></li>;
        })}</ol>
      </details>)}
    </>}
  </>;
}
