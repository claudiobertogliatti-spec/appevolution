import { motion } from 'framer-motion';

import { useAutoplayIndex } from '../lib/motion';

const phases = [
  { name: 'Esamina', text: 'Mercato, problema e posizionamento.' },
  { name: 'Valida', text: 'Offerta, messaggio e risposta reale.' },
  { name: 'Ottimizza', text: 'Dati, lancio e crescita.' },
];

export function EvoMethodSequence() {
  const activeIndex = useAutoplayIndex(phases.length, 3200);

  return (
    <section id="metodo-evo" data-testid="home-section" data-animation="autoplay" className="evo-method">
      <div className="evo-method__stage container">
        <header><p className="eyebrow">Metodo EVO</p><h2>Dal punto di partenza alla crescita</h2><p>12 fasi operative accompagnano il lavoro, dentro tre passaggi chiari.</p></header>
        <ol className="evo-method__phases">
          {phases.map(({ name, text }, index) => (
            <motion.li key={name} data-active={activeIndex === index} animate={{ opacity: activeIndex === index ? 1 : 0, x: activeIndex === index ? 0 : 36, scale: activeIndex === index ? 1 : .94 }} transition={{ duration: .75, ease: 'easeInOut' }} style={{ zIndex: activeIndex === index ? 2 : 1 }}>
              <span aria-hidden="true">0{index + 1}</span><h3>{name}</h3><p>{text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
