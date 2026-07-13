import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion } from 'framer-motion';

import { siteContent } from '../content/siteContent';
import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';

const agentImage = (name: string) => `/agents/${name.toLowerCase()}.jpg`;

export function HeroAgents() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(sectionRef);
  const reduceMotion = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 59.99rem)');
  const staticMode = Boolean(reduceMotion || isMobile);
  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(progress, 'change', (value) => {
    const nextIndex = value >= 1 ? 5 : Math.min(5, Math.floor(value * 6));
    setActiveIndex(nextIndex);
  });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className={`hero-agents${staticMode ? ' hero-agents--static' : ''}`}
      data-testid="home-section"
    >
      <div className="hero-agents__stage container">
        <div className="hero-agents__copy">
          <p className="eyebrow">Evolution PRO</p>
          <h1>La tua competenza merita una <span>direzione.</span></h1>
          <p className="hero-agents__lead">
            Prima di costruire la tua Accademia Digitale, bisogna capire se esiste una direzione che può venderla.
          </p>
          <a className="button button--primary" href={siteContent.primaryCta.href}>
            {siteContent.primaryCta.label}
          </a>
        </div>

        <div className="hero-agents__visual">
          <div className="hero-agents__shape" aria-hidden="true" />
          <ul className="hero-agents__cluster" aria-label="Il team che ti accompagna">
            {siteContent.agents.map((agent, index) => {
              const active = staticMode || index === activeIndex;
              return (
                <motion.li
                  className="hero-agent"
                  data-active={active}
                  key={agent.name}
                  animate={staticMode ? undefined : { opacity: active ? 1 : 0.42, scale: active ? 1 : 0.78 }}
                  transition={staticMode ? undefined : { duration: 0.25 }}
                >
                  <img src={agentImage(agent.name)} alt={`${agent.name}, ${agent.role}`} />
                  <div className="hero-agent__card">
                    <strong>{agent.name}</strong>
                    <span>{agent.role}</span>
                    <p>Sono {agent.name} e {agent.message.charAt(0).toLowerCase() + agent.message.slice(1)}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
