// Evolution PRO OS - Constants and Static Data

export const PHASES = ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10"];

export const PHASE_LABELS = {
  F0: "Pre-Onboarding",
  F1: "Attivazione",
  F2: "Posizionamento",
  F3: "Masterclass",
  F4: "Struttura Corso",
  F5: "Produzione",
  F6: "Accademia",
  F7: "Pre-Lancio",
  F8: "Lancio",
  F9: "Ottimizzazione",
  F10: "Scalabilità"
};

export const RESOURCES = [
  { name: "Scheda Posizionamento Videocorso", type: "DOCX", size: "24 KB" },
  { name: "Template Analisi Strategica", type: "DOCX", size: "18 KB" },
  { name: "Template Masterclass", type: "DOCX", size: "15 KB" },
  { name: "Proforma Partnership", type: "PDF", size: "210 KB" },
  { name: "Documento di Supporto", type: "PDF", size: "180 KB" },
  { name: "Contratto Partnership", type: "PDF", size: "320 KB" },
];

export const NICCHIE_DISPONIBILI = [
  "Business Coach",
  "Life Coach",
  "Psicologa/o",
  "Formatore HR",
  "Consulente Fiscale",
  "Marketing Specialist",
  "Personal Trainer",
  "Nutrizionista",
  "Financial Advisor",
  "Public Speaker",
  "Altro"
];

// Color palette
export const S = {
  Y: "#F5C518",
  YD: "#e0a800",
  YL: "#FFFBEA",
  YM: "#FEF3B0",
  BK: "#111111",
  ANT: "#1a2332",
  ANT2: "#2c3e55",
  BG: "#f7f8fa",
  BG2: "#ffffff",
  BG3: "#f0f2f5",
  BD: "#e4e8ef",
  BD2: "#d1d9e6",
  T: "#1a2332",
  T2: "#5a6a82",
  T3: "#9aaabf",
  GR: "#16a34a",
  GBG: "#dcfce7",
  RE: "#dc2626",
  RBG: "#fee2e2",
  OR: "#ea580c",
  OBG: "#ffedd5",
};

// Post-launch metrics mock data
export const POST_LAUNCH_METRICS = {
  "Luca Marini": {
    students: 87,
    activeStudents: 64,
    completionRate: 42,
    nps: 8.2,
    revenue: 4200,
    refunds: 2,
    weeklySignups: [12, 18, 25, 22, 10],
    npsBreakdown: { promoters: 55, passives: 32, detractors: 13 },
    topFeedback: ["Chiarissimo", "Ottimi template", "Manca supporto live"],
    moduleCompletion: [100, 95, 88, 72, 61, 48, 35, 28]
  },
  "Giulia Rossi": {
    students: 156,
    activeStudents: 112,
    completionRate: 58,
    nps: 9.1,
    revenue: 8700,
    refunds: 1,
    weeklySignups: [28, 42, 38, 31, 17],
    npsBreakdown: { promoters: 72, passives: 22, detractors: 6 },
    topFeedback: ["Eccellente", "Pratico", "Troppo breve"],
    moduleCompletion: [100, 98, 94, 85, 78, 65, 55, 48, 42]
  }
};

// Notifications mock data
export const INITIAL_NOTIFICATIONS = [
  { id: 1, type: "modulo", icon: "✅", title: "Modulo Completato", body: "Marco Ferretti ha completato M4 – Editing & Branding", time: "12 min fa", partner: "Marco Ferretti", read: false, action: "partner" },
  { id: 2, type: "escalation", icon: "🚨", title: "Escalation STEFANIA", body: "Sara Lombardi non risponde da 72h – richiede intervento Antonella (Supervisione Social)", time: "2h fa", partner: "Sara Lombardi", read: false, action: "alert" },
  { id: 3, type: "video", icon: "🎬", title: "Video Pronto", body: "ANDREA ha completato editing M3L2 per Luca Marini", time: "3h fa", partner: "Luca Marini", read: true, action: "andrea" },
  { id: 4, type: "file", icon: "📁", title: "Nuovo File Caricato", body: "Antonio Bianchi ha caricato Scheda Posizionamento.pdf", time: "5h fa", partner: "Antonio Bianchi", read: true, action: "partner" },
];

// Video feed mock data
export const VIDEO_FEED = [
  { id: 1, partner: "Marco Ferretti", module: "M4", lesson: "Come funziona l'editing", status: "new", duration: "18:42", ytUrl: null },
  { id: 2, partner: "Sara Lombardi", module: "M3", lesson: "Consegna materiali grezzi", status: "new", duration: "12:15", ytUrl: null },
  { id: 3, partner: "Luca Marini", module: "M5", lesson: "Area studenti", status: "assigned", duration: "22:08", ytUrl: "https://youtu.be/abc123" },
  { id: 4, partner: "Giulia Rossi", module: "M6", lesson: "Calendario editoriale 30gg", status: "waiting", duration: "—", ytUrl: null },
];

// Systeme.io integration status
export const SYSTEME_STATUS = {
  connected: true,
  lastSync: "2 min fa"
};

