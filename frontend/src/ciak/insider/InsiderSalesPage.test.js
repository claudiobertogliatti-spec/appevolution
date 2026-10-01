import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';

// La CI usa `craco test` (jest CRA), che non risolve gli export condizionali di
// React Router 7. Il componente usa solo `useParams`, quindi lo mockiamo: nessun
// bisogno del vero react-router-dom né di MemoryRouter. (Sotto la config preview
// c'è un moduleNameMapper apposito, ma qui deve girare dove gira la CI.)
jest.mock('react-router-dom', () => ({ useParams: () => ({ token: 'tok' }) }));

const InsiderSalesPage = require('./InsiderSalesPage').default;

afterEach(() => { delete global.fetch; });

const BLUEPRINT = {
  meta: { progetto: 'Progetto', accent_progetto: 'Nutrizione', ambito: 'Salute', data: '30/09/2026' },
  sintesi: 'Sei una nutrizionista con clienti fissi.',
  potenziale: { lead: 'Alto', cards: [{ h: 'Competenza ✓', p: 'Clienti che ti richiamano.' }, { h: 'Struttura ✗', p: 'Niente prodotto ripetibile.' }] },
  problema: 'Il reddito dipende dalle ore che lavori.',
  forza: ['Clienti fissi'],
  limiti: ['Nessun prodotto ripetibile'],
  manca: [{ h: 'Offerta chiara', p: 'ripetibile' }, { h: 'Percorso di vendita online', p: '' }],
  rischio: { lead: 'Ogni mese lavori alla stessa condizione.' },
  roadmap: [{ h: 'Direzione e posizionamento', p: 'Chi aiuti e con quale promessa.' }, { h: 'Struttura del corso', p: 'Moduli e ordine.' }],
};

function mockProposta(extra = {}) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      stato: 'vista',
      prospect_nome: 'Marta Ferri',
      partner_id: 'p1',
      scadenza: '2999-10-08T10:00:00+00:00',
      checkout_readiness: { start: { enabled: true }, partnership: { enabled: true } },
      ...extra,
    }),
  }));
}

test('token scaduto (410) → messaggio onesto, nessun crash', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 410, json: () => Promise.resolve({}) }));
  render(<InsiderSalesPage />);
  expect(await screen.findByText(/non è più disponibile|scadut/i)).toBeTruthy();
});

test('contratto firmato ma NON pagato → resta la pagina offerta, non il messaggio "completato"', async () => {
  mockProposta({ stato: 'contratto_firmato', prospect_nome: 'Marco Rossi', scoring_stato: '3', analisi: null });
  render(<InsiderSalesPage />);
  expect(await screen.findByText(/in call abbiamo trovato il punto/i)).toBeTruthy();
  expect(screen.queryByText(/hai già completato/i)).toBeNull();
});

test('pagamento completato → "hai già completato", niente offerta', async () => {
  mockProposta({ stato: 'pagamento_completato' });
  render(<InsiderSalesPage />);
  expect(await screen.findByText(/hai già completato/i)).toBeTruthy();
  expect(screen.queryByText(/in call abbiamo trovato/i)).toBeNull();
});

