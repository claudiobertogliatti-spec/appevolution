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
  const active = useAutoplayIndex(milestones.length, 1800);

  return (
    <section id="claudio" data-testid="home-section" data-animation="autoplay" className="founder-story">
      <div className="founder-story__stage container">
        <figure className="founder-story__visual">
          <img className="founder-story__portrait-image" src="/founder/claudio-portrait-640.webp" srcSet="/founder/claudio-portrait-640.webp 640w, /founder/claudio-portrait-1024.webp 1024w" sizes="(min-width: 60rem) 45vw, 100vw" width="1024" height="1536" loading="lazy" decoding="async" alt="Claudio Bertogliatti, fondatore di Evolution PRO" />
        </figure>
        <div className="founder-story__content">
          <p className="eyebrow">La mia storia</p>
          <h2>Mi chiamo Claudio Bertogliatti</h2>
          <ul className="founder-story__numbers" aria-label="Esperienza professionale">
            {milestones.map(({ value, label }, index) => (
              <motion.li key={label} data-active={active === index} animate={{ opacity: active === index ? 1 : .42, scale: active === index ? 1.04 : 1, x: active === index ? 6 : 0 }} transition={{ duration: .5 }}>
                <strong>{value}</strong>
                <span>{label}</span>
              </motion.li>
            ))}
          </ul>
          <div className="founder-story__text">
            <p>Da oltre 20 anni lavoro nella vendita e nel marketing, attraversando 13 settori e più di 25.000 trattative. Negli ultimi 7 anni nelle Accademie Digitali ho visto professionisti competenti perdere tempo, energia e denaro costruendo corsi senza una struttura.</p>
            <p>Evolution PRO nasce per risolvere questo: non come agenzia tradizionale, ma come partner operativo al tuo fianco.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
