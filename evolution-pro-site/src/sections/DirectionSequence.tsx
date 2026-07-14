import { motion } from 'framer-motion';
import { CirclePlay, Filter, Megaphone, Workflow } from 'lucide-react';

import { useAutoplaySequence } from '../lib/motion';

const noise = [
  { label: 'Funnel', Icon: Filter },
  { label: 'Ads', Icon: Megaphone },
  { label: 'Automazioni', Icon: Workflow },
  { label: 'Videocorso', Icon: CirclePlay },
];

const principle = 'Senza una direzione, gli strumenti implementati nella tua attività, fanno solo rumore.';

export function DirectionSequence() {
  const { index: activeScene, reduced, interactionProps } = useAutoplaySequence(3, 4200);

  return (
    <section className="direction-sequence" id="direzione" data-testid="home-section" data-animation="autoplay">
      <video data-testid="direction-background-video" className="direction-sequence__background" src="/video/direction-background.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} />
      <div className="direction-sequence__overlay" aria-hidden="true" />
      <div className="direction-sequence__stage container" {...interactionProps}>
        {activeScene === 0 && <motion.div data-direction-scene="noise" className="direction-sequence__noise" initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}>
          {noise.map(({ label, Icon }) => <span key={label}><Icon data-testid="direction-noise-icon" aria-hidden="true" strokeWidth={2.4} />{label}</span>)}
        </motion.div>}
        {activeScene === 1 && <motion.div data-direction-scene="principio" className="direction-sequence__stop" initial={reduced ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}>
          <p>{principle}</p>
        </motion.div>}
        {activeScene === 2 && <motion.h2 data-direction-scene="direzione" className="direction-sequence__final" initial={reduced ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}>
          Prima la <mark>direzione</mark>. Poi gli strumenti.
        </motion.h2>}
        <ol className="sr-only" aria-label="Sequenza direzione e strumenti"><li>Funnel, Ads, Automazioni, Videocorso</li><li>{principle}</li><li>Prima la direzione. Poi gli strumenti.</li></ol>
      </div>
    </section>
  );
}
