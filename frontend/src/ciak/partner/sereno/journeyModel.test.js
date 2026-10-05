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
