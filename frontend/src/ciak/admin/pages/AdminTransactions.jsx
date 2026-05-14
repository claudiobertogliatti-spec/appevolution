/**
 * Ciak Admin — Transazioni. GET /api/admin/ciak/transactions.
 *
 * Acquisti Ciak Blueprint €67: collegati (con diagnostic session) + orfani.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";

function euro(cent) {
  if (cent == null) return "—";
  return `€ ${(cent / 100).toFixed(2)}`;
}

export function AdminTransactions({ onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/transactions", { limit: 200 })
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Transazioni</h1>
      <p className="text-slate-500 mb-6">Acquisti Ciak Blueprint €67.</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Transazioni
          </p>
          <p className="text-3xl font-semibold text-slate-900">{data.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Totale incassato
          </p>
          <p className="text-3xl font-semibold text-yellow-500">
            {euro(data.total_incassato_cent)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
              <th className="px-5 py-3 font-semibold">Cliente</th>
              <th className="px-5 py-3 font-semibold">Importo</th>
              <th className="px-5 py-3 font-semibold">Data</th>
              <th className="px-5 py-3 font-semibold">Stato pipeline</th>
              <th className="px-5 py-3 font-semibold">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  Nessuna transazione ancora.
                </td>
              </tr>
            )}
            {data.items.map((t, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 last:border-0 ${
                  t.email ? "hover:bg-gray-50 cursor-pointer" : ""
                }`}
                onClick={() =>
                  t.email && navigate(`/admin/leads/${encodeURIComponent(t.email)}`)
                }
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{t.nome || "—"}</div>
                  <div className="text-slate-500 text-xs">{t.email || "email mancante"}</div>
                </td>
                <td className="px-5 py-3 font-semibold text-slate-900">
                  {euro(t.amount_total)}
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">{t.at || "—"}</td>
                <td className="px-5 py-3 text-slate-600 text-xs">
                  {t.current_state || "—"}
                </td>
                <td className="px-5 py-3">
                  {t.type === "orphan" ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                      Orfano
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-slate-500">
                      Collegato
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
