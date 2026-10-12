import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SerenoGuide from './SerenoGuide';
import { GUIDE, EXTRA_CONTENUTI } from './guideContent';
import { BOOSTER_CATALOG } from '../booster/boosterCatalog';

afterEach(cleanup);
const wrap = () => render(<MemoryRouter><SerenoGuide /></MemoryRouter>);

test('le tre guide ci sono, ciascuna con i suoi passi', () => {
  wrap();
  ['Prima di registrare', 'Come si fa un reel', 'Come si fa un carosello'].forEach(t => expect(screen.getByRole('heading', { name: t })).toBeTruthy());
  GUIDE.forEach(g => g.passi.forEach(([t]) => expect(screen.getByText(t + '.')).toBeTruthy()));
});

test('senza video di esempio la sezione non compare (nessun segnaposto)', () => {
  wrap();
  expect(screen.queryByText('Video di esempio')).toBeNull();
});

test('il servizio extra viene dal catalogo, con il suo prezzo', () => {
  wrap();
  const s = BOOSTER_CATALOG[EXTRA_CONTENUTI];
  expect(s).toBeTruthy();
  expect(screen.getByRole('heading', { name: s.name })).toBeTruthy();
  expect(screen.getByText(s.prezzo)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Scopri' }).getAttribute('href')).toBe(`/partner/servizi-extra/${s.id}`);
});

test('il formato del carosello dichiarato è quello verificato', () => {
  wrap();
  expect(screen.getByText(/1080 × 1350 pixel \(4:5/)).toBeTruthy();
});
