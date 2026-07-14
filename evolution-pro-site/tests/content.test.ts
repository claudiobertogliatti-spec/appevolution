import { describe, expect, it } from 'vitest';
import { siteContent } from '../src/content/siteContent';

describe('contratto dei contenuti istituzionali', () => {
  it('espone i sei agenti e gli strumenti richiesti', () => {
    expect(siteContent.agents).toHaveLength(6);
    expect(siteContent.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(['Canva', 'HeyGen']),
    );
  });

  it('indirizza la CTA primaria solo alla piattaforma Ciak attiva', () => {
    expect(JSON.stringify(siteContent)).not.toContain('app.evolution-pro.it');
    expect(siteContent.primaryCta.href).toMatch(/^https:\/\/www\.ciak\.io/);
    expect(siteContent.primaryCta.label).toBe('Guarda la masterclass gratuita');
  });

  it('descrive il Metodo EVO come percorso in 12 fasi operative', () => {
    expect(siteContent.faq.find(({ question }) => question === 'Cos’è il Metodo EVO?')?.answer)
      .toContain('12 fasi operative');
  });

  it('pubblica tre videotestimonianze complete con foto e poster', () => {
    expect(siteContent.testimonials).toHaveLength(3);
    for (const testimonial of siteContent.testimonials) {
      expect(testimonial.quote).toBeTruthy();
      expect(testimonial.video).toMatch(/^\/testimonials\/.+\.mp4$/);
      expect(testimonial.photo).toMatch(/^\/testimonials\/.+\.webp$/);
      expect(testimonial.poster).toBe(testimonial.photo);
    }
  });
});
