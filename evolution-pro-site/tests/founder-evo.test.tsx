import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FounderStory } from '../src/sections/FounderStory';
import { EvoMethodSequence } from '../src/sections/EvoMethodSequence';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('storia di Claudio', () => {
  it('mostra il ritratto, i cinque numeri e il testo della storia', () => {
    render(<FounderStory />);

    expect(screen.getByAltText('Claudio Bertogliatti, fondatore di Evolution PRO')).toHaveClass('founder-story__portrait-image');
    expect(screen.getByText('Mi chiamo Claudio Bertogliatti')).toBeInTheDocument();

    for (const value of ['20+', '13', '25.000+', '€6M+', '7']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText(/Da oltre 20 anni lavoro/)).toBeInTheDocument();
    expect(screen.getByText(/Evolution PRO nasce per risolvere questo/)).toBeInTheDocument();
  });

  it('evidenzia un numero alla volta e lo fa ruotare nel tempo', () => {
    const { container } = render(<FounderStory />);
    const activeValues = () => [...container.querySelectorAll('.founder-story__numbers li')]
      .filter((li) => li.getAttribute('data-active') === 'true')
      .map((li) => li.textContent);

    expect(activeValues()).toHaveLength(1);
    const first = activeValues()[0];
    act(() => vi.advanceTimersByTime(1900));
    expect(activeValues()).toHaveLength(1);
    expect(activeValues()[0]).not.toBe(first);
  });
});

describe('Metodo EVO', () => {
  it('presenta una fase visuale alla volta e il nuovo protocollo', () => {
    render(<EvoMethodSequence />);

    expect(screen.getAllByTestId('active-evo-phase')).toHaveLength(1);
    expect(screen.getByText('3 passaggi semplici dentro un protocollo testato negli ultimi 7 anni').tagName).toBe('P');
  });

  it('passa da Esamina a Valida dopo tre secondi', () => {
    render(<EvoMethodSequence />);

    expect(screen.getByTestId('active-evo-phase')).toHaveTextContent('Esamina');
    act(() => vi.advanceTimersByTime(3100));
    expect(screen.getByTestId('active-evo-phase')).toHaveTextContent('Valida');
  });
});
