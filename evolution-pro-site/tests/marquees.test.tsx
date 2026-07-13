import { render, screen, within } from '@testing-library/react';
// @ts-expect-error Vitest runs in Node; the app intentionally has no Node type dependency.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DirectionSequence } from '../src/sections/DirectionSequence';
import { LogoMarquee } from '../src/sections/LogoMarquee';
import { ProblemSequence } from '../src/sections/ProblemSequence';
import { ToolsMarquee } from '../src/sections/ToolsMarquee';

describe('marquee accessibili', () => {
  it('ferma il movimento su mobile e rende evidente il focus del contenitore', () => {
    const { process } = globalThis as unknown as { process: { cwd: () => string } };
    const css = readFileSync(`${process.cwd()}/src/styles/globals.css`, 'utf8');
    const mobileCss = css.slice(
      css.indexOf('@media (max-width: 59.99rem)'),
      css.indexOf('.hero-agents--static'),
    );

    expect(mobileCss).toMatch(/\.marquee__track\s*\{[^}]*animation:\s*none/);
    expect(css).toMatch(/\.marquee:focus-visible\s+\.marquee__item\s*\{[^}]*color:/);
  });

  it('espone i dodici strumenti una volta sola e include Canva e HeyGen', () => {
    render(<ToolsMarquee />);

    const list = screen.getByRole('list', { name: /strumenti collegati/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(12);
    expect(within(list).getByText('Canva')).toBeInTheDocument();
    expect(within(list).getByText('HeyGen')).toBeInTheDocument();
    expect(screen.getByTestId('tools-visual-track')).toHaveAttribute('aria-hidden', 'true');
  });

  it('espone ogni collaborazione reale una volta e nasconde il track visuale', () => {
    render(<LogoMarquee />);

    const list = screen.getByRole('list', { name: /collaborazioni/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
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
