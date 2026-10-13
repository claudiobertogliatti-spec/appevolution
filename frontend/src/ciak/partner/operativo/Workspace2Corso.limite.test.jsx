import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
global.TextEncoder = require('util').TextEncoder;
const Workspace2Corso = require('./Workspace2Corso').default;

// Le regole sui video devono essere visibili dove il partner carica, non solo nelle guide.
const base = {
  has_course: true, course_approved: true, lessons_planned: 6, lessons_uploaded: 3,
  lessons_approved: 0, lessons: [], ai_tasks: [], partner_tasks: [], deliverables: [],
  progress: 0, done_count: 0, total_count: 1, course_data: { moduli: [] },
};

function mock(upload) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ...base, upload }) }));
}
afterEach(() => { cleanup(); jest.resetAllMocks(); });

test('mostra le due regole e quanti video restano', async () => {
  mock({ puo_caricare: true, in_lavorazione: 2, massimo: 3, messaggio: 'Puoi caricare ancora un video.' });
  render(<Workspace2Corso partnerId="p1" />);
  const regole = await screen.findByTestId('regole-video');
  expect(regole.textContent).toMatch(/Tieni i file originali/);
  expect(regole.textContent).toMatch(/Tre video per volta/);
  expect(screen.getByTestId('stato-upload').textContent).toBe('Puoi caricare ancora un video.');
  expect(screen.queryByTestId('upload-in-pausa')).toBeNull();
});

test('a tre video in lavorazione il caricamento si ferma e si spiega perché', async () => {
  mock({ puo_caricare: false, in_lavorazione: 3, massimo: 3, messaggio: 'Hai 3 video in lavorazione: è il massimo.' });
  render(<Workspace2Corso partnerId="p1" />);
  const pausa = await screen.findByTestId('upload-in-pausa');
  expect(pausa.textContent).toMatch(/Ti avvisiamo appena puoi caricare i prossimi/);
  expect(document.querySelector('input[type="file"]')).toBeNull();
});
