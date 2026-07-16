/**
 * FunnelWaterfall — la "plancia €1M": un solo funnel a cascata dal freddo alla
 * partnership, con conteggi, conversioni e € per stadio, più una fascia
 * north-star (ricavo one-off, MRR, ARPU/lead) e barra verso €1.000.000.
 *
 * Componente PRESENTAZIONALE: riceve stadi e north-star già calcolati.
 * I valori non disponibili dai dati reali NON vengono inventati.
 */
import React from "react";

function Tile({ label, value, hint, accentGap }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accentGap ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500 leading-snug">{hint}</p>}
    </div>
  );
}

export function FunnelWaterfall({ stages = [], northStar = {} }) {
  const goalPct = Math.max(0, Math.min(100, northStar.goalPct || 0));

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-7">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Plancia €1M</p>
          <h2 className="text-lg font-semibold text-slate-900">Il funnel, in un colpo d'occhio</h2>
        </div>
        <span className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">
          dato reale · storico
        </span>
      </div>

      {/* North-star */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Tile label="Ricavo one-off" value={northStar.oneOff ?? "—"} hint="Blueprint + Start + Partnership" />
        <Tile label="MRR ricorrente" value={northStar.mrr ?? "—"} hint="cassa che non riparte da zero" />
        <Tile label="ARPU per lead" value={northStar.arpu ?? "—"} hint="ricavo one-off / lead" />
        <Tile label="Verso €1M" value={`${goalPct}%`} hint="ricavo one-off cumulato" />
      </div>

      {/* Barra obiettivo */}
      <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden mb-5">
        <div className="h-full bg-yellow-400" style={{ width: `${goalPct}%` }} />
      </div>

      {/* Cascata */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {stages.map((s, i) => (
          <div
            key={s.label}
            className={`relative rounded-xl border bg-white p-4 ${
              s.hot ? "border-yellow-300 shadow-[inset_0_0_0_1px_#FACC15]" : "border-slate-200"
            }`}
          >
            {i > 0 && s.conv != null && (
              <span className="absolute -top-2 left-4 rounded-full bg-slate-900 text-yellow-400 text-[10px] font-bold px-2 py-0.5">
                ▼ {s.conv}
              </span>
            )}
            <p className="text-xs font-semibold text-slate-600 leading-tight min-h-[32px]">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.count}</p>
            {s.euro && <p className="mt-1 text-sm font-semibold text-emerald-700">{s.euro}</p>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        Le conversioni di Ciak Start e Partnership sono calcolate sui Blueprint (lo split per punteggio dopo le 8 Domande).
      </p>
    </section>
  );
}

export default FunnelWaterfall;
