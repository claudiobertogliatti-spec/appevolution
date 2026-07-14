import { motion } from 'framer-motion';

import { siteContent } from '../content/siteContent';
import { useAutoplayIndex } from '../lib/motion';

const agentImage = (name: string) => `/agents/${name.toLowerCase()}.jpg`;

export function HeroAgents() {
  const activeIndex = useAutoplayIndex(siteContent.agents.length, 3500);

  return (
    <section
      id="hero"
      className="hero-agents"
      data-testid="home-section"
      data-animation="autoplay"
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
              const active = index === activeIndex;
              return (
                <motion.li
                  className="hero-agent"
                  data-active={active}
                  key={agent.name}
                  animate={{ opacity: active ? 1 : 0.3, scale: active ? 1 : 0.78, rotate: active ? 0 : index % 2 ? 3 : -3 }}
                  transition={{ duration: 0.65, ease: 'easeInOut' }}
                >
                  <img
                    src={agentImage(agent.name)}
                    alt={`${agent.name}, ${agent.role}`}
                    decoding="async"
                    loading={index === 0 ? undefined : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : undefined}
                  />
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
