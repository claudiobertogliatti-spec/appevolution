import { offerEmphasis } from './offerEmphasis';

test('pronti (stato 3-4) → Partnership eroe', () => {
  expect(offerEmphasis(4)).toEqual({ hero: 'partnership', startPreamble: false });
  expect(offerEmphasis(3)).toEqual({ hero: 'partnership', startPreamble: false });
});
test('tiepidi (stato 1-2) → Start preambolo', () => {
  expect(offerEmphasis(2)).toEqual({ hero: 'start', startPreamble: true });
  expect(offerEmphasis(1)).toEqual({ hero: 'start', startPreamble: true });
});
test('ignoto → default Start preambolo (fail-safe)', () => {
  expect(offerEmphasis(undefined)).toEqual({ hero: 'start', startPreamble: true });
  expect(offerEmphasis('boh')).toEqual({ hero: 'start', startPreamble: true });
});
