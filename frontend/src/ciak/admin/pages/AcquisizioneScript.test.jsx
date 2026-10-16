import React from 'react';
import { render, screen, within, cleanup } from '@testing-library/react';
import { RISVEGLIO_ASSET } from './risveglioAsset';

const { AcquisizioneScript } = require('./AcquisizioneScript');

afterEach(cleanup);

const texts = RISVEGLIO_ASSET.blocks.map((b) => b.s);

test('the risveglio messages are in the Script page, between the cold first message and the call script', () => {
  render(<AcquisizioneScript />);
  const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  const i1b = titles.findIndex((t) => /Email di presentazione dettagliata/.test(t));
  const iRis = titles.findIndex((t) => /Messaggi di risveglio/.test(t));
  const iCall = titles.findIndex((t) => /Script della chiamata di qualifica/.test(t));
  expect(i1b).toBeGreaterThan(-1);
  expect(iRis).toBe(i1b + 1);
  expect(iCall).toBe(iRis + 1);
});

test('all five approved messages are shown, each with its own copy button', () => {
  render(<AcquisizioneScript />);
  const card = screen.getByRole('heading', { name: /Messaggi di risveglio/ }).closest('div.bg-white');
  expect(RISVEGLIO_ASSET.blocks).toHaveLength(5);
  RISVEGLIO_ASSET.blocks.forEach((b) => expect(within(card).getByText(b.h)).toBeTruthy());
  expect(within(card).getAllByRole('button', { name: /Copia/ })).toHaveLength(5);
});

test('same text for whoever sends: only the sender name and the signature vary, no first person tied to one sender', () => {
  texts.forEach((t) => {
    expect(t).not.toMatch(/sono Claudio|sono Mariangela|ci conosciamo da|ho pensato|Le ho scritto/i);
  });
  // the four messages with an opening introduce the sender through a placeholder
  texts.slice(0, 4).forEach((t) => expect(t).toMatch(/sono \[Nome mittente\] di Evolution Pro/)); // the follow-up (5th) has no introduction by design
  // the three full messages end with the same signature block
  texts.slice(0, 3).forEach((t) => expect(t.trim().endsWith('[Nome e cognome]\nEvolution Pro')).toBe(true));
  // the relation with Claudio is stated in the third person, so it works for both senders
  expect(texts[2]).toMatch(/Claudio Bertogliatti, che Lei conosce da \[contesto\], guida Evolution Pro/);
});

test('copy rules: potential not results, no numbers, prices or forbidden brand words', () => {
  const all = texts.join('\n') + RISVEGLIO_ASSET.tip + RISVEGLIO_ASSET.note;
  expect(texts.join('\n')).not.toMatch(/\d/); // no figures at all in the messages ("una decina di minuti", not "10")
  expect(texts.join('\n')).not.toMatch(/€|euro|prezzo|sconto|garantit|gratis(?!uit)/i);
  expect(all).not.toMatch(/passiv|libertà finanziaria|guadagna mentre dormi|\b10k\b|\bhack\b|viral|esplodi|automatizza tutto|fai il salto|senza sforzo|mindset vincente/i);
  // every claim about the future income is in the conditional
  const incomeLines = texts.join('\n').match(/[^.]*fonte di entrata[^.]*\./g) || [];
  expect(incomeLines.length).toBeGreaterThanOrEqual(3);
  incomeLines.forEach((l) => expect(l).toMatch(/può diventare/));
});

test('the relationship messages give an easy way out, and the follow-up offers to stop', () => {
  expect(texts[1]).toMatch(/nessun problema: mi basta un cenno/);
  expect(texts[4]).toMatch(/mi basta un cenno e non Le scrivo più/);
  expect(texts[0]).toMatch(/Nessun impegno/);
  expect(texts[2]).toMatch(/Nessun impegno/);
});

test('the guidance warns that message 3 needs a real context and that nothing is sent automatically', () => {
  render(<AcquisizioneScript />);
  expect(screen.getByText(/Il testo 3 si usa solo se per quel contatto c'è un contesto vero/)).toBeTruthy();
  expect(screen.getByText(/Non si inviano messaggi automatici su Instagram o Facebook/)).toBeTruthy();
});
