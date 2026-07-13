import { useRef } from 'react';
import { motion, useReducedMotion, useTransform } from 'framer-motion';

import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';

const milestones = [
  { value: '20+', label: 'anni nella vendita e nel marketing' },
  { value: '13', label: 'settori' },
  { value: '25.000+', label: 'trattative' },
  { value: '€6M+', label: 'di vendite' },
  { value: '7', label: 'anni nelle Accademie Digitali' },
];

export function FounderStory() {
  const ref = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = Boolean(useReducedMotion() || useMediaQuery('(max-width: 59.99rem)'));
  const portraitOpacity = useTransform(progress, [0, 0.22], [1, 0]);
  const storyOpacity = useTransform(progress, [0.12, 0.3, 0.46], [0, 1, 0]);
  const numbersOpacity = useTransform(progress, [0.38, 0.55, 0.7], [0, 1, 0]);
  const officeOpacity = useTransform(progress, [0.62, 0.75, 0.84], [0, 1, 0]);
  const conclusionOpacity = useTransform(progress, [0.8, 0.96], [0, 1]);

  return (
    <section ref={ref} id="claudio" data-testid="home-section" className={`founder-story${staticMode ? ' founder-story--static' : ''}`}>
      <div className="founder-story__stage container">
        <motion.div data-beat="introduzione" className="founder-story__portrait" style={staticMode ? undefined : { opacity: portraitOpacity }}>
          <img src="/founder/claudio-portrait-640.webp" srcSet="/founder/claudio-portrait-640.webp 640w, /founder/claudio-portrait-1024.webp 1024w" sizes="(min-width: 60rem) 50vw, 100vw" width="1024" height="1536" loading="lazy" decoding="async" alt="Claudio Bertogliatti, fondatore di Evolution PRO" />
          <div><p className="eyebrow">La mia storia</p><h2>Mi chiamo Claudio Bertogliatti</h2></div>
        </motion.div>

        <motion.div data-beat="storia" className="founder-story__story" style={staticMode ? undefined : { opacity: storyOpacity }}>
          <p>Da oltre 20 anni lavoro nella vendita e nel marketing, attraversando 13 settori e più di 25.000 trattative.</p>
          <p>Negli ultimi 7 anni nelle Accademie Digitali ho visto professionisti competenti perdere tempo, energia e denaro costruendo corsi senza una struttura.</p>
        </motion.div>

        <motion.ul data-beat="numeri" className="founder-story__numbers" style={staticMode ? undefined : { opacity: numbersOpacity }} aria-label="Esperienza professionale">
          {milestones.map(({ value, label }) => <li key={label}><strong>{value}</strong><span>{label}</span></li>)}
        </motion.ul>

        <motion.div data-beat="ufficio" className="founder-story__office" style={staticMode ? undefined : { opacity: officeOpacity }}>
          <img src="/founder/claudio-office-640.webp" srcSet="/founder/claudio-office-640.webp 640w, /founder/claudio-office-1280.webp 1280w" sizes="(min-width: 75rem) 1200px, 100vw" width="1536" height="1024" loading="lazy" decoding="async" alt="Claudio Bertogliatti al lavoro nel suo ufficio" />
        </motion.div>

        <motion.div data-beat="partner-operativo" className="founder-story__conclusion" style={staticMode ? undefined : { opacity: conclusionOpacity }}>
          <p>Evolution PRO nasce per risolvere questo problema.</p>
          <p>Non come agenzia tradizionale, ma come partner operativo al tuo fianco.</p>
        </motion.div>
      </div>
    </section>
  );
}
