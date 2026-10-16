import React from 'react';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';

const SerenoMateriali = require('./SerenoMateriali').default;

afterEach(cleanup);

const folders = [
  { id: 'brand_kit', name: '01. Brand e strategia', subtitle: 'Posizionamento, brand kit, logo e foto' },
  { id: 'social', name: '04. Reel e contenuti social', subtitle: 'Reel, copertine e calendario' },
  { id: 'documenti', name: '05. Contratto e documenti personali', subtitle: 'Contratto e distinta' },
  { id: 'master_pdf', name: '06. Il tuo piano', subtitle: 'Libretto e piano' },
];
const old = '2026-01-01T10:00:00Z'; // outside "Novità", so it does not repeat the row
const f = (id, folderId, name, type, owner = '⚙️ CIAK', createdAt = old) => ({ id, folderId, name, type, owner, createdAt });
const files = [
  f('a', 'brand_kit', 'Brand_Kit.pdf', 'pdf'),
  f('b', 'brand_kit', 'Logo.png', 'image'),
  f('c', 'social', 'Reel_1.mp4', 'video'),
  f('d', 'social', 'Reel_2.mp4', 'video'),
  f('e', 'social', 'Copertina_reel_1.jpeg', 'image'),
  f('g', 'documenti', 'Contratto_firmato.pdf', 'pdf', '👤 Tu'),
  f('h', 'documenti', 'Distinta.pdf', 'pdf', '👤 Tu'),
  f('i', 'master_pdf', 'Calendario.xlsx', 'document'),
];
const tileNames = () => [...document.querySelectorAll('.sereno-tile strong')].map((e) => e.textContent);
const rowNames = () => [...document.querySelectorAll('.sereno-mat-file h3')].map((e) => e.textContent);
const box = () => screen.getByPlaceholderText(/Cerca per nome/);
const search = (text) => fireEvent.change(box(), { target: { value: text } });
const chips = () => within(screen.getByRole('group', { name: 'Filtra per tipo' }));

test('while loading it says so and shows what already arrived, never "0 file" or empty folders', () => {
  render(<SerenoMateriali folders={folders} files={[files[0]]} loading />);
  expect(screen.getByText('Sto caricando i tuoi materiali…')).toBeTruthy();
  expect(screen.getByText('Brand Kit')).toBeTruthy();
  expect(screen.queryByText(/Nessun file/)).toBeNull();
  expect(screen.queryByText(/\(0\)/)).toBeNull();
  expect(document.querySelectorAll('.sereno-tile')).toHaveLength(0);
});

test('once loaded the folders are tiles with their file count, without the internal number; empty ones are not listed', () => {
  render(<SerenoMateriali folders={[...folders, { id: 'funnel', name: '03. Vendita' }]} files={files} />);
  expect(tileNames()).toEqual(['Brand e strategia', 'Reel e contenuti social', 'Contratto e documenti personali', 'Il tuo piano']);
  const social = screen.getByRole('button', { name: /Apri la cartella Reel e contenuti social, 3 file/ });
  expect(within(social).getByText('3 file')).toBeTruthy();
  expect(screen.queryByText('Vendita')).toBeNull();
  expect(rowNames()).toEqual([]); // files are behind the tiles, not in a long list
});

test('opening a tile lists that folder only, and "Tutte le cartelle" goes back', () => {
  render(<SerenoMateriali folders={folders} files={files} />);
  fireEvent.click(screen.getByRole('button', { name: /Apri la cartella Reel e contenuti social/ }));
  expect(rowNames().sort()).toEqual(['Copertina reel 1', 'Reel 1', 'Reel 2']);
  expect(screen.getByText('· 3 file')).toBeTruthy();
  expect(screen.queryByText('Logo')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '← Tutte le cartelle' }));
  expect(tileNames()).toHaveLength(4);
});

