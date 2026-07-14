import { motion } from 'framer-motion';

import { useAutoplaySequence } from '../lib/motion';

const noise = ['Funnel', 'Ads', 'Automazioni', 'Videocorso'];

export function DirectionSequence() {
  const { index: activeScene, reduced, interactionProps } = useAutoplaySequence(3, 4200);

  return (
    <section className="direction-sequence" id="direzione" data-testid="home-section" data-animation="autoplay">
      <div className="direction-sequence__stage container" {...interactionProps}>
        <motion.div hidden={activeScene !== 0} className="direction-sequence__noise" data-active={activeScene === 0} initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}>
          {noise.map((item) => <span key={item}>{item}</span>)}
        </motion.div>
        <motion.div hidden={activeScene !== 1} className="direction-sequence__stop" data-active={activeScene === 1} initial={reduced ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}>
          <p>Lo strumento senza direzione è solo rumore.</p>
          <video data-testid="direction-video" src="/video/direction-tools.mp4" muted loop autoPlay={!reduced} playsInline preload="metadata" aria-label="Gli strumenti digitali senza una direzione comune" />
        </motion.div>
        <motion.h2 hidden={activeScene !== 2} className="direction-sequence__final" data-active={activeScene === 2} initial={reduced ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}>
          Prima la <mark>direzione</mark>. Poi gli strumenti.
        </motion.h2>
        <ol className="sr-only" aria-label="Sequenza direzione e strumenti"><li>Funnel, Ads, Automazioni, Videocorso</li><li>Lo strumento senza direzione è solo rumore.</li><li>Prima la direzione. Poi gli strumenti.</li></ol>
      </div>
    </section>
  );
}
