export const PHASE_COPY = {
  esamina: ['Esamina', 'Definiamo il tuo progetto'],
  valida: ['Valida', 'Prepariamo corso e lancio'],
  ottimizza: ['Ottimizza', 'Miglioriamo i risultati'],
};

// Presentation only: never unlock a step or infer delivery/approval from an owner.
export function homeModel(state) {
  const steps = Array.isArray(state?.steps) ? state.steps : [];
  const current = steps.find(s => s.step_id === state?.current_step?.step_id);
  if (!steps.length || !current) return {
    kind: 'unknown', title: 'Verifichiamo il tuo prossimo passo.',
    description: 'Il percorso non indica ancora un’attività corrente. Contatta il team per sapere come proseguire.',
    badge: 'Da verificare', step: null,
  };
  const base = { step: current, title: current.label || 'Il tuo prossimo passaggio' };
  if (current.status === 'blocked') return { ...base, kind: 'blocked', badge: 'Serve una verifica',
    description: 'Questo passaggio è bloccato. Chiedi aiuto al team prima di proseguire.' };
  if (current.approval_status === 'pending_review') return { ...base, kind: 'waiting', badge: 'In revisione al team', title: 'Ora è il turno del team.',
    description: `“${base.title}” è in attesa della verifica del team. Puoi consultare il percorso o chiedere un aggiornamento.` };
  if (steps.every(s => s.status === 'done' || s.status === 'skipped')) return {
    ...base, kind: 'complete', badge: 'Percorso completato', title: 'Il progetto continua, insieme.',
    description: 'Ritrova i tuoi materiali e confrontati con il team sulle prossime attività.' };
  if (current.status === 'pending' || current.status === 'in_progress') return {
    ...base, kind: 'action', badge: 'Il tuo prossimo passo',
    description: 'Apri questo passaggio: trovi le istruzioni e le attività previste per il tuo progetto.' };
  return { ...base, kind: 'unknown', badge: 'Da verificare',
    description: 'Il team deve verificare il prossimo passaggio. I materiali già consegnati restano disponibili.' };
}
