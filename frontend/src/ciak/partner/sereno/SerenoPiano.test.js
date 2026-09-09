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

test('without a verified current plan, the status is honestly "Da collegare"', () => {
  renderPiano();
  expect(screen.getAllByText(/Da collegare/).length).toBeGreaterThanOrEqual(2);
});

test('a provided plan is shown instead of the placeholder', () => {
  renderPiano({ plan: { name: 'Pro', scadenza: '31/12/2026' } });
  expect(screen.getByText('Pro')).toBeTruthy();
  expect(screen.getByText('31/12/2026')).toBeTruthy();
  expect(screen.queryByText(/Da collegare/)).toBeNull();
});
