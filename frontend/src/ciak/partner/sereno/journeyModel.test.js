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
