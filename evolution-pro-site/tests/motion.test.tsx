import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

import { HeroAgents } from '../src/sections/HeroAgents';

describe('hero agenti con movimento ridotto', () => {
  it('rende accessibili la direzione e tutti i sei agenti', () => {
    render(<HeroAgents />);

    expect(
      screen.getByRole('heading', { level: 1, name: /direzione/i }),
    ).toBeInTheDocument();

    for (const name of ['Stefania', 'Valentina', 'Andrea', 'Gaia', 'Marco', 'Matteo']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});