test('"Cerca file" looks in every folder, shows where each result is and highlights the match', () => {
  render(<SerenoMateriali folders={folders} files={files} />);
  search('reel');
  expect(screen.getByText('3 risultati per “reel”')).toBeTruthy();
  expect(rowNames().map((n) => n.replace('Reel e contenuti social', ''))).toHaveLength(3);
  expect(document.querySelectorAll('mark')).toHaveLength(3);
  expect(document.querySelector('mark').textContent.toLowerCase()).toBe('reel');
  expect(document.querySelectorAll('.sereno-where')).toHaveLength(3);
  expect(document.querySelector('.sereno-where').textContent).toBe('Reel e contenuti social');
  expect(document.querySelectorAll('.sereno-tile')).toHaveLength(0); // the result list replaces the tiles
});

test('searching across folders also finds the file the partner is looking for in a different folder', () => {
  render(<SerenoMateriali folders={folders} files={files} />);
  search('contratto');
  expect(rowNames()[0]).toMatch(/^Contratto firmato/);
  expect(screen.getByText('Contratto e documenti personali')).toBeTruthy();
  expect(screen.getByText('1 risultato per “contratto”')).toBeTruthy();
});

test('no match says so and "Cancella ricerca e filtri" brings the folders back', () => {
  render(<SerenoMateriali folders={folders} files={files} />);
  search('zzz');
  expect(screen.getByText('Nessun file corrisponde alla ricerca.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancella ricerca e filtri' }));
  expect(tileNames()).toHaveLength(4);
  expect(box().value).toBe('');
});

test('type chips filter across folders and their counts say what they would show', () => {
  render(<SerenoMateriali folders={folders} files={files} />);
  const chip = (label) => chips().getByRole('button', { name: new RegExp(`^${label}`) });
  expect(chip('Tutti').textContent).toBe('Tutti8');
  expect(chip('PDF').textContent).toBe('PDF3');
  expect(chip('Immagini').textContent).toBe('Immagini2');
  expect(chip('Video').textContent).toBe('Video2');
  expect(chip('Word, Excel e altro').textContent).toBe('Word, Excel e altro1');
  fireEvent.click(chip('Video'));
  expect(screen.getByText('2 risultati')).toBeTruthy();
  expect(rowNames().map((n) => n.replace('Reel e contenuti social', '')).sort()).toEqual(['Reel 1', 'Reel 2']);
  expect(chip('Video').getAttribute('aria-pressed')).toBe('true');
});

test('"Da te" shows only what the partner uploaded; counts and tiles follow it', () => {
  render(<SerenoMateriali folders={folders} files={files} />);
  fireEvent.click(screen.getByRole('button', { name: 'Da te' }));
  expect(tileNames()).toEqual(['Contratto e documenti personali']);
  expect(chips().getByRole('button', { name: /^Tutti/ }).textContent).toBe('Tutti2');
});

test('the same document repeated collapses into one row; older copies stay downloadable', () => {
  const onDownload = jest.fn();
  const many = [
    f('v1', 'brand_kit', 'Guida_AI.docx', 'document', '⚙️ CIAK', '2026-08-15T10:00:00Z'),
    f('v2', 'brand_kit', 'Guida_AI.docx', 'document', '⚙️ CIAK', '2026-09-22T10:00:00Z'),
    f('v3', 'brand_kit', 'Guida_AI.docx', 'document', '⚙️ CIAK', '2026-06-05T10:00:00Z'),
  ];
  render(<SerenoMateriali folders={folders} files={many} onDownload={onDownload} />);
  fireEvent.click(screen.getByRole('button', { name: /Apri la cartella Brand e strategia, 1 file/ }));
  expect(document.querySelectorAll('.sereno-mat-list h3')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /Mostra 2 versioni precedenti/ }));
  fireEvent.click(screen.getByRole('button', { name: /Scarica la versione del 15 agosto 2026/ }));
  expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
});

test('"Novità per te" lists only files from the last days; nothing recent -> no section', () => {
  const recent = new Date(Date.now() - 2 * 86400000).toISOString();
  const withNew = [f('n', 'brand_kit', 'Script_Nuovo.pdf', 'pdf', '⚙️ CIAK', recent), f('o', 'brand_kit', 'Script_Vecchio.pdf', 'pdf')];
  const { unmount } = render(<SerenoMateriali folders={folders} files={withNew} />);
  expect(screen.getByRole('heading', { name: 'Novità per te' })).toBeTruthy();
  expect(screen.getByText('Nuovo da Ciak')).toBeTruthy();
  unmount();
  render(<SerenoMateriali folders={folders} files={[withNew[1]]} />);
  expect(screen.queryByRole('heading', { name: 'Novità per te' })).toBeNull();
});

