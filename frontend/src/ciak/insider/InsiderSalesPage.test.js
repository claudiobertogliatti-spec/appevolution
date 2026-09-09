import React from 'react';
import { render, screen } from '@testing-library/react';
global.TextEncoder = require('util').TextEncoder;
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const InsiderSalesPage = require('./InsiderSalesPage').default;

afterEach(() => { delete global.fetch; });

test('token scaduto (410) → messaggio onesto, nessun crash', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 410, json: () => Promise.resolve({}) }));
  render(<MemoryRouter initialEntries={['/insider/tok']}>
    <Routes><Route path="/insider/:token" element={<InsiderSalesPage />} /></Routes>
  </MemoryRouter>);
  expect(await screen.findByText(/non è più disponibile|scadut/i)).toBeTruthy();
});

test('contratto firmato ma NON pagato → resta la pagina offerta, non il messaggio "completato"', async () => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      stato: 'contratto_firmato',
      prospect_nome: 'Marco Rossi',
      scoring_stato: '3',
      analisi: null,
      partner_id: 'p1',
    }),
  }));
  render(<MemoryRouter initialEntries={['/insider/tok']}>
    <Routes><Route path="/insider/:token" element={<InsiderSalesPage />} /></Routes>
  </MemoryRouter>);
  expect(await screen.findByText(/Benvenuto/i)).toBeTruthy();
  expect(screen.queryByText(/hai già completato/i)).toBeNull();
});
