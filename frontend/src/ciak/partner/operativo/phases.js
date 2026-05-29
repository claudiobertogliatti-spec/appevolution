/**
 * Config delle 3 fasi del Metodo EVO (Esamina — Valida — Ottimizza).
 *
 * Ogni fase ha un AGENTE di riferimento (volto + intro + bullet) che accompagna
 * il partner. Stefania resta voce narrante trasversale, ma dentro ogni fase
 * subentra lo specialista. Il backend espone macro_phases con `id` e `agent`;
 * qui aggiungiamo la copy presentazionale (intro + bullet) per ciascuna fase.
 *
 * Usato da PhaseAgentHeader.
 */
import { AGENTS } from "./agents";

export const PHASE_CONFIG = {
  esamina: {
    id: "esamina",
    label: "Esamina",
    agentId: "VALENTINA",
    intro:
      "Ciao {nome}, sono Valentina. In questa prima fase esaminiamo il tuo punto di partenza: chi sei, a chi parli e qual è la tua promessa. È la base su cui costruiremo tutto.",
    bullets: [
      "Mettiamo in ordine i tuoi dati (anagrafici, fiscali, contatti)",
      "Definiamo il tuo brand kit: logo, foto, colori",
      "Mettiamo a fuoco il posizionamento: nicchia, target, promessa",
    ],
  },
  valida: {
    id: "valida",
    label: "Valida",
    agentId: "ANDREA",
    intro:
      "Sono Andrea. Adesso costruiamo l'accademia e il funnel e andiamo online: l'obiettivo è metterti nelle condizioni di vendere e iniziare a testare il mercato.",
    bullets: [
      "Creiamo masterclass e lezioni del corso",
      "Mettiamo in piedi il funnel di vendita",
      "Pianifichiamo il lancio e le prime vendite",
    ],
  },
  ottimizza: {
    id: "ottimizza",
    label: "Ottimizza",
    agentId: "MARCO",
    intro:
      "Sono Marco. Da qui in poi miglioriamo su dati reali: leggiamo i numeri del lancio e ottimizziamo ciò che funziona per farti crescere.",
    bullets: [
      "Leggiamo i KPI del lancio",
      "Ottimizziamo il funnel su dati veri",
      "Definiamo i prossimi passi di crescita",
    ],
  },
};

/** Ritorna { phase, agent } per una macro-fase. Fallback: Stefania. */
export function getPhasePresentation(macroPhaseId, fallbackAgentId) {
  const cfg = PHASE_CONFIG[macroPhaseId];
  const agentId = cfg?.agentId || fallbackAgentId || "STEFANIA";
  return { cfg, agent: AGENTS[agentId] || AGENTS.STEFANIA };
}
