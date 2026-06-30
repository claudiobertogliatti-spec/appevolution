import { AGENTS } from "./agents";

// Video di benvenuto del fondatore (Claudio), già presente in Ciak.
// Mostrato nella schermata di Benvenuto (Benvenuto.jsx).
export const WELCOME_VIDEO_EMBED =
  "https://app.heygen.com/embeds/ac77fcddae7f43c8830acb24bd584106";

export const PHASE_CONFIG = {
  esamina: {
    id: "esamina",
    label: "Esamina",
    order: 1,
    agentId: "VALENTINA",
    intro:
      "Ciao {nome}, sono Valentina, la tua specialista di brand e posizionamento. Mettiamo a fuoco chi sei e a chi ti rivolgi: è la base su cui costruiremo tutta la tua accademia.",
    body: [
      "Sono la tua specialista di brand e posizionamento. Mettiamo a fuoco la cosa che conta di più: chi sei e a chi ti rivolgi. È la base su cui costruiremo tutta la tua accademia.",
      "Non ti serve nessuna competenza tecnica. Io ti guido, una domanda alla volta. Tu ci metti la tua esperienza: al resto pensiamo noi.",
    ],
    motivation:
      "Ogni progetto solido parte da fondamenta chiare. Alla fine di questa fase avrai un messaggio preciso e riconoscibile, tuo. Quando vuoi, cominciamo.",
    chatHint: "Hai un dubbio? Chiedimi in tempo reale: ti rispondo io, qui in chat.",
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
      "Ciao {nome}, sono Andrea. In questa fase trasformiamo il tuo progetto in qualcosa che il mercato può vedere, capire e comprare.",
    body: [
      "In questa fase trasformiamo il tuo progetto in qualcosa che il mercato può vedere, capire e comprare. Tu ci metti esperienza, voce e volto. Noi ti aiutiamo a costruire masterclass, corso, funnel e lancio.",
      "Qui non cerchiamo la perfezione: cerchiamo una prima versione reale da mettere online e validare.",
    ],
    motivation:
      "Qui il tuo progetto smette di essere un'idea e diventa qualcosa che le persone possono davvero comprare. È il passaggio che conta.",
    chatHint: "Hai un dubbio? Chiedimi in tempo reale: ti rispondo io, qui in chat.",
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
      "Ciao {nome}, sono Marco, il tuo specialista di strategia e crescita. Sei online: il più è fatto. Adesso trasformiamo il lancio in un sistema che vende in modo prevedibile.",
    body: [
      "Sono il tuo specialista di strategia e crescita. Sei online: ora leggiamo i numeri veri, miglioriamo ciò che converte e teniamo un ritmo che non si ferma — live, contenuti, funnel.",
      "L'obiettivo è chiaro: entro sei mesi un sistema capace di generare vendite con continuità, sempre meno dipendente da te.",
    ],
    motivation:
      "Le prime vendite sono il punto di partenza, non il traguardo. Da qui costruiamo un'accademia che vende anche quando non ci sei.",
    chatHint: "Hai un dubbio? Chiedimi in tempo reale: ti rispondo io, qui in chat.",
    video: false,
    bullets: [
      { icon: "chart", title: "Analizziamo il lancio", desc: "Leggiamo i numeri: cosa converte e cosa no." },
      { icon: "rocket", title: "Un sistema che vende", desc: "Live, contenuti e funnel che lavorano insieme." },
      { icon: "trophy", title: "Vendite con continuità", desc: "La meta: prevedibilità entro sei mesi." },
    ],
  },
};

/** Ritorna { phase, agent } per una macro-fase. Fallback: Stefania. */
export function getPhasePresentation(macroPhaseId, fallbackAgentId) {
  const cfg = PHASE_CONFIG[macroPhaseId];
  const agentId = cfg?.agentId || fallbackAgentId || "STEFANIA";
  return { cfg, agent: AGENTS[agentId] || AGENTS.STEFANIA };
}
