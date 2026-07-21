/**
 * Ciak Admin — CABINA DI REGIA (v4).
 * Panoramica delle 5 SEZIONI operative dell'organigramma Ciak (le stesse della
 * sidebar, esclusa la Dashboard): Acquisizione · Vendite · Delivery · Casi studio
 * · Back office. Ogni finestra mostra il suo "Agente di Riferimento" + KPI sintetici
 * e, al click, apre la pagina-reparto con le sue macro-finestre.
 * In cima resta il semaforo di autonomia (🟢 approvati · 🟡 in attesa · 🔴 urgenti).
 * Il riquadro "Cosa aspetta il tuo OK" (Approva/Rifiuta) è in "Oggi".
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, ClipboardCheck, CreditCard, LineChart, Megaphone, Users } from "lucide-react";
import { adminFetch } from "../api";
import { DepartmentRoomIntro } from "../components/DepartmentRoom";
import { FunnelWaterfall } from "../components/FunnelWaterfall";
import { getDepartmentRoom } from "../departmentRooms";

// Le 5 sezioni operative = le macro della sidebar (esclusa Dashboard). `to`
// punta alla pagina-reparto (landing con macro-finestre); Casi studio è una
// pagina singola e linka direttamente.
const REPARTI = [
  { id: "acquisizione", nome: "Acquisizione", mandato: "Dal freddo al Blueprint", tone: "amber", icon: Megaphone, resp: "Luca", respAvatar: "/agents/luca.jpg", to: "/admin/reparto/acquisizione" },
  { id: "vendite", nome: "Vendite", mandato: "Dal Blueprint alla firma", tone: "emerald", icon: BarChart3, resp: "Gaia", respAvatar: "/agents/gaia.jpg", to: "/admin/reparto/vendite" },
  { id: "delivery", nome: "Delivery", mandato: "Dalla firma al live", tone: "violet", icon: Users, resp: "Simona", respAvatar: "/agents/stefania.jpg", team: "Simona · Valentina · Andrea · Gaia · Marco · Carlo", to: "/admin/reparto/delivery" },
  { id: "casi-studio", nome: "Casi studio", mandato: "Prova sociale per vendere meglio", tone: "rose", icon: ClipboardCheck, resp: "Andrea", respAvatar: "/agents/andrea.jpg", to: "/admin/reparto/casi-studio" },
  { id: "back-office", nome: "Back office", mandato: "Soldi, contratti, ordine", tone: "sky", icon: CreditCard, resp: "Valentina", respAvatar: "/agents/valentina.jpg", to: "/admin/reparto/back-office" },
];

const TONES = {
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  violet: "bg-violet-50 border-violet-200 text-violet-700",
  rose: "bg-rose-50 border-rose-200 text-rose-700",
  sky: "bg-sky-50 border-sky-200 text-sky-700",
};

async function getJSON(path) {
  const r = await adminFetch(path);
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

function kpisFor(id, sum, health, lead) {
  const lp = lead?.pipeline || {}, lpa = lead?.pending_actions || {}, lt = lead?.today || {};
  if (id === "acquisizione") return [["Lead totali", lp.total_leads], ["Lead caldi", lp.hot_leads], ["Scoperti oggi", lt.discovered]];
  if (id === "vendite") return [["Lead caldi", lp.hot_leads], ["Da revisionare", lpa.messages_to_review], ["Inviati oggi", lt.messages_sent]];
  if (id === "delivery") return [["Partner", sum.total_partners], ["Attivi", sum.active_partners], ["Accountability", health.accountability || "—"]];
  if (id === "casi-studio") return [["Partner attivi", sum.active_partners], ["Engagement", health.engagement || "—"]];
  return [["MRR", sum.mrr != null ? "€ " + Number(sum.mrr).toLocaleString("it-IT") : "—"], ["LTV medio", sum.avg_ltv != null ? "€ " + sum.avg_ltv : "—"], ["Tech", health.tech || "—"]];
}

function fmt(v) {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("it-IT");
  return v;
}

function dashboardValues({ sum, acq, gG, gR, partners }) {
  const activePartners = sum.active_partners ?? partners.filter((p) => (p.stato || "attivo") === "attivo").length;
  const blockedPartners = partners.filter((p) => p.stato === "quarantena").length;
  const partnerships = acq?.target?.partnerships_closed ?? 0;
  const critical =
    gR > 0 ? "Decisioni ferme" :
    blockedPartners > 0 ? "Delivery" :
    (acq?.target?.gap || 0) > 0 ? "Vendite" :
    "Nessuno";
  return {
    "Fatturato mese": sum.mrr != null ? `EUR ${Number(sum.mrr).toLocaleString("it-IT")}` : "Da collegare",
    "Partnership chiuse": fmt(partnerships),
    "Partner attivi": fmt(activePartners),
    "Partner bloccati": fmt(blockedPartners),
    "Azioni per Claudio": fmt(gG),
    "Reparto critico": critical,
  };
}

function pct(a, b) {
  return b > 0 ? Math.round((a / b) * 100) + "%" : "—";
}

// Calcola gli stadi del funnel a cascata + north-star dai dati reali.
function funnelData({ mc = {}, inv = {}, hub = {} }) {
  const F = mc.funnel || {};
  const items = Array.isArray(inv.items) ? inv.items : [];
  const optin = F.opt_in || 0;
  const domande = F.diagnostic_completed || 0;
  const blueprint = F.purchased_67 || 0;
  const start = items.filter((s) => s.fonte === "ciak_start").length;
  const partnership = items.filter((s) => ["partnership", "upgrade"].includes(s.fonte)).length;
  const revBlue = blueprint * 27, revStart = start * 499, revPart = partnership * 2790;
  const oneOff = revBlue + revStart + revPart;
  const mrr = (hub.summary || {}).mrr || 0;
  const arpu = optin > 0 ? oneOff / optin : 0;
  const eur = (n) => "€ " + Number(n || 0).toLocaleString("it-IT");
  const stages = [
    { label: "Lead (opt-in)", count: fmt(optin) },
    { label: "8 Domande completate", count: fmt(domande), conv: pct(domande, optin) },
    { label: "Blueprint €27", count: fmt(blueprint), euro: eur(revBlue), conv: pct(blueprint, domande), hot: true },
    { label: "Ciak Start €499", count: fmt(start), euro: eur(revStart), conv: pct(start, blueprint) },
    { label: "Partnership €2.790", count: fmt(partnership), euro: eur(revPart), conv: pct(partnership, blueprint), hot: true },
  ];
  const northStar = {
    oneOff: eur(oneOff),
    mrr: eur(mrr),
    arpu: eur(Math.round(arpu)),
    goalPct: Math.round((oneOff / 1000000) * 100),
  };
  return { stages, northStar };
}

export function CabinaRegia({ onAuthExpired }) {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [hub, appr, apl, lead, acq, partnersData, mc, inv] = await Promise.all([
        getJSON("/api/agent-hub/summary"),
        getJSON("/api/agent-tasks/approval-stats"),
        getJSON("/api/agent-tasks/approvals"),
        getJSON("/api/discovery/stats/today"),
        getJSON("/api/admin/ciak/acquisizione-command-center"),
        getJSON("/api/admin/ciak/partners"),
        getJSON("/api/admin/ciak/masterclass-analytics"),
        getJSON("/api/admin/ciak/invoices/sources"),
      ]);
      setD({
        hub: hub || {},
        appr: appr || {},
        approvals: apl?.tasks || [],
        lead,
        acq: acq || {},
        partners: partnersData?.items || [],
        mc: mc || {},
        inv: inv || {},
      });
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    } finally { setLoading(false); }
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-24 text-center text-slate-400">Carico la cabina di regia…</div>;

  const sum = d.hub.summary || {}, health = d.hub.health || {};
  const gV = d.appr.approved_today ?? 0, gG = d.appr.pending_count ?? d.approvals.length ?? 0, gR = d.appr.stale_count ?? 0;
  const room = getDepartmentRoom("dashboard");
  const metricValues = dashboardValues({ sum, acq: d.acq || {}, gG, gR, partners: d.partners || [] });

  return (
    <div className="max-w-6xl p-6 md:p-8">
      <DepartmentRoomIntro room={room} onAuthExpired={onAuthExpired} metricValues={metricValues} />

      <FunnelWaterfall {...funnelData(d)} />

      {/* Simulatore €1M — la proiezione, controparte della Plancia (dati reali) */}
      <button
        onClick={() => navigate("/admin/simulatore")}
        className="w-full text-left rounded-2xl border border-yellow-300 bg-white overflow-hidden mb-7 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition group"
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-11 h-11 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center flex-shrink-0">
            <LineChart className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">Simulatore €1M · proiezione</p>
            <h3 className="font-bold text-slate-900 leading-tight">Pianifica la traiettoria a 3 anni</h3>
            <p className="text-xs text-slate-500 mt-0.5">Scenari prudente/base/ambizioso e leve tarabili sui dati veri. La Plancia sopra è il consuntivo; questo è il piano.</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-700 group-hover:gap-2.5 transition-all flex-shrink-0">
            Apri <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Reparti Evolution PRO</h2>
        <p className="text-sm text-slate-500 mt-1">Le 5 aree operative coordinate da Luca. Salute complessiva: <span className="font-semibold">{health.overall || "—"}</span></p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-7">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="text-2xl font-bold text-emerald-700">{gV}</div><p className="text-xs text-emerald-800/70 mt-1">🟢 Approvati oggi · in autonomia</p></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"><div className="text-2xl font-bold text-amber-700">{gG}</div><p className="text-xs text-amber-800/70 mt-1">🟡 Aspettano il tuo OK</p></div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4"><div className="text-2xl font-bold text-rose-700">{gR}</div><p className="text-xs text-rose-800/70 mt-1">🔴 Urgenti · fermi da &gt;4h</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPARTI.map((r) => {
          const Icon = r.icon;
          return (
          <button key={r.id} onClick={() => navigate(r.to)} className="text-left rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-sm transition">
            <div className={`px-5 py-4 flex items-center justify-between border-b ${TONES[r.tone] || TONES.sky}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div><h3 className="font-bold text-slate-900 leading-tight">{r.nome}</h3><p className="text-xs text-slate-600">{r.mandato}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <img src={r.respAvatar} alt={r.resp} title={"Agente di Riferimento: " + r.resp} className="w-8 h-8 rounded-full object-cover border-2 border-white" />
                <div className="text-right leading-tight">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Agente di Riferimento</div>
                  <div className="text-xs font-semibold text-slate-700">{r.resp}</div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {kpisFor(r.id, sum, health, d.lead).map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-lg font-bold text-slate-900 leading-tight">{value ?? "—"}</span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
                </div>
              ))}
            </div>
            {r.team && (
              <div className="px-5 pb-3 -mt-1 text-[11px] text-slate-400">Team sul percorso partner: {r.team}</div>
            )}
          </button>
          );
        })}
      </div>
    </div>
  );
}

export default CabinaRegia;
