/**
 * Home «Oggi» — Carlo: chi si è fermato nel percorso gratuito e vale un'email.
 * Un'email alla volta, con la bozza di Carlo e la tua approvazione (SollecitoPannello, flusso
 * «recupero»). Niente invii di massa. Dopo l'invio la persona esce dalla lista.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import { SollecitoPannello } from "./SollecitoPannello";

const RIGHE = 5;
const giorniLabel = (n) => `${n} ${n === 1 ? "giorno" : "giorni"}`;

export function DaRecuperare({ onAuthExpired }) {
  const [dati, setDati] = useState(undefined); // undefined = carico · null = non disponibile
  const [aperto, setAperto] = useState(null);

  const carica = useCallback(() => {
    apiGet("/recupero")
      .then((r) => setDati(Array.isArray(r?.items) ? r.items : null))
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
        setDati(null);
      });
  }, [onAuthExpired]);

  useEffect(() => { carica(); }, [carica]);

  return (
    <section aria-labelledby="t-recupero" className="mb-10">
      <div className="flex items-center gap-4">
        <img src="/agents/matteo.jpg" alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover ring-2 ring-yellow-400 bg-slate-200" />
        <div>
          <h2 id="t-recupero" className="text-2xl font-semibold text-slate-900">Da recuperare</h2>
          <p className="mt-1 text-sm text-slate-500">Si sono fermati nel percorso gratuito. Un&apos;email alla volta, con la tua approvazione.</p>
        </div>
      </div>

      <div className="mt-4">
        {dati === undefined ? <p className="text-sm text-slate-500">Carico…</p>
          : dati === null ? (
            <p className="text-sm text-slate-600">Dato non disponibile. <button type="button" onClick={carica} className="font-semibold underline underline-offset-2">Riprova</button></p>
          ) : dati.length === 0 ? <p className="text-sm text-slate-500">Nessuno da recuperare adesso.</p>
          : (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {dati.slice(0, RIGHE).map((c) => (
                <li key={c.email} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <Link to={`/admin/leads/${encodeURIComponent(c.email)}`} className="block truncate text-lg font-semibold text-slate-900 hover:underline underline-offset-2">
                      {c.nome || c.email}
                    </Link>
                    <p className="text-sm text-slate-500">{c.motivo_label} · da {giorniLabel(c.giorni)}</p>
                  </div>
                  <button type="button" onClick={() => setAperto(c)}
                    className="flex-shrink-0 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400">
                    Prepara l&apos;email
                  </button>
                </li>
              ))}
            </ul>
          )}
        {Array.isArray(dati) && dati.length > RIGHE && <p className="mt-2 text-xs text-slate-500">Altri {dati.length - RIGHE} dopo questi.</p>}
      </div>

      {aperto && (
        <SollecitoPannello
          tipo="recupero"
          email={aperto.email}
          nome={aperto.nome || aperto.email}
          onClose={() => setAperto(null)}
          onInviato={carica}
          onAuthExpired={onAuthExpired}
        />
      )}
    </section>
  );
}

export default DaRecuperare;
