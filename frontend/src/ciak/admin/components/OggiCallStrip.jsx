/**
 * Home "Oggi" — la prima cosa che si vede: quante call ci sono oggi e a che ora.
 *
 * Sempre aperta (non e' un riquadro che si chiude): e' la risposta alla prima domanda
 * del mattino. Fonte: GET /api/admin/ciak/calls-today (eventi cal.com delle sessioni
 * diagnostiche; la stessa del pannello "Call di oggi" in Vendite). Nessuna fonte nuova.
 *
 * Orari sempre in ora di Roma, qualunque sia il fuso del browser.
 * Stati onesti: caricamento, dato non disponibile (con "Riprova"), zero call, elenco.
 * Una fonte che non risponde NON diventa "nessuna call oggi".
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PhoneCall } from "lucide-react";
import { apiGet } from "../api";

export function fmtOraRoma(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome",
  }).format(new Date(t));
}

/** Le call di oggi. undefined = in caricamento · null = non disponibile · oggetto = dati veri. */
export function useCallsToday(onAuthExpired) {
  const [dati, setDati] = useState(undefined);

  const carica = useCallback(() => {
    setDati(undefined);
    apiGet("/calls-today")
      .then((d) => setDati(d && Array.isArray(d.calls) ? d : null))
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
        setDati(null);
      });
  }, [onAuthExpired]);

  useEffect(carica, [carica]);
  return { dati, carica };
}

export function OggiCallStrip({ onAuthExpired }) {
  const { dati, carica } = useCallsToday(onAuthExpired);

  const calls = dati ? dati.calls : [];

  return (
    <section aria-label="Call di oggi" className="mb-6 rounded-2xl border border-yellow-300 bg-white p-5">
      <div className="flex items-center gap-2">
        <PhoneCall className="w-5 h-5 text-yellow-600" aria-hidden />
        <h2 className="text-lg font-semibold text-slate-900">
          {dati === undefined ? "Call di oggi"
            : dati === null ? "Call di oggi"
              : calls.length === 0 ? "Nessuna call oggi"
                : calls.length === 1 ? "Oggi hai 1 call" : `Oggi hai ${calls.length} call`}
        </h2>
      </div>

      {dati === undefined && <p className="text-sm text-slate-400 mt-2">Caricamento…</p>}

      {dati === null && (
        <p className="text-sm text-slate-600 mt-2">
          Dato non disponibile.{" "}
          <button type="button" onClick={carica} className="font-semibold text-slate-900 underline underline-offset-2">
            Riprova
          </button>
        </p>
      )}

      {dati && calls.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {calls.map((c) => (
            <li key={c.session_token || c.email}>
              <Link
                to={`/admin/leads/${encodeURIComponent(c.email)}`}
                className="group flex items-center justify-between gap-4 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
              >
                <span className="flex items-center gap-4 min-w-0">
                  <span className="text-lg font-bold tabular-nums text-slate-900 w-14 flex-shrink-0">{fmtOraRoma(c.starts_at)}</span>
                  <span className="font-semibold text-slate-900 truncate">{c.nome || c.email}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Apri il Report <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default OggiCallStrip;
