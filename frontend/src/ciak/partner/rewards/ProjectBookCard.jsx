import { useEffect, useMemo, useState } from "react";
import { Award, BookOpen, Download, Lock, Sparkles } from "lucide-react";
import { buildRewardPhases, nextLockedReward } from "./rewardUtils";

function PhaseDot({ phase }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className={`w-2.5 h-2.5 rounded-full ${phase.unlocked ? "bg-emerald-500" : "bg-slate-300"}`} />
      <span className="text-xs font-semibold text-slate-700">{phase.label}</span>
    </div>
  );
}

export default function ProjectBookCard({ partnerId, state, compact = false }) {
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!partnerId) return () => {};
    fetch(`/api/partner-rewards/${partnerId}/state`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setRemote(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [partnerId]);

  const phases = useMemo(
    () => buildRewardPhases(state, partnerId, remote?.phases),
    [state, partnerId, remote]
  );
  const unlockedCount = phases.filter((phase) => phase.unlocked).length;
  const nextReward = nextLockedReward(phases);
  const bookUrl = remote?.project_book?.download_url || `/api/partner-rewards/${partnerId}/project-book`;
  const projectName = remote?.project_book?.project_name || "Il tuo modello digitale";

  return (
    <section className={`bg-white border border-yellow-200 rounded-xl shadow-[0_0_24px_rgba(250,204,21,0.14)] overflow-hidden ${compact ? "" : "mt-5"}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
        <div className="bg-slate-900 text-white p-5 flex flex-col justify-between min-h-[210px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-semibold text-yellow-300">
              <BookOpen className="w-3.5 h-3.5" />
              Libretto Ciak
            </div>
            <h3 className="text-xl font-semibold leading-tight mt-4">{projectName}</h3>
            <p className="text-xs text-slate-300 leading-relaxed mt-2">
              La dispensa professionale del progetto che stiamo costruendo insieme.
            </p>
          </div>
          <div className="mt-5 h-2 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-yellow-400" style={{ width: `${Math.round((unlockedCount / phases.length) * 100)}%` }} />
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Premio di percorso
              </p>
              <h3 className="text-xl font-semibold text-slate-900 mt-1">Il tuo Libretto di Progetto</h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-2 max-w-xl">
                Lo vedi gia adesso, poi si arricchisce fase dopo fase con posizionamento,
                masterclass, corso, funnel, calendario e live.
              </p>
            </div>
            <a
              href={bookUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Scarica libretto
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            {phases.map((phase) => (
              <PhaseDot key={phase.id} phase={phase} />
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-start gap-3">
            {nextReward?.unlocked ? (
              <Award className="w-5 h-5 text-emerald-600 mt-0.5" />
            ) : (
              <Lock className="w-5 h-5 text-slate-400 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {nextReward?.unlocked ? "Tutti i premi principali sono attivi" : `Prossimo premio: ${nextReward?.label}`}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                {nextReward?.unlocked
                  ? "Ora il libretto continua ad aggiornarsi con dati, live e ottimizzazioni."
                  : `Completa la fase ${nextReward?.label} per sbloccare attestato e bonus: ${nextReward?.bonusTitle}.`}
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-yellow-500 ml-auto hidden sm:block" />
          </div>
        </div>
      </div>
    </section>
  );
}

