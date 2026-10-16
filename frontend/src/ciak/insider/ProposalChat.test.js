import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ProposalChat from './ProposalChat';

const enc = new TextEncoder();
const ev = (o) => `data: ${JSON.stringify(o)}\n\n`;

function sseResponse(events) {
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: { getReader: () => ({ read: async () => (i < events.length ? { value: enc.encode(ev(events[i++])), done: false } : { done: true }) }) },
  };
}

function Harness({ initialOpen = true }) {
  const [open, setOpen] = React.useState(initialOpen);
  return <ProposalChat token="tok" name="Marta Ferri" open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} />;
}

afterEach(() => { delete global.fetch; });

test('chiusa: solo il pulsante "Ho una domanda"; aperta: saluto onesto (assistente AI + mail del team)', () => {
  render(<Harness initialOpen={false} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /ho una domanda/i }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/Ciao Marta/)).toBeTruthy();
  expect(within(dialog).getAllByText(/assistente AI/i).length).toBeGreaterThanOrEqual(2); // testata + saluto
  expect(within(dialog).getByText(/assistenza@evolution-pro\.it/)).toBeTruthy();
});

test('le domande suggerite includono quelle scomode (rimborso, rate, royalty)', () => {
  render(<Harness />);
  expect(screen.getByRole('button', { name: /posso avere un rimborso/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /non riesco a pagare una rata/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /royalty del 10%/i })).toBeTruthy();
});

test('invia la domanda, mostra la risposta a pezzi e manda la storia al turno dopo', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(sseResponse([{ t: 'Una volta partiti ' }, { t: 'non è rimborsabile (Art. 5.7).' }, { done: true }]))
    .mockResolvedValueOnce(sseResponse([{ t: 'Certo.' }, { done: true }]));
  render(<Harness />);

  fireEvent.click(screen.getByRole('button', { name: /posso avere un rimborso/i }));
  expect(await screen.findByText(/non è rimborsabile \(Art\. 5\.7\)\./)).toBeTruthy();
  const [url, opts] = global.fetch.mock.calls[0];
  expect(url).toBe('/api/proposta/tok/chat');
  expect(JSON.parse(opts.body)).toEqual({ message: 'Posso avere un rimborso?', history: [] });
  // i suggerimenti spariscono dopo la prima domanda
  expect(screen.queryByRole('button', { name: /royalty del 10%/i })).toBeNull();

  fireEvent.change(screen.getByLabelText(/scrivi la tua domanda/i), { target: { value: 'Ok, grazie' } });
  fireEvent.click(screen.getByRole('button', { name: /^invia$/i }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  const second = JSON.parse(global.fetch.mock.calls[1][1].body);
  expect(second.message).toBe('Ok, grazie');
  expect(second.history).toEqual([
    { role: 'user', content: 'Posso avere un rimborso?' },
    { role: 'assistant', content: 'Una volta partiti non è rimborsabile (Art. 5.7).' },
  ]);
});

test('errore del server → messaggio onesto con la mail, mai una risposta inventata', async () => {
  global.fetch = jest.fn().mockResolvedValue(sseResponse([{ error: 'In questo momento non riesco a risponderti. Scrivi a assistenza@evolution-pro.it' }]));
  render(<Harness />);
  fireEvent.change(screen.getByLabelText(/scrivi la tua domanda/i), { target: { value: 'ciao' } });
  fireEvent.click(screen.getByRole('button', { name: /^invia$/i }));
  const msgs = await screen.findAllByText(/non riesco a risponderti/i);
  expect(msgs.length).toBeGreaterThan(0);
});

test('Invio manda il messaggio, Maiusc+Invio no; Escape chiude', async () => {
  global.fetch = jest.fn().mockResolvedValue(sseResponse([{ t: 'ok' }, { done: true }]));
  render(<Harness />);
  const box = screen.getByLabelText(/scrivi la tua domanda/i);
  fireEvent.change(box, { target: { value: 'ciao' } });
  fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.keyDown(box, { key: 'Enter' });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('il testo della risposta è testo semplice: niente HTML eseguito', async () => {
  global.fetch = jest.fn().mockResolvedValue(sseResponse([{ t: '<img src=x onerror="alert(1)">ciao' }, { done: true }]));
  const { container } = render(<Harness />);
  fireEvent.change(screen.getByLabelText(/scrivi la tua domanda/i), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: /^invia$/i }));
  await screen.findByText(/ciao/);
  expect(container.querySelector('img')).toBeNull();
});
