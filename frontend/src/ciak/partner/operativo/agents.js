/**
 * Agent registry per l'Operativo Stefania.
 *
 * Ogni step del journey è associato all'agente più adatto. La chat
 * laterale (AgentDrawer) mostra volto + nome dell'agente attivo e
 * passa target_agent al backend, che swappa il system prompt.
 *
 * I volti sono SVG generati da DiceBear "personas" (self-hosted in /agents/).
 */

export const AGENTS = {
  STEFANIA: {
    id: "STEFANIA",
    name: "Stefania",
    role: "Coordinatrice del tuo percorso",
    avatar: "/agents/stefania.jpg",
    initial: "S",
  },
  VALENTINA: {
    id: "VALENTINA",
    name: "Valentina",
    role: "Brand & Posizionamento",
    avatar: "/agents/valentina.jpg",
    initial: "V",
  },
  ANDREA: {
    id: "ANDREA",
    name: "Andrea",
    role: "Coach video e contenuti",
    avatar: "/agents/andrea.jpg",
    initial: "A",
  },
  GAIA: {
    id: "GAIA",
    name: "Gaia",
    role: "Supporto tecnico funnel",
    avatar: "/agents/gaia.jpg",
    initial: "G",
  },
  MARCO: {
    id: "MARCO",
    name: "Marco",
    role: "Strategia lancio",
    avatar: "/agents/marco.jpg",
    initial: "M",
  },
  MATTEO: {
    id: "MATTEO",
    name: "Matteo",
    role: "Analista Ciak Blueprint",
    avatar: "/agents/matteo.jpg",
    initial: "M",
  },
};

/**
 * Mapping step_id → agent_id.
 * Quando il partner è su uno step, la chat mostra il volto di quell'agente
 * e il backend usa il suo system prompt.
 */
export const STEP_TO_AGENT = {
  "01-contratto":            "STEFANIA",
  "02-discovery-video":      "STEFANIA",
  "03-brand-kit":            "VALENTINA",
  "04-posizionamento":       "VALENTINA",
  "05-script-masterclass":   "ANDREA",
  "06-outline-lezioni":      "ANDREA",
  "07-registra-masterclass": "ANDREA",
  "08-registra-lezioni":     "ANDREA",
  "09-funnel-asset":         "GAIA",
  "10-funnel-team-work":     "STEFANIA",
  "11-calendario-30gg":      "MARCO",
  "12-prezzo-webinar":       "MARCO",
  "13-lancio":               "MARCO",
};

/**
 * Ritorna l'agente attivo per uno step.
 * Default: STEFANIA (orientamento generale).
 */
export function getAgentForStep(stepId) {
  const agentId = STEP_TO_AGENT[stepId] || "STEFANIA";
  return AGENTS[agentId];
}
