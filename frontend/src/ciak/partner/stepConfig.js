/**
 * Ciak — config condivisa del percorso guidato Partner (Done-for-You).
 * Porting da frontend/src/components/partner/stepConfig.js (Fase 2a migrazione).
 * Contenuto factual mantenuto; usato da PartnerDashboard + PartnerSidebar.
 */

export const STEPS = [
  {
    id: "posizionamento",
    num: 1,
    title: "Posizionamento",
    desc: "Il team definisce chi sei, cosa insegni e per chi lo fai.",
    sla: "24h",
    slaLabel: "Completamento entro 24 ore",
    whatToDo: "Rispondi alle domande chiave sul tuo posizionamento",
    whatToDoDetail:
      "Ci servono per costruire il tuo messaggio e il tuo funnel. Tu rispondi, il team fa il resto.",
    afterStepIntro: "Una volta completato il posizionamento:",
    afterStepBullets: [
      "Il team definirà il tuo target ideale",
      "Costruiremo il tuo primo funnel",
      "Avrai un link live entro 24-48h",
    ],
  },
  {
    id: "funnel-light",
    num: 2,
    title: "Funnel Light",
    desc: "Il team costruisce e attiva il tuo primo funnel.",
    sla: "24h",
    slaLabel: "Completamento entro 24 ore",
    whatToDo: "Rivedi e approva il funnel preparato dal team",
    whatToDoDetail:
      "Usiamo i dati del posizionamento per creare landing, form e thank you page. Non devi costruire nulla.",
    afterStepIntro: "Una volta approvato il funnel:",
    afterStepBullets: [
      "Avrai un link live che raccoglie contatti",
      "Il team preparerà la tua Masterclass",
      "Inizierai a costruire la tua offerta",
    ],
  },
  {
    id: "masterclass",
    num: 3,
    title: "Masterclass",
    desc: "Il team crea la tua lezione gratuita che attira studenti.",
    sla: "48h",
    slaLabel: "Completamento entro 48 ore",
    whatToDo: "Rivedi lo script preparato dal team e approva",
    whatToDoDetail:
      "Il team costruisce una masterclass professionale basata sul tuo posizionamento. Tu la rivedi e approvi.",
    afterStepIntro: "Una volta approvata la masterclass:",
    afterStepBullets: [
      "Avrai uno script professionale pronto",
      "Il team costruirà il tuo videocorso completo",
      "Potrai iniziare a registrare le lezioni",
    ],
  },
  {
    id: "videocorso",
    num: 4,
    title: "Videocorso",
    desc: "Il team struttura il tuo corso online completo.",
    sla: "48h",
    slaLabel: "Completamento entro 48 ore",
    whatToDo: "Rivedi la struttura del corso e approva",
    whatToDoDetail:
      "Il team progetta la struttura completa del corso. Tu la rivedi e approvi, poi si registra insieme.",
    afterStepIntro: "Una volta approvato il videocorso:",
    afterStepBullets: [
      "Avrai un corso completo pronto alla vendita",
      "Il team preparerà la tua pagina di vendita",
      "Definiremo la tua offerta commerciale",
    ],
  },
  {
    id: "funnel",
    num: 5,
    title: "Funnel di Vendita",
    desc: "Il team costruisce la pagina che converte visitatori in studenti.",
    sla: "48h",
    slaLabel: "Completamento entro 48 ore",
    whatToDo: "Rivedi il funnel di vendita e approva",
    whatToDoDetail:
      "Il team crea landing, sequenza email e area studenti. Tu rivedi e approvi.",
    afterStepIntro: "Una volta approvato il funnel:",
    afterStepBullets: [
      "Il team attiverà il lancio",
      "Inizierai a ricevere traffico",
      "Potrai ottenere le prime vendite",
    ],
  },
  {
    id: "lancio",
    num: 6,
    title: "Lancio",
    desc: "Il team coordina il lancio e le prime vendite.",
    sla: "24h",
    slaLabel: "Completamento entro 24 ore",
    whatToDo: "Rivedi il piano di lancio e approva",
    whatToDoDetail:
      "Il team coordina calendario, contenuti e campagne. Tu approvi e vai online.",
    afterStepIntro: "Una volta completato il lancio:",
    afterStepBullets: [
      "Il tuo sistema sarà online",
      "Monitoreremo insieme i risultati",
      "Ottimizzeremo per crescere in modo sostenibile",
    ],
  },
];

export const STEP_SLA = {};
STEPS.forEach((s) => {
  STEP_SLA[s.id] = { sla: s.sla, label: s.slaLabel };
});

export function getStepFromPhase(phase) {
  if (!phase) return 1;
  if (phase === "LIVE" || phase === "OTTIMIZZAZIONE") return 7;
  const n = parseInt(phase.replace("F", "") || "1", 10);
  if (n < 1) return 1;
  return Math.min(n, 7);
}
