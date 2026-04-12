import { useState, useEffect } from "react";
import axios from "axios";
import {
  Zap, CheckCircle2, Circle, Loader2, ArrowRight,
  Target, Video, Layers, Megaphone, Radio,
  Clock, Calendar, ChevronRight
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   PHASE CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

const PHASES = [
  { id: "posizionamento", name: "Posizionamento", dayStart: 1, dayEnd: 2, icon: Target, color: "#3B82F6" },
  { id: "webinar", name: "Webinar", dayStart: 3, dayEnd: 7, icon: Video, color: "#8B5CF6" },
  { id: "funnel", name: "Funnel", dayStart: 8, dayEnd: 10, icon: Layers, color: "#FFD24D" },
  { id: "traffico", name: "Traffico", dayStart: 11, dayEnd: 14, icon: Megaphone, color: "#EF4444" },
  { id: "webinar_live", name: "Webinar Live", dayStart: 15, dayEnd: 21, icon: Radio, color: "#34C77B" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COUNTDOWN HERO
   ═══════════════════════════════════════════════════════════════════════════ */

function CountdownHero({ currentDay }) {
  const remaining = Math.max(21 - currentDay, 0);
  const progress = Math.min((currentDay / 21) * 100, 100);
  const completed = currentDay > 21;

  return (
    <div className="rounded-2xl overflow-hidden mb-6" data-testid="countdown-hero"
      style={{ background: completed ? "#34C77B" : "#1E2128" }}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              Go Live in 21 giorni
            </p>
            <p className="text-4xl font-black text-white">
              {completed ? "LIVE" : `Giorno ${currentDay}`}
            </p>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              {completed ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <span className="text-2xl font-black text-white">{remaining}</span>
              )}
            </div>
            <p className="text-[10px] font-bold mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              {completed ? "Completato" : `giorni rimasti`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: completed ? "white" : "#FFD24D" }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PHASE STEPPER
   ═══════════════════════════════════════════════════════════════════════════ */

function PhaseStepper({ currentDay, currentPhase }) {
  return (
    <div className="mb-6" data-testid="phase-stepper">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFD24D20" }}>
          <Calendar className="w-5 h-5" style={{ color: "#FFD24D" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Le 5 fasi</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Dove sei nel percorso</p>
        </div>
      </div>

      <div className="space-y-2">
        {PHASES.map((phase) => {
          const isCurrent = phase.id === currentPhase;
          const isCompleted = currentDay > phase.dayEnd;
          const isLocked = currentDay < phase.dayStart;
          const PIcon = phase.icon;

          return (
            <div key={phase.id}
              data-testid={`phase-${phase.id}`}
              className="rounded-xl p-4 flex items-center gap-3 transition-all"
              style={{
                background: isCurrent ? `${phase.color}08` : "white",
                border: isCurrent ? `2px solid ${phase.color}` : "1px solid #ECEDEF",
                opacity: isLocked ? 0.5 : 1,
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isCompleted ? "#34C77B" : isCurrent ? `${phase.color}20` : "#F5F3EE" }}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : (
                  <PIcon className="w-5 h-5" style={{ color: isCurrent ? phase.color : "#9CA3AF" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black" style={{ color: isCompleted ? "#166534" : "#1E2128" }}>
                    {phase.name}
                  </p>
                  {isCurrent && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: phase.color, color: "white" }}>
                      Ora
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  Giorno {phase.dayStart}–{phase.dayEnd}
                </p>
              </div>
              {isCurrent && <ChevronRight className="w-4 h-4" style={{ color: phase.color }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKLIST GIORNALIERA
   ═══════════════════════════════════════════════════════════════════════════ */

function DailyChecklist({ currentDay, tasks, checklist, onToggle }) {
  const completed = checklist.filter((c) => c.done).length;
  const total = tasks.length;
  const allDone = total > 0 && completed === total;

  const currentPhase = PHASES.find(
    (p) => currentDay >= p.dayStart && currentDay <= p.dayEnd
  );
  const phaseColor = currentPhase?.color || "#FFD24D";

  return (
    <div className="mb-6" data-testid="daily-checklist">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${phaseColor}20` }}>
            <Clock className="w-5 h-5" style={{ color: phaseColor }} />
          </div>
          <div>
            <h2 className="text-base font-black" style={{ color: "#1E2128" }}>
              Oggi — Giorno {currentDay}
            </h2>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>
              {allDone ? "Tutto fatto!" : `${total - completed} cose da fare`}
            </p>
          </div>
        </div>
        <span className="text-xl font-black" style={{ color: allDone ? "#34C77B" : "#1E2128" }}>
          {completed}/{total}
        </span>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #ECEDEF" }}>
        {tasks.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Nessun task per oggi</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F5F3EE" }}>
            {tasks.map((task) => {
              const saved = checklist.find((c) => c.id === task.id);
              const isDone = saved?.done || false;
              return (
                <button key={task.id} onClick={() => onToggle(task.id)}
                  data-testid={`task-${task.id}`}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: isDone ? "#34C77B" : "#ECEDEF", color: isDone ? "white" : "#9CA3AF" }}>
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{
                      color: isDone ? "#166534" : "#1E2128",
                      textDecoration: isDone ? "line-through" : "none",
                      opacity: isDone ? 0.7 : 1,
                    }}>{task.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{task.desc}</p>
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

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVATION SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */

function ActivationScreen({ onActivate, isActivating }) {
  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: "#FAFAF7" }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "#FFD24D20" }}>
            <Zap className="w-10 h-10" style={{ color: "#FFD24D" }} />
          </div>
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Go Live in 21 giorni
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Un percorso accelerato per portarti online
            <br />
            con funnel, webinar e traffico reale.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 mb-6" style={{ border: "1px solid #ECEDEF" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9CA3AF" }}>
            Le 5 fasi
          </p>
          <div className="space-y-3">
            {PHASES.map((phase) => {
              const PIcon = phase.icon;
              return (
                <div key={phase.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${phase.color}15` }}>
                    <PIcon className="w-4 h-4" style={{ color: phase.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{phase.name}</p>
                    <p className="text-xs" style={{ color: "#9CA3AF" }}>
                      Giorno {phase.dayStart}–{phase.dayEnd}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-6" style={{ background: "#1E2128" }}>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            <strong className="text-white">Tra 21 giorni avrai:</strong>
          </p>
          <ul className="mt-3 space-y-2">
            {["Un funnel live che raccoglie iscritti", "Un webinar che converte in vendite", "Traffico reale che arriva ogni giorno"].map((t, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#34C77B" }} />
                <span className="text-sm text-white">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          data-testid="activate-percorso-veloce"
          onClick={onActivate}
          disabled={isActivating}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{ background: "#FFD24D", color: "#1E2128", boxShadow: "0 4px 16px #FFD24D40" }}>
          {isActivating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>Inizia il Percorso Veloce <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function PercorsoVelocePage({ partner, onNavigate, isAdmin }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [isActivating, setIsActivating] = useState(false);
  const partnerId = partner?.id;

  const load = async () => {
    if (!partnerId) { setIsLoading(false); return; }
    try {
      const res = await axios.get(`${API}/api/partner-journey/percorso-veloce/${partnerId}`);
      setData(res.data);
      if (res.data.active && res.data.today_tasks) {
        const saved = res.data.today_checklist || [];
        const merged = res.data.today_tasks.map((t) => {
          const s = saved.find((c) => c.id === t.id);
          return { id: t.id, done: s?.done || false };
        });
        setChecklist(merged);
      }
    } catch (e) {
      console.error("Error loading percorso veloce:", e);
      setData({ active: false });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [partnerId]);

  const handleActivate = async () => {
    if (!partnerId) return;
    setIsActivating(true);
    try {
      await axios.post(`${API}/api/partner-journey/percorso-veloce/activate`, { partner_id: partnerId });
      await load();
    } catch (e) {
      console.error("Error activating:", e);
    } finally {
      setIsActivating(false);
    }
  };

  const handleToggle = async (taskId) => {
    const updated = checklist.map((c) => c.id === taskId ? { ...c, done: !c.done } : c);
    setChecklist(updated);
    if (partnerId && data?.current_day) {
      try {
        await axios.post(`${API}/api/partner-journey/percorso-veloce/save-checklist`, {
          partner_id: partnerId,
          day: data.current_day,
          checklist: updated,
        });
      } catch (e) { console.error("Error saving checklist:", e); }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
      </div>
    );
  }

  // Not activated → show activation screen
  if (!data?.active) {
    return <ActivationScreen onActivate={handleActivate} isActivating={isActivating} />;
  }

  const currentDay = data.current_day || 1;
  const currentPhase = data.current_phase || "posizionamento";
  const todayTasks = data.today_tasks || [];

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {isAdmin && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <Zap className="w-4 h-4" style={{ color: "#FBBF24" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>Vista Admin</span>
          </div>
        )}

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
