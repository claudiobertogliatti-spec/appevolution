/** Chat con Andrea: la chat generica con la configurazione di Andrea. */
import { AgenteChat } from "./AgenteChat";

export function AndreaChat({ onAuthExpired }) {
  return <AgenteChat agente="andrea" onAuthExpired={onAuthExpired} />;
}

export default AndreaChat;
