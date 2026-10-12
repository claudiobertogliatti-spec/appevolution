import { journeyModel, stepPresentation } from './journeyModel';

test('orders by canonical code despite stale numbers, counts exactly the unique displayed steps', () => {
  const first = {step_id:'a',code:'F-1',step_number:9,macro_phase:'esamina',status:'done'};
  const model = journeyModel({steps:[{step_id:'b',code:'F-2',step_number:1,macro_phase:'esamina',status:'pending'},first,first,{step_id:'legacy',status:'skipped'}]});
  expect(model.phases[0].steps.map(s => s.step_id)).toEqual(['a','b']);
  expect(model.phases[1].steps[0].step_id).toBe('legacy');
  expect(model.total).toBe(model.phases.reduce((sum,p) => sum+p.steps.length,0));
  expect(model.completed).toBe(1);
  expect(model.skipped).toBe(1);
});
test('pending is actionable only when selected by the server; blocked and review take precedence', () => {
  expect(stepPresentation({step_id:'a',status:'pending'},'a').kind).toBe('action');
  expect(stepPresentation({step_id:'a',status:'pending'},'b').kind).toBe('pending');
  expect(stepPresentation({step_id:'a',status:'in_progress',approval_status:'pending_review'},'a').kind).toBe('waiting');
  expect(stepPresentation({step_id:'a',status:'blocked',approval_status:'pending_review'},'a').kind).toBe('blocked');
  expect(stepPresentation({step_id:'a',status:'unrecognized'},'a').kind).toBe('unknown');
});

test('several steps left in_progress do not all become "il tuo prossimo passo": only the one chosen by the server', () => {
  // Real shape seen on a migrated partner: F-12..F-18 all in_progress, F-12 is the front.
  const ids = ['f12', 'f13', 'f14', 'f15', 'f16', 'f17', 'f18'];
  const kinds = ids.map((id) => stepPresentation({ step_id: id, status: 'in_progress' }, 'f12').kind);
  expect(kinds.filter((k) => k === 'action')).toHaveLength(1);
  expect(kinds[0]).toBe('action');
  expect(kinds.slice(1)).toEqual(Array(6).fill('started'));
  expect(stepPresentation({ step_id: 'f13', status: 'in_progress' }, 'f12').label).toBe('Già avviato');
  // completed / review / blocked still win over everything
  expect(stepPresentation({ step_id: 'f12', status: 'done' }, 'f12').kind).toBe('complete');
});

test('dentro Valida i passi del lancio stanno in un gruppo a parte e il sistema di vendita viene per primo', () => {
  const mk = (id, n) => ({ step_id: id, step_number: n, macro_phase: 'valida', status: 'pending' });
  const steps = [mk('13-lancio', 17), mk('09-registra-lezioni', 12), mk('11-calendario-30gg', 14), mk('10-sistema-vendita', 13), mk('16-readiness-lancio', 16), mk('12-prezzo-webinar', 15)];
  const valida = journeyModel({ steps }).phases.find(p => p.id === 'valida');
  expect(valida.groups.map(g => g.id)).toEqual(['corso', 'lancio']);
  expect(valida.groups[0].steps.map(s => s.step_id)).toEqual(['09-registra-lezioni']);
  expect(valida.groups[1].steps.map(s => s.step_id)).toEqual(['10-sistema-vendita', '11-calendario-30gg', '12-prezzo-webinar', '16-readiness-lancio', '13-lancio']);
  // la pubblicazione (13-lancio) viene dopo la verifica pre-lancio
});

test('le altre fasi hanno un solo gruppo senza titolo', () => {
  const m = journeyModel({ steps: [{ step_id: 'la-tua-storia', step_number: 5, macro_phase: 'esamina', status: 'done' }] });
  expect(m.phases[0].groups).toHaveLength(1);
  expect(m.phases[0].groups[0].label).toBeNull();
});
