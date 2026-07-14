import { Bot, CheckCircle2, LayoutDashboard, Users } from 'lucide-react';

const systemSteps = [
  {
    id: 'piattaforma',
    label: 'Piattaforma',
    text: 'Organizza il percorso, i task e l’avanzamento.',
    Icon: LayoutDashboard,
  },
  {
    id: 'agenti-ai',
    label: 'Agenti AI',
    text: 'Supportano brainstorming e decisioni specifiche.',
    Icon: Bot,
  },
  {
    id: 'team-umano',
    label: 'Team Evolution PRO',
    text: 'Supervisione umana su strategia, direzione e crescita.',
    Icon: Users,
  },
  {
    id: 'partner',
    label: 'Tu, il partner',
    text: 'Approvi il lavoro e prendi le decisioni.',
    Icon: CheckCircle2,
  },
] as const;

export function HumanAiSystem() {
  return (
    <section id="sistema" data-testid="home-section" className="human-ai section" aria-labelledby="human-ai-title">
      <div className="container human-ai__layout">
        <figure className="human-ai__visual"><img src="/visuals/human-ai-system.webp" alt="Collaborazione tra persone e intelligenza artificiale nel lavoro quotidiano" loading="eager" decoding="async" /></figure>
        <div className="human-ai__content"><header className="human-ai__intro">
          <p className="eyebrow">Persone, metodo, tecnologia</p>
          <h2 id="human-ai-title">Un sistema umano, potenziato dall’AI</h2>
          <p>L’AI non sostituisce il team. Rende più ordinato e continuo il lavoro che facciamo insieme.</p>
        </header>

        <ol className="human-ai__steps" aria-label="Come funziona il sistema">
          {systemSteps.map(({ id, label, text, Icon }, index) => (
            <li key={id} data-system-step={id} className="human-ai__step">
              <span className="human-ai__number" aria-hidden="true">0{index + 1}</span>
              <Icon aria-hidden="true" />
              <div><h3>{label}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol></div>
      </div>
    </section>
  );
}
