import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
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
import { apiGet } from "../api";

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

export function PartnerSalesEngine({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("tutti");

  useEffect(() => {
    apiGet("/partner-sales-engine")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  const items = useMemo(() => {
    const list = data?.items || [];
    if (filter === "systeme") return list.filter((i) => i.status === "setup_systeme");
    if (filter === "kpi") return list.filter((i) => i.status === "dati_mancanti");
    if (filter === "vendite") return list.filter((i) => i.status === "prime_vendite");
    if (filter === "attivi") return list.filter((i) => i.status === "attivo");
    if (filter === "alta") return list.filter((i) => i.alignment?.priorita === "alta");
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
        <Kpi icon={AlertTriangle} label="Alta priorità" value={c.high_priority || 0} tone={c.high_priority ? "rose" : "slate"} />
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
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nessun partner in questo filtro.</td>
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
            Prima installiamo la macchina minima: offerta, masterclass, videocorso, funnel Systeme e KPI.
            Solo dopo ha senso parlare di ottimizzazione, contenuti ricorrenti o campagne.
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-yellow-700" />
            <p className="font-semibold text-slate-900">Uso per Luca</p>
          </div>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Lavora dall'alto verso il basso: Systeme mancante, KPI mancanti, prime vendite.
            Quando la realtà è diversa dalla stima, correggi da Audit Delivery con il pannello Regia.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PartnerSalesEngine;
