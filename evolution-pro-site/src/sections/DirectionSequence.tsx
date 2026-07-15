import { motion } from 'framer-motion';

import { useAutoplaySequence } from '../lib/motion';

const principle = 'Senza una direzione, gli strumenti implementati nella tua attività, fanno solo rumore.';

const YT_ID = 'FGMqGHNmI14';
const YT_SRC = `https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&mute=1&loop=1&playlist=${YT_ID}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&fs=0&iv_load_policy=3`;

export function DirectionSequence() {
  const { index: activeScene, interactionProps } = useAutoplaySequence(2, 4600);

  return (
    <section className="direction-sequence" id="direzione" data-testid="home-section" data-animation="autoplay">
      <div className="direction-sequence__background" aria-hidden="true">
        <iframe
          data-testid="direction-background-video"
          src={YT_SRC}
          title="Sfondo Evolution PRO"
          allow="autoplay; encrypted-media"
          frameBorder="0"
          tabIndex={-1}
        />
      </div>
      <div className="direction-sequence__overlay" aria-hidden="true" />
      <div className="direction-sequence__stage container" {...interactionProps}>
        {activeScene === 0 && <motion.div data-direction-scene="principio" className="direction-sequence__stop" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}>
          <p>{principle}</p>
        </motion.div>}
        {activeScene === 1 && <motion.h2 data-direction-scene="direzione" className="direction-sequence__final" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}>
          Prima la <mark>direzione</mark>. Poi gli strumenti.
        </motion.h2>}
        <ol className="sr-only" aria-label="Sequenza direzione e strumenti"><li>{principle}</li><li>Prima la direzione. Poi gli strumenti.</li></ol>
      </div>
    </section>
  );
}
