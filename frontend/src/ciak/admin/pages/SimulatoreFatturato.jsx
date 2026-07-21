/**
 * Ciak Admin — SIMULATORE FATTURATO €1M.
 * Pianificatore a 3 anni: scenari prudente/base/ambizioso o leve a mano.
 * Motore a coorti in `../simulatoreFatturato` (provvigione 10% solo nei 12 mesi
 * di Partnership; EVO-S = solo canone; Blueprint netto CAC). Vive nella Cabina
 * di Regia (Direzione/Luca). Sola pianificazione: nessun dato scritto.
 */
import React, { useMemo, useState } from "react";
import { LineChart, AlertTriangle, XCircle, CheckCircle2, Info } from "lucide-react";
import {
  FIELDS,
  SCENARIOS,
  SCENARIO_LABELS,
  SCENARIO_RULE,
  scenarioState,
  computeModel,
  PRICE,
  GOAL,
} from "../simulatoreFatturato";

const eur0 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numIt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });

function fmtField(f, v) {
  if (f.unit === "%" || f.unit === "%/anno") return `${v}%`;
  if (f.unit === "€" || f.unit === "€/anno") return eur0.format(v);
  if (f.unit === "€/mese") return `${eur0.format(v)}/mese`;
  if (f.unit) return `${numIt.format(v)} ${f.unit}`;
  return numIt.format(v);
}

const PHASES = ["Validare e costruire", "Sovrapporre le coorti", "Regime a pieno carico"];

const ROWS = [
  { key: "blueprint", label: "Blueprint (netto CAC)", dot: "bg-slate-400" },
  { key: "start", label: "Ciak Start", dot: "bg-blue-400" },
  { key: "setup", label: "Setup / Upgrade Partnership", dot: "bg-yellow-400" },
  { key: "commPart", label: "Provvigione 10% (12 mesi)", dot: "bg-emerald-400" },
  { key: "canone", label: "Canone EVO-S", dot: "bg-violet-400" },
  { key: "services", label: "Servizi extra (upside)", dot: "bg-rose-300", muted: true },
];

