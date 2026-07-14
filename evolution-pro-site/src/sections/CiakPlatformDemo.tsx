import { ArrowRight, Check, Circle, Play } from 'lucide-react';
import { motion } from 'framer-motion';

import { useAutoplayIndex, useMediaQuery } from '../lib/motion';
import { siteContent } from '../content/siteContent';

const demoStates = [
  {
    id: 'brainstorming',
    kicker: 'Agente AI',
    title: 'Brainstorming guidato',
    copy: 'Metti a fuoco un tema con domande mirate e indicazioni da rivedere insieme.',
  },
  {
    id: 'posizionamento',
    kicker: 'Posizionamento',
    title: 'Una direzione chiara',
    copy: 'Raccogli target, categoria e idea differenziante in un unico spazio di lavoro.',
  },
  {
    id: 'videocorso',
    kicker: 'Videocorso',
    title: 'La struttura, lezione per lezione',
    copy: 'Consulta moduli e lezioni prima di passare alla produzione dei contenuti.',
  },
  {
    id: 'avanzamento',
    kicker: 'Avanzamento',
    title: 'Ogni fase resta visibile',
    copy: 'Script, registrazione e funnel seguono un percorso ordinato e verificabile.',
  },
  {
    id: 'prossima-azione',
    kicker: 'Prossima azione',
    title: 'Sai sempre cosa viene dopo',
    copy: 'Rivedi il materiale disponibile e scegli quando approvarlo.',
  },
] as const;

function PlatformPanel({ state, index }: { state: (typeof demoStates)[number]; index: number }) {
  return (
    <article className="ciak-demo__panel">
      <div className="ciak-demo__panel-bar"><Circle aria-hidden="true" /><span>Ciak</span><span>Area partner</span></div>
      <div className="ciak-demo__panel-body">
        <aside aria-label="Navigazione dimostrativa"><span>Il tuo percorso</span><span>Scenario demo {index + 1} di 5</span></aside>
        <div className="ciak-demo__workspace">
          <p className="ciak-demo__kicker">{state.kicker}</p>
          <h3>{state.title}</h3>
          <p>{state.copy}</p>
          {state.id === 'avanzamento' && (
            <div className="ciak-demo__progress" aria-label="Esempio delle fasi operative">
              <span><Check aria-hidden="true" /> Script</span><span><Play aria-hidden="true" /> Registrazione</span><span><Circle aria-hidden="true" /> Funnel</span>
            </div>
          )}
          {state.id === 'prossima-azione' && <div className="ciak-demo__next"><strong>Prossima azione</strong><span>Rivedi e approva il materiale</span></div>}
        </div>
      </div>
    </article>
  );
}

function CiakScreen({ state, index, activeIndex, compact }: { state: (typeof demoStates)[number]; index: number; activeIndex: number; compact: boolean }) {
  const rawOffset = index - activeIndex;
  const offset = rawOffset > demoStates.length / 2 ? rawOffset - demoStates.length : rawOffset < -demoStates.length / 2 ? rawOffset + demoStates.length : rawOffset;
  const active = offset === 0;
  const animate = compact
    ? { x: active ? 0 : offset * 22, y: active ? 0 : 26, rotate: active ? 0 : offset * 2, scale: active ? 1 : .92, opacity: active ? 1 : .12 }
    : { x: offset * 180, y: Math.abs(offset) * 65, rotate: offset * 6, scale: active ? 1 : .76, opacity: active ? 1 : .2 };
  return <motion.li data-ciak-state={state.id} data-depth={index + 1} data-active={active} animate={animate} transition={{ duration: .85, ease: 'easeInOut' }} style={{ zIndex: active ? demoStates.length + 1 : demoStates.length - Math.abs(offset) }}>
    <PlatformPanel state={state} index={index} />
  </motion.li>;
}

export function CiakPlatformDemo() {
  const activeIndex = useAutoplayIndex(demoStates.length, 3600);
  const compact = useMediaQuery('(max-width: 39.99rem)');

  return (
    <section id="ciak" data-testid="home-section" data-animation="autoplay" className="ciak-demo" aria-labelledby="ciak-title">
      <div className="ciak-demo__stage container">
        <header className="ciak-demo__intro">
          <p className="eyebrow">La piattaforma operativa</p>
          <h2 id="ciak-title">Ciak: il lavoro prende forma</h2>
          <p>Il tuo percorso operativo continua su Ciak.</p>
          <a className="button button--primary" href={siteContent.primaryCta.href}>{siteContent.primaryCta.label} <ArrowRight aria-hidden="true" /></a>
        </header>
        <ol className="ciak-demo__collage" data-testid="ciak-collage" aria-label="Cinque momenti del percorso su Ciak">
          {demoStates.map((state, index) => (
            <CiakScreen key={state.id} state={state} index={index} activeIndex={activeIndex} compact={compact} />
          ))}
        </ol>
      </div>
    </section>
  );
}
