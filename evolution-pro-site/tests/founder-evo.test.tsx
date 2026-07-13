import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FounderStory } from '../src/sections/FounderStory';
import { EvoMethodSequence } from '../src/sections/EvoMethodSequence';

describe('storia di Claudio', () => {
  it('mostra le fotografie approvate e tutti i valori finali', () => {
    render(<FounderStory />);

    expect(screen.getByAltText('Claudio Bertogliatti, fondatore di Evolution PRO')).toBeInTheDocument();
    expect(screen.getByAltText('Claudio Bertogliatti al lavoro nel suo ufficio')).toBeInTheDocument();

    for (const value of ['20+', '13', '25.000+', '€6M+', '7']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });
});

describe('Metodo EVO', () => {
  it('presenta tre fasi operative e mantiene le 12 fasi come dettaglio', () => {
    render(<EvoMethodSequence />);

    const phases = screen.getAllByRole('heading', { level: 3 });
    expect(phases.map((phase) => phase.textContent)).toEqual(['Esamina', 'Valida', 'Ottimizza']);
    expect(screen.getByText(/12 fasi operative/i).tagName).toBe('P');
  });
});
