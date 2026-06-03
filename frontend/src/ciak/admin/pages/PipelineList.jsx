/**
 * Ciak Admin — Pipeline (vista tabellare verticale).
 *
 * Sostituisce il kanban orizzontale: Claudio vuole le pipeline come tabella,
 * stesso stile di Pipeline Partner. Lo "stadio" del funnel diventa una colonna.
 *
 * Usata da due route:
 *  - Pipeline Prospect  (Acquisizione Clienti) → endpoint /pipeline-prospect
 *  - Pipeline Blueprint (Clienti Attivi)       → endpoint /pipeline-blueprint
 *
 * Backend: GET /api/admin/ciak/<endpoint> → { columns:[{id,label,count,items}], total }
 * Le righe sono ordinate seguendo il funnel (ordine delle colonne backend).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return "—";
  }
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PipelineList({ endpoint, title, subtitle, onAuthExpired, mirrorNote }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [stageFilter, setStageFilter] = useState("");

  useEffect(() => {
    setData(null);
    setError(null);
    apiGet(endpoint)
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [endpoint, onAuthExpired]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Caricamento…</div>;

  // Appiattisce le colonne in righe, preservando l'ordine del funnel.
  const rows = [];
  data.columns.forEach((col) => {
    col.items.forEach((item) =>
      rows.push({ ...item, stage_id: col.id, stage_label: col.label })
    );
  });
  const filtered = stageFilter ? rows.filter((r) => r.stage_id === stageFilter) : rows;

  const openItem = (item) => {
    if (item.email) navigate(`/admin/leads/${encodeURIComponent(item.email)}`);
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
        >
          <option value="">Tutti gli stadi</option>
          {data.columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({c.count})
            </option>
          ))}
        </select>
      </div>
      <p className="text-slate-500 mb-3">
        {subtitle} — {data.total} contatti.
      </p>

      {mirrorNote && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {mirrorNote}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun contatto in questo stadio.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Contatto</th>
                <th className="px-5 py-3 font-semibold">Stadio</th>
                <th className="px-5 py-3 font-semibold">Aggiornato</th>
                <th className="px-5 py-3 font-semibold text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.email || i}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openItem(r)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {initials(r.nome)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {r.nome || "—"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-900 text-yellow-400">
                      {r.stage_label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(r.updated_at)}</td>
                  <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openItem(r)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-yellow-400 text-xs font-semibold hover:bg-slate-800 transition"
                    >
                      Apri →
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
