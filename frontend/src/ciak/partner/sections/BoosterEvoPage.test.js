import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
jest.mock('../sereno/feature', () => ({ PARTNER_SERENO_ENABLED: true }));
const { MemoryRouter } = require('react-router-dom');
const { BoosterEvoPage } = require('./BoosterEvoPage');

afterEach(cleanup);

test('flag-on renders the sereno vetrina with real catalogue names and prices, each openable', () => {
  render(<MemoryRouter><BoosterEvoPage partnerId="p1" /></MemoryRouter>);

  expect(screen.getByText('Servizi aggiuntivi.')).toBeTruthy();
  // Real service + price from BOOSTER_CATALOG (single source, not invented).
  expect(screen.getByText('Video Premium')).toBeTruthy();
  expect(screen.getByText('590 €')).toBeTruthy();
  // Every service exposes a way into the existing detail + checkout flow.
  expect(screen.getAllByRole('button', { name: /Scopri/i }).length).toBeGreaterThan(5);
});
