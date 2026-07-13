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
  });
});
