import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import SerenoAssistenza from './SerenoAssistenza';

afterEach(() => {
  cleanup();
  delete global.fetch;
});

function type(text) {
  fireEvent.change(screen.getByLabelText(/Scrivi all/i), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /Invia/i }));
}

test('a failed send keeps the text, never fabricates "preso in carico", offers the real fallback', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('network down')));
  render(<SerenoAssistenza partner={{ id: 'p1', name: 'Cosimo', telegram_group_url: 'https://t.me/ciak_cosimo' }} />);

  type('Come registro la masterclass?');

  // The partner's own message stays visible.
  await screen.findByText('Come registro la masterclass?');
  // Honest failure is surfaced.
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toMatch(/Messaggio non inviato/i);
  // No fabricated reassurance anywhere on screen.
  expect(screen.queryByText(/preso in carico/i)).toBeNull();
  // A real human fallback points to the partner's own channel.
  const links = screen.getAllByRole('link');
  expect(links.some((a) => a.getAttribute('href') === 'https://t.me/ciak_cosimo')).toBe(true);
});

test('a successful reply is shown and no failure alert appears', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ reply: 'Ecco come procedere.' }) })
  );
  render(<SerenoAssistenza partner={{ id: 'p1' }} />);

  type('Ciao');

  await screen.findByText('Ecco come procedere.');
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});
