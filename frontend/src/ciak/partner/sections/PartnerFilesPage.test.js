import React from 'react';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
jest.mock('../sereno/feature', () => ({ PARTNER_SERENO_ENABLED: true }));
const { MemoryRouter } = require('react-router-dom');
const { PartnerFilesPage } = require('./PartnerFilesPage');

// Fonte reale dei materiali (dal #150): GET /api/partner-journey/operativo/materiali/{id},
// collezione `files`. Forma di services/partner_step_materials.normalize_file_material.
const MATERIALI = {
  materials: [
    {
      id: 'f1', type: 'pdf', title: 'Analisi_Mercato.pdf', category: 'Analisi',
      download_url: '/api/partner-step-materials/f1/download', public_url: null,
      created_at: '2026-09-20T10:00:00Z',
    },
  ],
};
// La cartella Drive viene ancora dal posizionamento; qui non c'e'.
const POSIZIONAMENTO = { posizionamento: {} };

const materialsRoute = (url) => {
  if (String(url).includes('/operativo/materiali/')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(MATERIALI) });
  }
  if (String(url).includes('/posizionamento/')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(POSIZIONAMENTO) });
  }
  return null;
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
    const m = materialsRoute(url);
    if (m) return m;
    return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
  });

  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);

  // The document fetched from the authenticated endpoint is shown by the sereno skin.
  const title = await screen.findByText('Analisi_Mercato.pdf');

  // Downloading it goes through the authenticated fetch (Bearer token), not a bare link.
  const row = title.closest('.sereno-mat-file');
  fireEvent.click(within(row).getByRole('button', { name: /Scarica/i }));

  await waitFor(() => {
    const call = global.fetch.mock.calls.find(([u]) => String(u).includes('/api/partner-step-materials/f1/download'));
    expect(call).toBeTruthy();
    expect(call[1].headers.Authorization).toBe('Bearer test-jwt');
  });
});

test('a Word/Excel file has no "Apri" (the browser would download it) while a PDF keeps it; both keep "Scarica"', async () => {
  const misti = {
    materials: [
      { id: 'f1', type: 'pdf', title: 'Analisi_Mercato.pdf', category: 'Analisi', can_preview: true,
        download_url: '/api/partner-step-materials/f1/download', public_url: null },
      { id: 'f2', type: 'document', title: 'Script_Masterclass.docx', category: 'Script', can_preview: false,
        download_url: '/api/partner-step-materials/f2/download', public_url: null },
    ],
  };
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/operativo/materiali/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(misti) });
    if (String(url).includes('/posizionamento/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(POSIZIONAMENTO) });
    return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
  });

  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);

  const pdfRow = (await screen.findByText('Analisi_Mercato.pdf')).closest('.sereno-mat-file');
  const docxRow = (await screen.findByText('Script_Masterclass.docx')).closest('.sereno-mat-file');

  expect(within(pdfRow).getByRole('button', { name: /Apri/i })).toBeTruthy();
  expect(within(docxRow).queryByRole('button', { name: /Apri/i })).toBeNull();
  expect(within(pdfRow).getByRole('button', { name: /Scarica/i })).toBeTruthy();
  expect(within(docxRow).getByRole('button', { name: /Scarica/i })).toBeTruthy();
});

test('partner with a signed contract AND an existing PDF shows a "Contratto firmato" entry whose download hits pdf-download', async () => {
  global.fetch = jest.fn((url) => {
    const m = materialsRoute(url);
    if (m) return m;
    if (String(url).includes('/api/contract/status/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ signed: true, signed_at: '2026-09-01T10:00:00Z' }) });
    }
    if (String(url).includes('/api/contract/pdf/')) {
      // get_contract_pdf: il PDF esiste davvero (o e' stato appena rigenerato).
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, pdf_url: '/api/contract/pdf-download/p1' }) });
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

test('partner with signed_at but NO real PDF (best-effort generation failed) shows NO "Contratto firmato" entry — no fake 404 download', async () => {
  global.fetch = jest.fn((url) => {
    const m = materialsRoute(url);
    if (m) return m;
    if (String(url).includes('/api/contract/status/')) {
      // signed_at e' scritto PRIMA della generazione del PDF: qui il partner
      // risulta firmato ma la riga in contract_pdfs non e' mai stata creata.
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ signed: true, signed_at: '2026-09-01T10:00:00Z' }) });
    }
    if (String(url).includes('/api/contract/pdf/')) {
      // get_contract_pdf: generazione fallita -> 500, nessun pdf_url reale.
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ detail: 'Impossibile generare il PDF' }) });
    }
    return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
  });

  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);

  // Aspetta che il fetch dei materiali reali sia risolto (l'altro documento appare comunque).
  await screen.findByText('Analisi_Mercato.pdf');

  expect(screen.queryByText('Contratto firmato')).toBeNull();
});

test('without a partner id the effect does not fetch (no crash, empty state)', async () => {
  global.fetch = jest.fn();
  render(<MemoryRouter><PartnerFilesPage /></MemoryRouter>);
  await screen.findByText('I tuoi materiali.');
  expect(global.fetch).not.toHaveBeenCalled();
});
