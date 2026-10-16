import React, { useState } from 'react';
import { BookOpen, Download } from 'lucide-react';
import { journeyModel } from './journeyModel';
import { downloadProtectedDocument } from '../rewards/protectedDownload';

// Il PDF del progetto (il «Workbook finale») cresce tappa dopo tappa e si consegna a lancio avvenuto:
// il passo 19-workbook-finale segnato come completato è il segnale di consegna. Qui si mostra solo l'avanzamento.
export function libroModel(state) {
  const phases = journeyModel(state).phases.filter(p => p.id !== 'other').map(p => ({
    id: p.id, label: p.label,
    done: p.steps.filter(s => ['done', 'skipped'].includes(s.status)).length, total: p.steps.length,
  }));
  const finale = (state?.steps || []).find(s => s.step_id === '19-workbook-finale');
  return { phases, consegnato: finale?.status === 'done' };
}

export default function LibroProgetto({ state, partnerId }) {
  const m = libroModel(state);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!m.phases.length) return null;
  const scarica = async () => {
    setBusy(true); setErr('');
    try { await downloadProtectedDocument(`/api/partner-rewards/${partnerId}/project-book`, 'Libro_del_progetto_Ciak.pdf'); }
    catch { setErr('Download non riuscito. Riprova tra poco.'); }
    finally { setBusy(false); }
  };
  return <section className="sereno-libro" aria-labelledby="sereno-libro-title">
    <div><h2 id="sereno-libro-title"><BookOpen aria-hidden="true"/>Il libro del tuo progetto</h2>
      <p>Un PDF che si arricchisce a ogni tappa con ciò che costruiamo insieme. {m.consegnato ? 'È pronto: lo scarichi qui.' : 'Te lo consegniamo a lancio avvenuto.'}</p>
      <ul>{m.phases.map(p => <li key={p.id}><strong>{p.label}</strong> {p.done} di {p.total} passaggi</li>)}</ul>
      {err && <p role="alert">{err}</p>}</div>
    {m.consegnato && partnerId && <button className="sereno-primary" onClick={scarica} disabled={busy}><Download aria-hidden="true"/>{busy ? 'Preparazione…' : 'Scarica il PDF'}</button>}
  </section>;
}
