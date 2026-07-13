export interface Agent {
  name: string;
  role: string;
  message: string;
}

export interface Tool {
  name: string;
}

export interface Collaboration {
  name: string;
  logo?: string;
}

export interface Testimonial {
  name: string;
  quote?: string;
  video?: string;
  photo?: string;
  poster?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
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
  collaborations: Collaboration[];
  testimonials: Testimonial[];
  faq: FaqItem[];
}

export const siteContent: SiteContent = {
  brand: 'Evolution PRO',
  platform: 'Ciak',
  primaryCta: {
    label: 'Guarda la masterclass gratuita',
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
  collaborations: [
    { name: 'Michele Baggio' },
    { name: 'Mariantonietta Tornello' },
    { name: 'Sarah Arensi' },
  ],
  testimonials: [
    { name: 'Michele Baggio' },
    { name: 'Mariantonietta Tornello' },
    { name: 'Sarah Arensi' },
  ],
  faq: [
    { question: 'Lavorate con qualsiasi tipo di business?', answer: 'No. Il Metodo EVO è pensato per consulenti, coach e professionisti che vogliono trasformare competenze reali in un’offerta digitale chiara.' },
    { question: 'Quanto tempo devo dedicare al progetto?', answer: 'Servono confronto, decisioni e registrazione dei contenuti. Il team si occupa della struttura, della tecnologia e dell’esecuzione concordata.' },
    { question: 'Chi possiede il progetto alla fine della collaborazione?', answer: 'Il progetto, i contenuti e gli asset realizzati per il tuo business restano tuoi.' },
    { question: 'Cosa succede se il corso non vende subito?', answer: 'Si leggono i dati, si individua il punto debole e si corregge. Un primo lancio serve anche a raccogliere segnali concreti dal mercato.' },
    { question: 'Cos’è il Metodo EVO?', answer: 'È il percorso in 12 fasi operative con cui definiamo la direzione, costruiamo l’offerta e la portiamo sul mercato insieme.' },
  ],
};
