import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
const { MemoryRouter, useLocation, useNavigate } = require('react-router-dom');
jest.mock('./feature', () => ({ PARTNER_SERENO_ENABLED: true }));
jest.mock('../operativo/hooks/useJourneyState', () => ({ useJourneyState: jest.fn() }));
jest.mock('../operativo/ProgressBar', () => () => null);
jest.mock('../operativo/PhaseAgentHeader', () => () => null);
jest.mock('../operativo/GoLive21Banner', () => () => null);
jest.mock('../operativo/AgentDrawer', () => () => null);
jest.mock('../operativo/Benvenuto', () => () => null);
jest.mock('../operativo/GuidedHome', () => () => null);
jest.mock('../operativo/steps/Step12PrezzoWebinar', () => ({ step }) => <h2>Dettaglio {step.label}</h2>);
const PartnerOperativo = require('../operativo/PartnerOperativo').default;
const { useJourneyState } = require('../operativo/hooks/useJourneyState');
const current = { step_id:'12-prezzo-webinar', label:'Prezzo + webinar', status:'in_progress', macro_phase:'valida' };
function Location() {
  const location = useLocation(); const navigate = useNavigate();
  return <><output aria-label="URL corrente">{location.search}</output><button onClick={() => navigate(-1)}>Indietro browser</button></>;
}
function setup(url = '/partner') {
  useJourneyState.mockReturnValue({ state:{ steps:[current], current_step:current, macro_phases:[], completed_count:0, total_steps:1 }, loading:false });
  return render(<MemoryRouter initialEntries={[url]}><Location/><PartnerOperativo partnerId="test" /></MemoryRouter>);
}
afterEach(() => { cleanup(); localStorage.clear(); });
test('opens the actual current step, preserves query and supports browser back', async () => {
  setup('/partner?context=review');
  fireEvent.click(screen.getByRole('button', {name:'Apri il passaggio'}));
  await screen.findByText('Dettaglio Prezzo + webinar');
  expect(screen.getByLabelText('URL corrente').textContent).toContain('context=review&step=12-prezzo-webinar');
  fireEvent.click(screen.getByRole('button', {name:'Indietro browser'}));
  await screen.findByRole('button', {name:'Apri il passaggio'});
});
test('preserves legacy admin step selection through the URL', async () => {
  localStorage.setItem('ciak_partner_initial_step','12-prezzo-webinar');
  setup();
  await screen.findByText('Dettaglio Prezzo + webinar');
  expect(screen.getByLabelText('URL corrente').textContent).toBe('?step=12-prezzo-webinar');
});
test('unknown step URL offers recovery instead of a raw implementation error', async () => {
  setup('/partner?step=does-not-exist');
  fireEvent.click(screen.getByRole('button',{name:'Torna a Oggi'}));
  await waitFor(() => expect(screen.getByRole('button',{name:'Apri il passaggio'})).toBeTruthy());
});
