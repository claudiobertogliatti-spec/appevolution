import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ContractAccept, { estraiClausole, validaDati } from './ContractAccept';

const CONTRATTO = [
  'Contratto di prova',
  '15.4 Dichiarazione di lettura e consapevolezza',
  '• di aver letto integralmente il presente Contratto;',
  '15.5 Approvazione specifica delle clausole',
  'Ai sensi degli articoli 1341 e 1342 del Codice Civile, il Partner approva:',
  '• Articolo 1.4 (Esclusiva);',
  '• Articolo 7.6 (Limitazioni di responsabilità);',
  '• Articolo 14.4 (Foro competente esclusivo di Torino).',
  '15.6 Chiusura del Contratto',
  'Le Parti dichiarano di aver negoziato il contratto.',
].join('\n');

const DATI = {
  Nome: 'Mario', Cognome: 'Bianchi', 'Codice fiscale': 'BNCMRA80A01L219X',
  'Indirizzo di residenza o sede': 'Via Roma 1', CAP: '10100', Città: 'Torino',
  Provincia: 'to', Email: 'mario@example.com',
};

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ contract_text: CONTRATTO }) }));
});

afterEach(() => {
  delete global.fetch;
});

const avanti = (nome) => screen.getByRole('button', { name: nome });

async function passo1(onConfirm = jest.fn(), onDati = jest.fn(async () => {})) {
  const { rerender } = render(<ContractAccept partnerId="p1" onDati={onDati} onConfirm={onConfirm} />);
  await screen.findByText(/Contratto di prova/);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(avanti(/avanti: i tuoi dati/i));
  return { onConfirm, onDati, rerender };
}

function compila(dati = DATI) {
  Object.entries(dati).forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
}

async function passo2(ctx) {
  compila();
  fireEvent.click(avanti(/avanti: le clausole/i));
  await screen.findByRole('heading', { name: /passo 3 di 4/i });
  return ctx;
}

// ── i quattro passi, in ordine ──────────────────────────────────────────────

