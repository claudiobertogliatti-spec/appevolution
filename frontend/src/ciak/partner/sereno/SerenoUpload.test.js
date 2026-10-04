import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const SerenoUpload = require('./SerenoUpload').default;

afterEach(cleanup);

const pdf = (size = 1024) => new File([new Uint8Array(size)], 'Fatture.pdf', { type: 'application/pdf' });
const pick = (file) => fireEvent.change(screen.getByTestId('sereno-file-input'), { target: { files: [file] } });

test('success: "Ricevuto" appears only after the server confirmed, and the page is told to reload', async () => {
  let finish;
  const upload = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
  const onUploaded = jest.fn();
  render(<SerenoUpload upload={upload} onUploaded={onUploaded} telegramUrl="https://t.me/x" />);

  pick(pdf());
  expect(await screen.findByText(/Sto caricando/)).toBeTruthy();
  expect(screen.queryByText(/Ricevuto/)).toBeNull(); // not yet
  expect(onUploaded).not.toHaveBeenCalled();

  finish({ ok: true });
  expect(await screen.findByText('✓ Ricevuto')).toBeTruthy();
  expect(onUploaded).toHaveBeenCalledTimes(1);
});

test('failure: never says "Ricevuto", says the file is safe, offers Retry and Telegram as fallback only', async () => {
  const upload = jest.fn().mockResolvedValueOnce({ ok: false, error: 'server' }).mockResolvedValueOnce({ ok: true });
  const onUploaded = jest.fn();
  render(<SerenoUpload upload={upload} onUploaded={onUploaded} telegramUrl="https://t.me/x" />);

  pick(pdf());
  expect(await screen.findByText(/Non l’hai perso/)).toBeTruthy();
  expect(screen.queryByText(/Ricevuto/)).toBeNull();
  expect(onUploaded).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: /Telegram/ }).getAttribute('href')).toBe('https://t.me/x');

  fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
  expect(await screen.findByText('✓ Ricevuto')).toBeTruthy();
  expect(upload).toHaveBeenCalledTimes(2);
});

test('expired session gets its own sentence', async () => {
  const upload = jest.fn().mockResolvedValue({ ok: false, error: 'auth' });
  render(<SerenoUpload upload={upload} />);
  pick(pdf());
  expect(await screen.findByText(/sessione è scaduta/)).toBeTruthy();
});

test('an oversized or empty file is refused before any request is made', async () => {
  const upload = jest.fn();
  render(<SerenoUpload upload={upload} />);
  pick(new File([''], 'vuoto.pdf'));
  expect(await screen.findByText(/è vuoto/)).toBeTruthy();
  const huge = new File(['x'], 'enorme.mp4');
  Object.defineProperty(huge, 'size', { value: 201 * 1024 * 1024 });
  pick(huge);
  expect(await screen.findByText(/supera i 200 MB/)).toBeTruthy();
  expect(upload).not.toHaveBeenCalled();
});

test('in supervision view the picker is not there and the reason is stated', () => {
  render(<SerenoUpload upload={jest.fn()} disabledReason="Vista supervisione: il caricamento è disattivato." />);
  expect(screen.getByText(/Vista supervisione/)).toBeTruthy();
  expect(screen.queryByTestId('sereno-file-input')).toBeNull();
  expect(screen.queryByRole('button', { name: /Scegli un file/ })).toBeNull();
});

test('the upload card never sends the partner to Telegram as the normal route', () => {
  render(<SerenoUpload upload={jest.fn()} telegramUrl="https://t.me/x" />);
  expect(screen.getByRole('button', { name: /Scegli un file/ })).toBeTruthy();
  expect(screen.queryByRole('link', { name: /Telegram/ })).toBeNull();
});

test('a file can be dropped on the area', async () => {
  const upload = jest.fn().mockResolvedValue({ ok: true });
  const { container } = render(<SerenoUpload upload={upload} />);
  fireEvent.drop(container.querySelector('.sereno-drop'), { dataTransfer: { files: [pdf()] } });
  await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
});
