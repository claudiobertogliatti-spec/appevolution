import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DirectionSequence } from '../src/sections/DirectionSequence';
import { LogoMarquee } from '../src/sections/LogoMarquee';
import { ProblemSequence } from '../src/sections/ProblemSequence';

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

  it('mostra i dodici strumenti in una barra scorrevole dentro la sezione direzione', () => {
    const { process } = globalThis as unknown as { process: { cwd: () => string } };
    const css = readFileSync(`${process.cwd()}/src/styles/globals.css`, 'utf8');
    render(<DirectionSequence />);

    // barra strumenti accorpata nella sezione con il video di sfondo
    expect(document.querySelector('#direzione .direction-sequence__tools')).toBeInTheDocument();
    expect(css).toMatch(/\.direction-tools__track\s*\{[^}]*animation:\s*marquee-scroll/);

    // lista semantica: dodici strumenti una volta sola, con Canva e HeyGen
    const list = screen.getByRole('list', { name: /strumenti collegati/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(12);
    expect(within(list).getByText('Canva')).toBeInTheDocument();
    expect(within(list).getByText('HeyGen')).toBeInTheDocument();

    // banner decorativo: loghi duplicati per lo scorrimento continuo
    expect(screen.getAllByTestId('tools-strip-item')).toHaveLength(24);
    const srcs = screen.getAllByTestId('tools-strip-item').map((item) => item.querySelector('img')?.getAttribute('src'));
    expect(srcs).toContain('/tools/canva.png');
    expect(srcs).toContain('/tools/heygen.png');
    expect(srcs).toContain('/tools/systemeio.png');

    // la vecchia sezione laptop non esiste più
    expect(document.querySelector('#strumenti')).not.toBeInTheDocument();
    expect(document.querySelector('.tools-cinematic__fan')).not.toBeInTheDocument();
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

  it('usa il nuovo principio nella sequenza direzione', () => {
    render(<DirectionSequence />);

    expect(screen.getAllByText('Senza una direzione, gli strumenti implementati nella tua attività, fanno solo rumore.').length).toBeGreaterThan(0);
  });

  it('presenta i due elenchi (ciò che fai / ciò che pensi) e la chiusura', () => {
    render(<ProblemSequence />);

    const doList = screen.getByRole('list', { name: /ciò che fai/i });
    expect(within(doList).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('vendi il tuo tempo')).toBeInTheDocument();
    expect(screen.getByText('riempi l’agenda')).toBeInTheDocument();
    expect(screen.getByText('aumenti il carico operativo')).toBeInTheDocument();
    expect(screen.getByText('provi strumenti senza un sistema')).toBeInTheDocument();
    expect(screen.getByText('resti economicamente fermo nonostante la competenza')).toBeInTheDocument();

    const thinkList = screen.getByRole('list', { name: /ciò che pensi/i });
    expect(within(thinkList).getAllByRole('listitem')).toHaveLength(5);
    expect(within(thinkList).getByText('“Non ho un pubblico.”')).toBeInTheDocument();
    expect(within(thinkList).getByText('“Non voglio dipendere da un’agenzia.”')).toBeInTheDocument();
    expect(within(thinkList).getByText('“Non so se le mie competenze sono vendibili.”')).toBeInTheDocument();

    expect(document.querySelector('.problem-sequence__punchline')?.textContent).toContain('Non ti mancano gli Attestati');
    expect(screen.getByText('TI MANCA UN SISTEMA!')).toHaveClass('hero-agents__highlight');
    expect(screen.getByText('Il problema comune al 95% dei professionisti')).toBeInTheDocument();
    const problemImage = screen.getByRole('img', { name: /professionista bloccato/i });
    expect(problemImage).toHaveAttribute('src', '/visuals/problem-direction.webp');
    expect(problemImage).toHaveAttribute('loading', 'eager');
  });
});
