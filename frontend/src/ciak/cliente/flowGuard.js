/**
 * Ciak Cliente — guard del flusso lineare (porting da
 * frontend/src/utils/clienteFlowGuard.js).
 *
 * Flusso step-by-step, una sola pagina accessibile per volta:
 *   /cliente/benvenuto → /cliente/intro-questionario → /cliente/questionario
 *   → /cliente/attivazione-analisi → /cliente/prenota-call
 *   → /cliente/analisi-in-preparazione → /cliente/proposta
 *
 * Pagine speciali sempre accessibili dopo call_prenotata:
 *   /cliente/proposta, /cliente/firma, /cliente/analisi-in-preparazione,
 *   + retrocompatibilità URL legacy.
 */

export const CLIENT_BASE = "/cliente";

const SPECIAL_PATHS = [
  `${CLIENT_BASE}/proposta`,
  `${CLIENT_BASE}/firma`,
  `${CLIENT_BASE}/analisi-in-preparazione`,
  // retrocompatibilità URL Evolution
  `${CLIENT_BASE}/decisione-partnership`,
  `${CLIENT_BASE}/attivazione-partnership`,
];

/**
 * Restituisce il path corretto (relativo a /cliente) per l'utente dato il suo stato.
 * Null = flusso base completato (può accedere alle pagine speciali).
 */
export function getCorrectPage(user) {
  if (!user) return null;
  const isCliente = user.role === "cliente" || user.user_type === "cliente_analisi";
  if (!isCliente) return null;

  // Call prenotata → flusso base completato
  if (user.call_prenotata) return null;

  // Pagamento analisi completato → prenota call
  if (user.pagamento_effettuato || user.pagamento_analisi) return `${CLIENT_BASE}/prenota-call`;

  // Questionario completato → attivazione analisi (pagamento €67)
  if (user.questionario_completed || user.questionario_compilato) return `${CLIENT_BASE}/attivazione-analisi`;

  // Questionario aperto o intro vista → completa questionario
  const introSeen =
    user.questionario_started ||
    user.intro_questionario_seen ||
    (typeof localStorage !== "undefined" && localStorage.getItem("intro_questionario_seen"));
  if (introSeen) return `${CLIENT_BASE}/questionario`;

  // Benvenuto visto (localStorage) → intro questionario
  if (typeof localStorage !== "undefined" && localStorage.getItem("benvenuto_seen")) {
    return `${CLIENT_BASE}/intro-questionario`;
  }

  // Default → benvenuto (primo accesso post-registrazione)
  return `${CLIENT_BASE}/benvenuto`;
}

/** True se path è una pagina speciale sempre accessibile post-call. */
export function isSpecialPath(currentPath) {
  return SPECIAL_PATHS.some((p) => currentPath.startsWith(p));
}
