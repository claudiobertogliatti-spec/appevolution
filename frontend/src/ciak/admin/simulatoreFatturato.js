/**
 * simulatoreFatturato.js — motore del Simulatore Fatturato €1M.
 *
 * Modello a coorti, simulazione mensile su 36 mesi (3 anni). Ogni anno entra
 * una coorte di partner distribuita nei 12 mesi. Regole di business (LOCK):
 *  - Provvigione 10% sul venduto del partner SOLO nei 12 mesi di Partnership
 *    (finestra lancio → fine contratto). One-shot per coorte, mai ricorrente.
 *  - Dal 13° mese il partner entra in EVO-S = SOLO CANONE (nessuna provvigione),
 *    soggetto a churn.
 *  - Blueprint contato al netto del CAC. Servizi extra = upside, scalati sul
 *    volume di quell'anno.
 * I ricavi dopo il mese 36 non si contano: l'anno 3 è una stima conservativa
 * del regime.
 *
 * Modulo PURO (nessuna dipendenza React): testabile in isolamento.
 */

export const PRICE = {
  blueprint: 27,
  start: 499,
  upgrade: 2291,
  direct: 2790,
  commRate: 0.10, // 10% sul venduto, solo nei 12 mesi di Partnership
};

// I 4 tier EVO-S (€/mese) e la loro media ponderata sul mix di riferimento
// (10/30/15/5 su 60 partner) usata come canone medio nel modello.
export const EVOS_TIERS = [147, 297, 497, 797];
export const EVOS_CANONE_MENSILE =
  (10 * 147 + 30 * 297 + 15 * 497 + 5 * 797) / 60; // ≈ 363,67 €/mese

// Metadati delle leve, per costruire la UI. `group`: "market" (cambia con lo
// scenario) | "ops" (realtà operativa, tarata sui dati veri). `hero`: leva
// principale in evidenza.
export const FIELDS = [
  { id: "partnerSales", group: "market", hero: true, label: "Venduto medio del partner", unit: "€/mese", min: 0, max: 8000, step: 250,
    hint: "La leva che decide provvigioni ed EVO-S. Portala a 0 per lo stress test: partner che non vendono." },
  { id: "bpSold", group: "market", label: "Blueprint / anno (target a regime)", unit: "", min: 100, max: 3000, step: 50 },
  { id: "conv1", group: "market", label: "Conversione Blueprint → Start", unit: "%", min: 0, max: 40, step: 1 },
  { id: "conv2", group: "market", label: "Conversione Start → Partnership", unit: "%", min: 0, max: 40, step: 1 },
  { id: "directPartner", group: "market", label: "Partnership dirette a freddo / anno", unit: "", min: 0, max: 40, step: 1 },
  { id: "evosRetain", group: "market", label: "Partner che entrano in EVO-S", unit: "%", min: 0, max: 100, step: 5 },

  { id: "cac", group: "ops", label: "Costo acquisizione per Blueprint", unit: "€", min: 0, max: 60, step: 1 },
  { id: "capacity", group: "ops", label: "Capacità di lancio", unit: "partner/mese", min: 1, max: 12, step: 1 },
  { id: "ttl", group: "ops", label: "Tempo firma → lancio", unit: "mesi", min: 2, max: 12, step: 1 },
  { id: "churn", group: "ops", label: "Churn EVO-S", unit: "%/anno", min: 0, max: 50, step: 5 },
  { id: "services", group: "ops", label: "Servizi extra & upsell (a regime)", unit: "€/anno", min: 0, max: 500000, step: 10000 },
];

