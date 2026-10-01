import { buildTimeline, addMonths, formatDeadline, formatDeadlineWithTime } from './timeline';

test('1 ottobre 2026: online 22–29 ott se parti oggi, 22–29 gen se aspetti tre mesi', () => {
  const t = buildTimeline(new Date(2026, 9, 1));
  expect(t.now.onlineLabel).toBe('22–29 ott');
  expect(t.later.onlineLabel).toBe('22–29 gen 2027'); // altro anno → l'anno è esplicito
  expect(t.later.monthName).toBe('gennaio');
  expect(t.months.slice(0, 4)).toEqual(['ott', 'nov', 'dic', 'gen']);
  expect(t.months).toHaveLength(12);
});

test('colonne: costruzione nel primo mese, attesa 3 mesi, costruzione nel 4°', () => {
  const t = buildTimeline(new Date(2026, 9, 1));
  expect(t.now).toMatchObject({ buildEnd: 1, optimizeFrom: 2 });
  expect(t.later).toMatchObject({ waitEnd: 3, buildStart: 4, buildEnd: 4, optimizeFrom: 5 });
});

test('a fine mese la costruzione sconfina nel mese dopo e il confronto lo mostra', () => {
  const t = buildTimeline(new Date(2026, 9, 25)); // +3/4 settimane = 15 nov – 22 nov
  expect(t.now.onlineLabel).toBe('15–22 nov');
  expect(t.now.buildEnd).toBe(2);
  expect(t.now.optimizeFrom).toBe(3);
});

test('intervallo a cavallo di due mesi', () => {
  const t = buildTimeline(new Date(2026, 9, 12)); // 2 nov – 9 nov? 12 ott +21 = 2 nov, +28 = 9 nov
  expect(t.now.onlineLabel).toBe('2–9 nov');
  const t2 = buildTimeline(new Date(2026, 9, 5)); // +21 = 26 ott, +28 = 2 nov
  expect(t2.now.onlineLabel).toBe('26 ott – 2 nov');
});

test('mai fuori dalle 12 colonne, anche a fine anno', () => {
  const t = buildTimeline(new Date(2026, 11, 20));
  expect(t.now.buildEnd).toBeLessThanOrEqual(12);
  expect(t.later.buildEnd).toBeLessThanOrEqual(12);
  expect(t.later.onlineLabel).toMatch(/apr 2027$/);
});

test('addMonths non sborda: 31 gennaio + 1 mese = 28 febbraio', () => {
  const d = addMonths(new Date(2027, 0, 31), 1);
  expect([d.getMonth(), d.getDate()]).toEqual([1, 28]);
});

test('scadenza in italiano; valori non validi → null (nessuna scadenza inventata)', () => {
  const now = new Date(2026, 9, 1);
  expect(formatDeadline(new Date(2026, 9, 8), now)).toBe('giovedì 8 ottobre');
  expect(formatDeadlineWithTime(new Date(2026, 9, 2, 18, 0), now)).toBe('venerdì 2 ottobre, ore 18:00');
  expect(formatDeadline(null, now)).toBeNull();
  expect(formatDeadline('boh', now)).toBeNull();
});
