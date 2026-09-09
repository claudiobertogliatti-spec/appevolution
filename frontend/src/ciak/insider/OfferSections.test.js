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
test('anti-anchoring: Partnership resta hero visivo anche con Start-preambolo in testa', () => {
  const { container } = render(<OfferSections token="t" emphasis={{ hero: 'start', startPreamble: true }} />);
  const startNode = container.querySelector('[data-offer="start"]');
  const partnershipNode = container.querySelector('[data-offer="partnership"]');
  // ordine: Start prima di Partnership nel DOM (emphasis.hero governa solo l'ordine)
  expect(startNode.compareDocumentPosition(partnershipNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // stile: la Partnership porta SEMPRE il trattamento hero (badge/accent), mai Start
  expect(partnershipNode.classList.contains('insider-offer--hero')).toBe(true);
  expect(startNode.classList.contains('insider-offer--hero')).toBe(false);
});
