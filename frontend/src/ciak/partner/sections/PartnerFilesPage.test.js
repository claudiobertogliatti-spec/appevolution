import React from 'react';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
jest.mock('../sereno/feature', () => ({ PARTNER_SERENO_ENABLED: true }));
const { MemoryRouter } = require('react-router-dom');
const { PartnerFilesPage } = require('./PartnerFilesPage');

// Real-shape response of the authenticated materials endpoint.
const POSIZIONAMENTO = {
  posizionamento: {
    materiali: [
      { nome: 'Analisi_Mercato.pdf', url: '/api/partner-journey/analisi/p1', cartella: 'brand_kit', categoria: 'Analisi', data: 'oggi', owner: '⚙️ CIAK' },
    ],
  },
};

beforeEach(() => {
  localStorage.setItem('ciak_partner_token', 'test-jwt');
  global.URL.createObjectURL = jest.fn(() => 'blob:x');
  global.URL.revokeObjectURL = jest.fn();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete global.fetch;
  jest.clearAllMocks();
});

test('flag-on renders the real fetched materials in the sereno skin, and download carries the auth token', async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/posizionamento/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(POSIZIONAMENTO) });
    }
    return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
  });

  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);

  // The document fetched from the authenticated endpoint is shown by the sereno skin.
  const title = await screen.findByText('Analisi_Mercato.pdf');

  // Downloading it goes through the authenticated fetch (Bearer token), not a bare link.
  const row = title.closest('.sereno-mat-file');
  fireEvent.click(within(row).getByRole('button', { name: /Scarica/i }));

  await waitFor(() => {
    const call = global.fetch.mock.calls.find(([u]) => String(u).includes('/analisi/p1'));
    expect(call).toBeTruthy();
    expect(call[1].headers.Authorization).toBe('Bearer test-jwt');
  });
});

test('partner with a signed contract shows a "Contratto firmato" entry whose download hits pdf-download', async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/posizionamento/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(POSIZIONAMENTO) });
    }
    if (String(url).includes('/api/contract/status/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ signed: true, signed_at: '2026-09-01T10:00:00Z' }) });
    }
    return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
  });

  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);

  const title = await screen.findByText('Contratto firmato');

  const row = title.closest('.sereno-mat-file');
  fireEvent.click(within(row).getByRole('button', { name: /Scarica/i }));

  await waitFor(() => {
    const call = global.fetch.mock.calls.find(([u]) => String(u).includes('/api/contract/pdf-download/p1'));
    expect(call).toBeTruthy();
    expect(call[1].headers.Authorization).toBe('Bearer test-jwt');
  });
});

test('without a partner id the effect does not fetch (no crash, empty state)', async () => {
  global.fetch = jest.fn();
  render(<MemoryRouter><PartnerFilesPage /></MemoryRouter>);
  await screen.findByText('I tuoi materiali.');
  expect(global.fetch).not.toHaveBeenCalled();
});
