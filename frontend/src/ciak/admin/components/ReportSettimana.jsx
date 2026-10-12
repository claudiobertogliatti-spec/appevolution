/**
 * Report della settimana di Luca: conteggi veri degli ultimi 7 giorni contro i 7 precedenti.
 * Una voce non contabile mostra «n/d», mai 0. Se il server nega l'accesso sparisce.
 */
import { useEffect, useState } from "react";
import { apiGet, SCOPE_DENIED_DETAIL } from "../api";

function Variazione({ v }) {
  if (v === null || v === undefined) return <span className="text-slate-400">—</span>;
  if (v === 0) return <span className="text-slate-500">invariato</span>;
  return <span className={v > 0 ? "text-emerald-700" : "text-red-700"}>{v > 0 ? "+" : ""}{v} sulla settimana prima</span>;
}

export function ReportSettimana({ onAuthExpired }) {
  const [dati, setDati] = useState(null);
  const [nascosto, setNascosto] = useState(false);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    let vivo = true;
    apiGet("/report/settimana")
      .then((r) => vivo && setDati(r))
      .catch((e) => {
        if (!vivo) return;
        if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
        if (String(e?.message || "").includes(SCOPE_DENIED_DETAIL)) return setNascosto(true);
        setErrore(true);
      });
    return () => { vivo = false; };
  }, [onAuthExpired]);

  if (nascosto) return null;
  return (
    <section aria-labelledby="t-report" className="mt-10">
      <div className="flex items-center gap-4">
        <img src="/agents/luca.jpg" alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover ring-2 ring-yellow-400 bg-slate-200" />
        <div>
          <h2 id="t-report" className="text-2xl font-semibold text-slate-900">La settimana in numeri</h2>
          <p className="text-sm text-slate-500">Ultimi 7 giorni, contati dai dati di Ciak. «n/d» vuol dire che non sono riuscito a contare.</p>
        </div>
      </div>
      {errore && <p className="mt-4 text-sm text-red-700" role="alert">Non riesco a caricare il report adesso.</p>}
      {Array.isArray(dati?.voci) && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {dati.voci.map((v) => (
            <li key={v.chiave} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600">{v.etichetta}</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{v.attuale ?? "n/d"}</p>
              <p className="mt-1 text-sm"><Variazione v={v.variazione} /></p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ReportSettimana;