function Slider({ f, value, onChange }) {
  return (
    <div className={f.hero ? "rounded-xl border border-yellow-200 bg-yellow-50/60 p-4" : ""}>
      <label htmlFor={f.id} className="flex items-baseline justify-between gap-3 mb-2">
        <span className={`text-sm ${f.hero ? "font-semibold text-slate-900" : "text-slate-600"}`}>{f.label}</span>
        <span className={`font-mono tabular-nums font-semibold rounded-md px-2 py-0.5 text-sm ${f.hero ? "bg-yellow-300 text-yellow-900" : "bg-slate-100 text-slate-700"}`}>
          {fmtField(f, value)}
        </span>
      </label>
      <input
        id={f.id}
        type="range"
        min={f.min}
        max={f.max}
        step={f.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-yellow-500 cursor-pointer"
      />
      {f.hint && <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{f.hint}</p>}
    </div>
  );
}

function YearCard({ index, year }) {
  const gap = year.total - GOAL;
  const over = year.total >= GOAL;
  return (
    <article className={`rounded-2xl border bg-white overflow-hidden ${index === 2 ? "border-yellow-300 shadow-[0_0_0_1px_#FACC15]" : "border-slate-200"}`}>
      <div className={`px-5 pt-4 pb-4 border-b ${index === 2 ? "bg-yellow-50/70 border-yellow-200" : "border-slate-100"}`}>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Anno {index + 1}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{PHASES[index]}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{eur0.format(year.total)}</p>
        <p className={`mt-1 text-[11px] font-medium ${over ? "text-emerald-600" : "text-slate-400"}`}>
          {over ? `oltre il milione (+${eur0.format(gap)})` : `al milione manca ${eur0.format(-gap)}`}
        </p>
      </div>
      <div className="px-5 py-2">
        {ROWS.map((r) => {
          const v = year[r.key];
          const neg = v < 0;
          return (
            <div key={r.key} className={`flex items-center justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0 text-[13px] ${r.muted || (r.key === "canone" && v < 1) ? "opacity-55" : ""}`}>
              <span className="flex items-center gap-2 min-w-0 text-slate-600">
                <span className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${r.dot}`} />
                <span className="truncate">{r.label}</span>
              </span>
              <span className={`font-mono tabular-nums font-semibold whitespace-nowrap ${neg ? "text-rose-600" : "text-slate-800"}`}>
                {neg ? "−" : ""}{eur0.format(Math.abs(v))}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-3 border-t border-dashed border-slate-200 text-[11px] text-slate-400">
        Partner prodotti: <b className="text-slate-600">{numIt.format(Math.round(year.partners))}</b>
        {year.clamped && (
          <span className="text-amber-600"> · domanda {numIt.format(Math.round(year.demand))}, oltre il tetto</span>
        )}
      </div>
    </article>
  );
}

function Trajectory({ years }) {
  const max = Math.max(GOAL * 1.15, ...years.map((y) => y.total)) * 1.06;
  const goalTop = (1 - GOAL / max) * 100;
  return (
    <div className="relative h-52 flex items-end gap-4 pt-5">
      <div className="absolute left-0 right-0 border-t-2 border-dashed border-rose-400" style={{ top: `${goalTop}%` }}>
        <span className="absolute right-0 -top-4 text-[10px] font-mono font-bold text-rose-500">€1M</span>
      </div>
      {years.map((y, i) => {
        const h = Math.max(2, (y.total / max) * 100);
        const cls = i === 0 ? "bg-slate-300" : i === 1 ? "bg-yellow-300" : "bg-yellow-400";
        return (
          <div key={i} className="flex-1 h-full flex flex-col justify-end items-center">
            <div className={`w-full max-w-[130px] rounded-t-lg relative ${cls}`} style={{ height: `${h}%` }}>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[12px] font-mono tabular-nums font-bold text-slate-800 whitespace-nowrap">
                {eur0.format(y.total)}
              </span>
            </div>
            <div className="mt-2 text-center">
              <span className="block text-[12px] font-semibold text-slate-700">Anno {i + 1}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Alert({ tone, icon: Icon, title, children }) {
  const map = {
    bad: "border-rose-200 text-rose-600",
    warn: "border-amber-200 text-amber-600",
    ok: "border-emerald-200 text-emerald-600",
    info: "border-slate-200 text-slate-400",
  };
  return (
    <div className={`flex gap-3 rounded-xl border bg-white px-4 py-3 text-[13px] ${map[tone] || map.info}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p className="text-slate-600"><b className="text-slate-900">{title}</b> {children}</p>
    </div>
  );
}

export function SimulatoreFatturato() {
  const [scen, setScen] = useState("base");
  const [state, setState] = useState(() => scenarioState("base"));

  const { years, capAnnual } = useMemo(() => computeModel(state), [state]);

  const setField = (id, v) => {
    setState((prev) => ({ ...prev, [id]: v }));
    setScen("custom");
  };
  const setRamp = (i, v) => {
    setState((prev) => {
      const ramp = prev.ramp.slice();
      ramp[i] = Math.max(0, Math.min(100, v || 0));
      return { ...prev, ramp };
    });
    setScen("custom");
  };
  const pickScenario = (name) => {
    setScen(name);
    setState(scenarioState(name));
  };

  const market = FIELDS.filter((f) => f.group === "market");
  const ops = FIELDS.filter((f) => f.group === "ops");

  const alerts = [];
  if (state.cac >= PRICE.blueprint) {
    alerts.push({ tone: "bad", icon: XCircle, title: "Il front-end brucia cassa.", body: `A ${eur0.format(state.cac)} di CAC su un prodotto da 27 €, ogni Blueprint perde ${eur0.format(state.cac - PRICE.blueprint)}. Non autofinanzia le campagne: le sussidia.` });
  }
  if (state.partnerSales === 0) {
    alerts.push({ tone: "bad", icon: XCircle, title: "Provvigioni a zero.", body: "Con venduto partner a 0 il 10% non esiste e resta solo il canone EVO-S. È lo stress test: quanto regge il modello senza il successo del partner." });
  }
  if (years.some((y) => y.clamped)) {
    alerts.push({ tone: "warn", icon: AlertTriangle, title: "La capacità di lancio taglia il funnel.", body: `In almeno un anno la domanda di Partnership supera i ${numIt.format(capAnnual)} lanci/anno producibili. L'eccedenza è fatturato non incassato: alza i lanci/mese o accetta il tetto.` });
  }
  alerts.push({ tone: "warn", icon: AlertTriangle, title: "Prima dell'anno 1 c'è un anno 0.", body: "Tutto poggia sul Blueprint che converte. Finché il funnel non lo dimostra su spesa piccola, anche l'anno 1 prudente è un'ipotesi, non un piano. Tarare i preset sui dati veri (Systeme, Meta, Stripe)." });
  alerts.push({ tone: "info", icon: Info, title: "Da chiudere nel contratto.", body: "Il 10% della Gestione Campagne non si somma al 10% della Partnership (deciso: un solo 10%, solo il primo anno). La Gestione Campagne resta come canone fisso nei servizi extra." });
  if (years[2].total >= GOAL) {
    alerts.push({ tone: "ok", icon: CheckCircle2, title: `Anno 3 sopra il milione: ${eur0.format(years[2].total)}.`, body: `Traiettoria ${eur0.format(years[0].total)} → ${eur0.format(years[1].total)} → ${eur0.format(years[2].total)}. Regge se i tassi dello scenario si dimostrano sui dati veri.` });
  }

  return (
    <div className="max-w-6xl p-6 md:p-8 font-[Poppins,system-ui,sans-serif]">
      {/* Header */}
      <div className="mb-6">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
          <LineChart className="w-4 h-4" /> Simulatore €1M · Direzione
        </p>
        <h1 className="text-3xl font-bold text-slate-900 mt-2 leading-tight">Il milione è la traiettoria di 3 anni, non il numero dell'anno 1.</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl">
          Scegli uno scenario o tara le leve a mano. Le coorti sono simulate mese per mese: la provvigione del 10% vive solo nei 12 mesi di Partnership, poi il partner passa a EVO-S a solo canone.
        </p>
      </div>

      {/* Scenari */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mr-1">Scenario</span>
        {Object.keys(SCENARIOS).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => pickScenario(name)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${scen === name ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
          >
            {SCENARIO_LABELS[name]}
          </button>
        ))}
        <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${scen === "custom" ? "bg-yellow-400 text-yellow-900 border-yellow-400" : "bg-white text-slate-400 border-slate-200"}`}>
          Personalizzato
        </span>
        <span className="w-full sm:w-auto sm:ml-2 text-[11px] text-slate-400 mt-1 sm:mt-0">{SCENARIO_RULE}</span>
      </div>

      {/* Leve */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 mb-6">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ipotesi di mercato</p>
          <p className="text-[11px] text-slate-400">cambiano con lo scenario — il budget si costruisce sul prudente</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {market.map((f) => (
            <div key={f.id} className={f.hero ? "md:col-span-2 lg:col-span-3" : ""}>
              <Slider f={f} value={state[f.id]} onChange={(v) => setField(f.id, v)} />
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Realtà operativa</p>
          <p className="text-[11px] text-slate-400">le tara chi ha i dati veri: delivery, ads, ritmo di crescita</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {ops.map((f) => (
            <Slider key={f.id} f={f} value={state[f.id]} onChange={(v) => setField(f.id, v)} />
          ))}
          {/* Rampa */}
          <div className="md:col-span-2 lg:col-span-3">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-600">Rampa di crescita — % del target raggiunta</span>
              <span className="font-mono text-[11px] text-slate-500">{state.ramp.map((r) => `${r}%`).join(" · ")}</span>
            </div>
            <div className="flex gap-3">
              {[0, 1, 2].map((i) => (
                <label key={i} className="flex-1">
                  <span className="block text-[11px] text-slate-400 mb-1">Anno {i + 1}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={state.ramp[i]}
                    onChange={(e) => setRamp(i, parseFloat(e.target.value))}
                    className="w-full font-mono text-sm font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-yellow-400"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Card anno */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {years.map((y, i) => <YearCard key={i} index={i} year={y} />)}
      </div>

      {/* Traiettoria */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Traiettoria verso il milione</p>
          <span className="text-[11px] font-mono text-slate-400">scenario: {scen === "custom" ? "personalizzato" : scen}</span>
        </div>
        <Trajectory years={years} />
      </section>

      {/* Alert */}
      <div className="grid gap-2.5">
        {alerts.map((a, i) => (
          <Alert key={i} tone={a.tone} icon={a.icon} title={a.title}>{a.body}</Alert>
        ))}
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-slate-400 max-w-4xl">
        Simulazione mensile su 36 mesi: ogni anno una coorte di partner distribuita nei 12 mesi (volume = target × rampa, tetto capacità). Ogni partner lancia dopo N mesi e la provvigione 10% matura solo fino a fine 12 mesi di Partnership; dal 13° mese entra in EVO-S = solo canone (media ponderata dei 4 tier ≈ 364 €/mese), con churn. Blueprint al netto del CAC. I ricavi dopo il mese 36 non sono contati, quindi l'anno 3 è una stima conservativa del regime. Numeri per decidere, da confrontare coi dati veri Ciak/Stripe.
      </p>
    </div>
  );
}

export default SimulatoreFatturato;
