/**
 * Ciak Admin — Masterclass Analytics.
 *
 * Drill-down del funnel gratuito: opt-in → masterclass → questionario → analisi
 * pronta → call → Blueprint consegnato; distribuzione 4 stati del questionario,
 * sorgenti opt-in, trend 30gg.
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

  const diagnosticTotal = Object.values(d.diagnostic_per_stato).reduce((a, b) => a + b, 0);

  // Trend max per scala asse Y semplice
  const trendValues = Object.values(d.trend_optin_30d);
  const trendMax = Math.max(1, ...trendValues);
  const trendEntries = Object.entries(d.trend_optin_30d);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Masterclass Analytics</h1>
      <p className="text-slate-500 mb-8">
        Drill-down del funnel: opt-in → questionario → analisi pronta → call → Blueprint consegnato.
      </p>

      {/* ① Funnel cumulativo */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Funnel cumulativo
      </h2>
      <div className="flex flex-wrap gap-3 mb-2">
        <FunnelStep label="Opt-in masterclass" value={f.opt_in} pct={null} />
        <FunnelStep label="Video avviato" value={f.video_started} pct={null} />
        <FunnelStep label="Visto al 50%" value={f.video_50} pct={null} />
        <FunnelStep label="Video completato" value={f.video_completed} pct={null} />
        <FunnelStep label="CTA mostrata" value={f.cta_shown} pct={null} />
        <FunnelStep label="CTA cliccata" value={f.cta_clicked} pct={null} />
        <FunnelStep label="Questionario avviato" value={f.diagnostic_started} pct={conv.optin_to_diagnostic} />
        <FunnelStep label="Questionario completato" value={f.diagnostic_completed} pct={null} />
        <FunnelStep label="Analisi pronta" value={f.report_ready} pct={null} />
        <FunnelStep label="Call prenotata" value={f.call_booked} pct={conv.diagnostic_to_call} />
        <FunnelStep label="Blueprint consegnato" value={f.call_done} pct={conv.call_to_blueprint} isLast />
      </div>
      <p className="text-xs text-slate-400 mb-10">
        Il questionario avviato può superare gli opt-in: il canale Mariangela arriva al
        questionario senza iscriversi alla masterclass.
      </p>

      <div className="mb-10 max-w-2xl">
        {/* Distribuzione stati del questionario */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Distribuzione 4 stati — questionario
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            {diagnosticTotal === 0 ? (
              <p className="text-slate-400 text-sm">Nessun questionario completato ancora.</p>
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
