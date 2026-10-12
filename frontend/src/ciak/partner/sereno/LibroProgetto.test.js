import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import LibroProgetto, { libroModel } from './LibroProgetto';

afterEach(cleanup);
const st = (finale) => ({ steps: [
  { step_id: 'la-tua-storia', macro_phase: 'esamina', step_number: 5, status: 'done' },
  { step_id: '04-posizionamento', macro_phase: 'esamina', step_number: 7, status: 'pending' },
  { step_id: '19-workbook-finale', macro_phase: 'valida', step_number: 19, status: finale },
] });

test('avanzamento per tappa e nessun download prima del lancio', () => {
  render(<LibroProgetto state={st('pending')} partnerId="p1" />);
  expect(screen.getByText(/Te lo consegniamo a lancio avvenuto/)).toBeTruthy();
  expect(screen.getByText('1 di 2 passaggi')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Scarica/ })).toBeNull();
});

test('a lancio avvenuto (passo 19 completato) compare il download', () => {
  expect(libroModel(st('done')).consegnato).toBe(true);
  render(<LibroProgetto state={st('done')} partnerId="p1" />);
  expect(screen.getByRole('button', { name: /Scarica il PDF/ })).toBeTruthy();
});
