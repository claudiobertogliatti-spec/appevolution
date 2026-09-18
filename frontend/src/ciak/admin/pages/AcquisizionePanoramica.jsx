/**
 * Reparto Acquisizione — Panoramica.
 *
 * La home "capire al volo" del reparto: north-star (call prenotate consegnate a
 * Vendite), funnel in una riga con collo di bottiglia, recuperi, ritmo di
 * alimentazione, handoff a Vendite. Il reparto finisce a "call prenotata": la
 * call di consegna è di Vendite. Nessuno stato/€27 del vecchio funnel a pagamento.
 *
 * In cima: sotto-nav a tab verso le sotto-pagine esistenti del reparto.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CalendarClock, Flame, Gauge, PhoneCall, Target, Users, AlertTriangle,
} from "lucide-react";
import { apiGet } from "../api";

const TABS = [
  { label: "Panoramica", to: null },
  { label: "Editoriale EVO", to: "/admin/acq-calendario" },
  { label: "ADS", to: "/admin/acq-campagne-ads" },
  { label: "Prospect", to: "/admin/pipeline-prospect" },
  { label: "Pipeline", to: "/admin/pipeline" },
];

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function SubNav() {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-2 overflow-x-auto">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600 px-2.5 whitespace-nowrap">
        Acquisizione
      </span>
      <span className="w-px h-5 bg-slate-200 flex-shrink-0" />
      {TABS.map((t) =>
        t.to ? (
          <Link
            key={t.label}
            to={t.to}
            className="text-sm font-medium text-slate-600 rounded-lg px-3.5 py-2 whitespace-nowrap hover:bg-slate-100 transition"
          >
            {t.label}
          </Link>
        ) : (
          <span
            key={t.label}
            aria-current="page"
            className="text-sm font-semibold text-white bg-slate-900 rounded-lg px-3.5 py-2 whitespace-nowrap"
          >
            {t.label}
          </span>
        )
      )}
    </div>
  );
}

function FunnelStrip({ stages }) {
  const steps = [
    { name: "Lead nuovi", value: stages.leads, sub: "questo mese" },
    { name: "Questionario", value: stages.questionnaire_completed, sub: "8 domande" },
    { name: "Analisi pronta", value: stages.report_ready, sub: "Report Carlo" },
    { name: "Call prenotata", value: stages.call_booked, sub: "→ a Vendite" },
  ];
  const convs = steps.slice(1).map((s, i) => pct(s.value, steps[i].value));
  const worst = convs.length ? convs.indexOf(Math.min(...convs)) : -1;

  return (
    <div className="flex flex-wrap items-stretch gap-y-3">
      {steps.map((s, i) => (
        <div key={s.name} className="flex items-stretch">
          <div className="px-3">
            <div className="text-3xl font-semibold text-slate-900 leading-none">{s.value ?? 0}</div>
            <div className="text-[13px] font-medium text-slate-700 mt-1">{s.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{s.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex flex-col items-center justify-center px-2 min-w-[64px]">
              <span className={`text-xs font-semibold ${worst === i ? "text-red-600" : "text-slate-600"}`}>
                {convs[i]}%
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 mt-0.5" />
              {worst === i && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 mt-1">
                  collo
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function AcquisizionePanoramica({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/acquisizione-command-center")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  const analisiSenzaCall = useMemo(
    () => (Array.isArray(data?.priorities?.diagnostic_no_purchase) ? data.priorities.diagnostic_no_purchase : []),
    [data]
  );

  if (error) return <div className="p-8"><SubNav /><p className="text-slate-600 mt-6">Errore: {error}</p></div>;
  if (!data) return <div className="p-8"><SubNav /><p className="text-slate-400 mt-6">Caricamento panoramica...</p></div>;

  const target = data.target || {};
  const funnel = data.funnel || {};
  const stages = data.funnel_stages || {};
  const activity = data.activity_today || {};
  const routine = data.routine || {};
  const bottlenecks = Array.isArray(data.bottlenecks) ? data.bottlenecks : [];

  const contattiOggi = activity.new_leads || 0;
  const targetOggi = activity.target_new_contacts || routine.daily_new_contacts || 20;

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-6xl">
      <SubNav />

      {/* HERO + north-star */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Reparto · Carlo</p>
          <h1 className="text-3xl font-semibold mt-1">Acquisizione</h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Promettere la trasformazione al target attraverso il questionario, che produce
            un'analisi gratuita — e portarla fino alla call prenotata. Poi passa a Vendite.
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.06] border border-white/10 px-5 py-4 min-w-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400">Call prenotate · mese</p>
          <p className="text-4xl font-bold mt-1 leading-none">{funnel.call_booked || 0}</p>
          <p className="text-xs text-slate-400 mt-2">
            consegnate a Vendite · {target.gap || 0} ingressi ancora al target
          </p>
        </div>
      </div>

      {/* FUNNEL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">Il funnel in una riga</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">Dove crolla la conversione questo mese: è il collo di bottiglia da lavorare.</p>
        <div className="mt-5">
          <FunnelStrip stages={stages} />
        </div>
      </div>

      {/* RECUPERI */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-yellow-300 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-yellow-600" />
              <h3 className="text-base font-semibold text-slate-900">Analisi pronta, call non prenotata</h3>
            </div>
            <p className="text-sm text-slate-500 mt-1">Il recupero che vale di più: hanno l'analisi, manca il passo alla call.</p>
          </div>
          {analisiSenzaCall.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">Nessun lead fermo con analisi pronta.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {analisiSenzaCall.map((item) => (
                <Link
                  key={item.email}
                  to={`/admin/leads/${encodeURIComponent(item.email)}`}
                  className="group flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{item.nome || item.email}</p>
                    <p className="text-xs text-slate-500 truncate">{item.email}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 whitespace-nowrap">
                    Apri <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-semibold text-slate-900">Colli di bottiglia</h3>
          </div>
          {bottlenecks.length === 0 ? (
            <p className="text-sm text-emerald-600 mt-4">Nessun collo di bottiglia critico.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {bottlenecks.map((b) => (
                <div key={b.title} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{b.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RITMO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">Ritmo di alimentazione</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">Se la pipeline non si alimenta oggi, tra due settimane crolla tutto a valle.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { k: "Oggi", v: `${contattiOggi} / ${targetOggi}`, h: "nuovi contatti mirati" },
            { k: "Diagnosi oggi", v: activity.diagnostics_completed || 0, h: "8 domande completate" },
            { k: "Lead mese", v: `${stages.leads || 0} / 400`, h: "su target mensile" },
            { k: "Call mese", v: funnel.call_booked || 0, h: "prenotate → Vendite" },
          ].map((m) => (
            <div key={m.k} className="rounded-xl bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{m.k}</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{m.v}</div>
              <div className="text-[11px] text-slate-400 mt-1">{m.h}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HANDOFF */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <PhoneCall className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="font-semibold">Consegnato a Vendite</p>
            <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Call prenotate col Report Carlo pronto per la call di consegna. Da qui in poi è Vendite (Gaia).
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-yellow-400 leading-none">{funnel.call_booked || 0}</div>
          <div className="text-xs text-slate-400 mt-1">questo mese</div>
        </div>
      </div>
    </div>
  );
}

export default AcquisizionePanoramica;
