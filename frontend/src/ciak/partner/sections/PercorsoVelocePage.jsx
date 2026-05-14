/**
 * Ciak Partner — Percorso Veloce (Go Live in 21 giorni).
 *
 * Porting di components/partner/PercorsoVelocePage.jsx.
 * Re-skin palette Ciak (slate/yellow/emerald). axios → fetch nativo.
 * Flusso funzionale identico, endpoint backend invariati:
 *  GET  /api/partner-journey/percorso-veloce/:partnerId
 *  POST /api/partner-journey/percorso-veloce/activate
 *  POST /api/partner-journey/percorso-veloce/save-checklist
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, CheckCircle2, Circle, Loader2, ArrowRight,
  Target, Video, Layers, Megaphone, Radio,
  Clock, Calendar, ChevronRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   PHASE CONFIG
   ───────────────────────────────────────────────────────────────────────── */

const PHASES = [
  { id: "posizionamento", name: "Posizionamento", dayStart: 1, dayEnd: 2, icon: Target,
    accent: "blue", iconCls: "bg-blue-100 text-blue-500", textCls: "text-blue-500" },
  { id: "webinar", name: "Webinar", dayStart: 3, dayEnd: 7, icon: Video,
    accent: "slate", iconCls: "bg-slate-100 text-slate-500", textCls: "text-slate-500" },
  { id: "funnel", name: "Funnel", dayStart: 8, dayEnd: 10, icon: Layers,
    accent: "yellow", iconCls: "bg-yellow-100 text-yellow-600", textCls: "text-yellow-600" },
  { id: "traffico", name: "Traffico", dayStart: 11, dayEnd: 14, icon: Megaphone,
    accent: "red", iconCls: "bg-red-100 text-red-500", textCls: "text-red-500" },
  { id: "webinar_live", name: "Webinar Live", dayStart: 15, dayEnd: 21, icon: Radio,
    accent: "emerald", iconCls: "bg-emerald-100 text-emerald-500", textCls: "text-emerald-500" },
];

/* ─────────────────────────────────────────────────────────────────────────
   COUNTDOWN HERO
   ───────────────────────────────────────────────────────────────────────── */

