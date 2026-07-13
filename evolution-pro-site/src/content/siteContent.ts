export interface Agent {
  name: string;
  role: string;
  message: string;
}

export interface Tool {
  name: string;
}

export interface Testimonial {
  name: string;
}

export interface SiteContent {
  brand: string;
  platform: string;
  primaryCta: {
    label: string;
    href: string;
  };
  agents: Agent[];
  tools: Tool[];
  testimonials: Testimonial[];
}

export const siteContent: SiteContent = {
  brand: 'Evolution PRO',
  platform: 'Ciak',
  primaryCta: {
    label: 'Accedi a Ciak',
    href: 'https://www.ciak.io',
  },
  agents: [
    {
      name: 'Stefania',
      role: 'Coordinatrice del tuo percorso',
      message: 'Ti aiuto a rimettere in ordine il percorso.',
    },
    {
      name: 'Valentina',
      role: 'Brand & Posizionamento',
      message: 'Ti aiuto a dire la cosa giusta alle persone giuste.',
    },
    {
      name: 'Andrea',
      role: 'Coach video e contenuti',
      message: 'Ti aiuto a sentirti più sicuro prima di premere rec.',
    },
    {
      name: 'Gaia',
      role: 'Supporto tecnico funnel',
      message: 'Ti aiuto a trasformare il caos tecnico nella prossima azione.',
    },
    {
      name: 'Marco',
      role: 'Strategia lancio',
      message: 'Ti aiuto a mantenere alta la trazione fino al go-live.',
    },
    {
      name: 'Matteo',
      role: 'Analista Ciak Blueprint',
      message: 'Ti aiuto a trasformare i dati in decisioni concrete.',
    },
  ],
  tools: [
    'Systeme.io',
    'Stripe',
    'Cal.com',
    'Vercel',
    'Google Cloud',
    'Meta',
    'YouTube',
    'ElevenLabs',
    'Anthropic',
    'Descript',
    'Canva',
    'HeyGen',
  ].map((name) => ({ name })),
  testimonials: [
    { name: 'Michele Baggio' },
    { name: 'Mariantonietta Tornello' },
    { name: 'Sarah Arensi' },
  ],
};
