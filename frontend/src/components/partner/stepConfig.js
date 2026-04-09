// Configurazione condivisa del percorso guidato Partner
// Utilizzata da: PartnerSidebar, PartnerDashboardSimplified, StepPageWrapper

export const STEPS = [
  {
    id: 'posizionamento',
    num: 1,
    title: 'Posizionamento',
    desc: 'Definiamo chi sei, cosa insegni e per chi lo fai.',
    whatToDo: 'Rispondi alle domande chiave sul tuo posizionamento',
    afterStep: 'Dopo il posizionamento, creeremo insieme la tua Masterclass gratuita.',
    afterStepIntro: 'Una volta completato il posizionamento:',
    afterStepBullets: [
      'Avremo definito il tuo target ideale',
      'Creeremo insieme la tua Masterclass gratuita',
      'Inizierai a costruire la tua offerta',
    ],
  },
  {
    id: 'masterclass',
    num: 2,
    title: 'Masterclass',
    desc: 'Creiamo la tua lezione gratuita che attira studenti.',
    whatToDo: 'Rispondi alle 7 domande strategiche per creare il tuo script',
    afterStep: 'Dopo la masterclass, costruiremo il tuo videocorso completo.',
    afterStepIntro: 'Una volta completata la masterclass:',
    afterStepBullets: [
      'Avrai uno script professionale pronto',
      'Costruiremo il tuo videocorso completo',
      'Potrai iniziare a registrare le lezioni',
    ],
  },
  {
    id: 'videocorso',
    num: 3,
    title: 'Videocorso',
    desc: 'Realizziamo il tuo corso online completo.',
    whatToDo: 'Segui la struttura e registra le lezioni',
    afterStep: 'Dopo il videocorso, prepareremo il funnel di vendita.',
    afterStepIntro: 'Una volta completato il videocorso:',
    afterStepBullets: [
      'Avrai un corso completo pronto alla vendita',
      'Prepareremo la tua pagina di vendita',
      'Definirai la tua offerta commerciale',
    ],
  },
  {
    id: 'funnel',
    num: 4,
    title: 'Funnel di Vendita',
    desc: 'Progettiamo la pagina che converte visitatori in studenti.',
    whatToDo: 'Completa la tua landing page',
    afterStep: 'Dopo il funnel, saremo pronti per il lancio!',
    afterStepIntro: 'Una volta completata la landing:',
    afterStepBullets: [
      'Attiveremo il lancio',
      'Inizierai a ricevere traffico',
      'Potrai ottenere le prime vendite',
    ],
  },
  {
    id: 'lancio',
    num: 5,
    title: 'Lancio',
    desc: 'Andiamo online insieme e generiamo le prime vendite.',
    whatToDo: 'Prepara calendario, contenuti e campagne',
    afterStep: 'Dopo il lancio, monitoreremo insieme i risultati e ottimizzeremo.',
    afterStepIntro: 'Una volta completato il lancio:',
    afterStepBullets: [
      'La tua accademia sarà online',
      'Monitoreremo insieme i risultati',
      'Ottimizzeremo per scalare le vendite',
    ],
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
