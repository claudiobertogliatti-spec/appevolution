import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FounderStory } from '../src/sections/FounderStory';
import { EvoMethodSequence } from '../src/sections/EvoMethodSequence';

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
});

describe('Metodo EVO', () => {
  it('presenta una fase visuale alla volta e il nuovo protocollo', () => {
    render(<EvoMethodSequence />);

    expect(screen.getAllByTestId('active-evo-phase')).toHaveLength(1);
    expect(screen.getByText('3 passaggi semplici dentro un protocollo testato negli ultimi 7 anni').tagName).toBe('P');
  });
});
