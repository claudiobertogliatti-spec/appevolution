import { PHASE_COPY } from './homeModel';

export function journeyModel(state) {
  const steps = [...new Map((state?.steps || []).filter(s => s?.step_id).map(s => [s.step_id, s])).values()];
  const phaseIds = Object.keys(PHASE_COPY);
  const phaseOf = step => phaseIds.includes(step.macro_phase) ? step.macro_phase : 'other';
  const rank = step => Number(String(step.code || '').match(/^F-?(\d+)$/i)?.[1]) || step.step_number || 999;
  const phases = [...phaseIds, 'other'].map(id => ({
    id, label: PHASE_COPY[id]?.[0] || 'Altri passaggi del tuo progetto',
    description: PHASE_COPY[id]?.[1] || 'Attività presenti nel tuo percorso, conservate qui per consultarle.',
    steps: steps.filter(s => phaseOf(s) === id).sort((a,b) => rank(a) - rank(b)),
  })).filter(p => p.steps.length);
  return { phases, total: steps.length, completed: steps.filter(s => s.status === 'done').length,
    skipped: steps.filter(s => s.status === 'skipped').length };
}

export function stepPresentation(step, currentId) {
  if (step.status === 'blocked') return { label: 'Serve una verifica', kind: 'blocked' };
  if (step.approval_status === 'pending_review') return { label: 'In revisione al team', kind: 'waiting' };
  if (step.status === 'done') return { label: 'Completato', kind: 'complete' };
  if (step.status === 'skipped') return { label: 'Non richiesto', kind: 'skipped' };
  if (step.status === 'in_progress' || (step.status === 'pending' && step.step_id === currentId)) return { label: 'Il tuo prossimo passo', kind: 'action' };
  if (step.status === 'pending') return { label: 'Previsto dopo', kind: 'pending' };
  return { label: 'Stato da verificare', kind: 'unknown' };
}