test('a file uploaded by the partner is labelled "Caricato da te"', () => {
  render(<SerenoMateriali folders={folders} files={[f('m', 'documenti', 'Fatture.pdf', 'pdf', '👤 Tu', new Date().toISOString())]} />);
  expect(screen.getAllByText('Caricato da te').length).toBeGreaterThan(0);
});

test('the upload card is inside Ciak: no Telegram link unless an upload failed', () => {
  render(<SerenoMateriali folders={folders} files={files} upload={jest.fn()} />);
  expect(screen.getByRole('button', { name: /Scegli un file/ })).toBeTruthy();
  expect(screen.queryByRole('link', { name: /Telegram/ })).toBeNull();
});

test('open and download of a row call the real handlers with that file', () => {
  const onOpen = jest.fn();
  const onDownload = jest.fn();
  render(<SerenoMateriali folders={folders} files={files} onOpen={onOpen} onDownload={onDownload} />);
  search('brand');
  fireEvent.click(screen.getByRole('button', { name: 'Apri Brand Kit' }));
  fireEvent.click(screen.getByRole('button', { name: 'Scarica Brand Kit' }));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
});

test('no files at all says so plainly', () => {
  render(<SerenoMateriali folders={folders} files={[]} />);
  expect(screen.getByText(/Non ci sono ancora materiali/)).toBeTruthy();
});

describe('Rimuovi (solo supervisione admin)', () => {
  const rm = [f('f1', 'brand_kit', 'Quiz SlimAmour.docx', 'document')];
  const show = () => search('Quiz'); // files sit behind the folder tiles: the search lists them

  test('senza onRemove il pulsante non esiste: il partner non lo vede mai', () => {
    render(<SerenoMateriali folders={folders} files={rm} />);
    show();
    expect(screen.queryByRole('button', { name: /Rimuovi/ })).toBeNull();
  });

  test('con onRemove servono due passi e la rimozione parte solo alla conferma', async () => {
    const onRemove = jest.fn().mockResolvedValue(undefined);
    render(<SerenoMateriali folders={folders} files={rm} onRemove={onRemove} />);
    show();
    fireEvent.click(screen.getByRole('button', { name: /^Rimuovi Quiz SlimAmour/ }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Conferma rimozione di Quiz SlimAmour/ }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'f1' })));
  });

  test('Annulla torna indietro senza rimuovere', () => {
    const onRemove = jest.fn();
    render(<SerenoMateriali folders={folders} files={rm} onRemove={onRemove} />);
    show();
    fireEvent.click(screen.getByRole('button', { name: /^Rimuovi Quiz SlimAmour/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Rimuovi Quiz SlimAmour/ })).toBeTruthy();
  });

  test('se la rimozione fallisce lo dice e il file resta', async () => {
    const onRemove = jest.fn().mockRejectedValue(new Error('x'));
    render(<SerenoMateriali folders={folders} files={rm} onRemove={onRemove} />);
    show();
    fireEvent.click(screen.getByRole('button', { name: /^Rimuovi Quiz SlimAmour/ }));
    fireEvent.click(screen.getByRole('button', { name: /Conferma rimozione di Quiz SlimAmour/ }));
    await screen.findByRole('alert');
    expect(rowNames().some((n) => n.startsWith('Quiz SlimAmour'))).toBe(true);
  });

  test('i collegamenti esterni e le voci generate (contratto, Drive) non si rimuovono', () => {
    const items = [
      { id: 'r-contratto', folderId: 'documenti', name: 'Contratto firmato', category: 'Contratto', owner: '⚙️ CIAK', type: 'pdf', createdAt: old },
      { id: 'r-drive', folderId: 'brand_kit', name: 'Cartella Drive', category: 'Doc', owner: '⚙️ CIAK', type: 'link', esterno: true },
    ];
    render(<SerenoMateriali folders={folders} files={items} onRemove={jest.fn()} />);
    search('o'); // matches both rows
    expect(screen.queryByRole('button', { name: /Rimuovi/ })).toBeNull();
  });
});
