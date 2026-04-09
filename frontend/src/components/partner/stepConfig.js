// Configurazione condivisa del percorso guidato Partner
// Utilizzata da: PartnerSidebar, PartnerDashboardSimplified, StepPageWrapper

export const STEPS = [
  {
    id: 'posizionamento',
    num: 1,
    title: 'Posizionamento',
    desc: 'Definiamo chi sei, cosa insegni e per chi lo fai.',
    whatToDo: 'Rispondi alle domande chiave sul tuo posizionamento. Ti guidiamo noi passo dopo passo.',
    afterStep: 'Dopo il posizionamento, creeremo insieme la tua Masterclass gratuita.',
  },
  {
    id: 'masterclass',
    num: 2,
    title: 'Masterclass',
    desc: 'Creiamo la tua lezione gratuita che attira studenti.',
    whatToDo: 'Rispondi alle 7 domande strategiche. Ti aiutiamo a creare uno script efficace.',
    afterStep: 'Dopo la masterclass, costruiremo il tuo videocorso completo.',
  },
  {
    id: 'videocorso',
    num: 3,
    title: 'Videocorso',
    desc: 'Realizziamo il tuo corso online completo.',
    whatToDo: 'Segui la struttura che abbiamo definito e registra le lezioni. Ti guidiamo nella registrazione.',
    afterStep: 'Dopo il videocorso, prepareremo il funnel di vendita.',
  },
  {
    id: 'funnel',
    num: 4,
    title: 'Funnel di Vendita',
    desc: 'Progettiamo la pagina che converte visitatori in studenti.',
    whatToDo: 'Definiamo copy, struttura e offerta del tuo funnel di vendita.',
    afterStep: 'Dopo il funnel, saremo pronti per il lancio!',
  },
  {
    id: 'lancio',
    num: 5,
    title: 'Lancio',
    desc: 'Andiamo online insieme e generiamo le prime vendite.',
    whatToDo: 'Prepariamo calendario, contenuti e campagne. Coordiniamo tutto noi.',
    afterStep: 'Dopo il lancio, monitoreremo insieme i risultati e ottimizzeremo.',
  },
];

export function getStepFromPhase(phase) {
  if (!phase) return 0;
  if (phase === 'LIVE' || phase === 'OTTIMIZZAZIONE') return 6;
  const n = parseInt(phase.replace('F', '') || '1');
  if (n <= 1) return 0;
  if (n === 2) return 1;
  if (n === 3) return 2;
  if (n <= 5) return 3;
  if (n === 6) return 4;
  if (n <= 8) return 5;
  return 6;
}

export function getStepStatus(stepNum, currentStep) {
  if (stepNum < currentStep) return 'completed';
  if (stepNum === currentStep) return 'in_progress';
  return 'locked';
}
