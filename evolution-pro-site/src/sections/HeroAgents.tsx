import { motion } from 'framer-motion';

import { siteContent } from '../content/siteContent';
import { useAutoplaySequence } from '../lib/motion';

const agentImage = (name: string) => `/agents/${name.toLowerCase()}.jpg`;

export function HeroAgents() {
  const { index: activeIndex, reduced, interactionProps } = useAutoplaySequence(siteContent.agents.length, 3500);
  const agent = siteContent.agents[activeIndex];

  return (
    <section
      id="hero"
      className={`hero-agents${reduced ? ' hero-agents--static' : ''}`}
      data-testid="home-section"
      data-animation="autoplay"
    >
      <div className="hero-agents__stage container">
        <div className="hero-agents__copy">
          <span className="hero-target-pill">PER CONSULENTI, COACH E PROFESSIONISTI</span>
          <h1><span>La tua{' '}</span><span>competenza{' '}</span><span>merita una{' '}</span><span className="hero-agents__highlight">direzione</span></h1>
          <p className="hero-agents__lead">
            Prima di costruire la tua Accademia Digitale, bisogna capire se hai la direzione corretta che può venderla.
          </p>
          <a className="button button--primary" href={siteContent.primaryCta.href}>
            {siteContent.primaryCta.label}
          </a>
        </div>

        <div className="hero-agents__visual" {...interactionProps}>
          <div className="hero-agents__shape" aria-hidden="true" />
          <motion.div
            key={agent.name}
            className="hero-agent"
            data-testid="active-hero-agent"
            data-agent={agent.name}
            initial={reduced ? false : { opacity: 0, scale: .9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: .55, ease: 'easeOut' }}
          >
            <img src={agentImage(agent.name)} alt={`${agent.name}, ${agent.role}`} decoding="async" fetchPriority="high" />
            <div className="hero-agent__card">
              <strong>{agent.name}</strong>
              <span>{agent.role}</span>
              <p>Sono {agent.name} e {agent.message.charAt(0).toLowerCase() + agent.message.slice(1)}</p>
            </div>
          </motion.div>
          <ul className="sr-only" aria-label="Il team che ti accompagna">
            {siteContent.agents.map(({ name, role }) => <li key={name}>{name}, {role}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
