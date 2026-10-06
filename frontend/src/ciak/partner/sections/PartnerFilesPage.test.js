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

// Il file puo' comparire anche nelle "Novità": si cerca sempre la riga dell'elenco.
// Le cartelle sono tessere: per arrivare a una riga si usa "Cerca file" (elenco unico).
const rowByName = async (name) => {
  fireEvent.change(await screen.findByPlaceholderText(/Cerca per nome/), { target: { value: name } });
  const hits = await screen.findAllByText(name);
  return hits.map((h) => h.closest('.sereno-mat-file')).find(Boolean);
};

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
  // (the name is shown cleaned: no underscores, no extension)
  const row = await rowByName('Analisi Mercato');

  // Downloading it goes through the authenticated fetch (Bearer token), not a bare link.
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

  const pdfRow = await rowByName('Analisi Mercato');
  const docxRow = await rowByName('Script Masterclass');

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

  const row = await rowByName('Contratto firmato');
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
  await rowByName('Analisi Mercato'); // the page has finished loading and the document is there

  fireEvent.change(screen.getByPlaceholderText(/Cerca per nome/), { target: { value: 'Contratto' } });
  expect(screen.getByText('Nessun file corrisponde alla ricerca.')).toBeTruthy();
  expect(screen.queryByText('Contratto firmato')).toBeNull();
});

test('without a partner id the effect does not fetch (no crash, empty state)', async () => {
  global.fetch = jest.fn();
  render(<MemoryRouter><PartnerFilesPage /></MemoryRouter>);
  await screen.findByText('I tuoi materiali.');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('uploading a file posts to the real endpoint with the token, then the list is read again', async () => {
  let materialiCalls = 0;
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/operativo/materiali/')) {
      materialiCalls += 1;
      const body = materialiCalls === 1
        ? MATERIALI
        : { materials: [...MATERIALI.materials, {
          id: 'up1', type: 'pdf', title: 'Fatture_ottobre.pdf', category: 'document', source: 'operativo',
          download_url: '/api/partner-step-materials/up1/download', public_url: null, created_at: new Date().toISOString(),
        }] };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    }
    if (String(url).includes('/posizionamento/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(POSIZIONAMENTO) });
    return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
  });

  const sent = [];
  global.XMLHttpRequest = function FakeXhr() {
    const x = this;
    x.headers = {}; x.upload = {};
    x.open = (m, u) => { x.method = m; x.url = u; };
    x.setRequestHeader = (k, v) => { x.headers[k] = v; };
    x.send = () => { sent.push(x); setTimeout(() => { x.status = 200; x.responseText = JSON.stringify({ success: true }); x.onload(); }, 0); };
  };

  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);
  await rowByName('Analisi Mercato');

  const input = screen.getByTestId('sereno-file-input');
  fireEvent.change(input, { target: { files: [new File(['abc'], 'Fatture_ottobre.pdf', { type: 'application/pdf' })] } });

  expect(await screen.findByText('✓ Ricevuto')).toBeTruthy();
  expect(sent).toHaveLength(1);
  expect(sent[0].method).toBe('POST');
  expect(sent[0].url).toBe('/api/partner-journey/operativo/upload/p1');
  expect(sent[0].headers.Authorization).toBe('Bearer test-jwt');

  // the new file is read back from the server and shown as the partner's own
  const row = await rowByName('Fatture ottobre');
  expect(within(row).getByText('Caricato da te')).toBeTruthy();
  expect(materialiCalls).toBe(2);
  delete global.XMLHttpRequest;
});

test("an admin in supervision can upload on the partner's behalf: warned, and without the 'il partner ha caricato' alert", async () => {
  localStorage.setItem('ciak_partner_user', JSON.stringify({ name: 'Admin', role: 'admin' }));
  global.fetch = jest.fn((url) => materialsRoute(url) || Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) }));
  const sent = [];
  global.XMLHttpRequest = function FakeXhr() {
    const x = this;
    x.headers = {}; x.upload = {};
    x.open = (m, u) => { x.method = m; x.url = u; };
    x.setRequestHeader = (k, v) => { x.headers[k] = v; };
    x.send = () => { sent.push(x); setTimeout(() => { x.status = 200; x.responseText = JSON.stringify({ success: true }); x.onload(); }, 0); };
  };
  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);
  expect(await screen.findByText(/Vista supervisione: il file viene aggiunto all'area di questo partner/)).toBeTruthy();
  fireEvent.change(screen.getByTestId('sereno-file-input'), { target: { files: [new File(['abc'], 'Prova.pdf', { type: 'application/pdf' })] } });
  expect(await screen.findByText('✓ Ricevuto')).toBeTruthy();
  expect(sent[0].url).toBe('/api/partner-journey/operativo/upload/p1?notify=false');
  expect(screen.queryByText(/Il team è stato avvisato/)).toBeNull(); // notify=false: it must not claim the team was told
  expect(screen.getByText(/aggiunto all’area del partner/)).toBeTruthy();
  delete global.XMLHttpRequest;
});

