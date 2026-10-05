import {
  cleanFileName, humanType, formatDate, folderForMaterial, folderLabel,
  groupVersions, recentFiles, validateUpload, MAX_UPLOAD_MB,
} from './materialiModel';

// Real file names seen in a partner's Materiali (not invented examples).
test('cleanFileName removes extension, underscores and the [CB] suffix, keeps the words', () => {
  expect(cleanFileName('Calendario_Social_Lancio_TAI_Andrea [CB].xlsx')).toBe('Calendario Social Lancio TAI Andrea');
  expect(cleanFileName('Libretto_di_Progetto_Ciak.pdf')).toBe('Libretto di Progetto Ciak');
  expect(cleanFileName('Cosa trovi nel calendario editoriale Andrea')).toBe('Cosa trovi nel calendario editoriale Andrea');
  expect(cleanFileName('DOCUMENTO DI POSIZIONAMENTO A. F..docx')).toBe('DOCUMENTO DI POSIZIONAMENTO A. F.');
  expect(cleanFileName('')).toBe('Documento');
  expect(cleanFileName(undefined)).toBe('Documento');
});

test('humanType never shows the internal "document": it uses the real kind', () => {
  expect(humanType({ type: 'pdf' })).toBe('PDF');
  expect(humanType({ type: 'image' })).toBe('Immagine');
  expect(humanType({ type: 'document', name: 'Script_Chiusura.docx' })).toBe('Word');
  expect(humanType({ type: 'document', name: 'Calendario.xlsx' })).toBe('Excel');
  expect(humanType({ type: 'document', name: 'Articolo.odt' })).toBe('Word');
  expect(humanType({ type: 'document', name: 'Cosa trovi nel calendario' })).toBe('Documento');
});

test('formatDate writes the date in words and ignores anything that is not a date', () => {
  expect(formatDate('2026-10-03')).toBe('3 ottobre 2026');
  expect(formatDate('2026-09-22T10:00:00Z')).toBe('22 settembre 2026');
  expect(formatDate('sempre aggiornato')).toBe('');
  expect(formatDate(null)).toBe('');
});

test('generic category "document" goes by name: scripts are not buried in the last folder', () => {
  const f = (name, category = 'document', type = 'document') => folderForMaterial({ name, category, type });
  expect(f('Script delle lezioni - Andrea Fredi.pdf')).toBe('scripts');
  expect(f('Outline corso - Andrea Fredi.pdf')).toBe('scripts');
  expect(f('Template_Videocorso_Andrea_Fredi.xlsx')).toBe('scripts');
  expect(f('Calendario_Social_Lancio_TAI_Andrea.xlsx')).toBe('social');
  expect(f('Guida_AI_Caption_SEO.docx')).toBe('social');
  expect(f('Prompt_AI_Contenuti_Social.docx')).toBe('social');
  expect(f('Documento_Posizionamento_Andrea_Fredi.pdf')).toBe('brand_kit');
  expect(f('Distinta_Fredi.pdf')).toBe('master_pdf');
  expect(f('Analisi_Fredi.pdf')).toBe('master_pdf'); // unknown -> the catch-all folder
});

test('a meaningful category wins over the name; videos go to the video folder', () => {
  expect(folderForMaterial({ category: 'brand-kit', name: 'Qualunque.pdf' })).toBe('brand_kit');
  expect(folderForMaterial({ category: 'image', name: 'foto1.png', type: 'image' })).toBe('brand_kit');
  expect(folderForMaterial({ category: 'document', name: 'Lezione 1.mp4', type: 'video' })).toBe('video');
  expect(folderForMaterial({ category: 'workbook', name: 'Script.pdf' })).toBe('master_pdf');
});

test('folderLabel drops the internal number', () => {
  expect(folderLabel('01. Brand e strategia')).toBe('Brand e strategia');
  expect(folderLabel('Senza numero')).toBe('Senza numero');
});

const F = (id, name, createdAt, extra = {}) => ({ id, name, folderId: 'social', owner: '⚙️ CIAK', createdAt, ...extra });

test('the same document uploaded many times becomes one row with the older copies kept', () => {
  const rows = groupVersions([
    F('a', 'Calendario_Social_Lancio_TAI_Andrea.xlsx', '2026-08-15T10:00:00Z'),
    F('b', 'Calendario_Social_Lancio_TAI_Andrea.xlsx', '2026-09-22T10:00:00Z'),
    F('c', 'Calendario_Social_Lancio_TAI_Andrea [CB].xlsx', '2026-08-15T11:00:00Z'),
    F('d', 'Guida_AI_Caption_SEO.docx', '2026-09-22T10:00:00Z'),
  ]);
  expect(rows).toHaveLength(2);
  const cal = rows.find((r) => r.name.startsWith('Calendario'));
  expect(cal.id).toBe('b'); // the latest is the visible one
  expect(cal.versions.map((v) => v.id).sort()).toEqual(['a', 'c']); // nothing is dropped
});

test('same name in different folders or owners is NOT merged; rows without a date never merge', () => {
  const rows = groupVersions([
    F('a', 'Piano.pdf', '2026-09-22T10:00:00Z'),
    F('b', 'Piano.pdf', '2026-09-23T10:00:00Z', { folderId: 'master_pdf' }),
    F('c', 'Piano.pdf', '2026-09-24T10:00:00Z', { owner: '👤 Tu' }),
    F('d', 'Libretto.pdf', null),
    F('e', 'Libretto.pdf', null),
  ]);
  expect(rows).toHaveLength(5);
});

test('recentFiles keeps only the last 30 days, newest first, max 3 — and is empty when nothing is new', () => {
  const now = new Date('2026-10-04T12:00:00Z');
  const files = [
    F('old', 'Vecchio.pdf', '2026-08-01T10:00:00Z'),
    F('n1', 'Uno.pdf', '2026-10-03T10:00:00Z'),
    F('n2', 'Due.pdf', '2026-10-04T08:00:00Z'),
    F('n3', 'Tre.pdf', '2026-09-20T10:00:00Z'),
    F('n4', 'Quattro.pdf', '2026-09-15T10:00:00Z'),
    F('link', 'Drive', '2026-10-04T09:00:00Z', { esterno: true }),
  ];
  expect(recentFiles(files, { now }).map((f) => f.id)).toEqual(['n2', 'n1', 'n3']);
  expect(recentFiles([F('old', 'Vecchio.pdf', '2026-08-01T10:00:00Z')], { now })).toEqual([]);
});

test('validateUpload refuses empty and oversized files with a sentence the partner can act on', () => {
  expect(validateUpload(null)).toMatch(/Scegli un file/);
  expect(validateUpload({ size: 0 })).toMatch(/vuoto/);
  expect(validateUpload({ size: (MAX_UPLOAD_MB + 1) * 1024 * 1024 })).toMatch(/200 MB/);
  expect(validateUpload({ size: 5 * 1024 * 1024 })).toBeNull();
});
