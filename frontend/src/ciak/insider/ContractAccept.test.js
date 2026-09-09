import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractAccept from './ContractAccept';

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ contract_text: 'Contratto di prova' }) }));
});

afterEach(() => {
  delete global.fetch;
});

test.each(['loading', 'failed', 'empty', 'missing-partner'])('pagamento bloccato con contratto %s anche dopo entrambi i consensi', async (state) => {
  const onConfirm = jest.fn();
  global.fetch = jest.fn(() => state === 'loading'
    ? new Promise(() => {})
    : Promise.resolve({ ok: state !== 'failed', status: 500, json: async () => ({ contract_text: '  ' }) }));
  render(<ContractAccept partnerId={state === 'missing-partner' ? undefined : 'p1'} onConfirm={onConfirm} />);
  const boxes = screen.getAllByRole('checkbox');
  boxes.forEach((box) => fireEvent.click(box));
  if (state === 'failed' || state === 'empty') await screen.findByText(/non è stato possibile/i);
  const button = screen.getByRole('button', { name: /paga e conferma/i });
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(onConfirm).not.toHaveBeenCalled();
});

test('il CTA pagamento resta disabilitato finché non sono spuntati ENTRAMBI i checkbox', async () => {
  const onConfirm = jest.fn();
  render(<ContractAccept partnerId="p1" onConfirm={onConfirm} />);
  await screen.findByText('Contratto di prova');
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

test('spuntare solo la dichiarazione imprenditoriale (senza le condizioni) lascia il CTA disabilitato', async () => {
  render(<ContractAccept partnerId="p1" onConfirm={() => {}} />);
  await screen.findByText('Contratto di prova');
  const btn = screen.getByRole('button', { name: /paga|procedi/i });
  const [, declarationCheckbox] = screen.getAllByRole('checkbox');

  fireEvent.click(declarationCheckbox);
  expect(btn.disabled).toBe(true);
});

test('il testo della dichiarazione di finalità imprenditoriale è mostrato', () => {
  render(<ContractAccept onConfirm={() => {}} />);
  expect(screen.getByText(/fini imprenditoriali e non come consumatore/i)).toBeTruthy();
});

test('la Partita IVA è opzionale: si può confermare con entrambi i checkbox e campo vuoto', async () => {
  const onConfirm = jest.fn();
  render(<ContractAccept partnerId="p1" onConfirm={onConfirm} />);
  await screen.findByText('Contratto di prova');
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

test('la Partita IVA compilata viene passata a onConfirm', async () => {
  const onConfirm = jest.fn();
  render(<ContractAccept partnerId="p1" onConfirm={onConfirm} />);
  await screen.findByText('Contratto di prova');
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

test('cambiando partner i consensi e il contratto precedente non autorizzano il pagamento', async () => {
  const onConfirm = jest.fn();
  const { rerender } = render(<ContractAccept partnerId="p1" onConfirm={onConfirm} />);
  await screen.findByText('Contratto di prova');
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box));
  expect(screen.getByRole('button').disabled).toBe(false);
  global.fetch = jest.fn(() => new Promise(() => {}));
  rerender(<ContractAccept partnerId="p2" onConfirm={onConfirm} />);
  expect(screen.getByRole('button').disabled).toBe(true);
  expect(screen.queryByText('Contratto di prova')).toBeNull();
  expect(screen.getAllByRole('checkbox').every((box) => !box.checked)).toBe(true);
});