test('real files land in the right folder tiles: contract and ID apart from logo, reels with their covers, sales pages together', async () => {
  const m = (id, title, type, category) => ({ id, type, title, category, download_url: `/api/partner-step-materials/${id}/download`, public_url: null, created_at: '2026-01-10T10:00:00Z' });
  const reali = { materials: [
    m('1', 'Logo_Sabai.png', 'image', 'image'),
    m('2', 'Brand Kit - Daniele Andolfi.pdf', 'pdf', 'brand-kit'),
    m('3', 'CF_Fronte.jpeg', 'image', 'document'),
    m('4', 'Distinta_pagamento_Daniele_Andolfi.pdf', 'pdf', 'distinta_pagamento'),
    m('5', 'reel1.mp4', 'video', 'video'),
    m('6', 'copertina reel g29.jpeg', 'image', 'image'),
    m('7', 'Privacy Policy - Daniele Andolfi.pdf', 'pdf', 'vendita_privacy'),
    m('8', 'Termini e condizioni di vendita.pdf', 'pdf', 'vendita_termini'),
    m('9', 'Outline corso - Daniele Andolfi.pdf', 'pdf', 'course_outline'),
  ] };
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/operativo/materiali/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(reali) });
    if (String(url).includes('/posizionamento/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(POSIZIONAMENTO) });
    if (String(url).includes('/api/contract/status/')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ signed: true, signed_at: '2026-08-14T10:00:00Z' }) });
    if (String(url).includes('/api/contract/pdf/')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, pdf_url: '/api/contract/pdf-download/p1' }) });
    return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
  });
  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);
  const tile = async (name) => (await screen.findByRole('button', { name: new RegExp(`Apri la cartella ${name},`) })).textContent;
  expect(await tile('Brand e strategia')).toMatch(/2 file/); // logo + brand kit
  expect(await tile('Contratto e documenti personali')).toMatch(/3 file/); // CF + distinta + the signed contract
  expect(await tile('Reel e contenuti social')).toMatch(/2 file/); // reel + its cover
  expect(await tile('Vendita e pagine legali')).toMatch(/2 file/); // privacy + terms
  expect(await tile('Corso e script')).toMatch(/1 file/); // outline
  expect(await tile('Il tuo piano')).toMatch(/2 file/); // Libretto + Piano operativo
});

const routeConLivello = (tier) => (url) => {
  const u = String(url);
  if (u.includes('/operativo/materiali/')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...MATERIALI, tier }) });
  }
  if (u.includes('/posizionamento/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(POSIZIONAMENTO) });
  if (u.includes('/api/contract/status/')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ signed: false }) });
  return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
};

test('un cliente Ciak Start NON vede Libretto di Progetto e Piano Operativo EVO (sono della Partnership)', async () => {
  global.fetch = jest.fn(routeConLivello('start'));
  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);
  expect(await rowByName('Analisi Mercato')).toBeTruthy(); // i suoi materiali ci sono (nome mostrato pulito)
  fireEvent.change(screen.getByPlaceholderText(/Cerca per nome/), { target: { value: 'Libretto' } });
  expect(screen.queryByText(/Libretto di Progetto Ciak/)).toBeNull();
  fireEvent.change(screen.getByPlaceholderText(/Cerca per nome/), { target: { value: 'Piano Operativo' } });
  expect(screen.queryByText(/Piano Operativo Strategico EVO/)).toBeNull();
  fireEvent.change(screen.getByPlaceholderText(/Cerca per nome/), { target: { value: '' } });
  expect(screen.queryByRole('button', { name: /Apri la cartella Il tuo piano,/ })).toBeNull();
});

test('un partner (Partnership) continua a vedere Libretto di Progetto e Piano Operativo', async () => {
  global.fetch = jest.fn(routeConLivello('partnership'));
  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);
  const piano = await screen.findByRole('button', { name: /Apri la cartella Il tuo piano,/ });
  expect(piano.textContent).toMatch(/2 file/);
});

test('un partner senza livello scritto (i 26 migrati) resta Partnership: vede i due documenti', async () => {
  global.fetch = jest.fn(routeConLivello(undefined));
  render(<MemoryRouter><PartnerFilesPage partnerId="p1" /></MemoryRouter>);
  expect((await screen.findByRole('button', { name: /Apri la cartella Il tuo piano,/ })).textContent).toMatch(/2 file/);
});
