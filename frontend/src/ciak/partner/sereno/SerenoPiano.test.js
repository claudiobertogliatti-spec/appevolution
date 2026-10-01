import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
const { MemoryRouter } = require('react-router-dom');
const SerenoPiano = require('./SerenoPiano').default;

afterEach(cleanup);

const renderPiano = (props) => render(<MemoryRouter><SerenoPiano {...props} /></MemoryRouter>);

test('shows the real EVO S renewal prices, not invented ones', () => {
  renderPiano();
  expect(screen.getByText(/147 € \/ mese/)).toBeTruthy();
  expect(screen.getByText(/297 € \/ mese/)).toBeTruthy();
  expect(screen.getByText(/497 € \/ mese/)).toBeTruthy();
  expect(screen.getByText(/797 € \/ mese/)).toBeTruthy();
});

test('without a contract date there is no placeholder, only an honest message', () => {
  renderPiano();
  expect(screen.queryByText(/Da collegare/)).toBeNull();
  expect(screen.getByText(/te la conferma il team/)).toBeTruthy();
});

test('with a real contract date, shows start and end of the first 12 months', () => {
  renderPiano({ support: { contract_date: '2026-03-10', unlock_date: '2027-03-10', eligible: false } });
  expect(screen.getByText(/10 marzo 2026/)).toBeTruthy();
  expect(screen.getByText(/10 marzo 2027/)).toBeTruthy();
  expect(screen.queryByText(/Da collegare/)).toBeNull();
});

test('once the 12 months are done, says the renewal can be chosen', () => {
  renderPiano({ support: { contract_date: '2025-01-05', unlock_date: '2026-01-05', eligible: true } });
  expect(screen.getByText(/primi 12 mesi sono completati/)).toBeTruthy();
});

test('a provided plan is shown instead of the placeholder', () => {
  renderPiano({ plan: { name: 'Pro', scadenza: '31/12/2026' } });
  expect(screen.getByText('Pro')).toBeTruthy();
  expect(screen.getByText('31/12/2026')).toBeTruthy();
  expect(screen.queryByText(/Da collegare/)).toBeNull();
});