test('mostra i quattro passi in ordine, con il primo attivo, prima del contratto', async () => {
  render(<ContractAccept partnerId="p1" onConfirm={() => {}} />);
  const passi = within(screen.getByRole('list', { name: /i passi per entrare/i })).getAllByRole('listitem');
  expect(passi.map((p) => p.textContent)).toEqual([
    '1Leggi il contratto', '2Inserisci i tuoi dati', '3Approva le clausole', '4Passa al pagamento',
  ]);
  expect(passi[0].getAttribute('aria-current')).toBe('step');
  expect(passi[1].getAttribute('aria-current')).toBeNull();
  // l'elenco dei passi sta SOPRA il contratto
  const contratto = screen.getByRole('region', { name: /testo del contratto/i });
  expect(passi[0].compareDocumentPosition(contratto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await screen.findByText(/Contratto di prova/);
});

test('il testo del contratto viene fetchato e mostrato per intero: niente link al JSON grezzo', async () => {
  render(<ContractAccept partnerId="p1" onConfirm={() => {}} />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/contract/text/p1'));
  expect(await screen.findByText(/Contratto di prova/)).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
});

// ── passo 1: leggi ──────────────────────────────────────────────────────────

test('passo 1: senza il flag di accettazione non si va avanti', async () => {
  render(<ContractAccept partnerId="p1" onConfirm={() => {}} />);
  await screen.findByText(/Contratto di prova/);
  expect(avanti(/avanti: i tuoi dati/i).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(avanti(/avanti: i tuoi dati/i).disabled).toBe(false);
});

test.each(['loading', 'failed', 'empty', 'missing-partner'])(
  'contratto %s: non si va avanti e il pagamento non esiste, neanche spuntando il flag',
  async (state) => {
    const onConfirm = jest.fn();
    global.fetch = jest.fn(() => state === 'loading'
      ? new Promise(() => {})
      : Promise.resolve({ ok: state !== 'failed', status: 500, json: async () => ({ contract_text: '  ' }) }));
    render(<ContractAccept partnerId={state === 'missing-partner' ? undefined : 'p1'} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('checkbox'));
    if (state === 'failed' || state === 'empty') await screen.findByText(/non è stato possibile/i);
    const btn = avanti(/avanti: i tuoi dati/i);
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(screen.queryByRole('button', { name: /paga e conferma/i })).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  },
);

// ── passo 2: dati ───────────────────────────────────────────────────────────

test('passo 2: dati mancanti o sbagliati sono segnalati campo per campo e non vengono inviati', async () => {
  const { onDati } = await passo1();
  fireEvent.click(avanti(/avanti: le clausole/i));
  expect(await screen.findByText('Inserisci il nome')).toBeTruthy();
  expect(screen.getByText('Inserisci il codice fiscale')).toBeTruthy();
  expect(onDati).not.toHaveBeenCalled();

  compila({ ...DATI, CAP: '12', Email: 'non-una-email', Provincia: 'TOR' });
  fireEvent.click(avanti(/avanti: le clausole/i));
  expect(await screen.findByText('Il CAP ha 5 cifre')).toBeTruthy();
  expect(screen.getByText("Controlla l'indirizzo email")).toBeTruthy();
  expect(screen.getByText(/sigla di 2 lettere/i)).toBeTruthy();
  expect(onDati).not.toHaveBeenCalled();
});

test('passo 2: PEC, ragione sociale e partita IVA sono facoltative', async () => {
  const { onDati } = await passo1();
  await passo2({ onDati });
  expect(onDati).toHaveBeenCalledWith(expect.objectContaining({ pec: '', nome_azienda: '', partita_iva: '' }));
});

test('passo 2: se il server rifiuta i dati si resta qui con il messaggio vero', async () => {
  const onDati = jest.fn(async () => { throw new Error('Il CAP deve avere 5 cifre'); });
  await passo1(jest.fn(), onDati);
  compila();
  fireEvent.click(avanti(/avanti: le clausole/i));
  expect((await screen.findByText('Il CAP deve avere 5 cifre')).getAttribute('role')).toBe('alert');
  expect(screen.getByRole('heading', { name: /passo 2 di 4/i })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: /passo 3 di 4/i })).toBeNull();
});

test('passo 2: "Indietro" torna al contratto e il flag di accettazione resta spuntato', async () => {
  await passo1();
  fireEvent.click(screen.getByRole('button', { name: /indietro/i }));
  expect(await screen.findByText(/Contratto di prova/)).toBeTruthy();
  expect(screen.getByRole('checkbox').checked).toBe(true);
});

// ── passo 3: clausole ───────────────────────────────────────────────────────

test('passo 3: mostra le clausole dell\'Art. 15.5 (solo quelle), Torino fisso e la data', async () => {
  const ctx = await passo1();
  await passo2(ctx);
  const elenco = screen.getByRole('list', { name: /clausole da approvare/i });
  expect(within(elenco).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
    'Articolo 1.4 (Esclusiva)',
    'Articolo 7.6 (Limitazioni di responsabilità)',
    'Articolo 14.4 (Foro competente esclusivo di Torino)',
  ]);
  expect(screen.getByText(/^Torino, \d{1,2} \S+ \d{4}$/)).toBeTruthy();
  // il luogo non e' un campo: il cliente non lo sceglie
  expect(screen.queryByLabelText(/luogo/i)).toBeNull();
  expect(screen.queryByRole('combobox')).toBeNull();
});

test('passo 3: servono ENTRAMBI i flag (approvazione specifica + dichiarazione imprenditoriale)', async () => {
  const ctx = await passo1();
  await passo2(ctx);
  const [specifica, dichiarazione] = screen.getAllByRole('checkbox');
  const btn = avanti(/avanti: il pagamento/i);
  expect(btn.disabled).toBe(true);
  fireEvent.click(specifica);
  expect(btn.disabled).toBe(true);
  fireEvent.click(specifica);
  fireEvent.click(dichiarazione);
  expect(btn.disabled).toBe(true);
  fireEvent.click(specifica);
  expect(btn.disabled).toBe(false);
});

test('passo 3: se l\'elenco delle clausole non si legge dal contratto, il pagamento resta bloccato', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ contract_text: 'Contratto di prova senza sezione' }) }));
  const ctx = await passo1();
  await passo2(ctx);
  expect((await screen.findByRole('alert')).textContent).toMatch(/elenco delle clausole/i);
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box));
  expect(avanti(/avanti: il pagamento/i).disabled).toBe(true);
});

// ── passo 4: pagamento ──────────────────────────────────────────────────────

async function finoAlPagamento(onConfirm = jest.fn()) {
  const ctx = await passo1(onConfirm);
  await passo2(ctx);
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box));
  fireEvent.click(avanti(/avanti: il pagamento/i));
  await screen.findByRole('heading', { name: /passo 4 di 4/i });
  return ctx;
}