function CountdownHero({ currentDay }) {
  const remaining = Math.max(21 - currentDay, 0);
  const progress = Math.min((currentDay / 21) * 100, 100);
  const completed = currentDay > 21;

  return (
    <div
      className={`rounded-2xl overflow-hidden mb-6 ${completed ? "bg-emerald-500" : "bg-slate-900"}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 text-white/40">
              Go Live in 21 giorni
            </p>
            <p className="text-4xl font-semibold text-white">
              {completed ? "LIVE" : `Giorno ${currentDay}`}
            </p>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/10">
              {completed ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <span className="text-2xl font-semibold text-white">{remaining}</span>
              )}
            </div>
            <p className="text-[10px] font-semibold mt-1 text-white/50">
              {completed ? "Completato" : "giorni rimasti"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden bg-white/15">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              completed ? "bg-white" : "bg-yellow-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PHASE STEPPER
   ───────────────────────────────────────────────────────────────────────── */

function PhaseStepper({ currentDay, currentPhase }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-100">
          <Calendar className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Le 5 fasi</h2>
          <p className="text-xs text-slate-400">Dove sei nel percorso</p>
        </div>
      </div>

      <div className="space-y-2">
        {PHASES.map((phase) => {
          const isCurrent = phase.id === currentPhase;
          const isCompleted = currentDay > phase.dayEnd;
          const isLocked = currentDay < phase.dayStart;
          const PIcon = phase.icon;

          return (
            <div
              key={phase.id}
              className={`rounded-xl p-4 flex items-center gap-3 transition ${
                isCurrent ? "bg-gray-50 border-2 border-yellow-400" : "bg-white border border-gray-200"
              } ${isLocked ? "opacity-50" : ""}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? "bg-emerald-500" : isCurrent ? phase.iconCls : "bg-gray-100"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : (
                  <PIcon className={`w-5 h-5 ${isCurrent ? phase.textCls : "text-slate-400"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-semibold ${
                      isCompleted ? "text-emerald-700" : "text-slate-900"
                    }`}
                  >
                    {phase.name}
                  </p>
                  {isCurrent && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-400 text-slate-900">
                      Ora
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Giorno {phase.dayStart}–{phase.dayEnd}
                </p>
              </div>
              {isCurrent && <ChevronRight className={`w-4 h-4 ${phase.textCls}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   CHECKLIST GIORNALIERA
   ───────────────────────────────────────────────────────────────────────── */

function DailyChecklist({ currentDay, tasks, checklist, onToggle }) {
  const completed = checklist.filter((c) => c.done).length;
  const total = tasks.length;
  const allDone = total > 0 && completed === total;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-100">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Oggi — Giorno {currentDay}
            </h2>
            <p className="text-xs text-slate-400">
              {allDone ? "Tutto fatto!" : `${total - completed} cose da fare`}
            </p>
          </div>
        </div>
        <span
          className={`text-xl font-semibold ${allDone ? "text-emerald-500" : "text-slate-900"}`}
        >
          {completed}/{total}
        </span>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
        {tasks.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-400">Nessun task per oggi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => {
              const saved = checklist.find((c) => c.id === task.id);
              const isDone = saved?.done || false;
              return (
                <button
                  key={task.id}
                  onClick={() => onToggle(task.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                      isDone ? "bg-emerald-500 text-white" : "bg-gray-200 text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isDone ? "text-emerald-700 line-through opacity-70" : "text-slate-900"
                      }`}
                    >
                      {task.label}
                    </p>
                    <p className="text-xs mt-0.5 text-slate-400">{task.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ACTIVATION SCREEN
   ───────────────────────────────────────────────────────────────────────── */

function ActivationScreen({ onActivate, isActivating, onBack }) {
  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-yellow-100">
            <Zap className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-semibold mb-3 text-slate-900">
            Go Live in 21 giorni
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            Un percorso accelerato per portarti online
            <br />
            con funnel, webinar e traffico reale.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-200">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-slate-400">
            Le 5 fasi
          </p>
          <div className="space-y-3">
            {PHASES.map((phase) => {
              const PIcon = phase.icon;
              return (
                <div key={phase.id} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${phase.iconCls}`}
                  >
                    <PIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{phase.name}</p>
                    <p className="text-xs text-slate-400">
                      Giorno {phase.dayStart}–{phase.dayEnd}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-6 bg-slate-900">
          <p className="text-sm leading-relaxed text-slate-400">
            <strong className="text-white">Tra 21 giorni avrai:</strong>
          </p>
          <ul className="mt-3 space-y-2">
            {[
              "Un funnel live che raccoglie iscritti",
              "Un webinar che converte in vendite",
              "Traffico reale che arriva ogni giorno",
            ].map((t, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                <span className="text-sm text-white">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onActivate}
          disabled={isActivating}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base bg-yellow-400 text-slate-900 hover:bg-yellow-300 transition disabled:opacity-50"
        >
          {isActivating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Inizia il Percorso Veloce <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────── */

export function PercorsoVelocePage({ partnerId }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [isActivating, setIsActivating] = useState(false);

  const load = async () => {
    if (!partnerId) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/partner-journey/percorso-veloce/${partnerId}`);
      const resData = await res.json();
      setData(resData);
      if (resData.active && resData.today_tasks) {
        const saved = resData.today_checklist || [];
        const merged = resData.today_tasks.map((t) => {
          const s = saved.find((c) => c.id === t.id);
          return { id: t.id, done: s?.done || false };
        });
        setChecklist(merged);
      }
    } catch (e) {
      setData({ active: false });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const handleActivate = async () => {
    if (!partnerId) return;
    setIsActivating(true);
    try {
      await fetch(`/api/partner-journey/percorso-veloce/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      await load();
    } catch (e) {
      // best-effort
    } finally {
      setIsActivating(false);
    }
  };

  const handleToggle = async (taskId) => {
    const updated = checklist.map((c) =>
      c.id === taskId ? { ...c, done: !c.done } : c
    );
    setChecklist(updated);
    if (partnerId && data?.current_day) {
      try {
        await fetch(`/api/partner-journey/percorso-veloce/save-checklist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partner_id: partnerId,
            day: data.current_day,
            checklist: updated,
          }),
        });
      } catch (e) {
        // best-effort
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  // Not activated → show activation screen
  if (!data?.active) {
    return (
      <ActivationScreen
        onActivate={handleActivate}
        isActivating={isActivating}
        onBack={() => navigate("/partner")}
      />
    );
  }

  const currentDay = data.current_day || 1;
  const currentPhase = data.current_phase || "posizionamento";
  const todayTasks = data.today_tasks || [];

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>

        {/* 1. COUNTDOWN */}
        <CountdownHero currentDay={currentDay} />

        {/* 2. CHECKLIST GIORNALIERA */}
        <DailyChecklist
          currentDay={currentDay}
          tasks={todayTasks}
          checklist={checklist}
          onToggle={handleToggle}
        />

        {/* 3. FASI */}
        <PhaseStepper currentDay={currentDay} currentPhase={currentPhase} />
      </div>
    </div>
  );
}

export default PercorsoVelocePage;
