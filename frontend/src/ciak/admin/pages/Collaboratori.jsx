import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, Plus, UserRound } from "lucide-react";
import { apiGet, apiPost } from "../api";

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

  const createTask = async () => {
    const title = window.prompt("Titolo task per Antonella");
    if (!title) return;
    const description = window.prompt("Descrizione operativa", "") || "";
    const estimated = Number(window.prompt("Minuti stimati", "60") || 60);
    try {
      await apiPost("/collaboratori/antonella/tasks", {
        title,
        description,
        estimated_minutes: Math.max(15, Math.min(300, estimated)),
        category: "direttiva",
        created_by_agent: "luca",
        priority: "medium",
      });
      await load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else window.alert("Errore creazione task: " + e.message);
    }
  };

  const approve = async (task) => {
    const minutes = Number(window.prompt("Minuti da approvare", String(task.actual_minutes || 0)) || 0);
    if (minutes < 0) return;
    const note = window.prompt("Nota approvazione", "") || "";
    try {
      await apiPost(`/collaboratori/antonella/tasks/${task.task_id}/approve`, {
        approved_minutes: minutes,
        note,
      });
      await load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else window.alert("Errore approvazione: " + e.message);
    }
  };

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Caricamento collaboratori...</div>;

  const { collaborator, summary, tasks, month } = data;
  const pending = tasks.filter((t) => t.status === "completed" && !t.approved_at);
  const approved = tasks.filter((t) => t.approved_at && String(t.created_at || "").startsWith(month));

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Back office</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Collaboratori</h1>
          <p className="mt-2 text-sm text-slate-500">
            Antonella viene pagata a ore effettive approvate. Stefania assegna task coerenti con il budget settimanale.
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
    </div>
  );
}

export default Collaboratori;
