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
