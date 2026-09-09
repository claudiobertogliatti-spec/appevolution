import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractAccept from './ContractAccept';

afterEach(() => {
  delete global.fetch;
});

test('il CTA pagamento resta disabilitato finché non sono spuntati ENTRAMBI i checkbox', () => {
  const onConfirm = jest.fn();
  render(<ContractAccept onConfirm={onConfirm} />);
  const btn = screen.getByRole('button', { name: /paga|procedi/i });
  const [conditionsCheckbox, declarationCheckbox] = screen.getAllByRole('checkbox');
  expect(btn.disabled).toBe(true);

  // Solo il primo checkbox (condizioni) non basta.
  fireEvent.click(conditionsCheckbox);
  expect(btn.disabled).toBe(true);

  // Spuntando anche la dichiarazione imprenditoriale il bottone si abilita.
  fireEvent.click(declarationCheckbox);
  expect(btn.disabled).toBe(false);

  fireEvent.click(btn);
  expect(onConfirm).toHaveBeenCalled();
});

test('spuntare solo la dichiarazione imprenditoriale (senza le condizioni) lascia il CTA disabilitato', () => {
  render(<ContractAccept onConfirm={() => {}} />);
  const btn = screen.getByRole('button', { name: /paga|procedi/i });
  const [, declarationCheckbox] = screen.getAllByRole('checkbox');

  fireEvent.click(declarationCheckbox);
  expect(btn.disabled).toBe(true);
});

test('il testo della dichiarazione di finalità imprenditoriale è mostrato', () => {
  render(<ContractAccept onConfirm={() => {}} />);
  expect(screen.getByText(/fini imprenditoriali e non come consumatore/i)).toBeTruthy();
});

test('la Partita IVA è opzionale: si può confermare con entrambi i checkbox e campo vuoto', () => {
  const onConfirm = jest.fn();
  render(<ContractAccept onConfirm={onConfirm} />);
  const [conditionsCheckbox, declarationCheckbox] = screen.getAllByRole('checkbox');

  fireEvent.click(conditionsCheckbox);
  fireEvent.click(declarationCheckbox);
  const btn = screen.getByRole('button', { name: /paga|procedi/i });
  expect(btn.disabled).toBe(false);

  fireEvent.click(btn);
  expect(onConfirm).toHaveBeenCalledWith(
    expect.objectContaining({ dichiarazione_imprenditoriale: true, piva: '' }),
  );
});

test('la Partita IVA compilata viene passata a onConfirm', () => {
  const onConfirm = jest.fn();
  render(<ContractAccept onConfirm={onConfirm} />);
  const [conditionsCheckbox, declarationCheckbox] = screen.getAllByRole('checkbox');
  fireEvent.click(conditionsCheckbox);
  fireEvent.click(declarationCheckbox);

  fireEvent.change(screen.getByLabelText(/partita iva/i), { target: { value: 'IT12345678901' } });
  fireEvent.click(screen.getByRole('button', { name: /paga|procedi/i }));

  expect(onConfirm).toHaveBeenCalledWith(
    expect.objectContaining({ dichiarazione_imprenditoriale: true, piva: 'IT12345678901' }),
  );
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
