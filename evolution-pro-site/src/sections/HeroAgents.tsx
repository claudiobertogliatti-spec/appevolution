import { motion } from 'framer-motion';

import { siteContent } from '../content/siteContent';
import { useAutoplaySequence } from '../lib/motion';

type HeroProfile = { name: string; role: string; text: string; photo: string; ai: boolean };

// Team umano prima, poi gli agenti AI. Il badge "Agente AI" compare solo sugli agenti.
const profiles: HeroProfile[] = [
  ...siteContent.team.map((member) => ({
    name: member.name,
    role: member.role,
    text: member.description,
    photo: member.photo,
    ai: false,
  })),
  ...siteContent.agents.map((agent) => ({
    name: agent.name,
    role: agent.role,
    text: `Sono ${agent.name} e ${agent.message.charAt(0).toLowerCase() + agent.message.slice(1)}`,
    photo: `/agents/${agent.name.toLowerCase()}.jpg`,
    ai: true,
  })),
];

export function HeroAgents() {
  const { index: activeIndex, reduced, interactionProps } = useAutoplaySequence(profiles.length, 3500);
  const profile = profiles[activeIndex];

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
          <h1><span>La tua competenza{' '}</span><span>diventa un&rsquo;<span className="hero-agents__highlight">Accademia</span>{' '}</span><span>che vende.</span></h1>
          <p className="hero-agents__lead">
            Ma prima costruiamo la direzione giusta; senza quella, nessun corso, sessione o prodotto pu&ograve; vendere.
          </p>
          <p className="hero-agents__outcome">
            Alla fine hai: il tuo posizionamento, la tua Accademia e un sistema di vendita di tua propriet&agrave;.
          </p>
          <a className="button button--primary" href={siteContent.primaryCta.href}>
            {siteContent.primaryCta.label}
          </a>
        </div>

        <div className="hero-agents__visual" {...interactionProps}>
          <div className="hero-agents__shape" aria-hidden="true" />
          <motion.div
            key={profile.name}
            className="hero-agent"
            data-testid="active-hero-agent"
            data-agent={profile.name}
            initial={reduced ? false : { opacity: 0, scale: .9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: .55, ease: 'easeOut' }}
          >
            <img src={profile.photo} alt={`${profile.name}, ${profile.role}`} decoding="async" fetchPriority="high" />
            <div className="hero-agent__card">
              <strong>{profile.name}{profile.ai ? <span className="hero-agent__ai-tag">Agente AI</span> : null}</strong>
              <span>{profile.role}</span>
              <p>{profile.text}</p>
            </div>
          </motion.div>
          <ul className="sr-only" aria-label="Il team che ti accompagna">
            {profiles.map(({ name, role }) => <li key={name}>{name}, {role}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
