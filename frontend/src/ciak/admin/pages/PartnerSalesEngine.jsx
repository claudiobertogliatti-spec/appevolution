import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Link as LinkIcon,
  ListChecks,
  Route,
  ShoppingCart,
  Target,
  Users,
} from "lucide-react";
import { adminFetch, apiGet } from "../api";

const STATUS = {
  setup_systeme: { label: "Setup Systeme", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  dati_mancanti: { label: "Dati mancanti", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  prime_vendite: { label: "Prime vendite", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  in_costruzione: { label: "In costruzione", tone: "bg-slate-50 text-slate-600 border-slate-200" },
  attivo: { label: "Attivo", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const FONTE = {
  manuale: "Manuale",
  legacy_revenue: "Revenue storico",
  nessuna: "Nessuna",
};

const ADS_TONE = {
  no_ads: "bg-slate-100 text-slate-500",
  ask_budget: "bg-amber-50 text-amber-700",
  retargeting: "bg-blue-50 text-blue-700",
  test: "bg-yellow-50 text-yellow-700",
  scaling: "bg-emerald-50 text-emerald-700",
};

function fmtNum(n) {
  return Number(n || 0).toLocaleString("it-IT");
}

function fmtEur(n) {
  return "€" + Number(n || 0).toLocaleString("it-IT");
}

function Kpi({ icon: Icon, label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    yellow: "bg-yellow-50 text-yellow-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Progress({ value }) {
  return (
    <div className="min-w-[120px]">
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-yellow-400" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{value || 0}% setup</p>
    </div>
  );
}

function SetupChips({ setup }) {
  return (
    <div className="flex flex-wrap gap-1.5 max-w-[280px]">
      {(setup || []).map((s) => (
        <span
          key={s.key}
          title={s.missing || s.label}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
            s.ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
          }`}
        >
          {s.ok ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-300" />}
          {s.label}
        </span>
      ))}
    </div>
  );
}

function firstUrl(systeme) {
  return systeme?.funnel_url || systeme?.sales_page_url || systeme?.checkout_url || null;
}

function fmtBudget(n) {
  return n === null || n === undefined ? "budget da chiedere" : `${fmtEur(n)}/mese`;
}

export function PartnerSalesEngine({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("tutti");
  const [budgetDrafts, setBudgetDrafts] = useState({});
  const [savingBudget, setSavingBudget] = useState(null);

  useEffect(() => {
    apiGet("/partner-sales-engine")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(() => {
    if (!data?.items) return;
    setBudgetDrafts((prev) => {
      const next = { ...prev };
      data.items.forEach((item) => {
        if (next[item.id] === undefined) {
          next[item.id] = item.ads_plan?.budget_monthly ?? "";
        }
      });
      return next;
    });
  }, [data]);

  async function saveBudget(item) {
    const raw = budgetDrafts[item.id];
    const value = raw === "" || raw === null || raw === undefined ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setError("Inserisci un budget ads valido, oppure lascia vuoto.");
      return;
    }
    setSavingBudget(item.id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${item.id}/ads-budget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget_ads_monthly: value }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Errore ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`);
      }
      const fresh = await apiGet("/partner-sales-engine");
      setData(fresh);
      setBudgetDrafts((prev) => ({ ...prev, [item.id]: value ?? "" }));
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    } finally {
      setSavingBudget(null);
    }
  }

  const items = useMemo(() => {
    const list = data?.items || [];
    if (filter === "systeme") return list.filter((i) => i.status === "setup_systeme");
    if (filter === "kpi") return list.filter((i) => i.status === "dati_mancanti");
    if (filter === "vendite") return list.filter((i) => i.status === "prime_vendite");
    if (filter === "attivi") return list.filter((i) => i.status === "attivo");
    if (filter === "alta") return list.filter((i) => i.alignment?.priorita === "alta");
    if (filter === "ottimizza") return list.filter((i) => !i.ottimizza?.calendar_90_ready || !i.ottimizza?.live_60_ready);
    if (filter === "budget") return list.filter((i) => i.ads_plan?.level === "ask_budget");
    if (filter === "ads") return list.filter((i) => ["retargeting", "test", "scaling"].includes(i.ads_plan?.level));
    if (filter === "continuita") return list.filter((i) => i.continuity?.due);
    return list;
  }, [data, filter]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Caricamento Motore Vendite Partner...</div>;

  const c = data.counters || {};
  const filters = [
    { id: "tutti", label: `Tutti (${data.total || 0})` },
    { id: "alta", label: `Alta priorità (${c.high_priority || 0})` },
    { id: "systeme", label: `Setup Systeme (${c.missing_systeme || 0})` },
    { id: "kpi", label: `KPI mancanti (${c.missing_kpi || 0})` },
    { id: "vendite", label: `Prime vendite (${c.no_sales || 0})` },
    { id: "ottimizza", label: `Ritmo Ottimizza (${c.optimize_rhythm_missing || 0})` },
    { id: "budget", label: `Budget ads (${c.ads_budget_missing || 0})` },
    { id: "ads", label: `Ads pronte (${c.ads_ready || 0})` },
    { id: "continuita", label: `Continuità (${c.continuity_due || 0})` },
    { id: "attivi", label: `Attivi (${c.ready || 0})` },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="bg-white border border-yellow-300 rounded-xl p-6 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Delivery · Gaia + Luca</p>
            <h1 className="text-2xl font-semibold text-slate-900">Motore Vendite Partner</h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
          Vista duplicabile per ogni partner: asset pronti, setup Systeme, KPI, prime vendite e prossima azione.
          Serve a capire se la macchina commerciale è installata o dove si è fermata.
        </p>
      </div>

      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={Users} label="Partner" value={data.total || 0} />
        <Kpi icon={Target} label="Attivi" value={c.ready || 0} tone="emerald" />
        <Kpi icon={LinkIcon} label="Senza Systeme" value={c.missing_systeme || 0} tone={c.missing_systeme ? "rose" : "slate"} />
        <Kpi icon={BarChart3} label="Senza KPI" value={c.missing_kpi || 0} tone={c.missing_kpi ? "yellow" : "slate"} />
        <Kpi icon={ShoppingCart} label="Senza vendite" value={c.no_sales || 0} tone={c.no_sales ? "blue" : "slate"} />
        <Kpi icon={CalendarClock} label="Ritmo 90/60" value={c.optimize_rhythm_missing || 0} tone={c.optimize_rhythm_missing ? "yellow" : "slate"} />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-4 py-3 font-semibold">Stato</th>
                <th className="px-4 py-3 font-semibold">Setup</th>
                <th className="px-4 py-3 font-semibold">Checklist</th>
                <th className="px-4 py-3 font-semibold">Systeme</th>
                <th className="px-4 py-3 font-semibold">KPI</th>
                <th className="px-4 py-3 font-semibold">Ottimizza</th>
                <th className="px-4 py-3 font-semibold">Ads</th>
                <th className="px-4 py-3 font-semibold">Leva</th>
                <th className="px-4 py-3 font-semibold">Chi</th>
                <th className="px-4 py-3 font-semibold">Prossima azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((i) => {
                const status = STATUS[i.status] || STATUS.in_costruzione;
                const url = firstUrl(i.systeme);
                return (
                  <tr key={i.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 truncate max-w-[190px]">{i.name}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[190px]">{i.niche || "—"}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{i.phase} · {i.macro_label}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs font-semibold ${status.tone}`}>
                        {status.label}
                      </span>
                      {i.alignment?.priorita === "alta" && (
                        <p className="text-[11px] text-rose-500 mt-1">alta priorità</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Progress value={i.setup_percent} />
                      <p className="text-[11px] text-slate-500 mt-1">
                        {i.setup_completed}/{i.setup_total} blocchi
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <SetupChips setup={i.setup} />
                    </td>
                    <td className="px-4 py-3">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                        >
                          Apri <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-rose-500 font-medium">manca funnel</span>
                      )}
                      {i.systeme?.course_id && <p className="text-[11px] text-slate-400 mt-1">Corso {i.systeme.course_id}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600 space-y-0.5">
                        <p><b>{fmtNum(i.kpi?.contatti)}</b> contatti</p>
                        <p><b>{fmtNum(i.kpi?.vendite)}</b> vendite</p>
                        <p><b>{fmtEur(i.kpi?.revenue)}</b> revenue</p>
                        <p className="text-slate-400">Fonte: {FONTE[i.kpi?.fonte] || i.kpi?.fonte}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs space-y-1">
                        <p className={i.ottimizza?.calendar_90_ready ? "text-emerald-700" : "text-amber-700"}>
                          {i.ottimizza?.calendar_90_ready ? "90gg ok" : "90gg manca"}
                        </p>
                        <p className={i.ottimizza?.live_60_ready ? "text-emerald-700" : "text-amber-700"}>
                          {i.ottimizza?.live_60_ready ? "Live 60 ok" : "Live 60 manca"}
                        </p>
                        {i.ottimizza?.settimane_alla_live != null && (
                          <p className="text-slate-400">Live tra {i.ottimizza.settimane_alla_live} sett.</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${ADS_TONE[i.ads_plan?.level] || "bg-slate-100 text-slate-500"}`}>
                        {i.ads_plan?.label || "—"}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[160px] leading-snug">
                        {fmtBudget(i.ads_plan?.budget_monthly)}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={budgetDrafts[i.id] ?? ""}
                          onChange={(e) => setBudgetDrafts((prev) => ({ ...prev, [i.id]: e.target.value }))}
                          className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-yellow-400"
                          aria-label={`Budget ads mensile ${i.name}`}
                          placeholder="€"
                        />
                        <button
                          type="button"
                          onClick={() => saveBudget(i)}
                          disabled={savingBudget === i.id}
                          className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          {savingBudget === i.id ? "..." : "Salva"}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[180px] leading-snug">
                        {i.ads_plan?.next_action}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-700 max-w-[160px] leading-snug">
                        {i.accelerator?.label}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[180px] leading-snug">
                        {i.accelerator?.reason}
                      </p>
                      {i.continuity?.due && (
                        <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Valuta Ciak Continuità</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {i.owner || "Team"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700 max-w-[260px] leading-snug">{i.next_action}</p>
                      {i.alignment?.stato_reale && (
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] leading-snug">{i.alignment.stato_reale}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400">Nessun partner in questo filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-900 text-white rounded-xl p-5">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-yellow-400" />
            <p className="font-semibold">Regola operativa</p>
          </div>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Prima organico e validazione. Poi retargeting leggero. Poi test acquisizione. Poi scaling.
            Le ads entrano solo quando asset, KPI e budget sostenibile sono chiari.
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-yellow-700" />
            <p className="font-semibold text-slate-900">Uso per Luca</p>
          </div>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            In Ottimizza controlla tre cose: calendario 90 giorni, live ogni 60 giorni, dati reali.
            Se manca il budget ads, la domanda da fare è: quanto puoi investire ogni mese per 90 giorni?
          </p>
        </div>
      </div>
    </div>
  );
}

export default PartnerSalesEngine;
