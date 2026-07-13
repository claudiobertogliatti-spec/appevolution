import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';

import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';

const painPoints = [
  'vendi il tuo tempo',
  'riempi l’agenda',
  'aumenti il carico operativo',
  'provi strumenti senza un sistema',
  'resti economicamente fermo nonostante la competenza',
];

export function ProblemSequence() {
  const ref = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = useMediaQuery('(max-width: 39.99rem)');
  const conclusionOpacity = useTransform(progress, [0.65, 0.9], [0, 1]);

  return (
    <section ref={ref} className={`problem-sequence${staticMode ? ' problem-sequence--static' : ''}`} id="problema" data-testid="home-section">
      <div className="problem-sequence__stage container">
        <p className="eyebrow">Il problema</p>
        <ul aria-label="Problemi che bloccano la crescita">
          {painPoints.map((point) => <li key={point}>{point}</li>)}
        </ul>
        <motion.h2 style={staticMode ? undefined : { opacity: conclusionOpacity }}>
          Non ti manca la competenza. Ti manca un sistema.
        </motion.h2>
      </div>
    </section>
  );
}
