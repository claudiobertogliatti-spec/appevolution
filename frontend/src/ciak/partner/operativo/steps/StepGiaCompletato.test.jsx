import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
const Step05 = require('./Step05ScriptMasterclass').default;
const Step06 = require('./Step06OutlineLezioni').default;
const Step07 = require('./Step07ScriptVideolezioni').default;

// Passo "Fatto" dalla migrazione/dal team ma senza contenuto generato nel passo:
// la pagina non deve invitare a generare da zero (e sostituire ciò che esiste).
const done = (data = {}) => ({ step_id: 'x', macro_phase: 'valida', status: 'done', data });
const todo = (data = {}) => ({ step_id: 'x', macro_phase: 'valida', status: 'in_progress', data });
const noop = () => {};

afterEach(() => cleanup());

const CASES = [
  ['F-8 script masterclass', Step05, /Genera lo script della masterc/i, 'Lo script della masterclass'],
  ['F-9 scaletta lezioni', Step06, /Genera la bozza della scaletta/i, 'La scaletta delle lezioni'],
  ['F-10 script videolezioni', Step07, /Genera gli script delle videolezioni/i, 'Gli script delle videolezioni'],
];

describe.each(CASES)('%s', (_name, Comp, genRe, title) => {
  test('"Fatto" senza contenuto: rimanda all\'archivio, nessun invito a generare', () => {
    render(<Comp step={done()} partnerId="p1" onComplete={noop} onSaveDraft={noop} />);
    expect(screen.getByText(/Passo completato/i)).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(/Consulta materiali/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: genRe })).toBeNull();
  });

  test('"Voglio rifarlo da capo" riapre la schermata di generazione', () => {
    render(<Comp step={done()} partnerId="p1" onComplete={noop} onSaveDraft={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Voglio rifarlo da capo/i }));
    expect(screen.getByRole('button', { name: genRe })).toBeTruthy();
  });

  test('passo non ancora fatto e senza contenuto: la generazione resta come prima', () => {
    render(<Comp step={todo()} partnerId="p1" onComplete={noop} onSaveDraft={noop} />);
    expect(screen.queryByText(/Passo completato/i)).toBeNull();
    expect(screen.getByRole('button', { name: genRe })).toBeTruthy();
  });
});

test('F-10: "Fatto" con gli script già nel passo mostra gli script, non il messaggio', () => {
  render(<Step07 step={done({ script_videolezioni: 'Lezione 1: ' + 'testo dello script '.repeat(10) })} partnerId="p1" onComplete={noop} onSaveDraft={noop} />);
  expect(screen.queryByText(/Passo completato/i)).toBeNull();
  expect(screen.getByRole('button', { name: /Rigenera gli script/i })).toBeTruthy();
});
