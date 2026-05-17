import React from "react";

/**
 * Progress bar Operativo a 5 macro-fasi (non più 13 dot piatti).
 * Mostra: 5 segmenti orizzontali con icona + label + mini-progress per macro-fase.
 * Più sotto: micro-progress dello step corrente nella macro-fase.
 *
 * Stati segmento:
 * - done: blu profondo pieno
 * - in_progress: giallo con alone
 * - pending: grigio chiaro
 */
export default function ProgressBar({ macroPhases, currentStepId, steps }) {
  if (!macroPhases || macroPhases.length === 0) return null;

  const currentStep = steps?.find((s) => s.step_id === currentStepId);
  const currentMacroId = currentStep?.macro_phase;
  const currentMacro = macroPhases.find((mp) => mp.id === currentMacroId);

  // Numero step della macro-fase corrente (es. step 4 = 2 of 2 in Fondamenta)
  const stepIndexInMacro = currentMacro
    ? currentMacro.step_ids.indexOf(currentStepId) + 1
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-md p-4">
      <div className="flex items-stretch gap-2">
        {macroPhases.map((mp) => {
          const isCurrent = mp.id === currentMacroId;
          const isDone = mp.status === "done";
          const isPending = mp.status === "pending";

          let segBg = "bg-gray-100 text-slate-400";
          let segBorder = "border-transparent";
          if (isDone) {
            segBg = "bg-slate-900 text-white";
          } else if (isCurrent) {
            segBg = "bg-yellow-400 text-slate-900";
            segBorder = "border-yellow-300";
          }

          return (
            <div
              key={mp.id}
              className={`flex-1 rounded-md px-3 py-2 border-2 ${segBg} ${segBorder} transition`}
              title={`${mp.label} — ${mp.completed_count}/${mp.total_count}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{mp.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold truncate ${isPending ? "text-slate-400" : ""}`}>
                    {mp.label}
                  </div>
                  <div className={`text-[10px] font-medium ${isCurrent ? "text-slate-900/70" : isDone ? "text-white/70" : "text-slate-400"}`}>
                    {mp.completed_count}/{mp.total_count}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentMacro && currentStep && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">
            {currentMacro.label}: passo {stepIndexInMacro} di {currentMacro.total_count}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-900 font-semibold">{currentStep.label}</span>
          <span className="text-slate-400 italic ml-auto">{currentMacro.tagline}</span>
        </div>
      )}
    </div>
  );
}
