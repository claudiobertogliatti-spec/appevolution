import React, { useState, useEffect, useCallback } from "react";
import WorkspaceShell from "./WorkspaceShell";
import { API } from "../../../utils/api-config";
import { AGENTS } from "./agents";

/**
 * WORKSPACE 3 — "Costruiamo il Sistema di Vendita" (Fase Valida, agente Gaia).
 *
 * Assorbe gli step 09-funnel-asset + 10-funnel-team-work + prezzo (da 12).
 * Riusa i motori esistenti:
 *   - genera funnel/blueprint: POST /api/partner-journey/funnel/generate
 *   - pubblica funnel (Systeme): POST /api/partner-journey/funnel/publish
 *   - 5 generatori Gaia: POST /api/partner-journey/workspace/{id}/vendita/generate/{task}
 * Stato aggregato: GET /api/partner-journey/workspace/{id}/vendita
 */
export default function Workspace3SistemaVendita({ partnerId, onBack }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const [bpOpen, setBpOpen] = useState(false);
  const agent = AGENTS?.GAIA || { name: "Gaia", initial: "G" };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/partner-journey/workspace/${partnerId}/vendita`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setState(await r.json());
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);
  useEffect(() => { load(); }, [load]);

  const generateFunnel = async () => {
    setBusy("funnel");
    setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/funnel/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Completa prima Posizionamento, Masterclass e Corso.");
      }
      await load();
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(null); }
  };

  const publishFunnel = async () => {
    setBusy("publish");
    setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/funnel/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(null); }
  };

  const generateTask = async (taskId) => {
    setBusy(taskId);
    setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/workspace/${partnerId}/vendita/generate/${taskId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Errore nella generazione.");
      }
      const data = await r.json();
      if (data.state) setState(data.state); else await load();
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(null); }
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto p-8 text-center text-slate-500">Carico il workspace…</div>;
  }
  if (err && !state) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        {onBack && <button onClick={onBack} className="text-[13px] text-slate-500 hover:text-slate-800 mb-3">← Torna ai workspace</button>}
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      </div>
    );
  }
  if (!state) return null;

  const GEN_IDS = ["descrizione_offerta", "faq", "privacy", "cookie", "termini"];
  const aiTasks = (state.ai_tasks || []).map((t) => {
    const generable = GEN_IDS.includes(t.id);
    const inFlight = busy === t.id;
    return { ...t, status: inFlight ? "in_elaborazione" : t.status, generable, onGenerate: () => generateTask(t.id) };
  });

  const deliverables = (state.deliverables || []).map((d) => ({
    file_id: d.file_id, name: d.original_name || d.category, url: d.internal_url,
  }));

  let primary = null;
  if (!state.has_funnel) {
    primary = { label: busy === "funnel" ? "Gaia sta preparando il sistema…" : "Prepara il sistema di vendita",
                onClick: generateFunnel, disabled: busy === "funnel",
                hint: "Dai tuoi contenuti, Gaia prepara pagine, email e pagamento. Il team Evolution implementa nel tuo subaccount Systeme.io." };
  } else if (!state.published) {
    primary = { label: busy === "publish" ? "Invio al team…" : "Conferma per il go-live",
                onClick: publishFunnel, disabled: busy === "publish",
                hint: "Controlla la direzione qui sotto, poi conferma: il team lo mette online su Systeme.io." };
  } else {
    primary = { label: "Workspace completato ✓", onClick: onBack || (() => {}), disabled: false,
                hint: "Il sistema di vendita è online. Passa al prossimo workspace." };
  }

  const bp = state.blueprint;
  const ls = bp && (bp.landing_sections || {});
  const extra = ls && ls.hero ? (
    <div className="border border-slate-200 rounded-xl p-4 mb-6 bg-slate-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold text-slate-900">Anteprima del sistema di vendita</span>
        <button onClick={() => setBpOpen(!bpOpen)} className="text-[12px] text-slate-400 hover:text-slate-600">{bpOpen ? "Comprimi" : "Vedi tutto"}</button>
      </div>
      <div className={`text-[13px] text-slate-700 leading-relaxed ${bpOpen ? "" : "max-h-44 overflow-hidden"}`}>
        <div className="font-semibold text-slate-900">{ls.hero.headline}</div>
        {ls.hero.subheadline && <div className="text-slate-600 mb-2">{ls.hero.subheadline}</div>}
        {ls.promessa && <div className="mb-1"><span className="font-semibold">Promessa:</span> {ls.promessa.headline}</div>}
        {ls.cta_finale && <div className="mb-1"><span className="font-semibold">Offerta:</span> {ls.cta_finale.offerta} {ls.cta_finale.prezzo ? `— ${ls.cta_finale.prezzo}` : ""}</div>}
      </div>
    </div>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {onBack && <button onClick={onBack} className="text-[13px] text-slate-500 hover:text-slate-800 mb-3">← Torna ai workspace</button>}
      <WorkspaceShell
        index={state.workspace_index || 3}
        total={state.workspace_total || 5}
        title={state.title}
        progress={state.progress || 0}
        agent={agent}
        intro={state.intro}
        objective={state.objective}
        aiTasks={aiTasks}
        partnerTasks={state.partner_tasks || []}
        extra={extra}
        deliverables={deliverables}
        primary={primary}
      />
      {err && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
    </div>
  );
}
