import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalysisRecap from './AnalysisRecap';

test('rende ogni riga dell\'analisi come paragrafo separato', () => {
  render(<AnalysisRecap analisi={'Riga uno\nRiga due'} />);
  expect(screen.getByText('Riga uno')).toBeTruthy();
  expect(screen.getByText('Riga due')).toBeTruthy();
});

test('analisi mancante → placeholder onesto, nessun contenuto inventato', () => {
  render(<AnalysisRecap analisi={null} />);
  expect(screen.getByText(/sarà qui a breve/i)).toBeTruthy();
  expect(screen.queryByText('Riga uno')).toBeNull();
  expect(screen.queryByText('Riga due')).toBeNull();
});
