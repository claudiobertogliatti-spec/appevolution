import React from 'react';
import { render, screen } from '@testing-library/react';
import InsiderWelcome from './InsiderWelcome';

test('benvenuto col nome + Insider; niente player se manca il video', () => {
  render(<InsiderWelcome name="Marco Rossi" telegramUrl="https://t.me/x" />);
  expect(screen.getByText(/Marco/)).toBeTruthy();
  expect(screen.getByText(/Evolution Insider/i)).toBeTruthy();
  expect(screen.getByRole('link', { name: /telegram/i }).getAttribute('href')).toBe('https://t.me/x');
  expect(screen.queryByRole('button', { name: /play/i })).toBeNull();
});
