// Chi ha gia' visto il benvenuto Ciak Start non lo rivede: flag per-cliente.
// localStorage puo' mancare (finestra privata, storage bloccato): in dubbio si
// considera "gia' visto", perche' ripresentarlo a ogni visita infastidisce piu'
// che ometterlo una volta.
//
// La chiave porta la VERSIONE del benvenuto. La prima versione (Metodo EVO, quella
// della Partnership) usava `ciak_welcome_start_seen_<id>`: chi l'aveva gia' chiusa
// non avrebbe mai visto il benvenuto giusto. Con `_v2_` lo vede una volta, e basta.
export const CHIAVE_BENVENUTO = (clientId) => `ciak_welcome_start_v2_seen_${clientId}`;

export function welcomeAlreadySeen(clientId) {
  if (!clientId) return true;
  try {
    return localStorage.getItem(CHIAVE_BENVENUTO(clientId)) === "1";
  } catch {
    return true;
  }
}

export function markWelcomeSeen(clientId) {
  if (!clientId) return;
  try {
    localStorage.setItem(CHIAVE_BENVENUTO(clientId), "1");
  } catch {
    // Storage non disponibile: pazienza, si ripresentera' al prossimo caricamento.
  }
}
