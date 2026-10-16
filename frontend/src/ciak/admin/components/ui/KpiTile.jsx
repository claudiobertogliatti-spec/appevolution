/**
 * KpiTile — la tessera KPI, scritta una volta.
 *
 * Perche' esiste: ogni pagina admin ridisegnava la propria card KPI (raggi e
 * bordi diversi da una pagina all'altra). Una sola tessera: stesse dimensioni,
 * cifre tabellari, l'accento (giallo) solo dove il numero e' il punto della
 * pagina. Un tono "warn"/"critical" per il numero che chiede attenzione — mai
 * il solo colore.
 */
export function KpiTile({ label, value, hint, accent = false, tone }) {
  const valueCls =
    tone === "warn"
      ? "text-amber-800"
      : tone === "critical"
      ? "text-red-700"
      : accent
      ? "text-yellow-600"
      : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueCls}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500 leading-snug">{hint}</p>}
    </div>
  );
}

export default KpiTile;
