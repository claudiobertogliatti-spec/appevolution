import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContractAccept from './ContractAccept';

test('il CTA pagamento è disabilitato finché il checkbox non è spuntato', () => {
  const onConfirm = jest.fn();
  render(<ContractAccept contractUrl="/c.pdf" onConfirm={onConfirm} />);
  const btn = screen.getByRole('button', { name: /paga|procedi/i });
  expect(btn.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(btn.disabled).toBe(false);
  fireEvent.click(btn);
  expect(onConfirm).toHaveBeenCalled();
});

test('il link al contratto è presente', () => {
  render(<ContractAccept contractUrl="/c.pdf" onConfirm={() => {}} />);
  expect(screen.getByRole('link', { name: /contratto|condizioni/i }).getAttribute('href')).toBe('/c.pdf');
});
