import React from 'react';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
jest.mock('../operativo/hooks/useJourneyState', () => ({ useJourneyState: () => ({ state: null, loading: true }) }));
const { MemoryRouter } = require('react-router-dom');
const SerenoShell = require('./SerenoShell').default;
const SerenoHome = require('./SerenoHome').default;

afterEach(cleanup);
const wrap = (ui, props = {}) => render(
  <MemoryRouter><SerenoShell user={{ name: 'Giulia' }} partnerId="p1" onLogout={() => {}} {...props}>{ui}</SerenoShell></MemoryRouter>,
);

test('on a phone the four main places are in a bottom bar; the rest is under "Altro"', () => {
  wrap(<p>pagina</p>);
  const bar = screen.getByRole('navigation', { name: 'Navigazione rapida' });
  ['Oggi', 'Percorso', 'Materiali', 'Assistenza'].forEach((l) => expect(within(bar).getByRole('link', { name: l })).toBeTruthy());
  expect(document.getElementById('sereno-more')).toBeNull(); // closed until asked for
  fireEvent.click(within(bar).getByRole('button', { name: 'Altro' }));
  const more = document.getElementById('sereno-more');
  expect(within(more).getByText('Servizi aggiuntivi')).toBeTruthy();
  expect(within(more).getByText('Il tuo piano')).toBeTruthy();
  expect(within(more).getByText('Account e password')).toBeTruthy();
  expect(within(more).getByRole('button', { name: 'Esci' })).toBeTruthy();
  fireEvent.click(within(bar).getByRole('button', { name: 'Altro' }));
  expect(document.getElementById('sereno-more')).toBeNull(); // and closes again
});

test('the desktop sidebar keeps every link, and the help button is on every page', () => {
  wrap(<p>pagina</p>);
  const side = screen.getByRole('navigation', { name: 'Area partner' });
  ['Oggi', 'Il percorso', 'I tuoi materiali', 'Assistenza'].forEach((l) => expect(within(side).getByRole('link', { name: l })).toBeTruthy());
  expect(screen.getByRole('button', { name: /Chiedi aiuto/ })).toBeTruthy();
});

test('"Ho un dubbio su questo passaggio" on Oggi opens the help sheet; progress is shown', () => {
  const step = { step_id: '12-prezzo-webinar', label: 'Prezzo e diretta', status: 'in_progress', macro_phase: 'valida' };
  const done = { step_id: 'la-tua-storia', label: 'Storia', status: 'done', macro_phase: 'esamina' };
  wrap(<SerenoHome state={{ steps: [done, step], current_step: step }} partnerName="Giulia Bianchi" onOpenStep={() => {}} />);
  expect(screen.getByText('1 di 2 passaggi completati')).toBeTruthy();
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
  expect(screen.getByText('Quanto vendi e come lo presenti.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ho un dubbio su questo passaggio' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
});

test('supervision label is shown and the chat inside is off', () => {
  wrap(<p>pagina</p>, { adminViewLabel: 'Andrea Fredi' });
  expect(screen.getByText(/Supervisione · Andrea Fredi/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Chiedi aiuto/ }));
  expect(screen.getByLabelText('La tua domanda').disabled).toBe(true);
});
