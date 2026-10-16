import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
jest.mock('../sereno/feature', () => ({ PARTNER_SERENO_ENABLED: true }));
const { MemoryRouter } = require('react-router-dom');
const { EvoSPage } = require('./EvoSPage');

afterEach(() => {
  cleanup();
  delete global.fetch;
});

test('flag-on shows the real renewal tiers and opens the real detail (with checkout) on click', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ eligible: true }) }));
  render(<MemoryRouter><EvoSPage partnerId="p1" /></MemoryRouter>);

  // Real EVO S price from the single PLANS source.
  expect(await screen.findByText(/147 € \/ mese/)).toBeTruthy();

  // Opening a tier reaches the existing detail page (its EVO S activation/checkout).
  fireEvent.click(screen.getAllByRole('button', { name: /Vedi cosa include/i })[0]);
  expect(await screen.findByText(/Attiva il Piano/i)).toBeTruthy();
});
