import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

const SerenoMateriali = require('./SerenoMateriali').default;

afterEach(cleanup);

const folders = [{ id: 'brand_kit', name: '01. Brand Kit' }, { id: 'video', name: '03. Video' }];
const files = [{ id: 'a', folderId: 'brand_kit', name: 'Brand.pdf', category: 'Brand', owner: '⚙️ CIAK' }];

test('while loading it says so instead of showing 0 files / empty folders', () => {
  render(<SerenoMateriali folders={folders} files={[]} loading />);
  expect(screen.getAllByText('Sto caricando i tuoi materiali…').length).toBe(2);
  expect(screen.queryByText(/Nessun file in questa cartella/)).toBeNull();
  expect(screen.queryByText(/\(0\)/)).toBeNull();
});

test('once loaded, folders without files are not listed and the total is shown', () => {
  render(<SerenoMateriali folders={folders} files={files} loading={false} />);
  expect(screen.getByText('Tutti (1)')).toBeTruthy();
  expect(screen.getByText('Brand Kit', { selector: 'strong' })).toBeTruthy(); // folder label, number removed
  expect(screen.queryByText('Video', { selector: 'strong' })).toBeNull(); // empty folder: not shown
  expect(screen.queryByRole('option', { name: 'Video' })).toBeNull(); // nor offered in the filter
  expect(screen.queryByText(/Nessun file in questa cartella/)).toBeNull();
  expect(screen.queryByText('Sto caricando i tuoi materiali…')).toBeNull();
});

test('files already available are listed even while the rest is still loading', () => {
  render(<SerenoMateriali folders={folders} files={files} loading />);
  expect(screen.getByText('Brand')).toBeTruthy();
});

const { fireEvent } = require('@testing-library/react');
const recent = () => new Date(Date.now() - 2 * 86400000).toISOString();

test('the same document repeated collapses into one row; older copies stay downloadable', () => {
  const onDownload = jest.fn();
  const many = [
    { id: 'v1', folderId: 'brand_kit', name: 'Guida_AI.docx', type: 'document', owner: '⚙️ CIAK', createdAt: '2026-08-15T10:00:00Z' },
    { id: 'v2', folderId: 'brand_kit', name: 'Guida_AI.docx', type: 'document', owner: '⚙️ CIAK', createdAt: '2026-09-22T10:00:00Z' },
    { id: 'v3', folderId: 'brand_kit', name: 'Guida_AI.docx', type: 'document', owner: '⚙️ CIAK', createdAt: '2026-06-05T10:00:00Z' },
  ];
  render(<SerenoMateriali folders={folders} files={many} onDownload={onDownload} />);
  // one row in the list (a recent file may also appear once in "Novità")
  expect(document.querySelectorAll('.sereno-mat-list h3')).toHaveLength(1);
  expect(screen.getByText('Tutti (1)')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Mostra 2 versioni precedenti/ }));
  fireEvent.click(screen.getByRole('button', { name: /Scarica la versione del 15 agosto 2026/ }));
  expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
});

test('"Novità per te" lists only files from the last days; nothing recent -> no section', () => {
  const withNew = [
    { id: 'n', folderId: 'brand_kit', name: 'Script_Nuovo.pdf', type: 'pdf', owner: '⚙️ CIAK', createdAt: recent() },
    { id: 'o', folderId: 'brand_kit', name: 'Script_Vecchio.pdf', type: 'pdf', owner: '⚙️ CIAK', createdAt: '2026-01-01T10:00:00Z' },
  ];
  const { unmount } = render(<SerenoMateriali folders={folders} files={withNew} />);
  expect(screen.getByRole('heading', { name: 'Novità per te' })).toBeTruthy();
  expect(screen.getByText('Nuovo da Ciak')).toBeTruthy();
  unmount();
  render(<SerenoMateriali folders={folders} files={[withNew[1]]} />);
  expect(screen.queryByRole('heading', { name: 'Novità per te' })).toBeNull();
});

test('a file uploaded by the partner is labelled "Caricato da te"', () => {
  render(<SerenoMateriali folders={folders} files={[{ id: 'm', folderId: 'brand_kit', name: 'Fatture.pdf', type: 'pdf', owner: '👤 Tu', createdAt: recent() }]} />);
  expect(screen.getAllByText('Caricato da te').length).toBeGreaterThan(0);
});

test('the upload card is inside Ciak: no Telegram link unless an upload failed', () => {
  render(<SerenoMateriali folders={folders} files={files} upload={jest.fn()} />);
  expect(screen.getByRole('button', { name: /Scegli un file/ })).toBeTruthy();
  expect(screen.queryByRole('link', { name: /Telegram/ })).toBeNull();
});

test('search that matches nothing says so instead of showing empty folders', () => {
  render(<SerenoMateriali folders={folders} files={files} />);
  fireEvent.change(screen.getByLabelText('Cerca tra i materiali'), { target: { value: 'zzz' } });
  expect(screen.getByText('Nessun file corrisponde alla ricerca.')).toBeTruthy();
});
