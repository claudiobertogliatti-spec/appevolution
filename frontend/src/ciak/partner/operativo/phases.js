import { AGENTS } from "./agents";

// Video di benvenuto del fondatore (Claudio), già presente in Ciak (Step02).
// Mostrato nella finestra d'avvio della prima fase (Esamina).
export const WELCOME_VIDEO_EMBED =
  "https://app.heygen.com/embeds/ac77fcddae7f43c8830acb24bd584106";

export const PHASE_CONFIG = {
  esamina: {
    id: "esamina",
    label: "Esamina",
    order: 1,
    agentId: "VALENTINA",
    intro:
      "Ciao {nome}, sono Valentina. Mettiamo a fuoco chi sei e a chi ti rivolgi: è la base su cui costruiremo tutta la tua accademia.",
    body: [
      "Ti accompagno in questa prima fase. Mettiamo a fuoco la cosa che conta di più: chi sei e a chi ti rivolgi. È la base su cui costruiremo tutta la tua accademia.",
      "Non ti serve nessuna competenza tecnica. Io ti guido, una domanda alla volta. Tu ci metti la tua esperienza: al resto pensiamo noi.",
    ],
    motivation:
      "Ogni progetto solido parte da fondamenta chiare. Alla fine di questa fase avrai un messaggio preciso e riconoscibile, tuo. Quando vuoi, cominciamo.",
    chatHint: "Hai un dubbio? Parlami quando vuoi: ti rispondo io, qui in chat.",
    video: true,
    bullets: [
      { icon: "fileText", title: "I tuoi dati", desc: "Le informazioni per la fattura. Si fa una volta sola." },
      { icon: "palette", title: "Il tuo marchio", desc: "Logo, foto e colori. Ti aiuto io a sceglierli." },
      { icon: "target", title: "Chi sei e a chi parli", desc: "Mettiamo a fuoco il tuo messaggio, insieme." },
    ],
  },
  valida: {
    id: "valida",
    label: "Valida",
    order: 2,
    agentId: "ANDREA",
    intro:
      "Ciao {nome}, sono Andrea. Costruiamo la tua accademia e la portiamo online, pronta a vendere.",
    body: [
      "Ora costruiamo la tua accademia e la portiamo online, pronta a vendere. Tu registri e ci metti la faccia: al montaggio, alle pagine e alla tecnica pensiamo noi.",
      "Andiamo per passi semplici. Ti dico esattamente cosa fare, quando farlo e cosa puoi lasciare a noi.",
    ],
    motivation:
      "Qui il tuo progetto smette di essere un'idea e diventa qualcosa che le persone possono davvero comprare. È il passaggio che conta.",
    chatHint: "Hai un dubbio? Parlami quando vuoi: ti rispondo io, qui in chat.",
    video: false,
    bullets: [
      { icon: "video", title: "Masterclass e corso", desc: "Registri tu, al montaggio pensiamo noi." },
      { icon: "rocket", title: "Il sistema per vendere", desc: "Pagine e funnel pronti, li montiamo noi." },
      { icon: "megaphone", title: "Il lancio", desc: "Pianifichiamo insieme le prime vendite." },
    ],
  },
  ottimizza: {
    id: "ottimizza",
    label: "Ottimizza",
    order: 3,
    agentId: "MARCO",
    intro:
      "Ciao {nome}, sono Marco. Sei online: il più è fatto. Adesso miglioriamo ciò che vende, un passo alla volta.",
    body: [
      "Sei online: il più è fatto. Adesso leggiamo i numeri veri e miglioriamo ciò che vende, un passo alla volta, fino a renderti il riferimento del tuo mercato.",
      "Non sei solo: ti dico io su cosa concentrarti questa settimana, senza disperdere energie.",
    ],
    motivation:
      "Le prime vendite sono un punto di partenza, non il traguardo. Da qui costruiamo la tua autorevolezza e una crescita che dura.",
    chatHint: "Hai un dubbio? Parlami quando vuoi: ti rispondo io, qui in chat.",
    video: false,
    bullets: [
      { icon: "chart", title: "I tuoi numeri", desc: "Leggiamo cosa funziona e cosa no." },
      { icon: "trophy", title: "La tua autorevolezza", desc: "Diventi un riferimento del tuo mercato." },
      { icon: "users", title: "La tua community", desc: "Le persone che restano nel tempo." },
    ],
  },
};

/** Ritorna { phase, agent } per una macro-fase. Fallback: Stefania. */
export function getPhasePresentation(macroPhaseId, fallbackAgentId) {
  const cfg = PHASE_CONFIG[macroPhaseId];
  const agentId = cfg?.agentId || fallbackAgentId || "STEFANIA";
  return { cfg, agent: AGENTS[agentId] || AGENTS.STEFANIA };
}
