/**
 * Ciak Admin — Ex Partner.
 *
 * Partner con partnership conclusa o risolta (stato = "ex"). Lista semplice
 * con possibilità di riattivare. Lo stato "ex" si imposta dalla pagina
 * Quarantena Partner (selettore stato) o da qui.
 *
 * Backend:
 *  GET  /api/admin/ciak/partners?stato=ex
 *  POST /api/admin/ciak/partner/:id/stato  { stato: "attivo" }
 */
import { useEffect, useState, useCallback } from "react";
import { apiGet, adminFetch } from "../api";

export function ExPartner({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setPartners(null);
    apiGet("/partners", { stato: "ex" })
      .then((d) => setPartners(d.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(() => {
    load();
  }, [load]);

  const riattiva = async (id) => {
    if (!window.confirm("Riportare questo partner allo stato attivo?")) return;
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${id}/stato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato: "attivo" }),
      });
      if (!res.ok) throw new Error("Errore");
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!partners) return <div className="p-8 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Ex Partner</h1>
      <p className="text-slate-500 mb-6">
        Partner con partnership conclusa o risolta. {partners.length} in totale.
      </p>

      {partners.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun ex partner. Lo stato "ex" si imposta dalla pagina Quarantena Partner.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold">Fase raggiunta</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{p.name || "—"}</div>
                    <div className="text-slate-500 text-xs">{p.email}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{p.phase || "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => riattiva(p.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      Riattiva
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
