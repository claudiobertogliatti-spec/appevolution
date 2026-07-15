import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FounderStory } from '../src/sections/FounderStory';

describe('prestazioni degli asset', () => {
  it('carica Poppins senza @import CSS render-blocking', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('src/styles/globals.css', 'utf8');
    expect(css).not.toContain('@import');
    expect(html).toContain('rel="preconnect"');
    expect(html).toContain('fonts.googleapis.com');
  });

  it('usa l’immagine founder WebP responsive, lazy e dimensionata', () => {
    render(<FounderStory />);
    const image = screen.getByAltText(/fondatore di Evolution PRO/i);
    expect(image).toHaveAttribute('srcset');
    expect(image).toHaveAttribute('sizes');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveAttribute('width');
    expect(image).toHaveAttribute('height');
    expect(image.getAttribute('src')).toMatch(/\.webp$/);
  });
});
