/**
 * MARCO — Dati da aggiungere nell'array degli agenti nel componente AgentHub
 * 
 * Trova nel frontend il file che definisce gli agenti (es. AgentHub.jsx, agentsData.js)
 * e aggiungi questo oggetto nell'array degli agenti attivi.
 * 
 * Il formato esatto dipende da come sono definiti gli altri agenti nel codice.
 * Modella questo oggetto sul pattern degli agenti esistenti (es. ANDREA o GAIA).
 */

// Oggetto dati MARCO — adatta i nomi delle chiavi al tuo schema esistente
const MARCO_AGENT_DATA = {
  id: "marco",
  name: "MARCO",
  subtitle: "Accountability Settimanale",
  role: "Accountability",
  tag: "Accountability",
  tagColor: "#F59E0B",           // arancione
  tagBg: "#FEF3C7",             // arancione chiaro (sfondo tag)
  icon: "📋",                   // oppure usa CheckSquare da lucide-react
  status: "active",
  statusColor: "green",
  budget: 0,
  budgetDisplay: "$0",
  metrics: {
    checkin_settimana: 0,        // check-in inviati questa settimana
    partner_inattivi: 0,         // partner con inattività rilevata
    avvisi_inviati: 0,           // avvisi formali inviati
  },
  description: "Gestisce accountability settimanale, check-in lunedì/venerdì e scala inattività prolungate.",
  endpoint: "/api/agents/marco",
}

/**
 * AGGIORNAMENTI agli agenti esistenti
 * Applica queste modifiche ai rispettivi oggetti nell'array agenti
 */

const AGENT_UPDATES = {
  valentina: {
    subtitle: "Onboarding & Consulenza",    // era "Orchestratrice"
    // tag e altri campi: invariati
  },
  andrea: {
    subtitle: "Avanzamento Corso & Video",  // era "Video Production"
    // tag e altri campi: invariati
  },
  gaia: {
    subtitle: "Supporto Tecnico",           // era "Funnel & Incident"
    tag: "Supporto Tech",                   // era "Esecuzione Tech"
    tagColor: "#0EA5E9",
    tagBg: "#E0F2FE",
  },
  stefania: {
    subtitle: "Orchestrazione",             // era "Copy & Traffico"
    tag: "Coordinamento",                   // era "ADV & Copy"
    tagColor: "#10B981",
    tagBg: "#D1FAE5",
  },
}

/**
 * AGENTI DA RIMUOVERE dall'array
 * Elimina (o commenta) le voci con questi id/name:
 */
const AGENTS_TO_REMOVE = ["orion", "marta", "luca", "atlas"]

/**
 * ORDINE FINALE degli agenti nel layout (griglia 3x2)
 * Prima riga:  valentina, andrea, marco
 * Seconda riga: gaia, stefania, main
 */
const AGENTS_ORDER = ["valentina", "andrea", "marco", "gaia", "stefania", "main"]
