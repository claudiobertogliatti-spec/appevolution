export interface Agent {
  name: string;
  role: string;
  message: string;
}

export interface TeamMember {
  name: string;
  role: string;
  description: string;
  photo: string;
}

export interface Tool {
  name: string;
  logo: string;
}

export interface Collaboration {
  name: string;
  role?: string;
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
  team: TeamMember[];
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
  team: [
    { name: 'Claudio B.', role: 'CEO/Founder', description: 'Direzione strategica dei progetti e analisi KPI', photo: '/team/claudio.webp' },
    { name: 'Stefania R.', role: 'Back Office', description: 'Gestione attività post-vendita', photo: '/team/stefania.webp' },
    { name: 'Antonella R.', role: 'Media Strategist', description: 'Gestione contenuti e strategie di comunicazione', photo: '/team/antonella.webp' },
    { name: 'Matteo P.', role: 'Video Maker', description: 'Creazione contenuti video', photo: '/team/matteo.webp' },
    { name: 'Debora B.', role: 'Amministrazione', description: 'Gestione contratti di collaborazione e pagamenti', photo: '/team/debora.webp' },
  ],
  tools: [
    ['Systeme.io', 'systemeio.png'],
    ['Stripe', 'stripe.svg'],
    ['Cal.com', 'caldotcom.svg'],
    ['Vercel', 'vercel.svg'],
    ['Google Cloud', 'googlecloud.svg'],
    ['Meta', 'meta.svg'],
    ['YouTube', 'youtube.svg'],
    ['ElevenLabs', 'elevenlabs.svg'],
    ['Anthropic', 'anthropic.svg'],
    ['Descript', 'descript.svg'],
    ['Canva', 'canva.png'],
    ['HeyGen', 'heygen.png'],
  ].map(([name, file]) => ({ name, logo: `/tools/${file}` })),
  collaborations: [
    { name: 'Michele Baggio', role: 'Life coach & naturopata', logo: '/collaborations/michele-baggio.png' },
    { name: 'Mariantonietta Tornello', role: 'Life coaching & mindfulness', logo: '/collaborations/mariantonietta-tornello.png' },
    { name: 'Sarah Arensi', role: 'Arte & mentoring evolutivo', logo: '/collaborations/sarah-arensi.png' },
    { name: 'Andrea Fredi', role: 'Trasformazione interiore', logo: '/collaborations/andrea-fredi.webp' },
    { name: 'Valter Romani', role: 'Formazione vendita', logo: '/collaborations/valter-romani.png' },
    { name: 'Marco Lamanna', role: 'Formazione vendita', logo: '/collaborations/marco-lamanna.png' },
    { name: 'Cosimo Filieri', role: 'Educazione musicale', logo: '/collaborations/cosimo-filieri.png' },
    { name: 'Alice Conventi', role: 'Life Coach' },
    { name: 'Arianna Aceto', role: 'Naturopatia', logo: '/collaborations/arianna-aceto.svg' },
    { name: 'Marco Orlandi', role: 'Arte', logo: '/collaborations/marco-orlandi.png' },
    { name: 'Silvia Sedda', role: 'Insegnante di inglese', logo: '/collaborations/silvia-sedda.png' },
    { name: 'Federica Arimatea', role: 'Vocal coaching', logo: '/collaborations/federica-arimatea.jpg' },
    { name: 'Daniele Andolfi', role: 'Benessere olistico', logo: '/collaborations/daniele-andolfi.png' },
    { name: 'Daphne Oliveti', role: 'Psicologia sportiva', logo: '/collaborations/daphne-oliveti.png' },
    { name: 'Annamaria Depalma', role: 'Counselor olistico' },
    { name: 'Maria Giulia Falcone', role: 'Coaching' },
    { name: 'Luigi Calafiore', role: 'Design automobilistico' },
    { name: 'Sara Stella Duè', role: 'Spiritual coaching' },
    { name: 'Alfredo Vasi', role: 'Green IT & formazione' },
    { name: 'Eva Gugliucciello', role: 'Naturopatia & cromopuntura', logo: '/collaborations/eva-gugliucciello.webp' },
  ],
  testimonials: [
    {
      name: 'Michele Baggio',
      quote: 'Michele racconta il suo percorso con Evolution PRO.',
      video: '/testimonials/michele-baggio.mp4',
      photo: '/testimonials/michele-baggio.webp',
      poster: '/testimonials/michele-baggio.webp',
    },
    {
      name: 'Mariantonietta Tornello',
      quote: 'Mariantonietta racconta il suo percorso con Evolution PRO.',
      video: '/testimonials/mariantonietta-tornello.mp4',
      photo: '/testimonials/mariantonietta-tornello.webp',
      poster: '/testimonials/mariantonietta-tornello.webp',
    },
    {
      name: 'Sarah Arensi',
      quote: 'Sarah racconta il suo percorso con Evolution PRO.',
      video: '/testimonials/sarah-arensi.mp4',
      photo: '/testimonials/sarah-arensi.webp',
      poster: '/testimonials/sarah-arensi.webp',
    },
  ],
  faq: [
    { question: 'Lavorate con qualsiasi tipo di business?', answer: 'No. Il Metodo EVO è pensato per consulenti, coach e professionisti che vogliono trasformare competenze reali in un’offerta digitale chiara.' },
    { question: 'Quanto tempo devo dedicare al progetto?', answer: 'Servono confronto, decisioni e registrazione dei contenuti. Il team si occupa della struttura, della tecnologia e dell’esecuzione concordata.' },
    { question: 'Chi possiede il progetto alla fine della collaborazione?', answer: 'Il progetto, i contenuti e gli asset realizzati per il tuo business restano tuoi.' },
    { question: 'Cosa succede se il corso non vende subito?', answer: 'Si leggono i dati, si individua il punto debole e si corregge. Un primo lancio serve anche a raccogliere segnali concreti dal mercato.' },
    { question: 'Cos’è il Metodo EVO?', answer: 'È un protocollo testato negli ultimi 7 anni: tre passaggi semplici per definire la direzione, costruire l’offerta e portarla sul mercato insieme.' },
    { question: 'Devo avere già un pubblico o una lista di contatti?', answer: 'No. Il percorso include la costruzione del sistema di acquisizione: funnel, contenuti e strategia per portare le persone giuste davanti alla tua offerta.' },
    { question: 'Serve competenza tecnica per gestire funnel e piattaforme?', answer: 'No. La parte tecnica — funnel, automazioni e integrazioni — la realizza il team. A te restano le decisioni e i contenuti che solo tu puoi dare.' },
    { question: 'In quanto tempo posso lanciare la mia Accademia?', answer: 'Dipende dai materiali disponibili e dal tuo ritmo. Il Metodo EVO serve ad arrivare al primo lancio senza passaggi inutili, non a promettere tempi magici.' },
    { question: 'Cosa fa il team e cosa devo fare io?', answer: 'Il team cura strategia, tecnologia ed esecuzione. Tu porti la competenza, registri i contenuti e approvi le decisioni: il progetto resta guidato da te.' },
    { question: 'Cos’è Ciak e come si collega al percorso?', answer: 'Ciak è la piattaforma operativa dove il lavoro prende forma: percorso, materiali, task e avanzamento restano in un unico posto, verificabili passo dopo passo.' },
  ],
};
