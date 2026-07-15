import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DirectionSequence } from '../src/sections/DirectionSequence';
import { LogoMarquee } from '../src/sections/LogoMarquee';
import { ProblemSequence } from '../src/sections/ProblemSequence';
import { ToolsMarquee } from '../src/sections/ToolsMarquee';

describe('marquee accessibili', () => {
  it('mostra le collaborazioni come griglia leggibile anche su mobile', () => {
    const { process } = globalThis as unknown as { process: { cwd: () => string } };
    const css = readFileSync(`${process.cwd()}/src/styles/globals.css`, 'utf8');
    const mobileCss = css.slice(
      css.indexOf('@media (max-width: 39.99rem)'),
      css.indexOf('.testimonials h2'),
    );

    expect(mobileCss).toMatch(/\.collaborations__grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
    render(<LogoMarquee />);
    expect(screen.getAllByTestId('collab-card')).toHaveLength(20);
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
    expect(screen.getByTestId('tools-laptop')).toBeInTheDocument();
    expect(screen.getByTestId('tools-laptop-image')).toHaveAttribute('src', '/visuals/tools-laptop-cutout.webp');
    expect(screen.getByTestId('tools-laptop-brand')).toHaveAttribute('src', '/brand/evolution-pro-logo-transparent.webp');
    const logos = within(list).getAllByRole('img');
    expect(logos).toHaveLength(12);
    expect(logos.map((logo) => logo.getAttribute('src'))).toEqual(expect.arrayContaining([
      '/tools/canva.png',
      '/tools/heygen.png',
      '/tools/systemeio.png',
    ]));
    expect(document.querySelector('.tools-cinematic__mark')).not.toBeInTheDocument();
  });

  it('espone ogni collaborazione una volta con nome, ruolo e loghi', () => {
    render(<LogoMarquee />);

    const list = screen.getByRole('list', { name: /collaborazioni/i });
    expect(list).toHaveClass('collaborations__grid');
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    // ruoli reali (da Ciak)
    expect(screen.getByText('Naturopatia')).toBeInTheDocument();
    expect(screen.getByText('Design automobilistico')).toBeInTheDocument();
    // loghi con alt = nome partner
    expect(screen.getByRole('img', { name: 'Arianna Aceto' })).toHaveAttribute('src', '/collaborations/arianna-aceto.svg');
    expect(screen.getByRole('img', { name: 'Daphne Oliveti' })).toHaveAttribute('src', '/collaborations/daphne-oliveti.png');
  });
});

describe('sequenze narrative', () => {
  it('mostra la direzione finale e il rumore iniziale senza duplicare il copy', () => {
    const { container } = render(<DirectionSequence />);

    const backgroundVideo = screen.getByTestId('direction-background-video');
    expect(backgroundVideo).toHaveAttribute('src', '/video/direction-background.mp4');
    expect(backgroundVideo).toHaveAttribute('autoplay');
    expect(backgroundVideo).toHaveAttribute('loop');
    expect(backgroundVideo).toHaveAttribute('playsinline');
    expect(screen.queryByTestId('direction-video')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-direction-scene]')).toHaveLength(1);
    expect(screen.getAllByTestId('direction-noise-icon')).toHaveLength(4);
    for (const item of ['Funnel', 'Ads', 'Automazioni', 'Videocorso']) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('usa il nuovo principio e un logo ampio dentro il display', () => {
    const { process } = globalThis as unknown as { process: { cwd: () => string } };
    const css = readFileSync(`${process.cwd()}/src/styles/globals.css`, 'utf8');
    render(<><ToolsMarquee /><DirectionSequence /></>);

    expect(screen.getByText('Senza una direzione, gli strumenti implementati nella tua attività, fanno solo rumore.')).toBeInTheDocument();
    expect(css).toMatch(/\.tools-laptop__brand\s*\{[^}]*width:\s*min\(28rem,\s*60%\)/);
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
    expect(screen.getByText('Non ti mancano gli Attestati: ti manca un sistema!')).toBeInTheDocument();
    expect(screen.getByText('Il problema comune al 95% della categoria')).toBeInTheDocument();
    const problemImage = screen.getByRole('img', { name: /professionista bloccato/i });
    expect(problemImage).toHaveAttribute('src', '/visuals/problem-direction.webp');
    expect(problemImage).toHaveAttribute('loading', 'eager');
  });
});
