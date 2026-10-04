import { render, screen } from '@testing-library/react';
import { DepartmentRoomIntro } from './DepartmentRoom';

jest.mock('../pages/LucaChat', () => ({ LucaChat: () => <div>Chat disponibile</div> }));
jest.mock('../pages/StefaniaAdmin', () => ({ StefaniaAdmin: () => <div>Chat delivery</div> }));

const room = { label: 'Delivery', agent: { name: 'Luca', role: 'Supporto', chat: 'luca' }, priorities: ['Rivedere materiali'], metrics: ['In revisione'] };

test('rimuovere il titolo duplicato mantiene supporto, priorità e indicatori', () => {
  render(<DepartmentRoomIntro room={room} showHeading={false} metricValues={{ 'In revisione': 3 }} />);
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  expect(screen.getByText('Chat disponibile')).toBeTruthy();
  expect(screen.getByText('Rivedere materiali')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
});

test('gli altri utilizzatori mantengono il titolo per default', () => {
  render(<DepartmentRoomIntro room={room} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Delivery' })).toBeTruthy();
});

test('come responsabili mostra solo gli agenti AI, anche se i dati portano ancora dei nomi di persona', () => {
  const stale = { ...room, agenti: ['Simona', 'Valentina'], persone: ['Nome Di Facciata'] };
  render(<DepartmentRoomIntro room={stale} />);
  expect(screen.getByText('Simona, Valentina')).toBeTruthy();
  expect(screen.queryByText(/Nome Di Facciata/)).toBeNull();
});

test('nei dati dei reparti non c\'e\' piu\' nessun elenco di persone', () => {
  // eslint-disable-next-line global-require
  const rooms = require('../departmentRooms');
  const all = Object.values(rooms.DEPARTMENT_ROOMS || rooms.default || {});
  expect(all.length).toBeGreaterThan(0);
  all.forEach((r) => expect(r).not.toHaveProperty('persone'));
});
