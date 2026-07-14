import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { EnvelopeTestimonials } from '../src/sections/EnvelopeTestimonials';
import { FaqAccordion } from '../src/sections/FaqAccordion';
import { FinalCta } from '../src/sections/FinalCta';

const completeTestimonial = {
  name: 'Partner verificato',
  quote: 'Una testimonianza autentica e verificata.',
  video: '/testimonials/partner-verificato.mp4',
  photo: '/partners/partner-verificato.webp',
};

describe('EnvelopeTestimonials', () => {
  it('non pubblica stelle o CTA video senza quote e video', () => {
    render(<EnvelopeTestimonials testimonials={[
      { name: 'Senza quote', quote: '', video: '/video.mp4' },
      { name: 'Senza video', quote: 'Testo verificato', video: '' },
    ]} />);

    expect(screen.queryByLabelText('5 stelle su 5')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /guarda/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Testo verificato')).not.toBeInTheDocument();
  });

  it('apre il video verificato e con Escape chiude ripristinando il focus', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    render(<EnvelopeTestimonials testimonials={[completeTestimonial]} />);

    expect(screen.getByLabelText('5 stelle su 5')).toHaveTextContent('★★★★★');
    const trigger = screen.getByRole('button', { name: /guarda la testimonianza/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: /partner verificato/i })).toBeInTheDocument();
    const video = screen.getByTitle('Video testimonianza di Partner verificato');
    expect(video).not.toHaveAttribute('autoplay');
    const close = screen.getByRole('button', { name: 'Chiudi video' });
    expect(close).toHaveFocus();
    expect(document.querySelector('.video-modal__backdrop')).not.toHaveAttribute('tabindex');

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(video).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(pause).toHaveBeenCalledOnce();
  });

  it('espone layer distinti per flap, foto, messaggio e azioni', () => {
    render(<EnvelopeTestimonials testimonials={[completeTestimonial]} />);
    const envelope = screen.getByTestId('testimonial-envelope');
    const timeline = screen.getByTestId('testimonial-timeline');
    expect(timeline).toHaveClass('envelope-timeline');
    expect(timeline).not.toHaveAttribute('data-scroll-linked');
    expect(document.querySelector('.testimonials__grid')).toHaveAttribute('data-animation', 'autoplay');
    expect(envelope).toHaveClass('envelope--cinematic');
    expect(screen.getByTestId('testimonial-letter')).toBeInTheDocument();
    expect(envelope).toHaveAttribute('data-mobile-state', 'final');
    expect(screen.getByTestId('testimonial-flap')).toHaveClass('envelope__flap');
    expect(screen.getByTestId('testimonial-photo')).toHaveClass('envelope__photo');
    expect(screen.getByTestId('testimonial-message')).toHaveClass('envelope__message');
    expect(screen.getByTestId('testimonial-actions')).toHaveClass('envelope__actions');
  });

  it('lascia libera la busta senza altezza narrativa o sticky', () => {
    const css = readFileSync('src/styles/globals.css', 'utf8');
    expect(css).toMatch(/\.envelope-timeline\s*\{[^}]*min-height:\s*auto/);
    expect(css).toMatch(/\.envelope-timeline\s+\.envelope\s*\{[^}]*position:\s*relative/);
    expect(css).not.toMatch(/\.envelope-timeline\s*\{[^}]*min-height:\s*220vh/);
    expect(css).not.toMatch(/\.envelope-timeline\s+\.envelope\s*\{[^}]*position:\s*sticky/);
  });

  it('non usa animazioni CSS autonome che competono con lo scroll', () => {
    const css = readFileSync('src/styles/globals.css', 'utf8');
    expect(css).not.toMatch(/@keyframes\s+envelope-open/);
    expect(css).not.toMatch(/animation:\s*(envelope-open|photo-emerge|message-emerge|actions-emerge)/);
    expect(css).not.toContain('@media (prefers-reduced-motion: reduce)');
  });

});

describe('FaqAccordion', () => {
  it('associa button e pannello e aggiorna aria-expanded', () => {
    render(<FaqAccordion />);
    const button = screen.getByRole('button', { name: 'Cos’è il Metodo EVO?' });
    const panelId = button.getAttribute('aria-controls');

    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(panelId!)).toHaveAttribute('aria-labelledby', button.id);
  });
});

it('usa il dominio Ciak nella CTA finale', () => {
  render(<FinalCta />);
  expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.ciak.io');
});
