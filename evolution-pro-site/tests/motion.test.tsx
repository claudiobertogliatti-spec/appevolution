import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const motionPreference = vi.hoisted(() => ({ reduced: true }));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  return {
    ...actual,
    useReducedMotion: () => motionPreference.reduced,
  };
});

import { HeroAgents } from '../src/sections/HeroAgents';

function mockMobileViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  motionPreference.reduced = true;
  mockMobileViewport(false);
});

describe('hero agenti con movimento ridotto', () => {
  it('mantiene la modalità animata nel pannello desktop affiancato', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('59.99rem'), media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
      })),
    });
    motionPreference.reduced = false;
    render(<HeroAgents />);
    expect(screen.getByTestId('home-section')).not.toHaveClass('hero-agents--static');
  });

  it('mantiene la rotazione degli agenti anche se il browser richiede movimento ridotto', () => {
    vi.useFakeTimers();
    render(<HeroAgents />);

    expect(screen.getByTestId('active-hero-agent')).toHaveAttribute('data-agent', 'Stefania');
    fireEvent.mouseEnter(document.querySelector('.hero-agents__visual')!);
    act(() => vi.advanceTimersByTime(3600));
    expect(screen.getByTestId('active-hero-agent')).toHaveAttribute('data-agent', 'Valentina');
    vi.useRealTimers();
  });

  it('rende accessibili la direzione e tutti i sei agenti', () => {
    render(<HeroAgents />);

    expect(
      screen.getByRole('heading', { level: 1, name: /direzione/i }),
    ).toBeInTheDocument();

    const teamList = screen.getByRole('list', { name: /team che ti accompagna/i });
    expect(teamList).toHaveClass('sr-only');
    for (const name of ['Stefania', 'Valentina', 'Andrea', 'Gaia', 'Marco', 'Matteo']) {
      expect(teamList).toHaveTextContent(name);
    }
    expect(screen.getByTestId('active-hero-agent').querySelector('img')).toHaveAttribute('fetchpriority', 'high');
  });

  it('mantiene l’autoplay anche su viewport mobile', () => {
    motionPreference.reduced = false;
    mockMobileViewport(true);

    render(<HeroAgents />);

    expect(screen.getByTestId('home-section')).toHaveAttribute('data-animation', 'autoplay');
    expect(screen.getAllByTestId('active-hero-agent')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /guarda la masterclass gratuita/i })).toHaveAttribute(
      'href',
      'https://www.ciak.io',
    );
    expect(screen.getByAltText(/Stefania, Coordinatrice del tuo percorso/i)).toBeInTheDocument();
  });
});
