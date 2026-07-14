import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../src/App';
import { HumanAiSystem } from '../src/sections/HumanAiSystem';
import { CiakPlatformDemo } from '../src/sections/CiakPlatformDemo';

describe('sistema umano e AI', () => {
  it('presenta i quattro livelli nel corretto ordine decisionale', () => {
    const { container } = render(<HumanAiSystem />);
    const steps = Array.from(container.querySelectorAll('[data-system-step]'));

    expect(steps).toHaveLength(4);
    expect(steps.map((step) => step.getAttribute('data-system-step'))).toEqual([
      'piattaforma',
      'agenti-ai',
      'team-umano',
      'partner',
    ]);
    expect(screen.getByText(/supervisione umana/i)).toBeInTheDocument();
    const systemImage = screen.getByRole('img', { name: /collaborazione tra persone e intelligenza artificiale/i });
    expect(systemImage).toHaveAttribute('src', '/visuals/human-ai-system.webp');
    expect(systemImage).toHaveAttribute('loading', 'eager');
  });
});

describe('demo Ciak', () => {
  it('mostra cinque stati operativi distinti e la prossima azione', () => {
    const { container } = render(<CiakPlatformDemo />);
    const states = Array.from(container.querySelectorAll('[data-ciak-state]'));

    expect(states).toHaveLength(5);
    expect(screen.getByTestId('ciak-collage')).not.toHaveAttribute('data-scroll-linked');
    expect(document.querySelector('#ciak')).toHaveAttribute('data-animation', 'autoplay');
    for (const state of states) expect(state).toHaveAttribute('data-depth');
    expect(states.map((state) => state.getAttribute('data-ciak-state'))).toEqual([
      'brainstorming',
      'posizionamento',
      'videocorso',
      'avanzamento',
      'prossima-azione',
    ]);
    expect(screen.getByText(/il tuo percorso operativo continua su ciak/i)).toBeInTheDocument();
    expect(screen.getAllByText(/prossima azione/i)).not.toHaveLength(0);
  });

  it('porta al dominio applicativo corretto', () => {
    render(<CiakPlatformDemo />);
    expect(screen.getByRole('link', { name: /guarda la masterclass gratuita/i })).toHaveAttribute(
      'href',
      'https://www.ciak.io',
    );
  });

  it('presenta gli stati come scenari dimostrativi, non come fasi Ciak', () => {
    render(<CiakPlatformDemo />);

    expect(screen.getByText('Scenario demo 1 di 5')).toBeInTheDocument();
    expect(screen.queryByText('Fase 1 di 5')).not.toBeInTheDocument();
  });

  it('sostituisce i placeholder nell applicazione completa', () => {
    render(<App />);
    const system = screen.getByRole('region', { name: /un sistema umano, potenziato dall.ai/i });
    const ciak = screen.getByRole('region', { name: /ciak: il lavoro prende forma/i });

    expect(within(system).getAllByRole('listitem')).toHaveLength(4);
    expect(within(ciak).getAllByRole('listitem')).toHaveLength(5);
  });
});
