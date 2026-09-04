/**
 * Ciak Admin — Oggi di Antonella (Comunicazione & Social).
 *
 * Coda di azioni quotidiane tarata sui compiti di Antonella, NON sul funnel
 * vendite €27 (niente clienti bloccati / call da fissare / conversion rate).
 * Le azioni qui sono quelle che lei esegue con i pieni poteri admin, esattamente
 * come Claudio:
 *   1. Approvazioni materiali partner (stesso pannello dell'admin)
 *   2. Video pronti per la revisione
 *   3. Alert sulle campagne ads (con "Risolvi")
 *   4. Snapshot KPI campagne + scorciatoia al Calendario Editoriale
 *
 * Sorgenti: /api/admin/approvazioni/queue · /api/admin/video-review ·
 *           /api/stefania/war-mode/dashboard · /api/stefania/war-mode/alerts
 * Tutte via adminFetch (token admin Ciak).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ChevronRight, FileCheck, Video, Target,
  DollarSign, Users, BarChart3, AlertTriangle, CalendarDays, Play, Square, CheckCircle2, Clock,
} from "lucide-react";
import { apiGet, apiPost, adminFetch } from "../api";
import ApprovazioniMaterialiPanel from "../components/ApprovazioniMaterialiPanel";
import { StefaniaAdmin } from "./StefaniaAdmin";

function num(v) {
  return typeof v === "number" ? v : 0;
}

// ── Mattoni UI (stessa skin di Oggi) ───────────────────────────────────────

function Block({ title, children, action, onAction, accent }) {
  return (
    <div className={`rounded-2xl overflow-hidden bg-white border ${accent ? "border-yellow-300" : "border-gray-200"}`}>
      <div className={`flex items-center justify-between px-5 py-3 border-b border-gray-200 ${accent ? "bg-yellow-50" : "bg-white"}`}>
        <span className={`text-xs font-semibold uppercase tracking-widest ${accent ? "text-yellow-600" : "text-slate-400"}`}>
          {title}
        </span>
        {action && (
          <button onClick={onAction} className="text-xs font-semibold flex items-center gap-1 text-yellow-600">
            {action} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ActionCard({ count, label, sublabel, urgency, icon: Icon, onClick }) {
  const styles = {
    high: { wrap: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-500" },
    medium: { wrap: "bg-orange-50 border-orange-200", badge: "bg-orange-100 text-yellow-600" },
    ok: { wrap: "bg-white border-gray-200", badge: "bg-emerald-100 text-emerald-500" },
  };
  const s = styles[urgency] || styles.ok;
  return (
    <button onClick={onClick} className={`w-full rounded-xl p-4 text-left flex items-center gap-4 border transition-all ${s.wrap}`}>
      <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-semibold text-xl ${s.badge}`}>
        {Icon ? <Icon className="w-5 h-5" /> : count}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-900">{label}</div>
        <div className="text-xs mt-0.5 text-slate-400">{sublabel}</div>
      </div>
      <span className="flex items-center gap-2 flex-shrink-0">
        {Icon && <span className="text-lg font-semibold text-slate-700">{count}</span>}
        <ArrowRight className="w-4 h-4 text-slate-400" />
      </span>
    </button>
  );
}

function minutesLabel(minutes) {
  const n = Number(minutes || 0);
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function WorkTaskCard({ task, onStart, onStop, onComplete }) {
  const running = task.is_timer_running;
  const done = task.status === "completed" || task.status === "resolved";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              {task.work_category || "contenuti"}
            </span>
            <span className="text-[11px] text-slate-400">Stima {minutesLabel(task.estimated_minutes)}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-900">{task.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{task.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-semibold text-slate-900">{minutesLabel(task.actual_minutes)}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">effettive</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!done && !running && (
          <button onClick={() => onStart(task)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-yellow-400">
            <Play className="h-3.5 w-3.5" /> Inizia
          </button>
        )}
        {!done && running && (
          <button onClick={() => onStop(task)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700">
            <Square className="h-3.5 w-3.5" /> Ferma timer
          </button>
        )}
        {!done && (
          <button onClick={() => onComplete(task)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completa
          </button>
        )}
        {task.status === "completed" && <span className="text-xs font-semibold text-yellow-700">In attesa approvazione ore</span>}
        {task.status === "resolved" && <span className="text-xs font-semibold text-emerald-700">Ore approvate</span>}
      </div>
    </div>
  );
}

// ── Componente ──────────────────────────────────────────────────────────────

export function AntonellaOggi({ onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [work, setWork] = useState(null);
  const [showApprovPanel, setShowApprovPanel] = useState(false);
  // Form in pagina per la nota di completamento (al posto di window.prompt).
  const [completeFor, setCompleteFor] = useState(null);
  const [completeNote, setCompleteNote] = useState("");
  const [materiali, setMateriali] = useState(0);

  const load = async () => {
    const results = await Promise.allSettled([
      adminFetch("/api/admin/approvazioni/queue").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/admin/video-review").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/stefania/war-mode/dashboard").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/stefania/war-mode/alerts").then((r) => (r.ok ? r.json() : [])),
    ]);
    if (results.some((r) => r.status === "rejected" && r.reason?.message === "AUTH_EXPIRED")) {
      onAuthExpired?.();
      return;
    }
    const val = (i) => (results[i].status === "fulfilled" ? results[i].value : null);
    const queue = val(0) || {};
    const video = (val(1)?.videos || []).filter((v) => v.status === "ready_for_review").length;
    const ads = val(2) || null;
    const adsAlerts = Array.isArray(val(3)) ? val(3) : [];
    setMateriali(num(queue.total));
    setData({ video, ads, adsAlerts });
    const workData = await apiGet("/collaboratori/antonella");
    setWork(workData);
  };

  useEffect(() => {
    load().catch((e) => {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveAlert = async (id) => {
    try {
      await adminFetch(`/api/stefania/war-mode/alerts/${id}/resolve`, { method: "POST" });
      load();
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-lg animate-pulse flex items-center justify-center bg-yellow-500">
          <span className="text-sm font-semibold text-slate-900">C</span>
        </div>
      </div>
    );
  }

  const { video, ads, adsAlerts } = data;
  const ov = ads?.overview || {};
  const activeTasks = (work?.tasks || []).filter((t) => ["open", "in_progress", "completed"].includes(t.status));

  const refreshWork = async () => setWork(await apiGet("/collaboratori/antonella"));
  const startTask = async (task) => { await apiPost(`/collaboratori/antonella/tasks/${task.task_id}/start`); await refreshWork(); };
  const stopTask = async (task) => { await apiPost(`/collaboratori/antonella/tasks/${task.task_id}/stop`); await refreshWork(); };
  const completeTask = (task) => {
    setCompleteNote("");
    setCompleteFor(task);
  };
  const submitComplete = async () => {
    const task = completeFor;
    if (!task) return;
    setCompleteFor(null);
    await apiPost(`/collaboratori/antonella/tasks/${task.task_id}/complete`, { note: completeNote });
    await refreshWork();
  };

  return (
    <div className="p-10">
      <div className="space-y-5 max-w-5xl">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Oggi</h1>
          <p className="text-slate-500 mt-0.5">Le tue azioni di oggi su contenuti, materiali e campagne.</p>
        </div>

        <Block title="Agente di riferimento — Simona">
          <StefaniaAdmin onAuthExpired={onAuthExpired} compact />
        </Block>

        <Block title="Task assegnati da Simona" accent>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Budget settimanale</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">4-5h</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Stima aperta</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{minutesLabel(work?.summary?.week_estimated_minutes_open)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Da approvare</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{work?.summary?.pending_approval_count || 0}</p>
            </div>
          </div>
          {activeTasks.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              <Clock className="h-4 w-4" /> Nessun task operativo aperto.
            </div>
          ) : (
            <div className="space-y-3">
              {activeTasks.slice(0, 8).map((task) => (
                <WorkTaskCard key={task.task_id} task={task} onStart={startTask} onStop={stopTask} onComplete={completeTask} />
              ))}
            </div>
          )}
        </Block>

        {/* ── 1. AZIONI PRIORITARIE ── */}
        <Block title="Azioni prioritarie" accent>
          <div className="space-y-3">
            <ActionCard
              icon={FileCheck}
              count={materiali}
              label="Materiali da approvare"
              sublabel="File caricati dai partner in attesa di revisione"
              urgency={materiali > 0 ? "high" : "ok"}
              onClick={() => setShowApprovPanel(true)}
            />
            <ActionCard
              icon={Video}
              count={video}
              label="Video da approvare"
              sublabel="Masterclass e lezioni pronte per la revisione"
              urgency={video > 0 ? "high" : "ok"}
              onClick={() => navigate("/admin/video-review")}
            />
            <ActionCard
              icon={Target}
              count={adsAlerts.length}
              label="Alert campagne ads"
              sublabel="Campagne che richiedono un intervento"
              urgency={adsAlerts.length > 0 ? "medium" : "ok"}
              onClick={() => navigate("/admin/campagne-ads")}
            />
          </div>
        </Block>

        {/* ── 2. ALERT ADS (con risolvi) ── */}
        {adsAlerts.length > 0 && (
          <Block title="Campagne — alert da gestire" action="Tutte le campagne" onAction={() => navigate("/admin/campagne-ads")}>
            <div className="space-y-2">
              {adsAlerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <div className="min-w-0 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{a.message}</p>
                      {a.suggested_action && <p className="text-xs text-slate-500 mt-0.5">{a.suggested_action}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(a.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition flex-shrink-0"
                  >
                    Risolvi
                  </button>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* ── 3. SNAPSHOT CAMPAGNE ── */}
        {ads && (
          <Block title="Campagne — andamento" action="Apri" onAction={() => navigate("/admin/campagne-ads")}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Target, label: "Campagne", value: num(ov.total_campaigns), cls: "text-yellow-600" },
                { icon: DollarSign, label: "Spesa", value: `€${num(ov.total_spend).toFixed(0)}`, cls: "text-slate-700" },
                { icon: Users, label: "Lead", value: num(ov.total_leads), cls: "text-emerald-600" },
                { icon: BarChart3, label: "CPL medio", value: `€${num(ov.avg_cpl).toFixed(2)}`, cls: "text-blue-600" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <k.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">{k.label}</span>
                  </div>
                  <div className={`text-2xl font-semibold ${k.cls}`}>{k.value}</div>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* ── 4. CONTENUTI ── */}
        <Block title="Contenuti partner">
          <button
            onClick={() => navigate("/admin/calendario-editoriale")}
            className="w-full rounded-xl p-4 text-left flex items-center gap-4 border border-gray-200 bg-white hover:border-slate-400 transition"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-900">Calendario Editoriale</div>
              <div className="text-xs mt-0.5 text-slate-400">
                Lancio, regime e webinar di ogni partner — genera e revisiona i contenuti
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>
        </Block>
      </div>

      <ApprovazioniMaterialiPanel
        open={showApprovPanel}
        onClose={() => setShowApprovPanel(false)}
        onChange={(n) => setMateriali(n)}
      />
      {completeFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onClick={() => setCompleteFor(null)}>
          <div role="dialog" aria-modal="true" aria-label="Completa il task" className="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Completa il task</h2>
            <p className="mt-2 text-sm text-slate-600">{completeFor.title}</p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-slate-500">Nota finale (opzionale)</label>
            <textarea
              autoFocus rows={3} value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
              data-testid="complete-note-input"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCompleteFor(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">Annulla</button>
              <button type="button" onClick={submitComplete} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800">Segna completato</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AntonellaOggi;
