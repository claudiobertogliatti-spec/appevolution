/**
 * obiettivoModel.js — motore del Simulatore Obiettivo del partner (Fase 1).
 *
 * Obiettivo-first: dal fatturato mensile desiderato calcola a ritroso quante
 * persone nuove servono ogni settimana. Modulo PURO (nessuna dipendenza React),
 * testabile in isolamento. Numeri di calibrazione LOCK (vedi spec 2026-07-22).
 *
 * Catena: obiettivo ÷ prezzo = vendite/mese ÷ conv = partecipanti webinar
 *         ÷ presenza = iscritti/mese ÷ 4,33 = iscritti nuovi/settimana.
 */

// Prezzo dei corsi partner: regola di prodotto (Claudio, LOCK) 97–297 €.
export const PRICE_MIN = 97;
export const PRICE_MAX = 297;

// Default tarati sul webinar del metodo (pubblico caldo/piccolo).
export const DEFAULTS = { price: 297, conv: 15, show: 50 };

// Obiettivi mostrati come scelta rapida: "per partire" / "sano" / "solida".
export const GOALS = [2000, 5000, 10000];

const WEEKS_PER_MONTH = 4.33;

/** Vincola il prezzo al range consentito; NaN → minimo. */
export function clampPrice(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return PRICE_MIN;
  return Math.min(PRICE_MAX, Math.max(PRICE_MIN, n));
}

/**
 * Traduce l'obiettivo mensile nel ritmo settimanale.
 * @returns {{ sales:number, attend:number, leads:number, perWeek:number }}
 */
export function computeRitmo({ goal, price, conv, show }) {
  const g = Math.max(0, Number(goal) || 0);
  const p = clampPrice(price);
  const c = Math.max(0, Number(conv) || 0) / 100;
  const s = Math.max(0, Number(show) || 0) / 100;
  const sales = g / p;
  const attend = c > 0 ? sales / c : 0;
  const leads = s > 0 ? attend / s : 0;
  const perWeek = leads / WEEKS_PER_MONTH;
  return { sales, attend, leads, perWeek };
}

/** Mesi stimati per andare a regime, a scaglioni sul ritmo richiesto. */
export function etaMesi(perWeek) {
  if (perWeek <= 40) return 3;
  if (perWeek <= 90) return 4;
  if (perWeek <= 160) return 5;
  return 6;
}
