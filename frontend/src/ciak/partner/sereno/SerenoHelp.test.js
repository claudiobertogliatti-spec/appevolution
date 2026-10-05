import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

jest.mock('../operativo/hooks/useJourneyState', () => ({ useJourneyState: jest.fn() }));
const { useJourneyState } = require('../operativo/hooks/useJourneyState');
const SerenoHelp = require('./SerenoHelp').default;
const { useHelp } = require('./SerenoHelp');

const current = { step_id: '12-prezzo-webinar', label: 'Prezzo e diretta', fase_legacy: 'F5' };
beforeEach(() => { useJourneyState.mockReturnValue({ state: { current_step: current }, loading: false }); });
afterEach(() => { cleanup(); delete global.fetch; jest.clearAllMocks(); });

const open = (props = {}) => {
  render(<SerenoHelp partnerId="p1" partnerName="Giulia Bianchi" {...props}><p>pagina</p></SerenoHelp>);
  fireEvent.click(screen.getByRole('button', { name: /Chiedi aiuto/ }));
};
const write = (t) => {
  fireEvent.change(screen.getByLabelText('La tua domanda'), { target: { value: t } });
  fireEvent.click(screen.getByRole('button', { name: 'Invia' }));
};

test('the help button is on the page; opening it shows the current step and says it is an AI assistant', () => {
  open();
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByText('Il tuo prossimo passo: Prezzo e diretta')).toBeTruthy();
  expect(screen.getByText(/Assistente AI/)).toBeTruthy();
  expect(screen.getByText(/Ciao, Giulia!/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Chiedi aiuto/ })).toBeNull(); // the sheet replaces it
});

test('a message goes to the real chat endpoint with partner id, phase and agent', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ reply: 'Ti spiego il prezzo.' }) });
  open();
  write('Non capisco il prezzo');
  expect(await screen.findByText('Ti spiego il prezzo.')).toBeTruthy();
  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toBe('/api/stefania/chat');
  const body = JSON.parse(init.body);
  expect(body).toMatchObject({ partner_id: 'p1', message: 'Non capisco il prezzo', partner_phase: 'F5' });
  expect(typeof body.target_agent).toBe('string');
});

test('a failed send keeps the text, never shows a technical error, and Retry works without duplicating the message', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Eccomi.' }) });
  open();
  write('Aiuto');
  expect(await screen.findByText(/Messaggio non inviato/)).toBeTruthy();
  expect(screen.queryByText(/HTTP 500|Errore:/)).toBeNull();
  expect(screen.getByRole('link', { name: /Telegram/ }).getAttribute('href')).toBe('https://t.me/ciak_partner_support');
  fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
  expect(await screen.findByText('Eccomi.')).toBeTruthy();
  expect(screen.getAllByText('Aiuto')).toHaveLength(1);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
});

test('in supervision view the chat is switched off: nothing can be sent as the partner', () => {
  global.fetch = jest.fn();
  open({ supervision: true });
  expect(screen.getByText(/Vista supervisione/)).toBeTruthy();
  expect(screen.getByLabelText('La tua domanda').disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Invia' }).disabled).toBe(true);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('Escape closes the sheet and the button comes back', () => {
  open();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: /Chiedi aiuto/ })).toBeTruthy();
});

test('any page can open it through useHelp (used by "Ho un dubbio su questo passaggio")', () => {
  function Caller() { const { openHelp } = useHelp(); return <button onClick={openHelp}>Ho un dubbio</button>; }
  render(<SerenoHelp partnerId="p1"><Caller /></SerenoHelp>);
  fireEvent.click(screen.getByRole('button', { name: 'Ho un dubbio' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
});
