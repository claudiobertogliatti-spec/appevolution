import { streamChat, parseSseBlock, ChatError, FALLBACK_ERROR } from './chatStream';

const enc = new TextEncoder();

/** Risposta con un vero reader a pezzi, tagliati dove capita (anche a metà di un evento). */
function streamingResponse(chunks, init = {}) {
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => (i < chunks.length ? { value: enc.encode(chunks[i++]), done: false } : { done: true }),
      }),
    },
    ...init,
  };
}

const ev = (o) => `data: ${JSON.stringify(o)}\n\n`;

test('legge i pezzi nell\'ordine e si ferma su done', async () => {
  const pieces = [];
  const fetchImpl = jest.fn(async () => streamingResponse([ev({ t: 'Ciao ' }), ev({ t: 'Marta.' }), ev({ done: true })]));
  await streamChat({ token: 'tok', message: 'ciao', history: [], onText: (t) => pieces.push(t), fetchImpl });
  expect(pieces).toEqual(['Ciao ', 'Marta.']);
  const [url, opts] = fetchImpl.mock.calls[0];
  expect(url).toBe('/api/proposta/tok/chat');
  expect(opts.method).toBe('POST');
  expect(JSON.parse(opts.body)).toEqual({ message: 'ciao', history: [] });
});

test('un evento spezzato a metà tra due chunk viene ricomposto, accenti compresi', async () => {
  const full = ev({ t: 'perché sì' }) + ev({ done: true });
  const cut = Math.floor(full.length / 2);
  const pieces = [];
  await streamChat({
    token: 't', message: 'x', onText: (t) => pieces.push(t),
    fetchImpl: async () => streamingResponse([full.slice(0, cut), full.slice(cut)]),
  });
  expect(pieces.join('')).toBe('perché sì');
});

test('evento di errore dal server → ChatError col messaggio onesto, nessuna finta risposta', async () => {
  const pieces = [];
  await expect(streamChat({
    token: 't', message: 'x', onText: (t) => pieces.push(t),
    fetchImpl: async () => streamingResponse([ev({ error: 'Non riesco a risponderti' })]),
  })).rejects.toThrow('Non riesco a risponderti');
  expect(pieces).toEqual([]);
});

test('410 → proposta non più aperta; 500 e rete giù → messaggio di fallback con la mail del team', async () => {
  await expect(streamChat({ token: 't', message: 'x', onText: () => {}, fetchImpl: async () => ({ ok: false, status: 410 }) }))
    .rejects.toThrow(/non è più aperta/);
  await expect(streamChat({ token: 't', message: 'x', onText: () => {}, fetchImpl: async () => ({ ok: false, status: 500 }) }))
    .rejects.toThrow(FALLBACK_ERROR);
  await expect(streamChat({ token: 't', message: 'x', onText: () => {}, fetchImpl: async () => { throw new TypeError('offline'); } }))
    .rejects.toBeInstanceOf(ChatError);
});

test('senza stream nel browser si legge la risposta intera', async () => {
  const pieces = [];
  await streamChat({
    token: 't', message: 'x', onText: (t) => pieces.push(t),
    fetchImpl: async () => ({ ok: true, status: 200, body: null, text: async () => ev({ t: 'tutto' }) + ev({ done: true }) }),
  });
  expect(pieces).toEqual(['tutto']);
});

test('parseSseBlock ignora righe non valide', () => {
  expect(parseSseBlock('data: {"t":"a"}')).toEqual({ t: 'a' });
  expect(parseSseBlock('data: {rotto')).toBeNull();
  expect(parseSseBlock(': commento')).toBeNull();
});
