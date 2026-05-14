/**
 * Ciak Admin — Pipeline kanban generica.
 *
 * Vista a colonne del funnel. Usata da due route:
 *  - Pipeline Prospect  (Acquisizione Clienti) → endpoint /pipeline-prospect
 *  - Pipeline Blueprint (Clienti Attivi)       → endpoint /pipeline-blueprint
 *
 * Le colonne sono la state machine a 10 stati (memory: ciak_technical_spec.md):
 *  Prospect  = iscritto → checkpoint → 8 Domande → report Matteo → click €67
 *  Blueprint = acquistato → call prenotata → call fatta → in trattativa → contratto+pagato
 *
 * Backend: GET /api/admin/ciak/<endpoint> → { columns:[{id,label,count,items}], total }
 * Ogni item: { email, nome, stage, updated_at, session_token }.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";

function fmtDate(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function LeadCard({ item, onOpen }) {
  return (
    <button
      onClick={() => onOpen(item)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-3 hover:border-slate-400 hover:shadow-sm transition"
    >
      <div className="text-sm font-medium text-slate-900 truncate">
        {item.nome || "—"}
      </div>
      <div className="text-xs text-slate-500 truncate">{item.email}</div>
      {item.updated_at && (
        <div className="text-[10px] text-slate-400 mt-1">{fmtDate(item.updated_at)}</div>
      )}
    </button>
  );
}

export function PipelineKanban({ endpoint, title, subtitle, onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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

  const openItem = (item) => {
    if (item.email) navigate(`/admin/leads/${encodeURIComponent(item.email)}`);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">{title}</h1>
      <p className="text-slate-500 mb-6">{subtitle}</p>

      {error && <div className="text-slate-600 mb-4">Errore: {error}</div>}
      {!data ? (
        <div className="text-slate-400">Caricamento…</div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">{data.total} contatti nel funnel</p>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {data.columns.map((col) => (
              <div key={col.id} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {col.label}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-yellow-400">
                    {col.count}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-2xl p-2 space-y-2 min-h-[120px]">
                  {col.items.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Vuoto</p>
                  ) : (
                    col.items.map((item) => (
                      <LeadCard key={item.email} item={item} onOpen={openItem} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