test('il pagamento si raggiunge solo dopo i quattro passi e invia i consensi veri', async () => {
  const onConfirm = jest.fn();
  await finoAlPagamento(onConfirm);
  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.getByText('Mario Bianchi')).toBeTruthy();
  expect(screen.getByText('BNCMRA80A01L219X')).toBeTruthy();
  expect(screen.getByText(/Torino \(TO\)/)).toBeTruthy(); // provincia normalizzata in maiuscolo
  fireEvent.click(screen.getByRole('button', { name: /paga e conferma la partnership/i }));
  expect(onConfirm).toHaveBeenCalledWith({
    consenso_contratto: true,
    approvazione_specifica_clausole: true,
    dichiarazione_imprenditoriale: true,
    piva: '',
  });
});

test('la partita IVA inserita ai dati arriva al pagamento', async () => {
  const onConfirm = jest.fn();
  const ctx = await passo1(onConfirm);
  compila({ ...DATI, "Partita IVA (se ce l'hai)": 'IT12345678901' });
  fireEvent.click(avanti(/avanti: le clausole/i));
  await screen.findByRole('heading', { name: /passo 3 di 4/i });
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box));
  fireEvent.click(avanti(/avanti: il pagamento/i));
  fireEvent.click(await screen.findByRole('button', { name: /paga e conferma/i }));
  expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ piva: 'IT12345678901' }));
  expect(ctx.onDati).toHaveBeenCalledTimes(1);
});

test('"disabled" (pagamento in corso) spegne il bottone finale', async () => {
  const onConfirm = jest.fn();
  const { rerender } = render(<ContractAccept partnerId="p1" onDati={async () => {}} onConfirm={onConfirm} />);
  await screen.findByText(/Contratto di prova/);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(avanti(/avanti: i tuoi dati/i));
  compila();
  fireEvent.click(avanti(/avanti: le clausole/i));
  await screen.findByRole('heading', { name: /passo 3 di 4/i });
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box));
  fireEvent.click(avanti(/avanti: il pagamento/i));
  rerender(<ContractAccept partnerId="p1" onDati={async () => {}} onConfirm={onConfirm} disabled />);
  const pay = await screen.findByRole('button', { name: /paga e conferma/i });
  expect(pay.disabled).toBe(true);
  fireEvent.click(pay);
  expect(onConfirm).not.toHaveBeenCalled();
});

test('cambiando partner si riparte dal passo 1: consensi, dati e contratto precedenti non valgono', async () => {
  const { rerender, onConfirm } = await finoAlPagamento();
  global.fetch = jest.fn(() => new Promise(() => {}));
  rerender(<ContractAccept partnerId="p2" onConfirm={onConfirm} />);
  expect(screen.getByRole('heading', { name: /passo 1 di 4/i })).toBeTruthy();
  expect(screen.queryByText(/Contratto di prova/)).toBeNull();
  expect(screen.queryByRole('button', { name: /paga e conferma/i })).toBeNull();
  expect(screen.getAllByRole('checkbox').every((box) => !box.checked)).toBe(true);
});

// ── funzioni pure ───────────────────────────────────────────────────────────

test('estraiClausole legge solo l\'Art. 15.5 e si ferma al 15.6', () => {
  expect(estraiClausole(CONTRATTO)).toHaveLength(3);
  expect(estraiClausole('niente')).toEqual([]);
  expect(estraiClausole(undefined)).toEqual([]);
});

test('validaDati: stessi formati del server', () => {
  expect(validaDati({ ...Object.fromEntries(Object.entries({
    nome: 'M', cognome: 'B', codice_fiscale: 'bncmra80a01l219x', indirizzo: 'v', cap: '10100',
    citta: 'T', provincia: 'to', email: 'a@b.it',
  })) })).toEqual({});
  expect(Object.keys(validaDati({}))).toEqual(
    ['nome', 'cognome', 'codice_fiscale', 'indirizzo', 'cap', 'citta', 'provincia', 'email'],
  );
  expect(validaDati({ nome: 'M', cognome: 'B', codice_fiscale: '12345678901', indirizzo: 'v', cap: '10100', citta: 'T', provincia: 'TO', email: 'a@b.it', partita_iva: '123' }).partita_iva)
    .toMatch(/11 cifre/);
});
