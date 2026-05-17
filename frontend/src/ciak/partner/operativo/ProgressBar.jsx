import React from "react";

/**
 * Progress bar Operativo a 5 macro-fasi del brand Evolution:
 *  Posizionamento → Creazione accademia → Costruzione funnel → Lancio → Ottimizzazione servizio
 *
 * Step 1-2 (contratto + discovery) sono "Avvio" silenzioso fuori dalla bar
 * (mostrati come chip "Avvio ✓ completato" quando done).
 */
export default function ProgressBar({ macroPhases, steps, currentStepId, avvio }) {
  if (!macroPhases || macroPhases.length === 0) return null;

  const currentStep = steps?.find((s) => s.step_id === currentStepId);
  const currentMacroId = currentStep?.macro_phase;
  const currentMacro = macroPhases.find((mp) => mp.id === currentMacroId);

  // Calcolo "passo X di Y" nella macro corrente
  let stepIndexInMacro = 0;
  if (currentMacro && currentMacro.step_ids.length > 0) {
    stepIndexInMacro = currentMacro.step_ids.indexOf(currentStepId) + 1;
  }

  const inAvvio = currentMacroId === "avvio";

  return (
    <div className="bg-white border border-gray-200 rounded-md p-4">
      {/* Avvio chip — sempre visibile, stato breve */}
      {avvio && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
            avvio.status === "done"
              ? "bg-green-50 text-green-700"
              : inAvvio
              ? "bg-yellow-100 text-slate-900"
              : "bg-slate-100 text-slate-500"
          }`}>
            <span>{avvio.status === "done" ? "✓" : inAvvio ? "→" : "○"}</span>
            <span>Avvio {avvio.completed_count}/{avvio.total_count}</span>
          </span>
          {inAvvio && currentStep && (
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{currentStep.label}</span>
            </span>
          )}
          {avvio.status === "done" && !inAvvio && (
            <span className="text-xs text-slate-400 italic">contratto + discovery completati</span>
          )}
        </div>
      )}

      {/* 5 macro-fasi del brand Evolution */}
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

      {/* Riga contesto: macro corrente + passo + step label + tagline */}
      {currentMacro && currentStep && !inAvvio && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-500 font-medium">
            {currentMacro.label}
            {currentMacro.total_count > 0 && `: passo ${stepIndexInMacro} di ${currentMacro.total_count}`}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-900 font-semibold">{currentStep.label}</span>
          <span className="text-slate-400 italic ml-auto">{currentMacro.tagline}</span>
        </div>
      )}
    </div>
  );
}
