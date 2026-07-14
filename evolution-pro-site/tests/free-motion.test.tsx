import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CiakPlatformDemo } from '../src/sections/CiakPlatformDemo';
import { DirectionSequence } from '../src/sections/DirectionSequence';
import { EnvelopeTestimonials } from '../src/sections/EnvelopeTestimonials';
import { EvoMethodSequence } from '../src/sections/EvoMethodSequence';
import { FounderStory } from '../src/sections/FounderStory';
import { HeroAgents } from '../src/sections/HeroAgents';
import { ProblemSequence } from '../src/sections/ProblemSequence';
import { ToolsMarquee } from '../src/sections/ToolsMarquee';

const testimonial = {
  name: 'Partner verificato',
  quote: 'Una testimonianza autentica e verificata.',
  video: '/testimonials/partner-verificato.mp4',
  photo: '/partners/partner-verificato.webp',
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('animazioni libere dallo scroll', () => {
  it('fa ruotare automaticamente gli agenti della hero', () => {
    render(<HeroAgents />);
    const agents = screen.getAllByRole('listitem');

    expect(screen.getByTestId('home-section')).toHaveAttribute('data-animation', 'autoplay');
    expect(agents[0]).toHaveAttribute('data-active', 'true');

    act(() => vi.advanceTimersByTime(3600));

    expect(agents[0]).toHaveAttribute('data-active', 'false');
    expect(agents[1]).toHaveAttribute('data-active', 'true');
  });

  it('rende autonome tutte le scene narrative e le videotestimonianze', () => {
    const { container } = render(<>
      <ToolsMarquee />
      <DirectionSequence />
      <ProblemSequence />
      <FounderStory />
      <EvoMethodSequence />
      <CiakPlatformDemo />
      <EnvelopeTestimonials testimonials={[testimonial]} />
    </>);

    expect(container.querySelectorAll('[data-animation="autoplay"]')).toHaveLength(7);
    expect(container.querySelector('[data-scroll-linked]')).not.toBeInTheDocument();
  });

  it('non usa più altezze artificiali o stage sticky per pilotare le scene', () => {
    const css = readFileSync('src/styles/globals.css', 'utf8');

    for (const selector of [
      '.hero-agents',
      '.tools-cinematic',
      '.direction-sequence',
      '.problem-sequence',
      '.founder-story',
      '.evo-method',
      '.ciak-demo',
      '.envelope-timeline',
    ]) {
      const escaped = selector.replace('.', '\\.');
      expect(css).not.toMatch(new RegExp(`${escaped}\\s*\\{[^}]*min-height:\\s*(?:220|300|360|420|500)vh`));
    }

    for (const selector of [
      '.hero-agents__stage',
      '.tools-cinematic__stage',
      '.direction-sequence__stage',
      '.problem-sequence__stage',
      '.founder-story__stage',
      '.evo-method__stage',
      '.ciak-demo__stage',
      '.envelope-timeline .envelope',
    ]) {
      const escaped = selector.replaceAll('.', '\\.');
      expect(css).not.toMatch(new RegExp(`${escaped}\\s*\\{[^}]*position:\\s*sticky`));
    }
  });
});
