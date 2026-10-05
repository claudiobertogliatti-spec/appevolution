import {
  cleanFileName, humanType, formatDate, folderForMaterial, folderLabel, typeGroup, TYPE_FILTERS,
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

// Names and categories as they really appear in a partner's Materiali.
const place = (name, category = 'document', type = 'document') => folderForMaterial({ name, category, type });

test('generic category "document" goes by name: scripts, social and sales files each find their folder', () => {
  expect(place('Script delle lezioni - Andrea Fredi.pdf')).toBe('scripts');
  expect(place('Outline corso - Andrea Fredi.pdf')).toBe('scripts');
  expect(place('Template_Videocorso_Andrea_Fredi.xlsx')).toBe('scripts');
  expect(place('Calendario_Social_Lancio_TAI_Andrea.xlsx')).toBe('social');
  expect(place('Calendario_Lancio_Social_Daniele.xlsx')).toBe('social');
  expect(place('Guida_AI_Caption_SEO.docx')).toBe('social');
  expect(place('Prompt_AI_Contenuti_Social.docx')).toBe('social');
  expect(place('Documento_Posizionamento_Andrea_Fredi.pdf')).toBe('brand_kit');
  expect(place('Analisi Daniele Andolfi.pdf')).toBe('brand_kit');
  expect(place('Articolo Medintenzione.pdf')).toBe('master_pdf'); // unknown -> the catch-all folder
});

test('contract, payment slip and identity documents are kept apart from logo and photos', () => {
  expect(place('Distinta_Fredi.pdf')).toBe('documenti');
  expect(place('Contratto1.jpeg', 'document', 'image')).toBe('documenti');
  expect(place('Contratto_Firmato2.jpeg', 'document', 'image')).toBe('documenti');
  expect(place('CF_Fronte.jpeg', 'document', 'image')).toBe('documenti');
  expect(place('CI_fronte.jpeg', 'document', 'image')).toBe('documenti');
  expect(place('Fronte_CI.jpeg', 'document', 'image')).toBe('documenti');
  expect(place('Retro_CI.jpeg', 'document', 'image')).toBe('documenti');
  expect(place('Proforma_Partnership.pdf')).toBe('documenti');
  expect(folderForMaterial({ category: 'contratto_firmato', name: 'Contratto_firmato_Daniele_Andolfi.pdf', type: 'pdf' })).toBe('documenti');
  expect(folderForMaterial({ category: 'distinta_pagamento', name: 'Distinta_pagamento_Daniele_Andolfi.pdf', type: 'pdf' })).toBe('documenti');
  expect(place('Logo_Sabai.png', 'image', 'image')).toBe('brand_kit');
  expect(place('Foto_Personale.png', 'image', 'image')).toBe('brand_kit');
});

test('reels and their covers go to the social folder; the course video goes with the course', () => {
  expect(place('reel2_g5.mp4', 'video', 'video')).toBe('social');
  expect(place('copertina reel g29.jpeg', 'image', 'image')).toBe('social');
  expect(place('Videocorso - Il pilota automatico.mp4', 'video', 'video')).toBe('scripts');
  expect(place('Video_senza_nome.mp4', 'video', 'video')).toBe('social'); // an unnamed video is most likely a reel
  expect(place('image senza nome.png', 'image', 'image')).toBe('brand_kit'); // an unnamed picture, brand material
});

test('sales and legal pages categories go to "vendita"; outline categories to "corso"', () => {
  ['vendita_termini', 'vendita_cookie', 'vendita_privacy', 'vendita_faq', 'vendita_descrizione'].forEach((c) => {
    expect(folderForMaterial({ category: c, name: 'Qualunque.pdf', type: 'pdf' })).toBe('funnel');
  });
  expect(place('Termini e condizioni di vendita - Daniele Andolfi.pdf')).toBe('funnel');
  expect(place('FAQ della pagina di vendita - Daniele Andolfi.pdf')).toBe('funnel');
  expect(place("Descrizione dell'offerta - Daniele Andolfi.pdf")).toBe('funnel');
  ['course_outline', 'outline_corso', 'videocorso_script', 'masterclass'].forEach((c) => {
    expect(folderForMaterial({ category: c, name: 'Qualunque.pdf', type: 'pdf' })).toBe('scripts');
  });
  expect(folderForMaterial({ category: 'workbook', name: 'Script.pdf' })).toBe('master_pdf');
  expect(folderForMaterial({ category: 'brand-kit', name: 'Qualunque.pdf' })).toBe('brand_kit');
});

test('typeGroup sorts files for the type chips: PDF, Immagine, Video, everything else together', () => {
  expect(typeGroup({ type: 'pdf' })).toBe('PDF');
  expect(typeGroup({ type: 'image' })).toBe('Immagine');
  expect(typeGroup({ type: 'video' })).toBe('Video');
  expect(typeGroup({ type: 'document', name: 'Calendario.xlsx' })).toBe('Altro');
  expect(typeGroup({ type: 'document', name: 'Script.docx' })).toBe('Altro');
  expect(typeGroup({ type: 'link', size: 'Google Drive' })).toBe('Altro');
  expect(TYPE_FILTERS.map(([k]) => k)).toEqual(['all', 'PDF', 'Immagine', 'Video', 'Altro']);
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
