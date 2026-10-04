import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
global.TextEncoder = require('util').TextEncoder;
const { MemoryRouter } = require('react-router-dom');
const SerenoJourney = require('./SerenoJourney').default;
afterEach(cleanup);
test('links to the exact current step and offers materials only for completed output steps', () => {
  const onMaterials = jest.fn();
  const current = {step_id:'12-prezzo-webinar',label:'Prezzo',status:'pending',macro_phase:'valida'};
  const material = {step_id:'03-posizionamento',label:'Posizionamento',status:'done',macro_phase:'esamina'};
  render(<MemoryRouter><SerenoJourney state={{current_step:current,steps:[current,material,{step_id:'la-tua-storia',label:'Storia',status:'done',macro_phase:'esamina'}]}} onMaterials={onMaterials}/></MemoryRouter>);
  expect(screen.getByRole('link',{name:'Apri il passaggio →'}).getAttribute('href')).toBe('/partner?step=12-prezzo-webinar');
  fireEvent.click(screen.getByText('Consulta materiali'));
  expect(onMaterials).toHaveBeenCalledWith(material);
  expect(screen.getByText('2 di 3 passaggi completati')).toBeTruthy();
});
test('failed refresh hides stale actions and provides retry', () => {
  const onRetry = jest.fn();
  render(<MemoryRouter><SerenoJourney error="401" onRetry={onRetry}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Riprova'}));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/passaggi completati/)).toBeNull();
});

test('with many steps in progress only ONE says "Il tuo prossimo passo", no internal codes are shown, and what is coming is explained', () => {
  const mk = (id, extra = {}) => ({ step_id: id, label: id, status: 'in_progress', macro_phase: 'valida', code: 'F-12', ...extra });
  const current = mk('12-prezzo-webinar');
  const others = [mk('13-lancio'), mk('11-calendario-30gg')];
  const later = mk('10-sistema-vendita', { status: 'pending' });
  render(<MemoryRouter><SerenoJourney state={{ current_step: current, steps: [current, ...others, later] }} /></MemoryRouter>);
  expect(screen.getAllByText('Il tuo prossimo passo')).toHaveLength(1);
  expect(screen.getAllByText('Già avviato')).toHaveLength(2);
  expect(screen.queryByText('F-12')).toBeNull(); // technical code hidden
  expect(screen.getByText('Subaccount Systeme, dominio, legal pages, funnel e checkout.')).toBeTruthy(); // what comes later
  expect(screen.getAllByRole('link', { name: 'Apri →' })).toHaveLength(2);
});
