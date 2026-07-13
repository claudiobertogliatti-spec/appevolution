import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    render(<EnvelopeTestimonials testimonials={[completeTestimonial]} />);

    expect(screen.getByLabelText('5 stelle su 5')).toHaveTextContent('★★★★★');
    const trigger = screen.getByRole('button', { name: /guarda la video testimonianza/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: /partner verificato/i })).toBeInTheDocument();
    const video = screen.getByTitle('Video testimonianza di Partner verificato');
    expect(video).not.toHaveAttribute('autoplay');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
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
