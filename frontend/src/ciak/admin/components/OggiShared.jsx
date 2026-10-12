/**
 * Dati della home «Oggi» caricati UNA volta per sessione e condivisi tra la sidebar
 * (i numeri accanto agli agenti) e la nuova home. Stesse fonti di sempre, nessuna nuova.
 *
 * Attivo solo dove serve (`enabled`): per gli altri account non parte nessuna richiesta.
 */
import { createContext, useContext } from "react";
import { useOggiData } from "./OggiBlocks";
import { useCallsToday } from "./OggiCallStrip";

const Ctx = createContext(null);

function Dati({ onAuthExpired, children }) {
  const oggi = useOggiData(onAuthExpired);
  const calls = useCallsToday(onAuthExpired);
  return <Ctx.Provider value={{ oggi, calls }}>{children}</Ctx.Provider>;
}

export function OggiSharedProvider({ enabled, onAuthExpired, children }) {
  return enabled ? <Dati onAuthExpired={onAuthExpired}>{children}</Dati> : children;
}

/** null se fuori dal provider. */
export const useOggiShared = () => useContext(Ctx);
