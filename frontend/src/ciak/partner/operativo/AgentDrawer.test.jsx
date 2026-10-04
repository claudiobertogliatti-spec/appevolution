import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const AgentDrawer = require('./AgentDrawer').default;

window.HTMLElement.prototype.scrollIntoView = jest.fn();
afterEach(() => { cleanup(); delete global.fetch; });

const step = { step_id: '04-posizionamento', step_number: 6, label: 'Posizionamento' };
const open = () => render(<AgentDrawer open onClose={() => {}} partnerId="p1" currentStep={step} />);
const write = (t) => {
  fireEvent.change(screen.getByPlaceholderText(/Scrivi a/), { target: { value: t } });
  fireEvent.click(screen.getByRole('button', { name: 'Invia' }));
};

test('a failed send never prints a technical error as the assistant: it keeps the text, offers Retry and Telegram', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Ecco la risposta.' }) });
  open();
  write('Non capisco il prezzo');
  expect(await screen.findByText(/Messaggio non inviato/)).toBeTruthy();
  expect(screen.queryByText(/Errore:/)).toBeNull();
  expect(screen.queryByText(/HTTP 500/)).toBeNull();
  expect(screen.getByRole('link', { name: /Telegram/ }).getAttribute('href')).toBe('https://t.me/ciak_partner_support');
  expect(screen.getAllByText('Non capisco il prezzo')).toHaveLength(1); // the text is kept, not duplicated

  fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
  expect(await screen.findByText('Ecco la risposta.')).toBeTruthy();
  expect(screen.queryByText(/Messaggio non inviato/)).toBeNull();
  expect(screen.getAllByText('Non capisco il prezzo')).toHaveLength(1); // retry does not add a second copy
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
});

test('a network error behaves the same way', async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  open();
  write('Ciao');
  expect(await screen.findByText(/Messaggio non inviato/)).toBeTruthy();
  expect(screen.queryByText(/Failed to fetch/)).toBeNull();
});
