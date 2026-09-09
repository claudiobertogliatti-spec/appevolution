import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractAccept from './ContractAccept';

afterEach(() => {
  delete global.fetch;
});

test('il CTA pagamento è disabilitato finché il checkbox non è spuntato', () => {
  const onConfirm = jest.fn();
  render(<ContractAccept onConfirm={onConfirm} />);
  const btn = screen.getByRole('button', { name: /paga|procedi/i });
  expect(btn.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(btn.disabled).toBe(false);
  fireEvent.click(btn);
  expect(onConfirm).toHaveBeenCalled();
});

test('il testo del contratto viene fetchato e mostrato per intero: niente link al JSON grezzo', async () => {
  global.fetch = jest.fn((url) => {
    expect(url).toBe('/api/contract/text/p1');
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ contract_text: 'CLAUSOLA X: il partner si impegna a...' }),
    });
  });

  render(<ContractAccept partnerId="p1" onConfirm={() => {}} />);

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/contract/text/p1'));
  expect(await screen.findByText(/CLAUSOLA X/)).toBeTruthy();
  // il prospect legge il testo vero, non un link che apre il JSON grezzo dell'endpoint
  expect(screen.queryByRole('link')).toBeNull();
});
