import React from 'react';
import { render, screen } from '@testing-library/react';

// La CI usa `craco test` (jest CRA), che non risolve gli export condizionali di
// React Router 7. Il componente usa solo `useParams`, quindi lo mockiamo: nessun
// bisogno del vero react-router-dom né di MemoryRouter. (Sotto la config preview
// c'è un moduleNameMapper apposito, ma qui deve girare dove gira la CI.)
jest.mock('react-router-dom', () => ({ useParams: () => ({ token: 'tok' }) }));

const InsiderSalesPage = require('./InsiderSalesPage').default;

afterEach(() => { delete global.fetch; });

test('token scaduto (410) → messaggio onesto, nessun crash', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 410, json: () => Promise.resolve({}) }));
  render(<InsiderSalesPage />);
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
  render(<InsiderSalesPage />);
  expect(await screen.findByText(/Benvenuto/i)).toBeTruthy();
  expect(screen.queryByText(/hai già completato/i)).toBeNull();
});
