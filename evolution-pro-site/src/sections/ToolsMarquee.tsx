import { useRef } from 'react';
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion';
import { siteContent, type Tool } from '../content/siteContent';
import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';

const descriptions: Record<string, string> = {
  'Systeme.io': 'Funnel e automazioni', Stripe: 'Pagamenti', 'Cal.com': 'Prenotazioni',
  Vercel: 'Esperienze web', 'Google Cloud': 'Infrastruttura', Meta: 'Acquisizione',
  YouTube: 'Distribuzione video', ElevenLabs: 'Voce AI', Anthropic: 'Intelligenza artificiale',
  Descript: 'Editing contenuti', Canva: 'Design visuale', HeyGen: 'Avatar e video AI',
};

function ToolCard({ tool, index, total, progress, staticMode }: { tool: Tool; index: number; total: number; progress: MotionValue<number>; staticMode: boolean }) {
  const fan = index - (total - 1) / 2;
  const focus = (index + 0.5) / total;
  const width = 0.085;
  const x = useTransform(progress, [0, .18, Math.max(.2, focus - width), focus, Math.min(.92, focus + width), 1], [fan * 180, fan * 74, fan * 74, 0, fan * 74, fan * 105]);
  const y = useTransform(progress, [0, .18, focus, 1], [180 + Math.abs(fan) * 16, Math.abs(fan) * 18, -30, 130]);
  const rotate = useTransform(progress, [0, .18, focus, 1], [fan * 9, fan * 5, 0, fan * 7]);
  const scale = useTransform(progress, [Math.max(.18, focus - width), focus, Math.min(.92, focus + width)], [.82, 1.42, .82]);
  const opacity = useTransform(progress, [0, .12, .92, 1], [0, 1, 1, .35]);
  return <motion.li data-testid="tool-card" className="tools-cinematic__card" style={staticMode ? undefined : { x, y, rotate, scale, opacity }}>
    <span className="tools-cinematic__mark" aria-hidden="true">{tool.name.slice(0, 2)}</span>
    <strong>{tool.name}</strong><small>{descriptions[tool.name]}</small>
  </motion.li>;
}

export function ToolsMarquee() {
  const ref = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = useMediaQuery('(max-width: 39.99rem)');
  useMotionValueEvent(progress, 'change', value => ref.current?.style.setProperty('--scroll-progress', value.toFixed(3)));
  return <section ref={ref} id="strumenti" data-testid="home-section" data-scroll-linked="true" className={`tools-cinematic${staticMode ? ' tools-cinematic--static' : ''}`}>
    <div className="tools-cinematic__stage container">
      <header><p className="eyebrow">Strumenti</p><h2>Gli strumenti giusti, già collegati.</h2><p>Non una collezione di software. Un ecosistema che lavora nella stessa direzione.</p></header>
      <ul className="tools-cinematic__fan" aria-label="Strumenti collegati">
        {siteContent.tools.map((tool, index) => <ToolCard key={tool.name} tool={tool} index={index} total={siteContent.tools.length} progress={progress} staticMode={staticMode} />)}
      </ul>
    </div>
  </section>;
}
