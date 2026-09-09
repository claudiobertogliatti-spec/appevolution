import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SerenoAssistenza from './SerenoAssistenza';

const AGENTS = [
  { id: 'STEFANIA', name: 'Simona', role: 'Coordinatrice', focus: 'Orientamento' },
  { id: 'VALENTINA', name: 'Valentina', role: 'Brand', focus: 'Identità' },
];
const TEAM = [{ id: 'CLAUDIO', name: 'Claudio B.', role: 'CEO', description: 'Direzione' }];

afterEach(() => {
  cleanup();
  delete global.fetch;
});

function openChatWith(name) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Chatta con ${name}`, 'i') }));
}

test('shows the full AI roster and the human team', () => {
  render(<SerenoAssistenza agents={AGENTS} team={TEAM} />);
  expect(screen.getByText('Simona')).toBeTruthy();
  expect(screen.getByText('Valentina')).toBeTruthy();
  expect(screen.getByText('Claudio B.')).toBeTruthy();
});

test('a failed chat send never fabricates "preso in carico" and offers the real fallback', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('down')));
  render(<SerenoAssistenza agents={AGENTS} team={TEAM} telegramUrl="https://t.me/ciak_cosimo" />);

  openChatWith('Simona');
  fireEvent.change(screen.getByLabelText(/Scrivi a Simona/i), { target: { value: 'Come registro?' } });
  fireEvent.click(screen.getByRole('button', { name: /^Invia$/i }));

  await screen.findByText('Come registro?');
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toMatch(/Messaggio non inviato/i);
  expect(screen.queryByText(/preso in carico/i)).toBeNull();
  const links = screen.getAllByRole('link');
  expect(links.some((a) => a.getAttribute('href') === 'https://t.me/ciak_cosimo')).toBe(true);
});

test('a successful reply is shown with no failure alert', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ reply: 'Ecco come procedere.' }) })
  );
  render(<SerenoAssistenza agents={AGENTS} team={TEAM} />);

  openChatWith('Valentina');
  fireEvent.change(screen.getByLabelText(/Scrivi a Valentina/i), { target: { value: 'Ciao' } });
  fireEvent.click(screen.getByRole('button', { name: /^Invia$/i }));

  await screen.findByText('Ecco come procedere.');
  expect(screen.queryByRole('alert')).toBeNull();
});
