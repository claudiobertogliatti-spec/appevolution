import { homeModel } from './homeModel';

const step = { step_id: '12-prezzo-webinar', label: 'Prezzo + webinar', status: 'in_progress', owner: 'MARCO' };
const state = (s = step) => ({ steps: [s], current_step: s });
test('uses canonical list content instead of stale current-step label', () => {
  expect(homeModel({ steps: [step], current_step: { ...step, label: 'Posizionamento' } }).title).toBe('Prezzo + webinar');
});
test('does not infer a delivered draft or a team task from owner', () => {
  expect(homeModel(state()).kind).toBe('action');
  expect(homeModel(state()).description).not.toMatch(/approv|pronto|domani/i);
});
test('explicit review waits for team and never offers approval', () => {
  expect(homeModel(state({ ...step, approval_status: 'pending_review' })).kind).toBe('waiting');
});
test('blocked takes priority over review', () => {
  expect(homeModel(state({ ...step, status: 'blocked', approval_status: 'pending_review' })).kind).toBe('blocked');
});
test('missing pointer and empty state fail closed', () => {
  expect(homeModel(null).kind).toBe('unknown');
  expect(homeModel({ steps: [step], current_step: { step_id: 'missing' } }).kind).toBe('unknown');
});
test('a done pointer does not hide earlier incomplete work', () => {
  const done = { ...step, status: 'done' };
  expect(homeModel({ steps: [{ ...step, step_id: 'earlier' }, done], current_step: done }).kind).toBe('unknown');
  expect(homeModel(state(done)).kind).toBe('complete');
});
