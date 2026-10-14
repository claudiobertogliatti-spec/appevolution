/**
 * CodaAssistente — le domande che l'assistente (Start o partner) ha passato al team.
 *
 * `base` e' il percorso admin del cliente/partner (es. `/start/<id>` o `/partner/<id>`): la coda si
 * legge da `${base}/assistente` e una riga si chiude con `${base}/assistente/<riga>/gestita`.
 * Una fonte che non risponde dice «Dato non disponibile», mai «nessuna domanda».
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";

const BTN =
  "rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition";

const MOTIVO = {
  argomento_delicato: "tema delicato",
  errore_servizio: "servizio non raggiungibile",
};

export function CodaAssistente({ base, email, onAuthExpired }) {
  const [coda, setCoda] = useState(undefined); // undefined = carico, null = non leggibile
  const [occupato, setOccupato] = useState(null);
  const [errore, setErrore] = useState(null);

  const carica = useCallback(() => {
    apiGet(`${base}/assistente`)
      .then((a) => setCoda(Array.isArray(a?.righe) ? a : null))
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
        setCoda(null);
      });
  }, [base, onAuthExpired]);

  useEffect(carica, [carica]);

  const gestita = async (riga) => {
    setOccupato(riga.id);
    setErrore(null);
    try {
      await apiPost(`${base}/assistente/${riga.id}/gestita`, {});
      carica();
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore(e?.message || "Non sono riuscito a segnarla. Riprova.");
    } finally {
      setOccupato(null);
    }
  };

  const aperte = coda ? coda.righe.filter((r) => r.passato_al_team && !r.gestita) : [];
  return (
    <section className="my-6 rounded-xl border border-gray-200 bg-white p-5" data-testid="assistente-coda">
      <h2 className="text-sm font-semibold text-slate-900">Domande all'assistente</h2>
      {coda === undefined ? (
        <p className="mt-2 text-xs text-slate-400">Caricamento…</p>
      ) : coda === null ? (
        <p className="mt-2 text-xs text-slate-500">Dato non disponibile.</p>
      ) : aperte.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Nessuna domanda in attesa di te{coda.righe.length ? ` (${coda.righe.length} fatte, l'assistente ha risposto)` : ""}.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {aperte.map((r) => (
            <li key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800">
              <p>«{r.domanda}»</p>
              <p className="mt-1 text-xs text-slate-500">
                {String(r.at || "").slice(0, 10)} · {MOTIVO[r.motivo] || "l'assistente non sapeva"}
                {email ? ` · rispondi tu a ${email}` : ""}
              </p>
              <button type="button" disabled={occupato === r.id} onClick={() => gestita(r)} className={`mt-2 ${BTN}`}>
                Fatto, ho risposto
              </button>
            </li>
          ))}
        </ul>
      )}
      {errore && <p role="alert" className="mt-2 text-xs text-red-700">{errore}</p>}
    </section>
  );
}

export default CodaAssistente;
