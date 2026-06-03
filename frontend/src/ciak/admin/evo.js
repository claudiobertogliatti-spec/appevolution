/**
 * Mappa la fase legacy del partner (F1–F10, stored nel journey backend) all'atto
 * del Metodo EVO mostrato in admin. Unica fonte di verità: usata da Percorso EVO,
 * Pipeline Partner ed Ex Partner così l'admin parla la stessa lingua del partner.
 *
 * Canonico (vedi backend JOURNEY_STEPS_DEFINITION): F1-F2 = Esamina,
 * F3-F7 = Valida, oltre (F8/F9/F10/LIVE o journey completato) = Ottimizza.
 * Ritorna null se la fase non è ancora impostata: il chiamante decide il fallback.
 */
export function attoEvo(phase) {
  if (!phase) return null;
  if (phase === "F1" || phase === "F2") return "Esamina";
  if (["F3", "F4", "F5", "F6", "F7"].includes(phase)) return "Valida";
  return "Ottimizza";
}
