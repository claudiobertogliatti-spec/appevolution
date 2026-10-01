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

test('once loaded, empty folders say so and the total is shown', () => {
  render(<SerenoMateriali folders={folders} files={files} loading={false} />);
  expect(screen.getByText('Tutti (1)')).toBeTruthy();
  expect(screen.getByText('Nessun file in questa cartella.')).toBeTruthy();
  expect(screen.queryByText('Sto caricando i tuoi materiali…')).toBeNull();
});

test('files already available are listed even while the rest is still loading', () => {
  render(<SerenoMateriali folders={folders} files={files} loading />);
  expect(screen.getByText('Brand.pdf')).toBeTruthy();
});
