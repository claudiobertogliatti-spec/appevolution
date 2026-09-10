import { render, screen } from '@testing-library/react';
import { DepartmentRoomIntro } from './DepartmentRoom';

jest.mock('../pages/LucaChat', () => ({ LucaChat: () => <div>Chat disponibile</div> }));
jest.mock('../pages/StefaniaAdmin', () => ({ StefaniaAdmin: () => <div>Chat delivery</div> }));

const room = { label: 'Delivery', persone: ['Antonella'], agent: { name: 'Luca', role: 'Supporto', chat: 'luca' }, priorities: ['Rivedere materiali'], metrics: ['In revisione'] };

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
