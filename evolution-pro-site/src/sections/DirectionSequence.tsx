import { motion } from 'framer-motion';

import { useAutoplayIndex } from '../lib/motion';

const noise = ['Funnel', 'Ads', 'Automazioni', 'Videocorso'];

export function DirectionSequence() {
  const activeScene = useAutoplayIndex(3, 2600);

  return (
    <section className="direction-sequence" id="direzione" data-testid="home-section" data-animation="autoplay">
      <div className="direction-sequence__stage container">
        <motion.div className="direction-sequence__noise" data-active={activeScene === 0} animate={{ opacity: activeScene === 0 ? 1 : 0, scale: activeScene === 0 ? 1 : .88 }} transition={{ duration: .7 }} aria-hidden={activeScene !== 0}>
          {noise.map((item) => <span key={item}>{item}</span>)}
        </motion.div>
        <motion.p className="direction-sequence__stop" data-active={activeScene === 1} animate={{ opacity: activeScene === 1 ? 1 : 0, scale: activeScene === 1 ? 1 : .88 }} transition={{ duration: .7 }}>
          Lo strumento senza direzione è solo rumore.
        </motion.p>
        <motion.h2 className="direction-sequence__final" data-active={activeScene === 2} animate={{ opacity: activeScene === 2 ? 1 : 0, scale: activeScene === 2 ? 1 : .88 }} transition={{ duration: .7 }}>
          Prima la <mark>direzione</mark>. Poi gli strumenti.
        </motion.h2>
      </div>
    </section>
  );
}
