import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FounderStory } from '../src/sections/FounderStory';
import { EvoMethodSequence } from '../src/sections/EvoMethodSequence';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('storia di Claudio', () => {
  it('mostra le fotografie approvate e tutti i valori finali', () => {
    render(<FounderStory />);

    expect(screen.getByAltText('Claudio Bertogliatti, fondatore di Evolution PRO')).toHaveClass('founder-story__portrait-image');
    expect(screen.getByAltText('Claudio Bertogliatti al lavoro nel suo ufficio')).toBeInTheDocument();

    for (const value of ['20+', '13', '25.000+', '€6M+', '7']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it('espone un beat visuale alla volta e conserva la sequenza accessibile', () => {
    const { container } = render(<FounderStory />);

    expect(container.querySelectorAll('[data-active-founder-beat]')).toHaveLength(1);
    expect(screen.getAllByRole('listitem', { hidden: true }).map((item) => item.textContent)).toEqual(expect.arrayContaining(['introduzione', 'storia', 'numeri', 'ufficio', 'partner operativo']));
  });

  it('lascia sei secondi per leggere ogni schermata della storia', () => {
    render(<FounderStory />);

    expect(screen.getByText('Mi chiamo Claudio Bertogliatti')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText('Mi chiamo Claudio Bertogliatti')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByText(/Da oltre 20 anni lavoro/)).toBeInTheDocument();
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
