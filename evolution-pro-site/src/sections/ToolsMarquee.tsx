import { motion } from 'framer-motion';
import { siteContent, type Tool } from '../content/siteContent';
import { useAutoplayIndex, useMediaQuery } from '../lib/motion';

const descriptions: Record<string, string> = {
  'Systeme.io': 'Funnel e automazioni', Stripe: 'Pagamenti', 'Cal.com': 'Prenotazioni',
  Vercel: 'Esperienze web', 'Google Cloud': 'Infrastruttura', Meta: 'Acquisizione',
  YouTube: 'Distribuzione video', ElevenLabs: 'Voce AI', Anthropic: 'Intelligenza artificiale',
  Descript: 'Editing contenuti', Canva: 'Design visuale', HeyGen: 'Avatar e video AI',
};

function ToolCard({ tool, index, total, activeIndex, compact }: { tool: Tool; index: number; total: number; activeIndex: number; compact: boolean }) {
  const rawOffset = index - activeIndex;
  const offset = rawOffset > total / 2 ? rawOffset - total : rawOffset < -total / 2 ? rawOffset + total : rawOffset;
  const distance = Math.abs(offset);
  const active = offset === 0;
  const animate = compact
    ? { opacity: active ? 1 : .42, scale: active ? 1.04 : .94, y: active ? -8 : 0 }
    : { x: offset * 120, y: distance * 22, rotate: offset * 6, scale: active ? 1.28 : Math.max(.66, .9 - distance * .06), opacity: distance <= 4 ? (active ? 1 : .72) : .08 };
  return <motion.li data-testid="tool-card" data-active={active} className="tools-cinematic__card" animate={animate} transition={{ duration: .75, ease: 'easeInOut' }} style={{ zIndex: total - distance }}>
    <span className="tools-cinematic__mark" aria-hidden="true">{tool.name.slice(0, 2)}</span>
    <strong>{tool.name}</strong><small>{descriptions[tool.name]}</small>
  </motion.li>;
}

export function ToolsMarquee() {
  const activeIndex = useAutoplayIndex(siteContent.tools.length, 1800);
  const compact = useMediaQuery('(max-width: 39.99rem)');
  return <section id="strumenti" data-testid="home-section" data-animation="autoplay" className="tools-cinematic">
    <div className="tools-cinematic__stage container">
      <header><p className="eyebrow">Strumenti</p><h2>Gli strumenti giusti, già collegati.</h2><p>Non una collezione di software. Un ecosistema che lavora nella stessa direzione.</p></header>
      <ul className="tools-cinematic__fan" aria-label="Strumenti collegati">
        {siteContent.tools.map((tool, index) => <ToolCard key={tool.name} tool={tool} index={index} total={siteContent.tools.length} activeIndex={activeIndex} compact={compact} />)}
      </ul>
    </div>
  </section>;
}
