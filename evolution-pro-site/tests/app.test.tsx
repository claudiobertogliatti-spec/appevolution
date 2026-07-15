import { fireEvent, render, screen } from '@testing-library/react';
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
      '/brand/evolution-pro-logo-transparent.webp',
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

  it('mostra il banner cookie e apre le informative legali complete di Evolution PRO', () => {
    localStorage.clear();
    render(<App />);

    expect(screen.getByRole('region', { name: /preferenze cookie/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /solo necessari/i }));
    expect(screen.queryByRole('region', { name: /preferenze cookie/i })).not.toBeInTheDocument();
    expect(localStorage.getItem('evolution-pro-cookie-consent')).toContain('necessary');

    fireEvent.click(screen.getByRole('link', { name: 'Privacy' }));
    expect(screen.getByRole('dialog', { name: /informativa privacy/i })).toBeInTheDocument();
    expect(screen.getByText(/Clienti analisi/)).toBeInTheDocument();
    expect(screen.getByText(/Principali fornitori/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /chiudi informative/i }));

    fireEvent.click(screen.getByRole('link', { name: 'Cookie' }));
    expect(screen.getByRole('dialog', { name: /cookie policy/i })).toBeInTheDocument();
    expect(screen.getByText(/Cookie tecnici/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /chiudi informative/i }));

    fireEvent.click(screen.getByRole('link', { name: 'Condizioni di Vendita' }));
    expect(screen.getByRole('dialog', { name: /condizioni generali di vendita/i })).toBeInTheDocument();
    expect(screen.getByText(/Analisi Consulenziale/)).toBeInTheDocument();
  }, 15_000);

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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('La tua competenza diventa un’Accademia che vende.');
    expect(screen.getByText('Ma prima costruiamo la direzione giusta; senza quella, nessun corso, sessione o prodotto può vendere.')).toBeInTheDocument();
    expect(screen.getByText('Alla fine hai: il tuo posizionamento, la tua Accademia e un sistema di vendita di tua proprietà.')).toBeInTheDocument();
  });
});
