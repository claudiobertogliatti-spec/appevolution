/**
 * Casella notifiche (home «Oggi»): le risposte degli agenti ai tuoi commenti.
 * Mostra le non lette; «Segna tutte come lette» le toglie. Il link porta alla scheda.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import { agentePerChiave } from "./agentiCiak";

const href = (n) =>
  n.target_tipo === "lead" ? `/admin/leads/${encodeURIComponent(n.target_id)}` : "/admin/partner";

export function NotificheInbox({ onAuthExpired }) {
  const [dati, setDati] = useState(undefined); // undefined = carico · null = non disponibile

  const carica = useCallback(() => {
    apiGet("/notifiche")
      .then((r) => setDati(Array.isArray(r?.items) ? r : null))
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
        setDati(null);
      });
  }, [onAuthExpired]);

  useEffect(() => { carica(); }, [carica]);

  const segna = (body) =>
    apiPost("/notifiche/letta", body).then(carica).catch((e) => { if (e?.message === "AUTH_EXPIRED") onAuthExpired?.(); });

  if (dati === undefined) return null;
  if (dati === null) {
    return (
      <p className="mb-8 text-sm text-slate-600">
        Notifiche non disponibili. <button type="button" onClick={carica} className="font-semibold underline underline-offset-2">Riprova</button>
      </p>
    );
  }
  const nuove = dati.items.filter((n) => !n.letta_at);
  if (nuove.length === 0) return null; // niente da leggere: la sezione non occupa spazio

  return (
    <section aria-labelledby="t-notifiche" className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="t-notifiche" className="text-2xl font-semibold text-slate-900">
          Risposte dei tuoi agenti <span className="ml-2 rounded-full bg-slate-900 px-2.5 py-0.5 text-sm text-yellow-400">{dati.non_lette}</span>
        </h2>
        <button type="button" onClick={() => segna({ tutte: true })} className="text-sm font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900">
          Segna tutte come lette
        </button>
      </div>
      <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {nuove.slice(0, 5).map((n) => {
          const ag = agentePerChiave(n.agente);
          return (
            <li key={n.id} className="flex items-center gap-4 px-6 py-4">
              {ag && <img src={ag.foto} alt="" width={40} height={40} className="h-10 w-10 flex-shrink-0 rounded-full object-cover bg-slate-200" />}
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900">{n.titolo}</p>
                <p className="truncate text-sm text-slate-600">{n.anteprima}</p>
              </div>
              <Link to={href(n)} onClick={() => segna({ id: n.id })}
                className="flex-shrink-0 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-slate-800">
                Apri
              </Link>
            </li>
          );
        })}
      </ul>
      {nuove.length > 5 && <p className="mt-2 text-xs text-slate-500">Altre {nuove.length - 5} non lette.</p>}
    </section>
  );
}

export default NotificheInbox;
