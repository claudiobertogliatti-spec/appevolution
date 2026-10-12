/**
 * Compiti di un partner (stile Trello): cosa c'è da fare, entro quando (facoltativo).
 * Si chiudono con «Fatto» e restano registrati. GET/POST /partner-attivita.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, SCOPE_DENIED_DETAIL } from "../api";
import { messaggioErrore } from "./SollecitoPannello";
import { dataIt, oggiISO } from "./PassoPannello";

export function CompitiPartner({ partnerId, onAuthExpired }) {
  const [compiti, setCompiti] = useState(undefined); // undefined = carico · null = non disponibili
  const [testo, setTesto] = useState("");
  const [scadenza, setScadenza] = useState("");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState(null);
  const [nascosto, setNascosto] = useState(false); // account senza accesso: la sezione non esiste

  const carica = useCallback(() => {
    apiGet("/partner-attivita", { partner_id: partnerId })
      .then((r) => setCompiti(Array.isArray(r?.items) ? r.items : null))
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
        if (e?.message === SCOPE_DENIED_DETAIL) return setNascosto(true);
        setCompiti(null);
      });
  }, [partnerId, onAuthExpired]);

  useEffect(() => { carica(); }, [carica]);

  const agisci = async (fn) => {
    setBusy(true);
    setErrore(null);
    try {
      await fn();
      carica();
      return true;
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore(messaggioErrore(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const aggiungi = async (ev) => {
    ev.preventDefault();
    const ok = await agisci(() => apiPost("/partner-attivita", { partner_id: partnerId, testo, scadenza: scadenza || null }));
    if (ok) { setTesto(""); setScadenza(""); }
  };

  if (nascosto) return null;

  return (
    <section aria-labelledby="compiti-t" className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 id="compiti-t" className="text-sm font-semibold uppercase tracking-widest text-slate-400">Compiti</h3>

      {compiti === undefined && <p className="mt-3 text-sm text-slate-500">Carico…</p>}
      {compiti === null && (
        <p className="mt-3 text-sm text-slate-600">Compiti non disponibili. <button type="button" onClick={carica} className="font-semibold underline underline-offset-2">Riprova</button></p>
      )}
      {Array.isArray(compiti) && (
        compiti.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nessun compito aperto.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {compiti.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 text-sm text-slate-900">
                  {c.testo}
                  {c.scadenza && (
                    <span className={`ml-2 ${c.stato_scadenza === "scaduto" ? "font-semibold text-red-700" : "text-slate-500"}`}>
                      {c.stato_scadenza === "scaduto" ? "scaduto il" : "entro il"} {dataIt(c.scadenza)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => agisci(() => apiPost("/partner-attivita/fatto", { id: c.id }))}
                  aria-label={`Segna come fatto: ${c.testo}`}
                  className="flex-shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-900 disabled:opacity-50"
                >
                  Fatto
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      <form onSubmit={aggiungi} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="compito-testo" className="block text-xs font-semibold text-slate-600">Nuovo compito</label>
          <input id="compito-testo" value={testo} maxLength={300} onChange={(e) => setTesto(e.target.value)}
            placeholder="Es. Sentire il partner per il funnel"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400" />
        </div>
        <div>
          <label htmlFor="compito-data" className="block text-xs font-semibold text-slate-600">Entro (facoltativo)</label>
          <input id="compito-data" type="date" min={oggiISO()} value={scadenza} onChange={(e) => setScadenza(e.target.value)}
            className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400" />
        </div>
        <button type="submit" disabled={busy || testo.trim().length < 3}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
          Aggiungi
        </button>
      </form>
      {errore && <p className="mt-3 text-sm text-red-700" role="alert">{errore}</p>}
    </section>
  );
}

export default CompitiPartner;
