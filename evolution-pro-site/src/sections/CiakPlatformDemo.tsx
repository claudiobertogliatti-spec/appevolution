import { useRef } from 'react';
import { ArrowRight, Check, Circle, Play } from 'lucide-react';
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion';

import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';
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

function CiakScreen({ state, index, progress, staticMode }: { state: (typeof demoStates)[number]; index: number; progress: MotionValue<number>; staticMode: boolean }) {
  const center = index / (demoStates.length - 1);
  const start = Math.max(0, center - .18);
  const end = Math.min(1, center + .18);
  const side = index % 2 ? 1 : -1;
  const x = useTransform(progress, [start, center, end], [side * 330, 0, side * -180]);
  const y = useTransform(progress, [start, center, end], [140 + index * 20, 0, -90]);
  const rotate = useTransform(progress, [start, center, end], [side * 11, 0, side * -5]);
  const scale = useTransform(progress, [start, center, end], [.68, 1, .78]);
  const opacity = useTransform(progress, [start, Math.min(center + .01, 1), end], [.18, 1, .28]);
  return <motion.li data-ciak-state={state.id} data-depth={index + 1} style={staticMode ? undefined : { x, y, rotate, scale, opacity, zIndex: demoStates.length - index }}>
    <PlatformPanel state={state} index={index} />
  </motion.li>;
}

export function CiakPlatformDemo() {
  const ref = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = useMediaQuery('(max-width: 59.99rem)');
  useMotionValueEvent(progress, 'change', value => ref.current?.style.setProperty('--scroll-progress', value.toFixed(3)));

  return (
    <section ref={ref} id="ciak" data-testid="home-section" className={`ciak-demo${staticMode ? ' ciak-demo--static' : ''}`} aria-labelledby="ciak-title">
      <div className="ciak-demo__stage container">
        <header className="ciak-demo__intro">
          <p className="eyebrow">La piattaforma operativa</p>
          <h2 id="ciak-title">Ciak: il lavoro prende forma</h2>
          <p>Il tuo percorso operativo continua su Ciak.</p>
          <a className="button button--primary" href={siteContent.primaryCta.href}>{siteContent.primaryCta.label} <ArrowRight aria-hidden="true" /></a>
        </header>
        <ol className="ciak-demo__collage" data-testid="ciak-collage" data-scroll-linked="true" aria-label="Cinque momenti del percorso su Ciak">
          {demoStates.map((state, index) => (
            <CiakScreen key={state.id} state={state} index={index} progress={progress} staticMode={staticMode} />
          ))}
        </ol>
      </div>
    </section>
  );
}
