import React from 'react';
import { render, screen } from '@testing-library/react';
import OfferSections from './OfferSections';

test('prezzi reali + copy credito; niente prezzo inventato', () => {
  render(<OfferSections token="t" emphasis={{ hero: 'partnership', startPreamble: false }} />);
  expect(screen.getByText(/390\s*€/)).toBeTruthy();
  expect(screen.getByText(/2\.990\s*€/)).toBeTruthy();
  expect(screen.getByText(/si riscalano|credito/i)).toBeTruthy();
});
test('enfasi Start-preambolo per i tiepidi', () => {
  const { container } = render(<OfferSections token="t" emphasis={{ hero: 'start', startPreamble: true }} />);
  // la sezione Start precede la Partnership nel DOM
  const html = container.innerHTML;
  expect(html.indexOf('390')).toBeLessThan(html.indexOf('2.990'));
});
