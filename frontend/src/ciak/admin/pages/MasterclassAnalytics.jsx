/**
 * Ciak Admin — Masterclass Analytics.
 *
 * Drill-down funnel masterclass: distribuzione 4 stati (checkpoint + diagnostic),
 * open rate email checkpoint per stato, sorgenti opt-in, trend 30gg.
 *
 * Backend: GET /api/admin/ciak/masterclass-analytics
 */
import { useEffect, useState } from "react";
import { apiGet } from "../api";

const STATO_COLORS = {
  "1": "bg-red-500",
  "2": "bg-orange-400",
  "3": "bg-yellow-400",
  "4": "bg-emerald-500",
};
const STATO_LABELS = {
  "1": "Stato 1 — Non pronto",
  "2": "Stato 2 — Sta esplorando",
  "3": "Stato 3 — Pronto per validare",
  "4": "Stato 4 — Pronto per costruire",
};

function FunnelStep({ label, value, pct, isLast }) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 leading-tight">
          {label}
        </p>
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        {pct != null && (
          <p className="text-xs text-slate-400 mt-1">{pct}% dallo step prima</p>
        )}
      </div>
      {!isLast && (
        <p className="text-center text-slate-300 text-xl mt-1 mb-1">↓</p>
      )}
    </div>
  );
}

function StatoBar({ stato, count, total, sublabel }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-700 font-medium">{STATO_LABELS[stato]}</span>
        <span className="text-slate-500">
          {count} {sublabel && <span className="text-slate-400">· {sublabel}</span>}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${STATO_COLORS[stato]} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MasterclassAnalytics({ onAuthExpired }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/masterclass-analytics")
      .then(setD)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!d) return <div className="p-10 text-slate-400">Caricamento…</div>;

  const f = d.funnel;
  const conv = d.conversion_pct;

  const checkpointTotal = Object.values(d.checkpoint_per_stato).reduce((a, b) => a + b, 0);
  const diagnosticTotal = Object.values(d.diagnostic_per_stato).reduce((a, b) => a + b, 0);

  // Trend max per scala asse Y semplice
  const trendValues = Object.values(d.trend_optin_30d);
  const trendMax = Math.max(1, ...trendValues);
  const trendEntries = Object.entries(d.trend_optin_30d);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Masterclass Analytics</h1>
      <p className="text-slate-500 mb-8">
        Drill-down del funnel: opt-in → checkpoint → 8 domande → acquisto €67.
      </p>

      {/* ① Funnel cumulativo */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Funnel cumulativo
      </h2>
      <div className="flex flex-wrap gap-3 mb-2">
        <FunnelStep label="Opt-in masterclass" value={f.opt_in} pct={null} />
        <FunnelStep label="Checkpoint compilato" value={f.checkpoint_done} pct={conv.optin_to_checkpoint} />
        <FunnelStep label="8 Domande avviate" value={f.diagnostic_started} pct={null} />
        <FunnelStep label="8 Domande completate" value={f.diagnostic_completed} pct={null} />
        <FunnelStep label="Click checkout €67" value={f.clicked_67} pct={null} />
        <FunnelStep label="Acquisto €67" value={f.purchased_67} pct={conv.diagnostic_to_purchase} isLast />
      </div>
      <p className="text-xs text-slate-400 mb-10">
        Conversione end-to-end opt-in → acquisto: <strong className="text-slate-700">{conv.optin_to_purchase}%</strong>
      </p>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        {/* ② Distribuzione stati Checkpoint */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Distribuzione 4 stati — Checkpoint (pre-acquisto)
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            {checkpointTotal === 0 ? (
              <p className="text-slate-400 text-sm">Nessun checkpoint ancora.</p>
            ) : (
              ["1", "2", "3", "4"].map((s) => (
                <StatoBar
                  key={s}
                  stato={s}
                  count={d.checkpoint_per_stato[s]}
                  total={checkpointTotal}
                  sublabel={`${checkpointTotal > 0 ? Math.round(d.checkpoint_per_stato[s] / checkpointTotal * 100) : 0}%`}
                />
              ))
            )}
          </div>
        </div>

        {/* ③ Distribuzione stati 8 Domande */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Distribuzione 4 stati — 8 Domande (post-acquisto)
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            {diagnosticTotal === 0 ? (
              <p className="text-slate-400 text-sm">Nessuna 8 Domande completata ancora.</p>
            ) : (
              ["1", "2", "3", "4"].map((s) => (
                <StatoBar
                  key={s}
                  stato={s}
                  count={d.diagnostic_per_stato[s]}
                  total={diagnosticTotal}
                  sublabel={`${diagnosticTotal > 0 ? Math.round(d.diagnostic_per_stato[s] / diagnosticTotal * 100) : 0}%`}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ④ Email checkpoint open rate */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Email checkpoint — open rate per stato
      </h2>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
              <th className="px-5 py-3 font-semibold">Stato</th>
              <th className="px-5 py-3 font-semibold text-right">Email inviate</th>
              <th className="px-5 py-3 font-semibold text-right">Email aperte</th>
              <th className="px-5 py-3 font-semibold text-right">Open rate</th>
            </tr>
          </thead>
          <tbody>
            {["1", "2", "3", "4"].map((s) => {
              const e = d.email_per_stato[s];
              return (
                <tr key={s} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3 text-slate-700">{STATO_LABELS[s]}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-900">{e.sent}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{e.opened}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">
                    {e.open_rate_pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        {/* ⑤ Sorgenti opt-in */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Sorgenti opt-in (source)
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            {Object.keys(d.sources).length === 0 ? (
              <p className="text-slate-400 text-sm">Nessun lead ancora.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(d.sources).map(([src, n]) => (
                  <li key={src} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 capitalize">{src}</span>
                    <span className="font-semibold text-slate-900">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ⑥ UTM source */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Top UTM sources (10)
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            {Object.keys(d.utm_sources).length === 0 ? (
              <p className="text-slate-400 text-sm">Nessun UTM ancora.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(d.utm_sources).map(([src, n]) => (
                  <li key={src} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate">{src}</span>
                    <span className="font-semibold text-slate-900">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ⑦ Trend ultimi 30 giorni */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Trend opt-in — ultimi 30 giorni
      </h2>
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        {trendEntries.length === 0 ? (
          <p className="text-slate-400 text-sm">Nessun lead negli ultimi 30 giorni.</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {trendEntries.map(([day, n]) => (
              <div key={day} className="flex-1 flex flex-col items-center group" title={`${day}: ${n}`}>
                <div
                  className="w-full bg-yellow-400 rounded-t hover:bg-yellow-500 transition"
                  style={{ height: `${(n / trendMax) * 100}%`, minHeight: n > 0 ? "2px" : 0 }}
                />
              </div>
            ))}
          </div>
        )}
        {trendEntries.length > 0 && (
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>{trendEntries[0]?.[0]}</span>
            <span>{trendEntries[trendEntries.length - 1]?.[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
