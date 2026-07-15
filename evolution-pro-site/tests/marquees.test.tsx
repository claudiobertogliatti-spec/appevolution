import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DirectionSequence } from '../src/sections/DirectionSequence';
import { LogoMarquee } from '../src/sections/LogoMarquee';
import { ProblemSequence } from '../src/sections/ProblemSequence';
import { ToolsMarquee } from '../src/sections/ToolsMarquee';

describe('marquee accessibili', () => {
  it('mostra le collaborazioni in un banner scorrevole', () => {
    const { process } = globalThis as unknown as { process: { cwd: () => string } };
    const css = readFileSync(`${process.cwd()}/src/styles/globals.css`, 'utf8');

    expect(css).toMatch(/\.collaborations__track\s*\{[^}]*animation:\s*marquee-scroll/);
    render(<LogoMarquee />);
    expect(screen.getByTestId('collaborations-track')).toBeInTheDocument();
    // 20 partner duplicati per lo scorrimento continuo
    expect(screen.getAllByTestId('collab-card')).toHaveLength(40);
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

  it('espone ogni collaborazione una volta nella lista semantica con nome e ruolo', () => {
    render(<LogoMarquee />);

    const list = screen.getByRole('list', { name: /collaborazioni/i });
    expect(list).toHaveClass('collaborations__semantic');
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    // nome + ruolo reale (da Ciak) nella lista accessibile
    expect(within(list).getByText('Arianna Aceto — Naturopatia')).toBeInTheDocument();
    expect(within(list).getByText('Luigi Calafiore — Design automobilistico')).toBeInTheDocument();
    // loghi presenti nel banner (decorativi, alt vuoto)
    const srcs = [...document.querySelectorAll('.collab-card__badge img')].map((img) => img.getAttribute('src'));
    expect(srcs).toContain('/collaborations/arianna-aceto.svg');
    expect(srcs).toContain('/collaborations/valter-romani.png');
  });
});

describe('sequenze narrative', () => {
  it('usa un video YouTube di sfondo in loop e non mostra più la scena rumore', () => {
    const { container } = render(<DirectionSequence />);

    const backgroundVideo = screen.getByTestId('direction-background-video');
    expect(backgroundVideo.tagName).toBe('IFRAME');
    expect(backgroundVideo.getAttribute('src')).toMatch(/youtube(-nocookie)?\.com\/embed\/FGMqGHNmI14/);
    expect(backgroundVideo.getAttribute('src')).toMatch(/loop=1/);
    expect(backgroundVideo.getAttribute('src')).toMatch(/mute=1/);
    // scena "rumore" (icone + label sparse funnel/ads/automazioni/videocorso) rimossa
    expect(screen.queryAllByTestId('direction-noise-icon')).toHaveLength(0);
    expect(screen.queryByText('Funnel')).not.toBeInTheDocument();
    // una sola scena attiva alla volta, la prima è il principio
    expect(container.querySelectorAll('[data-direction-scene]')).toHaveLength(1);
    expect(container.querySelector('[data-direction-scene="principio"]')).toBeInTheDocument();
  });

  it('usa il nuovo principio e un logo ampio dentro il display', () => {
    const { process } = globalThis as unknown as { process: { cwd: () => string } };
    const css = readFileSync(`${process.cwd()}/src/styles/globals.css`, 'utf8');
    render(<><ToolsMarquee /><DirectionSequence /></>);

    expect(screen.getAllByText('Senza una direzione, gli strumenti implementati nella tua attività, fanno solo rumore.').length).toBeGreaterThan(0);
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
    expect(document.querySelector('.problem-sequence__punchline')?.textContent).toContain('Non ti mancano gli Attestati');
    expect(screen.getByText('TI MANCA UN SISTEMA!')).toHaveClass('hero-agents__highlight');
    expect(screen.getByText('Il problema comune al 95% della categoria')).toBeInTheDocument();
    const problemImage = screen.getByRole('img', { name: /professionista bloccato/i });
    expect(problemImage).toHaveAttribute('src', '/visuals/problem-direction.webp');
    expect(problemImage).toHaveAttribute('loading', 'eager');
  });
});
