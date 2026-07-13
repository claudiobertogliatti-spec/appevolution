import { render, screen } from '@testing-library/react';
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

  it('mantiene attive le animazioni desktop anche se il sistema richiede movimento ridotto', () => {
    render(<HeroAgents />);

    expect(screen.getByTestId('home-section')).not.toHaveClass('hero-agents--static');
  });

  it('rende accessibili la direzione e tutti i sei agenti', () => {
    render(<HeroAgents />);

    expect(
      screen.getByRole('heading', { level: 1, name: /direzione/i }),
    ).toBeInTheDocument();

    for (const name of ['Stefania', 'Valentina', 'Andrea', 'Gaia', 'Marco', 'Matteo']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('fetchpriority', 'high');
    expect(images[0]).not.toHaveAttribute('loading', 'lazy');
    for (const image of images.slice(1)) expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('usa una modalità statica e non attenuata su viewport mobile', () => {
    motionPreference.reduced = false;
    mockMobileViewport(true);

    render(<HeroAgents />);

    expect(screen.getByTestId('home-section')).toHaveClass('hero-agents--static');
    for (const item of screen.getAllByRole('listitem')) {
      expect(item).toHaveAttribute('data-active', 'true');
      expect(item).not.toHaveStyle({ opacity: '0.42', transform: 'scale(0.78)' });
    }
    expect(screen.getByRole('link', { name: /guarda la masterclass gratuita/i })).toHaveAttribute(
      'href',
      'https://www.ciak.io',
    );
    expect(screen.getByAltText(/Stefania, Coordinatrice del tuo percorso/i)).toBeInTheDocument();
  });
});
