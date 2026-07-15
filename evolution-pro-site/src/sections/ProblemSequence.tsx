import { motion } from 'framer-motion';

import { useAutoplayIndex } from '../lib/motion';

const painPoints = [
  'vendi il tuo tempo',
  'riempi l’agenda',
  'aumenti il carico operativo',
  'provi strumenti senza un sistema',
  'resti economicamente fermo nonostante la competenza',
];

export function ProblemSequence() {
  const activePoint = useAutoplayIndex(painPoints.length + 1, 1500);

  return (
    <section className="problem-sequence" id="problema" data-testid="home-section" data-animation="autoplay">
      <div className="problem-sequence__stage container">
        <figure className="problem-sequence__visual"><img src="/visuals/problem-direction.webp" alt="Professionista bloccato tra strumenti e attività senza una direzione" loading="eager" decoding="async" /></figure>
        <div className="problem-sequence__content">
        <p className="eyebrow">Il problema comune al 95% della categoria</p>
        <ul aria-label="Problemi che bloccano la crescita">
          {painPoints.map((point, index) => <motion.li key={point} data-active={activePoint === index} animate={{ x: activePoint === index ? 14 : 0, opacity: activePoint === index ? 1 : .46, scale: activePoint === index ? 1.03 : 1 }} transition={{ duration: .5 }}>{point}</motion.li>)}
        </ul>
        <motion.h2 data-active={activePoint === painPoints.length} animate={{ opacity: activePoint === painPoints.length ? 1 : .48, scale: activePoint === painPoints.length ? 1.03 : 1 }} transition={{ duration: .55 }}>
          Non ti mancano gli Attestati: ti manca un sistema!
        </motion.h2>
        </div>
      </div>
    </section>
  );
}
