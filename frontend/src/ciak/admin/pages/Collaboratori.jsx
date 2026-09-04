import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "../api";
import { CollaboratorSettlements } from "./CollaboratorSettlements";

function minutesLabel(minutes) {
  const n = Number(minutes || 0);
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function money(v) {
  return `EUR ${Number(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function Collaboratori({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("work");
  // Form in pagina al posto dei window.prompt.
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", estimated: "60" });
  const [approveTask, setApproveTask] = useState(null); // task in approvazione
  const [approveMinutes, setApproveMinutes] = useState("0");
  const [approveNote, setApproveNote] = useState("");

  const load = async () => {
    try {
      setData(await apiGet("/collaboratori/antonella"));
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apertura form (al posto dei 3 window.prompt).
  const createTask = () => {
    setNewTask({ title: "", description: "", estimated: "60" });
    setShowNewTask(true);
  };

  const submitNewTask = async () => {
    const title = newTask.title.trim();
    if (!title) {
      toast.error("Aggiungi un titolo al task.");
      return;
    }
    const estimated = Number(newTask.estimated) || 60;
    setShowNewTask(false);
    try {
      await apiPost("/collaboratori/antonella/tasks", {
        title,
        description: newTask.description || "",
        estimated_minutes: Math.max(15, Math.min(300, estimated)),
        category: "direttiva",
        created_by_agent: "luca",
        priority: "medium",
      });
      await load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore creazione task: " + e.message);
    }
  };

  // Apertura form approvazione (al posto dei 2 window.prompt).
  const approve = (task) => {
    setApproveTask(task);
    setApproveMinutes(String(task.actual_minutes || 0));
    setApproveNote("");
  };

  const submitApprove = async () => {
    const task = approveTask;
    if (!task) return;
    const minutes = Number(approveMinutes) || 0;
    if (minutes < 0) {
      toast.error("I minuti non possono essere negativi.");
      return;
    }
    setApproveTask(null);
    try {
      await apiPost(`/collaboratori/antonella/tasks/${task.task_id}/approve`, {
        approved_minutes: minutes,
        note: approveNote || "",
      });
      await load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore approvazione: " + e.message);
    }
  };

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Caricamento collaboratori...</div>;

  const { collaborator, summary, tasks, month } = data;
  const pending = tasks.filter((t) => t.status === "completed" && !t.approved_at);
  const approved = tasks.filter((t) => t.approved_at && String(t.created_at || "").startsWith(month));

  if (tab === "billing") return <div>
    <div className="px-8 pt-6"><button onClick={() => setTab("work")} className="mr-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Attivita' e compensi</button><button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400">Fatture e pagamenti</button></div>
    <CollaboratorSettlements collaborator={collaborator} onAuthExpired={onAuthExpired} />
  </div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-5"><button className="mr-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400">Attivita' e compensi</button><button onClick={() => setTab("billing")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Fatture e pagamenti</button></div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Back office</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Collaboratori</h1>
          <p className="mt-2 text-sm text-slate-500">
            Antonella viene pagata a ore effettive approvate. Simona assegna task coerenti con il budget settimanale.
          </p>
        </div>
        <button onClick={createTask} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400">
          <Plus className="h-4 w-4" /> Task manuale
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-yellow-300 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-yellow-400">
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{collaborator.name}</h2>
            <p className="text-sm text-slate-500">{collaborator.role} · Agente: {collaborator.agent} · {money(collaborator.hourly_rate)}/h</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Stat icon={Clock} label="Ore effettive mese" value={minutesLabel(summary.month_actual_minutes)} />
        <Stat icon={CheckCircle2} label="Ore approvate" value={minutesLabel(summary.month_approved_minutes)} />
        <Stat icon={FileText} label="Da pagare" value={money(summary.month_amount_due)} />
        <Stat icon={Clock} label="In approvazione" value={summary.pending_approval_count} />
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Ore da approvare</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {pending.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">Nessun task completato in attesa di approvazione.</div>
          ) : pending.map((task) => (
            <div key={task.task_id} className="flex items-center justify-between gap-4 p-5">
              <div>
                <h3 className="font-semibold text-slate-900">{task.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{task.description}</p>
                {task.resolution_notes && <p className="mt-1 text-xs text-slate-400">Nota: {task.resolution_notes}</p>}
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{minutesLabel(task.actual_minutes)}</div>
                  <div className="text-xs text-slate-400">{money((task.actual_minutes / 60) * collaborator.hourly_rate)}</div>
                </div>
                <button onClick={() => approve(task)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  Approva ore
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Riepilogo approvato mese {month}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {approved.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">Nessuna ora approvata nel mese.</div>
          ) : approved.map((task) => (
            <div key={task.task_id} className="flex items-center justify-between gap-4 p-5">
              <div>
                <h3 className="font-semibold text-slate-900">{task.title}</h3>
                <p className="text-xs text-slate-400">Approvato da {task.approved_by || "admin"}</p>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">{minutesLabel(task.approved_minutes)}</div>
                <div className="text-xs text-slate-400">{money(task.approved_amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showNewTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onClick={() => setShowNewTask(false)}>
          <div role="dialog" aria-modal="true" aria-label="Nuovo task per Antonella" className="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Nuovo task per Antonella</h2>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-slate-500">Titolo</label>
            <input autoFocus value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-widest text-slate-500">Descrizione operativa</label>
            <textarea rows={3} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-widest text-slate-500">Minuti stimati (15–300)</label>
            <input type="number" min="15" max="300" value={newTask.estimated} onChange={(e) => setNewTask({ ...newTask, estimated: e.target.value })}
              className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 tabular-nums" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewTask(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">Annulla</button>
              <button type="button" onClick={submitNewTask} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800">Crea task</button>
            </div>
          </div>
        </div>
      )}

      {approveTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onClick={() => setApproveTask(null)}>
          <div role="dialog" aria-modal="true" aria-label="Approva ore" className="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Approva le ore</h2>
            <p className="mt-2 text-sm text-slate-600">{approveTask.title}</p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-slate-500">Minuti da approvare</label>
            <input type="number" min="0" autoFocus value={approveMinutes} onChange={(e) => setApproveMinutes(e.target.value)}
              className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 tabular-nums" />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-widest text-slate-500">Nota (opzionale)</label>
            <textarea rows={2} value={approveNote} onChange={(e) => setApproveNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setApproveTask(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">Annulla</button>
              <button type="button" onClick={submitApprove} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Approva ore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Collaboratori;
