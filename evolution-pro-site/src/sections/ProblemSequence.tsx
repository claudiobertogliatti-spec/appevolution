import { motion } from 'framer-motion';

import { useAutoplayIndex } from '../lib/motion';

const painPoints = [
  'vendi il tuo tempo',
  'riempi l’agenda',
  'aumenti il carico operativo',
  'provi strumenti senza un sistema',
  'resti economicamente fermo nonostante la competenza',
];

const thoughts = [
  '“Non ho un pubblico.”',
  '“Non sono un tecnico.”',
  '“Non ho tempo.”',
  '“Non voglio dipendere da un’agenzia.”',
  '“Non so se le mie competenze sono vendibili.”',
];

export function ProblemSequence() {
  const activePoint = useAutoplayIndex(painPoints.length + 1, 1500);

  return (
    <section className="problem-sequence" id="problema" data-testid="home-section" data-animation="autoplay">
      <div className="problem-sequence__stage container">
        <figure className="problem-sequence__visual"><img src="/visuals/problem-direction.webp" alt="Professionista bloccato tra strumenti e attività senza una direzione" loading="eager" decoding="async" /></figure>
        <div className="problem-sequence__content">
        <h2 className="problem-sequence__title">Il problema comune al 95% dei professionisti</h2>
        <div className="problem-sequence__group">
          <p className="problem-sequence__group-title">Ciò che fai</p>
          <ul aria-label="Ciò che fai">
            {painPoints.map((point, index) => <motion.li key={point} data-active={activePoint === index} animate={{ x: activePoint === index ? 14 : 0, opacity: activePoint === index ? 1 : .46, scale: activePoint === index ? 1.03 : 1 }} transition={{ duration: .5 }}>{point}</motion.li>)}
          </ul>
        </div>
        <div className="problem-sequence__group">
          <p className="problem-sequence__group-title">Ciò che pensi</p>
          <ul className="problem-sequence__list--thoughts" aria-label="Ciò che pensi">
            {thoughts.map((thought, index) => <motion.li key={thought} data-active={activePoint === index} animate={{ x: activePoint === index ? 14 : 0, opacity: activePoint === index ? 1 : .46, scale: activePoint === index ? 1.03 : 1 }} transition={{ duration: .5 }}>{thought}</motion.li>)}
          </ul>
        </div>
        <motion.h2 className="problem-sequence__punchline" data-active={activePoint === painPoints.length} animate={{ opacity: activePoint === painPoints.length ? 1 : .48, scale: activePoint === painPoints.length ? 1.03 : 1 }} transition={{ duration: .55 }}>
          Non ti mancano gli Attestati<br />
          <span className="hero-agents__highlight">TI MANCA UN SISTEMA!</span>
        </motion.h2>
        </div>
      </div>
    </section>
  );
}
