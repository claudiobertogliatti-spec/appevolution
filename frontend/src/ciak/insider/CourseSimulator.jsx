import React from 'react';
import { SimulatorePage } from '../client/pages/SimulatorePage';

/**
 * Simulatore Corsi dentro la pagina di chiusura. Stesso componente dell'area cliente, con i colori
 * della pagina (navy e giallo). Sono ipotesi, mai una promessa: lo dice il componente stesso.
 */
export default function CourseSimulator() {
  return (
    <section className="pc-section" id="simulatore">
      <div className="pc-wrap">
        <SimulatorePage tone="insider" />
      </div>
    </section>
  );
}
