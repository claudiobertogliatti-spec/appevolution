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

    for (const link of screen.getAllByRole('link', { name: /masterclass gratuita/i })) {
      expect(link).toHaveAttribute('href', 'https://www.ciak.io');
    }
  });

  it('usa il logo ufficiale e offre le quattro ancore principali', () => {
    render(<App />);

    expect(screen.getByRole('img', { name: 'Evolution PRO' })).toHaveAttribute(
      'src',
      '/brand/evolution-pro-logo.webp',
    );
    expect(screen.getByRole('img', { name: 'Evolution PRO' })).toHaveAttribute('decoding', 'async');
    for (const [label, href] of [
      ['Metodo EVO', '#metodo-evo'],
      ['Piattaforma', '#ciak'],
      ['Testimonianze', '#testimonianze'],
      ['FAQ', '#faq'],
    ]) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('mantiene l’ordine narrativo previsto', () => {
    render(<App />);

    expect(
      screen.getAllByTestId('home-section').map((section) => section.id),
    ).toEqual(sectionOrder);
  });

  it('usa il copy hero approvato e una pillola target non interattiva', () => {
    render(<App />);

    expect(screen.getByText('PER CONSULENTI, COACH E PROFESSIONISTI')).toHaveClass('hero-target-pill');
    expect(screen.queryByRole('link', { name: 'PER CONSULENTI, COACH E PROFESSIONISTI' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('La tua competenza merita una direzione');
    expect(screen.getByText('Prima di costruire la tua Accademia Digitale, bisogna capire se hai la direzione corretta che può venderla.')).toBeInTheDocument();
  });
});
