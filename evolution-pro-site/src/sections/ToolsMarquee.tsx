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
    ? { opacity: active ? 1 : 0, scale: active ? 1 : .82, y: active ? 0 : 18 }
    : { x: offset * 120, y: distance * 22, rotate: offset * 6, scale: active ? 1.28 : Math.max(.66, .9 - distance * .06), opacity: distance <= 4 ? (active ? 1 : .72) : .08 };
  return <motion.li data-testid="tool-card" data-active={active} className="tools-cinematic__card" animate={animate} transition={{ duration: .75, ease: 'easeInOut' }} style={{ zIndex: total - distance }}>
    <img className="tools-cinematic__logo" src={tool.logo} alt={`Logo ${tool.name}`} loading="lazy" decoding="async" />
    <strong>{tool.name}</strong><small>{descriptions[tool.name]}</small>
  </motion.li>;
}

export function ToolsMarquee() {
  const activeIndex = useAutoplayIndex(siteContent.tools.length, 1800);
  const compact = useMediaQuery('(max-width: 39.99rem)');
  return <section id="strumenti" data-testid="home-section" data-animation="autoplay" className="tools-cinematic">
    <div className="tools-cinematic__stage container">
      <header><p className="eyebrow">Strumenti</p><h2>Gli strumenti giusti, già collegati.</h2><p>Non una collezione di software. Un ecosistema che lavora nella stessa direzione.</p></header>
      <div className="tools-laptop" data-testid="tools-laptop">
        <img className="tools-laptop__image" data-testid="tools-laptop-image" src="/visuals/tools-laptop-cutout.webp" alt="Computer portatile con gli strumenti Evolution PRO" />
        <div className="tools-laptop__screen">
          <img className="tools-laptop__brand" data-testid="tools-laptop-brand" src="/brand/evolution-pro-logo-transparent.webp" alt="Logo Evolution PRO nel computer" decoding="async" />
          <ul className="tools-cinematic__fan" aria-label="Strumenti collegati">
            {siteContent.tools.map((tool, index) => <ToolCard key={tool.name} tool={tool} index={index} total={siteContent.tools.length} activeIndex={activeIndex} compact={compact} />)}
          </ul>
        </div>
      </div>
    </div>
  </section>;
}
