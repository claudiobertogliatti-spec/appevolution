import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../src/App';

const sectionOrder = [
  'hero',
  'collaborazioni',
  'strumenti',
  'direzione',
  'problema',
  'claudio',
  'metodo-evo',
  'sistema',
  'ciak',
  'testimonianze',
  'faq',
  'inizia',
];

describe('homepage shell', () => {
  it('espone un solo contenuto principale', () => {
    render(<App />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('propone la masterclass gratuita su Ciak', () => {
    render(<App />);

    expect(
      screen.getByRole('link', { name: /masterclass gratuita/i }),
    ).toHaveAttribute('href', 'https://www.ciak.io');
  });

  it('mantiene l’ordine narrativo previsto', () => {
    render(<App />);

    expect(
      screen.getAllByTestId('home-section').map((section) => section.id),
    ).toEqual(sectionOrder);
  });
});
