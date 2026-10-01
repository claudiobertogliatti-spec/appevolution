import React from 'react';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';

process.env.REACT_APP_PARTNER_SERENO = 'true';
global.TextEncoder = require('util').TextEncoder;
const { MemoryRouter } = require('react-router-dom');
const { PartnerFilesPage } = require('./PartnerFilesPage');

afterEach(() => { cleanup(); delete global.fetch; });

// Every request stays pending until we resolve it by hand: this shows which
// calls start together and what the partner sees in the meantime.
function deferredFetch() {
  const pending = {};
  global.fetch = jest.fn((url) => new Promise((resolve) => { pending[String(url)] = resolve; }));
  const ok = (url, body) => pending[url]({ ok: true, status: 200, json: async () => body });
  return { pending, ok };
}

const renderPage = () => render(<MemoryRouter><PartnerFilesPage partner={{ id: 'p1' }} /></MemoryRouter>);

test('the independent sources start together, not one after the other', async () => {
  const { pending } = deferredFetch();
  renderPage();
  await waitFor(() => expect(Object.keys(pending).length).toBe(3));
  expect(Object.keys(pending).sort()).toEqual([
    '/api/contract/status/p1',
    '/api/partner-journey/operativo/materiali/p1',
    '/api/partner-journey/posizionamento/p1',
  ]);
});

test('while sources are pending the partner sees a loading message and the fixed PDFs, never "0 file"', async () => {
  deferredFetch();
  renderPage();
  expect(await screen.findByText('Piano_Operativo_Strategico_EVO.pdf')).toBeTruthy();
  expect(screen.getAllByText('Sto caricando i tuoi materiali…').length).toBeGreaterThan(0);
  expect(screen.queryByText(/Nessun file in questa cartella/)).toBeNull();
});

test('when everything has answered the loading message goes away and real files appear', async () => {
  const { pending, ok } = deferredFetch();
  renderPage();
  await waitFor(() => expect(Object.keys(pending).length).toBe(3));
  await act(async () => {
    ok('/api/partner-journey/posizionamento/p1', {});
    ok('/api/contract/status/p1', { signed: false });
    ok('/api/partner-journey/operativo/materiali/p1', {
      materials: [{ id: 'm1', type: 'pdf', title: 'Brand_Kit.pdf', category: 'brand_kit', download_url: '/x' }],
    });
  });
  expect(await screen.findByText('Brand_Kit.pdf')).toBeTruthy();
  await waitFor(() => expect(screen.queryByText('Sto caricando i tuoi materiali…')).toBeNull());
});
