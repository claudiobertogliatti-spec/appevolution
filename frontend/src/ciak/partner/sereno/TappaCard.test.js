import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TappaCard, ExtraTappa } from './TappaCard';
import { TAPPE } from './tappe';
import { BOOSTER_CATALOG } from '../booster/boosterCatalog';

afterEach(cleanup);
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

test.each(['esamina', 'valida', 'ottimizza'])('tappa %s: immagine e le tre frasi', (id) => {
  wrap(<TappaCard macroPhase={id} />);
  expect(screen.getByRole('img').getAttribute('src')).toMatch(/ciak\/tappe\/tappa-/);
  ['Cosa facciamo', 'Perché', 'Alla fine avrai'].forEach((l) => expect(screen.getByText(l)).toBeTruthy());
  expect(screen.getByText(new RegExp(`Tappa ${TAPPE[id].numero} di 3`))).toBeTruthy();
});

test('ogni tappa suggerisce UN servizio extra che esiste nel catalogo, con il suo prezzo', () => {
  ['esamina', 'valida', 'ottimizza'].forEach((id) => {
    const s = BOOSTER_CATALOG[TAPPE[id].extra];
    expect(s).toBeTruthy();
    wrap(<ExtraTappa macroPhase={id} />);
    expect(screen.getByRole('heading', { name: s.name })).toBeTruthy();
    expect(screen.getByText(s.prezzo)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Scopri' }).getAttribute('href')).toBe(`/partner/servizi-extra/${s.id}`);
    cleanup();
  });
});

test('fase sconosciuta: niente da mostrare', () => {
  const { container } = wrap(<><TappaCard macroPhase="boh" /><ExtraTappa macroPhase="boh" /></>);
  expect(container.textContent).toBe('');
});
