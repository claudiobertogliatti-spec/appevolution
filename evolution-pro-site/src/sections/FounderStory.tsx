import { motion } from 'framer-motion';

import { useAutoplayIndex } from '../lib/motion';

const milestones = [
  { value: '20+', label: 'anni nella vendita e nel marketing' },
  { value: '13', label: 'settori' },
  { value: '25.000+', label: 'trattative' },
  { value: '€6M+', label: 'di vendite' },
  { value: '7', label: 'anni nelle Accademie Digitali' },
];

export function FounderStory() {
  const activeBeat = useAutoplayIndex(5, 3800);
  const scene = (index: number) => ({
    'data-active': activeBeat === index,
    animate: { opacity: activeBeat === index ? 1 : 0, scale: activeBeat === index ? 1 : .94, x: activeBeat === index ? 0 : index % 2 ? 24 : -24 },
    transition: { duration: .8, ease: 'easeInOut' as const },
  });

  return (
    <section id="claudio" data-testid="home-section" data-animation="autoplay" className="founder-story">
      <div className="founder-story__stage container">
        <motion.div data-beat="introduzione" className="founder-story__portrait" {...scene(0)}>
          <img src="/founder/claudio-portrait-640.webp" srcSet="/founder/claudio-portrait-640.webp 640w, /founder/claudio-portrait-1024.webp 1024w" sizes="(min-width: 60rem) 50vw, 100vw" width="1024" height="1536" loading="lazy" decoding="async" alt="Claudio Bertogliatti, fondatore di Evolution PRO" />
          <div><p className="eyebrow">La mia storia</p><h2>Mi chiamo Claudio Bertogliatti</h2></div>
        </motion.div>

        <motion.div data-beat="storia" className="founder-story__story" {...scene(1)}>
          <p>Da oltre 20 anni lavoro nella vendita e nel marketing, attraversando 13 settori e più di 25.000 trattative.</p>
          <p>Negli ultimi 7 anni nelle Accademie Digitali ho visto professionisti competenti perdere tempo, energia e denaro costruendo corsi senza una struttura.</p>
        </motion.div>

        <motion.ul data-beat="numeri" className="founder-story__numbers" {...scene(2)} aria-label="Esperienza professionale">
          {milestones.map(({ value, label }) => <li key={label}><strong>{value}</strong><span>{label}</span></li>)}
        </motion.ul>

        <motion.div data-beat="ufficio" className="founder-story__office" {...scene(3)}>
          <img src="/founder/claudio-office-640.webp" srcSet="/founder/claudio-office-640.webp 640w, /founder/claudio-office-1280.webp 1280w" sizes="(min-width: 75rem) 1200px, 100vw" width="1536" height="1024" loading="lazy" decoding="async" alt="Claudio Bertogliatti al lavoro nel suo ufficio" />
        </motion.div>

        <motion.div data-beat="partner-operativo" className="founder-story__conclusion" {...scene(4)}>
          <p>Evolution PRO nasce per risolvere questo problema.</p>
          <p>Non come agenzia tradizionale, ma come partner operativo al tuo fianco.</p>
        </motion.div>
      </div>
    </section>
  );
}
