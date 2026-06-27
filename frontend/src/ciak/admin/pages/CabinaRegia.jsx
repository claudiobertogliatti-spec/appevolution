/**
 * Ciak Admin — CABINA DI REGIA (v3).
 * 4 reparti operativi col semaforo di autonomia. Ogni reparto ha un RESPONSABILE
 * (uno dei 6 agenti). I 4 responsabili continuano a far parte del team che lavora
 * il percorso partner nella Delivery (con Marco e Matteo). Le card portano al reparto.
 * Il riquadro "Cosa aspetta il tuo OK" (Approva/Rifiuta task) è stato spostato in
 * "Oggi" (componente ApprovalsQueue): qui resta solo il semaforo aggregato.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch } from "../api";

const REPARTI = [
  { id: "vendite", nome: "Vendite", mandato: "Pipeline e firma", color: "#10B981", soft: "#D1FAE5", emoji: "🛒", resp: "Gaia", respAvatar: "/agents/gaia.jpg", to: "/admin/lead-manager" },
  { id: "delivery", nome: "Delivery", mandato: "Dalla firma al LIVE", color: "#8B5CF6", soft: "#EDE9FE", emoji: "🚀", resp: "Stefania", respAvatar: "/agents/stefania.jpg", team: "Stefania · Valentina · Andrea · Gaia · Marco · Matteo", to: "/admin/partner" },
  { id: "comunicazione", nome: "Comunicazione", mandato: "Macchina dei contenuti", color: "#F59E0B", soft: "#FEF3C7", emoji: "📣", resp: "Andrea", respAvatar: "/agents/andrea.jpg", to: "/admin/calendario-editoriale" },
  { id: "backoffice", nome: "Back office", mandato: "Soldi, contratti, infrastruttura", color: "#0EA5E9", soft: "#E0F2FE", emoji: "⚖️", resp: "Valentina", respAvatar: "/agents/valentina.jpg", to: "/admin/transactions" },
];

async function getJSON(path) {
  const r = await adminFetch(path);
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

function kpisFor(id, sum, health, lead) {
  const lp = lead?.pipeline || {}, lpa = lead?.pending_actions || {}, lt = lead?.today || {};
  if (id === "vendite") return [["Lead totali", lp.total_leads], ["Lead caldi", lp.hot_leads], ["Da revisionare", lpa.messages_to_review]];
  if (id === "delivery") return [["Partner", sum.total_partners], ["Attivi", sum.active_partners], ["Accountability", health.accountability || "—"]];
  if (id === "comunicazione") return [["Scoperti oggi", lt.discovered], ["Inviati oggi", lt.messages_sent], ["Engagement", health.engagement || "—"]];
  return [["MRR", sum.mrr != null ? "€ " + Number(sum.mrr).toLocaleString("it-IT") : "—"], ["LTV medio", sum.avg_ltv != null ? "€ " + sum.avg_ltv : "—"], ["Tech", health.tech || "—"]];
}

export function CabinaRegia({ onAuthExpired }) {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [hub, appr, apl, lead] = await Promise.all([
        getJSON("/api/agent-hub/summary"),
        getJSON("/api/agent-tasks/approval-stats"),
        getJSON("/api/agent-tasks/approvals"),
        getJSON("/api/discovery/stats/today"),
      ]);
      setD({ hub: hub || {}, appr: appr || {}, approvals: apl?.tasks || [], lead });
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    } finally { setLoading(false); }
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-24 text-center text-slate-400">Carico la cabina di regia…</div>;

  const sum = d.hub.summary || {}, health = d.hub.health || {};
  const gV = d.appr.approved_today ?? 0, gG = d.appr.pending_count ?? d.approvals.length ?? 0, gR = d.appr.stale_count ?? 0;

  return (
    <div className="max-w-6xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Cabina di Regia</h1>
        <p className="text-sm text-slate-500 mt-1">Evolution PRO nei suoi 4 reparti operativi. Salute complessiva: <span className="font-semibold">{health.overall || "—"}</span></p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-7">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="text-2xl font-bold text-emerald-700">{gV}</div><p className="text-xs text-emerald-800/70 mt-1">🟢 Approvati oggi · in autonomia</p></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"><div className="text-2xl font-bold text-amber-700">{gG}</div><p className="text-xs text-amber-800/70 mt-1">🟡 Aspettano il tuo OK</p></div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4"><div className="text-2xl font-bold text-rose-700">{gR}</div><p className="text-xs text-rose-800/70 mt-1">🔴 Urgenti · fermi da &gt;4h</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPARTI.map((r) => (
          <button key={r.id} onClick={() => navigate(r.to)} className="text-left rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-sm transition">
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: r.soft }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: r.color }}>{r.emoji}</div>
                <div><h3 className="font-bold text-slate-900 leading-tight">{r.nome}</h3><p className="text-xs text-slate-600">{r.mandato}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <img src={r.respAvatar} alt={r.resp} title={"Responsabile: " + r.resp} className="w-8 h-8 rounded-full object-cover border-2 border-white" />
                <div className="text-right leading-tight">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Responsabile</div>
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
        ))}
      </div>
    </div>
  );
}

export default CabinaRegia;
