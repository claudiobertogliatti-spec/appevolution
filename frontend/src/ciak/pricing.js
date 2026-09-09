/**
 * pricing.js — SSOT (single source of truth) dei prezzi del percorso
 * Insider / checkout Ciak Start e Partnership.
 *
 * Listino verificato al 2026-09-09:
 *  - Ciak Start: 390 €
 *  - Partnership Evolution PRO: 2.990 €
 *  - Upgrade Start → Partnership: 2.600 € (credito dei 390 € già versati incluso)
 *
 * Il Blueprint (analisi consulenziale) NON è qui: è una decisione di flusso
 * separata (prezzo/checkout gestiti altrove) e va lasciata intatta.
 */

export const PRICING = {
  start: { cents: 39000, label: "390 €" },
  partnership: { cents: 299000, label: "2.990 €" },
  upgradeFromStart: { cents: 260000, label: "2.600 €" },
};

export const euro = (cents) => `${(cents / 100).toLocaleString("it-IT")} €`;
