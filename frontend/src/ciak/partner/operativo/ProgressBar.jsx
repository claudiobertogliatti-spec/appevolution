import React from "react";

/**
 * Progress bar Operativo sulle 3 fasi del Metodo EVO:
 *  Esamina → Valida → Ottimizza
 *
 * Tutti gli step concreti confluiscono in una delle 3 fasi. Il param `avvio`
 * è deprecato (contratto/discovery sono dentro Esamina) e viene ignorato.
 */
export default function ProgressBar({ macroPhases, steps, currentStepId }) {
  if (!macroPhases || macroPhases.length === 0) return null;

  const currentStep = steps?.find((s) => s.step_id === currentStepId);
  const currentMacroId = currentStep?.macro_phase;
  const currentMacro = macroPhases.find((mp) => mp.id === currentMacroId);

  // Calcolo "passo X di Y" nella macro corrente
  let stepIndexInMacro = 0;
  if (currentMacro && currentMacro.step_ids.length > 0) {
    stepIndexInMacro = currentMacro.step_ids.indexOf(currentStepId) + 1;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md p-4">
      {/* 3 fasi del Metodo EVO */}
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

          const showProgress = mp.total_count > 0;

          return (
            <div
              key={mp.id}
              className={`flex-1 rounded-md px-3 py-2 border-2 ${segBg} ${segBorder} transition`}
              title={`${mp.label}${showProgress ? ` — ${mp.completed_count}/${mp.total_count}` : ""} — ${mp.tagline}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{mp.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold truncate ${isPending ? "text-slate-400" : ""}`}>
                    {mp.label}
                  </div>
                  {showProgress && (
                    <div className={`text-[10px] font-medium ${isCurrent ? "text-slate-900/70" : isDone ? "text-white/70" : "text-slate-400"}`}>
                      {mp.completed_count}/{mp.total_count}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Riga contesto: fase corrente + passo + step label + tagline */}
      {currentMacro && currentStep && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-500 font-medium">
            {currentMacro.label}
            {currentMacro.total_count > 0 && `: passo ${stepIndexInMacro} di ${currentMacro.total_count}`}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-900 font-semibold">{currentStep.label}</span>
          {currentStep.approval_status === "pending_review" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              In revisione
            </span>
          )}
          {currentStep.approval_status === "rejected" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              Da rivedere
            </span>
          )}
          <span className="text-slate-400 italic ml-auto">{currentMacro.tagline}</span>
        </div>
      )}
    </div>
  );
}
