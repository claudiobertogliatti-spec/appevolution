import { useRef } from 'react';
import { motion, useReducedMotion, useTransform } from 'framer-motion';

import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';

const noise = ['Funnel', 'Ads', 'Automazioni', 'Videocorso'];

export function DirectionSequence() {
  const ref = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = Boolean(useReducedMotion() || useMediaQuery('(max-width: 59.99rem)'));
  const noiseOpacity = useTransform(progress, [0, 0.35], [1, 0]);
  const stopOpacity = useTransform(progress, [0.25, 0.48, 0.68], [0, 1, 0]);
  const finalOpacity = useTransform(progress, [0.58, 0.82], [0, 1]);

  return (
    <section ref={ref} className={`direction-sequence${staticMode ? ' direction-sequence--static' : ''}`} id="direzione" data-testid="home-section">
      <div className="direction-sequence__stage container">
        {staticMode && <p className="direction-sequence__premise">Gli strumenti funzionano quando seguono una scelta chiara.</p>}
        <motion.div className="direction-sequence__noise" style={staticMode ? undefined : { opacity: noiseOpacity }} aria-hidden={staticMode}>
          {noise.map((item) => <span key={item}>{item}</span>)}
        </motion.div>
        <motion.p className="direction-sequence__stop" style={staticMode ? undefined : { opacity: stopOpacity }}>
          Lo strumento senza direzione è solo rumore.
        </motion.p>
        <motion.h2 className="direction-sequence__final" style={staticMode ? undefined : { opacity: finalOpacity }}>
          Prima la <mark>direzione</mark>. Poi gli strumenti.
        </motion.h2>
      </div>
    </section>
  );
}