// Preset scenario. `ramp` = % del target raggiunta in anno 1/2/3. Valori di
// partenza: DA TARARE sui dati veri (Systeme, Meta, Stripe, partner_journey_steps).
export const SCENARIOS = {
  prudente: { partnerSales: 2000, bpSold: 800, conv1: 10, conv2: 12, directPartner: 8, evosRetain: 50, cac: 25, capacity: 3, ttl: 7, churn: 25, services: 80000, ramp: [40, 70, 100] },
  base: { partnerSales: 4000, bpSold: 1500, conv1: 15, conv2: 20, directPartner: 20, evosRetain: 70, cac: 20, capacity: 6, ttl: 5, churn: 20, services: 154000, ramp: [50, 80, 100] },
  ambizioso: { partnerSales: 6000, bpSold: 2200, conv1: 20, conv2: 25, directPartner: 30, evosRetain: 80, cac: 15, capacity: 8, ttl: 4, churn: 12, services: 220000, ramp: [60, 85, 100] },
};

export const SCENARIO_LABELS = { prudente: "Prudente", base: "Base", ambizioso: "Ambizioso" };

// Regola d'uso da CEO (mostrata in UI).
export const SCENARIO_RULE =
  "Budget sul prudente · organico sul base · l'ambizioso serve a decidere quando assumere.";

/** Stato completo (tutte le leve + ramp) per uno scenario. Copia difensiva. */
export function scenarioState(name) {
  const s = SCENARIOS[name] || SCENARIOS.base;
  return { ...s, ramp: s.ramp.slice() };
}

function emptyYear() {
  return { blueprint: 0, start: 0, setup: 0, commPart: 0, canone: 0, services: 0, partners: 0, demand: 0, clamped: false, total: 0 };
}

/**
 * Calcola la traiettoria a 3 anni dallo stato delle leve.
 * @returns {{ years: Array<year>, capAnnual: number }}
 */
export function computeModel(state) {
  const s = state;
  const capAnnual = s.capacity * 12;
  const survMonthly = Math.pow(1 - s.churn / 100, 1 / 12);
  const years = [emptyYear(), emptyYear(), emptyYear()];

  // Ricavi di acquisizione riconosciuti per anno (target × rampa), con clamp
  // capacità sui partner prodotti.
  for (let y = 0; y < 3; y++) {
    const f = (s.ramp[y] || 0) / 100;
    const bpY = s.bpSold * f;
    const nStartY = bpY * s.conv1 / 100;
    const upgDemY = nStartY * s.conv2 / 100;
    const dirY = s.directPartner * f;
    const partnerDemY = upgDemY + dirY;
    const partnersY = Math.min(partnerDemY, capAnnual);
    const ratio = partnerDemY > 0 ? partnersY / partnerDemY : 0;

    years[y].blueprint = bpY * (PRICE.blueprint - s.cac);
    years[y].start = nStartY * PRICE.start;
    years[y].setup = upgDemY * ratio * PRICE.upgrade + dirY * ratio * PRICE.direct;
    years[y].services = s.services * f;
    years[y].partners = partnersY;
    years[y].demand = partnerDemY;
    years[y].clamped = partnerDemY > capAnnual + 1e-6;
  }

  // Simulazione mensile: provvigione (solo finestra Partnership) + canone EVO-S.
  for (let y = 0; y < 3; y++) {
    const sMonthly = years[y].partners / 12;
    if (sMonthly <= 0) continue;
    for (let k = 0; k < 12; k++) {
      const t = y * 12 + k; // mese di acquisizione
      // Provvigione 10%: mesi [t+ttl, t+12) = dal lancio alla fine dei 12 mesi.
      for (let mm = t + s.ttl; mm < t + 12; mm++) {
        if (mm >= 0 && mm < 36) {
          years[Math.floor(mm / 12)].commPart += sMonthly * s.partnerSales * PRICE.commRate;
        }
      }
      // EVO-S canone dal mese t+12, con decadimento churn. Nessuna provvigione.
      for (let mm = t + 12; mm < 36; mm++) {
        const inEvos = mm - (t + 12);
        const active = (s.evosRetain / 100) * Math.pow(survMonthly, inEvos);
        years[Math.floor(mm / 12)].canone += sMonthly * active * EVOS_CANONE_MENSILE;
      }
    }
  }

  years.forEach((o) => {
    o.total = o.blueprint + o.start + o.setup + o.commPart + o.canone + o.services;
  });

  return { years, capAnnual };
}

export const GOAL = 1000000;
