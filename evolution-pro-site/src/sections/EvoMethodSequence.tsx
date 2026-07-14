import { motion } from 'framer-motion';

import { useAutoplaySequence } from '../lib/motion';

const phases = [
  { name: 'Esamina', text: 'Mercato, problema e posizionamento.' },
  { name: 'Valida', text: 'Offerta, messaggio e risposta reale.' },
  { name: 'Ottimizza', text: 'Dati, lancio e crescita.' },
];

export function EvoMethodSequence() {
  const { index: activeIndex, reduced, interactionProps } = useAutoplaySequence(phases.length, 3200);
  const phase = phases[activeIndex];

  return (
    <section id="metodo-evo" data-testid="home-section" data-animation="autoplay" className="evo-method">
      <div className="evo-method__stage container" {...interactionProps}>
        <header><p className="eyebrow">Metodo EVO</p><h2>Dal punto di partenza alla crescita</h2><p>3 passaggi semplici dentro un protocollo testato negli ultimi 7 anni</p></header>
        <div className="evo-method__phases">
          <motion.article key={phase.name} data-testid="active-evo-phase" initial={reduced ? false : { opacity: 0, x: 36, scale: .95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: .6, ease: 'easeOut' }}>
            <span aria-hidden="true">0{activeIndex + 1}</span><h3>{phase.name}</h3><p>{phase.text}</p>
          </motion.article>
        </div>
        <ol className="sr-only" aria-label="Le tre fasi del Metodo EVO">{phases.map(({ name, text }) => <li key={name}>{name}: {text}</li>)}</ol>
      </div>
    </section>
  );
}