describe('con il Blueprint del lead', () => {
  beforeEach(() => mockProposta({ blueprint: BLUEPRINT, raccomandata: 'partnership' }));

  test('la pagina usa le SUE parole: frase del blocco, diagnosi, rischio, tappe', async () => {
    render(<InsiderSalesPage />);
    expect(await screen.findByText(/Marta, in call abbiamo trovato/)).toBeTruthy();
    expect(screen.getAllByText(/Il reddito dipende dalle ore che lavori\./).length).toBeGreaterThanOrEqual(2); // citazione hero + costo del restare fermi
    expect(screen.getByText('Competenza')).toBeTruthy();
    expect(screen.getByText('Struttura')).toBeTruthy();
    expect(screen.getByText('Ogni mese lavori alla stessa condizione.')).toBeTruthy();
    expect(screen.getByText('Direzione e posizionamento')).toBeTruthy();
    expect(screen.getByText(/Progetto/)).toBeTruthy();
  });

  test('i tre binari hanno date calcolate (mai fisse) e il costo del rinvio', async () => {
    render(<InsiderSalesPage />);
    await screen.findByText(/Stessa data di partenza/);
    expect(screen.getByRole('img', { name: /se parti oggi il tuo corso può essere online tra il/i })).toBeTruthy();
    expect(screen.getByText(/Sposta di tre mesi il giorno/)).toBeTruthy();
    expect(screen.getByText(/Rifletti, senza partire/)).toBeTruthy();
  });

  test('scadenza REALE in testa e nella chiusura', async () => {
    render(<InsiderSalesPage />);
    await screen.findByText(/Stessa data di partenza/);
    expect(screen.getAllByText(/venerdì 8 ottobre 2999|2999/).length).toBeGreaterThan(0);
  });

  test('Partnership consigliata: card Partnership per prima e hero, Start come alternativa', async () => {
    const { container } = render(<InsiderSalesPage />);
    await screen.findByText(/Dal tuo Blueprint, il passo giusto è la Partnership/);
    const p = container.querySelector('[data-offer="partnership"]');
    const s = container.querySelector('[data-offer="start"]');
    expect(p.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(p.classList.contains('insider-offer--hero')).toBe(true);
    expect(within(p).getByText('Consigliato per te')).toBeTruthy();
    expect(screen.queryByText(/Bene Marta/)).toBeNull(); // il ponte storico c'è solo senza percorso noto
  });

  test('onestà: nessuna garanzia di rimborso, nessun "tutto tuo al 100%", pagamenti come da contratto', async () => {
    const { container } = render(<InsiderSalesPage />);
    await screen.findByText(/Stessa data di partenza/);
    const text = container.textContent;
    expect(text).not.toMatch(/soddisfatti o rimborsati|garanzia di rimborso|rimborso garantito/i);
    expect(text).not.toMatch(/100\s?%/);
    expect(text).toMatch(/fino a 3 rate mensili, con approvazione scritta/i);
    expect(text).toMatch(/Nessun guadagno è garantito/);
  });
});

describe('senza Blueprint', () => {
  test('le sezioni personali NON compaiono e non c\'è testo segnaposto', async () => {
    mockProposta({ blueprint: null, raccomandata: null });
    const { container } = render(<InsiderSalesPage />);
    await screen.findByText(/in call abbiamo trovato il punto/i);
    expect(screen.queryByText(/Le parole del tuo Blueprint/)).toBeNull();
    expect(screen.queryByText(/Cosa comporta, davvero/)).toBeNull();
    expect(screen.queryByText(/Le tappe che abbiamo scritto/)).toBeNull();
    expect(screen.queryByText(/arriva a breve|sarà qui a breve/i)).toBeNull();
    // percorso non noto: ordine storico Start → Partnership, con il ponte approvato
    expect(screen.getByText(/Bene Marta/)).toBeTruthy();
    const s = container.querySelector('[data-offer="start"]');
    const p = container.querySelector('[data-offer="partnership"]');
    expect(s.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('con la vecchia analisi di testo, la mostra come prima', async () => {
    mockProposta({ blueprint: null, analisi: 'Riga uno\nRiga due' });
    render(<InsiderSalesPage />);
    expect(await screen.findByText('Riga uno')).toBeTruthy();
  });
});

describe('video di ringraziamento', () => {
  test('con un URL vero compare subito dopo il titolo, senza avvio automatico', async () => {
    mockProposta({ blueprint: BLUEPRINT, video_benvenuto_url: 'https://cdn.example.com/grazie.mp4' });
    const { container } = render(<InsiderSalesPage />);
    const box = await screen.findByTestId('thank-you-video');
    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.hasAttribute('controls')).toBe(true);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('un embed (es. YouTube) viene reso come iframe', async () => {
    mockProposta({ video_benvenuto_url: 'https://www.youtube.com/embed/abc' });
    const { container } = render(<InsiderSalesPage />);
    await screen.findByTestId('thank-you-video');
    expect(container.querySelector('iframe').getAttribute('src')).toBe('https://www.youtube.com/embed/abc');
  });

  test.each([undefined, null, '', 'javascript:alert(1)', 'ftp://x/y.mp4'])('senza URL valido (%s) NIENTE video e NIENTE segnaposto', async (video_benvenuto_url) => {
    mockProposta({ video_benvenuto_url });
    const { container } = render(<InsiderSalesPage />);
    await screen.findByText(/in call abbiamo trovato il punto/i);
    expect(screen.queryByTestId('thank-you-video')).toBeNull();
    expect(container.querySelector('video, iframe')).toBeNull();
    expect(screen.queryByText(/arriva a breve/i)).toBeNull();
  });
});

describe('bonus 48h', () => {
  test('attivo → la guida in omaggio compare con la data reale', async () => {
    mockProposta({ raccomandata: 'start', bonus: { attiva: true, scade_at: '2999-10-02T16:00:00+00:00' } });
    render(<InsiderSalesPage />);
    expect(await screen.findByText(/Guida in omaggio/)).toBeTruthy();
  });

  test.each([{ attiva: false, scade_at: null }, null, undefined])('non attivo (%j) → nessun omaggio, nessuna urgenza inventata', async (bonus) => {
    mockProposta({ raccomandata: 'start', bonus });
    render(<InsiderSalesPage />);
    await screen.findByText(/in call abbiamo trovato il punto/i);
    expect(screen.queryByText(/Guida in omaggio/)).toBeNull();
  });
});

test('"Ho una domanda" apre la chat', async () => {
  mockProposta({ blueprint: BLUEPRINT });
  render(<InsiderSalesPage />);
  await screen.findByText(/in call abbiamo trovato il punto/i);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: /ho una domanda/i })[0]);
  expect(await screen.findByRole('dialog')).toBeTruthy();
});
