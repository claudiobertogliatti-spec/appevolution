import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
const StepBurocrazia = require('./StepBurocrazia').default;

// Contratto e distinta si caricano nel passo F-2: F-3 chiedeva di caricarli di nuovo
// e restava bloccato per chi aveva già F-2 completato (es. Andrea Fredi).
const DATI = {
  nome: 'Mario', cognome: 'Rossi', email: 'mario@example.com', telefono: '3331234567',
  indirizzo: 'Via Roma 1', codice_fiscale: 'RSSMRA80A01H501U', iban: 'IT60X0542811101000000123456',
};
const step = (data) => ({ step_id: 'burocrazia', macro_phase: 'esamina', data });

beforeEach(() => { global.fetch = jest.fn(() => Promise.resolve({ ok: false })); });
afterEach(() => { cleanup(); delete global.fetch; jest.clearAllMocks(); });

const cta = () => screen.getByRole('button', { name: /Fatto, avanti/i });

test('con i campi obbligatori compilati si può proseguire anche senza contratto e distinta', () => {
  render(<StepBurocrazia step={step(DATI)} partnerId="p1" onComplete={() => {}} onSaveDraft={() => {}} />);
  expect(cta().disabled).toBe(false);
});

test('senza i campi obbligatori il pulsante resta bloccato', () => {
  render(<StepBurocrazia step={step({ nome: 'Mario' })} partnerId="p1" onComplete={() => {}} onSaveDraft={() => {}} />);
  expect(cta().disabled).toBe(true);
  expect(screen.getByText(/completa i campi con/i)).toBeTruthy();
});

test('a passo completato i dati restano modificabili e si salvano con i valori nuovi', () => {
  const onComplete = jest.fn();
  render(<StepBurocrazia step={{ ...step(DATI), status: 'done' }} partnerId="p1" onComplete={onComplete} onSaveDraft={() => {}} />);
  expect(screen.getByText(/già salvati/i)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Fatto, avanti/i })).toBeNull();

  const indirizzo = screen.getByDisplayValue('Via Roma 1');
  fireEvent.change(indirizzo, { target: { value: 'Via Milano 5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salva le modifiche' }));

  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(onComplete.mock.calls[0][0].indirizzo).toBe('Via Milano 5');
  expect(onComplete.mock.calls[0][0].iban).toBe(DATI.iban);
});

test('a passo completato, svuotare un campo obbligatorio blocca il salvataggio', () => {
  render(<StepBurocrazia step={{ ...step(DATI), status: 'done' }} partnerId="p1" onComplete={() => {}} onSaveDraft={() => {}} />);
  fireEvent.change(screen.getByDisplayValue('Via Roma 1'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Salva le modifiche' }).disabled).toBe(true);
});

test('un passo segnato "fatto" ma senza dati resta un form da compilare, non "già salvato"', () => {
  render(<StepBurocrazia step={{ ...step({}), status: 'done' }} partnerId="p1" onComplete={() => {}} onSaveDraft={() => {}} />);
  expect(screen.queryByText(/già salvati/i)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Salva le modifiche' })).toBeNull();
  expect(cta().disabled).toBe(true);
  expect(screen.getByText(/completa i campi con/i)).toBeTruthy();
});

test('il passo non chiede più di caricare contratto e distinta', () => {
  const { container } = render(<StepBurocrazia step={step(DATI)} partnerId="p1" onComplete={() => {}} onSaveDraft={() => {}} />);
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(screen.queryByText(/Contratto firmato/i)).toBeNull();
  expect(screen.queryByText(/Distinta di pagamento/i)).toBeNull();
});
