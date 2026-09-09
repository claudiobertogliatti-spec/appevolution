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
