import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import FunnelBozza, { costruisciSegnalazione } from './FunnelBozza';

afterEach(() => { cleanup(); jest.resetAllMocks(); });
const resp = (ok, body) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
const PAGES = [{ id: 'optin', title: 'Iscrizione alla masterclass', descr: 'Dove lasciano l’email', url: 'https://x.vercel.app/', state: 'da_controllare', open_corrections: 0 }];

test('prima del rilascio: in Esamina dice che il team sta preparando; fuori da Esamina non compare', async () => {
  global.fetch = jest.fn(() => resp(true, { released: false, pages: [] }));
  const { unmount } = render(<FunnelBozza partnerId="p1" macroPhase="esamina" />);
  expect(await screen.findByText(/sta preparando le pagine/)).toBeTruthy();
  unmount();
  const { container } = render(<FunnelBozza partnerId="p1" macroPhase="valida" />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(container.textContent).toBe('');
});

test('dopo il rilascio: link alla bozza, nessun «Va bene» né modifica del testo, segnalazione inviata come errore', async () => {
  global.fetch = jest.fn()
    .mockImplementationOnce(() => resp(true, { released: true, pages: PAGES }))
    .mockImplementationOnce(() => resp(true, { released: true, pages: [{ ...PAGES[0], open_corrections: 1 }] }));
  render(<FunnelBozza partnerId="p1" macroPhase="esamina" />);
  const link = await screen.findByRole('link', { name: /Apri la bozza/ });
  expect(link.getAttribute('href')).toBe('https://x.vercel.app/');
  expect(link.getAttribute('rel')).toContain('noopener');
  expect(screen.queryByRole('button', { name: /Va bene|Approva|Modifica/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Segnala un errore' }));
  const invia = screen.getByRole('button', { name: 'Invia la segnalazione' });
  expect(invia.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Dove e com/), { target: { value: 'Titolo: dice 90 giorni' } });
  fireEvent.change(screen.getByLabelText('Come dovrebbe essere'), { target: { value: '60 giorni' } });
  fireEvent.click(invia);
  await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Segnalazione inviata/));
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/funnel-review\/p1\/correction$/);
  expect(JSON.parse(opts.body)).toEqual({ page_id: 'optin', wrong: 'Un termine inesatto: Titolo: dice 90 giorni', right: '60 giorni' });
});

test('la segnalazione non supera i 200 caratteri del server', () => {
  expect(costruisciSegnalazione('foto', 'x'.repeat(500)).length).toBe(200);
});

test('errore del server: messaggio e nessun invio riuscito', async () => {
  global.fetch = jest.fn()
    .mockImplementationOnce(() => resp(true, { released: true, pages: PAGES }))
    .mockImplementationOnce(() => resp(false, { detail: 'Il funnel non è ancora pronto da guardare.' }));
  render(<FunnelBozza partnerId="p1" macroPhase="esamina" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Segnala un errore' }));
  fireEvent.change(screen.getByLabelText(/Dove e com/), { target: { value: 'abc' } });
  fireEvent.change(screen.getByLabelText('Come dovrebbe essere'), { target: { value: 'def' } });
  fireEvent.click(screen.getByRole('button', { name: 'Invia la segnalazione' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/non è ancora pronto/);
});