export const SYSTEME_LIVE_DATA = {
  "Luca Marini": {
    newSignupsToday: 3,
    conversionRate: 4.2,
    funnelStats: { views: 1240, optins: 312, sales: 87 },
    lastPayment: { amount: 297, date: "oggi 14:32" }
  },
  "Giulia Rossi": {
    newSignupsToday: 7,
    conversionRate: 5.8,
    funnelStats: { views: 2180, optins: 548, sales: 156 },
    lastPayment: { amount: 197, date: "oggi 09:15" }
  }
};

// Calendar editorial mock data
export const CALENDARIO_30GG = [
  {
    week: 1,
    title: "Settimana 1 – Awareness",
    content: [
      { day: "Lun", type: "video", title: "Chi sono e perché faccio questo", platform: "YouTube" },
      { day: "Mar", type: "instagram", title: "Carousel: 5 errori comuni nella tua nicchia", platform: "IG" },
      { day: "Gio", type: "tiktok", title: "Hook: 'Se fai X, stai sbagliando'", platform: "TikTok" },
      { day: "Sab", type: "blog", title: "Articolo pillar: Guida completa a [tema]", platform: "Blog" },
    ]
  },
  {
    week: 2,
    title: "Settimana 2 – Autorità",
    content: [
      { day: "Lun", type: "video", title: "Case study: come ho aiutato [cliente tipo]", platform: "YouTube" },
      { day: "Mar", type: "instagram", title: "Testimonianza cliente + storia", platform: "IG" },
      { day: "Gio", type: "tiktok", title: "Rispondo a commento polemico", platform: "TikTok" },
      { day: "Sab", type: "blog", title: "Guest post o intervista", platform: "Blog" },
    ]
  },
  {
    week: 3,
    title: "Settimana 3 – Lead Gen",
    content: [
      { day: "Lun", type: "video", title: "Annuncio Masterclass gratuita", platform: "YouTube" },
      { day: "Mar", type: "instagram", title: "Countdown stories + CTA", platform: "IG" },
      { day: "Gio", type: "tiktok", title: "Teaser Masterclass + link bio", platform: "TikTok" },
      { day: "Sab", type: "blog", title: "Email nurturing sequenza", platform: "Email" },
    ]
  },
  {
    week: 4,
    title: "Settimana 4 – Conversione",
    content: [
      { day: "Lun", type: "video", title: "LIVE Masterclass", platform: "YouTube/Zoom" },
      { day: "Mar", type: "instagram", title: "Replay + urgenza", platform: "IG" },
      { day: "Gio", type: "tiktok", title: "Behind the scenes creazione corso", platform: "TikTok" },
      { day: "Sab", type: "blog", title: "Email cart close + bonus", platform: "Email" },
    ]
  },
];

// Positioning wizard questions
export const POSITIONING_QUESTIONS = [
  {
    id: "obiettivo",
    question: "Qual è l'obiettivo principale che il tuo studente vuole raggiungere?",
    hint: "Pensa al risultato finale che prometti. Es: 'Parlare inglese fluentemente in 90 giorni', 'Lanciare il primo ecommerce', 'Perdere 10kg senza diete estreme'",
    placeholder: "Es: Avviare un'attività di coaching online partendo da zero"
  },
  {
    id: "target",
    question: "Chi è il tuo studente ideale? Descrivi in dettaglio.",
    hint: "Età, professione, situazione attuale, frustrazioni, cosa ha già provato senza successo.",
    placeholder: "Es: Professionista 35-50 anni che vuole reinventarsi..."
  },
  {
    id: "trasformazione",
    question: "Quale trasformazione vivranno? Descrivi il prima e il dopo.",
    hint: "PRIMA: frustrazioni, blocchi, paure → DOPO: competenze acquisite, mindset, risultati tangibili",
    placeholder: "PRIMA: ... → DOPO: ..."
  },
  {
    id: "differenziazione",
    question: "Cosa ti rende diverso da altri corsi simili?",
    hint: "Il tuo metodo unico, la tua esperienza specifica, il tuo approccio non convenzionale.",
    placeholder: "Es: A differenza di altri, io..."
  },
  {
    id: "metodo",
    question: "Come si chiama il tuo metodo/framework? Come funziona?",
    hint: "Un nome memorabile + 3-5 step o pilastri. Es: 'Metodo E.V.O. – Ecosistema, Validazione, Ottimizzazione'",
    placeholder: "Nome metodo: ...\nStep 1: ...\nStep 2: ..."
  },
  {
    id: "obiezioni",
    question: "Quali sono le 3 principali obiezioni che i tuoi potenziali studenti potrebbero avere?",
    hint: "Tempo, denaro, 'non fa per me', 'ho già provato'...",
    placeholder: "1. ...\n2. ...\n3. ..."
  },
  {
    id: "prova",
    question: "Che prove hai che il tuo metodo funziona?",
    hint: "Testimonianze, case study, tuoi risultati personali, dati, certificazioni.",
    placeholder: "Es: Ho aiutato 50+ professionisti a..."
  },
  {
    id: "urgenza",
    question: "Perché dovrebbero agire ORA e non tra 6 mesi?",
    hint: "Costo dell'inazione, opportunità che stanno perdendo, trend di mercato.",
    placeholder: "Es: Ogni mese che passa..."
  },
  {
    id: "bonus",
    question: "Quali bonus o risorse extra includerai?",
    hint: "Template, checklist, accesso community, call 1:1, materiali esclusivi.",
    placeholder: "Es: - Template XYZ\n- Accesso community privata\n- ..."
  }
];
