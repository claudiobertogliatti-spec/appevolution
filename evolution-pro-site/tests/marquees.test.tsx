import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DirectionSequence } from '../src/sections/DirectionSequence';
import { LogoMarquee } from '../src/sections/LogoMarquee';
import { ProblemSequence } from '../src/sections/ProblemSequence';
import { ToolsMarquee } from '../src/sections/ToolsMarquee';

describe('marquee accessibili', () => {
  it('mantiene le collaborazioni leggibili su mobile senza focus stop vuoti', () => {
    const { process } = globalThis as unknown as { process: { cwd: () => string } };
    const css = readFileSync(`${process.cwd()}/src/styles/globals.css`, 'utf8');
    const mobileCss = css.slice(
      css.indexOf('@media (max-width: 39.99rem)'),
      css.indexOf('.testimonials h2'),
    );

    expect(mobileCss).toMatch(/\.marquee__semantic\s*\{[^}]*display:\s*grid/);
    expect(mobileCss).toMatch(/\.marquee__track\s*\{[^}]*display:\s*none/);
    render(<><LogoMarquee /><ToolsMarquee /></>);
    for (const marquee of document.querySelectorAll('.marquee')) {
      expect(marquee).not.toHaveAttribute('tabindex');
    }
  });

  it('espone i dodici strumenti una volta sola e include Canva e HeyGen', () => {
    render(<ToolsMarquee />);

    const list = screen.getByRole('list', { name: /strumenti collegati/i });
    expect(list).toHaveClass('tools-cinematic__fan');
    expect(within(list).getAllByRole('listitem')).toHaveLength(12);
    expect(within(list).getByText('Canva')).toBeInTheDocument();
    expect(within(list).getByText('HeyGen')).toBeInTheDocument();
    expect(document.querySelector('#strumenti')).toHaveAttribute('data-animation', 'autoplay');
    expect(document.querySelector('#strumenti')).not.toHaveAttribute('data-scroll-linked');
    expect(screen.getAllByTestId('tool-card')).toHaveLength(12);
  });

  it('espone ogni collaborazione reale una volta e nasconde il track visuale', () => {
    render(<LogoMarquee />);

    const list = screen.getByRole('list', { name: /collaborazioni/i });
    expect(list).toHaveClass('marquee__semantic');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByTestId('logos-visual-track')).toHaveClass('marquee__track--clone');
    expect(screen.getByTestId('logos-visual-track')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('sequenze narrative', () => {
  it('mostra la direzione finale e il rumore iniziale senza duplicare il copy', () => {
    render(<DirectionSequence />);

    expect(screen.getByText('Lo strumento senza direzione è solo rumore.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Prima la direzione\s*\.\s*Poi gli strumenti\./ })).toBeInTheDocument();
    for (const item of ['Funnel', 'Ads', 'Automazioni', 'Videocorso']) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('presenta i cinque pain point e la chiusura', () => {
    render(<ProblemSequence />);

    const painPoints = screen.getByRole('list', { name: /problemi/i });
    expect(within(painPoints).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('vendi il tuo tempo')).toBeInTheDocument();
    expect(screen.getByText('riempi l’agenda')).toBeInTheDocument();
    expect(screen.getByText('aumenti il carico operativo')).toBeInTheDocument();
    expect(screen.getByText('provi strumenti senza un sistema')).toBeInTheDocument();
    expect(screen.getByText('resti economicamente fermo nonostante la competenza')).toBeInTheDocument();
    expect(screen.getByText('Non ti manca la competenza. Ti manca un sistema.')).toBeInTheDocument();
  });
});
