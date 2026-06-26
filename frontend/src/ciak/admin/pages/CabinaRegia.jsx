/**
 * Ciak Admin — CABINA DI REGIA (read-only v1).
 * Vista d'insieme dei 4 reparti operativi col semaforo di autonomia.
 * Dati: /api/agent-hub/summary, /api/agent-tasks/approval-stats,
 *       /api/agent-tasks/approvals, /api/discovery/stats/today.
 */
import React, { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../api";

const REPARTI = [
  { id: "vendite", nome: "Vendite", mandato: "Pipeline e firma", color: "#10B981", soft: "#D1FAE5", emoji: "🛒", agenti: "Gaia · Matteo" },
  { id: "delivery", nome: "Delivery", mandato: "Dalla firma al LIVE", color: "#8B5CF6", soft: "#EDE9FE", emoji: "🚀", agenti: "Stefania · Valentina · Marco" },
  { id: "comunicazione", nome: "Comunicazione", mandato: "Macchina dei contenuti", color: "#F59E0B", soft: "#FEF3C7", emoji: "📣", agenti: "Andrea" },
  { id: "backoffice", nome: "Back office", mandato: "Soldi, contratti, infrastruttura", color: "#0EA5E9", soft: "#E0F2FE", emoji: "⚖️", agenti: "Presidio umano + tech" },
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
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Cabina di Regia</h1>
        <p className="text-sm text-slate-500 mt-1">Evolution PRO nei suoi 4 reparti operativi. Salute complessiva: <span className="font-semibold">{health.overall || "—"}</span></p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-7">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="text-2xl font-bold text-emerald-700">{gV}</div><p className="text-xs text-emerald-800/70 mt-1">🟢 Approvati oggi · in autonomia</p></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"><div className="text-2xl font-bold text-amber-700">{gG}</div><p className="text-xs text-amber-800/70 mt-1">🟡 Aspettano il tuo OK</p></div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4"><div className="text-2xl font-bold text-rose-700">{gR}</div><p className="text-xs text-rose-800/70 mt-1">🔴 Urgenti · fermi da &gt;4h</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {REPARTI.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: r.soft }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: r.color }}>{r.emoji}</div>
                <div><h3 className="font-bold text-slate-900 leading-tight">{r.nome}</h3><p className="text-xs text-slate-600">{r.mandato}</p></div>
              </div>
              <span className="text-xs text-slate-500 font-medium">{r.agenti}</span>
            </div>
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {kpisFor(r.id, sum, health, d.lead).map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-lg font-bold text-slate-900 leading-tight">{value ?? "—"}</span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <h2 className="font-bold text-slate-900">Cosa aspetta il tuo OK</h2>
          <span className="ml-auto text-xs text-slate-400">{d.approvals.length} task</span>
        </div>
        {d.approvals.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">Nessun task in attesa. I reparti stanno lavorando in autonomia.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.approvals.slice(0, 15).map((t, i) => (
              <li key={t.task_id || i} className="px-5 py-3 flex items-center gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-sm text-slate-700 truncate flex-1">{t.title || t.task_type || "Task"}</span>
                <span className="text-xs text-slate-400 shrink-0">{t.agent || t.created_by_agent || ""}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
          Versione 1 — sola lettura. I comandi di sblocco (approva/rifiuta) e il briefing giornaliero unico arrivano nei prossimi passi.
        </div>
      </div>
    </div>
  );
}

export default CabinaRegia;
