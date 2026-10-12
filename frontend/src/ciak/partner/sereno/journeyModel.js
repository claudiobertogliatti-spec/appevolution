import { PHASE_COPY } from './homeModel';

// Solo presentazione: dentro Valida i passi del lancio stanno in un gruppo a parte, e il primo è il sistema di vendita
// (pagine e funnel); la pubblicazione dei contenuti (13-lancio) viene dopo la verifica pre-lancio. Ordine e blocchi
// del percorso non cambiano: li decide il backend.
const LANCIO_IDS = ['10-sistema-vendita', '11-calendario-30gg', '12-prezzo-webinar', '16-readiness-lancio', '13-lancio', '18-certificato-valida', '19-workbook-finale'];
const GROUPS = {
  valida: [
    { id: 'corso', label: 'Costruiamo il corso', description: null },
    { id: 'lancio', label: 'Il lancio', description: 'Prima prepariamo il sistema di vendita. I contenuti si pubblicano dopo, quando tutto è a posto.' },
  ],
};

export function journeyModel(state) {
  const steps = [...new Map((state?.steps || []).filter(s => s?.step_id).map(s => [s.step_id, s])).values()];
  const phaseIds = Object.keys(PHASE_COPY);
  const phaseOf = step => phaseIds.includes(step.macro_phase) ? step.macro_phase : 'other';
  const rank = step => Number(String(step.code || '').match(/^F-?(\d+)$/i)?.[1]) || step.step_number || 999;
  const phases = [...phaseIds, 'other'].map(id => ({
    id, label: PHASE_COPY[id]?.[0] || 'Altri passaggi del tuo progetto',
    description: PHASE_COPY[id]?.[1] || 'Attività presenti nel tuo percorso, conservate qui per consultarle.',
    steps: steps.filter(s => phaseOf(s) === id).sort((a,b) => rank(a) - rank(b)),
  })).filter(p => p.steps.length).map(p => ({
    ...p,
    groups: GROUPS[p.id]
      ? GROUPS[p.id].map(g => ({ ...g, steps: p.steps.filter(s => (g.id === 'lancio') === LANCIO_IDS.includes(s.step_id)) })).filter(g => g.steps.length)
      : [{ id: p.id, label: null, description: null, steps: p.steps }],
  }));
  return { phases, total: steps.length, completed: steps.filter(s => s.status === 'done').length,
    skipped: steps.filter(s => s.status === 'skipped').length };
}

export function stepPresentation(step, currentId) {
  if (step.status === 'blocked') return { label: 'Serve una verifica', kind: 'blocked' };
  if (step.approval_status === 'pending_review') return { label: 'In revisione al team', kind: 'waiting' };
  if (step.status === 'done') return { label: 'Completato', kind: 'complete' };
  if (step.status === 'skipped') return { label: 'Non richiesto', kind: 'skipped' };
  // Only the step the server picked as the current one is "il tuo prossimo passo".
  // Several steps can be `in_progress` in the data (opened by the team, left open):
  // marking all of them as "next" gave the partner seven starting points.
  if ((step.status === 'in_progress' || step.status === 'pending') && step.step_id === currentId) return { label: 'Il tuo prossimo passo', kind: 'action' };
  if (step.status === 'in_progress') return { label: 'Già avviato', kind: 'started' };
  if (step.status === 'pending') return { label: 'Previsto dopo', kind: 'pending' };
  return { label: 'Stato da verificare', kind: 'unknown' };
}
