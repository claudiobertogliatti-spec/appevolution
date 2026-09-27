import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Il blog (HTML statico generato da blog-build/generate.mjs) deve tracciare ogni link verso il funnel Ciak.
// Se un articolo nuovo reintroduce un link senza UTM, questo test diventa rosso.
const dir = resolve(__dirname, '..', 'public', 'blog');
const pages = readdirSync(dir).filter((f) => f.endsWith('.html'));
const decode = (s: string) => s.replace(/&amp;/g, '&');

describe('blog: UTM sui link verso il funnel Ciak', () => {
  it('il blog ha pagine da controllare', () => {
    expect(pages.length).toBeGreaterThan(30);
  });

  it.each(pages)('%s: ogni link a ciak.io porta gli UTM corretti', (file) => {
    const html = readFileSync(resolve(dir, file), 'utf8');
    const links = [...html.matchAll(/href="(https:\/\/www\.ciak\.io[^"]*)"/g)].map((m) => decode(m[1]));
    expect(links.length).toBeGreaterThan(0);

    const page = file.replace(/\.html$/, '');
    for (const link of links) {
      const url = new URL(link);
      expect(url.pathname).toBe('/blueprint');
      expect(url.searchParams.get('utm_source')).toBe('blog');
      expect(url.searchParams.get('utm_medium')).toBe('organic');
      expect(url.searchParams.get('utm_campaign')).toBe('videocorsi');
      const content = url.searchParams.get('utm_content') ?? '';
      expect(content.startsWith(`${page}_`)).toBe(true);
      // il backend Ciak limita gli UTM a 80 caratteri: oltre, il lead verrebbe rifiutato
      expect(content.length).toBeLessThanOrEqual(80);
    }
  });
});
