import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

global.TextEncoder = require('util').TextEncoder;
const StepMaterialsModal = require('./StepMaterialsModal').default;

// Forma di services/partner_step_materials.normalize_file_material.
const DOCX = { id: 'f1', type: 'document', title: 'Template_Script_Masterclass.docx', can_preview: false,
  preview_url: null, download_url: '/api/partner-step-materials/f1/download', public_url: null, version: 1, metadata: {} };
const PDF = { id: 'f2', type: 'pdf', title: 'Script_Masterclass.pdf', can_preview: true,
  preview_url: '/api/partner-step-materials/f2/preview', download_url: '/api/partner-step-materials/f2/download', public_url: null, version: 1, metadata: {} };

function mockMaterials(materials) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ materials, workbook_notice: 'Puoi consultare e scaricare questo materiale.' }),
  }));
}

beforeEach(() => { localStorage.setItem('ciak_partner_token', 'test-jwt'); });
afterEach(() => { cleanup(); localStorage.clear(); delete global.fetch; jest.clearAllMocks(); });

const step = { id: '05-script-masterclass', code: 'F-8', title: 'Script masterclass' };

test('se nessun file si può mostrare, il riquadro non rimanda a un "Visualizza" che non esiste', async () => {
  mockMaterials([DOCX]);
  render(<StepMaterialsModal partnerId="p1" step={step} onClose={() => {}} />);

  expect(await screen.findByText(/usa “Scarica” per aprirli/i)).toBeTruthy();
  expect(screen.queryByText(/Seleziona “Visualizza”/i)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Visualizza' })).toBeNull();
});

test('se almeno un file si può mostrare, il riquadro invita a premere "Visualizza"', async () => {
  mockMaterials([DOCX, PDF]);
  render(<StepMaterialsModal partnerId="p1" step={step} onClose={() => {}} />);

  expect(await screen.findByText(/Seleziona “Visualizza”/i)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Visualizza' })).toBeTruthy();
});
