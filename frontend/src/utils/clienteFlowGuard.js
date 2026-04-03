/**
 * clienteFlowGuard — flusso guidato cliente Evolution PRO
 *
 * Flusso step-by-step, una sola pagina accessibile per volta:
 *   /benvenuto → /intro-questionario → /questionario
 *   → /attivazione-analisi → /prenota-call
 *   → /proposta (admin attiva) → /firma
 *
 * Pagine speciali sempre accessibili dopo call_prenotata:
 *   /proposta, /firma, /analisi-in-preparazione
 */

const SPECIAL_PAGES = [
  "/proposta",
  "/firma",
  "/analisi-in-preparazione",
  // retrocompatibilità URL vecchi
  "/decisione-partnership",
  "/attivazione-partnership",
];

/**
 * Restituisce la pagina corretta per l'utente dato il suo stato.
 * Null = flusso base completato (può accedere alle pagine speciali).
 */
export function getCorrectPage(user) {
  if (!user || user.user_type !== "cliente_analisi") return null;

  // Call prenotata → flusso base completato
  if (user.call_prenotata) return null;

  // Pagamento analisi completato → prenota call
  if (user.pagamento_effettuato || user.pagamento_analisi) return "/prenota-call";

  // Questionario completato → attivazione analisi (pagamento €67)
  if (user.questionario_completed || user.questionario_compilato) return "/attivazione-analisi";

  // Questionario aperto o intro vista → completa questionario
  if (user.questionario_started || user.intro_questionario_seen) return "/questionario";

  // Benvenuto visto (localStorage) → intro questionario
  if (typeof localStorage !== "undefined" && localStorage.getItem("benvenuto_seen")) {
    return "/intro-questionario";
  }

  // Default → benvenuto (primo accesso post-registrazione)
  return "/benvenuto";
}

/**
 * Verifica se il path corrente è quello corretto.
 * Se no, esegue il redirect e restituisce true (il chiamante fa return null).
 */
export function enforceClienteFlow(user, currentPath) {
  if (SPECIAL_PAGES.some(p => currentPath.startsWith(p))) return false;

  const correct = getCorrectPage(user);
  if (correct && currentPath !== correct) {
    window.location.href = correct;
    return true;
  }
  return false;
}
