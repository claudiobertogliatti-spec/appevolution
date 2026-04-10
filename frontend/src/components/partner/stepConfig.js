// Configurazione condivisa del percorso guidato Partner — Modello Done-for-You
// Utilizzata da: PartnerSidebar, PartnerDashboardSimplified, StepPageWrapper, DoneForYouWrapper

export const STEPS = [
  {
    id: 'posizionamento',
    num: 1,
    title: 'Posizionamento',
    desc: 'Il team definisce chi sei, cosa insegni e per chi lo fai.',
    sla: '24h',
    slaLabel: 'Completamento entro 24 ore',
    whatToDo: 'Rispondi alle domande chiave sul tuo posizionamento',
    whatToDoDetail: 'Ci serviranno per costruire il tuo messaggio e il tuo funnel. Tu rispondi, noi facciamo il resto.',
    afterStep: 'Dopo il posizionamento, il team attivera il tuo primo funnel.',
    afterStepIntro: 'Una volta completato il posizionamento:',
    afterStepBullets: [
      'Il team definira il tuo target ideale',
      'Costruiremo il tuo primo funnel in automatico',
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
    desc: 'Il team costruisce e attiva il tuo primo funnel.',
    sla: '24h',
    slaLabel: 'Completamento entro 24 ore',
    whatToDo: 'Rivedi e approva il funnel preparato dal team',
    whatToDoDetail: 'Usiamo i dati del posizionamento per creare landing, form e thank you page. Non devi costruire nulla.',
    afterStep: "Dopo l'approvazione, il team preparera la tua Masterclass.",
    afterStepIntro: 'Una volta approvato il funnel:',
    afterStepBullets: [
      'Avrai un link live che raccoglie contatti',
      'Il team preparera la tua Masterclass',
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
    desc: 'Il team crea la tua lezione gratuita che attira studenti.',
    sla: '48h',
    slaLabel: 'Completamento entro 48 ore',
    whatToDo: 'Rivedi lo script preparato dal team e approva',
    whatToDoDetail: 'Il team costruisce una masterclass professionale basata sul tuo posizionamento. Tu la rivedi e approvi.',
    afterStep: 'Dopo la masterclass, il team costruira il tuo videocorso.',
    afterStepIntro: 'Una volta approvata la masterclass:',
    afterStepBullets: [
      'Avrai uno script professionale pronto',
      'Il team costruira il tuo videocorso completo',
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
    desc: 'Il team struttura il tuo corso online completo.',
    sla: '48h',
    slaLabel: 'Completamento entro 48 ore',
    whatToDo: 'Rivedi la struttura del corso e approva',
    whatToDoDetail: 'Il team progetta la struttura completa del corso. Tu la rivedi e approvi, poi registriamo insieme.',
    afterStep: 'Dopo il videocorso, il team preparera il funnel di vendita.',
    afterStepIntro: 'Una volta approvato il videocorso:',
    afterStepBullets: [
      'Avrai un corso completo pronto alla vendita',
      'Il team preparera la tua pagina di vendita',
      'Definiremo la tua offerta commerciale',
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
    desc: 'Il team costruisce la pagina che converte visitatori in studenti.',
    sla: '48h',
    slaLabel: 'Completamento entro 48 ore',
    whatToDo: 'Rivedi il funnel di vendita e approva',
    whatToDoDetail: 'Il team crea landing, email sequence e area studenti. Tu rivedi e approvi.',
    afterStep: 'Dopo il funnel, il team preparera il lancio.',
    afterStepIntro: 'Una volta approvato il funnel:',
    afterStepBullets: [
      'Il team attivera il lancio',
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
    desc: 'Il team coordina il lancio e genera le prime vendite.',
    sla: '24h',
    slaLabel: 'Completamento entro 24 ore',
    whatToDo: 'Rivedi il piano di lancio e approva',
    whatToDoDetail: 'Il team coordina calendario, contenuti e campagne. Tu approvi e vai online.',
    afterStep: 'Dopo il lancio, monitoreremo insieme i risultati.',
    afterStepIntro: 'Una volta completato il lancio:',
    afterStepBullets: [
      'La tua accademia sara online',
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

// SLA lookup per step id (usato dal DoneForYouWrapper)
export const STEP_SLA = {};
STEPS.forEach(s => { STEP_SLA[s.id] = { sla: s.sla, label: s.slaLabel }; });
// SLA extra per step non nel percorso principale
STEP_SLA['webinar'] = { sla: '48h', label: 'Completamento entro 48 ore' };
STEP_SLA['email'] = { sla: '24h', label: 'Completamento entro 24 ore' };

export function getStepFromPhase(phase) {
  if (!phase) return 0;
  if (phase === 'LIVE' || phase === 'OTTIMIZZAZIONE') return 7;
  const n = parseInt(phase.replace('F', '') || '1');
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
