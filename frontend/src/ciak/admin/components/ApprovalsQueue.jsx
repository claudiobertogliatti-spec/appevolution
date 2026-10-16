/**
 * Ciak Admin — ApprovalsQueue.
 *
 * Riquadro "Cosa aspetta il tuo OK": elenco dei task degli agenti in attesa di
 * approvazione, con Approva / Rifiuta (rigenera con feedback) / Scarta (toglie
 * dalla coda senza rigenerare) / Visualizza (espande richiesta + output + note +
 * lead). Estratto dalla Cabina di Regia per essere mostrato in "Oggi" (cruscotto
 * operativo). Si auto-carica e si auto-ricarica dopo ogni azione.
 *
 * Backend: GET /api/agent-tasks/approvals · POST /api/agent-tasks/{id}/approve|reject|dismiss
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { adminFetch, getAdminUser } from "../api";

function fmtDateTime(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function ApprovalsQueue({ onAuthExpired }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [openId, setOpenId] = useState(null);
  // Form in pagina per il motivo del rifiuto (al posto di window.prompt).
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await adminFetch("/api/agent-tasks/approvals");
      const d = r.ok ? await r.json() : null;
      setApprovals(d?.tasks || []);
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    } finally {
      setLoading(false);
    }
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  async function act(task, kind, feedback) {
    const id = task.id || task.task_id;
    if (!id) return;
    const reviewer = (getAdminUser() && getAdminUser().name) || "Claudio";
    const body = { reviewer };
    if (kind === "reject") {
      if (!feedback || !feedback.trim()) return;
      body.feedback = feedback.trim();
    }
    setBusy(id + kind);
    try {
      const r = await adminFetch("/api/agent-tasks/" + id + "/" + kind, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const t = await r.text(); toast.error("Errore: " + t); }
      else { await load(); }
    } catch (e) {
      if (e && e.message === "AUTH_EXPIRED") onAuthExpired?.();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <h2 className="font-bold text-slate-900">Cosa aspetta il tuo OK</h2>
        <span className="ml-auto text-xs text-slate-400">
          {loading ? "…" : `${approvals.length} task`}
        </span>
      </div>
      {loading ? (
        <div className="px-5 py-10 text-center text-slate-400 text-sm">Carico i task in attesa…</div>
      ) : approvals.length === 0 ? (
        <div className="px-5 py-10 text-center text-slate-400 text-sm">
          Nessun task in attesa. I reparti stanno lavorando in autonomia.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {approvals.map((t, i) => {
            const id = t.id || t.task_id;
            const open = openId === id;
            const res = t.result || {};
            const output = res.output != null
              ? (typeof res.output === "string" ? res.output : JSON.stringify(res.output, null, 2))
              : null;
            return (
              <li key={id || i} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">{t.title || t.task_type || t.lead_name || "(task senza titolo)"}</span>
                  <span className="text-xs text-slate-400 shrink-0 mr-1">{t.agent || t.created_by_agent || ""}</span>
                  <button
                    onClick={() => setOpenId(open ? null : id)}
                    className="text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    {open ? "Nascondi" : "Visualizza"}
                  </button>
                  <button disabled={!!busy} onClick={() => act(t, "approve")} className="text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Approva</button>
                  <button disabled={!!busy} onClick={() => { setRejectReason(""); setRejectFor(t); }} className="text-xs font-medium px-2.5 py-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50">Rifiuta</button>
                  <button disabled={!!busy} onClick={() => act(t, "dismiss")} title="Togli dalla coda senza rigenerare" className="text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50">Scarta</button>
                </div>

                {open && (
                  <div className="mt-3 ml-5 rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-3">
                    {t.description && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Richiesta</div>
                        <p className="text-sm text-slate-700 mt-0.5">{t.description}</p>
                      </div>
                    )}
                    {output && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Output da approvare</div>
                        <pre className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap break-words font-sans">{output}</pre>
                      </div>
                    )}
                    {res.message && (
                      <p className="text-xs text-slate-500 italic">{res.message}</p>
                    )}
                    {t.notes && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Note</div>
                        <p className="text-sm text-slate-700 mt-0.5">{t.notes}</p>
                      </div>
                    )}
                    {(t.lead_name || t.lead_email) && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Lead</div>
                        <p className="text-sm text-slate-700 mt-0.5">
                          {t.lead_name || "—"}{t.lead_email ? ` · ${t.lead_email}` : ""}
                          {t.lead_score != null ? ` · score ${t.lead_score}` : ""}
                          {t.lead_source ? ` · ${t.lead_source}` : ""}
                        </p>
                      </div>
                    )}
                    {!t.description && !output && !res.message && !t.notes && !t.lead_name && !t.lead_email && (
                      <p className="text-sm text-slate-400 italic">Nessun contenuto associato a questo task. Se non sai cosa sia, usa «Scarta».</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Agente: {t.agent || "—"}</span>
                      <span>Richiesto da: {t.created_by || "—"}</span>
                      <span>Priorità: {t.priority || "—"}</span>
                      <span>Creato: {fmtDateTime(t.created_at)}</span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
        Approva sblocca · Rifiuta chiede un motivo e rigenera · Scarta toglie dalla coda senza rigenerare.
      </div>
      {rejectFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onClick={() => setRejectFor(null)}>
          <div role="dialog" aria-modal="true" aria-label="Motivo del rifiuto" className="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Motivo del rifiuto</h2>
            <p className="mt-2 text-sm text-slate-600">Verrà usato per rigenerare il task.</p>
            <textarea
              autoFocus rows={3} value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-testid="reject-reason-input"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectFor(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">Annulla</button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={() => { const t = rejectFor; setRejectFor(null); act(t, "reject", rejectReason); }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Rifiuta e rigenera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalsQueue;
