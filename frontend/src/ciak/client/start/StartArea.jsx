import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { clearClientSession, clientGet } from "../api";
import StartShell from "./StartShell";
import StartOggi from "./StartOggi";
import StartPercorso from "./StartPercorso";
import StartMateriali from "./StartMateriali";
import StartAssistenza from "./StartAssistenza";
import { StartDomandePage } from "../pages/StartDomandePage";
import { StartMarchioPage } from "../pages/StartMarchioPage";
import { PartnershipEducationPage } from "../pages/PartnershipEducationPage";
import { SimulatorePage } from "../pages/SimulatorePage";

/**
 * L'area del cliente Ciak Start, nella grafica dell'area partner (decisione di Claudio,
 * 12/10/2026). Vale SOLO per chi ha Ciak Start attivo (`access_level === "cliente_start"`):
 * Blueprint e Partnership restano con la loro area.
 *
 * Carica una volta i dati veri (risposte, marchio, materiali approvati) e li ricarica a
 * ogni cambio di pagina, cosi' "Oggi" riflette subito quello che si e' appena inviato.
 * Gli indirizzi storici (`/cliente/start/domande`, `/cliente/start/marchio`) restano.
 */
export default function StartArea({ dashboard, pagamentoConfermato = false }) {
  const client = dashboard.client;
  const location = useLocation();
  const [dati, setDati] = useState({ risposte: null, marchio: null, deliverables: null, errore: false });

  const carica = useCallback(() => {
    let annullato = false;
    Promise.all([clientGet("/start/risposte"), clientGet("/start/marchio"), clientGet("/start/deliverables")])
      .then(([risposte, marchio, deliverables]) => {
        if (annullato) return;
        setDati({ risposte, marchio, deliverables: deliverables.items || [], errore: false });
      })
      .catch((e) => {
        if (annullato) return;
        if (e.message === "AUTH_EXPIRED") window.location.href = "/cliente/accesso";
        else setDati((d) => ({ ...d, errore: true }));
      });
    return () => { annullato = true; };
  }, []);

  useEffect(() => carica(), [carica, location.pathname]);

  const logout = () => {
    clearClientSession();
    window.location.href = "/cliente";
  };
  const tutti = { ...dati, consegne: dashboard.start?.consegne || [] };

  return (
    <StartShell client={client} onLogout={logout}>
      <Routes>
        <Route index element={<StartOggi client={client} dati={tutti} onRetry={carica} pagamentoConfermato={pagamentoConfermato} />} />
        <Route path="percorso" element={<StartPercorso dati={tutti} onRetry={carica} />} />
        <Route path="materiali" element={<StartMateriali dati={tutti} onRetry={carica} />} />
        <Route path="assistenza" element={<StartAssistenza client={client} />} />
        <Route path="start/domande" element={<StartDomandePage dashboard={dashboard} />} />
        <Route path="start/marchio" element={<StartMarchioPage dashboard={dashboard} />} />
        <Route path="partnership" element={<PartnershipEducationPage dashboard={dashboard} />} />
        <Route path="simulatore" element={<SimulatorePage />} />
        {/* Il vecchio indirizzo della pagina Start e il resto portano a "Oggi". */}
        <Route path="*" element={<Navigate to="/cliente" replace />} />
      </Routes>
    </StartShell>
  );
}
