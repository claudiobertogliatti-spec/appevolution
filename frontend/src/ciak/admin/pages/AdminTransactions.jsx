/**
 * Ciak Admin — Transazioni.
 *
 * 2 tab:
 *  - Ciak Blueprint €67  → GET /api/admin/ciak/transactions
 *  - Partnership €2.790  → GET /api/admin/ciak/transactions-partnership
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";

function euroCent(cent) {
  if (cent == null) return "—";
  return `€ ${(cent / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
}
function euroFloat(eur) {
  if (eur == null) return "—";
  return `€ ${Number(eur).toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// ─── Tab 1: Blueprint €67 ─────────────────────────────────────────────────
function BlueprintTable({ onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/transactions", { limit: 200 })
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  if (error) return <div className="text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="text-slate-400">Caricamento…</div>;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Transazioni" value={data.total} />
        <KpiCard label="Totale incassato" value={euroCent(data.total_incassato_cent)} accent />
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
                  {euroCent(t.amount_total)}
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(t.at)}</td>
                <td className="px-5 py-3 text-slate-600 text-xs">{t.current_state || "—"}</td>
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

// ─── Tab 2: Partnership €2.790 ────────────────────────────────────────────
function PartnershipTable({ onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/transactions-partnership", { limit: 200 })
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  if (error) return <div className="text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="text-slate-400">Caricamento…</div>;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Contratti pagati" value={data.total} />
        <KpiCard label="Totale incassato" value={euroFloat(data.total_incassato_euro)} accent />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
              <th className="px-5 py-3 font-semibold">Partner</th>
              <th className="px-5 py-3 font-semibold">Importo</th>
              <th className="px-5 py-3 font-semibold">Metodo</th>
              <th className="px-5 py-3 font-semibold">Pagato il</th>
              <th className="px-5 py-3 font-semibold">Contratto</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  Nessuna Partnership pagata ancora.
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
                  {euroFloat(t.amount_euro)}
                </td>
                <td className="px-5 py-3 text-slate-600 text-xs capitalize">{t.metodo || "—"}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(t.at)}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {t.contratto_firmato_at ? `firmato ${fmtDate(t.contratto_firmato_at)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
        {label}
      </p>
      <p className={`text-3xl font-semibold ${accent ? "text-yellow-500" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

export function AdminTransactions({ onAuthExpired }) {
  const [tab, setTab] = useState("blueprint");

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Transazioni</h1>
      <p className="text-slate-500 mb-6">Acquisti Ciak Blueprint €67 e Partnership €2.790.</p>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("blueprint")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
            tab === "blueprint"
              ? "border-yellow-400 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Ciak Blueprint €67
        </button>
        <button
          onClick={() => setTab("partnership")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
            tab === "partnership"
              ? "border-yellow-400 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Partnership €2.790
        </button>
      </div>

      {tab === "blueprint" ? (
        <BlueprintTable onAuthExpired={onAuthExpired} />
      ) : (
        <PartnershipTable onAuthExpired={onAuthExpired} />
      )}
    </div>
  );
}
