import { Award, Download, Gift, Lock } from "lucide-react";

export default function PhaseRewardCard({ phase }) {
  const unlocked = !!phase.unlocked;
  return (
    <div className={`rounded-xl border p-4 ${unlocked ? "bg-white border-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.10)]" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${unlocked ? "bg-yellow-400 text-slate-900" : "bg-slate-200 text-slate-500"}`}>
          {unlocked ? <Award className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{phase.label}</p>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">{phase.title}</p>
          {phase.days && (
            <p className="text-[11px] font-semibold text-emerald-700 mt-2">Completata in {phase.days} giorni</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-white/70 border border-slate-200 p-3">
        <div className="flex items-start gap-2">
          <Gift className={`w-4 h-4 mt-0.5 ${unlocked ? "text-blue-600" : "text-slate-400"}`} />
          <div>
            <p className="text-xs font-semibold text-slate-900">{phase.bonusTitle}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
              {unlocked ? "Bonus sbloccato insieme all'attestato." : "Premio visibile, si sblocca completando la fase."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {unlocked ? (
          <>
            <a
              href={phase.certificateUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Attestato
            </a>
            <a
              href={phase.bonusUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Bonus
            </a>
          </>
        ) : (
          <div className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            Da sbloccare
          </div>
        )}
      </div>
    </div>
  );
}
