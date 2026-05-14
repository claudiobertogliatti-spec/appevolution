/**
 * Ciak Admin — Dashboard. Conteggi funnel da GET /api/admin/ciak/stats.
 */
import { useEffect, useState } from "react";
import { apiGet } from "../api";

const STATO_LABEL = {
  1: "Definizione",
  2: "Strutturazione",
  3: "Validazione",
  4: "Evoluzione Strategica",
};

const STATE_LABEL = {
  lead_created: "Lead creato",
  ciak_started: "Diagnostica avviata",
  ciak_completed: "Diagnostica completata",
  report_generated: "Report generato",
  clicked_67: "Click checkout €67",
  purchased_67: "Acquisto €67",
  call_booked: "Call prenotata",
  call_done: "Call effettuata",
  partner_approved: "Partner approvato",
  partner_active: "Partner attivo",
};

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

export function AdminDashboard({ onAuthExpired }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/stats")
      .then(setStats)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!stats) return <div className="p-10 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Dashboard</h1>
      <p className="text-slate-500 mb-8">Panoramica del funnel Ciak.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard label="Leads totali" value={stats.leads_total} />
        <KpiCard label="Checkpoint completati" value={stats.checkpoint_completati} />
        <KpiCard label="Diagnostiche avviate" value={stats.diagnostiche_avviate} />
        <KpiCard label="Acquisti €67" value={stats.acquisti_67} accent />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Funnel per stato */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">
            Funnel per stato
          </h2>
          {Object.keys(stats.funnel_by_state).length === 0 ? (
            <p className="text-slate-400 text-sm">Nessuna diagnostica ancora.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(stats.funnel_by_state).map(([state, n]) => (
                <li key={state} className="flex justify-between text-sm">
                  <span className="text-slate-600">{STATE_LABEL[state] || state}</span>
                  <span className="font-semibold text-slate-900">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Distribuzione Stati 1-4 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">
            Distribuzione Stato finale
          </h2>
          {Object.keys(stats.distribuzione_stati).length === 0 ? (
            <p className="text-slate-400 text-sm">Nessun report Matteo ancora.</p>
          ) : (
            <ul className="space-y-2">
              {[1, 2, 3, 4].map((s) => (
                <li key={s} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    Stato {s} — {STATO_LABEL[s]}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {stats.distribuzione_stati[String(s)] || 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {stats.acquisti_orfani > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-300 rounded-2xl p-5">
          <p className="text-sm text-slate-700">
            <strong>{stats.acquisti_orfani}</strong> acquisti orfani (Stripe senza
            diagnostic session collegata) — da gestire manualmente. Vedi Transazioni.
          </p>
        </div>
      )}
    </div>
  );
}
