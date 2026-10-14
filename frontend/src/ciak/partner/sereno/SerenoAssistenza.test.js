import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SerenoAssistenza from './SerenoAssistenza';
import { HelpContext } from './SerenoHelp';

afterEach(cleanup);

const vista = (props = {}, openHelp = () => {}) =>
  render(
    <MemoryRouter>
      <HelpContext.Provider value={{ openHelp }}>
        <SerenoAssistenza {...props} />
      </HelpContext.Provider>
    </MemoryRouter>
  );

test('non mostra più i sei assistenti AI né il roster del team', () => {
  vista();
  ['Simona', 'Valentina', 'Gaia', 'Marco', 'Carlo', 'Claudio B.'].forEach((n) =>
    expect(screen.queryByText(n)).toBeNull()
  );
  expect(screen.queryByText(/Chatta con/i)).toBeNull();
});

test('la chat è una sola: il pulsante apre quella di Chiedi aiuto', () => {
  const openHelp = jest.fn();
  vista({}, openHelp);
  fireEvent.click(screen.getByRole('button', { name: /Apri la chat/i }));
  expect(openHelp).toHaveBeenCalledTimes(1);
});

test('il team umano è su Telegram, con il canale del partner', () => {
  vista({ telegramUrl: 'https://t.me/ciak_cosimo' });
  const link = screen.getByRole('link', { name: /Apri Telegram/i });
  expect(link.getAttribute('href')).toBe('https://t.me/ciak_cosimo');
});

test('le tre tappe rimandano ai Materiali, senza contenuti inventati', () => {
  vista();
  ['Esamina', 'Valida', 'Ottimizza'].forEach((t) => expect(screen.getByText(t)).toBeTruthy());
  const link = screen.getByRole('link', { name: /Vai ai Materiali/i });
  expect(link.getAttribute('href')).toBe('/partner/materiali');
});
