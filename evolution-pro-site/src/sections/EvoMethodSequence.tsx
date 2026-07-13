import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';

import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';

const phases = [
  { name: 'Esamina', text: 'Mercato, problema e posizionamento.' },
  { name: 'Valida', text: 'Offerta, messaggio e risposta reale.' },
  { name: 'Ottimizza', text: 'Dati, lancio e crescita.' },
];

export function EvoMethodSequence() {
  const ref = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = useMediaQuery('(max-width: 59.99rem)');
  const active = [
    useTransform(progress, [0, 0.28, 0.42], [1, 1, 0]),
    useTransform(progress, [0.28, 0.5, 0.7], [0, 1, 0]),
    useTransform(progress, [0.58, 0.82], [0, 1]),
  ];

  return (
    <section ref={ref} id="metodo-evo" data-testid="home-section" className={`evo-method${staticMode ? ' evo-method--static' : ''}`}>
      <div className="evo-method__stage container">
        <header><p className="eyebrow">Metodo EVO</p><h2>Dal punto di partenza alla crescita</h2><p>12 fasi operative accompagnano il lavoro, dentro tre passaggi chiari.</p></header>
        <ol className="evo-method__phases">
          {phases.map(({ name, text }, index) => (
            <motion.li key={name} style={staticMode ? undefined : { opacity: active[index] }}>
              <span aria-hidden="true">0{index + 1}</span><h3>{name}</h3><p>{text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
