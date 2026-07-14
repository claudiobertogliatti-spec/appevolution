import { motion } from 'framer-motion';

import { useAutoplaySequence } from '../lib/motion';

const milestones = [
  { value: '20+', label: 'anni nella vendita e nel marketing' },
  { value: '13', label: 'settori' },
  { value: '25.000+', label: 'trattative' },
  { value: '€6M+', label: 'di vendite' },
  { value: '7', label: 'anni nelle Accademie Digitali' },
];

export function FounderStory() {
  const { index: activeBeat, reduced, interactionProps } = useAutoplaySequence(5, 6000);
  const scene = { initial: reduced ? false : { opacity: 0, scale: .96, y: 18 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { duration: .65, ease: 'easeOut' as const } };

  return (
    <section id="claudio" data-testid="home-section" data-animation="autoplay" className="founder-story">
      <div className="founder-story__stage container" {...interactionProps}>
        {activeBeat === 0 && <motion.div key="introduzione" data-active-founder-beat="introduzione" className="founder-story__portrait" {...scene}>
          <img className="founder-story__portrait-image" src="/founder/claudio-portrait-640.webp" srcSet="/founder/claudio-portrait-640.webp 640w, /founder/claudio-portrait-1024.webp 1024w" sizes="(min-width: 60rem) 50vw, 100vw" width="1024" height="1536" loading="lazy" decoding="async" alt="Claudio Bertogliatti, fondatore di Evolution PRO" />
          <div><p className="eyebrow">La mia storia</p><h2>Mi chiamo Claudio Bertogliatti</h2></div>
        </motion.div>}

        {activeBeat === 1 && <motion.div key="storia" data-active-founder-beat="storia" className="founder-story__story" {...scene}>
          <p>Da oltre 20 anni lavoro nella vendita e nel marketing, attraversando 13 settori e più di 25.000 trattative.</p>
          <p>Negli ultimi 7 anni nelle Accademie Digitali ho visto professionisti competenti perdere tempo, energia e denaro costruendo corsi senza una struttura.</p>
        </motion.div>}

        {activeBeat === 2 && <motion.ul key="numeri" data-active-founder-beat="numeri" className="founder-story__numbers" {...scene} aria-label="Esperienza professionale">
          {milestones.map(({ value, label }) => <li key={label}><strong>{value}</strong><span>{label}</span></li>)}
        </motion.ul>}

        {activeBeat === 3 && <motion.div key="ufficio" data-active-founder-beat="ufficio" className="founder-story__office" {...scene}>
          <img src="/founder/claudio-office-640.webp" srcSet="/founder/claudio-office-640.webp 640w, /founder/claudio-office-1280.webp 1280w" sizes="(min-width: 75rem) 1200px, 100vw" width="1536" height="1024" loading="lazy" decoding="async" alt="Claudio Bertogliatti al lavoro nel suo ufficio" />
        </motion.div>}

        {activeBeat === 4 && <motion.div key="partner-operativo" data-active-founder-beat="partner-operativo" className="founder-story__conclusion" {...scene}>
          <p>Evolution PRO nasce per risolvere questo problema.</p>
          <p>Non come agenzia tradizionale, ma come partner operativo al tuo fianco.</p>
        </motion.div>}
        <img hidden src="/founder/claudio-office-640.webp" srcSet="/founder/claudio-office-640.webp 640w, /founder/claudio-office-1280.webp 1280w" sizes="(min-width: 75rem) 1200px, 100vw" width="1536" height="1024" loading="lazy" decoding="async" alt="Claudio Bertogliatti al lavoro nel suo ufficio" />
        <ul className="sr-only" aria-label="Esperienza professionale completa">{milestones.map(({ value, label }) => <li key={label}><span>{value}</span>: {label}</li>)}</ul>
        <ol className="sr-only" aria-label="Sequenza della storia"><li>introduzione</li><li>storia</li><li>numeri</li><li>ufficio</li><li>partner operativo</li></ol>
      </div>
    </section>
  );
}
