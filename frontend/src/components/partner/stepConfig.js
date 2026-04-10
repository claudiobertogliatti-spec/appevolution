// Configurazione condivisa del percorso guidato Partner
// Utilizzata da: PartnerSidebar, PartnerDashboardSimplified, StepPageWrapper

export const STEPS = [
  {
    id: 'posizionamento',
    num: 1,
    title: 'Posizionamento',
    desc: 'Definiamo chi sei, cosa insegni e per chi lo fai.',
    whatToDo: 'Rispondi alle domande chiave sul tuo posizionamento',
    whatToDoDetail: 'Ci serviranno per definire il tuo target ideale e creare un messaggio chiaro e convincente.',
    afterStep: 'Dopo il posizionamento, attiveremo subito il tuo primo funnel.',
    afterStepIntro: 'Una volta completato il posizionamento:',
    afterStepBullets: [
      'Avremo definito il tuo target ideale',
      'Attiveremo il tuo primo funnel in automatico',
      'Avrai un link live entro 24-48h',
    ],
    materials: [
      { label: 'Guida al Posizionamento', type: 'guide', downloadId: 'guida' },
      { label: 'Template Target Ideale', type: 'template', downloadId: 'template-target' },
      { label: 'Esempi di Posizionamento', type: 'example', downloadId: 'esempi' },
    ],
  },
  {
    id: 'funnel-light',
    num: 2,
    title: 'Funnel Light',
    desc: 'Attiva il tuo primo funnel in automatico.',
    whatToDo: 'Rivedi e pubblica il tuo funnel pre-compilato',
    whatToDoDetail: 'Usiamo i dati del posizionamento per creare landing, form e thank you page. Tu devi solo confermare.',
    afterStep: 'Dopo la pubblicazione, creeremo la tua Masterclass.',
    afterStepIntro: 'Una volta pubblicato il funnel:',
    afterStepBullets: [
      'Avrai un link live che raccoglie contatti',
      'Creeremo insieme la tua Masterclass',
      'Inizierai a costruire la tua offerta',
    ],
    materials: [
      { label: 'Template Landing Standard', type: 'template' },
      { label: 'Guida Form Contatti', type: 'guide' },
    ],
  },
  {
    id: 'masterclass',
    num: 3,
    title: 'Masterclass',
    desc: 'Creiamo la tua lezione gratuita che attira studenti.',
    whatToDo: 'Rispondi alle 7 domande strategiche per creare il tuo script',
    whatToDoDetail: 'Ti serviranno per costruire una masterclass chiara, utile e pronta da registrare.',
    afterStep: 'Dopo la masterclass, costruiremo il tuo videocorso completo.',
    afterStepIntro: 'Una volta completata la masterclass:',
    afterStepBullets: [
      'Avrai uno script professionale pronto',
      'Costruiremo il tuo videocorso completo',
      'Potrai iniziare a registrare le lezioni',
    ],
    materials: [
      { label: 'Template Script Masterclass', type: 'template' },
      { label: 'Struttura Masterclass Tipo', type: 'guide' },
      { label: 'Consigli per la Registrazione', type: 'guide' },
    ],
  },
  {
    id: 'videocorso',
    num: 4,
    title: 'Videocorso',
    desc: 'Realizziamo il tuo corso online completo.',
    whatToDo: 'Segui la struttura e registra le lezioni',
    whatToDoDetail: 'Ti guidiamo passo passo nella registrazione per avere un corso completo e professionale.',
    afterStep: 'Dopo il videocorso, prepareremo il funnel di vendita completo.',
    afterStepIntro: 'Una volta completato il videocorso:',
    afterStepBullets: [
      'Avrai un corso completo pronto alla vendita',
      'Prepareremo la tua pagina di vendita',
      'Definirai la tua offerta commerciale',
    ],
    materials: [
      { label: 'Struttura Corso Tipo', type: 'template' },
      { label: 'Checklist Registrazione Video', type: 'checklist' },
      { label: 'Consigli Attrezzatura', type: 'guide' },
    ],
  },
  {
    id: 'funnel',
    num: 5,
    title: 'Funnel di Vendita',
    desc: 'Progettiamo la pagina che converte visitatori in studenti.',
    whatToDo: 'Completa la tua landing page',
    whatToDoDetail: 'È il passaggio che ti permette di iniziare a vendere il tuo corso online.',
    afterStep: 'Dopo il funnel, saremo pronti per il lancio!',
    afterStepIntro: 'Una volta completata la landing:',
    afterStepBullets: [
      'Attiveremo il lancio',
      'Inizierai a ricevere traffico',
      'Potrai ottenere le prime vendite',
    ],
    materials: [
      { label: 'Template Copy Landing Page', type: 'template' },
      { label: 'Struttura Funnel Tipo', type: 'guide' },
      { label: 'Esempi Landing di Successo', type: 'example' },
    ],
  },
  {
    id: 'lancio',
    num: 6,
    title: 'Lancio',
    desc: 'Andiamo online insieme e generiamo le prime vendite.',
    whatToDo: 'Prepara calendario, contenuti e campagne',
    whatToDoDetail: 'Coordiniamo tutto noi per portare la tua accademia davanti al tuo pubblico ideale.',
    afterStep: 'Dopo il lancio, monitoreremo insieme i risultati e ottimizzeremo.',
    afterStepIntro: 'Una volta completato il lancio:',
    afterStepBullets: [
      'La tua accademia sarà online',
      'Monitoreremo insieme i risultati',
      'Ottimizzeremo per scalare le vendite',
    ],
    materials: [
      { label: 'Checklist Pre-Lancio', type: 'checklist' },
      { label: 'Calendario Editoriale Tipo', type: 'template' },
      { label: 'Template Contenuti Social', type: 'template' },
    ],
  },
];

export function getStepFromPhase(phase) {
  if (!phase) return 0;
  if (phase === 'LIVE' || phase === 'OTTIMIZZAZIONE') return 7;
  const n = parseInt(phase.replace('F', '') || '1');
  // F1 = Posizionamento (step 0)
  // F2 = Funnel Light (step 1) — NUOVO
  // F3 = Masterclass (step 2)
  // F4 = Videocorso (step 3)
  // F5 = Funnel di Vendita (step 4)
  // F6 = Lancio (step 5)
  // F7+ = Post-Lancio (step 6+)
  if (n <= 1) return 0;
  if (n === 2) return 1;
  if (n === 3) return 2;
  if (n === 4) return 3;
  if (n === 5) return 4;
  if (n === 6) return 5;
  if (n <= 8) return 6;
  return 7;
}

export function getStepStatus(stepNum, currentStep) {
  if (stepNum < currentStep) return 'completed';
  if (stepNum === currentStep) return 'in_progress';
  return 'locked';
}
