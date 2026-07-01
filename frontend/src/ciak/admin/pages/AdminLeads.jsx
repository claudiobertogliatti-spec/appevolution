/**
 * Ciak Admin — Leads & Pipeline. Lista da GET /api/admin/ciak/leads.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, adminFetch } from "../api";

const STATO_LABEL = {
  1: "Definizione",
  2: "Strutturazione",
  3: "Validazione",
  4: "Evoluzione Strategica",
};

const STATE_LABEL = {
  lead_created: "Lead",
  ciak_started: "Diagnostica avviata",
  ciak_completed: "Diagnostica completata",
  report_generated: "Report generato",
  clicked_67: "Click €27",
  purchased_67: "Acquisto €27",
  call_booked: "Call prenotata",
  call_done: "Call effettuata",
  partner_approved: "Partner approvato",
  partner_active: "Partner attivo",
};

function StatoBadge({ stato, preliminary }) {
  if (!stato) return <span className="text-slate-300">—</span>;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        preliminary
          ? "bg-gray-100 text-slate-500"
          : "bg-slate-900 text-yellow-400"
      }`}
      title={preliminary ? "Stato preliminare (Checkpoint)" : "Stato confermato (8 Domande)"}
    >
      S{stato} {STATO_LABEL[stato]}
    </span>
  );
}

const PAGE = 50;

export function AdminLeads({ onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [stato, setStato] = useState("");
  const [onlyPurchased, setOnlyPurchased] = useState(false);
  const [offset, setOffset] = useState(0);

  const load = useCallback(() => {
    setData(null);
    apiGet("/leads", {
      q,
      stato: stato || null,
      only_purchased: onlyPurchased || null,
      limit: PAGE,
      offset,
    })
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired();
        else setError(e.message);
      });
  }, [q, stato, onlyPurchased, offset, onAuthExpired]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteLead = async (lead, e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Eliminare definitivamente il lead "${lead.email}"?\nVerranno rimossi opt-in, Checkpoint e 8 Domande collegati. Operazione irreversibile.`
      )
    )
      return;
    try {
      const res = await adminFetch(
        `/api/admin/ciak/lead?email=${encodeURIComponent(lead.email)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Errore eliminazione");
      load();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired?.();
      else window.alert("Errore nell'eliminazione del lead.");
    }
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Leads & Pipeline</h1>
      <p className="text-slate-500 mb-6">
        Ogni lead dall'opt-in masterclass, arricchito con Checkpoint e 8 Domande.
      </p>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setOffset(0), load())}
          placeholder="Cerca per email…"
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900 w-64"
        />
        <select
          value={stato}
          onChange={(e) => {
            setStato(e.target.value);
            setOffset(0);
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
        >
          <option value="">Tutti gli Stati</option>
          <option value="1">Stato 1 — Definizione</option>
          <option value="2">Stato 2 — Strutturazione</option>
          <option value="3">Stato 3 — Validazione</option>
          <option value="4">Stato 4 — Evoluzione Strategica</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyPurchased}
            onChange={(e) => {
              setOnlyPurchased(e.target.checked);
              setOffset(0);
            }}
          />
          Solo chi ha acquistato
        </label>
      </div>

      {error && <div className="text-slate-600 mb-4">Errore: {error}</div>}
      {!data ? (
        <div className="text-slate-400">Caricamento…</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                  <th className="px-5 py-3 font-semibold">Lead</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Checkpoint</th>
                  <th className="px-5 py-3 font-semibold">8 Domande</th>
                  <th className="px-5 py-3 font-semibold">Pipeline</th>
                  <th className="px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      Nessun lead trovato.
                    </td>
                  </tr>
                )}
                {data.items.map((l) => (
                  <tr
                    key={l.email}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/leads/${encodeURIComponent(l.email)}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{l.nome || "—"}</div>
                      <div className="text-slate-500 text-xs">{l.email}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{l.source || "—"}</td>
                    <td className="px-5 py-3">
                      <StatoBadge stato={l.checkpoint_stato} preliminary />
                    </td>
                    <td className="px-5 py-3">
                      <StatoBadge stato={l.stato_finale} />
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {l.diagnostic_state ? STATE_LABEL[l.diagnostic_state] || l.diagnostic_state : "—"}
                      {l.purchased && (
                        <span className="ml-2 text-yellow-600 font-medium">€27 ✓</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => deleteLead(l, e)}
                        title="Elimina lead"
                        className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline mr-3"
                      >
                        Elimina
                      </button>
                      <span className="text-slate-300">›</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginazione */}
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>
              {data.total} leads totali · pagina {Math.floor(offset / PAGE) + 1}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                ← Precedente
              </button>
              <button
                disabled={offset + PAGE >= data.total}
                onClick={() => setOffset(offset + PAGE)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                Successiva →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
