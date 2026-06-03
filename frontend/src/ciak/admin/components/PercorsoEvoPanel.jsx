/**
 * Ciak Admin — Percorso EVO del partner (vista macro-fasi + 14 step).
 *
 * Sostituisce il vecchio selettore fase legacy F1–F9. Legge lo stato reale del
 * journey da GET /api/partner-journey/operativo/state/{id} (le stesse 3 macro-fasi
 * Esamina/Valida/Ottimizza e i 14 step che vede il partner) e permette all'admin di:
 *   - cambiare lo stato di uno step (Da fare / In corso / Fatto / Saltato)
 *   - caricare un documento sullo step
 *   - scrivere una nota interna
 *   - "Vai allo step" entrando nell'area partner (vista-admin) su quello step.
 *
 * Gli endpoint operativo non hanno auth gating: adminFetch allega comunque il token.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Circle, CircleDot, MinusCircle, Loader2,
  Upload, FileText, StickyNote, ChevronRight,
} from "lucide-react";
import { adminFetch, getToken, getAdminUser } from "../api";

const PJ = "/api/partner-journey";

const AGENT_NAME = { VALENTINA: "Valentina", ANDREA: "Andrea", MARCO: "Marco", STEFANIA: "Stefania" };

// status journey -> etichetta + classi colore
const STATUS_META = {
  pending:     { label: "Da fare",  badge: "bg-gray-100 text-slate-500",      icon: Circle },
  in_progress: { label: "In corso", badge: "bg-amber-100 text-amber-700",     icon: CircleDot },
  done:        { label: "Fatto",    badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  skipped:     { label: "Saltato",  badge: "bg-slate-200 text-slate-500",     icon: MinusCircle },
  blocked:     { label: "Bloccato", badge: "bg-red-100 text-red-700",         icon: MinusCircle },
};

const MACRO_STATUS_BADGE = {
  done: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-slate-400",
};

/** Entra nell'area partner (vista-admin) posizionata su uno step. */
function goToStep(partner, stepId) {
  const token = getToken();
  const user = getAdminUser();
  if (token) localStorage.setItem("ciak_partner_token", token);
  if (user) localStorage.setItem("ciak_partner_user", JSON.stringify(user));
  localStorage.setItem(
    "ciak_partner_view_id",
    JSON.stringify({ id: partner.id, name: partner.name, email: partner.email, phase: partner.phase })
  );
  if (stepId) localStorage.setItem("ciak_partner_initial_step", stepId);
  window.location.href = "/partner";
}

function StepRow({ step, partner, onChanged }) {
  const meta = STATUS_META[step.status] || STATUS_META.pending;
  const StatusIcon = meta.icon;
  const docs = Array.isArray(step.data?.admin_documents) ? step.data.admin_documents : [];

  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(step.data?.admin_note || "");
  const [noteSaved, setNoteSaved] = useState(false);
  const fileRef = useRef(null);

  const setStatus = async (status) => {
    if (status === step.status) return;
    setBusy(true);
    try {
      const res = await adminFetch(`${PJ}/operativo/admin/set-status/${partner.id}/${step.step_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await onChanged();
    } catch (e) {
      window.alert("Errore nel cambio stato: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async (data) => {
    const res = await adminFetch(`${PJ}/operativo/save-draft/${partner.id}/${step.step_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await adminFetch(`${PJ}/operativo/upload/${partner.id}?notify=false`, { method: "POST", body: fd });
      if (!up.ok) throw new Error(`upload HTTP ${up.status}`);
      const { url } = await up.json();
      const next = [...docs, { url, filename: file.name, at: new Date().toISOString() }];
      await saveDraft({ admin_documents: next });
      await onChanged();
    } catch (err) {
      window.alert("Errore upload: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    setBusy(true);
    try {
      await saveDraft({ admin_note: note });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 1800);
      await onChanged();
    } catch (err) {
      window.alert("Errore salvataggio nota: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <StatusIcon className={`w-5 h-5 flex-shrink-0 ${step.status === "done" ? "text-emerald-500" : step.status === "in_progress" ? "text-amber-500" : "text-gray-300"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">{step.step_number}</span>
            <span className="font-medium text-slate-900 truncate">{step.label || step.step_id}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
            {step.approval_status && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                approvazione: {step.approval_status}
              </span>
            )}
          </div>
          {docs.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {docs.map((d, i) => (
                <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded">
                  <FileText className="w-3 h-3" /> {d.filename || "documento"}
                </a>
              ))}
            </div>
          )}
        </div>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {/* Azioni */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-8">
        <select
          value={step.status}
          disabled={busy}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs px-2 py-1 rounded-lg border border-gray-300 outline-none focus:border-slate-900"
          title="Cambia stato dello step"
        >
          <option value="pending">Da fare</option>
          <option value="in_progress">In corso</option>
          <option value="done">Fatto</option>
          <option value="skipped">Saltato</option>
          <option value="blocked">Bloccato</option>
        </select>

        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-slate-700 hover:bg-gray-200 transition disabled:opacity-50">
          <Upload className="w-3.5 h-3.5" /> Documento
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={onUpload} />

        <button onClick={() => setNoteOpen((o) => !o)}
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition ${step.data?.admin_note ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-slate-700 hover:bg-gray-200"}`}>
          <StickyNote className="w-3.5 h-3.5" /> Nota{step.data?.admin_note ? " •" : ""}
        </button>

        <button onClick={() => goToStep(partner, step.step_id)}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-yellow-400 hover:bg-slate-800 transition">
          Vai allo step <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {noteOpen && (
        <div className="mt-2.5 pl-8">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Nota interna (visibile solo all'admin)…"
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-slate-900 resize-y"
          />
          <button onClick={saveNote} disabled={busy}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg bg-slate-900 text-yellow-400 hover:bg-slate-800 disabled:opacity-50">
            {noteSaved ? "Salvata" : "Salva nota"}
          </button>
        </div>
      )}
    </div>
  );
}

export function PercorsoEvoPanel({ partner }) {
  const partnerId = partner?.id;
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!partnerId) return;
    try {
      const res = await adminFetch(`${PJ}/operativo/state/${partnerId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="text-sm text-red-600">Errore caricamento percorso: {error}</div>;
  if (!state) return <div className="text-sm text-slate-400">Carico il percorso…</div>;

  const stepById = (id) => state.steps.find((s) => s.step_id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900">Percorso EVO</h4>
        <span className="text-xs text-slate-500">
          {state.completed_count}/{state.total_steps} step completati
        </span>
      </div>

      {state.macro_phases.map((mp) => {
        const badge = MACRO_STATUS_BADGE[mp.status] || MACRO_STATUS_BADGE.pending;
        const mpSteps = (mp.step_ids || []).map(stepById).filter(Boolean);
        return (
          <div key={mp.id} className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-gray-200">
              <span className="text-xl">{mp.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{mp.label}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                    {STATUS_META[mp.status]?.label || mp.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {mp.tagline}
                  {mp.agent && <> · Agente: <strong>{AGENT_NAME[mp.agent] || mp.agent}</strong></>}
                </div>
              </div>
              {mp.total_count > 0 && (
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {mp.completed_count}/{mp.total_count}
                </span>
              )}
            </div>

            <div className="p-3 space-y-2 bg-white">
              {mpSteps.length === 0 ? (
                <p className="text-xs text-slate-400 px-1 py-2">
                  Fase post-lancio: nessuno step fisso, gestita in continuità dopo il Go Live.
                </p>
              ) : (
                mpSteps.map((s) => (
                  <StepRow key={s.step_id} step={s} partner={partner} onChanged={load} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
