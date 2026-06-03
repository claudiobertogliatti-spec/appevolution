/**
 * Mappa la fase legacy del partner all'atto del Metodo EVO mostrato in admin.
 * Unica fonte di verità: usata dall'hub Partner (viste Per atto / Tabella) ed
 * Ex Partner, così l'admin parla la stessa lingua del partner.
 *
 * Canonico (vedi backend JOURNEY_STEPS_DEFINITION): la fase legacy arriva a F7.
 * F1-F2 = Esamina, F3-F7 = Valida, qualsiasi cosa oltre (o journey completato)
 * = Ottimizza. Ritorna null se la fase non è impostata: il chiamante sceglie il
 * fallback.
 */
export function attoEvo(phase) {
  if (!phase) return null;
  if (phase === "F1" || phase === "F2") return "Esamina";
  if (["F3", "F4", "F5", "F6", "F7"].includes(phase)) return "Valida";
  return "Ottimizza";
}
