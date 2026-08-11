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
    expect(siteContent.primaryCta.href).toBe('https://www.ciak.io/masterclass');
    expect(siteContent.primaryCta.label).toBe('Guarda la masterclass gratuita');
  });

  it('descrive il Metodo EVO come protocollo in tre passaggi testato in 7 anni', () => {
    expect(siteContent.faq.find(({ question }) => question === 'Cos’è il Metodo EVO?')?.answer)
      .toMatch(/protocollo testato negli ultimi 7 anni.*tre passaggi semplici/i);
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

  it('espone tutte le venti collaborazioni approvate', () => {
    expect(siteContent.collaborations).toHaveLength(20);
    expect(siteContent.collaborations.map(({ name }) => name)).toEqual(expect.arrayContaining([
      'Andrea Fredi',
      'Daniele Andolfi',
      'Sara Stella Duè',
      'Eva Gugliucciello',
    ]));
  });
});
